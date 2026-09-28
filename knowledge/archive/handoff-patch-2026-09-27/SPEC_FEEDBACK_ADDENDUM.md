# SPEC_FEEDBACK_ADDENDUM.md — 피드백 시스템 구현 부록 (구현 기준 역추출본 v1.0, 2026-09-27)

이 문서는 유실된 `SPEC_FEEDBACK_ADDENDUM.md`를 코드에 남은 인용(주석 속 `SPEC_FEEDBACK_ADDENDUM.md §…` 참조)만 근거로 역추출한 것이다. 원본 부록의 문장·구조는 알 수 없으며, 여기 적힌 내용은 "코드가 실제로 그렇게 동작한다"는 사실만을 기술한다. 확인할 수 없는 부분은 표시해 두었다. 본 스펙인 `SPEC_FEEDBACK.md`(프로젝트 문서 "micego-피드백-시스템-설계서-v1")는 §0~§8까지 남아 있고, 이 부록은 그 본 스펙이 구현 단계에서 남긴 세부 결정·예외 사항을 담는 후속 문서였던 것으로 보인다. 코드 주석은 A.1~A.5를 "구현에서 역추출"이라고 명시하고, A6(§A.6)만 스펙보다 부록이 우선한다고 명시한다.

## §A. 구현 확정 사항

### A.1 설정 주입

`build_launch.py`가 사이트 빌드의 마지막 단계에서 `site.config.json` → `assets/config.js`로 `window.MICEGO_FEEDBACK` 객체를 생성한다. 별도의 `assets/site-config.js`는 없고, 이미 만들어져 있는 `CFG`/`MG_CONFIG` 소스에서 파생시킨다.

- 엔드포인트: `functionsUrl`이 있으면 그것을, 없으면 `supabaseUrl + '/functions/v1/feedback-submit'`을 사용한다(위젯 쪽 `endpoint()`, `assets/feedback.js`).
- 키 전체:
  - `supabaseUrl` — `CFG.supabase.url` (없으면 `''`)
  - `anonKey` — `CFG.supabase.anonKey` (위젯은 쓰지 않음. `window.MG_CONFIG`와의 형태 통일을 위해서만 유지)
  - `functionsUrl` — `CFG.supabase.functionsUrl`
  - `fallbackEmail` — 사이트 공식 메일(`MAIL`)
  - `contactPath` — `{ko: '/ko/contact.html', en: '/en/contact.html'}`
  - `buildVersion` — 아래 규칙
  - `launcher` — 항상 `true`
  - `disabled` — 항상 `false`
- `buildVersion` 규칙: git 커밋 해시를 쓰지 않는다. `YYYY.MM.DD` (오늘 날짜, KST 아님 — `datetime.date.today()`) + `-` + `MG_BUILD_NO` 환경변수(기본값 `'0'`). 같은 날 다시 빌드해도 값이 같을 수 있으므로, 하루에 여러 번 빌드해 구분이 필요하면 `MG_BUILD_NO`를 올려야 한다.
- `launcher`/`disabled`: 코드에는 상수로 `true`/`false`만 있다 — 즉 현재 `build_launch.py`에는 이 두 값을 운영자가 끌 수 있는 구성 경로가 없다(위젯 쪽은 `cfg.launcher === false`나 `cfg.disabled`를 읽어 런처를 감추거나 위젯 자체를 비활성화하는 로직을 갖고 있지만, 빌드 쪽에서 그 값을 채워 넣는 지점은 없다 — 부록에 "향후 운영자 토글용으로 남겨 둔 필드"라는 설명이 있었을 가능성이 있으나 (소스 미확인)).
- 이 객체는 모든 생성 페이지(`index.html`, `ko/*`, `en/*`)의 `<head>`에서 `assets/mg.js` 바로 뒤에 로드되는 `assets/feedback.js`가 유일하게 참조한다(`assets/feedback.js`는 `assets/mg.js`가 실패해도 동작해야 하므로 `MG_CONFIG`가 아니라 `MICEGO_FEEDBACK`만 본다).
- `window.MICEGO_PAGE_STATE.rfpRef`(예: `en/bid.html`, `ko/track.html` 등 build2.py가 만드는 상태 페이지)도 이 A.1 결정의 연장으로 코드에 인용되어 있다: "api 모드가 서버 데이터를 실제로 확정하기 전까지 `rfpRef`는 `null`로 둔다(데모 모드는 애초에 값을 지어내지 않는다)"는 규칙이 `build2.py:885`, `build2.py:1169`, `en/bid.html`, `ko/track.html`에서 모두 addendum §A.1로 인용된다. 즉 A.1은 "설정 값(그리고 그 설정이 채워지기 전까지의 기본값)은 실제로 확정되기 전에는 지어내지 않는다"는 원칙까지 포함했던 것으로 보인다.

