# 호텔 커미션(호텔별 고정 요율) 구현 설계서 v1 - 클로드

기준일 2026-09-29 · 기획(Fable) → 설계(Opus) → 구현. 브랜치 `feat/hotel-commission-rate`.

## 확정 결정 (사용자)
- D1 호텔에서 커미션을 받는다. 오거나이저는 계속 수수료 없음, 커미션율 비공개(D-32).
- D2 요율은 호텔 파트너 승인 시 호텔별로 고정, 그 호텔의 모든 성사 건에 적용.
- D3 산정 기준: 객실 + 연회·F&B 전체 계약 금액, 세금·봉사료 제외(net) 단일 기준.
- D4 호텔 동의: 승인 메일의 1회용 토큰 링크에서 클릭 동의. 동의 전에는 견적 초대 불가. 동의 시각·약관 버전 기록.
- D5 지역 파트너 partner_admin은 `settings.commission_rate_range`([5,20]) 안에서 결정, 범위 밖은 본사(operator)만(사유 필수).
- D6(기본값) 요율 스냅샷은 초대 생성 시점, 정산은 선정된 초대의 스냅샷 복사. 요율 변경은 재동의 후 새 초대부터.
- D7(기본값) 기존 승인 호텔은 state 유지, 동의 전까지 초대 불가 + 콘솔 "요율 합의 필요" 표시. 운영 데이터 백필 없음(seed_demo만 백필).
- D8(기본값) 호텔 비딩 화면·초대 메일에 "Your agreed commission: n% of net booking value." 한 줄. 오거나이저 화면 노출 금지.
- D9(기본값) 오거나이저 약관 제4조⑤·ko FAQ에 호텔로부터 수수료를 받을 수 있고 요율은 비공개라는 일반 고지([법무 검토]). "수수료 없음"은 "주최 측 수수료 없음"으로 한정.
- D10(기본값) 인보이스·수금은 현행 정산 상태기계 유지.

## 0. 위험
- 마이그레이션 번호: 이 작업이 `0017_hotel_commission.sql`. 되찾을 selection_consent는 0018로 미룬다.
- `verify2.py`는 en/bid·faq·contact의 "commission"을 FAIL 처리 — 허용 문구 화이트리스트로 바꾼다.
- `admin_partner_transition` 인자 추가 시 오버로드가 생기므로 기존 시그니처를 `drop function if exists` 후 재생성, grant 재부여.

## 1. 마이그레이션 `supabase/migrations/0017_hotel_commission.sql`
- settings(`on conflict do nothing`): `commission_terms_version`="PT-2026-10", `commission_accept_hours`=168. `commission_rate_range` 재사용.
- partners 추가 컬럼: `commission_rate_pct numeric(5,2) check (>0 and <=50)`(동의 전 null), `commission_basis_scope text not null default 'rooms_fnb_net' check (in ('rooms_fnb_net'))`, `commission_accepted_at`, `commission_terms_version`, `commission_accept_ip_hash`, `commission_pending_rate_pct`, `commission_pending_reason`, `commission_set_by uuid`, `commission_set_by_role console_role`, `commission_set_at`, `commission_token_sha256 text unique`, `commission_token_expires_at`, `commission_token_used_at`, `commission_token_sent_at`, `commission_token_send_count smallint default 0`; `check (commission_accepted_at is null or commission_rate_pct is not null)`.
- 이력 `partner_commission_event`(append-only, RLS on, 정책 없음): id, partner_id, action(proposed|resent|accepted|expired|backfilled), rate_pct, prev_rate_pct, basis_scope, terms_version, actor, actor_role, reason, hq_override, ip_hash, at.
- invitations 스냅샷: `commission_rate_pct`, `commission_basis_scope`, `commission_terms_version`.
- settlements: `agreed_rate_pct`, `commission_basis_scope`, `commission_terms_version`.
- private 함수: `commission_rate_check(me, rate, reason)`(0<rate≤50 아니면 MG:VALIDATION; partner_admin 범위 밖 MG:COMMISSION_OUT_OF_RANGE; operator 범위 밖 사유 없으면 MG:GUARD_REASON, 있으면 hq_override), `partner_commission_propose(partner_id, me, rate, reason, template)`(pending·set 저장, 토큰 생성 — sha256·만료·send_count만 저장, 이벤트 proposed, enqueue vars {COMMISSION_TOKEN: raw, COMMISSION_RATE, EXPIRES_HOURS}), `partner_commission_lookup(token)` / `partner_commission_apply(token, ip_hash)` — quote_confirm lookup/apply 패턴(lookup status pending|used|expired|stale; apply는 for update → TOKEN_INVALID/USED/EXPIRED → rate:=pending, accepted_at, terms_version, token_used_at → 이벤트 accepted → PTR_/HQ_HOTEL_TERMS_ACCEPTED 알림).
- 재정의(create or replace, 기존 파일 불변): `admin_partner_transition`(+`p_commission_rate_pct`, `p_commission_reason`; approved 전이 시 요율 필수 MG:COMMISSION_RATE_REQUIRED — risk·체크리스트 검사 뒤; PTN_APPROVED를 propose로 대체; suspended→approved이고 합의 요율 있으면 요율 불필요), `admin_partner_update`(patch commissionRatePct/commissionReason → propose 'PTN_COMMISSION_TERMS'; partner_member FORBIDDEN), 신규 `partner_commission_resend(p_code)`(pending 없으면 STATE_CONFLICT, send_count≥5 RATE_LIMITED), `admin_invite`·`admin_reinvite`(합의 전 호텔 제외 + 이력 메모, 전부 막히면 MG:COMMISSION_NOT_AGREED, 스냅샷 복사), `private.partner_to_json`(+commission 객체), `console_settings`(+키 2개), `private.settlement_create`(스냅샷 복사, null이면 flag no_agreed_rate), `private.settlement_to_json`(+3필드), `settlement_action` 전문 복사(submit_commission: agreed 있으면 rate/basis 프리필, 다르면 note 필수 MG:GUARD_NOTE + flag rate_deviation; 나머지 불변), `private.console_notice_text`(+3 케이스).
- 템플릿 등록: notif_template_meta에 PTN_COMMISSION_TERMS.
- seed_demo.sql 끝: 승인·중지 호텔 10% 동의 백필(terms_version 'DEMO', 이벤트 backfilled), 기존 invitations 스냅샷 채움. 합의 전 호텔 1곳은 남김.

