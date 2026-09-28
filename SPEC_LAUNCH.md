# SPEC_LAUNCH.md — MICEGO 오픈(런치) 기술 스펙

> **구현 기준 역추출본 v1.0 (2026-09-27)** — 원본 스펙 문서가 유실되어 현재 코드(`micego-site/`, 2026-09-27 스냅샷)에서 재구성했다. 코드 주석·README가 인용하는 `SPEC_LAUNCH.md §N` / `SS5` / `WP1·WP2·WP3`는 모두 이 문서의 해당 § 를 가리킨다. "(비인용)" 표시 섹션은 코드가 직접 인용하지 않으나 구조상 채운 것이다. 스펙과 구현이 다를 때는 **구현이 기준**이며 이 문서가 구현을 따라간다. 본문의 `파일:행` 표기는 2026-09-27 스냅샷 기준의 근사값이며(경로 수정으로 ±5행 이동 가능) 식별자·주석 문구로 찾는 것을 권한다. 자매 문서: `SPEC_ACCOUNTS.md`(회원제), `SPEC_FEEDBACK.md`(피드백 시스템), `SPEC_FEEDBACK_ADDENDUM.md`(피드백 구현 부록).

## 목차
§0 설계 원칙 · §1 호출 경로 · §2 DB 스키마 · §3 Edge Function API · §4 알림·OTP·인증 설정 · §5 프론트엔드 API 연동(SS5) · §6 운영 콘솔 데이터 어댑터 · §7 오픈 자산 빌드 · §8 검증 계획 · §9 파일 소유권과 훅 포인트 · §10 배포·시크릿 · 부록 A `private.due()` 예시

---

---

## §0. 설계 원칙

- **(a) Auth admin API 는 security-definer SQL RPC로 쓸 수 없다.** `admin/data-adapter.js`(EDGE_OPS 정의부, 약 83행)의 주석이 근거다: "op names that go names that go through the admin_member_action Edge Function instead of a plain RPC (SPEC_LAUNCH §0/§6: it needs the Auth admin API, so it can't be a security-definer SQL RPC)." — GoTrue의 사용자 생성/삭제/복구링크 발급 같은 Auth admin API 호출은 Postgres SQL 함수(SECURITY DEFINER RPC) 안에서 직접 부를 수 없으므로, `admin_member_action` 처럼 Auth admin API가 필요한 오퍼레이션은 Edge Function을 거친다. 실제로 `supabase/functions/_shared/deps.ts`의 `AuthAdminClient`(`createUser`/`updateUserById`/`deleteUser`/`generateRecoveryLink`/`signOutAll`/`getUser`)가 이 경로를 구현하며, `GoTrue Admin REST`(`/auth/v1/admin/...`)를 `SUPABASE_SERVICE_ROLE_KEY`로 직접 호출한다.

- **(b) 프론트는 Plain ES5 IIFE, supabase-js 지연 로딩, config 없으면 mailto/mock 폴백.** `assets/mg.js` 상단 주석: "Plain ES5 IIFE: no arrow functions, no const/let, no async. Loads supabase-js from a CDN lazily (only when config.supabase.url is set) and exposes MG.api.*/MG.auth.*. Falls back to MG.mode='mailto' (today's mailto/clipboard flow, untouched) when no supabase config is present." — 코드상 `window.MG = (function () { "use strict"; ... })()` 형태의 IIFE이고, `hasApi = !!(sbCfg.url)`가 false면 `mode = 'mailto'`로 떨어진다. supabase-js는 `ready()`가 처음 호출될 때만 `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js`를 동적 `<script>` 태그로 로드한다(`loadScript`). 관리자 쪽 `admin/data-adapter.js`도 같은 패턴이며, `hasApi`가 false면 mock 모드로 `document.write('<script src="mock-data.js">...')`를 동기 삽입해 `window.MOCK_DATA`를 곧바로 이어지는 `admin.js`가 쓸 수 있게 한다(파일 상단 주석 "Script order in every admin/*.html: ../assets/config.js, ../assets/mg.js, data-adapter.js, admin.js.").

- **(c) 회원 생성은 signup_start Edge Function 경유만.** `supabase/config.toml`의 `[auth]` 블록: `enable_signup = false`이고 그 위 주석 "회원은 signup_start Edge Function 을 통해서만 생성된다 (auth.admin.createUser, email_confirm=false로 시작). 클라이언트의 supabase-js signUp() 직접 호출은 막는다." `[auth.email]`에도 `enable_signup = false`가 별도로 반복된다. 실제 구현은 `supabase/functions/signup_start/handle.ts`가 `authAdmin.createUser({..., email_confirm:false})`를 호출하는 식이다(§4의 `MG_DEMO_OTP` 분기 인용 위치 참고).

- **(d) 비밀 코드(OTP/재설정) 단일채널 인라인 발송.** `supabase/functions/_shared/notify/enqueue_and_dispatch.ts` 상단 주석: "OTP/재설정처럼 비밀 코드를 담은 단일 채널 메시지는 이 경로를 쓰지 않고 deps.send() 로 직접 인라인 발송한다 (SPEC_LAUNCH.md §4)." 즉 `enqueueAndDispatch()`(비동기 큐 + 즉시 1회 시도 + 실패시 cron 재시도)는 일반 알림에 쓰고, OTP·비밀번호 재설정 코드처럼 보안 민감 단일 채널 메시지는 `Deps.send()`(= `deps.ts`의 `defaultSend`, `_shared/notify/router.ts`의 채널별 발송기를 직접 감쌈)로 그 자리에서 바로 보낸다.

### 작업 패키지(WP) 정의

| WP | 범위 | 근거 |
|---|---|---|
| **WP1** | Supabase 백엔드 (`supabase/` 전체: migrations, RLS, private 함수, Edge Functions, 템플릿 파이프라인, 테스트) | `supabase/README.md` "MICEGO 역경매 플랫폼의 Supabase 백엔드(WP1)" |
| **WP2** | 오픈 자산 — `build_launch.py`: 404 페이지, `sitemap.xml`(+`robots.txt`), 아이콘 세트(`build_icons.py` 위임), 보안헤더(`_headers`/`vercel.json`), `assets/config.js` 생성, prod 빌드 후처리 | `build_launch.py` 섹션 주석: "1. assets/config.js + assets/mg.js stub", "2. icons (PIL; build_icons.py runs only if missing)", "6. 404.html", "13. robots.txt / sitemap.xml", "14. security headers: _headers + vercel.json"; `build2.py:1539` "WP2 launch-asset post-pass (site.config.json wiring, icons, 404, sitemap, headers, en/terms, unsubscribe)" |
| **WP3** | 프론트 API 연동 — `assets/mg.js`(공개 사이트 API/Auth 레이어), `admin/data-adapter.js`(어드민 콘솔 레이어), `build2.py`의 훅 포인트 | `admin/data-adapter.js:1` "WP3 (SPEC_LAUNCH.md §6)"; `build2.py:56`,`build2.py:173` "WP3 hook point (SPEC_LAUNCH §9): success-panel container ..., hidden, empty [data-mg]" |

---

## §1. 호출 경로 (비인용)

`supabase/README.md` §1 "아키텍처 한 줄 요약"과 `supabase/functions/_shared/deps.ts`를 근거로 두 개의 완전히 분리된 호출 경로가 있다.

1. **Edge Function → `SUPABASE_DB_URL` 직접 접속 → `private.*` 함수.** Edge Function은 PostgREST를 거치지 않고 `deps.ts`의 `makeDb()`(내부적으로 `postgres` npm 패키지, `postgres(url, {max:5})`)로 Postgres에 직접 커넥션을 맺는다. 이 경로로 부르는 함수는 상태 머신(`private.rfp_transition`, `private.finalize_won`, `private.pick_and_win`), `private.enqueue`, `private.system_tick`, OTP 관련(`private.*` 없이 `otp.ts`의 `createOtp`/`verifyOtp`가 테이블에 직접 SQL) 등 `private` 스키마 함수들이다. 이 경로에는 사용자 JWT가 없으므로 `auth.uid()`/`auth.jwt()`가 동작하지 않는다.

2. **프론트(`mg.js`) → PostgREST `rpc/...` → `public` 함수 (`auth.uid()` 동작).** `assets/mg.js`의 `callRpc()`가 `REST_URL + '/rpc/' + name`(즉 PostgREST의 `/rest/v1/rpc/<name>`)으로 직접 호출하며, 회원 세션의 `Authorization: Bearer <access_token>` 헤더를 그대로 실어 보낸다. PostgREST가 이 JWT를 검증해 `request.jwt.claims` GUC로 자동 설정해 주므로, 이 경로로 불리는 `public` 스키마의 SECURITY DEFINER RPC(`my_profile`, `my_rfps`, `my_sessions`, `link_request`, 어드민 쪽 `admin_snapshot` 등)에서는 `auth.uid()`/`auth.jwt()`가 정상 동작한다. `admin/data-adapter.js`의 `rpc()`도 동일한 PostgREST `rpc/` 경로를 쓴다(`REST_URL + '/rpc/' + name`).

**`DbClient.withClaims` 예외:** `create_share_link`/`revoke_share_link`는 `public` 스키마의 RPC(경로 2 대상)이지만, 특정 흐름에서 Edge Function이 경로 1(직접 접속)을 통해 같은 RPC를 호출해야 하는 경우가 있다. 이때는 PostgREST가 자동으로 채워주는 `request.jwt.claims` GUC가 없으므로, `deps.ts`의 `DbClient.withClaims(claims, fn)`이 `set_config('request.jwt.claims', ..., true)`로 이 GUC를 트랜잭션-로컬로 흉내 낸다(`select set_config(...)`를 같은 트랜잭션 안에서 실행 후 `fn`을 호출; `s.begin(async (tx) => {...})`로 커넥션-트랜잭션 일치를 보장). 이렇게 하면 그 함수 안에서만 `auth.uid()`가 마치 PostgREST를 거친 것처럼 동작한다.

---

## §2. DB 스키마

### 0001_ext_enums.sql — 확장 및 enum

**확장:** `pgcrypto`, `citext` (무조건 생성). `pg_cron`, `pg_net`은 `pg_available_extensions`에 존재할 때만 조건부 생성(로컬 테스트 환경 대응 가드). `private` 스키마도 여기서 생성되고 `anon`/`authenticated`/`public`으로부터 권한을 회수한다.

**enum 전체 (12개):**

| enum | 값 |
|---|---|
| `rfp_state` | received, verifying, rejected, open, bidding, collecting, delivered, won, lost, cancelled |
| `invitation_status` | invited, viewed, submitted, declined, expired, reinvited |
| `invitation_result` | selected, not_selected |
| `partner_state` | pending, reviewing, approved, rejected, suspended |
| `member_state` | pending_email, pending_phone, active, locked, suspended, withdrawn, purged |
| `share_state` | active, revoked, expired, disabled |
| `token_kind` | track, share |
| `otp_purpose` | signup_email, signup_phone, pick, email_change, phone_change |
| `link_status` | pending, approved, rejected |
| `notif_channel` | email, alimtalk, lms, sms |
| `notif_status` | pending, processing, done, partial, failed, cancelled |
| `delivery_status` | queued, sent, delivered, failed, skipped |
| `actor_kind` | system, operator, organizer, hotel, member |

(표에는 13행이 있지만 `actor_kind`까지 포함해 실제로는 13개 enum 타입이 정의된다.)

### 0002_tables.sql — 테이블 (24개)

| 테이블명 | 스키마 | 핵심 컬럼(타입) | 용도 |
|---|---|---|---|
| `members` | public | id(uuid pk), state(member_state), name/company/org_type/email(citext)/phone, consents(jsonb), mkt_email/mkt_sms(bool) | 회원(오거나이저) 계정. `members_email_uk`(withdrawn 제외 lower(email) 유니크), `members_phone_uk`(active 상태만 유니크) |
| `member_access_log` | public | member_id, at, ip(inet), ua, ok(bool) | 회원 접근(로그인 등) 로그 |
| `login_attempts` | public | email_norm(citext), at, ip, ok | 로그인 시도 기록(잠금 판정용) |
| `signup_tickets` | public | ticket(pk), member_id, email, expires_at | 가입 진행 중 임시 티켓 |
| `rfps` | public | id(uuid pk), ref(unique text), state(rfp_state), round(int), owner_id→members, 폼 스냅샷(org_type/company/contact_*/event_type/start_date/end_date/headcount_band/region/twin_rooms/king_rooms/ballroom_*), 운영자 필드(destination/headcount/deadline/anon_reviewed 등), pick_otp(jsonb) | RFP(제안요청) 본체 — 상태머신의 중심 |
| `rfp_history` | public | rfp_id→rfps, at, actor(actor_kind), from_state/to_state, memo | RFP 상태 전이 이력 |
| `rfp_tokens` | public | id(uuid pk), rfp_id→rfps, kind(token_kind), token(unique), state(share_state), expires_at, views | 트랙/공유 링크 토큰. `rfp_tokens_active_uk`(rfp_id+kind, state='active' 유니크) |
| `rfp_messages` | public | rfp_id→rfps, kind('change'│'question'), body(≤2000자), proposal_labels(text[]) | 변경요청/질문 메시지 |
| `partners` | public | id(uuid pk), code(unique), state(partner_state), name/location/dest/cap_band/cap, banquet(bool), contact_*, unsubscribe_token | 호텔/파트너 |
| `partner_history` | public | partner_id→partners, at, actor, from_state/to_state, memo | 파트너 상태 전이 이력 |
| `invitations` | public | id(uuid pk), rfp_id→rfps, partner_id→partners, round, status(invitation_status), result(invitation_result), token(unique), deadline | RFP 라운드별 호텔 초대. `invitations_active_uk`(rfp+partner+round, status≠'reinvited') |
| `quotes` | public | id(uuid pk), invitation_id(unique)→invitations, rfp_id→rfps, round, label, currency(char3), twin_rate/king_rate(numeric), ballroom_*, usd_ref/usd_date, revision(int) | 호텔 제안(견적) |
| `quote_revisions` | public | quote_id→quotes, revision(int), payload(jsonb), ip_hash | 제안 수정 이력 스냅샷 |
| `selections` | public | id(uuid pk), rfp_id(unique)→rfps, quote_id→quotes, invitation_id→invitations, otp_id, operator_override(bool), org_snapshot(jsonb), retain_until(date) | 성사(선정) 기록 — 개인정보 보관기한 관리 |
| `otp_codes` | public | id(uuid pk), purpose(otp_purpose), member_id/rfp_id/ticket, target/target_hash, code_hash, attempts/max_attempts, expires_at, resend_after, voided_at/locked_until | OTP 코드 저장소 |
| `link_requests` | public | id(uuid pk), member_id→members, rfp_id→rfps, match_type, status(link_status), decided_by | 회원-RFP 연결(매칭) 요청 |
| `audit_log` | public | at, actor(actor_kind), operator_id/member_id/rfp_id/partner_id, action, label, reason, notif, meta(jsonb) | 전역 감사 로그 |
| `notification_log` | public | id(bigserial pk), template_id, recipient_kind, rfp_id/partner_id/member_id/invitation_id, to_email/cc_email/to_phone, vars(jsonb), idempotency_key(unique), status(notif_status), attempts, next_attempt_at | 알림 발송 요청(배치) 큐 |
| `notification_deliveries` | public | log_id→notification_log, channel(notif_channel), provider, to_addr, status(delivery_status), provider_msg_id, attempts, preview | 알림 채널별 개별 시도/결과 기록 |
| `contact_messages` | public | lang, topic, name, email(citext), org, ref, message, ip_hash, handled_at | `contact.html` 문의 폼 제출 |
| `kr_holidays` | public | day(date pk), name | 한국 공휴일 테이블 (`private.is_biz`/`private.due` 영업일 계산용) |
| `settings` | public | key(pk), value(jsonb), updated_by | 운영 설정값 키-밸류 저장소 |
| `rate_limits` | public | bucket, key, window_start(timestamptz), count | 레이트리밋 카운터 (`private.rl_hit`) |
| `ref_counters` | public | prefix, yymm, n | RFP/파트너 등 참조번호(REF) 채번 카운터 (`private.next_ref`) |

### 0005_rpc_admin.sql 에서 추가되는 테이블

| 테이블명 | 스키마 | 핵심 컬럼 | 용도 |
|---|---|---|---|
| `notif_template_meta` | public | id(text pk), name(text) | 알림 템플릿 id→표시명 매핑 메타(운영 콘솔 표시용). `create table if not exists`. |

(0008/0009은 별도의 피드백(VOC) 서브시스템 스키마로, 본 §2 인용 대상(0002/0005)에는 포함되지 않지만 참고로 `feedback`, `feedback_note`, `feedback_event`, `private.feedback_rate_event` 4개 테이블이 추가된다.)