### A.2 단순 CORS 요청과 verify_jwt=false

`supabase/functions/_shared/feedback_cors.ts`, `supabase/config.toml`가 근거.

- `feedback-submit`, `feedback-mail-retry` 둘 다 `config.toml`에서 `verify_jwt = false`. 게이트웨이 단의 JWT 검증을 끄고, 인증이 필요한 경우 함수 내부에서 직접 처리한다(회원 세션은 본문 `auth.access_token`, 콘솔 단건 재발송은 `Authorization: Bearer` 헤더).
- 이유(주석 근거): 위젯·`contact.html`은 `apikey`/`Authorization` 헤더를 붙이지 않는 "단순 요청(simple request)"으로만 호출한다. 헤더를 붙이면 preflight(OPTIONS)가 생기고, 카카오톡 등 구형 인앱 WebView에서 이 OPTIONS 요청이 유실되는 경로가 있었다(코드 주석 "구형 WebView에서 유실되는 경로가 생기기 때문").
- 그래서 기존 `_shared/http.ts`의 공용 `corsHeaders()`(그 SITE_ORIGINS 목록도 포함)를 재사용하지 않고 `feedback_cors.ts`를 별도로 둔다. `feedback-submit`/`feedback-mail-retry`는 각각 다른 Origin 판정 규칙을 쓴다:
  - `resolveOrigin(origin, env)` — `feedback-submit`용. `FEEDBACK_ALLOWED_ORIGINS`(운영)와 `FEEDBACK_STAGING_ORIGINS`(스테이징) 두 콤마구분 목록 중 어디에 속하는지로 `allowed`/`isDemo`를 정한다. 어느 쪽에도 없으면 거부.
  - `resolveConsoleOrigin(origin, env)` — `feedback-mail-retry`의 단건(브라우저·콘솔) 호출 전용. `FEEDBACK_CONSOLE_BASE_URL`의 origin과 정확히 같을 때만 허용.
- 응답 헤더: 허용 시 `Access-Control-Allow-Origin`에 요청 Origin을 그대로 echo, 불허(또는 Origin 헤더 자체가 없음)면 ACAO 헤더를 아예 안 준다. 항상 `Vary: Origin`, `Cache-Control: no-store`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: content-type`, `Access-Control-Max-Age: 86400`.
- OPTIONS는 `feedback-submit/index.ts`에서 204 + 위 헤더로 즉시 응답, 본문 처리(`handle()`)로 넘어가지 않는다.

### A.3 응답 포맷 {ok,error}

`supabase/functions/feedback-submit/errors.ts` 근거. 기존 공용 `_shared/errors.ts`(MGError/`{error:{code,message_ko,message_en}}`)를 재사용하지 않고 피드백 전용 포맷을 쓴다 — "코드만 내려주고 문구는 위젯 쪽 i18n이 담당한다"는 원칙(코드 주석)이다.

성공: `{ok:true, ref, duplicate, ack}` (`ack`는 `'queued'|'none'`).

오류: `{ok:false, error:{code, retry_after_sec?, fields?}}`. 오류 코드 10종과 HTTP 상태:

| 코드 | 상태 | 비고 |
|---|---|---|
| `BAD_JSON` | 400 | 본문이 JSON이 아니거나 객체가 아님(배열 포함) |
| `BAD_VERSION` | 400 | `v !== 1` |
| `VALIDATION` | 400 | `fields: [{name, code}]` 동봉 |
| `ORIGIN_DENIED` | 403 | Origin이 허용 목록에 없음(또는 Origin 헤더 없음) |
| `METHOD_NOT_ALLOWED` | 405 | POST 외 메서드 |
| `DUPLICATE_CONTENT` | 409 | 24시간 내 동일 `body_hash` |
| `TOO_LARGE` | 413 | 16,384바이트 초과(Content-Length 선확인 + 실측 재확인) |
| `RATE_LIMITED` | 429 | IP 10분/24시간 한도, `retry_after_sec` 동봉 |
| `BUSY` | 503 | 전역 일일 한도(`FEEDBACK_DAILY_CAP`, 기본 500), `retry_after_sec` 동봉 |
| `INTERNAL` | 500 | 그 외 처리되지 않은 예외 |

`feedback-mail-retry`는 별도 오류 카탈로그(`RetryError`, `handle.ts`)를 쓴다: `FORBIDDEN`(403) / `NOT_FOUND`(404) / `BAD_REQUEST`(400) / `INTERNAL`(500) — 4종. `{ok:false,...}` 포맷을 따르는지는 `index.ts`(feedback-mail-retry)를 확인하지 못했다(소스 미확인 — `feedback-mail-retry/handle.ts`만 읽었고 `index.ts`의 응답 직렬화 방식은 이번 조사 범위에서 별도로 열어보지 않았다. 필요하면 `supabase/functions/feedback-mail-retry/index.ts` 재확인 요망).

### A.4 Origin 기반 is_demo 판정

`feedback_cors.ts`의 `OriginResolution.isDemo` — "D4: 스테이징 Origin이면 항상 `true`, 운영이면 항상 `false`. 클라이언트 힌트는 무시한다"(코드 주석 원문). `handle.ts`에서도 `const isDemo = originRes.isDemo; // D4: 클라이언트 힌트 무시, Origin 으로만 정한다`로 재확인된다.

