-- 지역 운영 파트너 콘솔: 조직·배정·RLS 스코프·대리 입력·인계·정산  - 클로드
-- 운영자(JWT operator, console_user 없음 = 기존 호환) / 파트너 관리자 pa1 / 파트너 담당자 pm1 / 타 지역 파트너 관리자 pb1
do $$
declare pa1 uuid := gen_random_uuid(); pm1 uuid := gen_random_uuid(); pb1 uuid := gen_random_uuid(); op1 uuid := gen_random_uuid(); po_th uuid; po_vn uuid;
begin
  insert into auth.users(id, email) values (pa1, 'pa1@tmthai.example'), (pm1, 'pm1@tmthai.example'), (pb1, 'pb1@vndmc.example'), (op1, 'ops@matchgo.example');
  insert into console_user (user_id, role, status, email, display_name) values (op1, 'operator', 'active', 'ops@matchgo.example', '본사 운영자');
  insert into partner_org (code, legal_name, display_name, public_name, country_code, status, dpa_signed_at, contact_email) values ('TMTHAI', 'Tmthai Co., Ltd.', '티엠타이', 'MICEGO Thailand · Tmthai', 'TH', 'active', now(), 'contact@tmthai.example') returning id into po_th;
  insert into partner_org (code, legal_name, display_name, public_name, country_code, status, dpa_signed_at) values ('VNDMC', 'VN DMC', '베트남DMC', 'MICEGO Vietnam', 'VN', 'active', now()) returning id into po_vn;
  insert into partner_region (partner_id, region_code, is_primary) values (po_th, 'TH', true), (po_vn, 'VN', true);
  insert into console_user (user_id, role, partner_id, status, email, display_name) values
    (pa1, 'partner_admin', po_th, 'active', 'pa1@tmthai.example', '김태국'), (pm1, 'partner_member', po_th, 'active', 'pm1@tmthai.example', '박담당'),
    (pb1, 'partner_admin', po_vn, 'active', 'pb1@vndmc.example', '응우옌');
  raise notice 'fixture partner orgs % %', po_th, po_vn;
end $$;

-- 1) 접수 → 자동 배정 (방콕 → TH-BKK → TMTHAI), 다낭 → VNDMC, 미매핑 → hq_held
do $$
declare r1 rfps%rowtype; r2 rfps%rowtype; r3 rfps%rowtype;
begin
  insert into rfps(ref, state, contact_email, contact_phone, note, consent_at, headcount_band, region, company, contact_name, event_type, start_date, end_date, twin_rooms, king_rooms)
    values ('MG-TEST-PT1','received','org1@example.com','010-1111-2222','메모', now(), '50–99명', '태국 방콕', '한빛투어', '김지은', '인센티브', current_date + 60, current_date + 63, 40, 10) returning * into r1;
  insert into rfps(ref, state, contact_email, contact_phone, note, consent_at, headcount_band, region) values ('MG-TEST-PT2','received','org2@example.com','010-3333-4444','메모', now(), '50–99명', '베트남 다낭') returning * into r2;
  insert into rfps(ref, state, contact_email, contact_phone, note, consent_at, headcount_band, region) values ('MG-TEST-PT3','received','org3@example.com','010-5555-6666','메모', now(), '50–99명', '화성') returning * into r3;
  select * into r1 from rfps where ref = 'MG-TEST-PT1'; select * into r2 from rfps where ref = 'MG-TEST-PT2'; select * into r3 from rfps where ref = 'MG-TEST-PT3';
  if r1.region_code <> 'TH-BKK' or r1.delegation <> 'delegated' or r1.partner_org_id <> (select id from partner_org where code = 'TMTHAI') then raise exception 'PT1 auto-assign failed: % % %', r1.region_code, r1.delegation, r1.partner_org_id; end if;
  if r2.region_code <> 'VN-DAD' or r2.partner_org_id <> (select id from partner_org where code = 'VNDMC') then raise exception 'PT2 auto-assign failed'; end if;
  if r3.delegation <> 'hq_held' or r3.hold_reason <> 'region_unmapped' then raise exception 'PT3 should be hq_held/region_unmapped, got % %', r3.delegation, r3.hold_reason; end if;
  if (select count(*) from rfp_assignment_event where rfp_id = r1.id and action = 'auto_assign') <> 1 then raise exception 'assignment event missing'; end if;
  raise notice 'PASS auto-assign';