## 2. 동의 흐름
- Edge Function `supabase/functions/partner_commission_accept/{index.ts,handle.ts}` — quote_confirm 복사. body {token, action: lookup|accept}, 레이트리밋 키 commission_accept_ip / _miss_ip. accept는 ipHash 전달.
- `assets/mg.js` EDGE_NAMES에 추가. 오류 코드 COMMISSION_NOT_AGREED·COMMISSION_OUT_OF_RANGE·COMMISSION_RATE_REQUIRED를 `_shared/errors.ts`·mg.js 오류표(ko/en)에.
- 페이지 `en/commission.html` ← 신규 `build_commission.py`(build_confirm.py 구조). 상태 loading|review|done|used|expired|invalid. 호텔명, "n% of net booking value", 기준 정의, 약관 버전·terms.html 5조 링크, 동의 체크 + Accept(POST). 거절 버튼 없음(문의 mailto). GET은 lookup만. build2.py가 끝에서 build_commission을 실행하거나 명령 목록에 추가.
- vercel.json·_headers·robots.txt에 /en/commission.html(+누락된 /en/confirm.html): no-referrer, no-store, noindex.

## 3. 알림
- build_notify.py VARS: COMMISSION_RATE, COMMISSION_URL, COMMISSION_NOTE, TERMS_VERSION. PTN_APPROVED "Fees" 행 → "Commission" 행 + optional_block COMMISSION_TERMS(amber 콜아웃 "Invitations start after you accept" + CTA). 신규 PTN_COMMISSION_TERMS. HTL_INVITE policy 끝에 {{COMMISSION_NOTE}}.
- `_shared/notify/vars.ts`: COMMISSION_TOKEN → COMMISSION_URL, 토큰 키 삭제, __block_COMMISSION_TERMS. 초대의 commission_rate_pct로 COMMISSION_NOTE. 이후 sync_templates.py.

## 4. 콘솔
- data-adapter.js: settings() 캐시(console_settings). admin_snapshot 키 불변.
- admin.js: PARTNER_REPLACE_OPS에 partner_commission_resend; 승인 요청 시 요율 다이얼로그(#cmRate, 범위 힌트, 파트너는 범위 밖 차단, 운영자는 #cmReason 필수), persist 인자 추가.
- partner.js: P.commissionSection(합의 요율·기준·동의 시각·버전·대기·발송·만료·이력, cm-set/cm-resend), 정산 submit_commission rate readonly 프리필 + "합의 요율과 다르게" 체크 시 사유 필수, 계약 금액 "(순액)".
- partner.html/partners.html 배지("요율 합의 필요", "동의 대기"), rfp.html inviteCard 합의 전 호텔 disabled, settlement.html 합의 요율 행, mock-data.js 합의 전 호텔 1곳.

## 5. 약관·카피
- partner_terms_en.json 5조: 5.2 Agreed Rate, 5.3 net 기준(감액·취소 시 최종 지급액 기준), 5.4 요율 변경은 새 링크 동의 후 새 초대부터, 5.5 인보이스(행사 종료 후, 30일 내 지급), 5.6 요율 비밀·오거나이저 비공개, 기존 5.3→5.7. 교차참조 14.1·16.3·18.4. build_launch.py 폴백 문구 수정.
- terms_ko.json 제4조⑤ 일반 고지, ③ "무료" 표현을 "주최 측이 회사에 내는 수수료는 없습니다"로.
- build2.py ko/en FAQ, bid submit-note(#cmNote, get_bid의 commission으로 채움), ko 푸터 "주최 측 수수료 없음", build.py 푸터, src 랜딩 2종.
- get_bid: view.commission = {rate_pct, basis} | null. get_track·ORG_*·ko/*·공유 링크에는 요율 없음.
- REVIEW_NOTES 18→21곳, CLAUDE.md 숫자 갱신.

## 6. 테스트
- `supabase/tests/sql/07_hotel_commission.sql` 9 시나리오(요율 누락, 범위, 토큰 저장, 합의 전 초대 제외, lookup 비소비·used·expired, 스냅샷 불변, 정산 프리필·편차, 이벤트 불변, 권한). 06 수정(승인 시 요율 + 초대 전 동의). run.sh PASS 14.
- verify2(허용 문구·ko 무노출), verify_admin_ops(승인 다이얼로그 요율 입력), verify_admin_partner(범위·배지·초대 disabled·정산 readonly·commission.html 데모), verify_api(get_bid fixture·accept fixture).

## 7. 문서
DECISIONS D-37~D-43, O-7 종결, CHANGELOG [0.10.0-prelaunch], partner-console-impl에 0017, 진행 현황 갱신.

## 8. 배포 위험
배포 직후 기존 승인 호텔 전부 초대 불가 → 오픈 전 운영자가 요율 일괄 제안(`partners where state='approved' and commission_accepted_at is null`). 원문 토큰이 notification_log.vars에 남는 문제(CONFIRM_TOKEN과 동일) — 선택적으로 발송 후 제거.