- 클라이언트(`assets/feedback.js`)는 `ctx.is_demo_hint`를 만들어 보내지만(`data-mode="demo"` 속성 또는 `?state=` 쿼리 존재 여부로 판단), 서버는 이 값을 절대 신뢰하지 않고 `FEEDBACK_ALLOWED_ORIGINS`/`FEEDBACK_STAGING_ORIGINS` 중 요청 Origin이 어느 목록에 속하는지로만 `is_demo`를 확정한다.
- `is_demo=true`(스테이징)면: 운영 알림 메일(`ops_mail_status`)은 무조건 `skipped`, 접수 확인 메일(ack)도 스킵되고, 전역 일일 한도·중복 판정에는 여전히 걸리지만 콘솔 기본 필터(`feedback.html`)에서는 숨겨진다(운영자가 명시적으로 "DEMO 포함" 필터를 켜야 보임 — `A.feedbackNewCount()`도 `!f.is_demo` 조건으로 배지 집계에서 제외).

### A.5 레이트리밋·메일 상한 (구현에서 역추출)

`feedback_rate_hit(ip_hash, max_10m, max_day, global_day)` (RPC, `security definer`, `search_path = private, public, pg_temp`, `service_role`에게만 EXECUTE 부여):

- `pg_advisory_xact_lock(hashtextextended('mgfb:'||ip_hash, 0))`로 같은 IP 동시 요청을 직렬화.
- 10분 창: `count(*) from private.feedback_rate_event where ip_hash=... and created_at > now()-10min`이 `p_max_10m`(호출부에서 `5`) 이상이면 거부, `reason:'ip_10m'`, `retry_after_sec:600`.
- 24시간 창: 같은 조건으로 `p_max_day`(호출부에서 `30` — 주의: `handle.ts`가 넘기는 세 번째 인자는 `30`으로 고정, `FEEDBACK_DAILY_CAP` 환경변수는 이 값이 아니라 **네 번째 인자(전역 한도)**에 쓰인다) 이상이면 거부, `reason:'ip_day'`, `retry_after_sec:86400`.
- 전역 하루 한도: `is_demo=false`인 `feedback` 행이 최근 24시간 내 `p_global_day`(환경변수 `FEEDBACK_DAILY_CAP`, 기본 500) 이상이면 거부, `reason:'global'`, `retry_after_sec:3600`.
- 통과하면 `private.feedback_rate_event`에 1행 기록 후 `{allowed:true}`.
- `reason:'global'` → 위젯 오류 코드 `BUSY`, 그 외(`ip_10m`/`ip_day`) → `RATE_LIMITED`(둘 다 `retry_after_sec`는 RPC가 아니라 `handle.ts`가 각각 `rl.retry_after_sec ?? 3600` / `?? 600`으로 재확인, RPC 값을 그대로 전달).
- IP는 원문·해시 어느 쪽도 `feedback` 테이블에 저장하지 않는다(S6). `private.feedback_rate_event.ip_hash`에만 최대 48시간 남고, `feedback_rate_purge()`(10분마다 `mgfb-mail-retry`와 별개로 매시 7분 cron, `0009_feedback_cron.sql`)가 48시간 초과분을 지운다.
- IP 해시: `hashIpForRateLimit` — `cf-connecting-ip → x-real-ip → x-forwarded-for` 첫 값 우선순위로 추출(`extractIp`), IPv6는 `/64` 접두사로 정규화(`normalizeIp`), `HMAC-SHA256(FEEDBACK_IP_PEPPER, ip)`의 앞 32자. IP가 없으면 해시하지 않고 공용 버킷 문자열 `'noip'`.
- 메일 상한(환경변수, 기본값은 `envInt()`의 fallback):
  - `FEEDBACK_OPS_MAIL_DAILY_CAP`(기본 150) — 최근 24시간 `ops_mail_status='sent'` 건수가 이 값 이상이면 이번 건의 운영 알림은 `skipped`(단, `is_demo`나 `is_suspect`면 애초에 이 카운트 자체를 세지 않고 바로 `skipped` 취급).
  - `FEEDBACK_ACK_PER_EMAIL_DAY`(기본 3) — 같은 `reply_email`로 최근 24시간 `ack_mail_status='sent'`가 이 값 이상이면 이번 건의 접수 확인 메일은 `skipped`.
  - 의심 판정(`is_suspect`)은 (1) 본문에 URL 4개 이상(`countUrls > 3`), (2) `dwell_ms`가 0보다 크고 3000ms 미만(위젯이 값을 보내지 않아 0이면 의심에서 제외) 중 하나라도 해당하면 `true`. `suspect_reasons`에 `'urls'`/`'fast'` 텍스트로 기록.

