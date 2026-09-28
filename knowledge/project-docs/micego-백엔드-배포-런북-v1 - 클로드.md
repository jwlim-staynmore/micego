# MICEGO 백엔드 배포 런북 v1.1 - 클로드

**대상:** Supabase 백엔드(마이그레이션 0001~0009, Edge Function 28개 — 기본 26 + 피드백 시스템 `feedback-submit`·`feedback-mail-retry`) 최초 배포
**작성 계정:** jwlim@staynmore.com · **기준일:** 2026-09-27 (v1.1) · **소스:** `micego-site/supabase/README.md` §2·§3·§8, `SPEC_LAUNCH.md §10`, `micego-피드백-시스템-설계서-v1` 8장·6장·7장
**현재 상태:** 코드 완료 · **배포 전** — 이 런북을 처음부터 끝까지 실행하면 배포가 끝납니다.

> **v1.1 변경(2026-09-27 독립 검증에서 발견):** ① Step 5에 `app.settings.feedback_cron_secret` GUC 등록 추가 — v1은 "DB 쪽 GUC 등록 불필요"라고 잘못 적었고, 그대로 따르면 피드백 메일 재시도 크론이 영구히 인증에 실패합니다. ② Edge Function 수 26→28 정정. ③ Step 8의 `SUPABASE_*` 4개는 런타임 자동 주입이라 직접 등록하지 않음. ④ Step 6 템플릿 재생성이 필수임을 강조(커밋본이 43개로 오래된 상태였음). ⑤ 저장소 안 같은 절차: `supabase/README.md` §2.

> 이 문서는 기본 배포(0001~0007)부터 피드백 추가분(0008~0009)까지 전체 순서를 하나로 묶었습니다. 이미 배포되어 있다면 **Step 3부터**(정확히는 Step 3의 `db push`만) 건너뛰고 피드백 관련 Step(5의 두 번째 GUC, 6, 8의 FEEDBACK_* 항목, 10, 11)만 실행하면 됩니다.

---

### 사전 준비물

- [ ] Supabase 계정 및 새 프로젝트(또는 기존 프로젝트) 생성, `project-ref` 확보
- [ ] `supabase` CLI 설치 및 로그인 가능 여부 (`supabase --version`)
- [ ] `psql` 실행 가능 여부 (마이그레이션 후 seed·GUC 설정에 필요)
- [ ] Resend 계정 — 발신 도메인 소유권 확인 가능한 상태(DNS 접근 권한)
- [ ] Solapi(CoolSMS) 계정 — 사업자 서류, 발신번호로 등록할 전화번호, 카카오톡 채널
- [ ] `site.config.json`의 domain·officialEmail이 확정되어 있을 것 (Resend 발신 도메인과 일치해야 함)
- [ ] 개인정보처리방침 "의견 접수" 문구에 대한 법무 확인 경로(담당자 또는 본인 검토)
- [ ] 시크릿 값 4개를 미리 생성해 둘 것: `openssl rand -hex 32` × 4 → `OTP_PEPPER`, `IP_HASH_SALT`, `CRON_SECRET`, `FEEDBACK_CRON_SECRET`(+ `FEEDBACK_IP_PEPPER` 1개 더). Step 5와 Step 8에서 같은 값을 써야 하므로 먼저 정합니다.

---

### 절차

#### Step 1: Supabase 프로젝트 연결

```bash
supabase login
supabase link --project-ref <project-ref>
```

**Expected result:** `Finished supabase link.` 메시지와 함께 로컬이 해당 프로젝트에 연결됩니다.
**If it fails:** 로그인 토큰 만료 시 `supabase login`을 다시 실행. `project-ref`는 Supabase 대시보드 URL의 `https://supabase.com/dashboard/project/<project-ref>`에서 확인합니다.

#### Step 2: DB 확장 활성화 (대시보드에서 수동)

Supabase 대시보드 → **Database → Extensions**에서 다음을 켭니다: `pgcrypto`, `citext`, `pg_cron`, `pg_net`.

**Expected result:** 4개 확장이 모두 "Enabled" 상태.
**If it fails:** `pg_cron`/`pg_net`은 일부 리전·플랜에서 제한될 수 있습니다 — 이 경우 크론 등록이 조용히 스킵되도록 마이그레이션이 가드되어 있으므로 배포 자체는 막히지 않지만, 알림 발송과 피드백 재시도·정리 작업이 자동으로 돌지 않으니 별도로 외부 스케줄러(예: GitHub Actions cron)를 붙이는 결정이 필요합니다.

