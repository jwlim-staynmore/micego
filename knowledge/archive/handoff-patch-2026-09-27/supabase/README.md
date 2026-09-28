# MICEGO Supabase 백엔드 (WP1)

MICEGO(마이스고) 역경매 플랫폼의 Supabase 백엔드. Postgres 스키마/RLS/RPC(`migrations/`), 시드 데이터
(`seed.sql`, `seed_demo.sql`), Deno Edge Functions(`functions/`), 알림 템플릿 생성 스크립트
(`scripts/sync_templates.py`), 테스트(`tests/`)로 구성된다. SPEC_LAUNCH.md §0/2/3/4/8/9/10 이 이 패키지의
설계 근거다. (SPEC_*.md 4종은 `micego-site/` 루트에 있다 — 2026-09-27 구현 기준 역추출본.)

## 1. 아키텍처 한 줄 요약

Edge Function 은 PostgREST 를 거치지 않고 `SUPABASE_DB_URL` 로 Postgres 에 직접 접속해서 `private.*`
스키마 함수(상태 머신, enqueue, OTP 등)를 호출한다. 회원/운영자 전용 SQL RPC(`my_rfps`, `admin_snapshot` 등)는
프런트엔드(mg.js)가 PostgREST(`rest/v1/rpc/...`)로 직접 부르는 별도 경로다 — 이쪽은 PostgREST 가 사용자
JWT 를 `request.jwt.claims` GUC 로 자동 설정해 주므로 `auth.uid()`/`auth.jwt()` 가 그대로 동작한다.
`create_share_link`/`revoke_share_link` 의 Edge Function 버전만 예외로, 같은 RPC 를 직접 접속 경로에서
호출하기 위해 `DbClient.withClaims()` 로 그 GUC 를 트랜잭션-로컬로 흉내낸다 (`_shared/deps.ts` 참고).

## 2. 배포 순서

```bash
supabase login
supabase link --project-ref <project-ref>

# 확장(pgcrypto, citext, pg_cron, pg_net)은 대시보드 Database → Extensions 에서 먼저 켠다.
supabase db push                      # migrations/0001..0009 적용 (0008·0009 = 피드백 시스템)
psql "$SUPABASE_DB_URL" -f seed.sql          # 설정값, 공휴일, 알림 템플릿 메타
psql "$SUPABASE_DB_URL" -f seed_demo.sql     # 데모 데이터 (선택 — 운영 DB에는 보통 생략)

# pg_cron 작업이 dispatch_notifications 를 호출할 URL/시크릿을 DB 세션 GUC 로 등록한다 (0007_cron.sql 참고).
psql "$SUPABASE_DB_URL" -c "alter database postgres set app.settings.functions_url = 'https://<project-ref>.functions.supabase.co';"
psql "$SUPABASE_DB_URL" -c "alter database postgres set app.settings.cron_secret = '<CRON_SECRET 과 동일한 값>';"
# 피드백 메일 재시도 크론(0009_feedback_cron.sql, mgfb-mail-retry)은 별도 GUC 를 x-internal-secret 헤더로 보낸다.
psql "$SUPABASE_DB_URL" -c "alter database postgres set app.settings.feedback_cron_secret = '<FEEDBACK_CRON_SECRET 과 동일한 값>';"

python3 scripts/sync_templates.py     # docs/notification-templates.json + emails/*.html -> functions/_shared/templates.gen.ts
supabase functions deploy             # functions/ 아래 전체 배포 (functions/_shared, _tests 는 자동 제외)
```

운영자 계정은 대시보드에서 직접 만들고 `app_metadata.role = "operator"` 를 수동으로 설정한다
(`private.is_operator()`/`requireOperator()` 가 이 값을 읽는다).

## 3. 필요한 시크릿 (Edge Function 환경변수)

`supabase secrets set` 으로 등록한다. 값이 없으면 해당 기능만 실패하도록 만들어져 있다(예: RESEND_API_KEY
없이도 `NOTIFY_MODE=log` 에서는 정상 동작).