end $$;

-- 2) 파트너 RLS: TMTHAI 관리자는 PT1 만 보고, 회원·타지역 RFP는 못 봄
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa1@tmthai.example';
set role authenticated;
do $$
declare n int; j jsonb;
begin
  select count(*) into n from rfps where ref like 'MG-TEST-PT%'; if n <> 1 then raise exception 'partner should see 1 rfp, saw %', n; end if;
  select count(*) into n from members; if n <> 0 then raise exception 'partner should see 0 members, saw %', n; end if;
  select count(*) into n from partner_org; if n <> 1 then raise exception 'partner should see own org only, saw %', n; end if;
  if not public.is_partner() or public.is_operator() then raise exception 'role helpers wrong'; end if;
  j := admin_snapshot();
  if jsonb_array_length(j->'rfps') <> 1 or jsonb_array_length(j->'members') <> 0 then raise exception 'snapshot not scoped: rfps=% members=%', jsonb_array_length(j->'rfps'), jsonb_array_length(j->'members'); end if;
  if (j->'rfps'->0->'organizer'->>'masked') <> 'true' then raise exception 'organizer should be masked in snapshot'; end if;
  -- 신원 열람은 RPC 로, 로그가 남는다
  j := rfp_get_identity('MG-TEST-PT1');
  if j->>'company' <> '한빛투어' or j->>'phone' not like '010-****-%' then raise exception 'identity rpc wrong: %', j; end if;
  j := rfp_get_identity('MG-TEST-PT1', 'reveal_phone');
  if j->>'phone' <> '010-1111-2222' then raise exception 'reveal_phone failed'; end if;
  -- 타 지역 RFP 는 not found
  begin perform admin_rfp('MG-TEST-PT2'); raise exception 'should not read other region rfp'; exception when others then if sqlerrm not like 'MG:TOKEN_INVALID%' then raise; end if; end;
  -- 파트너가 상태 전이 (received → verifying)
  j := admin_transition('MG-TEST-PT1', 'verifying');
  if j->>'state' <> 'verifying' then raise exception 'partner transition failed'; end if;
  raise notice 'PASS partner scope + transition + identity log';
end $$;
reset role; reset request.jwt.claims;

do $$ declare n int; begin
  select count(*) into n from identity_view_log l join rfps r on r.id = l.rfp_id where r.ref = 'MG-TEST-PT1';
  if n <> 2 then raise exception 'identity_view_log should have 2 rows (detail + reveal_phone), has %', n; end if;
  if (select actor_label from rfp_history h join rfps r on r.id = h.rfp_id where r.ref = 'MG-TEST-PT1' and h.to_state = 'verifying') not like '파트너 · 티엠타이%' then raise exception 'history label should show partner'; end if;
end $$;

-- 3) 담당자(member)는 취소 불가, 관리자는 반려 가능 → hq_held
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pm1@tmthai.example';
set role authenticated;
do $$ begin
  begin perform admin_transition('MG-TEST-PT1', 'cancelled', '기타', '테스트'); raise exception 'member must not cancel'; exception when others then if sqlerrm not like 'MG:FORBIDDEN%' then raise; end if; end;
  raise notice 'PASS member cannot cancel';
end $$;
reset role; reset request.jwt.claims;