### 0003_private_fns.sql — private 함수 목록

| 함수 | 역할 |
|---|---|
| `private.is_operator()` | JWT `app_metadata.role='operator'` 여부 |
| `private.kst_date(ts)` | timestamptz → KST 기준 date |
| `private.is_biz(ts)` | 해당 시각이 KST 영업일(평일+비공휴일)인지 |
| `private.at18(ts)` | 해당 KST 날짜의 18:00 timestamptz |
| `private.add_business_days(from_ts, n)` | from_ts 다음날부터 n번째 영업일 18:00 |
| `private.due(start_ts, n)` | SLA 마감 계산 — 기산점이 영업일 18시 이전이면 그날을 1일째로 침 |
| `private.next_ref(prefix)` | REF 번호 채번(prefix-yymm-nnn) |
| `private.track_slug(state, round)` | 오거나이저 노출용 상태 라벨 (open→verifying, bidding 2라운드+→rebid) |
| `private.rl_hit(bucket, key, limit, window_s)` | 레이트리밋 히트 카운트 + 한도 체크 |
| `private.enqueue(template_id, idem_key, target, vars, scheduled_at)` | `notification_log`에 알림 적재(idempotent) |
| `private.allowed_actions(state)` | RFP 상태별 허용 액션 목록 |
| `private.current_invitations(rfp_id, round)` | 해당 라운드의 현재(재초대 제외) 초대 목록 |
| `private.rfp_vars_common(r)` | RFP 공통 알림 변수(jsonb) 조립 |
| `private.finalize_won(...)` | 성사 처리 공통 로직 — selections insert, 낙점/미선정 초대 갱신, HTL_SELECTED_CONNECT/HTL_NOT_SELECTED/ORG_WON enqueue |
| `private.pick_and_win(rfp_id, label, otp_id, phone_masked)` | 오거나이저 OTP 선택 확정 → `finalize_won` 위임 |
| `private.rfp_transition(rfp_id, action, actor, operator_id, reason, note, memo)` | RFP 상태머신 본체 — 가드 체크 + 상태 갱신 + 이력 + 알림 enqueue |
| `private.system_tick()` | 주기 배치: bidding→collecting 자동전이, 마감24h전 리마인더, 공유링크30일만료, 가입미완료72h파기, 로그정리, 보관기한 경과 org_snapshot null화 |

`private.require_operator()`(0005)도 `private.is_operator()`를 감싸 `MG:FORBIDDEN`을 던지는 보조 함수로 존재한다.

### 0006_rls.sql — RLS 정책 요약

전제: `anon`/`authenticated`/`public`은 스키마 `public`의 모든 테이블/시퀀스에 대해 권한이 전량 회수된 상태에서 시작하고, 쓰기는 전부 SECURITY DEFINER RPC 또는 service_role(Edge Function) 경유만 허용된다(직접 INSERT/UPDATE/DELETE 정책 없음).

| 테이블 | 역할 | 허용 |
|---|---|---|
| `members` | authenticated(본인) | `id = auth.uid()`인 본인 행만 SELECT |
| `members` | operator | 전체 SELECT |
| `rfps` | authenticated(본인) | `owner_id = auth.uid()`인 본인 소유 RFP만 SELECT |
| `rfps` | operator | 전체 SELECT |
| `rfp_tokens` | authenticated(본인) | `state='active'`이고 연결된 rfp의 owner가 본인인 토큰만 SELECT |
| `rfp_tokens` | operator | 전체 SELECT |
| `rfp_history`, `rfp_messages`, `partners`, `partner_history`, `invitations`, `quotes`, `quote_revisions`, `selections`, `otp_codes`, `link_requests`, `audit_log`, `notification_log`, `notification_deliveries`, `contact_messages`, `kr_holidays`, `settings`, `member_access_log`, `login_attempts` | operator 전용 | `private.is_operator()`가 true인 경우만 SELECT — 회원에게는 정책이 없어 0건(암묵적 거부) |
| 그 외 (`rate_limits`,`ref_counters`,`signup_tickets`,`notif_template_meta`) | — | RLS는 켜져 있으나 별도 SELECT 정책 없음(모두 거부); `service_role`은 RLS 우회 |

**GRANT:** `authenticated`에는 위 모든 테이블 SELECT가 부여되고 실제 행 제한은 정책이 담당한다. RPC 실행권한은 `authenticated`에 `my_profile/my_sessions/my_rfps/create_share_link/revoke_share_link/link_request`(회원용, 0004)와 `admin_snapshot/admin_rfp/admin_transition/admin_rfp_update/admin_invite/admin_reinvite/admin_mark_selection/admin_quote_update/admin_invitation_flag/admin_add_note/admin_partner_transition/admin_partner_update/admin_link_decide/admin_holiday_add/admin_holiday_delete/admin_delivery_resolve/admin_resend`(운영자용, 0005)가 부여된다. `service_role`은 `private` 스키마 USAGE/EXECUTE 전체와 `public` 전 테이블/시퀀스에 대한 ALL 권한을 받는다(bypassrls이므로 Edge Function의 직접 접속 경로가 이를 통해 동작).

### 0007_cron.sql — 크론

| 작업명 | 주기 | 호출 대상 |
|---|---|---|
| `mg-dispatch-notifications` | `* * * * *`(매분) | `pg_net.http_post`로 `<functions_url>/dispatch_notifications`를 `x-cron-secret` 헤더와 함께 호출(`pg_net` 확장이 있을 때만 등록) |
| `mg-system-tick` | `*/10 * * * *`(10분마다) | `select private.system_tick();`를 DB 안에서 직접 호출(HTTP 아님) |

둘 다 `pg_cron` 확장이 존재할 때만 `do $$ ... $$` 블록으로 조건부 등록되며, 로컬 테스트 환경처럼 확장이 없으면 조용히 스킵된다.

**테이블 수: 총 25개** (0002의 24개 + 0005에서 추가되는 `notif_template_meta` 1개. 피드백 서브시스템의 `feedback`/`feedback_note`/`feedback_event`/`private.feedback_rate_event` 4개는 0008/0009 소관으로 이 집계에서 별도.)

---

## §3. Edge Function API 명세

### API 표

`supabase/functions/` 아래 26개 엔드포인트(공용 모듈 `_shared`·테스트 `_tests`·피드백 시스템 전용 `feedback-submit`/`feedback-mail-retry`는 `SPEC_FEEDBACK.md §3`에서 다루므로 제외)를 각 `handle.ts` 첫 줄 주석과 본문 기준으로 정리한다. `submit_rfp` 행은 별도 절에서 상세히 다룬다.

| 함수명 | 메서드·인증 | 요청 본문 | 응답 | 발생 오류 코드 | 발송 알림 ID |
|---|---|---|---|---|---|
| `account_update` | POST · member JWT | `{op, ...op별 필드}` (`op`: `profile`/`marketing`/`email_start`/`email_verify`/`password`) | `op`별 상이 — "account_update 행 / reauth" 절 참조 | `BAD_REQUEST`, `VALIDATION`, `AUTH_REQUIRED`, `REAUTH_REQUIRED`, `OTP_WRONG` | `ACC_EMAIL_CODE`(email_start), `ACC_EMAIL_CHANGED`(email_verify), `ACC_PW_CHANGED`(password) |
| `admin_member_action` | POST · operator JWT | `{member_id, action, reason?, note?, rfp_ref?, to_email?, self_request_confirmed?}` (`action`: `unlock`/`suspend`/`unsuspend`/`resend`/`revoke`/`transfer`/`withdraw`) | `{member:{id,state,name,email}}` (SQL `public._admin_member_action` 반환값) | `BAD_REQUEST`, `VALIDATION`, `FORBIDDEN`, `STATE_CONFLICT`, `WITHDRAW_BLOCKED` (SQL 쪽 `MG:*` → `fromSqlError`) | `ACC_EMAIL_CODE`(resend), `ACC_WITHDRAWN`(withdraw), `OPS_RFP_TRANSFER`(transfer) |
| `ask_question` | POST · anon(rfp 토큰, share 불가) | `{token, message, proposals?}` — `_shared/rfp_message.ts` 공용 | `{received:true}` | `BAD_REQUEST`, `FORBIDDEN_SHARE`, `VALIDATION`, `TOKEN_INVALID`, `TOKEN_REVOKED`, `STATE_CONFLICT`, `RATE_LIMITED` | `INTERNAL_INBOUND`(ops) |
| `contact` | POST · anon | `{lang,topic,name,email,org,ref?,message,consent:true}` | `{received:true}` | `BAD_REQUEST`, `VALIDATION`, `RATE_LIMITED` | `INTERNAL_INBOUND`(ops) |
| `create_share_link` | POST · member(owner) JWT | `{ref}` | SQL `create_share_link(ref)` 반환값 `{token,url,created_at}` | `BAD_REQUEST`, `AUTH_REQUIRED`, `FORBIDDEN`, `STATE_CONFLICT`(SQL `MG:*` → `fromSqlError`), `RATE_LIMITED` | 없음 |
| `decline_bid` | POST · anon(bid 토큰) | `{token, reason, note?}` (`reason`: `Dates unavailable`/`Capacity doesn't fit`/`Other`) | `{declined_at}` | `BAD_REQUEST`, `VALIDATION`, `TOKEN_INVALID`, `STATE_CONFLICT`, `DEADLINE_PASSED`, `RATE_LIMITED` | 없음 (코드 미확인 — `rfp_history`만 기록) |
| `dispatch_notifications` | POST · service_role 또는 `x-cron-secret` 헤더 | `{limit?}` | `{processed,sent,failed}` | `FORBIDDEN` | 해당 없음(배치 재시도 디스패처 자체) |
| `get_bid` | POST · anon(bid 토큰) | `{token}` | Bid view model — 별도 절 참조 | `BAD_REQUEST`, `TOKEN_INVALID`, `RATE_LIMITED` | 없음 (조회 전용) |
| `get_track` | POST · anon(track 또는 share 토큰) | `{token}` 또는 `{share}` | Track view model — 별도 절 참조 | `BAD_REQUEST`, `TOKEN_INVALID`, `TOKEN_REVOKED`, `RATE_LIMITED` | 없음 (조회 전용, share 조회 시 `views`만 증가) |
| `login` | POST · anon | `{email,password,keep?}` | `{access_token,refresh_token,expires_at,member:{name,company,orgType,state}}` | `BAD_REQUEST`, `ACCOUNT_LOCKED`, `LOGIN_COOLDOWN`, `LOGIN_FAILED`, `ACCOUNT_SUSPENDED`, `RATE_LIMITED` | `ACC_LOCKED`(10회/1h 실패 시 자동 잠금) |
| `password_reset_complete` | POST · recovery-session JWT | `{password}` | `{done:true}` | `BAD_REQUEST`, `VALIDATION`, `AUTH_REQUIRED` | `ACC_PW_CHANGED` |
| `password_reset_request` | POST · anon | `{email}` | `{sent:true}` (항상 동일 응답) | `BAD_REQUEST`, `RATE_LIMITED` | `ACC_PW_RESET` (계정 존재 시에만 내부적으로 발송) |
| `pick_send_otp` | POST · anon(rfp 토큰, share 불가) | `{token, proposal}` | `{otp_id,phone_masked,expires_at,resend_at,sends_left}` | `BAD_REQUEST`, `FORBIDDEN_SHARE`, `TOKEN_INVALID`, `TOKEN_REVOKED`, `STATE_CONFLICT`, `VALIDATION`, `RATE_LIMITED` | `ORG_PICK_OTP`(sms) |
| `pick_verify` | POST · anon(rfp 토큰, share 불가) | `{token,proposal,otp_id,code}` | 자동확정 모드: `{state:'won',selected:{label,hotel_name},connected_at}` / 운영자확인 모드: `{state:'delivered',pending:true}` | `BAD_REQUEST`, `FORBIDDEN_SHARE`, `TOKEN_INVALID`, `TOKEN_REVOKED`, `STATE_CONFLICT`, `OTP_WRONG`(SQL `MG:*` → `fromSqlError`) | 자동확정 시 SQL `private.finalize_won` 내부에서 `HTL_SELECTED_CONNECT`, `HTL_NOT_SELECTED`(제출한 나머지 호텔 각각), `ORG_WON` |
| `register_partner` | POST · anon | `{hotelName,hotelLocation,groupCapacity,banquetSpace,contactName,contactEmail,contactPhone?,consent:true,idem?}` | `{partner_id,review_by}` | `BAD_REQUEST`, `VALIDATION`, `RATE_LIMITED` | `PTN_APPLIED` |
| `request_change` | POST · anon(rfp 토큰, share 불가) | `{token, message, proposals?}` — `_shared/rfp_message.ts` 공용 | `{received:true}` | `BAD_REQUEST`, `FORBIDDEN_SHARE`, `VALIDATION`, `TOKEN_INVALID`, `TOKEN_REVOKED`, `STATE_CONFLICT`, `RATE_LIMITED` | `INTERNAL_INBOUND`(ops) |
| `resend_email_code` | POST · anon(signup ticket) | `{ticket}` | `{resend_at,sends_left}` | `BAD_REQUEST`, `TOKEN_INVALID` | `ACC_EMAIL_CODE`(정상 티켓) 또는 `ACC_EMAIL_EXISTS`(디코이 티켓, 1회/h 제한) |
| `revoke_share_link` | POST · member(owner) JWT | `{ref}` | SQL `revoke_share_link(ref)` 반환값 `{revoked:true}` | `BAD_REQUEST`, `AUTH_REQUIRED`, `FORBIDDEN`(SQL `MG:*` → `fromSqlError`), `RATE_LIMITED` | 없음 |
| `send_phone_otp` | POST · signup ticket(`purpose:'signup_phone'`) 또는 member JWT(`purpose:'phone_change'`) | `{ticket?,phone,purpose,password?}` | `{otp_id,phone_masked,expires_at,resend_at}` | `BAD_REQUEST`, `VALIDATION`, `TOKEN_INVALID`, `NOT_ACTIVE`, `AUTH_REQUIRED`, `REAUTH_REQUIRED`, `RATE_LIMITED` | `ACC_SMS_OTP` |
| `signup_start` | POST · anon | `{email,password,name,orgType,company,consents:{age,terms,privacy,marketing?,channels?}}` | `{ticket,expires_at,resend_at}` | `BAD_REQUEST`, `VALIDATION`, `RATE_LIMITED` | `ACC_EMAIL_CODE`(신규 가입) 또는 `ACC_EMAIL_EXISTS`(이미 가입된 이메일, 디코이 티켓) |
| `submit_quote` | POST · anon(bid 토큰) | 아래 §submit_rfp 행 참조 형식과 유사한 견적 필드 세트(`currency,twinRate,kingRate,breakfast,tax,availability,ballroomFee,ballroomName,validUntil,cancellation,hotelName,contactName,contactEmail,consent` 등) | `{submitted_at,revision}` | `BAD_REQUEST`, `TOKEN_INVALID`, `STATE_CONFLICT`, `DEADLINE_PASSED`, `VALIDATION`, `RATE_LIMITED` | `HTL_QUOTE_RECEIVED` |
| `submit_rfp` | POST · anon(선택적 member JWT) | 아래 상세 참조 | `{ref,track_token,track_url,received_at}` | `BAD_REQUEST`, `VALIDATION`, `RATE_LIMITED` | `ORG_RECEIVED` |
| `unsubscribe` | POST · anon(호텔 파트너 unsubscribe 토큰) | `{token, action:'check'|'confirm'}` | `{state:'already'|'confirm'|'done', property}` | `BAD_REQUEST`, `TOKEN_INVALID`, `RATE_LIMITED` | 없음 |
| `verify_email` | POST · anon(signup ticket) | `{ticket,code}` | `{state:'pending_phone'}` | `BAD_REQUEST`, `OTP_WRONG`, `TOKEN_INVALID`, `OTP_EXPIRED` | 없음 |
| `verify_phone_otp` | POST · anon(otp_id 기반, ticket 불필요) | `{otp_id,code}` | signup: `{state:'active',linked_count}` / phone_change: `{phone_masked}` | `BAD_REQUEST`, `OTP_WRONG`, `OTP_EXPIRED`, `OTP_VOID`, `OTP_LOCKED`, `PHONE_TAKEN` | signup: `ACC_WELCOME` + (연결된 RFP 있을 시)`ACC_LINKED` / phone_change: `ACC_PHONE_CHANGED` |
| `withdraw` | POST · member JWT | `{password,reasons:[],confirm:true}` | `{state:'withdrawn'}` | `VALIDATION`, `LOGIN_FAILED`, `WITHDRAW_BLOCKED` | `ACC_WITHDRAWN` (자동취소된 RFP에 대해서는 `ORG_CANCELLED` 미발송 — 별도 절 참조) |