| 변수 | 용도 |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | GoTrue Admin REST 호출, `dispatch_notifications` 의 service-role 인증 |
| `SUPABASE_DB_URL` | Edge Function 의 직접 Postgres 접속 문자열 (`_shared/deps.ts`) |
| `SITE_BASE_URL` | 이메일/알림톡 안의 링크(`track.html`, `bid.html` 등) 절대경로 베이스 |
| `SITE_ORIGINS` | CORS 허용 origin 목록 (쉼표 구분) |
| `SUPPORT_EMAIL`, `OPS_INBOX`, `FROM_ADDRESS` | 발신/문의 수신 주소 |
| `RESEND_API_KEY` | 이메일 발송 (Resend) |
| `NOTIFY_MODE` | `live` \| `log`. `log` 는 실제 HTTP 호출 없이 `notification_deliveries.status='skipped'` 로 기록 |
| `SMS_VENDOR` | `solapi`(기본) \| `aligo` |
| `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SMS_SENDER`, `KAKAO_PF_ID` | Solapi(CoolSMS) SMS/알림톡 |
| `ALIGO_KEY`, `ALIGO_USER_ID` | Aligo SMS/LMS 폴백 (미설정 시 `NotConfiguredError`) |
| `OTP_PEPPER` | `code_hash = sha256(code:otp_id:pepper)` 의 pepper |
| `IP_HASH_SALT` | 레이트리밋 키로 쓰는 IP 해시의 salt |
| `CRON_SECRET` | `dispatch_notifications` 를 pg_cron 이 호출할 때 쓰는 `x-cron-secret` 값 |
| `MG_DEMO_OTP` | `1` 이면 모든 OTP 코드가 `123456` 으로 고정된다. **`NOTIFY_MODE=live` 에서는 무시된다** (코드에서 강제) |

## 4. 벤더 사전 준비

- **Resend**: 발신 도메인 인증(SPF/DKIM), API 키 발급.
- **Solapi(CoolSMS)**: 발신번호 사전등록(한국 통신사 요건), 카카오 알림톡 채널/템플릿 심사 통과
  (`micego_*` 템플릿 코드들 — `docs/notification-templates.json` 의 `alimtalk.code` 참고). 심사 지연을 감안해
  ORG_PICK_OTP/ACC_SMS_OTP 는 알림톡이 아니라 SMS 로만 보낸다 (spec 결정사항).
- **Aligo**: 선택적 SMS/LMS 폴백 벤더. `ALIGO_KEY`/`ALIGO_USER_ID` 를 설정하지 않으면 자동으로 건너뛴다.
- **pg_cron / pg_net**: Supabase 대시보드 Database → Extensions 에서 활성화. 로컬 테스트 환경에는 보통 없으므로
  `0007_cron.sql` 은 `pg_extension` 존재 여부로 가드되어 조용히 스킵된다.

## 5. 테스트 실행

```bash
MG_PYTHON=/path/to/venv/bin/python3 \
MG_SCRATCH=/tmp/mg_test_scratch \
bash supabase/tests/run.sh
```

3단계로 구성되며 각 단계는 독립적으로 스킵/실패를 보고한다 (`PASS=.. FAIL=.. SKIP=..` 로 종료):

1. **pglast 구문 검사** — `pip install pglast` (스크래치패드 venv 권장), `migrations/*.sql` 9개 전부 파싱.
2. **실제 PostgreSQL 16** — `MG_PGBIN`(기본 `/usr/lib/postgresql/16/bin`)의 `initdb`/`pg_ctl` 을
   `postgres` OS 사용자로 실행(`runuser -u postgres --`), `tests/00_supabase_shim.sql` 로 최소 Supabase Auth
   흉내(anon/authenticated/service_role 롤, `auth.uid()`/`auth.jwt()`/`auth.role()`)를 만든 뒤 마이그레이션 +
   시드 + `tests/sql/*.sql` (DO 블록, 실패 시 `raise exception`)을 실행한다. 커버리지: `due()` 두 예시,
   전이 허용/금지 전부 + 모든 가드 코드(+ `from_state`/`to_state` 정확성, 회원탈퇴 자동취소가 ORG_CANCELLED 를
   보내지 않는지), `pick_and_win` 이 정확히 3건 enqueue, `system_tick` (전이/리마인더/공유만료/파기, 파트너
   전화번호 포함), RLS(회원 셀프뷰/운영자 전체뷰/anon 거부), `admin_snapshot()` 키 셋 일치.
3. **Deno check/test** — GitHub Releases 에서 받은 `deno` 를 스크래치패드에 설치(프로젝트 디렉터리 밖).
   `deno check functions/**/*.ts` 로 28개 Edge Function(기본 26 + 피드백 2) + 공유 모듈 전체 타입체크, 이어서
   `deno test functions/_tests/` 를 돈다. jsr.io 접속이 막힌 환경이라 `jsr:@std/assert` 대신
   로컬 `_tests/_assert.ts` 를 쓴다. Deno 를 구할 수 없으면 `npx esbuild --log-level=error` 구문 검사로 대체한다.