#### Step 3: 마이그레이션 적용

```bash
supabase db push
```

0001~0009 마이그레이션(기본 스키마 7개 + `0008_feedback.sql` + `0009_feedback_cron.sql`)이 순서대로 적용됩니다.

**Expected result:** 9개 마이그레이션 모두 `Applied` 표시.
**If it fails:** 에러 메시지의 마이그레이션 번호를 확인. Step 2의 확장이 빠졌으면 `0007_cron.sql`/`0009_feedback_cron.sql`에서 실패할 수 있습니다(단, 위 가드 덕분에 보통은 스킵되고 통과합니다). 스키마 충돌이면 기존 테이블이 남아있는 상태에서 재실행한 것이 아닌지 확인.

#### Step 4: 초기 데이터 적재

```bash
psql "$SUPABASE_DB_URL" -f seed.sql          # 설정값, 공휴일, 알림 템플릿 메타 — 운영에도 필요
psql "$SUPABASE_DB_URL" -f seed_demo.sql     # 데모 데이터(피드백 mock 13건 포함) — 선택, 운영 DB에는 생략
```

**Expected result:** 오류 없이 완료.
**If it fails:** `SUPABASE_DB_URL`이 비어 있으면 대시보드 Settings → Database → Connection string에서 복사.
**주의:** `seed_demo.sql`에는 데모 운영자 계정·비밀번호가 들어 있습니다. 운영 DB에는 절대 넣지 않습니다.

#### Step 5: pg_cron이 호출할 URL·시크릿을 DB GUC로 등록 (GUC 3개)

```bash
psql "$SUPABASE_DB_URL" -c "alter database postgres set app.settings.functions_url = 'https://<project-ref>.functions.supabase.co';"
psql "$SUPABASE_DB_URL" -c "alter database postgres set app.settings.cron_secret = '<CRON_SECRET과 동일한 값>';"
psql "$SUPABASE_DB_URL" -c "alter database postgres set app.settings.feedback_cron_secret = '<FEEDBACK_CRON_SECRET과 동일한 값>';"
```

- `app.settings.cron_secret` → `0007_cron.sql`의 `mg-dispatch-notifications`·`mg-system-tick`이 `x-cron-secret` 헤더로 보냅니다. Step 8의 `CRON_SECRET`과 **같아야** 합니다.
- `app.settings.feedback_cron_secret` → `0009_feedback_cron.sql`의 `mgfb-mail-retry`가 `x-internal-secret` 헤더로 보냅니다. Step 8의 `FEEDBACK_CRON_SECRET`과 **같아야** 합니다. **(v1.1 추가 — v1에는 이 줄이 없었습니다.)**
- 두 시크릿은 서로 **다른 값**을 씁니다.

**Expected result:** `ALTER DATABASE` 출력 3회.
**If it fails:** 연결 문자열 오류. `psql "$SUPABASE_DB_URL" -c "select 1;"`로 먼저 연결만 확인.

#### Step 6: 알림 템플릿 동기화 (배포 직전 필수)

```bash
python3 scripts/sync_templates.py
```

`docs/notification-templates.json`과 `emails/*.html`을 `functions/_shared/templates.gen.ts`로 컴파일합니다. **Edge Function 배포 전에 반드시** 실행합니다 — 2026-09-27 이전 커밋본은 피드백 템플릿 2종이 빠진 43개 상태였고, 재생성 후 45개가 됩니다.

**Expected result:** `wrote ... (45 templates, 29 email bodies)`.
**If it fails:** 템플릿 JSON과 HTML 파일 수가 맞지 않으면 스크립트가 어떤 템플릿이 빠졌는지 출력합니다.

#### Step 7: Edge Functions 배포

```bash
supabase functions deploy
```

`functions/` 아래 전체(28개, `_shared`·`_tests` 자동 제외)를 한 번에 배포합니다. 피드백 2개만 다시 올리고 싶을 때는:

```bash
supabase functions deploy feedback-submit feedback-mail-retry
```

**Expected result:** 각 함수별 `Deployed Function` 로그.
**If it fails:** `deno check` 실패면 Step 6을 빠뜨린 경우가 많습니다(템플릿 미동기화로 타입 불일치).

#### Step 8: 환경변수(시크릿) 등록

```bash
supabase secrets set --env-file .env.secrets     # 키 목록은 저장소의 .env.example
```