표의 행 수: 26 (함수 디렉터리 수와 일치, `_shared`/`_tests`/`feedback-mail-retry`/`feedback-submit` 제외 기준).

---

### Tokens

출처: `_shared/tokens.ts`.

- 형식: `^[A-Za-z0-9_-]{4,64}$` (`_shared/validate.ts`의 `RE_TOKEN`과 일치)
- 생성 방식: `randomToken(rand, nbytes=24, prefix="")` — `rand(nbytes)`로 얻은 바이트를 base64 인코딩한 뒤 URL-safe 치환(`+`→`-`, `/`→`_`, 트레일링 `=` 제거)하고 앞에 `prefix`를 붙인다. 기본 24바이트.
- 공유(share) 링크 토큰은 접두어 `s_`로 시작하며, `isShareToken(token)`은 `token.startsWith("s_")`로 판별한다. `ask_question`/`request_change`/`pick_send_otp`/`pick_verify`는 이 판별로 공유 링크 토큰의 접근을 `FORBIDDEN_SHARE`로 차단한다.
- 파트너 수신거부 토큰은 접두어 `u_`(`register_partner`에서 `randomToken(deps.rand, 24, "u_")`).
- SQL 쪽(`create_share_link` RPC)에서 직접 생성하는 공유 토큰도 동일한 `s_` 접두어 + base64 URL-safe 치환 규칙을 따른다(`0004_rpc_member.sql`).

---

### 오류 카탈로그

출처: `_shared/errors.ts`의 `ERRORS` 객체를 그대로 전재한다. (`mg.js`(WP3)가 이 표를 미러링하므로, 코드/문구 변경 시 두 곳을 함께 고쳐야 한다.)

| code | status | ko | en |
|---|---|---|---|
| `BAD_REQUEST` | 400 | 요청 형식이 올바르지 않습니다. 새로고침 후 다시 시도해 주세요. | Invalid request. Please reload and try again. |
| `VALIDATION` | 422 | 입력 내용을 확인해 주세요. | Please check the highlighted fields. |
| `TOKEN_INVALID` | 404 | 링크를 열 수 없습니다. 메일의 링크를 다시 눌러 주세요. | This link is not valid. |
| `TOKEN_REVOKED` | 410 | 더 이상 쓰지 않는 링크입니다. | This link is no longer active. |
| `FORBIDDEN_SHARE` | 403 | 보기 전용 링크에서는 할 수 없습니다. | Not available on a view-only link. |
| `STATE_CONFLICT` | 409 | 요청 상태가 바뀌어 처리하지 못했습니다. 새로고침해 주세요. | The request has changed. Please reload. |
| `DEADLINE_PASSED` | 409 | 제안 마감이 지났습니다. | The quote deadline has passed. |
| `RATE_LIMITED` | 429 | 잠시 후 다시 시도해 주세요. | Too many attempts. Try again later. |
| `OTP_WRONG` | 400 | 인증번호가 맞지 않습니다. | Incorrect code. |
| `OTP_EXPIRED` | 410 | 인증번호가 만료되었습니다. 인증번호를 다시 받아 주세요. | The code has expired. Please request a new one. |
| `OTP_VOID` | 410 | 인증번호를 5회 잘못 입력해 무효가 되었습니다. 새 인증번호를 받아 주세요. | The code was voided after 5 wrong tries. Please request a new one. |
| `OTP_LOCKED` | 423 | 5회 틀려 10분 동안 입력할 수 없습니다. | Locked for 10 minutes after 5 wrong tries. |
| `OTP_COOLDOWN` | 429 | 잠시 후 다시 받을 수 있습니다. | You can request a new code shortly. |
| `OTP_CAP` | 429 | 오늘 보낼 수 있는 인증번호를 모두 썼습니다. 내일 다시 시도해 주세요. | You've reached today's limit for codes. Please try again tomorrow. |
| `AUTH_REQUIRED` | 401 | 로그인이 필요합니다. | Please sign in. |
| `REAUTH_REQUIRED` | 403 | 보안을 위해 비밀번호를 다시 입력해 주세요. | For security, please re-enter your password. |
| `LOGIN_FAILED` | 401 | 이메일 또는 비밀번호가 맞지 않습니다. | Incorrect email or password. |
| `LOGIN_COOLDOWN` | 429 | 로그인에 5회 실패해 15분 동안 시도할 수 없습니다. | 5 failed attempts. Please wait 15 minutes. |
| `ACCOUNT_LOCKED` | 423 | 계정이 잠겼습니다. 비밀번호를 재설정해 주세요. | This account is locked. Please reset your password. |
| `ACCOUNT_SUSPENDED` | 403 | 이용이 제한된 계정입니다. | This account is suspended. |
| `NOT_ACTIVE` | 403 | 가입 인증이 남아 있습니다. | Signup verification is not complete. |
| `PHONE_TAKEN` | 409 | 다른 계정에서 쓰는 번호입니다. 문의해 주세요. | This number is already used by another account. |
| `WITHDRAW_BLOCKED` | 409 | 진행 중인 요청이 있어 지금은 탈퇴할 수 없습니다. | You have requests in progress, so you can't withdraw right now. |
| `FORBIDDEN` | 403 | 권한이 없습니다. | You don't have permission. |
| `NOT_FOUND` | 404 | 찾을 수 없습니다. | Not found. |
| `INTERNAL` | 500 | 일시적인 오류입니다. 잠시 후 다시 시도해 주세요. | Temporary error. Please try again. |

SQL 쪽에서 `raise exception using errcode='P0001', message='MG:<CODE>'` 형태로 던진 오류는 `fromSqlError(e)`가 정규식 `/MG:([A-Z_]+)/`로 코드를 추출해 매핑하며, 매칭되는 코드가 위 테이블에 없으면 `INTERNAL`로 대체된다.

---

### "same rules as the landing validate()"

출처: `_shared/validate.ts` 상단 주석 — "ko/index.html #registerForm 의 validate() 와 정확히 동일한 정규식".

| 이름 | 정규식 / 규칙 |
|---|---|
| `RE_EMAIL` | `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` |
| `RE_PHONE_KR` | `/^(?:01[016789]-?\d{3,4}-?\d{4}|\+82-?\s?10-?\d{3,4}-?\d{4})$/` |
| `RE_TOKEN` | `/^[A-Za-z0-9_-]{4,64}$/` |
| `isIsoDate(s)` | `typeof s === "string"` 이고 `/^\d{4}-\d{2}-\d{2}$/` 매칭 & `Date.parse(s)`가 `NaN`이 아님 |
| `normalizePhone(raw)` | 앞뒤 공백 제거 → 내부 공백 전체 제거 → `+82`(뒤 하이픈 옵션) 접두어를 `0`으로 치환 → 하이픈 전체 제거 (예: `+82 10-1234-5678` → `01012345678`) |
| `maskPhone(normalized)` | 숫자만 추출한 뒤 길이 7 미만이면 원본 그대로 반환, 그 외에는 `앞3자리-****-뒤4자리` (예: `010-****-5678`) |
| `validatePassword(password,email)` | (SPEC_ACCOUNTS.md A1 기준) 10자 미만이면 무조건 실패; 이메일 로컬파트(3자 이상)를 소문자 비교로 포함하면 실패; 12자 이상이면 종류 무관 통과; 그 외에는 영문/숫자/특수문자 3종 중 2종 이상 포함해야 통과 |

---

### Track view model

출처: `get_track/handle.ts`가 만드는 `view` 객체의 키 트리. `owner`/`share` 두 뷰가 있으며, 아래 트리에서 `(owner만)`으로 표시한 키는 `isShare === false`일 때만 포함된다.

```
view
├── view              "share" | "owner"
├── ref
├── state             private.track_slug(state, round) 결과 슬러그
├── state_raw         rfps.state 원값
├── round
├── is_member_owned   boolean (owner_id 존재 여부)
├── caller_is_owner   boolean (= !isShare)
├── dates
│   ├── received_at   (= created_at)
│   ├── verifying_at
│   ├── bidding_at
│   ├── deadline_at   (= deadline)
│   ├── delivered_at
│   └── closed_at
├── event
│   ├── event_type
│   ├── start_date
│   ├── end_date
│   ├── nights            (start/end로 계산, 없으면 null)
│   ├── region
│   ├── headcount_label    (= headcount_band)
│   ├── twin_rooms
│   ├── king_rooms
│   ├── ballroom_use
│   └── ballroom_purpose
├── reason               (state_raw가 rejected/lost/cancelled 이고 close_reason 존재 시) { text }
├── change_summary        (change_summary 존재 시)
├── hotels_invited        해당 round에서 status<>'reinvited'인 invitations 수
├── proposals[]           (delivered 또는 won 상태 & 제출된 견적 있을 때만, 도착순 정렬)
│   ├── label
│   ├── arrival_rank
│   ├── submitted_at
│   ├── currency / twin_rate / king_rate / usd_ref / usd_date
│   ├── breakfast { included, supplement }
│   ├── tax { included, note, rate_pct }
│   ├── availability { all, notes }
│   ├── ballroom { name, fee, fnb_min, includes }
│   ├── valid_until / cancellation / extra
│   ├── profile           (hotel_profile, 없으면 {})
│   ├── memo              (= op_memo)
│   ├── est_total         (twin*twin_rooms + king*king_rooms)*nights + ballroom_fee, 세금 별도(tax_included=false)면 tax_rate_pct 만큼 가산 후 반올림
│   └── hotel_name         (won 이고 해당 제안이 selected일 때만 포함)
├── fx                    (원화 아닌 통화 && usd_ref 있는 제안 존재 시) { date, rates:{통화:환율} }
├── selection             (won일 때, selections 조인 결과 있으면) { label, hotel_name, connected_at }
├── pick                  (owner만; state='delivered' && pick_otp 존재 시) { phone_masked, locked_until? }
└── share                 (owner만) null | { state, url } — url = `${SITE_BASE_URL}/ko/track.html?s=${token}`
```

토큰 처리: `{token}`(kind=`track`) 또는 `{share}`(kind=`share`)만 허용, 둘 다 없거나 kind 불일치면 `TOKEN_INVALID`. share 조회 시에는 `rfp_tokens.views`를 1 증가시키고 `last_viewed_at`을 갱신한다. IP당 60회/분, 실패(TOKEN_INVALID) 시 IP당 20회/10분으로 추가 제한.

---

### Bid view model

출처: `get_bid/handle.ts`가 만드는 `view` 객체.

```
view
├── ref
├── state           "State derivation, first match wins" 절 참조
├── can_revise      (state가 open/submitted) && deadline 존재 && deadline > now
├── round
├── deadline_at      (= invitation.deadline ?? rfp.deadline)
├── min_valid_until   deadline 존재 시 private.due(deadline, 2)::date, 없으면 null
├── request
│   ├── destination      (= rfp.destination ?? rfp.region)
│   ├── event_type
│   ├── start_date / end_date
│   ├── nights            (start/end로 계산)
│   ├── headcount_label    (= headcount_band)
│   ├── twin_rooms / king_rooms
│   ├── ballroom { use, purpose }
│   ├── public_memo
│   ├── prev_deadline     (invitation.reinvited_from 존재 시, 이전 invitation의 deadline)
│   └── change_summary     (rfp.change_summary 존재 시)
├── hotel
│   ├── name / contact_name / contact_email / contact_phone   (partners 테이블 조회)
├── quote            (invitation에 제출된 quote 존재 시) — 아래 quoteToJson() 형태
│   ├── currency, twinRate, kingRate
│   ├── breakfast ("included"|"not_included"), breakfastSupplement
│   ├── tax ("included"|"not_included"), taxNote
│   ├── availability ("all"|"partial"), availabilityNotes
│   ├── ballroomFee, ballroomName, fnbMinimum, ballroomIncludes
│   ├── validUntil, cancellation, additionalProposals
│   ├── hotelName, contactName, contactEmail, contactPhone
│   └── submitted_at, revision
└── organizer          (state === "selected"일 때만) { company, contact_name, email, phone }
```

호출 시 `invitation.status === 'invited' && !viewed_at`이면 `viewed`로 전이하고 `viewed_at`을 채운다. IP당 60회/분 제한.

### State derivation, first match wins

`get_bid/handle.ts`의 판정 순서를 코드 그대로 옮긴다(위에서부터 첫 매치가 최종 상태):

1. `r.state === 'cancelled'` → `cancelled`
2. `inv.status === 'reinvited'` 또는 `inv.status === 'expired'` → `expired`
3. `inv.status === 'declined'` → `declined`
4. `r.state === 'won' && inv.result === 'selected'` → `selected`
5. `r.state === 'won' && inv.status === 'submitted'` → `not_selected`
6. `inv.status === 'submitted'` → `submitted`
7. 그 외 → `open`

---

### account_update 행 / reauth

`account_update`는 member JWT로 인증하며 `op` 필드로 분기한다(핸들러 상단 주석에 명시된 스펙과의 차이 포함):

- **`profile`**: `{name,company,orgType}` → `name.length>=2`, `company.length>=1`, `orgType`이 `["여행사","기업(인하우스)","기타"]` 중 하나여야 함. 응답은 `{member}` (memberView).
- **`marketing`**: `{mktEmail,mktSms}` → 검증 없이 즉시 반영, `mkt_at` 갱신. 응답 `{member}`.
- **`email_start`**: `{new_email,password?}` → `RE_EMAIL` 검증 후 `requireReauthIfStale` 호출. 이미 다른 계정이 쓰는 이메일이면 열거 방지를 위해 **디코이 OTP**(회원 연결 없음, target=`decoy:...`)를 발급해 정상과 동일한 모양으로 응답한다. **스펙 이탈 명시**: §3 표는 모든 `op`이 `{member}`를 돌려준다고 되어 있으나, 코드 주석에 따르면 `email_start`만 다음 단계(이메일 인증 코드 입력)를 위해 `{otp_id,expires_at,resend_at}`를 돌려주도록 의도적으로 다르게 구현되어 있다(다른 인증코드 발급 엔드포인트 `pick_send_otp`/`send_phone_otp` 등과의 응답 형태 일관성을 위함). 나머지 op(`profile`/`marketing`/`email_verify`/`password`)는 스펙대로 `{member}`를 반환한다.
- **`email_verify`**: `{otp_id,code}` → OTP 검증, `otp.member_id`가 현재 회원과 다르면 `OTP_WRONG`. `meta.new_email`이 없으면 `BAD_REQUEST`. Auth의 이메일과 `members.email`을 갱신하고 옛 이메일로 `ACC_EMAIL_CHANGED` 발송(마스킹된 새 이메일 포함). 응답 `{member}`.
- **`password`**: `{current,new}` → 현재 비밀번호로 재로그인 시도(실패 시 `REAUTH_REQUIRED`), `validatePassword(new,email)` 통과해야 함. 비밀번호 변경 후 `signOutAll`(다른 세션 종료, 현재 세션 보존은 Admin API 제약상 근사치)하고 `ACC_PW_CHANGED` 발송. 응답 `{member}`.
- 그 외 `op` → `BAD_REQUEST`.

**reauth 규칙** (`_shared/reauth.ts`, `requireReauthIfStale`): 마지막 로그인(`member.last_login_at`)으로부터 10분(`REAUTH_WINDOW_MS = 600_000`)이 지나지 않았으면 재인증 불필요. 10분이 지났으면 `password`가 없거나 `member.email`이 없으면 즉시 `REAUTH_REQUIRED`; `password`가 있으면 `authAdmin.signInWithPassword(email,password)`를 시도해 실패 시 `REAUTH_REQUIRED`를 던진다. 민감한 동작(이메일/휴대전화/비밀번호 변경, 탈퇴)에 적용되며, `account_update`의 `email_start`와 `send_phone_otp`의 `phone_change` 경로에서 호출된다.

---

### withdraw: "no ORG_CANCELLED"

`withdraw/handle.ts`는 탈퇴 시 진행 중이 아닌(`received`/`verifying`/`open`) 소유 RFP를 자동 취소하는데, 이때 `private.rfp_transition(id,'cancelled','system',null,'회원 탈퇴',null,null)`을 호출한다.

SQL 쪽 근거는 `0003_private_fns.sql:453` 부근(`p_action = 'cancelled'` 분기)이다:

```sql
elsif p_action = 'cancelled' then
  -- 회원 탈퇴로 인한 자동 취소는 ORG_CANCELLED 를 보내지 않는다 (SPEC_LAUNCH.md §3 withdraw: "no ORG_CANCELLED").
  if p_reason is distinct from '회원 탈퇴' then
    perform private.enqueue('ORG_CANCELLED', 'ORG_CANCELLED:' || p_rfp_id, ...);
  end if;
  if v_prev_state = 'bidding' then
    insert into rfp_history(...) values (..., 'OPS_HTL_CANCELLED 안내는 자동 발송되지 않습니다 · 초대 호텔에 직접 안내 필요');
  end if;
```

