# MICEGO 개발자 핸드오프 v1 - 클로드

기준일 2026-09-27 · 작성 계정 jwlim@staynmore.com · 대상: 코드를 인수해 **배포·유지보수·미결 기능 개발**을 맡는 개발자(D-27). 이 문서 하나로 첫 주 안에 로컬 빌드·테스트·배포까지 갈 수 있게 썼다. 같은 내용이 클로드 프로젝트 문서 'micego-개발자-핸드오프-v1 - 클로드'에 있다.

---

## 0. 먼저 읽을 것 — 이 문서의 기준 스냅샷과 같은 날 합류한 작업

이 문서와 `SPEC_LAUNCH.md`의 수치(마이그레이션 9 · Edge Function 28 · 이메일 29 · 테이블 29)는 **2026-09-27 10:24 스냅샷** 기준이다. 같은 날 오후 **별도 세션이 지역 파트너 콘솔을 구현해 폴더에 합류**시켰다(`docs/partner-console-impl-v1.md`, 설계서 '지역파트너 콘솔 기술설계서 v1'): 마이그레이션 **0010~0016**(지역·파트너 조직·콘솔 계정·위임·대리 입력·정산·초대 수락·알림), Edge Function **`partner_invite`·`quote_confirm`**(총 30), `admin/partner.js`와 신규 콘솔 페이지 5개(`settlements`·`settlement`·`partner-orgs`·`my-org`·`accept`), `en/confirm.html`(`build_confirm.py`), `verify_admin_partner.py`, `tests/sql/06_partner_console.sql`, 이메일 2종 추가(31). 이 작업은 **D-29(파트너=담당 지역 RFP 전체)·D-30(콘솔 초대)을 이미 구현한 것**이므로 §12·O-5의 "미결"은 그 문서 기준으로 다시 읽어야 한다.

⚠️ **K-12 동시 편집 사고**: 두 세션이 같은 폴더에 동시에 쓰면서 이 핸드오프 패키지의 복사가 파트너 콘솔 세션이 고친 기존 파일(`admin/admin.js`·`data-adapter.js`·`rfp.html` 등, `supabase/functions/_shared/deps.ts`·`errors.ts`·`templates.gen.ts`, `build2.py`·`build_acc*.py`·`build_launch.py`·`verify_launch.py`, `build_notify.py`·`emails/`·`docs/notification-*`)을 10:24 버전으로 되돌린 상태다. **인수 전 반드시 파트너 콘솔 세션의 산출물을 다시 쓰고(그 세션의 작업 사본이 정본), 그 위에 `_handoff_patch_2026-09-27/`의 파일을 적용한 뒤 검증 전체를 다시 돌려야 한다.** 절차는 그 폴더의 `APPLY.md`.

✅ **2026-09-28 해소(git 이관)**: 저장소 첫 커밋이 PC 폴더 원본 그대로이고, 두 번째 커밋에서 `APPLY.md` 절차를 끝냈다 — 파트너 콘솔 산출물(0010~0016·`isPartner`·`inviteUserByEmail`)은 폴더에 이미 살아 있었고, 되돌려진 것은 약관 전문 훅(`build2.py`의 `build_legal.py` 호출·`site.config.json` `legal` 블록·`build_sitemap.py` v1.3)과 경로 하드코딩(`build_notify.py`·`build_legal.py`)뿐이어서 이를 복원했다. 검증 11종 0 FAILS, `supabase/tests/run.sh` PASS=13. 패치 원본은 `knowledge/archive/handoff-patch-2026-09-27/`. 이제 동시 편집은 브랜치로 분리한다(D-36).

## 1. 서비스 한 장 요약

- **무엇**: 한국 오거나이저(여행사·랜드사·기업)가 확정 일정의 해외 MICE 행사 요건(RFP)을 등록 → MICEGO가 회사명·예산을 뺀 요청서를 해외 파트너 호텔에 토큰 링크로 보냄 → 호텔이 견적 제출 → 운영자가 비교표로 전달 → 오거나이저가 휴대전화 OTP로 제안 선정 → 선정 호텔에만 신원 공개(성사).
- **누가**: 운영 주체 **MatchGo(매치고)** 단독(약관 당사자). STAYNMORE·트래블멤버스는 코드와 고객 대상 문서에 등장하지 않는다(내부 결정 로그의 작성 계정 표기만 예외). 지역 운영 파트너(예: 태국 Tmthai, 커미션 70:30)가 콘솔을 직접 쓰기로 결정됨(D-29) — **아직 미구현**(O-5).
- **수익**: 호텔 성사 커미션(율 미확정·비공개, O-7). 오거나이저 수수료 없음.
- **고객 공개 정책 6종**(랜딩에 이미 게시): 오거나이저 수수료 없음 / 해외 호텔만 / 영업일 3일 이내 회신 / 회사명·예산 호텔 비공개 / 최소 규모 없음 / 확정 일정만 접수.
- **사용자 3종과 진입점**: 오거나이저(`ko/`, 회원 선택·비회원 가능) · 호텔(`en/`, 로그인 없음, 이메일 토큰 링크 `en/bid.html?t=`) · 운영자/파트너(`admin/`, Supabase Auth + `app_metadata.role`).