**등록하지 않는 것:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` — Edge 런타임이 자동 주입하며 CLI가 `SUPABASE_` 접두 키 등록을 거부합니다.

기본 시크릿:

| 변수 | 예시/용도 |
|---|---|
| `SITE_BASE_URL` | 예: `https://micego.kr` — 이메일/알림톡 링크 베이스 |
| `SITE_ORIGINS` | CORS 허용 origin, 쉼표 구분 |
| `SUPPORT_EMAIL`, `OPS_INBOX`, `FROM_ADDRESS` | 발신·문의 수신 주소 |
| `RESEND_API_KEY` | Resend 발급 키 (Step 10) |
| `NOTIFY_MODE` | 배포 직후엔 `log`로 시작 권장(실제 발송 없이 기록만) → 검증 끝나면 `live`로 전환 |
| `SMS_VENDOR` | `solapi` (기본) |
| `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SMS_SENDER`, `KAKAO_PF_ID` | Step 10에서 발급 |
| `ALIGO_KEY`, `ALIGO_USER_ID` | 선택. 미설정 시 자동 스킵 |
| `OTP_PEPPER` | 32바이트 이상 랜덤 문자열 (`openssl rand -hex 32`). 미설정 시 빈 문자열로 조용히 동작하므로 반드시 설정 |
| `IP_HASH_SALT` | 32바이트 이상 랜덤 문자열. 위와 같은 주의 |
| `CRON_SECRET` | Step 5의 `app.settings.cron_secret`과 동일하게 |
| `MG_DEMO_OTP` | 배포 직후 QA 기간에만 `1`, 운영 전환 시 **반드시 삭제 또는 0** (라이브 모드에선 코드가 무시하긴 하지만 습관적으로 정리) |

피드백 전용 시크릿:

| 변수 | 예시/용도 |
|---|---|
| `FEEDBACK_INBOX` | 예: `feedback@micego.kr` — 운영 알림 수신 |
| `FEEDBACK_FROM` | 예: `MICEGO <noreply@notify.micego.kr>` |
| `FEEDBACK_ALLOWED_ORIGINS` | 운영 도메인만, 쉼표 구분 (예: `https://micego.kr,https://www.micego.kr`) |
| `FEEDBACK_STAGING_ORIGINS` | 스테이징/프리뷰 도메인만(Vercel 프리뷰 URL) — 여기 매칭되면 무조건 `is_demo=true` |
| `FEEDBACK_IP_PEPPER` | 32바이트 이상 랜덤 신규 생성. `IP_HASH_SALT`와 **다른 값** |
| `FEEDBACK_CONSOLE_BASE_URL` | 예: `https://micego.kr/admin` |
| `FEEDBACK_CRON_SECRET` | Step 5의 `app.settings.feedback_cron_secret`과 **동일**하게. `CRON_SECRET`과는 다른 값 |
| `FEEDBACK_DAILY_CAP` | 기본 `500` (전역 1일 상한. IP당 1일 상한 30은 코드에 고정) |
| `FEEDBACK_OPS_MAIL_DAILY_CAP` | 기본 `150` |
| `FEEDBACK_ACK_PER_EMAIL_DAY` | 기본 `3` |

**Expected result:** `supabase secrets list`로 전체 확인.
**If it fails:** 값에 쉼표·따옴표가 포함되면 쉘 이스케이프 문제가 흔합니다 — `--env-file` 방식을 쓰면 대부분 해결됩니다.

#### Step 9: 운영자 계정 설정

Supabase 대시보드 → Authentication → Users에서 운영자 계정을 직접 만들고, 해당 유저의 `app_metadata`에 `{"role": "operator"}`를 수동으로 추가합니다. (콘솔에서 초대하는 기능은 D-30으로 결정만 되어 있고 아직 개발 전입니다.)

**Expected result:** 그 계정으로 로그인하면 `admin/*` 콘솔과 피드백 상태 변경(RPC `feedback_set_status`)이 동작.
**If it fails:** `user_metadata`가 아니라 **`app_metadata`**에 넣었는지 재확인(설계서 S3 — user_metadata는 유저가 직접 바꿀 수 있어 절대 신뢰하지 않음).

#### Step 10: 벤더 사전 준비