### A.6 (A6) 토큰과 운영자 판정

`0008_feedback.sql`의 주석("SPEC_FEEDBACK_ADDENDUM.md §A6: 토큰은 rfp_tokens.token / invitations.token 에 평문 저장되어 있다")이 그대로 인용문.

- `rfp_tokens.token`, `invitations.token` 두 테이블 모두 토큰을 평문으로 저장한다(암호화·해시 저장이 아님 — 두 테이블은 0002 마이그레이션 소유, 이번 조사에서 그 테이블 정의 자체는 다시 열어보지 않았다. 소스 미확인: 정확한 컬럼 제약).
- 피드백 쪽은 클라이언트가 평문 토큰을 보내지 않고 `sha256(token)`의 앞 8자(`token_hash8`, 16진수 8자)만 보낸다(위젯 `sha256hex8()`, 서버는 재계산하지 않고 클라이언트가 보낸 값을 그대로 저장 — 서버측 `feedback_resolve_rfp` 조회 시점에만 원본 테이블 쪽 토큰을 `digest(token,'sha256')`로 해시해 비교).
- 그래서 `token_hash8`로 원본 토큰을 역으로 찾는 조회(운영 콘솔의 "RFP 연결"용)를 빠르게 하려고, `rfp_tokens`/`invitations` 테이블 자체에는 손대지 않고(그 테이블 소유는 0002) `0008_feedback.sql`이 표현식 인덱스만 추가한다: `rfp_tokens_hash8_idx on rfp_tokens (left(encode(digest(token,'sha256'),'hex'), 8))`, `invitations_hash8_idx on invitations (...)` — 두 인덱스 모두 8자 접두어만 색인하므로 다건 충돌(같은 접두어를 가진 서로 다른 토큰) 가능성이 있고, 실제 매칭은 `private.feedback_token_candidates()`가 후보를 전부 반환하는 방식으로 처리한다(`feedback_resolve_rfp`가 `rfp_ref`와 교차 검증해 `verified`/`mismatch`/`token_only`/`ref_only` 4종 매치를 구분).
- `private.is_operator()`(정의는 `0003_private_fns.sql`, 0008에서 새로 만들지 않고 그대로 재사용)를 `feedback_set_status()`, `feedback_resolve_rfp()`의 권한 검사에 그대로 쓴다 — 피드백 전용 운영자 판정 함수를 새로 만들지 않았다는 것이 A6의 요지다. 위젯/함수 레벨의 운영자 판정(`resolveSession`/`deriveUserType`, `_shared/feedback_auth.ts`)은 `auth.users.app_metadata.role === 'operator'`를 직접 보는 별개 경로이며, `private.is_operator()`(DB RLS용)와 판정 소스는 다르지만 "operator" 롤 체계 자체는 공유한다.

A.2~A.5는 코드 주석에서 "구현에서 역추출"이라고 명시된 항목이다. A.1과 A.6은 원본 부록 문구가 직접 인용된 형태로 남아 있다.