즉 `p_reason`이 정확히 문자열 `'회원 탈퇴'`일 때만 `ORG_CANCELLED` 발송을 건너뛴다(그 외 사유의 취소는 정상적으로 발송). 취소 직전 상태(`v_prev_state`)가 `bidding`이었던 경우, 이미 초대된 호텔에게 취소를 알리는 자동 발송(`OPS_HTL_CANCELLED`류)은 없으며 운영자가 수동으로 안내해야 한다는 이력 메모만 남긴다.

`admin_member_action`의 `withdraw` 액션이 호출하는 `public._admin_member_action` SQL 함수도 동일하게(`0005_rpc_admin.sql` 587행 부근) `rfps`를 직접 `state='cancelled', close_reason='회원 탈퇴'`로 갱신하지만, 이 경로는 `private.rfp_transition`을 거치지 않으므로 `ORG_CANCELLED` enqueue 자체가 없다(즉 이 경로에서도 결과적으로 미발송).

Edge Function(`withdraw/handle.ts`) 쪽에서는 탈퇴 완료 메일 `ACC_WITHDRAWN`을 계정 정보를 지우기 전에 별도로 발송한다. 회원 PII는 `members` 행 자체는 남기되(다른 RFP의 `owner_id` 참조 무결성 유지) `state='withdrawn'`으로 바꾸고 `name/email/phone/consents`를 null 처리한다. 성사(선정) 기록이 있는 RFP는 연락처를 지우지 않는다(`selections.org_snapshot`이 별도 3년 보관 기한을 따름).

---

### request_change / ask_question

두 함수는 `_shared/rfp_message.ts`의 `handleRfpMessage(req, deps, kind)`를 감싸며 `kind`(`"change"` | `"question"`)만 다르다.

공용 로직(`handleRfpMessage`):

1. `{token, message, proposals?}` 파싱. `token`이 없으면 `BAD_REQUEST`, 공유(`s_`) 토큰이면 `FORBIDDEN_SHARE`.
2. `message.length`가 1~2000자 범위를 벗어나면 `VALIDATION`(fields: `message`/`length`).
3. `rfp_tokens`에서 토큰 조회 — 없으면 `TOKEN_INVALID`; `kind==='share'`면 `FORBIDDEN_SHARE`; `state!=='active'`면 `TOKEN_REVOKED`.
4. 연결된 `rfps` 조회 — 없으면 `TOKEN_INVALID`; `state`가 종결 상태(`won`/`lost`/`rejected`/`cancelled`) 중 하나면 `STATE_CONFLICT`.
5. `rateLimit("rfp_message", rfp.id, 10, 86400)` — **10회/일/RFP**를 `request_change`와 `ask_question` 합산으로 공유한다.
6. `rfp_messages`에 `{rfp_id,kind,body,proposal_labels,token_id}` insert, `rfp_history`에 `변경 요청:`/`문의:` 접두 메모(메시지 200자까지) 남김.
7. `sendInternalInbound`로 운영팀 수신함(`OPS_INBOX`)에 `[MICEGO] 변경 요청 · <ref>` 또는 `[MICEGO] 문의 · <ref>` 제목의 메일 발송, idempotency key `INTERNAL_INBOUND:<kind>:<rfp.id>:<now>`.
8. `notification_log`에 `template_id='INTERNAL_INBOUND', recipient_kind='ops'`로 기록.
9. 응답은 항상 `{received:true}`.

---

### 회원·운영자 SQL RPC (PostgREST 직접 호출)

이 항목의 함수들은 Edge Function이 아니라 PostgREST를 통해 직접 호출되는 `security definer` SQL 함수다(`0004_rpc_member.sql`, `0005_rpc_admin.sql`).

**회원용 (`0004_rpc_member.sql`, `authenticated`에 grant)**

| 이름 | 인자 | 반환 | 권한 |
|---|---|---|---|
| `my_profile()` | 없음 | jsonb `{name,company,orgType,email,phone,state,mktEmail,mktSms,mktAt,lastLoginAt}` | `auth.uid()`가 활성 회원(`state`가 `withdrawn`/`purged`가 아님)이어야 함, 아니면 `MG:AUTH_REQUIRED` |
| `my_sessions()` | 없음 | jsonb 배열 `[{id,ua,ip,updated_at,current}]` (`current`는 JWT의 `session_id` claim과 비교) | `state in ('active','locked','suspended')` 아니면 `MG:AUTH_REQUIRED` |
| `my_rfps()` | 없음 | jsonb `{rows:[...], link_candidates:[...], linked_recent:int}` — `rows`는 소유 RFP 목록(ref,title,region,날짜,state,track_state,group,next_step,needs_action,track_token,share,linked_from_guest), `link_candidates`는 전화번호는 일치하지만 이메일이 다르고 owner가 없는 RFP 후보, `linked_recent`는 최근 30일 내 생성된 소유 RFP 수 | `state in ('active','locked','suspended')` 아니면 `MG:AUTH_REQUIRED` |
| `create_share_link(p_ref text)` | RFP ref | jsonb `{token,url,created_at}` | `state<>'active'`면 `MG:AUTH_REQUIRED`; ref가 본인 소유 아니면 `MG:FORBIDDEN`; 종결 후 30일 경과 시 `MG:STATE_CONFLICT`. 기존 활성 공유 링크는 자동 폐기(`revoked`) 후 새 토큰(`s_` 접두) 발급 |
| `revoke_share_link(p_ref text)` | RFP ref | jsonb `{revoked:true}` | 위와 동일 소유권 검사(`MG:AUTH_REQUIRED`/`MG:FORBIDDEN`) |
| `link_request(p_ref text)` | RFP ref | jsonb `{requested:true}` | 활성 회원만; 대상 RFP가 이미 owner 있거나 전화번호 불일치면 `MG:FORBIDDEN`; `link_requests`에 `pending`으로 upsert(중복 무시) |

**운영자용 (`0005_rpc_admin.sql`, `authenticated`에 grant, 내부에서 `private.require_operator()`로 재검사)**

| 이름 | 인자 | 반환 | 권한 |
|---|---|---|---|
| `admin_snapshot()` | 없음 | jsonb `{tick,rfps,partners,invArchive,inaccMarks,holidays,sendLog,members,shareLinks,linkRequests,memberAudit,memberLog,failures,metrics}` — 어드민 포털 전체 초기 로드용 스냅샷 | operator 전용 |
| `admin_rfp(p_ref text)` | RFP ref | jsonb (`private.rfp_to_json` 형태, 단건) | operator 전용; ref 없으면 `MG:TOKEN_INVALID` |
| `admin_transition(p_ref, p_action, p_reason?, p_note?, p_memo?)` | ref/action/사유/메모 | jsonb (전이 후 RFP 상세) | operator 전용; `private.rfp_transition` 호출 |
| `admin_rfp_update(p_ref, p_patch jsonb)` | ref, 패치 객체(`deadline`/`publicMemo`/`anonReviewed`/`destination`/`headcount`/`ballroom_note`/`budget_note` 중 존재하는 키만 반영) | jsonb (갱신 후 RFP 상세) | operator 전용; 변경 내역을 `rfp_history`에 요약 기록 |
| `admin_invite(p_ref, p_partner_codes text[])` | ref, 파트너 코드 배열 | jsonb (RFP 상세) | operator 전용; RFP가 `anon_reviewed`이고 `deadline` 설정돼 있어야 함(`MG:GUARD_ANON`), `state`가 `open`/`bidding`이어야 함(`MG:STATE_CONFLICT`); 각 코드에 대해 `approved`+수신거부 안 한 파트너만 초대, 동일 라운드 중복 초대는 건너뜀; `HTL_INVITE` 발송 |
| `admin_reinvite(p_ref, p_invitation_id uuid)` | ref, 기존 invitation id | jsonb (RFP 상세) | operator 전용; 기존 초대를 `reinvited`로 바꾸고 새 초대 생성, `HTL_INVITE`(PREV_DEADLINE 포함) 발송 |
| `admin_mark_selection(p_ref, p_invitation_id, p_sel text)` | ref, invitation id, `selected`/`notselected`/그 외(null) | jsonb (RFP 상세) | operator 전용; `invitations.result` 갱신 |
| `admin_quote_update(p_quote_id uuid, p_patch jsonb)` | quote id, 패치(`usdRef`/`usdDate`/`taxRatePct`/`opMemo`) | jsonb (RFP 상세) | operator 전용 |
| `admin_invitation_flag(p_invitation_id uuid, p_inaccurate boolean)` | invitation id, 플래그 | jsonb (RFP 상세) | operator 전용 |
| `admin_add_note(p_ref, p_memo text)` | ref, 메모 | jsonb (RFP 상세) | operator 전용; `rfp_history`에 메모만 추가 |
| `admin_partner_transition(p_code, p_action, p_reason?, p_note?, p_memo?)` | 파트너 코드, action(`reviewing`/`approved`/`rejected`/`suspended` 등 상태별 허용 전이) | jsonb (파트너 상세) | operator 전용; `approved`는 체크리스트(`exists`/`capOk`/`contactOk`) 전부 충족해야 함(`MG:VALIDATION`), `rejected`/`suspended`는 사유 필수(`MG:GUARD_REASON`); `PTN_APPROVED`/`PTN_REJECTED`/`PTN_REINSTATED` 발송 |
| `admin_partner_update(p_code, p_patch jsonb)` | 코드, 패치(`check`/`profile`/`dest`/`cap`/`description`) | jsonb (파트너 상세) | operator 전용 |
| `admin_link_decide(p_id uuid, p_decision text, p_reason?)` | link_request id, `approve`/`reject`, 사유 | jsonb `{id,status}` | operator 전용; 승인 시 RFP의 `owner_id`를 연결하고 `ACC_LINKED` 발송 |
| `admin_holiday_add(p_day date, p_name text)` | 날짜, 이름 | jsonb `{day,name}` | operator 전용; `kr_holidays` upsert |
| `admin_holiday_delete(p_day date)` | 날짜 | jsonb `{deleted:true}` | operator 전용 |
| `admin_delivery_resolve(p_log_id bigint, p_manual boolean)` | 발송 로그 id, 수동 처리 여부 | jsonb `{resolved}` | operator 전용; `notification_log.manual_resolved_at/by` 갱신 |
| `admin_resend(p_log_id bigint)` | 발송 로그 id | jsonb `{requeued:true}` | operator 전용; 상태를 `pending`으로 되돌려 재시도 큐에 편입 |

그 외 `public._admin_member_action(...)`은 `service_role` 전용(`authenticated`/`anon`/`public`에서 권한 회수)이며 PostgREST로는 노출되지 않고, Edge Function `admin_member_action`이 서버 간 호출로만 사용한다(§3 `admin_member_action` 행 참조).

**submit_rfp 상세**

`submit_rfp`는 anon으로 호출되며(선택적으로 member JWT를 붙이면 프로필 연락처로 덮어써 `owner_id`를 설정), `ko/index.html #registerForm`의 `validate()`를 서버에서 그대로 재현한다. 검증 필드 목록(`_shared/validate.ts`의 `FieldErrors` 사용):

| 필드 | 규칙 |
|---|---|
| `orgType` | `["여행사","기업(인하우스)","기타"]` 중 하나 |
| `company` | 1자 이상 |
| `name` | 2자 이상 |
| `email` | `RE_EMAIL` |
| `phone` | 공백 제거 후 `RE_PHONE_KR` |
| `eventType` | 비어있지 않음 |
| `startDate` | `isIsoDate` && (Asia/Seoul 기준 오늘 이상, 아니면 `past` 코드) |
| `endDate` | (제공 시) `isIsoDate` && `endDate >= startDate`, 아니면 `before_start` 코드 |
| `headcount` | `["50명 미만","50~100명","100~300명","300~500명","500명 이상"]` 중 하나 |
| `region` | 1자 이상 |
| `twinRooms` | 값 존재 & 0 이상의 유한수 |
| `kingRooms` | 값 존재 & 0 이상의 유한수 |
| `ballroomUse` | `["사용","미사용"]` 중 하나 |
| `ballroomPurpose` | (`ballroomUse==='사용'`일 때만) `["디너","Full Day","Half Day","기타"]` 중 하나 |
| `consent` | `true` |

검증 통과 후: IP당 5회/10분, 이메일당 20회/일 rate limit. `idem` 키로 재요청 시 기존 RFP를 그대로 반환(멱등). 활성 member JWT가 있으면 프로필의 `name/company/email/phone`으로 접수 내용을 덮어쓰고 `owner_id`를 설정한다. `private.next_ref('MG')`로 ref 채번, track 토큰 발급, `rfp_history`에 접수 이력 기록, `ORG_RECEIVED` 발송. 응답은 `{ref,track_token,track_url,received_at}`.

---

## §4. 알림·OTP·인증 설정

### "Dispatcher"

`supabase/functions/dispatch_notifications/handle.ts` + `_shared/notify/dispatch_one.ts` 기준.

- **배치 크기:** 1회 호출당 기본 `limit = 50`(요청 body에 양수 `limit`이 있으면 그 값, 단 최대 200으로 clamp). `for update skip locked`로 `pending`/`partial` 상태에서 `coalesce(next_attempt_at, scheduled_at) <= now()`인 행을 골라 `processing`으로 잠근다.
- **백오프(분) 배열:** `BACKOFF_MINUTES = [1, 5, 30, 120, 360]` — 1차 실패 후 1분, 2차 5분, 3차 30분, 4차 120분, 5차 360분 뒤 재시도.
- **최대 재시도:** `MAX_ATTEMPTS = 5`. `attempts >= MAX_ATTEMPTS`이면 `failed`로 확정.
- **`notification_log.status` 값(코드 기준):** `pending`/`processing`(대기 pick 시 세팅)/`partial`(일부 채널만 성공)/`done`(전체 성공)/`failed`(5회 소진). — 지시문이 가정한 값 집합("pending/partial/sent/failed/skipped")과는 달리, "sent"/"skipped"는 `notification_log.status`가 아니라 **채널별** 기록인 `notification_deliveries.status`(`delivery_status` enum: `queued/sent/delivered/failed/skipped`)에서 쓰인다. `dispatch_one.ts`의 `recordDeliveries()`가 `error === 'NOT_CONFIGURED'`면 `skipped`, 성공이면 `sent`, 그 외 실패면 `failed`로 각 채널 시도를 기록한다.
- **`x-cron-secret`:** `handle()`이 `x-cron-secret` 헤더(pg_cron 경로) 또는 `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`(서비스롤 경로) 중 하나를 `timingSafeEqual`로 검증하고, 둘 다 아니면 `FORBIDDEN`을 던진다.

### "OTP storage"

`supabase/functions/_shared/otp.ts` 기준.

- **`code_hash` 공식:** `code_hash = sha256Hex(`${code}:${otpId}:${pepper}`)`, 즉 `sha256(code + ':' + otp_id + ':' + OTP_PEPPER)`. 코드 생성 직후 id를 알아야 하므로, insert 시에는 `code_hash`를 placeholder `'PENDING'`으로 넣고 id를 얻은 뒤 다시 `update`로 실제 해시를 채운다.
- **만료:** `expiresAt = now + ttlSeconds*1000`(호출자가 ttlSeconds를 지정). 검증 시 `expires_at <= now`이거나 `consumed_at`이 있으면 `OTP_EXPIRED`.
- **재발송 쿨다운:** 같은 `target_hash`+`purpose`로 미소비/미폐기된 최근 코드가 `cooldownSeconds` 이내면 `OTP_COOLDOWN`. `resendAt = now + cooldownSeconds*1000`도 함께 응답에 포함.
- **일 한도:** 같은 target_hash+purpose로 오늘(생성일 기준) 발급된 코드 수가 `dailyCap` 이상이면 `OTP_CAP`.
- **오답 5회 처리:** `verifyOtp`에서 해시 불일치 시 `attempts += 1`; `attempts >= max_attempts`(기본 5, `otp_codes.max_attempts` 컬럼)가 되면 — `lockSeconds`가 지정된 호출(로그인류)이면 `locked_until = now+lockSeconds`를 세팅하고 `OTP_LOCKED`, 그렇지 않으면(일반 OTP) `voided_at`을 세팅하고 `OTP_VOID`. 아직 한도 미만이면 `attempts`만 갱신하고 `OTP_WRONG`(응답에 `remaining = max_attempts - attempts`).
- **`MG_DEMO_OTP`:** `otp.ts` 자체에는 없고, 각 발급 엔드포인트(`resend_email_code`, `send_phone_otp`, `account_update`, `signup_start`, `pick_send_otp`, `admin_member_action`)의 `handle.ts`가 `demoFixedCode: deps.env.MG_DEMO_OTP === "1" && deps.env.NOTIFY_MODE !== "live" ? "123456" : null`로 호출한다. 즉 `MG_DEMO_OTP=1`이어도 `NOTIFY_MODE=live`면 강제로 무시되고 실제 랜덤 코드가 발급된다(README 3절의 "`NOTIFY_MODE=live` 에서는 무시된다" 서술과 일치).
- **`otp_codes` 테이블 컬럼(0002_tables.sql):** `id(uuid pk)`, `purpose(otp_purpose)`, `member_id`, `rfp_id`, `ticket`, `target(text)`, `target_hash(text)`, `meta(jsonb)`, `code_hash(text)`, `attempts(int, default 0)`, `max_attempts(int, default 5)`, `expires_at(timestamptz)`, `resend_after(timestamptz)`, `consumed_at`, `voided_at`, `locked_until`, `ip(inet)`, `created_at`.