## 2. 아키텍처

```
[브라우저]  ko/·en/ 정적 HTML (Plain ES5)         admin/ 콘솔 (Plain ES5)
              │ assets/mg.js                          │ admin/data-adapter.js (MGA)
              │  ├─ MG.mode='api'  → Edge Functions   │  ├─ mode='api'  → PostgREST RPC(admin_*) + Edge(admin_member_action)
              │  └─ MG.mode='mailto'(설정 없음)        │  └─ mode='mock' → mock-data.js
              ▼                                       ▼
[Supabase]  Edge Functions 28개 (Deno) ──SUPABASE_DB_URL 직접접속──▶ Postgres: private.* 함수(상태머신·OTP·enqueue)
            PostgREST /rest/v1/rpc/*  ──사용자 JWT──▶ public.* RPC (my_rfps, admin_snapshot …, RLS)
            pg_cron: mg-dispatch-notifications(매분) · mg-system-tick(10분) · mgfb-*(피드백 4종)
            Edge dispatch_notifications ──▶ Resend(이메일) · Solapi(SMS/알림톡) · Aligo(폴백)
[호스팅]    Vercel (정적, vercel.json = 보안 헤더·CSP 정본)                         ← D-28
```

핵심 원칙(`SPEC_LAUNCH.md §0`): (1) GoTrue Admin API가 필요한 작업은 SQL RPC로 못 하므로 Edge Function 경유. (2) 프론트는 빌드 산출물이며 설정 파일 하나(`site.config.json`)로 데모↔운영 전환. (3) 회원 생성은 `signup_start` Edge Function만(`enable_signup=false`). (4) OTP·재설정 같은 비밀 코드는 큐를 거치지 않고 단일 채널로 인라인 발송.

## 3. 리포지토리 지도와 규모

`micego-site/` 약 305 파일. Python 8.4k줄(생성기·검증) · TypeScript 5.9k줄(Edge, 생성물 `templates.gen.ts` 2.9k 제외) · SQL 3.1k줄 · JS 3.3k줄(프론트·콘솔). 자세한 폴더 구조는 `README.md`.

**생성물 vs 원본** — 가장 자주 하는 실수:
- 생성물(손대지 말 것): `ko/*`, `en/*`, `index.html`, `404.html`, `sitemap.xml`, `robots.txt`, `assets/config.js`, `_headers`, `vercel.json`, `emails/*`, `docs/notification-*`, `docs/sitemap.*`, `supabase/functions/_shared/templates.gen.ts`.
- 원본: `build*.py`, `legal_render.py`, `src/*.html`(디자인 원천), **`legal/*.json`(약관·방침 전문 — HTML이 아니라 여기를 고침)**, `site.config.json`, `assets/mg.js`, `assets/feedback.js`, `admin/*`, `supabase/**`(templates.gen.ts 제외), `docs/state-transitions.html`·`docs/{launch-checklist,incident-runbook,operator-onboarding}.md`(직접 편집; .html은 그 md에서 만든 사본).
- 주의: `docs/notification-templates.json`도 생성물이다. 알림 문안은 `build_notify.py`에서 고친 뒤 `sync_templates.py`까지 다시 돌린다.

## 4. 스펙 인덱스 — 코드 주석의 `§`가 가리키는 곳