### A.7 ~ A.11 (원본에만 있던 절 — 코드 인용 없음)
원본 부록에는 A.7~A.11이 있었던 것으로 보이나(A.12·A.13이 인용되므로) 코드가 인용하지 않아 내용을 복원하지 않았다. 번호는 A.12·A.13과의 정합을 위해 비워 둔다.

### A.12 개인정보처리방침 "의견 접수" 항목 (구현에서 역추출)
`build2.py`의 `FEEDBACK_PRIVACY_KO` / `FEEDBACK_PRIVACY_EN`이 `ko/privacy.html`·`en/privacy.html`에 "9. 의견 접수" / "Feedback" 절을 삽입한다(SPEC_FEEDBACK.md §6 S12 대응). 내용: 필수=의견 내용 / 선택=회신 이메일·이름(이메일은 별도 수집·이용 동의) / 자동 수집=화면 주소·상태·연결 요청번호·브라우저·화면 크기·최근 오류 기록(IP 미저장 명시) / 목적=회신·오류 개선 / 보유=접수 후 12개월 뒤 익명화. 문구는 `TODO(legal)`로 표시되어 법무 확인 대상이다(배포 런북 Step 12).

### A.13 contact.html 통합 방식 (구현에서 역추출)
`ko/contact.html`·`en/contact.html`의 실제 백엔드는 피드백 시스템이다(SPEC_FEEDBACK.md §4.12). 구현 확정: (1) 허니팟 필드는 서버 렌더가 아니라 **런타임 JS로 추가**해 정적 마크업(그리고 `verify_launch.py`의 바이트 동일성 기준선)을 건드리지 않는다. (2) 기존 `MG.api.contact()` 호출은 best-effort·fire-and-forget 부수 호출로 유지해 `verify_api.py`의 기존 단정을 깨지 않는다. (3) 사용자에게 보이는 성공/오류 UI는 `MICEGO_FB.submit()`이 담당하며, 이 경로만 REF 번호를 돌려준다. (4) `csid`·체류시간(`dwellStart`)은 위젯과 동일한 규칙으로 계산한다.

## §B. 작업 패키지

세 워크패키지는 각자 소유 파일이 분리되어 있고, 서로의 파일을 건드리지 않는 것이 원칙이었다 — 특히 `verify_feedback.py` (admin 불변 검사) 부근 주석이 이를 명시: `"admin/dashboard.html`이 아직 `assets/feedback.js`를 로드하지 않아도 실패 처리하지 않고 NOTE만 남긴다 — 그 배선은 admin 콘솔 워크패키지(WP-F3) 소유이고, `admin/**`는 이번 워크패키지(WP-F2)의 소유 파일 범위 밖이다(원문: "Do NOT touch admin/**")."`

### WP-F1 — 백엔드

- `supabase/migrations/0008_feedback.sql` — enum 6종, `feedback`/`feedback_note`/`feedback_event`/`private.feedback_rate_event` 테이블, REF 생성 트리거, 전이 가드, 감사 트리거, RPC 7종(`feedback_set_status`, `feedback_rate_hit`, `feedback_claim_mail`, `feedback_resolve_rfp`, `feedback_anonymize`, `feedback_purge_demo`, `feedback_rate_purge`) + `private.feedback_token_candidates`/`private.feedback_mask_pii`, RLS.
- `supabase/migrations/0009_feedback_cron.sql` — pg_cron 스케줄 4건(메일 재시도 10분마다, 레이트리밋 정리 매시 7분, DEMO 삭제 매일 18:20 UTC, 익명화 매월 1일 18:10 UTC). `pg_cron`/`pg_net` 미설치 로컬 환경은 건너뜀.
- `supabase/functions/feedback-submit/`(`index.ts`, `handle.ts`, `errors.ts`) — 유일한 쓰기 진입점.
- `supabase/functions/feedback-mail-retry/`(`index.ts`, `handle.ts`) — cron 배치(20건, x-internal-secret) + 콘솔 단건 재발송(Bearer 운영자 JWT).
- `supabase/functions/_shared/feedback_auth.ts`, `feedback_cors.ts`, `feedback_ip.ts`, `feedback_sanitize.ts`, `feedback_mail.ts`, `feedback_templates.ts` — 세션 판정, CORS, IP 해시, 검증/새니타이즈, 메일 발송·상태 기록, 메일 템플릿 2종.
- `supabase/tests/sql/05_feedback.sql` — WP-F1 전용 SQL 테스트(아래 §C).