- **Resend:** 발신 도메인의 SPF·DKIM(가능하면 DMARC까지) 레코드를 DNS에 등록하고 대시보드에서 인증 완료 확인. 인증 전에는 `RESEND_API_KEY`가 있어도 발송이 스팸함행이거나 거부될 수 있습니다.
- **Solapi(CoolSMS):** 발신번호 사전등록(통신사 심사), 카카오 알림톡 채널 연결, `docs/notification-templates.json`의 `alimtalk.code` 9종 템플릿 심사 제출. 심사가 오래 걸릴 수 있으므로 가장 먼저 착수 권장. 인증번호(OTP) SMS는 설계상 알림톡이 아니라 일반 SMS라 이 심사와 무관하게 먼저 동작합니다.
- **Aligo:** 선택 폴백 — 당장 필요 없으면 건너뛰어도 배포가 막히지 않습니다.

**Expected result:** Resend 도메인 상태 "Verified", Solapi 발신번호 "승인".
**If it fails:** 심사 지연 시 `NOTIFY_MODE=log`를 유지한 채로 나머지 단계를 먼저 검증하고, 심사가 끝나면 `live`로 전환.

#### Step 11: 피드백 시스템 전용 확인 항목

이 세 가지는 설계서(F-2, F-4, S19)가 "외부 확인이 필요한 항목"으로 명시한 것으로, 코드는 이미 대응 로직을 갖추고 있지만 실제 인프라 값으로 검증되지 않았습니다.

1. **IP 헤더 구성 확인 (F-2):** 스테이징 배포 직후, 실제 요청을 하나 보내고 `feedback-submit` 함수 로그에서 `cf-connecting-ip` / `x-real-ip` / `x-forwarded-for`가 어떤 값으로 들어오는지 확인합니다. 클라이언트가 헤더를 위조할 수 있는 구성이면 코드의 우선순위(`_shared/feedback_ip.ts`)를 실제 인프라에 맞게 조정해야 할 수 있습니다.
2. **카카오 인앱 실기기 QA (F-4):** 안드로이드·iOS 카카오톡 인앱 브라우저에서 위젯 제출과 `mailto` 폴백이 실제로 동작하는지 확인 — 사이트맵 오픈 전 점검 문서의 카카오 인앱 항목과 함께 진행.
3. **Resend 발신 도메인 SPF·DKIM·DMARC (S19):** Step 10에서 인증했더라도, 실제로 카카오메일·네이버메일 등 국내 주요 메일함에 스팸함이 아닌 정상 수신함으로 들어오는지 테스트 발송으로 확인.

#### Step 12: 개인정보처리방침 문구 반영

설계서 S12/F-12: 회신 이메일을 수집하므로 `ko/privacy.html`, `en/privacy.html`의 "의견 접수" 항목(수집 항목: 회신 이메일·이름·자동 컨텍스트 / 목적: 회신·오류 개선 / 보유 기간: 12개월 후 익명화 / IP 미저장 명시)을 법무 확인 후 확정합니다. 문구는 `build2.py`의 `FEEDBACK_PRIVACY_KO/EN`에 `TODO(legal)`로 표시되어 있으니 수정 후 재빌드합니다.

**Expected result:** privacy 페이지에 확정 문구가 보이고, verify_launch.py가 TODO(legal) 잔존을 더 이상 지적하지 않음.

---

### 검증

- [ ] `bash supabase/tests/run.sh` — 3단계(pglast 구문검사, 실제 PostgreSQL 16 마이그레이션+SQL 테스트, Deno check/test) 모두 `PASS`, **`PASS=12 FAIL=0`** (PASS=11이면 Deno가 없어 단위 테스트가 안 돈 것 — Deno 설치 후 재실행)
- [ ] `python3 verify_feedback.py` 등 기존 verify 스위트 10종 0 FAILS 유지
- [ ] 스테이징 URL에서 피드백 위젯으로 실제 제출 → `admin/feedback.html`(운영 API 모드)에서 새 행 확인 → `FEEDBACK_INBOX`로 운영 알림 메일 수신 확인 → (회신 이메일 입력한 경우) 접수 확인 메일 수신 확인
- [ ] `contact.html`에서도 동일하게 제출 → REF 발급과 두 메일 모두 확인
- [ ] `mgfb-mail-retry` 크론이 10분 뒤 자동 실행되는지 Supabase 대시보드 → Edge Functions 로그에서 확인(401/403이면 Step 5의 `feedback_cron_secret`과 Step 8의 `FEEDBACK_CRON_SECRET` 불일치)
- [ ] 운영 Origin에서 제출한 건은 `is_demo=false`로, 스테이징 Origin에서 제출한 건은 `is_demo=true`로 저장되는지 확인(D4)