-- 4) 운영자: 호텔 등록(파트너가) → 파트너 승인 → 초대 → 대리 입력 → 호텔 확인 → 전달
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa1@tmthai.example';
set role authenticated;
do $$
declare j jsonb; hcode text; inv_id uuid; qid uuid;
begin
  j := partner_hotel_register(jsonb_build_object('name', 'Riverside Bangkok', 'regionCode', 'TH-BKK', 'contactEmail', 'sales@riversidebkk.example', 'domain', 'riversidebkk.example', 'contactName', 'Somchai', 'cap', 300, 'banquet', true));
  hcode := j->>'id';
  if j->>'sourcedBy' <> 'TMTHAI' or j->>'status' <> 'pending' then raise exception 'hotel register wrong: %', j; end if;
  if jsonb_array_length(j->'riskFlags') <> 0 then raise exception 'unexpected risk flags %', j->'riskFlags'; end if;
  -- 위험 플래그 호텔(무료메일)은 파트너 승인 불가
  j := partner_hotel_register(jsonb_build_object('name', 'Fake Hotel', 'regionCode', 'TH-BKK', 'contactEmail', 'fake@gmail.com', 'contactName', 'X'));
  if not (j->'riskFlags' ? 'free_mail') then raise exception 'free_mail flag expected'; end if;
  perform admin_partner_update(j->>'id', '{"check":{"exists":true,"capOk":true,"contactOk":true}}'::jsonb);
  begin perform admin_partner_transition(j->>'id', 'approved'); raise exception 'risky hotel must not be partner-approved'; exception when others then if sqlerrm not like 'MG:HOTEL_RISK_HQ_ONLY%' then raise; end if; end;
  -- 정상 호텔 승인 (지역 내)
  perform admin_partner_update(hcode, '{"check":{"exists":true,"capOk":true,"contactOk":true}}'::jsonb);
  j := admin_partner_transition(hcode, 'approved');
  if j->>'status' <> 'approved' or j->>'approvedVia' <> 'partner' or (j->>'hqReviewedAt') is not null then raise exception 'partner approval wrong: %', j; end if;
  -- verifying → open → 초대 → bidding
  perform admin_rfp_update('MG-TEST-PT1', jsonb_build_object('anonReviewed', true, 'deadline', (now() + interval '5 days')::text));
  perform admin_transition('MG-TEST-PT1', 'open');
  j := admin_invite('MG-TEST-PT1', array[hcode]);
  if jsonb_array_length(j->'invitations') <> 1 then raise exception 'invite failed: %', j->'invitations'; end if;
  inv_id := (j->'invitations'->0->>'id')::uuid;
  perform admin_transition('MG-TEST-PT1', 'bidding');
  -- 대리 입력
  j := partner_quote_proxy_enter('MG-TEST-PT1', inv_id, jsonb_build_object('currency','THB','twinRate',4500,'kingRate',5200,'breakfast','included','tax','included','availability','all','ballroomFee',150000,'ballroomName','Grand Ballroom','validUntil', (current_date + 90)::text,'cancellation','30일 전 무료 취소'), 'LINE으로 세일즈 매니저 확인 09/27');
  if (j->'invitations'->0->>'status') <> 'proxy_entered' then raise exception 'proxy status wrong: %', j->'invitations'->0->>'status'; end if;
  if (j->'quotes'->0->>'comparable')::boolean then raise exception 'unconfirmed proxy quote must not be comparable'; end if;
  qid := (j->'quotes'->0->>'id')::uuid;
  -- 콘솔 세션은 금액을 못 바꾼다 (불변 트리거)
  begin update quotes set twin_rate = 1 where id = qid; raise exception 'quote must be immutable for console session'; exception when others then if sqlerrm not like 'MG:QUOTE_IMMUTABLE%' and sqlerrm not like '%permission denied%' then raise; end if; end;
  raise notice 'PASS hotel register/approve + invite + proxy enter';
end $$;
reset role; reset request.jwt.claims;
-- 알림 큐 확인은 RLS 밖(postgres)에서: 호텔 확인 메일(HTL_CONFIRM) + PTR_ASSIGNED → CONSOLE_NOTICE 대체 발송
do $$ begin
  if not exists (select 1 from notification_log l join invitations i on i.id = l.invitation_id join rfps r on r.id = i.rfp_id where r.ref = 'MG-TEST-PT1' and l.template_id = 'HTL_CONFIRM' and coalesce(l.vars->>'CONFIRM_TOKEN','') <> '') then raise exception 'HTL_CONFIRM not enqueued'; end if;
  if not exists (select 1 from notification_log where template_id = 'CONSOLE_NOTICE' and vars->>'SOURCE_TEMPLATE' = 'PTR_ASSIGNED' and coalesce(vars->>'NOTICE_TITLE','') <> '') then raise exception 'PTR_ASSIGNED not routed to CONSOLE_NOTICE'; end if;
  raise notice 'PASS notifications enqueued (HTL_CONFIRM, CONSOLE_NOTICE)';