### WP-F2 — 위젯

- `assets/feedback.js` — Shadow DOM 위젯 본체(ES5 IIFE, 화살표 함수·`let`/`const`·템플릿 리터럴 금지 — 구형 인앱 WebView 대응). `window.MICEGO_FEEDBACK`과 (선택) `window.MICEGO_PAGE_STATE`에만 의존, `assets/mg.js`에는 의존하지 않음. 실제로 제출하기 전까지 네트워크 요청 0건.
- `build_launch.py` §1(설정 주입, A.1)·§5b(모든 생성 페이지에 위젯 배선: 조기 오류 캡처 스니펫을 `<head>`의 첫 `<script>`로 삽입, `<meta name="micego-build">`, `assets/feedback.js`를 `assets/mg.js` 뒤에 defer 로드, 푸터 "의견 보내기 / Feedback" 링크 + `<noscript>` 폴백, `ko/en/contact.html`에 `data-mgfb-launcher="off"`, `.mobile-cta`에 `data-mg-fixed-bottom`) — `admin/*.html`도 이 스크립트가 같은 방식으로(멱등 가드로) 배선하지만, 그 대상은 "운영자용 위젯"이며 `feedback*.html`에는 런처를 끈다(§B WP-F3 참고, 콘솔 자체 화면에서 피드백 버튼이 중복되지 않도록).
- `ko/contact.html`, `en/contact.html` — `contact.html`의 실제 백엔드는 피드백 시스템이다(addendum §A.13, B). 정적 마크업(및 `verify_launch.py`의 바이트 단위 베이스라인 비교)을 건드리지 않기 위해 허니팟 입력을 런타임에 DOM으로 추가하고, 성공/오류 UI는 `MICEGO_FB.submit()` 경로가 담당한다(REF 번호가 나오는 쪽이 이 경로). 기존 `MG.api.contact()` 호출은 "best-effort, fire-and-forget" 부가 호출로 남겨 `verify_api.py`의 기존 단언(제출 시 `contact()` 호출)을 유지한다.
- `build2.py` §S12(addendum §A.12) — `ko/en privacy.html`에 "의견 접수 / Feedback" 섹션 추가.
- `build2.py`의 `en/bid.html`·`ko/track.html` 등 상태 페이지 JS — `window.MICEGO_PAGE_STATE`(`rfpRef`/`tokenKind`/`prefillEmail` 등) 주입(addendum §A.1, 위 참고).

### WP-F3 — 콘솔

- `admin/feedback.html`, `admin/feedback-detail.html` — 목록/상세 화면(마크업).
- `admin/feedback-console.js` — 공용 로직(상수·라벨, mock/`api` 두 모드 데이터 접근, 전이 가드 오류 메시지 매핑 등). `admin.js` 다음, 각 페이지 자체 스크립트보다 먼저 로드.
- `admin/admin.js` (피드백 배지 계산) 부근 — 피드백 배지 규칙: **상태가 `new`이고 `is_demo`가 아닌 건수**(`A.feedbackNewCount = function () { return (S.feedback || []).filter(function (f) { return f.status === 'new' && !f.is_demo; }).length; };`). 좌측 내비게이션의 "피드백" 항목에 이 수가 배지로 표시된다.
- `supabase/seed_demo.sql` — 데모 피드백 13건(§C 데모 데이터, 아래 참고).

## §C. 검증

`verify_feedback.py`가 빌드 설정 3종(코드 내 표기: (a)/(b)/(c))을 각각 별도 빌드해 Playwright로 구동한다:

- **(a) 기본값** — Supabase 미설정(`supabase.url`이 빈 문자열). 기대: 위젯이 완전히 비활성 — `window.MICEGO_FB`가 아예 없고, 푸터 "의견 보내기" 링크는 평범한 `contact.html` 링크로 남는다. `contact.html`도 API 미설정이면 mailto 발송 패널로 폴백한다.
- **(b) 스테이징** — `demo:true` + 더미 Supabase URL(`https://stub.mg.test`). 대부분의 테스트가 이 설정으로 돈다. Playwright의 `page.route()`로 `/functions/v1/feedback-submit`을 가로채 컨트롤 가능한 픽스처 응답을 내려준다.
- **(c) 운영(prod)** — `domain`·`operator` 등 실값 채운 `demo:false` 빌드. 센티널(더미 값) 스트립 여부와, 그 빌드에서도 위젯 런처가 여전히 뜨는지를 확인.