### `supabase/config.toml [auth]` 블록 전재

```
[auth]
enabled = true
site_url = "https://micego.kr"
additional_redirect_urls = ["https://micego.kr/ko/reset.html", "https://micego.kr/ko/signup.html"]
jwt_expiry = 3600
# 회원은 signup_start Edge Function 을 통해서만 생성된다 (auth.admin.createUser, email_confirm=false로 시작).
# 클라이언트의 supabase-js signUp() 직접 호출은 막는다.
enable_signup = false
enable_confirmations = true
minimum_password_length = 10

[auth.email]
enable_signup = false
enable_confirmations = true
# 가입/이메일변경 인증코드, 비밀번호 재설정 링크 모두 우리가 직접 OTP 테이블 + Edge Function 으로 관리하고
# (SPEC_LAUNCH.md §4 OTP storage), Supabase 내장 이메일 발송은 쓰지 않는다 (Resend 로 대체 발송).
# 그럼에도 GoTrue 내부의 토큰 만료 설정은 우리 쪽 OTP 만료 시간과 맞춰 둔다.
otp_expiry = 1800
otp_length = 6

[auth.sms]
enable_signup = false
enable_confirmations = false
# 한국 통신사 발신번호 사전등록이 필요한 SMS OTP 는 Supabase Auth phone-OTP 가 아니라
# 자체 otp_codes 테이블 + Solapi/Aligo 어댑터로 처리한다 (SPEC_ACCOUNTS.md B, settings.html 전제 조건 참고).

[auth.external.email]
enabled = false
```

### 어댑터: Resend / Solapi / Aligo

**Resend** (`_shared/notify/resend.ts`) — 엔드포인트 `POST https://api.resend.com/emails`. 인증: `Authorization: Bearer <RESEND_API_KEY>` + `Idempotency-Key: <idempotencyKey>` 헤더. payload 모양: `{ from, to:[to], cc?:[cc], subject, html, text?, reply_to?:[replyTo], headers?:{...} }`(옵션 필드는 있을 때만 포함). `mode==='log'`이면 실제 HTTP 호출 없이 `{ok:true, providerMsgId:'log-mode', payload}`를 즉시 돌려준다.

**Solapi** (`_shared/notify/solapi.ts`) — 엔드포인트 `POST https://api.solapi.com/messages/v4/send-many/detail`. 인증 헤더: `HMAC-SHA256 apiKey=<key>, date=<ISO>, salt=<32자 랜덤>, signature=<sig>`이고, `signature = hmacSha256Hex(apiSecret, date + salt)`(HMAC 키=apiSecret, 메시지=date와 salt를 이어붙인 문자열). 알림톡(ATA) payload: `{messages:[{to,from,type:'ATA',text,subject:title,kakaoOptions:{pfId,templateId:templateCode,variables,disableSms:false}}]}`. SMS payload: `{messages:[{to,from,type:'SMS',text}]}`.

**Aligo** (`_shared/notify/aligo.ts`) — 엔드포인트 `POST https://apis.aligo.in/send/`(`application/x-www-form-urlencoded`, `URLSearchParams`). 인증: 별도 서명 없이 body에 `key`(ALIGO_KEY)/`user_id`(ALIGO_USER_ID)/`sender`/`receiver`/`msg`를 평문으로 포함. `apiKey`/`userId`/`sender` 중 하나라도 없으면 `NotConfiguredError`를 던져 자동으로 건너뛴다(SMS/LMS만 지원, ATA 없음).

### EUC-KR 바이트 규칙

`_shared/notify/render.ts`의 `eucKrBytes(s)`: 문자열을 코드포인트 단위로 순회해 **ASCII(코드포인트 ≤ 0x7f)는 1바이트, 그 외(한글 등)는 2바이트**로 근사 계산한다(실제 EUC-KR 인코딩 바이트 수가 아니라 "ASCII=1, 비ASCII=2"라는 근사치). `renderSms()`가 이 값을 `def.sms.limit_bytes ?? 90`과 비교해 초과 시 `RenderError`를 던진다 — 즉 SMS 기본 상한은 **90바이트**.

### "INTERNAL_INBOUND"

`_shared/notify/internal.ts` 상단 주석: "`INTERNAL_INBOUND` 라는 이름의 내부 전용 템플릿을 OPS_INBOX로 보낸다. `docs/notification-templates.json`에는 이 템플릿 정의가 없으므로(고객 대상 템플릿이 아님), `templates.gen.ts` 파이프라인을 거치지 않고 여기서 직접 최소한의 이메일을 구성해 보낸다." — 문의/변경요청/질문 같은 내부 운영 알림은 고객에게 보내는 43(§4 하단 실측 45)개 정형 템플릿과 달리 운영팀에게만 가는 1회성 메일이라, 템플릿 렌더러(`{{VAR}}` 치환, OPTIONAL BLOCK 등)를 태우지 않고 `sendInternalInbound()`가 `Object.entries(fields)`를 HTML 테이블 행으로 직접 조립한 뒤 `sendResend()`를 호출한다.

### 인라인 단일채널 발송 vs enqueue

`_shared/notify/enqueue_and_dispatch.ts` 상단 주석 그대로: "enqueue 후 그 자리에서 즉시 한 번 발송을 시도하는 공용 헬퍼("fire-and-forget 성격이지만 결과를 기다려 실패를 로그에 남긴다" — 실패해도 notification_log 는 pending/partial 로 남아 cron dispatch_notifications 가 재시도한다). OTP/재설정처럼 비밀 코드를 담은 단일 채널 메시지는 이 경로를 쓰지 않고 deps.send() 로 직접 인라인 발송한다 (SPEC_LAUNCH.md §4)." 즉 `enqueueAndDispatch()`는 `private.enqueue()`로 `notification_log`에 적재 → 그 행을 다시 읽어 `dispatchOne()`을 즉시 1회 호출 → 실패해도 로그는 큐에 남아 배치 크론이 재시도. 반면 OTP·비밀번호 재설정 코드는 큐를 거치지 않고 `Deps.send()`(단일 채널, 큐 기록 없음)로 그 요청/응답 사이클 안에서 바로 보낸다.

### 템플릿 파이프라인

`supabase/scripts/sync_templates.py`가 `docs/notification-templates.json` + `emails/*.html`을 읽어 `supabase/functions/_shared/templates.gen.ts`(생성 파일, 코드 상단에 "이 파일은 생성됩니다. supabase/scripts/sync_templates.py 로 다시 만드세요." 명시)를 만든다. 각 템플릿의 `email.file`이 가리키는 `emails/*.html`이 존재하면 그 내용을 읽어 `EMAIL_HTML[id]`로 함께 내보낸다. 배포 순서상 `python3 scripts/sync_templates.py` 실행 후 `supabase functions deploy`(README §2).

**템플릿 수(`docs/notification-templates.json` 실측):** 전체 **45개**. 채널별 — email **29**, alimtalk **9**, sms **2**(lms 폴백 대상 9개는 alimtalk과 겹침). `templates.gen.ts`는 `scripts/sync_templates.py`가 JSON에서 생성하는 파일이며 2026-09-27 재생성 후 `TEMPLATES` 키 45개(그 전 커밋본은 `FB_OPS_ALERT`·`FB_ACK`가 빠진 43개로 오래된 상태였다). **Edge Function 배포 전에는 항상 `sync_templates.py`를 먼저 돌린다**(런북 Step 6). Deno 단위 테스트 `render_test.ts`는 `Object.keys(TEMPLATES)`를 순회하므로 재생성본 기준 45개를 검사한다.

---

## §5. 프론트엔드 API 연동 (assets/mg.js)

(별칭 SS5)

### `MG` 객체 개요

`assets/mg.js`는 ES5 IIFE로 `window.MG`를 만든다. 화살표 함수·`const`/`let`·`async`를 쓰지 않는다는 주석이 파일 첫 줄에 있다.

- **mode 판정**: `window.MG_CONFIG.supabase.url`이 있으면 `hasApi=true`, `mode='api'`. 없으면 `mode='mailto'`(기존 메일/클립보드 폴백 그대로 유지).
- **preview 판정**: `config.demo !== false` 이고 쿼리스트링에 `state` 파라미터가 있으면 `MG.preview = true`. (`?state=` 로 상태를 미리보기하는 데모 모드에서는 API 모드라도 실제 호출을 건너뛴다.)
- `FUNCTIONS_URL` = `sbCfg.functionsUrl` 또는 `sbCfg.url + '/functions/v1'`. `REST_URL` = `sbCfg.url + '/rest/v1'`.
- `lang` = `<html lang>` 속성(기본 `'ko'`).

### EDGE_NAMES / RPC_NAMES

`MG.api.*`는 두 그룹의 함수 이름으로 자동 생성된다.

**EDGE_NAMES (23개, Edge Function 호출 — `POST {FUNCTIONS_URL}/{name}`):**

`submit_rfp`, `get_track`, `request_change`, `ask_question`, `create_share_link`, `revoke_share_link`, `pick_send_otp`, `pick_verify`, `register_partner`, `get_bid`, `submit_quote`, `decline_bid`, `unsubscribe`, `contact`, `signup_start`, `resend_email_code`, `verify_email`, `send_phone_otp`, `verify_phone_otp`, `password_reset_request`, `password_reset_complete`, `account_update`, `withdraw`

**RPC_NAMES (4개, PostgREST RPC 호출 — `POST {REST_URL}/rpc/{name}`):**

`my_profile`, `my_rfps`, `my_sessions`, `link_request`

`RPC_PARAM_MAP`은 `link_request`에 한해 인자 키 `ref`를 서버 쪽 이름 `p_ref`로 바꿔 보낸다(`buildRpcFn`이 `RPC_PARAM_MAP[name]`이 있으면 payload 키를 매핑 후 전송).

### `MG.api.*` 함수 시그니처와 반환

- `buildEdgeFn(name)` → `function(payload){ return callEdge(name, payload); }` — 반환값은 `Promise`. 성공 시 서버 JSON 바디, 실패 시 `mgErrorFromEnvelope(status, body)`(EDGE) 또는 `mapPostgrestError(body)`를 거친 동일 모양의 에러 객체로 reject.
- `buildRpcFn(name)` → 위 파라미터 매핑 후 `callRpc(name, params)`.
- `callEdge`/`callRpc` 공통: `hasApi`가 false면 즉시 `Promise.reject({code:'INTERNAL', status:0, message_ko:'설정되지 않았습니다.', message_en:'Not configured.'})`. 네트워크 자체가 실패하면 `mgErrorNetwork()`(`{code:'INTERNAL', status:0, ...}`)로 reject.
- 요청 헤더: `Content-Type: application/json`, `apikey: ANON_KEY`, `Authorization: authHeaderValue()`(세션 있으면 `Bearer {access_token}`, 없으면 `Bearer {ANON_KEY}`).

### `MG.auth.*`

- `signIn(email, password, keep)` — `POST login` 호출 → 성공 시 `_session`/`_member`를 채우고 `persistSession(keep)` 후 `notifyChange()`. 이어서 `ready()`로 supabase-js 클라이언트가 로드되면 `client.auth.setSession(...)`도 맞춰준다. 반환값은 `login` 응답 그대로.
- `signOut(scope)` — supabase-js `client.auth.signOut(scope ? {scope} : undefined)`를 시도(있으면). `scope !== 'others'`일 때만 로컬 세션을 지우고 `notifyChange()` 호출(다른 세션만 revoke하는 `'others'`는 로컬 세션 유지).
- `session()` / `member()` — 현재 `_session`/`_member` 그대로 반환.
- `onChange(cb)` — 리스너 등록. `notifyChange()`가 호출될 때마다 `cb(_session, _member)` 실행.
- `verifyRecovery(k)` — supabase-js `client.auth.verifyOtp({token_hash:k, type:'recovery'})`. 에러면 `TOKEN_INVALID`로 변환해 reject, 성공하면 세션을 저장(`persistSession(false)`, 즉 세션스토리지)하고 `notifyChange()`.

### 세션 저장 방식 (storage 키)

- 키: `mg_session_v1` (localStorage/sessionStorage 공용). 값은 `JSON.stringify({session, member})`.
- `persistSession(keep)`: `keep===true`면 `localStorage`에 쓰고 `sessionStorage`는 지움. 아니면 반대로 `sessionStorage`에 쓰고 `localStorage`는 지움("로그인 상태 유지" 체크박스에 대응).
- 부팅 시 `loadStored()`가 `localStorage` → 없으면 `sessionStorage` 순으로 읽어 `_session`/`_member`를 복원.
- `clearSession()`은 두 스토리지 모두에서 해당 키를 제거.
- 모든 `storage.getItem/setItem/removeItem` 호출은 `safeGet/safeSet/safeRemove`로 try/catch 감싸 스토리지 접근 불가(프라이빗 모드 등) 상황에서도 죽지 않게 한다.

### 오류 처리 (ERRORS 카탈로그 미러)

`mg.js`의 `ERRORS` 객체는 `supabase/functions/_shared/errors.ts`를 미러링한다는 주석이 붙어 있다(§3 오류 카탈로그와 코드/문구를 함께 고쳐야 함). 총 23개 코드(`BAD_REQUEST`부터 `INTERNAL`까지), 각각 `{status, ko, en}`.

- `mgErrorFromEnvelope(status, body)` — Edge Function이 내려준 `{error:{code,message_ko,message_en,fields,retry_after,remaining,locked_until,blockers}}` 봉투를 통일된 에러 객체로 변환. `code`가 카탈로그에 없으면 `INTERNAL`로 대체.
- `mapPostgrestError(body)` — PostgREST가 SQL `raise exception message='MG:<CODE>'`를 `{message:"MG:<CODE>", code:"P0001", ...}`로 감싸는 것을 정규식 `/MG:([A-Z_]+)/`로 풀어 동일한 에러 모양으로 변환.
- `msg(err)` — `lang`에 따라 `message_en`/`message_ko` 중 하나(없으면 카탈로그 기본 문구)를 고른다.
- `show(err, opts)` — `opts.setErr(id, true)`로 `err.fields`에 나열된 필드마다 에러 표시를 걸고, `opts.toast(msg(err))`로 토스트를 띄운다.

### API-first 폼 제출

`build2.py`의 `WP3 (SPEC_LAUNCH §5)` 주석이 붙은 8개 지점은 모두 같은 패턴을 따른다: **API-first, 실패 시 mailto 폴백이 아니라 `MG.mode==='api' && !MG.preview` 여부로 완전히 분기**한다 — API 모드가 아니거나 미리보기(`?state=`) 중이면 오늘의 mailto/클립보드 데모 동작(`mgMailtoFallback()`)을 그대로 타고, API 모드면 서버 호출 경로(`mgSubmitXxx()`류)만 탄다(둘을 순차 폴백하지 않음).