| 파일 | 내용 | 코드 인용 형태 |
|---|---|---|
| `SPEC_LAUNCH.md` | DB 스키마(§2) · Edge API 26개 표·오류 카탈로그·뷰모델(§3) · 알림/OTP/config.toml(§4) · mg.js(§5, =SS5) · 콘솔 어댑터(§6) · 검증 계획(§8) · 파일 소유권 WP1/2/3(§9) · 배포·시크릿(§10) | `SPEC_LAUNCH.md §3` |
| `SPEC_ACCOUNTS.md` | 회원제 화면·규칙(A1~A11), 콘솔(B), 알림 ACC_*(C) | `SPEC_ACCOUNTS.md A5` |
| `SPEC_FEEDBACK.md` | 피드백(VOC) 시스템 설계서 전체(§0 D1~D7 결정, §2 DB, §3 Edge, §4 위젯, §5 콘솔, §6 보안 S1~S19) | `SPEC_FEEDBACK.md §3.9`, `D1/D2`, `S12` |
| `SPEC_FEEDBACK_ADDENDUM.md` | 피드백 구현 확정(§A), 작업 패키지 WP-F1~F3(§B), 검증(§C) | `SPEC_FEEDBACK_ADDENDUM.md §B` |
| `docs/state-transitions.html` v1.7 | RFP·초대·파트너·회원·공유링크·피드백 상태 머신 + 알림 ID | — |
| `legal/*.json` + `legal/REVIEW_NOTES.md` | 이용약관(23조)·Partner Terms(20조)·개인정보처리방침(16조)·Privacy Notice(12항) 전문과 법무 검토 쟁점 31곳 | — |
| `docs/launch-checklist.md` · `incident-runbook.md` · `operator-onboarding.md` | 오픈 당일 체크리스트 · 장애 대응(13 시나리오) · 운영자 온보딩 | — |

⚠️ `SPEC_LAUNCH.md`와 `SPEC_FEEDBACK_ADDENDUM.md`는 원본 유실 후 **2026-09-27 코드에서 역추출한 v1.0**이다(D-31). 스펙과 구현이 다르면 구현이 맞다. 두 문서에서 "(비인용)"·"재구성" 표시 부분은 추정을 포함한다.

## 5. 백엔드 요약

- **마이그레이션 9개**(테이블 총 29개 = 0002 24 + 0005 1 + 0008 4): 0001 확장·enum(rfp_state 10종, partner_state, member_state, share_state …) → 0002 테이블 24개(members, rfps, rfp_tokens, partners, invitations, quotes, selections, otp_codes, notification_log/deliveries, kr_holidays, settings …) → 0003 private 함수(rfp_transition, due, enqueue, pick_and_win, finalize_won, system_tick) → 0004 회원 RPC → 0005 운영자 RPC + notif_template_meta → 0006 RLS → 0007 크론 → 0008·0009 피드백(테이블 4, RPC, 크론 4).
- **Edge Function 28개** = RFP/비딩 7 · 회원·인증 12 · 콘솔 1 · 문의·구독 2 · 알림 1 · 파트너 등록 1 · 공유링크 2 · 피드백 2. 각 함수 `handle.ts` 첫 줄 주석에 인증·요청·응답 형식이 적혀 있다. 오류는 `_shared/errors.ts` 카탈로그(`MG:CODE`)로 통일, 프론트 `mg.js` ERRORS가 미러.
- **호출 경로 2종**: Edge Function은 DB에 직접 접속해 `private.*` 함수를 부르고, 프론트는 PostgREST RPC로 `public.*` 함수를 부른다(RLS 적용). 두 경로를 모두 쓰는 함수는 `create_share_link`·`revoke_share_link`뿐이다.
- **크론**: 알림 디스패치(매분, 배치 50, 재시도 백오프 1/5/30/120분, 5회째 실패에서 `failed`) · 시스템 틱(10분: bidding→collecting 자동전이, 마감 24h 리마인더, 공유링크 30일 만료, 미완료 가입 72h 파기).
- **OTP**: 자체 테이블, `sha256(code:otp_id:OTP_PEPPER)`, 5오답→무효/잠금, 재발송 쿨다운 60s, 일 한도. SMS 채널은 알림톡이 아닌 일반 SMS(심사 무관).
- **테스트**: `supabase/tests/run.sh` 3단계(pglast → 실제 PostgreSQL 16에 마이그레이션+시드+SQL 테스트 5종 → Deno check + 단위 테스트 91개). 2026-09-27 **PASS=12 FAIL=0**(Deno 포함). Deno가 없으면 esbuild 구문검사로 대체되어 PASS=11이 되는데, 그 경우 `handle.ts` 타입체크·단위 테스트가 **안 돈 것**이다 — 반드시 Deno를 설치할 것(`npm i -g deno` 또는 `MG_DENO_BIN`). 2단계는 root 권한·`runuser postgres`·`/usr/lib/postgresql/16/bin`을 전제로 한다.