end $$;

-- 호텔 확인 (service role 경로 = private 함수). 토큰은 알림 큐/이력 대신 직접 만들어 넣는다.
do $$
declare inv invitations%rowtype; raw text := 'test-confirm-token-abcdef'; j jsonb; n int;
begin
  select i.* into inv from invitations i join rfps rr on rr.id = i.rfp_id where rr.ref = 'MG-TEST-PT1';
  update invitations set confirm_token_sha256 = encode(digest(raw, 'sha256'), 'hex') where id = inv.id;
  -- collecting 으로 가면 미확인 대리 견적은 만료 → 전달 불가여야 함. 먼저 전달 가드 확인 (bidding 상태에서 collecting 전이)
  j := private.quote_confirm_lookup(raw);
  if j->>'status' <> 'pending' or (j->'quote'->>'twinRate')::numeric <> 4500 then raise exception 'confirm lookup wrong: %', j; end if;
  j := private.quote_confirm_apply(raw, 'confirm');
  select * into inv from invitations where id = inv.id;
  if inv.status <> 'submitted' or inv.confirm_token_used_at is null then raise exception 'confirm apply failed: %', inv.status; end if;
  begin perform private.quote_confirm_apply(raw, 'confirm'); raise exception 'token reuse must fail'; exception when others then if sqlerrm not like 'MG:TOKEN_USED%' then raise; end if; end;
  select count(*) into n from v_comparable_quote q where q.rfp_id = inv.rfp_id; if n <> 1 then raise exception 'confirmed quote should be comparable'; end if;
  -- 운영자: collecting → delivered (hotel_confirmed 를 제출로 인정) — HQ 미검토 파트너 승인 호텔이라도 게이트 없음
  perform set_config('request.jwt.claims', (select json_build_object('role','authenticated','sub', user_id::text)::text from console_user where email = 'ops@matchgo.example'), true);
  j := admin_transition('MG-TEST-PT1', 'collecting'); j := admin_transition('MG-TEST-PT1', 'delivered');
  if j->>'state' <> 'delivered' or (j->'quotes'->0->>'label') <> 'A' then raise exception 'delivered failed: % %', j->>'state', j->'quotes'->0->>'label'; end if;
  raise notice 'PASS hotel confirm + delivered without HQ gate';
end $$;

-- 5) 인계: 파트너는 읽기만, 쓰기는 MG:RFP_TAKEN_OVER
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@matchgo.example';
set role authenticated;
select rfp_takeover('MG-TEST-PT1', '파트너 요청으로 본사 처리', 50) -> 'rfp' ->> 'delegation' as after_takeover \gset
reset role; reset request.jwt.claims;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa1@tmthai.example';
set role authenticated;
do $$ declare j jsonb; begin
  j := admin_rfp('MG-TEST-PT1'); if j->>'delegation' <> 'taken_over' then raise exception 'partner should still read taken-over rfp'; end if;
  begin perform admin_add_note('MG-TEST-PT1', '메모'); exception when others then raise exception 'note should be allowed on taken_over (read scope): %', sqlerrm; end;
  begin perform admin_transition('MG-TEST-PT1', 'won'); raise exception 'partner must not write taken-over rfp'; exception when others then if sqlerrm not like 'MG:RFP_TAKEN_OVER%' then raise; end if; end;
  raise notice 'PASS takeover read-only';
end $$;
reset role; reset request.jwt.claims;