`functions/_tests/` 안의 Deno 테스트는 실제 HTTP/DB 없이 `handle(req, deps)` 에 mock `Deps` 를 주입해서 돈다
(`_tests/mock_deps.ts`, `_tests/otp_mock_db.ts`): 알림 렌더러(notification-templates.json의 템플릿 전부 — 실측 45개 항목(email 29·알림톡 9·SMS 2·운영자 수동 문안 포함), 선택 블록, SMS 바이트 제한),
Resend/Solapi 어댑터 payload 모양, OTP 수명주기(오답→remaining, 5오답→void/lock, 쿨다운, 캡, 데모 고정코드),
검증 헬퍼(비밀번호 규칙, 이메일/전화 정규식), `submit_rfp` 검증 매트릭스 + 정상 경로, `login` 오류 코드와
5회/15분·10회/1시간 잠금 임계값을 다룬다.

## 6. 크론 (배포 후 확인용)

- `mg-dispatch-notifications` (매분): `pending`/`partial` 상태 알림을 최대 50건씩 집어 채널별로 발송하고
  1/5/30/120/360분 백오프로 재시도, 5회 실패 시 `failed` (운영 콘솔 실패 목록에 노출).
- `mg-system-tick` (10분): bidding→collecting 자동전이, 마감 24시간 전 HTL_REMINDER, 공유링크 30일 만료,
  가입미완료 72시간 파기, 오래된 로그 정리, 성사 연결기록 보관기한 경과 시 `org_snapshot` null 처리.

## 7. SPEC_LAUNCH.md §3 대비 알아둘 점 (WP3 가 참고)

- `account_update` 의 `op:'email_start'` 만 스펙 표의 `{member}` 대신 `{otp_id,expires_at,resend_at}` 를
  돌려준다 — 다른 모든 OTP 발급 엔드포인트와 형태를 맞추기 위한 의도적 조정이며, `op:'email_verify'` 는
  스펙대로 `{member}` 를 돌려준다.
- 그 외 함수 이름·요청/응답 모양은 §3 표와 동일하게 구현했다.

자세한 스펙 이탈 목록과 근거는 이 작업을 위임한 에이전트의 최종 보고서(SubagentHandback)를 참고할 것 —
가장 중요한 것은 `INTERNAL_INBOUND`(문의/변경요청/질문 내부 메일)가 `docs/notification-templates.json` 에
정의가 없어 `templates.gen.ts` 파이프라인을 거치지 않고 `_shared/notify/internal.ts` 에서 최소 형태로
직접 조립해 보낸다는 점이다.

## 8. 피드백(VOC) — `feedback-submit` / `feedback-mail-retry`

SPEC_FEEDBACK.md 기반. 사이트 전역 피드백 위젯(`assets/feedback.js`)과 `contact.html` 문의 폼이
호출하는 단순 CORS 요청(D1) 전용 함수 2개, 전용 스키마(`migrations/0008_feedback.sql`,
`0009_feedback_cron.sql`), 전용 seed(`seed_demo.sql` 말미 13건, §5.3), 전용 SQL 테스트
(`tests/sql/05_feedback.sql`)로 구성된다. `_shared/*.ts` 의 기존 CORS/에러 포맷을 그대로 쓰지 않고
`_shared/feedback_*.ts` 로 따로 둔 이유: 이 두 함수는 `apikey`/`Authorization` 헤더 없이 preflight
없는 단순 요청만 받는다(카카오 인앱 WebView 등 구형 브라우저가 OPTIONS 를 못 태우는 문제 회피,
SPEC_FEEDBACK.md D1/D2) — 인증은 함수 안에서 본문의 `auth.access_token` 을 직접 검증한다. 응답 포맷도
`{ok:false,error:{code,retry_after_sec?,fields?}}` 로 기존 에러 카탈로그(message_ko/en)와 다르다.

### 8.1 신규 환경변수 (`supabase secrets set`)