---

### 트러블슈팅

| 증상 | 원인 추정 | 조치 |
|---|---|---|
| 위젯 제출이 카카오 인앱에서만 실패 | preflight가 발생하도록 헤더가 잘못 붙음, 또는 mailto 폴백 미동작 | `Content-Type: text/plain`만 쓰는지 확인, Step 11-2 실기기 QA 재실행 |
| 레이트리밋이 비정상적으로 빨리 걸림 | IP 헤더가 실제 클라이언트 IP가 아니라 프록시/로드밸런서 IP로 고정되어 모든 요청이 같은 IP로 집계 | Step 11-1 확인, 필요 시 헤더 우선순위 코드 수정 |
| 운영 알림 메일이 안 옴 | `NOTIFY_MODE=log`로 남아있거나 `RESEND_API_KEY` 미설정, 또는 그날 `FEEDBACK_OPS_MAIL_DAILY_CAP` 초과 | `supabase secrets list`로 값 확인, 콘솔 상세 화면의 "메일 상태"에서 `skipped`/`failed` 사유 확인 |
| 접수 확인 메일이 안 옴 | 회신 이메일 미입력, 동의 미체크, 또는 24시간 내 같은 수신자에게 3건 초과 | 정상 동작(설계 의도). ack_mail_status가 `skipped`면 사유 확인만 |
| `feedback_set_status` 호출 시 `forbidden` | 해당 계정의 `app_metadata.role`이 `operator`가 아님, 또는 역할을 방금 부여해서 기존 세션 JWT에 반영 안 됨(최대 1시간) | Step 9 재확인, 급하면 `auth.admin.signOut`으로 세션 강제 종료 후 재로그인 |
| `mgfb-mail-retry` 크론이 안 도는 것 같음 | Step 2에서 `pg_cron`/`pg_net`이 꺼져 있거나, **DB GUC `app.settings.feedback_cron_secret`이 미등록/시크릿 `FEEDBACK_CRON_SECRET`과 불일치** | Step 5 세 번째 명령 재실행 후 값 대조. 대시보드 Database → Cron Jobs에서 `mgfb-mail-retry` 등록 여부 확인 |
| 알림 디스패치 크론이 매분 401 | `app.settings.cron_secret` GUC와 `CRON_SECRET` 불일치 | Step 5 두 번째 명령 재실행 |

---

### 롤백

- **마이그레이션 롤백은 준비되어 있지 않습니다** (down 마이그레이션 없음). 문제가 생기면 Supabase 대시보드의 Point-in-Time Recovery(플랜에 따라 제공)로 배포 직전 시점으로 되돌리는 것이 가장 안전합니다.
- Edge Function만 되돌리려면 `supabase functions deploy <함수명>`으로 이전 커밋의 코드를 다시 배포합니다.
- 문제가 피드백 기능에 한정된다면, 가장 빠른 완화책은 `config.toml`에서 해당 함수를 비활성화하거나 `FEEDBACK_ALLOWED_ORIGINS`를 비워 사실상 수신을 막는 것입니다 — 기존 회원제·RFP 흐름에는 영향 없음(설계상 완전히 분리된 진입점).

---

### 에스컬레이션

| 상황 | 담당 | 방법 |
|---|---|---|
| 도메인·사업자 정보·법무 문구 확정 필요 | jwlim | 직접 결정 |
| Solapi 알림톡 템플릿 심사 반려 | Solapi 고객센터 | 심사 사유 확인 후 템플릿 재제출 |
| Resend 발신 도메인 인증 실패 | 도메인 DNS 관리자(jwlim 또는 대행사) | SPF/DKIM 레코드 재확인 |

---

### 이력

| 날짜 | 작업자 | 메모 |
|---|---|---|
| 2026-09-27 | jwlim(클로드 작성) | v1 최초 작성 — `supabase/README.md` §2·§3·§8과 `micego-피드백-시스템-설계서-v1`을 근거로 전체 배포 순서를 하나의 런북으로 통합. |
| 2026-09-27 | jwlim(클로드 작성) | **v1.1** — 핸드오프 독립 검증 반영: Step 5 `feedback_cron_secret` GUC 추가(v1의 "GUC 불필요" 문구는 오류), 함수 수 28, `SUPABASE_*` 자동 주입 안내, Step 6 필수 강조, 트러블슈팅 2행 수정·추가. 아직 실제 배포는 진행되지 않음. |
