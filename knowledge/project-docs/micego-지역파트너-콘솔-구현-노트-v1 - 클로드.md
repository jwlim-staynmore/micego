# MICEGO 지역 파트너 콘솔 구현 노트 v1.1 - 클로드

기준일 2026-09-27 · 작성 계정 jwlim@staynmore.com · 설계 근거: `micego-지역파트너-콘솔-기술설계서-v1 - 클로드` (결정 B·A·B — 파트너가 지역 RFP를 끝까지 운영 / 호텔 견적 대리 입력 + 호텔 1회용 확인 링크 / 비교표 전달 전 본사 호텔 검토 게이트 없음·사후 통제).

## 1. 무엇이 들어갔나 (파일 기준)

| 영역 | 파일 | 내용 |
|---|---|---|
| DB 마이그레이션 | `supabase/migrations/0010_regional_partners.sql` | region/region_alias(TH·VN·ID·MY·PH·SG·JP·TW·HK·MO·GU·MP·US + 도시), partner_org/partner_region/console_user, rfps 위임 컬럼(delegation·partner_org_id·region_code·hold_reason·row_version), 자동 배정 트리거, identity_view_log, intervention_alert, 권한 헬퍼(console_me/is_operator/…), RPC rfp_assign/hold/set_region/decline/takeover/release/get_identity, console_whoami/settings, partner_org_upsert, partner_region_set, console_user_action, RLS |
| | `0011_invitation_status_values.sql` | invitation_status += proxy_entered · hotel_confirmed · proxy_disputed · proxy_expired |
| | `0012_console_scope.sql` | admin_snapshot/rfp_to_json 역할별 스코프(파트너에게 오거나이저 마스킹), admin_* RPC 파트너 권한 적용, partner_hotel_register, 파트너 호텔 승인(위험 표시 시 본사만), 본사 사후 검토 |
| | `0013_quote_proxy.sql` | 대리 입력(partner_quote_proxy_enter/resend), 확인 토큰(sha256 저장·72h·1회용), quote 불변 트리거, v_comparable_quote, 호텔 확인/이의(private.quote_confirm_*), 만료 스윕, rfp_transition 재정의(hotel_confirmed=제출, HQ_HOTEL_UNREVIEWED_DELIVERED 알림만) |
| | `0014_settlements.sql` | settlements(ST-YYMM-XXXX) 상태기계 pending_commission→commission_submitted→commission_confirmed→collected→remitted→completed(+disputed/voided), 성사 시 자동 생성, settlement_action(submit/approve[동일 행위자 금지·호텔 사후검토 게이트]/reject/collection/remittance/receipt/dispute/resolve/void/attachment), v_settlement_monthly, intervention_sweep/resolve |
| | `0015_console_accept.sql` | console_accept()(초대→활성), system_tick_all(개입 스윕 포함) |
| | `0016_console_notice.sql` | HTL_CONFIRM·CONSOLE_NOTICE 템플릿 등록, PTR_*/HQ_* 알림을 CONSOLE_NOTICE 한 장으로 라우팅(private.console_notice_text) |
| Edge Function | `partner_invite/` | 콘솔 계정 초대(Supabase invite 메일 → admin/accept.html), app_metadata(role·partner_id·cv), console_user 등록 |
| | `quote_confirm/` | 호텔 확인 페이지 API(lookup/confirm/dispute, POST만 토큰 소비) |
| | `submit_quote`·`get_bid` 패치 | 대리 입력 상태 인지(호텔이 직접 제출하면 대리 견적 대체) |
| | `_shared/deps.ts`·`errors.ts`·`notify/vars.ts`·`templates.gen.ts` | inviteUserByEmail, 새 에러코드, CONFIRM_URL/CONSOLE_URL 변수, 템플릿 2종 |
| 알림 | `build_notify.py` → `emails/HTL_CONFIRM.html`·`CONSOLE_NOTICE.html`, `docs/notification-*` | 호텔 확인 메일(영문) + 콘솔 내부 알림(국문 공통) |
| 콘솔 | `admin/partner.js`(신규 모듈 MICEGO_PTR) | 지역표, 배정/위임 카드, 신원 열람 카드, 대리 입력 셀·다이얼로그, 정산 액션, 개입 위젯, 호텔 등록/사후 검토, 조직·계정 관리, mock 보강(`?as=partner` 시연) |
| | `admin/admin.js`·`data-adapter.js` | 역할별 NAV(정산 공통 / 지역 파트너·회원·피드백·설정=본사 / 내 조직=파트너), A.me·isOperator/isPartner, 시연 역할 전환 |
| | `admin/rfp.html`·`rfps.html`·`partners.html`·`partner.html`·`dashboard.html` | 배정 카드·마스킹·대리 입력·위임/지역 필터·호텔 등록·지역 카드·개입 위젯·파트너 요약 |
| | 신규 `settlements.html`·`settlement.html`·`partner-orgs.html`·`my-org.html`·`accept.html` | 정산 목록/상세, 지역 파트너 조직(본사), 내 조직(파트너), 초대 수락 |
| 호텔 화면 | `en/confirm.html` (`build_confirm.py`로 생성) | 대리 입력 견적 확인/이의 — 링크를 열어도 토큰이 소비되지 않고 버튼(POST)으로만 처리 |
| 테스트 | `supabase/tests/sql/06_partner_console.sql`(16 PASS), `verify_admin_partner.py`(42 PASS) | 백엔드 시나리오 16 · 콘솔 mock 화면 42 |

실행 결과: `supabase/tests/run.sh` PASS=8 FAIL=0 · `verify_admin_partner.py` 42/42 · 기존 `verify_admin.py` 0 FAILS.

## 2. 설계 대비 다른 점 (의도적)