-- 6) 성사 → 정산 자동 생성 (인계 시 몫 50) → 파트너 커미션 입력 → HQ 승인(호텔 검토 필요) → 파트너 수금·송금 → HQ 완료
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@matchgo.example';
set role authenticated;
do $$
declare j jsonb; inv_id uuid; s settlements%rowtype;
begin
  j := admin_rfp('MG-TEST-PT1'); inv_id := (j->'invitations'->0->>'id')::uuid;
  perform admin_mark_selection('MG-TEST-PT1', inv_id, 'selected');
  j := admin_transition('MG-TEST-PT1', 'won');
  if j->>'state' <> 'won' then raise exception 'won failed'; end if;
  select * into s from settlements st join rfps r on r.id = st.rfp_id where r.ref = 'MG-TEST-PT1';
  if s.id is null or s.status <> 'pending_commission' or s.partner_share_pct <> 50 or not ('hotel_unreviewed' = any(s.flags)) then raise exception 'settlement create wrong: % % %', s.status, s.partner_share_pct, s.flags; end if;
  raise notice 'PASS settlement auto-create';
end $$;
reset role; reset request.jwt.claims;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa1@tmthai.example';
set role authenticated;
do $$ declare j jsonb; sref text; begin
  select st.ref into sref from settlements st join rfps r on r.id = st.rfp_id where r.ref = 'MG-TEST-PT1';
  j := settlement_action(sref, 'submit_commission', jsonb_build_object('contractAmount', 1000000, 'commissionBasis', 'rate', 'commissionRatePct', 10));
  if j->>'status' <> 'commission_submitted' or (j->>'commissionAmount')::numeric <> 100000 or (j->>'micegoShareAmount')::numeric <> 50000 then raise exception 'submit_commission wrong: %', j; end if;
  begin perform settlement_action(sref, 'approve_commission'); raise exception 'partner must not approve'; exception when others then if sqlerrm not like 'MG:FORBIDDEN%' then raise; end if; end;
  raise notice 'PASS partner submit commission';
end $$;
reset role; reset request.jwt.claims;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@matchgo.example';
set role authenticated;
do $$ declare j jsonb; sref text; hcode text; begin
  select st.ref into sref from settlements st join rfps r on r.id = st.rfp_id where r.ref = 'MG-TEST-PT1';
  begin perform settlement_action(sref, 'approve_commission'); raise exception 'approve must require hotel review'; exception when others then if sqlerrm not like 'MG:GUARD_HOTEL_REVIEW%' then raise; end if; end;
  j := settlement_get(sref); hcode := j->>'hotelCode';
  perform admin_partner_update(hcode, '{"hqReviewed":true}'::jsonb);
  if (select count(*) from intervention_alert where kind = 'hotel_unreviewed_won' and resolved_at is null) <> 0 then raise exception 'hotel review should resolve alert'; end if;
  j := settlement_action(sref, 'approve_commission');
  if j->>'status' <> 'commission_confirmed' then raise exception 'approve failed: %', j->>'status'; end if;
  raise notice 'PASS HQ approve after hotel review';
end $$;
reset role; reset request.jwt.claims;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa1@tmthai.example';
set role authenticated;
do $$ declare j jsonb; sref text; begin
  select st.ref into sref from settlements st join rfps r on r.id = st.rfp_id where r.ref = 'MG-TEST-PT1';
  j := settlement_action(sref, 'record_collection', jsonb_build_object('collectedAt', now()::text, 'collectedAmount', 100000));
  if j->>'status' <> 'collected' or (j->>'remitDue') is null then raise exception 'collection failed'; end if;
  j := settlement_action(sref, 'record_remittance', jsonb_build_object('remitCurrency','USD','fxRate',0.0275,'fxRateSource','은행 적용 환율','remittedAt', now()::text,'remitAmount',1375,'remitReference','TT-001'));
  if j->>'status' <> 'remitted' or (j->>'remitExpected')::numeric <> 1375 then raise exception 'remittance failed: %', j; end if;
  raise notice 'PASS partner collection + remittance';