응답 코드별 시나리오(픽스처 → 위젯 동작):

| 서버 응답 | 위젯 동작 |
|---|---|
| `RATE_LIMITED`(429) | 오류 메시지에 분 단위 재시도 안내(`retry_after_sec`) |
| `DUPLICATE_CONTENT`(409) | "이미 접수됨" 안내, 재시도 불필요 처리(pending 비움) |
| `BUSY`(503) | "지금은 몰려서…" 안내, pending 유지(나중에 재시도 가능) |
| 네트워크 중단(`abort`) / 타임아웃 | `errNetwork`/`errTimeout`, pending 유지, 재시도 시 같은 `client_submission_id` 재사용 |
| 2회 연속 실패 | 대체 수단 패널(`mgfbFallback`) 노출 — 내용 복사 / 메일로 보내기 / 문의 페이지 이동 |

그 외 검증 항목: 모든 진입 페이지(`ko/en/index.html`, `track.html`, `bid.html`, `my.html`)에서 런처 노출 여부, `contact.html`은 런처 꺼짐이지만 `MICEGO_FB.submit`은 살아있음, 360px에서 `.mobile-cta`와 런처 겹침 없음, 포커스 트랩(Tab/Shift+Tab 순환) + ESC로 닫힘 + 포커스 원위치 복귀, 빈 값/20자 미만/2000자 초과/이메일 형식 오류/이메일은 있는데 동의 체크 없음 등 5종 유효성 오류, 열람 후 3초간 제출 버튼 `aria-disabled`, 성공 시 REF 표시 및 복사 버튼 라벨 전환, 더블클릭이 요청 1건으로만 처리, payload의 `ctx` 키 완전성과 `token_hash8 === sha256(원본 토큰)[:8]`(원본 토큰이 payload 어디에도 노출되지 않음), pending 재전송이 같은 `client_submission_id` 유지, 360/768/1280 리사이즈 시 콘솔 오류 없음, ko/en `privacy.html`에 "의견 접수"/"Feedback" 섹션 존재.

`tests/sql/05_feedback.sql`(WP-F1) 커버리지:

- REF 생성(트리거가 BEFORE INSERT에서 강제로 `status='new'`로 세팅).
- `feedback_set_status()` 전이 가드 6종 전부: `GUARD_TRIAGE_FIELDS`(우선순위/하위분류 없이 triaged 시도, 2가지 하위 케이스), `GUARD_ASSIGNEE`(담당자 없이 in_progress), `GUARD_HOLD_NOTE`(메모 없이 on_hold), `GUARD_RESOLUTION`(결과 없이 done), `GUARD_NEW_TO_DONE`(new에서 곧장 done인데 resolution이 spam/duplicate/no_action이 아님), `GUARD_REOPEN_NOTE`(done에서 재오픈 시 메모 없음).
- RLS: anon은 아무 것도 못 봄, 인증된 비운영자 회원도 아무 것도 못 봄, 운영자는 전체 조회 가능.
- `feedback_rate_hit`의 슬라이딩 윈도 동작.
- `feedback_claim_mail`의 임대(lease) 동작(동시성 skip locked 포함 추정 — 정확한 단언 내용은 파일 라인 268~305 범위, 이번 조사에서 라인 단위까지는 재확인하지 않음. 소스 미확인).
- `feedback_resolve_rfp`의 4가지 매치(`verified`/`ref_only`/`mismatch`/`token_only`).
- `feedback_anonymize`의 마스킹·null 처리.

Deno `_tests`(WP-F1) 3개 파일:

- `feedback_submit_test.ts` — `feedback-submit`의 `handle()` 테스트: Origin/크기/버전/레이트리밋/허니팟/스키마검증/멱등(csid)/24h 본문 중복/유저유형 판정/메일 payload 구성까지 한 파일에서 검증(§3.3, §3.9, §4.5 인용).
- `feedback_sanitize_test.ts` — 필드 검증 매트릭스 전체 + `maskSecrets`(§3.6 인용).
- `feedback_mail_retry_test.ts` — `feedback-mail-retry`의 `handle()`: cron 시크릿 인증 모드와 콘솔 운영자 Bearer 인증 모드, 그리고 404/403 케이스(§3.10 인용).