## 6. 프론트·콘솔 요약

- 공개 페이지는 `?state=…`로 모든 상태를 미리 볼 수 있다(demo 빌드에서만). track 11상태, bid 8상태, signup 12상태 등 — 목록은 `docs/sitemap.html`.
- 회원 세션은 `mg_session_v1`(mg.js) / 데모 세션은 `sessionStorage.mg_demo_member`. 
- 콘솔 `admin/`은 mock 모드에서 데모 시계 `2026-10-08 19:30` 고정(`DEMO_CLOCK`) — api 모드에서는 실시간.
- 피드백 위젯 `assets/feedback.js`는 모든 페이지에 주입되며 Supabase 미설정 시 문의 페이지 링크로 대체.

## 7. 외부 서비스·계정 (이관 체크리스트)

| 서비스 | 용도 | 계정 소유 | 상태 |
|---|---|---|---|
| Supabase | DB·Auth·Edge·cron | jwlim → 개발자 초대 | **미생성** |
| Vercel | 정적 호스팅 | jwlim → 팀 초대 | **미생성** |
| 도메인(micego.kr 가정) | 사이트·메일 | jwlim | **미확정** — `site.config.json.domain` 빈칸 |
| Resend | 이메일 발송 | jwlim | 미가입. 발신 도메인 SPF/DKIM/DMARC 필요 |
| Solapi(CoolSMS) | SMS·알림톡 | jwlim | 미가입. 발신번호 사전등록·카카오 채널·알림톡 템플릿 9종 심사(가장 오래 걸림 — 먼저 착수) |
| Aligo | SMS 폴백 | — | 선택 |
| GA4 / 네이버·구글 서치콘솔 | 분석·인증 | jwlim | 미설정, `site.config.json`에 자리만 |
| 임시 접수 메일 | mysteri1984@gmail.com | jwlim 개인 | 공개 페이지(ko·en·index) 22개 파일에 노출 — 전부 `site.config.json.officialEmail/privacyEmail`에서 주입되므로 값 교체·재빌드로 일괄 해결 |

## 8. 설정·시크릿

- 프론트: `site.config.json` 한 파일 — domain / officialEmail / privacyEmail / operator(사업자 정보 8항목) / analytics.ga4 / siteVerification / supabase{url, anonKey, functionsUrl} / sms.vendorName / prod / demo. 현재 **전부 빈칸·demo:true**.
- 백엔드: `.env.example`의 32개 키(이 중 `SUPABASE_*` 4개는 런타임 자동 주입 — 직접 설정하지 않음). **DB GUC 2개**를 시크릿과 같은 값으로 등록해야 크론이 인증된다: `app.settings.cron_secret`=`CRON_SECRET`, `app.settings.feedback_cron_secret`=`FEEDBACK_CRON_SECRET`(후자는 런북 v1에 빠져 있던 항목 — v1.1에서 추가). `FEEDBACK_IP_PEPPER`는 `IP_HASH_SALT`와 다른 값. `NOTIFY_MODE=log`로 시작.
- 운영자 계정: 당장은 대시보드에서 생성 + `app_metadata.role="operator"` 수동(`user_metadata` 아님). 콘솔 초대 기능은 신규 개발(D-30).

## 9. 배포 순서

프로젝트 문서 **'micego-백엔드-배포-런북 v1.1'** Step 1~12를 그대로 따른다(Supabase link → 확장 4종 → `db push` → seed → GUC 2종 → 템플릿 sync → functions deploy → secrets → 운영자 계정 → 벤더 준비 → 피드백 확인 항목 3개 → 개인정보 문구). 저장소 안에서는 `supabase/README.md` §2~§4가 같은 순서를 담고 있다.

정적 사이트: `site.config.json`을 복사해 `site.config.prod.json`(domain·메일·사업자·supabase 키·`prod:true`·`demo:false`)을 만들고 `MG_SITE_CONFIG=site.config.prod.json python3 build2.py` → 산출물이 **같은 폴더에 덮어써지므로** 배포용 브랜치/작업 트리에서 빌드한다. Vercel에는 이 폴더를 올리되 `.vercelignore`가 `supabase/`·`src/`·`*.py`·`*.md`·시드를 제외한다(없으면 소스·데모 시드·내부 결정 문서가 공개됨). `admin/`·`docs/`·`emails/`는 아직 배포에 포함되므로 O-1 결정 전까지 접근 제한 없음에 유의. 롤백: DB는 down 마이그레이션 없음 → PITR, Edge는 이전 커밋 재배포.