| 변수 | 용도 |
|---|---|
| `RESEND_API_KEY` | 이메일 발송 — 기존 알림 발송과 공유 (`_shared/notify/resend.ts`) |
| `FEEDBACK_INBOX` | 운영 알림 메일(FB_OPS_ALERT) 수신 주소 |
| `FEEDBACK_FROM` | 운영 알림 메일 발신 주소 |
| `FEEDBACK_ALLOWED_ORIGINS` | 정식 운영 Origin 목록(쉼표 구분) — `is_demo=false` 판정 기준 |
| `FEEDBACK_STAGING_ORIGINS` | 스테이징/프리뷰 Origin 목록(쉼표 구분) — 매칭되면 `is_demo=true` |
| `FEEDBACK_IP_PEPPER` | 레이트리밋용 IP 해시(HMAC-SHA256)의 pepper |
| `FEEDBACK_CONSOLE_BASE_URL` | 메일 본문 속 콘솔 링크(`/feedback-detail.html?id=`, `/rfp.html?ref=`) 베이스 |
| `FEEDBACK_CRON_SECRET` | `feedback-mail-retry` 를 pg_cron(`mgfb-mail-retry`) 이 호출할 때 쓰는 `x-internal-secret` 값 |
| `FEEDBACK_DAILY_CAP` | `feedback_rate_hit` 의 IP당 1일 상한 기본값(§2.9) |
| `FEEDBACK_OPS_MAIL_DAILY_CAP` | 운영 알림 메일 1일 발송 상한(초과 시 `ops_mail_status='skipped'`), 기본 150 |
| `FEEDBACK_ACK_PER_EMAIL_DAY` | 접수 확인 메일(FB_ACK)을 같은 수신자에게 24시간 안에 보낼 수 있는 최대 건수, 기본 3 |

값이 없으면 각 기능만 보수적으로(전부 스킵/거부) 동작하도록 만들어져 있다 — 예: `RESEND_API_KEY` 없이도
`NOTIFY_MODE=log` 흐름과 동일하게 실패를 `failed` 로 기록만 하고 접수 자체는 막지 않는다.

### 8.2 Edge Function 배포

`config.toml` 에 두 함수 모두 `verify_jwt = false` 로 등록되어 있다(게이트웨이 JWT 검증을 끄고 함수 내부에서
직접 인증) — `[functions.feedback-submit]`, `[functions.feedback-mail-retry]`. `supabase functions deploy
feedback-submit feedback-mail-retry` 로 배포한다.

### 8.3 크론

`0009_feedback_cron.sql` 은 `0007_cron.sql` 과 같은 방식으로 `pg_cron`/`pg_net` 확장 존재 여부로 가드된다.
등록되는 작업: `mgfb-mail-retry`(10분마다, `feedback-mail-retry` 를 `x-internal-secret` 헤더로 호출 — 헤더 값은 DB GUC `app.settings.feedback_cron_secret` 이므로 §2 의 `alter database ... set app.settings.feedback_cron_secret` 을 반드시 실행할 것),
`mgfb-rate-purge`(매시, `private.feedback_rate_event` 오래된 행 정리), `mgfb-demo-purge`(매일,
`is_demo=true` 데모 행 정리), `mgfb-anonymize`(매월 1일, `feedback_anonymize()` 로 12개월 지난 행 마스킹).

### 8.4 이메일 미리보기

`emails/FB_OPS_ALERT.html`(운영 알림), `emails/FB_ACK.html`(접수 확인)은 다른 `emails/*.html` 과 같은
정적 디자인 프리뷰다. 실제 발송 HTML은 `_shared/feedback_templates.ts` 가 만드는 더 단순한 인라인 스타일이며
(문서용 프리뷰와 시각적으로 다르다), 값은 전부 HTML 이스케이프되고 D7 정책상 접수 확인 메일에는 유저가 쓴
본문을 절대 넣지 않는다.

### 8.5 테스트

`tests/sql/05_feedback.sql` 이 REF 형식/KST 날짜, `feedback_set_status` 전이 가드 전체(모든 `GUARD_*`
코드), RLS(anon 거부/비운영자 회원 0건/운영자 전체), `feedback_rate_hit` 슬라이딩 윈도(ip_10m/ip_day/global),
`feedback_claim_mail` 임대, `feedback_resolve_rfp` 4가지 매치 케이스, `feedback_anonymize` 마스킹을
`tests/run.sh` 2단계에서 검증한다. Deno 쪽은 `functions/_tests/feedback_sanitize_test.ts`,
`feedback_submit_test.ts`, `feedback_mail_retry_test.ts` 가 검증 매트릭스·CORS/레이트리밋/허니팟·메일
분기·재시도 인증 모드를 다룬다.