1. `is_operator()`는 console_user 행이 없는 기존 운영자 JWT(app_metadata.role=operator)를 그대로 인정한다 — 기존 운영자 계정 마이그레이션 없이 동작. console_user 행이 생기면 그 행이 우선.
2. 견적 불변 트리거는 anon/authenticated 세션에만 걸린다. 호텔이 직접 제출하는 service_role 경로는 제자리 수정 + quote_revisions 이력 유지(기존 동작 보존). superseded_* 컬럼은 예비.
3. PTR_*/HQ_* 알림은 개별 템플릿 대신 CONSOLE_NOTICE 한 장(제목·본문은 SQL이 ID별로 생성). 개별 디자인이 필요해지면 notif_template_meta에 해당 ID를 등록하면 자동으로 그 템플릿을 쓴다.
4. 정산 금액 입력은 콘솔 폼, 증빙은 링크(드라이브 등)만 — 파일 업로드 없음.
5. 콘솔 계정 초대 메일은 Supabase Auth 기본 초대 템플릿(발신자·문구는 Supabase 대시보드에서 설정).

## 3. 배포 순서 (기존 런북에 더해)

1. `supabase db push` — 0010~0016 순서대로(0011의 enum 추가는 별도 트랜잭션이어야 하므로 파일이 분리돼 있음).
2. `supabase functions deploy partner_invite quote_confirm submit_quote get_bid dispatch_notifications`(templates.gen.ts 갱신 반영).
3. `seed.sql` 재적용(notif_template_meta 2행) — 이미 적용된 프로젝트는 0016이 같은 행을 넣는다.
4. settings 확인: `ops_email`(본사 알림 수신), `partner_auto_assign_enabled`, `proxy_confirm_hours`(72), `partner_idle_hours`(24), `collect_due_days`(30), `remit_due_days`(14), `commission_rate_range`([5,20]).
5. 첫 파트너 온보딩: 콘솔 → 지역 파트너 등록(코드 TMTHAI 등) → 지역 설정(TH 주 담당) → 계정 초대(관리자 1) → 계약·DPA 서명일 입력 → 활성화. 활성화 전 접수된 태국 건은 본사 보유 상태라 "파트너 배정"으로 넘긴다.
6. Supabase Auth: 초대 메일 리다이렉트 허용 목록에 `https://<도메인>/admin/accept.html` 추가, 초대 링크 만료 72h.

## 3-1. 오거나이저 고지 (2026-09-27 결정: 고지한다)

요청이 지역 파트너에게 맡겨지면 오거나이저에게 세 곳에서 파트너 이름을 알린다.

| 채널 | 구현 | 비고 |
|---|---|---|
| 접수 확인 메일(ORG_RECEIVED) · 비딩 시작 메일(ORG_BIDDING) | `REGIONAL_PARTNER` 선택 블록(회색 콜아웃) — `vars.ts`가 위임 건이면 `PARTNER_PUBLIC_NAME`과 `__block_REGIONAL_PARTNER`를 켠다 | 알림톡 본문에는 넣지 않음(이메일만). 접수 확인은 발송 시점에 이미 자동 배정이 끝나 있어 같은 메일에 실린다 |
| 진행 상황 화면(ko/track.html) | `get_track`이 `regional_partner{name,country}`를 주면 요청 표시줄 아래 `.rp-note`로 표시(방침 제8조 링크) | 공유 링크로 보는 사람에게도 보임 |
| 약관·방침 | 방침 제6조 ⑧·제7조 표·제8조 표/본문(처리 위탁+국외 이전, 거부 시 본사 직접 진행), 약관 제4조 ⑥(이행보조자·책임은 회사), Partner Terms 2·8.9(대리 입력+72h 확인)·15.5, Privacy Notice(EN) §4 표 | 모두 `[법무 검토]` 표시. `legal/REVIEW_NOTES.md` §5에 검토 포인트 정리. HTML은 legal 빌드(`/tmp/site` 복사본에서 `build2.py`+`build_legal.py`)를 다시 돌려야 반영됨 |

같이 고친 것: 호텔이 확인한 대리 견적은 초대 상태를 `hotel_confirmed`가 아니라 **`submitted`**로 둔다(확인 사실은 `quotes.confirmed_at/confirmed_via`). 선정·OTP·추적·비교표·정산의 기존 경로가 그대로 적용되고, `hotel_confirmed` enum 값은 예비로만 남는다. `get_track`·`pick_send_otp`는 두 값을 모두 받도록 했다.

## 4. 남은 일 / 결정 대기

- 알림톡·SMS는 콘솔 알림에 쓰지 않음(이메일만). 파트너가 카카오/LINE 알림을 원하면 별도.
- 파트너 정산 통화가 USD 외일 때 환율 출처 규칙(현재 자유 입력 + 출처 메모).
- 기존 진행 중 RFP를 파트너에게 일괄 위임할지(현재는 신규 접수분만 자동 배정, 기존 건은 본사 보유로 백필).
- verify_admin_partner.py는 mock 모드만 검사. API 모드 E2E는 Supabase 배포 후 `verify_api.py`에 파트너 시나리오 추가.

## 개선 이력
- 2026-09-27 · jwlim@staynmore.com(클로드) · v1.1 — 오거나이저 고지 결정(고지) 반영: 메일 블록·추적 화면·약관/방침 6곳, 확인된 대리 견적 상태를 submitted로 통일, get_track/pick_send_otp 보완.
- 2026-09-27 · jwlim@staynmore.com(클로드) · v1 최초 작성 — 백엔드(0010~0016)·Edge Function 2종·콘솔 5개 신규 화면·호텔 확인 페이지·알림 템플릿 2종 구현, 테스트 통과, PC micego-site에 저장.