**오픈 전 사용자(jwlim) 몫**: 도메인·공식 메일, 사업자 정보, 약관 전문 확정 — `legal/*.json`의 `[법무 검토]` 표시 31곳(`legal/REVIEW_NOTES.md`가 항목별 쟁점 정리)을 법무와 확정한 뒤 `site.config.json.legal.reviewed=true`·`effectiveDate` 기재. 그 밖에 `TODO(legal)` 3곳(ko/index 1 · ko/withdraw 1 · en/terms 1), Solapi/Resend 심사, 실기기 QA(카카오 인앱·삼성 인터넷·iOS Safari).

## 10. 검증 방법

`README.md` 빠른 시작의 10개 `verify_*.py` + `run.sh`. 각 스크립트의 대상: verify2(공개 페이지·track) · verify3(bid·이메일) · verify_acc(회원 페이지) · verify_launch(3가지 빌드 구성 — (a) 기본 데모 빌드의 바이트 동일성, (b) 스텁 Supabase 설정을 넣은 staging 빌드, (c) prod 빌드의 데모 흔적 제거·헤더·sitemap; 실제 키가 아닌 자체 스텁 설정을 쓴다) · verify_api(supabase-stub로 API 모드 플로우 15개) · verify_feedback(위젯·3빌드) · verify_admin/ops/members/feedback(콘솔). 페이지 공통 기준: 360/768/1280에서 콘솔 오류 0, h1 1개, 가로 오버플로 없음. **2026-09-27 전부 0 FAILS**(이 폴더 경로에서 재확인).

## 11. 알려진 결함·기술부채 (우선순위순)

| # | 내용 | 조치 제안 |
|---|---|---|
| K-1 | **`admin/`·`docs/`·`emails/`가 정적 파일로 공개 배포됨.** robots 차단과 콘솔 로그인만 있고 파일 자체는 누구나 받을 수 있음(mock-data.js 포함) | Vercel Password Protection 또는 admin을 별도 프로젝트로 분리(O-1). 오픈 차단급 |
| K-2 | SQL이 던지는 `GUARD_*`·`INVALID_TRANSITION`·`FORBIDDEN_FIELD`가 `errors.ts` 카탈로그에 없어 Edge 경로에서 `INTERNAL(500)`로 뭉개짐(콘솔 RPC 경로는 보존) | 카탈로그에 추가 + `fromSqlError` 매핑 |
| K-3 | 클라이언트 이메일 정규식(`build2.py` EMAIL_RE)에 TLD 길이 제한이 없어 서버 422와 어긋날 수 있음 | 서버 `validate.ts`와 동일 정규식으로 통일 |
| K-4 | `OTP_PEPPER`·`IP_HASH_SALT` 미설정 시 빈 문자열로 조용히 동작 | 기동 시 필수 env 검증·fail-fast |
| K-5 | `get_bid`: 요청이 won/lost/rejected인데 해당 호텔이 견적을 안 냈으면 라벨이 "open"으로 보임(수정은 마감으로 막힘) | 상태 판정 순서에서 종료 상태를 먼저 확인하도록 고친다 |
| K-6 | 의도적 스펙 이탈 2건 — `account_update.email_start` 응답 형태, `INTERNAL_INBOUND` 템플릿이 JSON 파이프라인 밖(`_shared/notify/internal.ts`) | 문서화됨(SPEC_LAUNCH §3·§4). 유지 가능 |
| K-7 | 공휴일 시드(`kr_holidays`)가 2026년까지만 | 매년 추가 — 콘솔 설정 탭 '공휴일'에서 가능하도록 |
| K-8 | 다중 통화 견적의 비교 기준 미정(USD 참고 환산은 제출 금액 그대로) | O-6 |
| K-9 | 콘솔 mock의 데모 시계·예시 데이터(REF MG-2610-014, 김지은 등)가 prod 빌드 검사에 NOTE로 남음(verify_launch) | api 모드 전환 후 잔여분 제거 |
| K-10 | 저장소 밖 PC 폴더 `_archive/초기시안/`의 프로토타입 2종에 미채택 가격 카피(10% 커미션 등)가 남아 있음. 빌드 원천은 저장소 안 `src/`이며 내용이 다름(그리드 수정은 같고 카피만 사이트 기준) | 개발자는 `_archive`를 받지 않아도 됨. 참고용으로만 취급 |
| K-11 | git 이력 없음 — 이 스냅샷이 최초 커밋 | 첫 커밋을 `v0.9.0-prelaunch` 태그로 |
| K-12 | **동시 편집 사고(09-27)**: 클로드 세션 두 개가 같은 PC 폴더에 동시에 쓰다가 한쪽(약관 전문·운영 문서 작업)의 `build2.py`·`site.config.json`·`build_sitemap.py`·약관 페이지 변경이 다른 쪽 복사로 덮어써짐. 남은 산출물(`legal/`, `build_legal.py`, 루트 sitemap md)로 복원해 `docs/sitemap.md`가 바이트 동일하게 재생성됨을 확인 | git 도입 후에는 브랜치로 분리. git 전까지는 **한 번에 한 세션만** 폴더에 쓰기 |