| 지점(라인) | 함수/핸들러 | 동작 |
|---|---|---|
| 56·61 (en/index.html 파트너 등록) | (성공 패널 훅) + `PTN_SUBMIT_NEW` 내 익명 제출 핸들러 | `#ptnDone`(hidden, `[data-mg="ptnDoneRef"]` span)를 성공 시 채우고 노출. API 모드: `MG.api.register_partner({...,consent:true, idem:mgIdem})` → 성공 시 `resp.partner_id`를 `ptnDoneRef`에 채우고 `#ptnDone.hidden=false`, `mgTrack('partner_register',{mode:'api'})` 호출 후 `mgShowSuccess()`. 실패 시 `MG.show(err,{toast:mgToast, setErr:setFieldError, fieldMap:{...}})`. mailto 모드: `mgMailtoFallback()`이 기존 메일 초안 열기 로직을 바이트 단위로 보존.|
| 173·180 (ko/index.html RFP 제출) | `mgSubmitRfp` 역할을 하는 익명 핸들러 (`RFP_SUBMIT_NEW`) | `#rfpDone`(hidden, `[data-mg="rfpDoneRef"]`+`[data-mg="rfpDoneTrack"]`)을 채운다. API 모드: `MG.api.submit_rfp({...,consent:true, idem:mgIdem, lang:'ko'})` → 성공 시 `resp.ref`를 `rfpDoneRef`에, `resp.track_url`(또는 `MG.url.track(resp.track_token)`)로 만든 "진행 상황 보기" 버튼을 `rfpDoneTrack`에 넣고 `#rfpDone` 노출, `mgTrack('rfp_submit',{mode:'api', event_type:...})`. 실패 시 `MG.show(err,{...fieldMap:{orgType,company,name,email,phone,eventType,startDate,endDate,headcount,region,twinRooms,kingRooms,ballroomUse,ballroomPurpose}})`. mailto 모드는 기존 메일 초안 로직 보존. |
| 710 (share-link UI, `SHARE_JS`) | `shareInit()` 내부 `create_share_link`/`revoke_share_link` 분기 | API 모드(`mgApi = MG.mode==='api' && !MG.preview`)일 때 `ref`는 `data-ref` 속성이 아니라 `mgLoadTrack()`이 채운 `mgTrackData.ref`에서 가져온다(`getRef()`). `document.addEventListener('mg:trackLoaded', ...)`로 트랙 데이터 로드 완료 후 기존 공유 상태(`mgTrackData.share`)를 반영. 생성/재생성/해제 버튼은 각각 `MG.api.create_share_link({ref})`, 다시 `create_share_link`, `MG.api.revoke_share_link({ref})`를 호출. |
| 890 (bid.html) | `mgLoadBid()` | `data-state='loading'`(API 모드, `?state=` 미리보기 아님)일 때만 실행. `MG.api.get_bid({token:TOKEN})` → 성공 시 `mgBidData=resp`, `.ref-code` 텍스트를 `'MICE QUOTE REQUEST · REF ' + resp.ref`로, `resp.organizer`가 있으면 `bidOrgCompany/bidOrgContact/bidOrgEmail/bidOrgPhone` 4개 `[data-mg]` 요소를 채우고, `H.setAttribute('data-state', resp.state)`로 실제 상태 패널로 전환. 실패 시 `data-state='invalid'`. |
| 1175 (track.html) | `mgLoadTrack()` | `STATE_HEAD_SHARE`가 `data-state='loading'`을 남겼을 때만 실행. `?s=`(공유 토큰)가 있으면 `MG.api.get_track({share: shareTok})`, 없으면 `{token: TOKEN}`. 성공 시 `mgTrackData=resp`, `.ref-code` 텍스트 채움, `H.setAttribute('data-state', resp.state)`, `document.dispatchEvent(new CustomEvent('mg:trackLoaded'))`(위 SHARE_JS가 구독). 실패 시 `data-state='invalid'`. |
| 1216 (track.html) | `mgAsk()`/`mgChange()` 역할을 하는 즉시실행함수 | API 모드일 때 `a[data-mg-action]`(값 `'ask'` 또는 `'change'`) 클릭을 가로채 mailto 링크 대신 인라인 textarea+버튼 UI를 삽입한다. 전송 시 `kind==='ask' ? MG.api.ask_question : MG.api.request_change`를 `{token:TOKEN, message:msg}`로 호출, 성공하면 박스 내용을 "보냈습니다..." 안내로 교체하고 토스트, 실패하면 `toast(MG.msg(err))`. |

두 성공 패널 컨테이너(`#ptnDone`, `#rfpDone`)는 `build2.py`가 hidden 상태로 미리 심어 두고(§9 훅 포인트), 위 표의 API 성공 콜백이 노출·값 주입을 담당한다.

---

## §6. 운영 콘솔 데이터 어댑터 (admin/data-adapter.js)

### `MGA` 객체 개요

`admin/data-adapter.js`도 ES5. `mode` 판정: `sbCfg.url`이 있고 **동시에** `window.MG && MG.mode==='api'`일 때만 `hasApi=true`, `mode='api'`. 그 외에는 `mode='mock'`(기존 목데이터 그대로).

### mock 모드의 `document.write`

`hasApi`가 false면 파일 로드 시점(IIFE 본문, 즉시 실행)에 `document.write('<script src="mock-data.js"><\/script>')`를 실행한다. 파일 헤더 주석이 명시하듯, 이렇게 해야 **동기적으로** `window.MOCK_DATA`가 다음 `<script>` 태그인 `admin.js`가 실행되기 전에 존재한다(스크립트 로드 순서에 의존하는 트릭이며, `document.write`는 mock 모드에서만 실행된다).

### `boot`/`rpc`/`edge`/`restReq` 함수 시그니처

- `MGA.boot(cb)` — mock: `cb(clone(window.MOCK_DATA))`를 바로 호출(세션·권한 확인 없음). api: `MG.ready()`로 supabase 클라이언트 확보 → `client.auth.getSession()` → 세션 없으면 `index.html`로 리다이렉트, `session.user.app_metadata.role !== 'operator'`면 로그아웃 후 `index.html?e=role`로 리다이렉트, 통과하면 `_accessToken = session.access_token`을 저장하고 `rpc('admin_snapshot', {})`를 호출해 그 결과를 `cb(snap)`으로 넘긴다(실패 시 `index.html?e=snapshot`).
- `MGA.login(email, password)` — mock: `sessionStorage.setItem(ROLE_KEY,'operator')` 후 `Promise.resolve(true)`. api: `client.auth.signInWithPassword({email,password})` → 에러면 `{code:'LOGIN_FAILED',...}`로 reject, `role!=='operator'`면 로그아웃 후 `{code:'FORBIDDEN', message:'운영자 권한이 있는 계정으로 로그인해 주세요.'}`로 reject, 통과하면 `_accessToken`을 세팅하고 `true`를 resolve.
- `MGA.logout()` — mock: `sessionStorage.removeItem(ROLE_KEY)` 후 `index.html`로 이동. api: `client.auth.signOut()` 시도 후 `index.html`로 이동.
- `rpc(name, params)` — `POST {REST_URL}/rpc/{name}`, 헤더 `apikey`+`Authorization: authHeader()`(`_accessToken` 없으면 `ANON_KEY`). 실패 응답은 `rpcError(body)`(메시지에서 `MG:CODE` 패턴을 정규식으로 뽑아 `{code, message}`로 변환)로 reject.
- `edge(name, payload)` — `POST {FUNCTIONS_URL}/{name}`, 실패 시 `{code: body.error.code||'INTERNAL', message: body.error.message_ko||body.error.message||'오류가 발생했습니다'}`로 reject.
- `restReq(method, path, body, extraHeaders)` — 피드백 콘솔(§5 SPEC_FEEDBACK)이 쓰는 일반 PostgREST 요청. `body!==undefined`일 때만 `Content-Type: application/json`을 붙이고 JSON.stringify. GET/PATCH/POST 등 메서드를 그대로 받는다.

### `EDGE_OPS` 매핑 표 (콘솔 액션 → Edge Function/RPC)

`MGA.call(name, args)`은 `EDGE_OPS[name]`가 있으면 `edge(name,args)`, 없으면 `rpc(name,args)`를 호출한다. `EDGE_OPS = {admin_member_action: 1}` 뿐이다 — 나머지는 전부 RPC. 이유는 코드 주석 그대로: "SPEC_LAUNCH §0/§6: it needs the Auth admin API, so it can't be a security-definer SQL RPC."

`admin.js`가 `A.persist(op, args, localFn)`로 호출하는 액션 전체(= 실질적인 콘솔 액션 → 서버 함수 매핑):

| 콘솔 액션(호출부) | op(Edge Function/RPC 이름) | 경유 | 응답 처리 |
|---|---|---|---|
| RFP 상태 전이 (`admin.js:620`) | `admin_transition` | RPC | 전체 엔티티 반환 시 `S.rfps` 교체(`RFP_REPLACE_OPS`) |
| 파트너 상태 전이 (`admin.js:302`) | `admin_partner_transition` | RPC | `S.partners` 교체(`PARTNER_REPLACE_OPS`) |
| 회원 계정 조치(잠금해제/정지/재초대/회수/이전/탈퇴) (`admin.js:394`) | `admin_member_action` | **Edge Function** | ack만 반환 → `localFn` 재생 |
| 초대 승인/반려 (`admin.js:511`, `522`) | `admin_link_decide` | RPC | ack만 → `localFn` 재생 |
| 파트너 초대 (`admin.js:637`) | `admin_invite` | RPC | 전체 엔티티 → `S.rfps` 교체 |
| 재초대 (`admin.js:650`) | `admin_reinvite` | RPC | 전체 엔티티 → `S.rfps` 교체 |
| RFP 필드 수정(마감일/공개메모/익명검토여부) (`rfp.html`) | `admin_rfp_update` | RPC | 전체 엔티티 → `S.rfps` 교체 |
| 제안 선정 표시 (`rfp.html`) | `admin_mark_selection` | RPC | 전체 엔티티 → `S.rfps` 교체 |
| 이력에 메모 추가 (`rfp.html`) | `admin_add_note` | RPC | 전체 엔티티 → `S.rfps` 교체 |
| 견적(quote) 필드 수정 (`rfp.html`) | `admin_quote_update` | RPC | 전체 엔티티 → `S.rfps` 교체 |
| 초대 부정확 플래그 (`partner.html`) | `admin_invitation_flag` | RPC | 전체 엔티티 → `S.rfps` 교체 |
| 파트너 상세 필드 저장(디바운스) (`partner.html`) | `admin_partner_update` | RPC | 전체 엔티티 → `S.partners` 교체 |
| 발송 로그 수동 처리 표시 (`dashboard.html`/`settings.html`) | `admin_delivery_resolve` | RPC | ack만 → `localFn` 재생 |
| 발송 재시도 (`settings.html`) | `admin_resend` | RPC | ack만 → `localFn` 재생 |
| 공휴일 추가/삭제 (`settings.html`) | `admin_holiday_add`/`admin_holiday_delete` | RPC | ack만 → `localFn` 재생 |

`replaceEntity(op, resp)`는 `resp`가 객체이고 `resp.id`가 있을 때만 동작: `RFP_REPLACE_OPS`에 속하면 `S.rfps`, `PARTNER_REPLACE_OPS`에 속하면 `S.partners`에서 같은 `id`를 찾아 통째로 교체(없으면 push). 그 외(ack만 내려주는 RPC/Edge Function)는 `localFn()`을 그대로 재생해 로컬 상태를 맞춘다. 어느 쪽이든 성공하면 `save()`(sessionStorage) + `A.onChange()`.

### `DEMO_CLOCK` 상수

`DEMO_CLOCK = Date.parse('2026-10-08T19:30:00+09:00')`. `MGA.now()`는 mock 모드에서 이 값을, api 모드에서는 `Date.now()`(실제 시각)를 반환한다. `admin.js`는 이 값으로 `NOW`를 고정해 SLA 계산에 쓴다.

### 역할 저장 키

`ROLE_KEY = 'micego_admin_role'` — mock 모드에서 로그인 성공 시 `sessionStorage.setItem(ROLE_KEY, 'operator')`로만 쓰인다(값 종류는 코드상 `'operator'` 하나만 확인됨; 다른 역할 값 존재 여부는 소스 미확인). api 모드의 실제 역할 판정은 `session.user.app_metadata.role`이며 이 키를 쓰지 않는다.

### admin.js:115 부근 "API 연동: 서버 호출 + 로컬 반영" 패턴

`admin.js`의 `A.persist = function(op, args, localFn)`:

- `MGA.mode !== 'api'`(=mock)이면 `localFn()`을 즉시 실행하고 `save()` + `A.onChange()` 후 `Promise.resolve(true)`.
- `MGA.mode === 'api'`이면 `MGA.call(op, args)`를 호출 → 성공하면 `replaceEntity(op, resp)`로 전체 교체를 시도하고, 교체 대상이 아니면(=ack만 반환) `localFn()`을 재생 → `save()` + `A.onChange()` → `true`. 실패하면 `A.toast(err.message||err.message_ko||'처리하지 못했습니다','error')` 후 `false`.

주석 원문: "전체 엔티티를 돌려주는 RPC 는 그 응답으로 S.rfps/S.partners 항목을 통째로 교체한다. ack 만 돌려주는 RPC(admin_link_decide, admin_holiday_*, admin_delivery_resolve, admin_resend, admin_member_action)는 localFn 을 그대로 재생해 로컬 상태를 맞춘다."

### 스크립트 로드 순서

모든 `admin/*.html`에서 동일: `../assets/config.js` → `../assets/mg.js` → (`../assets/feedback.js` defer) → `data-adapter.js` → `admin.js`. `data-adapter.js` 파일 헤더 주석이 이 순서를 명시하며, mock 모드의 `document.write`는 바로 다음 스크립트 태그(`admin.js`)가 실행되기 전에 `mock-data.js`를 끼워 넣기 위한 장치다.

---

## §7. 오픈 자산 빌드 (build_launch.py) (비인용)

`build_launch.py`는 `build2.py` 실행 끝에 `exec()`로 주입되는 WP2 "런치 자산 후처리" 패스다. 아래는 이 파일이 만들거나 변형하는 것들의 목록과, 각각에 적용되는 규칙 (a)(b)(c)…이다(번호는 이 문서가 서술 편의상 붙인 것이며 원문 스펙의 절 번호가 아니다 — 원본 스펙 유실로 코드 순서를 그대로 따름).

**(a) `assets/config.js` 생성** — `window.MG_CONFIG`(도메인·baseUrl·공식/개인정보 이메일·supabase 설정·`demo`/`prod` 플래그), `window.mgTrack`(no-op 기본값), `window.MICEGO_FEEDBACK`(피드백 위젯 설정: supabaseUrl/anonKey/functionsUrl/fallbackEmail/contactPath/`buildVersion`/`launcher:true`/`disabled:false`) 세 가지를 한 파일에 쓴다. `site.config.json` → `assets/config.js` 주입 경로: `site_config.py`가 `MG_SITE_CONFIG` 환경변수(없으면 cwd의 `./site.config.json`)를 읽어 `CFG`/`SITE_BASE`/`MAIL`/`PMAIL`/`API`/`DEMO`/`PROD`로 노출하고, `build_launch.py`가 그 값들로 `_cfg_out` 딕셔너리를 만들어 `json.dumps`한다.

**(b) `assets/mg.js` 스텁 생성(조건부)** — `MG_JS_STUB`은 `mode:'mailto'` 고정, `api:{}` 빈 객체, `auth.*`는 전부 no-op/`null` 반환인 최소 구현. **`assets/mg.js`가 이미 존재하면(=WP3가 실 구현을 넣은 뒤) 절대 덮어쓰지 않는다** — `if not _exists('assets/mg.js')`로만 스텁을 쓴다. 규칙 (c) "every indexable page …": `verify_launch.py:355`가 인용하는 이 규칙의 원문 맥락은 en/sample-request.html이 "a noindex demo mockup"이라 규칙 (c)의 예외이며, 그 예외를 제외한 "every indexable page"(공개 15페이지 중 noindex 아닌 것)는 반드시 절대경로 canonical을 갖는다는 것.

**(c) `prod` 플래그 시 제거되는 것** — `DEMO`가 false일 때: (i) `<!--demo:start-->...<!--demo:end-->` 및 `/*demo:start*/.../*demo:end*/`로 감싼 블록(= DEMO 띠, 상태 스위처, 예시데이터 등) 전체 삭제. (ii) `data-mg="..."` 속성이 붙은 태그의 텍스트 콘텐츠(더미 예시값)를 비운다 — "WP3의 data-mg 마크업을 위한 훅 포인트(nothing to empty until WP3 adds data-mg attrs)"라는 주석이 있었던 자리로, 현재는 WP3가 채운 `data-mg` 속성들이 실제로 비워진다. (iii) SENTINELS(더미 데이터 흔적 문자열) 잔존 여부를 전체 페이지에서 검사해 stderr에 NOTE로 보고(하드 실패는 아님).

**환경변수** — `MG_SITE_CONFIG`(site_config.py가 읽는 설정 파일 경로), `MG_BUILD_NO`(기본 `'0'`, `FEEDBACK_BUILD_VERSION = 오늘날짜-MG_BUILD_NO`로 같은 날 재빌드를 구분).

**404/sitemap.xml/robots.txt/아이콘/보안 헤더 생성:**