end $$;
reset role; reset request.jwt.claims;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@matchgo.example';
set role authenticated;
do $$ declare j jsonb; sref text; begin
  select st.ref into sref from settlements st join rfps r on r.id = st.rfp_id where r.ref = 'MG-TEST-PT1';
  j := settlement_action(sref, 'confirm_receipt', '{}'::jsonb);
  if j->>'status' <> 'completed' then raise exception 'complete failed'; end if;
  if jsonb_array_length(j->'events') < 6 then raise exception 'settlement events missing'; end if;
  raise notice 'PASS settlement completed';
end $$;
reset role; reset request.jwt.claims;

-- 7) 재배정·보류·반려·개입 스윕
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@matchgo.example';
set role authenticated;
do $$ declare j jsonb; begin
  j := rfp_assign('MG-TEST-PT3', 'TMTHAI'); -- 지역 미매핑 → 지역 불일치
  raise exception 'assign without region must fail';
exception when others then if sqlerrm not like 'MG:REGION_MISMATCH%' then raise; end if; end $$;
do $$ declare j jsonb; begin
  j := rfp_set_region('MG-TEST-PT3', 'TH-HKT', '운영자 확인');
  if (j->'rfp'->>'delegation') <> 'delegated' or (j->'rfp'->'partner'->>'code') <> 'TMTHAI' then raise exception 'set_region+reassign failed: %', j->'rfp'->>'delegation'; end if;
  j := rfp_hold('MG-TEST-PT3', '본사 직접 처리');
  if (j->'rfp'->>'delegation') <> 'hq_held' then raise exception 'hold failed'; end if;
  j := rfp_assign('MG-TEST-PT3', 'TMTHAI', '재배정');
  if (j->'rfp'->>'delegation') <> 'delegated' then raise exception 'assign failed'; end if;
  raise notice 'PASS region/hold/assign';
end $$;
reset role; reset request.jwt.claims;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa1@tmthai.example';
set role authenticated;
do $$ declare j jsonb; begin
  j := rfp_decline_assignment('MG-TEST-PT3', '푸껫 담당 인력 없음');
  raise notice 'PASS partner decline';
end $$;
reset role; reset request.jwt.claims;
do $$ declare r rfps%rowtype; j jsonb; begin
  select * into r from rfps where ref = 'MG-TEST-PT3';
  if r.delegation <> 'hq_held' or r.hold_reason <> 'partner_declined' then raise exception 'decline result wrong'; end if;
  j := private.intervention_sweep();
  raise notice 'intervention sweep %', j;
end $$;

-- 8) 조직 정지 → 파트너 쓰기 차단(읽기 가능), 계정 비활성 → 즉시 차단
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@matchgo.example';
set role authenticated;
select partner_org_upsert(jsonb_build_object('id', (select id from partner_org where code='VNDMC'), 'status', 'suspended', 'suspendedReason', '계약 검토')) ->> 'status' as vn_status \gset
select console_user_action((select user_id from console_user where email = 'pm1@tmthai.example'), 'disable', '퇴사') ->> 'ok' as disabled \gset
reset role; reset request.jwt.claims;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pb1@vndmc.example';
set role authenticated;
do $$ declare n int; begin
  select count(*) into n from rfps where ref = 'MG-TEST-PT2'; if n <> 1 then raise exception 'suspended org should still read'; end if;
  begin perform admin_transition('MG-TEST-PT2', 'verifying'); raise exception 'suspended org must not write'; exception when others then if sqlerrm not like 'MG:PARTNER_SUSPENDED%' then raise; end if; end;
  raise notice 'PASS suspended org read-only';
end $$;
reset role; reset request.jwt.claims;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pm1@tmthai.example';
set role authenticated;
do $$ declare n int; begin
  select count(*) into n from rfps where ref like 'MG-TEST-PT%'; if n <> 0 then raise exception 'disabled user must see 0 rfps, saw %', n; end if;
  begin perform admin_snapshot(); raise exception 'disabled user must be forbidden'; exception when others then if sqlerrm not like 'MG:FORBIDDEN%' then raise; end if; end;
  raise notice 'PASS disabled user blocked immediately';
end $$;
reset role; reset request.jwt.claims;