## 12. 미결 결정 (개발자와 함께)

`DECISIONS.md` 하단 O-1~O-7. 이 중 아키텍처 영향: **O-1**(admin 접근 제한 — 배포 방식) · **O-5**(지역 파트너 역할 — 현재 역할은 `app_metadata.role`에만 있고 운영자 테이블은 없다. 후보 설계: 역할 값 추가 + 담당 지역 저장 위치(app_metadata vs 신규 테이블) 결정 + `rfps`·`partners`·`quotes` RLS에 지역 조건 + 콘솔 필터·감사 로그. 역할 이름은 기존 코드에서 `partner`가 **호텔**을 뜻하므로(`partners`, `partner_state`, `PTN_*`) `regional_operator` 같은 다른 이름을 쓸 것 — D-29·D-30 구현) · **O-2**(첨부파일 Storage).

## 13. 첫 주 권장 순서

1. 이 저장소를 git init → 첫 커밋(`v0.9.0-prelaunch`) → GitHub private. `python3 build2.py && python3 build_notify.py && python3 build_sitemap.py && python3 supabase/scripts/sync_templates.py` 후 diff가 비어 있는지 확인(재현성 — 2026-09-27 확인됨).
2. 검증 10종 + `run.sh` 로컬 실행(Deno 설치 필수, 2단계는 PostgreSQL 16 바이너리와 root/`postgres` OS 사용자 필요).
3. Supabase 프로젝트 생성 → 런북 Step 1~9 (`NOTIFY_MODE=log`). Vercel 프리뷰 배포 → `site.config.json`에 키 입력 → `verify_launch` (c) api 빌드.
4. K-1(admin 보호) 해결 방식 결정·구현.
5. D-29/D-30(파트너 역할·계정 초대) 설계 → 마이그레이션 0010.
6. Solapi 알림톡 템플릿 심사 제출(리드타임 김).

## 14. 연락·문서

- 의사결정: jwlim@staynmore.com. 정책·카피 변경은 `DECISIONS.md`에 먼저 기록.
- 운영 문서(개발자도 읽을 것): `docs/launch-checklist.md`(오픈 당일), `docs/incident-runbook.md`(장애 대응 13 시나리오), `docs/operator-onboarding.md`(운영자 온보딩), 프로젝트 문서 'VOC SOP·CX v1'.
- 클로드 프로젝트 문서: 진행 현황 · 배포 런북 v1 · 회원제 설계서 v1 · 피드백 시스템 설계서 v1 · VOC SOP·CX v1 · 사이트맵·오픈 전 점검 v1 · 이 문서.
- 운영 SOP v2.1(상태전이 기준): https://claude.ai/code/artifact/f5dfc914-3da2-45c5-aa28-f37bdb9094be
- 사업 기획안 v1.1: https://claude.ai/artifact/Ts2bis69dniWjaFAyLh9k2 · 지역 파트너 모델: https://claude.ai/artifact/V42LwLd12kVbYupL3L7B6b

## 이력

| 날짜 | 작업자 | 변경 |
|---|---|---|
| 2026-09-27 | jwlim(클로드 작성) | v1 최초 작성 + 독립 검증(Opus) 지적 반영: 피드백 크론 GUC 누락, `.vercelignore` 신설, `templates.gen.ts` 재생성(43→45)·Deno 테스트 실행, 수치 정정. 동시 조치: 스펙 4종 배치(D-31), 빌드 경로 하드코딩 제거(D-34), 디자인 원천 `src/` 고정(D-33), 가격 카피 결정(D-32), 모바일 그리드 수정 사이트 반영, README/requirements/.gitignore/.env.example/DECISIONS/CHANGELOG 신설, supabase/README 수치 정정 |