데모 데이터(`supabase/seed_demo.sql`, §5.3 표를 그대로 반영한다고 주석에 명시): 13건 중 12건은 `is_demo=false`이고, **오직 #12만 `is_demo=true`**(스테이징 미리보기 상태에서 남긴 테스트성 의견 시나리오). 13건은 `new`(#1~#4) → `triaged`(#5) → `in_progress`(#6, #7) → `on_hold`(#8) → `done`(#9, #10) → `new`+`source=contact`(#11) → `new`+DEMO(#12) → `done`+익명화 대상(#13, 실제로 `feedback_anonymize(now() - interval '12 months')` 호출로 익명화됨) 순으로 상태·카테고리·소스·의심 플래그·메일 상태 조합을 골고루 커버한다.

## 부록. 인용 지점 색인

| 파일(위치) | 인용 문구 | 매핑 |
|---|---|---|
| `admin/admin.js` (피드백 배지 계산) | `SPEC_FEEDBACK_ADDENDUM.md §B` | §B (피드백 배지 규칙) |
| `admin/feedback-console.js` 첫 줄 | `SPEC_FEEDBACK_ADDENDUM.md §B WP-F3` | §B WP-F3 |
| `verify_launch.py` (WP-F2 위젯 배선 검사) | `SPEC_FEEDBACK.md / SPEC_FEEDBACK_ADDENDUM.md`(WP-F2 위젯 배선) | §A.1, §B WP-F2 |
| `build_launch.py` (5b 피드백 설정 주입) | `SPEC_FEEDBACK.md / SPEC_FEEDBACK_ADDENDUM.md §A.1 -- WP-F2` | §A.1 |
| `build_launch.py` (config.js 생성부) | `SPEC_FEEDBACK_ADDENDUM.md -- WP-F2` | §B WP-F2 |
| `build_launch.py` (out of scope 주석) | `SPEC_FEEDBACK_ADDENDUM.md §B`("Do NOT touch admin/**"의 근거 문구가 실제로는 `verify_feedback.py` (admin 불변 검사)에 있음 — 이 줄 자체는 "out of scope" 설명) | §B |
| `supabase/seed_demo.sql` (피드백 데모 블록) | `SPEC_FEEDBACK_ADDENDUM.md §B` | §B (데모 데이터 is_demo 규칙) |
| `supabase/migrations/0008_feedback.sql` 머리 주석 | `SPEC_FEEDBACK_ADDENDUM.md §A 가 우선한다(특히 A6)` | §A, §A.6 |
| `supabase/migrations/0008_feedback.sql` (`feedback.token_hash8` 컬럼 주석) | `SPEC_FEEDBACK_ADDENDUM.md §A6: 토큰은 rfp_tokens.token / invitations.token 에 평문 저장되어 있다` | §A.6 |
| `assets/feedback.js` 머리 주석 | `SPEC_FEEDBACK_ADDENDUM.md §A says so` | §A |
| `verify_feedback.py` 머리 주석 | `SPEC_FEEDBACK.md §8 / SPEC_FEEDBACK_ADDENDUM.md §B,C` | §B, §C |
| `verify_feedback.py` (admin 불변 검사) | `SPEC_FEEDBACK_ADDENDUM.md §B "Do NOT touch admin/**"` | §B |
| `build2.py` (`FEEDBACK_PRIVACY_KO` 정의 위 주석) | `addendum §A.12` | §A.12 |
| `build2.py` (`mgLoadBid`·`mgLoadTrack` 안) | `addendum §A.1` | §A.1 — `MICEGO_PAGE_STATE.rfpRef` null 기본값 |
| `en/bid.html` | `addendum §A.1` | §A.1(연장) |
| `ko/track.html` | `addendum §A.1` | §A.1(연장) |
| `build2.py` (contact 폼 JS), `ko/contact.html`, `en/contact.html` | `addendum §A.13,B` | §A.13, §B |

`grep -rn "ADDENDUM"`(대문자 표기, 코드 내 `SPEC_FEEDBACK_ADDENDUM.md §…` 형태)로 12곳, `addendum §…`(소문자, `SPEC_FEEDBACK_ADDENDUM.md` 전체 경로 없이 절만 인용하는 형태)로 8곳 — 합계 **인용 지점 총 20곳**(위 표는 같은 문구가 파생 파일에 복제된 경우 한 행에 묶어 17행으로 정리). `§A.13`은 원본 스캔 대상 목록(§A6까지)에는 없었으나 `build2.py`/`contact.html` 조사 중 추가로 발견되어 이 색인에 포함했다.