- **404.html**: 완전 정적, `<script>` 태그 0개(코드 내 `assert '<script' not in PAGE_404`로 스스로 검증). 한국어/영어 병기, 루트 절대경로 링크.
- **아이콘**: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest` 6종 중 하나라도 없으면 `build_icons.py`의 `generate_icons()`를 exec로 호출.
- **robots.txt**: `/admin/`, `/docs/`, `/emails/`, `/ko/track.html`, `/ko/my.html`, `/ko/account.html`, `/ko/withdraw.html`, `/ko/reset.html`, `/en/bid.html`, `/en/unsubscribe.html`, `/404.html`을 Disallow. `CFG.get('domain')`이 있으면 `Sitemap: {SITE_BASE}/sitemap.xml` 줄 추가, 없으면 TODO 주석 두 줄.
- **sitemap.xml**: `CFG.get('domain')`이 있을 때만 생성. `SITEMAP_15`(공개 15개 URL) 각각에 `<loc>`+`<lastmod>`(오늘 날짜), 진입 URL(`/`, `/ko/`, `/en/`) 3개에는 `hreflang` alternate 3개(ko/en/x-default) 추가.
- **보안 헤더(`_headers`, `vercel.json`)**: 전역 헤더 7종(HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy, CSP) + 토큰 페이지 7개(`/ko/track.html`, `/en/bid.html`, `/ko/reset.html`, `/en/unsubscribe.html`, `/ko/my.html`, `/ko/account.html`, `/ko/withdraw.html`)에 `Referrer-Policy: no-referrer`/`Cache-Control: no-store`/`X-Robots-Tag: noindex, nofollow` 추가 + noindex 섹션 3개(`/admin/*`, `/docs/*`, `/emails/*`)에 `X-Robots-Tag: noindex`/`Cache-Control: no-store`. CSP는 supabase 호스트(`connect-src`에 https+wss)와 GA4(설정 시)를 동적으로 반영하고, `DEMO`일 때만 `form-action`에 `mailto:`를 허용. `assets/config.js`에는 별도로 `Cache-Control: no-cache`.

---

## §8. 검증 계획

### 3 configurations (a)(b)(c)

`verify_launch.py`가 빌드하는 세 설정(각 설정은 `BASELINE`의 신선한 복사본 위에 `site.config.json`을 덮어쓰고 `build2.py`(+`build_notify.py`+`build_sitemap.py`)를 재실행):

**(a) 기본 빌드 — 바이트 동등성**. `site.config.json`을 그대로 사용(현재 저장소 값 pass-through). 기대치: 공개 HTML이 베이스라인과 완전히 같거나, 다음 허용 목록에 속하는 삽입/치환만 있어야 한다 — 아이콘 `<link>` 4종, `assets/config.js`+`assets/mg.js`(+`assets/feedback.js`) 스크립트 태그, `data-states="..."` 토큰이 늘어나는 것(줄지는 않음), `#rfpDone`/`#ptnDone` 훅 컨테이너, `data-mg(?:-[a-z]+)?="..."` 속성 추가, WP-F2 피드백 위젯 배선(early-error 스니펫·`micego-build` meta·`data-mgfb-launcher="off"`·`data-mg-fixed-bottom`·"의견 보내기/Feedback" 푸터 링크·privacy.html 신규 섹션), `en/terms.html` 신규 진입, `bid.html` 이용약관 링크 교체. **WP3가 소유한 트레일링 핸들러 스크립트**(`(function(){"use strict";...})();` IIFE와 `<script>try{localStorage.setItem('micego.mode',...)}catch(e){}...</script>`)는 존재 여부만 비교하고 줄 단위 비교에서는 완전히 스킵한다(플레이스홀더 `<script>SCRIPT</script>`로 치환 후 비교). 그 외: `robots.txt`는 반드시 `/en/unsubscribe.html`/`404.html` Disallow 줄을 새로 가져야 하고, `sitemap.xml`은 도메인 미설정이므로 생성되면 안 된다.

**(b) staging — 데모 + 스텁 supabase**. `domain/officialEmail/privacyEmail` 전부 빈 문자열, `operator`/`analytics.ga4`/`siteVerification` 전부 빈 값, `supabase:{url:"https://stub.mg.test", anonKey:"stub-anon-key", functionsUrl:""}`, `sms:{vendor:"solapi", vendorName:""}`, `prod:false, demo:true`. 기대치: `assets/config.js`에 `stub.mg.test` 문자열이 포함되고, `ko/track.html`의 STATE_HEAD 스크립트에 `api=!!(C.supabase&&C.supabase.url)` API 감지 배선이 존재해야 한다.

**(c) prod — 풀 설정**. `domain:"micego.kr"`, `officialEmail:"hello@micego.kr"`, `privacyEmail:"privacy@micego.kr"`, `operator`에 법인명(`주식회사 마이스고`)·대표자·사업자등록번호·통신판매업신고번호·주소·개인정보책임자 전부 채움, `analytics.ga4:"G-TEST"`, `siteVerification`에 google/naver 스텁, 같은 supabase 스텁, `prod:true, demo:false`. 기대치 목록: (i) SENTINELS 중 `STRUCTURAL_SENTINELS`(`123456`/`mysteri1984`/`micego.example`/`?state=` — WP2가 완전히 소유) 는 완전 제거, 나머지 샘플데이터 흔적은 "WP3의 data-mg 패스 전까지는 남아있는 게 정상"으로 NOTE만 출력. (ii) `.demo-strip`/`.state-switch` 요소가 공개 15페이지 + 토큰 페이지 6종에서 모두 사라짐. (iii) noindex가 아닌 공개 15페이지는 절대경로 canonical, 진입 3페이지는 hreflang 3종(ko/en/x-default) 보유 — noindex 페이지(en/sample-request.html)는 반대로 canonical/hreflang이 **없어야** 정상(위 §7 규칙 (c) 참조). og:image는 절대 URL이어야 함. (iv) `robots.txt`에 `Sitemap: https://micego.kr/sitemap.xml`. (v) `sitemap.xml`이 파싱되고 `<loc>` 15개. (vi) GA4 스니펫이 정확히 공개 15페이지에만 존재(그 외 0). (vii) `_headers`/`vercel.json`이 파싱되고 CSP에 `stub.mg.test` 포함. (viii) `404.html`에 `<script>` 없음. (ix) 아이콘 크기(`apple-touch-icon.png` 180×180, `icon-192.png` 192×192, `icon-512.png` 512×512, `favicon.ico`에 16×16/32×32 포함) 및 `site.webmanifest` 유효 JSON. (x) `en/terms.html`에 `DRAFT` 배지 + `TODO(legal)` 마커. (xi) `en/unsubscribe.html`에 5개 상태(`loading/confirm/done/already/invalid`) 모두 존재. (xii) `legalName` 설정 시 `ko/about.html`에 사업자 정보 블록 렌더.

### "WP3 -- verify_api.py (Playwright)"

`verify_api.py`는 configuration (b)(=verify_launch.py의 (b)와 같은 레시피)를 빌드해 로컬 HTTP 서버로 서빙하고(파일:// 오리진의 fetch 불안정 문제 회피), Playwright로 구동한다. `page.route('https://stub.mg.test/**')`가 `tests/fixtures/api/*.json`을 함수명·시나리오별로 서빙하고, jsdelivr의 supabase-js URL은 `tests/fixtures/supabase-stub.js`로 라우팅한다. `# ====` 섹션 제목을 순서대로 나열하면 다음 플로우 목록이 된다(15개):

1. `landing: submit_rfp` — ko 랜딩 RFP 폼. ok/validation(422)/ratelimited(429) 3개 시나리오, payload 키가 §3 목록과 정확히 일치하는지, `#rfpDone` 노출과 REF/트랙 링크, 422 시 `.error` 클래스, 429 시 토스트를 검증.
2. `partner register` — en 랜딩 파트너 등록 폼. `#ptnDone` 성공 패널 노출을 검증.
3. `bid` — en/bid.html. `get_bid` 로 `data-state='open'` 전환과 `.ref-code` 렌더(open), 마감 지난 견적 제출 시 `submit_quote`가 호출되어 `DEADLINE_PASSED`로 거부되는 경로, 결과 거절(decline) 경로.
4. `track (+ pick + share)` — ko/track.html. `get_track` 로 상태 로드, 제안 선택(OTP 발송/검증) 흐름, 공유 링크 생성/재생성/해제.
5. `contact` — 문의 폼 제출.
6. `signup: full path + PHONE_TAKEN` — 회원가입 전 과정(이메일 인증→휴대전화 인증)과 `PHONE_TAKEN` 충돌 케이스.
7. `login` — 로그인 성공/실패 경로.
8. `reset: bad k -> expired` — 비밀번호 재설정 링크의 잘못된/만료된 키 처리.
9. `my.html: list + link candidate` — 로그인한 회원의 RFP 목록과 계정 연결 후보 표시.
10. `account: REAUTH_REQUIRED then OK` — 계정 정보 변경 시 재인증 요구 후 재시도 성공 경로.
11. `withdraw: 409 blockers` — 진행 중 요청이 있어 탈퇴가 막히는 `409`(`WITHDRAW_BLOCKED`) 케이스.
12. `unsubscribe: 4 states` — en/unsubscribe.html의 상태 전환(체크→확인/이미해지 등).
13. `admin: role reject` — operator가 아닌 역할로 로그인 시 콘솔 접근 거부.
14. `admin: snapshot renders dashboard counts` — `admin_snapshot` 응답으로 대시보드 카운트가 렌더되는지.
15. `admin: a transition calls admin_transition` — 콘솔에서의 상태 전이 조작이 실제로 `admin_transition` RPC를 호출하는지.

**`tests/fixtures/supabase-stub.js`의 역할**: 가짜 `supabase.createClient()`로, `assets/mg.js`와 `admin/data-adapter.js`가 실제로 쓰는 auth 메서드(`getSession`, `setSession`, `signOut`, `signInWithPassword`, `verifyOtp`)만 구현한다. 테스트가 내비게이션 전에 `window.__mgStub`(`page.add_init_script`로 주입)을 설정해 각 메서드의 응답(고정값 또는 함수)을 지정하고, 설정 안 된 메서드는 "stub: ... not configured for this test" 에러를 던져 설정 누락을 조용히 감추지 않는다.

### Deno 단위 테스트

`supabase/functions/_tests/*.ts` — 실행 대상 테스트 파일 9개(+공용 헬퍼 3개: `_assert.ts`, `mock_deps.ts`, `otp_mock_db.ts`):

- `submit_rfp_test.ts` — "submit_rfp 검증 매트릭스 + 성공 경로 테스트 (SPEC_LAUNCH.md §8: **"the validation matrix"**)."
- `otp_lifecycle_test.ts` — "OTP 수명주기 단위 테스트 (SPEC_LAUNCH.md §8: **"wrong → remaining, 5 wrong → void or lock, cooldown, cap"**)." — 오답 시 `remaining` 감소 보고, 5회 오답 시 이메일 계열은 void(잠금 없음)/휴대전화 계열(`lockSeconds` 지정 시)은 10분 lock, 재발송 쿨다운(`OTP_COOLDOWN`), 일일 발송 상한(`OTP_CAP`)을 각각 검증.
- `login_test.ts` — "login 오류 코드 + 잠금/쿨다운 임계값 테스트 (SPEC_LAUNCH.md §8: **"the error envelope and codes for each function"**; SPEC_ACCOUNTS.md A2: "5 fails -> 15분 cooldown; 10 fails within 1h -> locked")." — 15분 내 5회 오답 시 `LOGIN_COOLDOWN`(+`retry_after`), 쿨다운 중엔 올바른 비밀번호도 확인 전에 즉시 차단됨을 검증.
- `validate_test.ts` — 검증 헬퍼 단위 테스트: 비밀번호 규칙(SPEC_ACCOUNTS.md A1), 이메일/전화 정규식, 전화번호 정규화·마스킹.
- `notify_adapters_test.ts` — 알림 발송 어댑터(Resend 메일, Solapi 인증 헤더) 단위 테스트.
- `render_test.ts` — 알림 템플릿 렌더링(이메일/알림톡/문자, EUC-KR 바이트 계산 포함) 단위 테스트.
- `feedback_mail_retry_test.ts` — feedback-mail-retry `handle()` 테스트: 두 인증 모드(cron secret / 콘솔 운영자 Bearer) + 404/403 케이스(SPEC_FEEDBACK.md §3.10).
- `feedback_sanitize_test.ts` — 피드백 필드 검증 매트릭스 + `maskSecrets` 등 정제 함수(SPEC_FEEDBACK.md §3.6).
- `feedback_submit_test.ts` — feedback-submit `handle()` 테스트: Origin·크기·버전·레이트리밋·허니팟·검증·멱등·중복본문·유저유형 판정·메일 payload(SPEC_FEEDBACK.md §3.3/§3.9/§4.5).

### 공통 기준

`verify_api.py`의 `check_widths()`가 모든 플로우에서 공통 적용: 이미 로드된 페이지를 360 → 768 → 1280px 순으로 리사이즈하며 새 콘솔/페이지 에러가 없어야 한다("SPEC_LAUNCH.md §8" 인용 주석 원문: "No console errors at 360, 768, 1280"). h1 1개, 가로 오버플로 없음 조건은 코드에 직접 문자열로 들어있지는 않으나(소스 미확인 — verify2.py/verify3.py/verify_acc.py 등 다른 스위트의 공통 assertion으로 추정), verify_api.py 자체는 위 3폭 콘솔 에러 검사만 명시적으로 재사용한다.

### 전체 검증 스위트

레포 루트의 `verify*.py` 10개:

| 스크립트 | 대상 |
|---|---|
| `verify2.py` | 공개 13페이지(`index.html`, `ko/index.html`, `ko/privacy.html`, `ko/about.html`, `ko/faq.html`, `ko/contact.html`, `ko/track.html`, `en/index.html`, `en/sample-request.html`, `en/privacy.html`, `en/faq.html`, `en/contact.html`, `en/bid.html`)의 정적/구조 검증(Playwright). |
| `verify3.py` | `en/bid.html`(8개 상태)·`ko/track.html`(11개 상태)의 `?state=` 조합 전수 검증 — 5개 폭(360/390/768/1024/1280)마다 `data-state` 일치, 가로 오버플로 0, 콘솔 에러 0, 현재 상태에 안 맞는 `[data-states]` 요소가 노출되지 않는지(stray) 확인. |
| `verify_acc.py` | 회원 계정 플로우(가입/로그인/재설정/내 요청/계정설정/탈퇴) 검증. |
| `verify_admin.py` | 운영 콘솔 전반(대시보드/RFP 목록·상세) 스크린샷+구조 검증. `BASE='file:///tmp/site/admin/'` (하드코딩). |
| `verify_admin_feedback.py` | 운영 콘솔 피드백 콘솔 화면 검증. `BASE='file:///tmp/site/admin/'` (하드코딩). |
| `verify_admin_members.py` | 운영 콘솔 회원 관리 화면 검증. `BASE='file:///tmp/site/admin/'` (하드코딩). |
| `verify_admin_ops.py` | 운영 콘솔 파트너/설정(홀리데이·재발송 등) 운영 화면 검증. `BASE='file:///tmp/site/admin/'` (하드코딩). |
| `verify_launch.py` | 위 (a)(b)(c) 설정 빌드의 정적/파일 단위 검증(WP2). |
| `verify_api.py` | 위 15개 플로우의 API 연동(Playwright, WP3). |
| `verify_feedback.py` | 피드백 위젯(WP-F2, SPEC_FEEDBACK.md §8) 엔드투엔드 검증. configuration (b) 재사용. |

스크린샷 저장 경로도 `/tmp/site/admin_shots/*.png`로 하드코딩되어 있다(`verify_admin.py`, `verify_admin_feedback.py`, `verify_admin_members.py`, `verify_admin_ops.py` 전부).

`supabase/tests/run.sh`의 3단계:

1. **pglast parse** — `migrations/*.sql` 전체를 `pglast`로 구문 파싱만 확인(설치 안 돼 있으면 SKIP).
2. **PostgreSQL 16 apply + SQL 테스트** — 실제 로컬 PostgreSQL 16 인스턴스를 띄워(`initdb`+`pg_ctl`) `mgci` DB에 `00_supabase_shim.sql` 적용 후 `migrations/*.sql`을 순서대로 적용, SQL 테스트 실행.
3. **Deno check/test (functions)** — `supabase/functions/_tests/*.ts`를 Deno로 타입체크+실행(위 목록).

---

## §9. 파일 소유권과 훅 포인트

### WP1/WP2/WP3 소유 파일 표

원본 스펙이 유실되어 명시적 소유권 표는 재구성이며, 각 워크패키지가 실제로 건드리는 파일 범위를 코드 근거로 추정한 것이다(코드에 "WP1"이라는 문자열이 등장하는 곳은 `supabase/README.md` 한 곳뿐 — "# MICEGO Supabase 백엔드 (WP1)" — 그 외 WP1 소유 목록은 디렉터리 구조로 유추).

| WP | 소유 영역 | 대표 파일 |
|---|---|---|
| WP1 (백엔드) | Supabase 마이그레이션·Edge Function·공용 모듈·백엔드 테스트 | `supabase/migrations/*.sql`, `supabase/functions/**/*.ts`(각 함수 디렉터리 + `_shared/`), `supabase/tests/**`, `supabase/seed.sql`, `supabase/seed_demo.sql`, `supabase/config.toml` |
| WP2 (런치 자산/빌드 파이프라인) | 설정 로더·빌드 후처리·검증 | `site_config.py`, `site.config.json`, `build_launch.py`, `build_icons.py`, `build_sitemap.py`, `build_notify.py`, 그 산출물(`assets/config.js`, `404.html`, `robots.txt`, `sitemap.xml`, `_headers`, `vercel.json`, 아이콘 6종), `en/terms.html`·`en/unsubscribe.html`의 최초 골격(정적 바디+데모 JS), `verify_launch.py` |
| WP3 (프론트엔드 API 연동) | `assets/mg.js` 소유권 이전 이후의 API 배선, 운영 콘솔 데이터 어댑터, 각 페이지 핸들러 JS의 API 분기, API 연동 검증 자산 | `assets/mg.js`(실 구현), `admin/data-adapter.js`, `admin/admin.js`의 `A.persist`/`MGA.call` 배선, `build2.py`·`build_acc.py`·`build_acc2.py`·`build.py`(`ACC_FLIP_JS`만) 안의 핸들러 JS 문자열, `verify_api.py`, `tests/fixtures/api/*.json`, `tests/fixtures/supabase-stub.js` |

(주의: 이 표는 "코드가 실제로 어느 워크패키지의 흔적을 담고 있는가"를 근거로 재구성한 것이며, 원본 스펙의 절 구분과 정확히 일치한다는 보장은 없다 — 소스 미확인 부분.)

### hook points

**`#rfpDone`/`#ptnDone` 컨테이너** — `build2.py`가 두 성공 패널 뒤에 hidden 상태로 미리 심어 둔다:

- `en/index.html`: `<div id="ptnDone" hidden><span data-mg="ptnDoneRef"></span></div>` (56·61행 인근 주석: "WP3 hook point (SPEC_LAUNCH §9): success-panel container #ptnDone, hidden, empty [data-mg] span — WP3's mgRegisterPartner(record) fills this in and un-hides it in api mode.")
- `ko/index.html`: `<div id="rfpDone" hidden><span data-mg="rfpDoneRef"></span><span data-mg="rfpDoneTrack"></span></div>` (173·180행 인근 주석: "WP3 hook point (SPEC_LAUNCH §9): success-panel container #rfpDone, hidden, empty [data-mg] spans — WP3's mgSubmitRfp(record) fills these in and un-hides it in api mode.")

**`data-mg` / `data-mg-action` 속성 규칙** — `verify_launch.py`(WP3 hook point 허용 규칙, 약 125~205행) 주석 원문 인용:

> "// WP3 hook point: data-mg="..." / data-mg-action="..." binding attributes added to existing markup (SPEC_LAUNCH §9)"
>
> "// WP3 hook point: data-mg="..." / data-mg-action="..." binding attributes added anywhere on the line, possibly alongside an unrelated expected change (e.g. a data-states token gain) further down the same (very long, single-line-per-page) markup blob."
>
> "// WP3 note: WP3 owns "the handler JS strings ... in build2.py, build_acc.py, build_acc2.py and build.py (ACC_FLIP_JS only)" (SPEC_LAUNCH.md §9) and is explicitly allowed "minimal expectation updates in existing verify scripts"."

같은 구역의 실무 규칙: `data-mg="..."`가 붙은 태그는 텍스트 콘텐츠를 실제 서버 값으로 채우는 표시(§7의 demo:false 스트립 패스가 그 텍스트를 비우는 대상이기도 함)이고, `data-mg-action="..."`가 붙은 `<a>`는 mailto 링크를 인라인 API 폼으로 대체할 대상(예: track.html의 CHG/ASK 링크 → §5의 `mgAsk()`/`mgChange()`)이다. `verify_launch.py`의 (a) 바이트 동등성 검사는 이 두 속성이 새로 붙는 것을 "` data-mg(?:-[a-z]+)?="[A-Za-z0-9_]*"`" 정규식으로 벗겨내고 나머지가 베이스라인과 같으면 허용한다.

### "ownership then passes to WP3"

`build_launch.py`(mg.js 스텁 가드, 약 93행) 주석 원문: "WP3 now owns assets/mg.js (SPEC_LAUNCH.md §9 file ownership: "ownership then passes to WP3")." 구체적으로는 `build_launch.py`가 `MG_JS_STUB`(mailto 전용 최소 스텁)을 `assets/mg.js`가 **아직 없을 때만** 써넣고, 이미 존재하면(WP3가 실 구현으로 교체한 뒤) 재빌드 때마다 스텁으로 되돌리지 않는다(`if not _exists('assets/mg.js')` 가드). 즉 파일 소유권이 "WP2가 스텁을 처음 만든다 → 그 이후로는 WP3가 소유하고 재빌드가 건드리지 않는다"로 넘어가는 지점.

### `ACC_FLIP_JS`

`build.py`에 정의된 헤더 로그인 링크 플립 스크립트:

```js
ACC_FLIP_JS = '''try{
  var _isMember = false;
  if(window.MG && MG.mode==='api' && !MG.preview){ _isMember = !!MG.auth.member(); }
  else{/*demo:start*/ var _m=sessionStorage.getItem('mg_demo_member'); _isMember = !!(_m&&JSON.parse(_m)); /*demo:end*/}
  if(_isMember){document.querySelectorAll('[data-acc-login]').forEach(function(a){a.textContent='내 견적 요청';a.setAttribute('href','my.html');a.classList.add('is-member');});}
}catch(e){}'''
```

API 모드면 `MG.auth.member()`로, 아니면(데모 마커로 감싸 demo:false 빌드에서 사라짐) `sessionStorage`의 `mg_demo_member`로 로그인 여부를 판정해, 로그인 상태면 헤더의 `[data-acc-login]` 링크 텍스트를 "내 견적 요청"으로 바꾸고 `href`를 `my.html`로 바꾼다(`is-member` 클래스 추가). `NAV_JS`에 인라인되어 모든 ko 페이지의 공통 헤더 스크립트에 포함되고, `app_page()`가 만드는 앱 페이지들에서는 별도의 짧은 `<script>try{localStorage.setItem('micego.mode',...)}catch(e){}{ACC_FLIP_JS}</script>` 블록으로도 등장한다(ko 페이지에서만, `build.py:330`). 이 스크립트는 §9 소유권 규칙상 "build.py 안에서는 ACC_FLIP_JS만" WP3가 소유하고 나머지 `build.py` 로직은 WP2/기존 소유로 남는다.

### "minimal expectation updates in existing verify scripts"

`verify_launch.py`의 (a) 바이트 동등성 검사 인근 주석 원문(재인용): "WP3 owns "the handler JS strings ... in build2.py, build_acc.py, build_acc2.py and build.py (ACC_FLIP_JS only)" (SPEC_LAUNCH.md §9) and is explicitly allowed "minimal expectation updates in existing verify scripts"." 실제로 이 허용이 구현된 자리가 `_OWNED_SCRIPT_RES`(두 개의 정규식으로 트레일링 IIFE와 `micego.mode` 스크립트 블록을 통째로 `<script>SCRIPT</script>`로 치환해 비교에서 제외)와, `_added_line_ok`/`_replaced_pair_ok`에 늘어난 `data-mg`/`data-mg-action` 허용 규칙이다 — 즉 WP3가 API 모드 배선을 위해 기존 핸들러 JS를 다시 쓰더라도, verify_launch.py의 (a) 검사가 "그 핸들러 스크립트 블록의 내용은 비교하지 않는다"는 최소한의 기대치 수정만으로 대응하고, 그 바깥(HTML 마크업·헤드·상태 패널 등)은 여전히 한 줄 단위로 엄격히 비교한다.

---

## §10. 배포·시크릿 (README 기준 정리)

### 배포 순서 (README §2)

```
supabase login
supabase link --project-ref <project-ref>
# 확장(pgcrypto, citext, pg_cron, pg_net)은 대시보드에서 먼저 켠다
supabase db push                              # migrations/0001..0009 적용
psql "$SUPABASE_DB_URL" -f seed.sql
psql "$SUPABASE_DB_URL" -f seed_demo.sql       # 선택
psql "$SUPABASE_DB_URL" -c "alter database postgres set app.settings.functions_url = '...';"
psql "$SUPABASE_DB_URL" -c "alter database postgres set app.settings.cron_secret = '...';"
# ⚠️ 0009_feedback_cron.sql 의 mgfb-mail-retry 작업은 아래 GUC 를 x-internal-secret 헤더로 보낸다.
#    FEEDBACK_CRON_SECRET 시크릿과 반드시 같은 값. (README 원본·런북 v1 에는 빠져 있던 항목 — 2026-09-27 검증에서 발견)
psql "$SUPABASE_DB_URL" -c "alter database postgres set app.settings.feedback_cron_secret = '<FEEDBACK_CRON_SECRET 과 동일>';"
python3 scripts/sync_templates.py                # 반드시 functions deploy 직전에 (templates.gen.ts 재생성)
supabase functions deploy
```

운영자 계정은 대시보드에서 직접 생성 후 `app_metadata.role = "operator"`를 수동 설정(`private.is_operator()`가 이 값을 읽음).

### 환경변수 표 (README §3 본표 + §8.1 피드백 확장표, 코드 grep과 대조)

| 변수 | 용도 (README) | 코드에서 실제로 읽는 위치 | README 대조 |
|---|---|---|---|
| `SUPABASE_URL` | GoTrue Admin REST base | `deps.ts: makeAuthAdmin()` | 일치 |
| `SUPABASE_ANON_KEY` | GoTrue REST anon 인증 | `deps.ts: makeAuthAdmin()` | 일치 |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin REST 인증 / dispatch_notifications 서비스롤 인증 | `deps.ts`, `dispatch_notifications/handle.ts` | 일치 |
| `SUPABASE_DB_URL` | Edge Function 직접 Postgres 접속 | `deps.ts: sql()` | 일치 |
| `SITE_BASE_URL` | 알림 링크 베이스 | `deps.ts: defaultSend`, `render.ts: rewriteBaseUrl` | 일치 |
| `SITE_ORIGINS` | CORS 허용 origin | (grep: `Deno.env.get("SITE_ORIGINS")`, CORS 헬퍼) | 일치 |
| `SUPPORT_EMAIL` | 발신/문의 수신 | `deps.ts: defaultSend` | 일치 |
| `OPS_INBOX` | 내부 알림 수신 | `internal.ts` 호출부(각 handle.ts) | 일치 |
| `FROM_ADDRESS` | 발신 주소 | `deps.ts: defaultSend`, `internal.ts` | 일치 |
| `RESEND_API_KEY` | 이메일 발송 | `deps.ts`, `feedback-submit` | 일치 |
| `NOTIFY_MODE` | live\|log | `deps.ts`, `dispatch_one.ts`, 각 OTP handle.ts | 일치 |
| `SMS_VENDOR` | solapi(기본)\|aligo | `deps.ts: defaultSend`, `dispatch_one.ts` | 일치 |
| `SOLAPI_API_KEY`/`SOLAPI_API_SECRET` | Solapi 인증 | `deps.ts` | 일치 |
| `SMS_SENDER` | 발신번호 | `deps.ts`, `aligo.ts` | 일치 |
| `KAKAO_PF_ID` | 알림톡 채널 | `deps.ts` | 일치 |
| `ALIGO_KEY`/`ALIGO_USER_ID` | Aligo 폴백 | `deps.ts`, `aligo.ts` | 일치 |
| `OTP_PEPPER` | code_hash pepper | 각 OTP 발급 handle.ts(`pepper: deps.env.OTP_PEPPER ?? ""`) | 일치 |
| `IP_HASH_SALT` | 레이트리밋 IP 해시 salt | (grep 확인) | 일치 |
| `CRON_SECRET` | dispatch_notifications x-cron-secret | `dispatch_notifications/handle.ts` | 일치 |
| `MG_DEMO_OTP` | 데모 고정코드 1(NOTIFY_MODE=live에서 무시) | 6개 OTP 발급 handle.ts | 일치 |
| `RESEND_API_KEY`(§8.1 재기재) | 피드백 메일 발송 공유 | `feedback-submit` | 일치(중복 표기) |
| `FEEDBACK_INBOX` | FB_OPS_ALERT 수신 | `feedback-submit/handle.ts` | 일치 |
| `FEEDBACK_FROM` | 운영 알림 발신 | `feedback-submit/handle.ts` | 일치 |
| `FEEDBACK_ALLOWED_ORIGINS` | 정식 origin(=is_demo false) | `feedback-submit/handle.ts` | 일치 |
| `FEEDBACK_STAGING_ORIGINS` | 스테이징 origin(=is_demo true) | `feedback-submit/handle.ts` | 일치 |
| `FEEDBACK_IP_PEPPER` | IP 해시(HMAC) pepper | `feedback-submit/handle.ts` | 일치 |
| `FEEDBACK_CONSOLE_BASE_URL` | 콘솔 링크 베이스 | `feedback-submit/handle.ts` | 일치 |
| `FEEDBACK_CRON_SECRET` | feedback-mail-retry 인증 | `feedback-mail-retry/handle.ts` | 일치 |
| `FEEDBACK_DAILY_CAP` | IP당 1일 상한(기본 500, `envInt` 기본값은 README의 "기본값" 서술과 별개로 코드 기본 500) | `feedback-submit/handle.ts: envInt(...,"FEEDBACK_DAILY_CAP",500)` | 일치(기본값 수치는 README에 미기재, 코드 기본 500) |
| `FEEDBACK_OPS_MAIL_DAILY_CAP` | 운영 알림 메일 1일 상한(기본 150) | `feedback-submit/handle.ts: envInt(...,150)` | 일치 |
| `FEEDBACK_ACK_PER_EMAIL_DAY` | 접수확인 메일 동일 수신자 1일 상한(기본 3) | `feedback-submit/handle.ts: envInt(...,3)` | 일치 |

**grep 대조 결과:** `Deno.env.get(...)` 직접 호출 + `deps.env.<NAME>`/`nenv.<NAME>`/`env.<NAME>` 접근 전체를 코드베이스에서 수집한 결과 **32개**의 서로 다른 환경변수 이름이 나왔고, 이는 README §3(22개) + §8.1(신규 10개, `RESEND_API_KEY` 중복 제외)의 합계 32개와 **정확히 일치한다.** 코드에서 읽지만 README에 없는 변수는 발견되지 않았다("README 누락" 없음).

---

## 부록 A. `private.due()` 예시

`supabase/tests/sql/01_due.sql` 기준, `private.due(start_ts, n)`는 "기산점이 영업일이고 18시 이전이면 그날이 1일째: n-1 영업일 더, 아니면 n 영업일"(0003_private_fns.sql 주석) 규칙을 따른다. 영업일 판정은 `private.is_biz(ts)`(KST 기준 토/일이 아니고 `kr_holidays`에 없는 날), 실제 만기 시각은 언제나 그 KST 날짜의 18:00(`private.at18`)이다.

- **예시 1:** `private.due('2026-10-06 09:00+09', 3)` → 기대값 `'2026-10-08 18:00+09'`. 2026-10-06(화) 09:00은 영업일이고 18시 이전이므로 그날을 1일째로 쳐서 `n-1=2` 영업일을 더한다(`add_business_days(from_ts, 2)`) → 10/7(수)=+1, 10/8(목)=+2, 18:00으로 귀결.
- **예시 2:** `private.due('2026-10-07 10:00+09', 3)` → 기대값 `'2026-10-12 18:00+09'`. 2026-10-07(수) 10:00도 영업일·18시 이전이라 같은 규칙(`n-1=2`)이 적용되지만, 그 사이 주말(10/10~11)과 공휴일(테스트 파일의 공휴일 시딩 기준, 10/9 한글날 등)이 끼어 있어 다음 영업일들이 10/12(월)까지 밀린다.

(파일에는 위 두 예시 외에 "주말 18시 이후 기산" 케이스 — `'2026-10-03 20:00+09'`(토 20시, 영업일 아님)로 시작해 `n=3` 그대로 적용되어 `'2026-10-08 18:00+09'`가 되는 — 가 세 번째 검증으로 추가되어 있다.)
