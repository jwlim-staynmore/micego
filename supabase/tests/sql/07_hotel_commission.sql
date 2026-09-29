-- 호텔 커미션(0017): 요율 누락·범위·토큰 저장·합의 전 초대 제외·동의 링크·스냅샷·정산 프리필·이력 불변·권한  - 클로드
-- 운영자 opc / 파트너 관리자 pac(CMORG) / 파트너 담당자 pmc(CMORG) / 타 조직 관리자 pxc(CMOTH). 호텔은 CMORG 가 발굴한 것으로 직접 삽입한다.
do $$
declare opc uuid := gen_random_uuid(); pac uuid := gen_random_uuid(); pmc uuid := gen_random_uuid(); pxc uuid := gen_random_uuid(); po uuid; px uuid; i int;
begin
  insert into auth.users(id, email) values (opc, 'ops@cm.example'), (pac, 'pa@cm.example'), (pmc, 'pm@cm.example'), (pxc, 'px@cm.example');
  insert into console_user (user_id, role, status, email, display_name) values (opc, 'operator', 'active', 'ops@cm.example', '커미션 운영자');
  insert into partner_org (code, legal_name, display_name, public_name, country_code, status, dpa_signed_at) values ('CMORG', 'CM Org', '커미션조직', 'MICEGO CM', 'TH', 'active', now()) returning id into po;
  insert into partner_org (code, legal_name, display_name, public_name, country_code, status, dpa_signed_at) values ('CMOTH', 'CM Other', '타조직', 'MICEGO Other', 'VN', 'active', now()) returning id into px;
  insert into console_user (user_id, role, partner_id, status, email, display_name) values
    (pac, 'partner_admin', po, 'active', 'pa@cm.example', '커미션관리자'), (pmc, 'partner_member', po, 'active', 'pm@cm.example', '커미션담당'), (pxc, 'partner_admin', px, 'active', 'px@cm.example', '타조직관리자');
  for i in 1..5 loop
    insert into partners (code, state, name, location, dest, contact_name, contact_email, check_, region_code, sourced_by_partner)
    values ('PT-CM-00' || i, 'reviewing', 'CM Hotel ' || i, '태국 · 방콕', '방콕', 'CM ' || i, 'sales' || i || '@cmhotel' || i || '.example', '{"exists":true,"capOk":true,"contactOk":true}', 'TH-BKK', po);
  end loop;
  insert into rfps (ref, state, contact_email, contact_phone, note, consent_at, headcount_band, region, anon_reviewed, deadline)
  values ('MG-TEST-CM1', 'open', 'cm1@example.com', '010-1111-3333', '메모', now(), '50–99명', '화성', true, now() + interval '5 days');
end $$;

-- 1) 요율 누락 / 2) 범위 (파트너 관리자)
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa@cm.example';
set role authenticated;
do $$
declare j jsonb;
begin
  begin perform admin_partner_transition('PT-CM-001', 'approved'); raise exception 'approve without rate must fail'; exception when others then if sqlerrm not like 'MG:COMMISSION_RATE_REQUIRED%' then raise; end if; end;
  -- 범위 밖(파트너): 20 초과 · 5 미만은 본사만
  begin perform admin_partner_transition('PT-CM-001', 'approved', null, null, null, 25); raise exception 'partner out of range must fail'; exception when others then if sqlerrm not like 'MG:COMMISSION_OUT_OF_RANGE%' then raise; end if; end;
  begin perform admin_partner_transition('PT-CM-001', 'approved', null, null, null, 3); raise exception 'partner below range must fail'; exception when others then if sqlerrm not like 'MG:COMMISSION_OUT_OF_RANGE%' then raise; end if; end;
  -- 50 초과·0 이하는 누구도 불가
  begin perform admin_partner_transition('PT-CM-001', 'approved', null, null, null, 60); raise exception '>50 must fail'; exception when others then if sqlerrm not like 'MG:VALIDATION%' then raise; end if; end;
  begin perform admin_partner_transition('PT-CM-001', 'approved', null, null, null, 0); raise exception '0 must fail'; exception when others then if sqlerrm not like 'MG:VALIDATION%' then raise; end if; end;
  if (select state from partners where code = 'PT-CM-001') <> 'reviewing' then raise exception 'failed approvals must not change state'; end if;
  -- 정상: 범위 안(경계 5·20 포함)
  j := admin_partner_transition('PT-CM-001', 'approved', null, null, null, 10);
  if j->>'status' <> 'approved' or (j->'commission'->>'pendingRatePct')::numeric <> 10 or (j->'commission'->>'status') <> 'pending' then raise exception 'approve with rate wrong: %', j->'commission'; end if;
  j := admin_partner_transition('PT-CM-002', 'approved', null, null, null, 20);
  j := admin_partner_transition('PT-CM-003', 'approved', null, null, null, 5);
  raise notice 'PASS rate required + range (partner)';
end $$;
reset role; reset request.jwt.claims;

-- 운영자: 범위 밖은 사유 필수, 사유가 있으면 본사 예외(hq_override)
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@cm.example';
set role authenticated;
do $$
declare j jsonb;
begin
  begin perform admin_partner_transition('PT-CM-004', 'approved', null, null, null, 25); raise exception 'hq out of range without reason must fail'; exception when others then if sqlerrm not like 'MG:GUARD_REASON%' then raise; end if; end;
  j := admin_partner_transition('PT-CM-004', 'approved', null, null, null, 25, '전략 제휴 호텔 — 대표 승인');
  if (j->'commission'->>'pendingReason') <> '전략 제휴 호텔 — 대표 승인' then raise exception 'reason not kept: %', j->'commission'; end if;
  if not (j->'commission'->'history'->0->>'hqOverride')::boolean then raise exception 'hq_override expected in history: %', j->'commission'->'history'; end if;
  raise notice 'PASS operator out-of-range needs reason (hq_override)';
end $$;
reset role; reset request.jwt.claims;

-- 3) 토큰 저장: DB 에는 해시만, 원문은 알림 변수로만
do $$
declare p partners%rowtype; raw text;
begin
  select * into p from partners where code = 'PT-CM-001';
  select l.vars->>'COMMISSION_TOKEN' into raw from notification_log l where l.partner_id = p.id and l.template_id = 'PTN_APPROVED';
  if coalesce(raw,'') = '' or length(raw) < 24 then raise exception 'raw token must be in notification vars'; end if;
  if p.commission_token_sha256 <> encode(digest(raw, 'sha256'), 'hex') then raise exception 'stored hash mismatch'; end if;
  if p.commission_token_sha256 = raw or p.commission_token_used_at is not null or p.commission_token_send_count <> 1 then raise exception 'token columns wrong'; end if;
  if p.commission_token_expires_at < now() + interval '167 hours' or p.commission_token_expires_at > now() + interval '169 hours' then raise exception 'expiry should be ~168h: %', p.commission_token_expires_at; end if;
  if p.commission_rate_pct is not null or p.commission_accepted_at is not null then raise exception 'rate must stay null until accepted'; end if;
  if not exists (select 1 from partner_commission_event where partner_id = p.id and action = 'proposed' and rate_pct = 10 and actor_role = 'partner_admin') then raise exception 'proposed event missing'; end if;
  raise notice 'PASS token stored as hash only';
end $$;

-- 4) 합의 전 초대 제외 (운영자)
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@cm.example';
set role authenticated;
do $$
begin
  -- 아직 아무도 동의하지 않았으므로 전부 막힘
  begin perform admin_invite('MG-TEST-CM1', array['PT-CM-001','PT-CM-002']); raise exception 'invite before agreement must fail'; exception when others then if sqlerrm not like 'MG:COMMISSION_NOT_AGREED%' then raise; end if; end;
  if exists (select 1 from invitations i join rfps r on r.id = i.rfp_id where r.ref = 'MG-TEST-CM1') then raise exception 'no invitation may exist'; end if;
end $$;
reset role; reset request.jwt.claims;
-- PT-CM-002 만 동의
do $$
declare raw text; j jsonb;
begin
  select l.vars->>'COMMISSION_TOKEN' into raw from notification_log l join partners p on p.id = l.partner_id where p.code = 'PT-CM-002' and l.template_id = 'PTN_APPROVED';
  -- 5) lookup 은 소비하지 않는다 (두 번 열어도 pending)
  j := private.partner_commission_lookup(raw);
  if j->>'status' <> 'pending' or (j->>'ratePct')::numeric <> 20 or j->>'hotel' <> 'CM Hotel 2' or j->>'basis' <> 'rooms_fnb_net' then raise exception 'lookup wrong: %', j; end if;
  j := private.partner_commission_lookup(raw);
  if j->>'status' <> 'pending' or (select commission_token_used_at from partners where code = 'PT-CM-002') is not null then raise exception 'lookup must not consume token'; end if;
  if private.partner_commission_lookup('no-such-token-0123456789abcdef') is not null then raise exception 'unknown token lookup must be null'; end if;
  j := private.partner_commission_apply(raw, 'iphash-1');
  if (j->>'ok') <> 'true' then raise exception 'apply failed: %', j; end if;
  if (select commission_rate_pct from partners where code = 'PT-CM-002') <> 20 or (select commission_accept_ip_hash from partners where code = 'PT-CM-002') <> 'iphash-1'
     or (select commission_terms_version from partners where code = 'PT-CM-002') <> 'PT-2026-10' or (select commission_pending_rate_pct from partners where code = 'PT-CM-002') is not null then raise exception 'accepted columns wrong'; end if;
  if private.partner_commission_lookup(raw)->>'status' <> 'used' then raise exception 'lookup after use must be used'; end if;
  begin perform private.partner_commission_apply(raw, 'iphash-1'); raise exception 'reuse must fail'; exception when others then if sqlerrm not like 'MG:TOKEN_USED%' then raise; end if; end;
  begin perform private.partner_commission_apply('no-such-token-0123456789abcdef', null); raise exception 'unknown must fail'; exception when others then if sqlerrm not like 'MG:TOKEN_INVALID%' then raise; end if; end;
  -- 만료: PT-CM-003 토큰을 과거로
  select l.vars->>'COMMISSION_TOKEN' into raw from notification_log l join partners p on p.id = l.partner_id where p.code = 'PT-CM-003' and l.template_id = 'PTN_APPROVED';
  update partners set commission_token_expires_at = now() - interval '1 hour' where code = 'PT-CM-003';
  if private.partner_commission_lookup(raw)->>'status' <> 'expired' then raise exception 'expired lookup wrong'; end if;
  begin perform private.partner_commission_apply(raw, null); raise exception 'expired must fail'; exception when others then if sqlerrm not like 'MG:TOKEN_EXPIRED%' then raise; end if; end;
  if (select commission_accepted_at from partners where code = 'PT-CM-003') is not null then raise exception 'expired apply must not accept'; end if;
  raise notice 'PASS lookup non-consuming / used / expired / invalid';
end $$;

-- 4') 동의한 호텔만 초대되고 나머지는 이력 메모에 남는다 + 스냅샷 복사
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@cm.example';
set role authenticated;
do $$
declare j jsonb; memo text;
begin
  j := admin_invite('MG-TEST-CM1', array['PT-CM-001','PT-CM-002']);
  if jsonb_array_length(j->'invitations') <> 1 or (j->'invitations'->0->>'hotelId') <> 'PT-CM-002' then raise exception 'only agreed hotel must be invited: %', j->'invitations'; end if;
  select h.memo into memo from rfp_history h join rfps r on r.id = h.rfp_id where r.ref = 'MG-TEST-CM1' and h.memo like '호텔%초대%' order by h.id desc limit 1;
  if memo not like '%요율 합의 전 제외: CM Hotel 1%' then raise exception 'history memo missing exclusion: %', memo; end if;
  raise notice 'PASS unagreed hotels excluded from invite';
end $$;
reset role; reset request.jwt.claims;
do $$
declare i invitations%rowtype;
begin
  select iv.* into i from invitations iv join partners p on p.id = iv.partner_id where p.code = 'PT-CM-002';
  if i.commission_rate_pct <> 20 or i.commission_basis_scope <> 'rooms_fnb_net' or i.commission_terms_version <> 'PT-2026-10' then raise exception 'invitation snapshot wrong'; end if;
end $$;

-- 6) 스냅샷 불변: 요율 변경은 재동의 후 새 초대부터 (운영자가 요율 변경 제안 → 호텔 동의 → 재초대)
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@cm.example';
set role authenticated;
do $$
declare j jsonb; inv_id uuid;
begin
  j := admin_partner_update('PT-CM-002', '{"commissionRatePct": 12}'::jsonb);
  if (j->'commission'->>'ratePct')::numeric <> 20 or (j->'commission'->>'pendingRatePct')::numeric <> 12 then raise exception 'update must keep agreed rate until accepted: %', j->'commission'; end if;
  if not exists (select 1 from notification_log l join partners p on p.id = l.partner_id where p.code = 'PT-CM-002' and l.template_id = 'PTN_COMMISSION_TERMS' and coalesce(l.vars->>'COMMISSION_TOKEN','') <> '') then raise exception 'PTN_COMMISSION_TERMS not enqueued'; end if;
end $$;
reset role; reset request.jwt.claims;
do $$
declare raw text;
begin
  select l.vars->>'COMMISSION_TOKEN' into raw from notification_log l join partners p on p.id = l.partner_id where p.code = 'PT-CM-002' and l.template_id = 'PTN_COMMISSION_TERMS';
  perform private.partner_commission_apply(raw, 'iphash-2');
  if (select commission_rate_pct from partners where code = 'PT-CM-002') <> 12 then raise exception 'rate should be 12 after re-accept'; end if;
  if (select iv.commission_rate_pct from invitations iv join partners p on p.id = iv.partner_id where p.code = 'PT-CM-002') <> 20 then raise exception 'existing invitation snapshot must not change'; end if;
end $$;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@cm.example';
set role authenticated;
do $$
declare j jsonb; inv_id uuid;
begin
  select iv.id into inv_id from invitations iv join partners p on p.id = iv.partner_id where p.code = 'PT-CM-002';
  perform admin_reinvite('MG-TEST-CM1', inv_id);
  if (select commission_rate_pct from invitations where id = inv_id) <> 20 then raise exception 'old invitation must keep 20'; end if;
  if (select iv.commission_rate_pct from invitations iv join partners p on p.id = iv.partner_id where p.code = 'PT-CM-002' and iv.status <> 'reinvited') <> 12 then raise exception 'new invitation must snapshot 12'; end if;
  raise notice 'PASS snapshot immutable, change applies to new invitations only';
end $$;
reset role; reset request.jwt.claims;

-- 7) 정산: 선정된 초대의 스냅샷 복사 → 프리필 · 편차는 사유 필수
-- 데모 시드의 성사 건(Chao Phraya, 10% 백필)에서 정산을 만든다.
do $$
declare rid uuid; sid uuid; s settlements%rowtype;
begin
  select id into rid from rfps where state = 'won' and ref not like 'MG-TEST%' order by created_at limit 1;
  if rid is null then raise exception 'demo won rfp missing'; end if;
  sid := private.settlement_create(rid);
  select * into s from settlements where id = sid;
  if s.agreed_rate_pct <> 10 or s.commission_basis_scope <> 'rooms_fnb_net' or s.commission_terms_version <> 'DEMO' then raise exception 'settlement snapshot wrong: % % %', s.agreed_rate_pct, s.commission_basis_scope, s.commission_terms_version; end if;
  if 'no_agreed_rate' = any(s.flags) then raise exception 'unexpected no_agreed_rate flag'; end if;
end $$;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@cm.example';
set role authenticated;
do $$
declare j jsonb; sref text;
begin
  select st.ref into sref from settlements st join rfps r on r.id = st.rfp_id where r.state = 'won' and r.ref not like 'MG-TEST%' order by st.created_at limit 1;
  if (settlement_get(sref)->>'agreedRatePct')::numeric <> 10 then raise exception 'json agreedRatePct missing'; end if;
  -- 요율·기준 생략 → 합의 요율로 프리필, 편차 없음
  j := settlement_action(sref, 'submit_commission', jsonb_build_object('contractAmount', 1000000));
  if j->>'status' <> 'commission_submitted' or (j->>'commissionRatePct')::numeric <> 10 or (j->>'commissionAmount')::numeric <> 100000 or (j->'flags') ? 'rate_deviation' then raise exception 'prefill wrong: %', j; end if;
  perform settlement_action(sref, 'reject_commission', '{}'::jsonb, '금액 재확인');
  -- 합의 요율과 다르면 사유 필수
  begin perform settlement_action(sref, 'submit_commission', jsonb_build_object('contractAmount', 1000000, 'commissionBasis', 'rate', 'commissionRatePct', 12)); raise exception 'deviation without note must fail'; exception when others then if sqlerrm not like 'MG:GUARD_NOTE%' then raise; end if; end;
  j := settlement_action(sref, 'submit_commission', jsonb_build_object('contractAmount', 1000000, 'commissionBasis', 'rate', 'commissionRatePct', 12), '호텔과 별도 합의(메일 첨부)');
  if not ((j->'flags') ? 'rate_deviation') or (j->>'commissionAmount')::numeric <> 120000 then raise exception 'deviation flag wrong: %', j; end if;
  raise notice 'PASS settlement prefill + deviation';
end $$;
reset role; reset request.jwt.claims;

-- 8) 이력 불변 + RLS
do $$
declare n int;
begin
  begin update partner_commission_event set rate_pct = 1 where id = (select min(id) from partner_commission_event); raise exception 'event update must fail'; exception when others then if sqlerrm like 'event update must fail%' then raise; end if; end;
  begin delete from partner_commission_event where id = (select min(id) from partner_commission_event); raise exception 'event delete must fail'; exception when others then if sqlerrm like 'event delete must fail%' then raise; end if; end;
  select count(*) into n from partner_commission_event e join partners p on p.id = e.partner_id where p.code = 'PT-CM-002';
  if n <> 4 then raise exception 'PT-CM-002 should have proposed/accepted x2 = 4 events, has %', n; end if;
  if (select string_agg(e.action, ',' order by e.id) from partner_commission_event e join partners p on p.id = e.partner_id where p.code = 'PT-CM-002') <> 'proposed,accepted,proposed,accepted' then raise exception 'event order wrong'; end if;
  raise notice 'PASS events append-only';
end $$;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa@cm.example';
set role authenticated;
do $$
declare n int;
begin
  begin select count(*) into n from partner_commission_event; if n <> 0 then raise exception 'console must not read events directly, saw %', n; end if;
  exception when insufficient_privilege then null; end;
end $$;
reset role; reset request.jwt.claims;

-- 9) 권한: 담당자 불가, 타 조직 NOT_FOUND, 재발송 조건·횟수
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pm@cm.example';
set role authenticated;
do $$
begin
  begin perform admin_partner_update('PT-CM-002', '{"commissionRatePct": 15}'::jsonb); raise exception 'member must not propose'; exception when others then if sqlerrm not like 'MG:FORBIDDEN%' then raise; end if; end;
  begin perform partner_commission_resend('PT-CM-001'); raise exception 'member must not resend'; exception when others then if sqlerrm not like 'MG:FORBIDDEN%' then raise; end if; end;
  raise notice 'PASS member forbidden';
end $$;
reset role; reset request.jwt.claims;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'px@cm.example';
set role authenticated;
do $$
begin
  begin perform admin_partner_update('PT-CM-002', '{"commissionRatePct": 15}'::jsonb); raise exception 'other org must not propose'; exception when others then if sqlerrm not like 'MG:NOT_FOUND%' then raise; end if; end;
  begin perform partner_commission_resend('PT-CM-001'); raise exception 'other org must not resend'; exception when others then if sqlerrm not like 'MG:NOT_FOUND%' then raise; end if; end;
end $$;
reset role; reset request.jwt.claims;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa@cm.example';
set role authenticated;
do $$
declare j jsonb; old_hash text;
begin
  -- 대기 중인 제안이 없으면(PT-CM-002 는 동의 완료) 재발송 불가
  begin perform partner_commission_resend('PT-CM-002'); raise exception 'resend without pending must fail'; exception when others then if sqlerrm not like 'MG:STATE_CONFLICT%' then raise; end if; end;
  -- 대기 중(PT-CM-001)이면 새 토큰 발급, 이전 링크는 무효
  select commission_token_sha256 into old_hash from partners where code = 'PT-CM-001';
  j := partner_commission_resend('PT-CM-001');
  if (j->'commission'->>'sendCount')::int <> 2 or (select commission_token_sha256 from partners where code = 'PT-CM-001') = old_hash then raise exception 'resend must rotate token: %', j->'commission'; end if;
end $$;
reset role; reset request.jwt.claims;
update partners set commission_token_send_count = 5 where code = 'PT-CM-001';
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa@cm.example';
set role authenticated;
do $$
begin
  -- 최대 5회
  begin perform partner_commission_resend('PT-CM-001'); raise exception 'resend cap must fail'; exception when others then if sqlerrm not like 'MG:RATE_LIMITED%' then raise; end if; end;
  raise notice 'PASS permissions + resend rules';
end $$;
reset role; reset request.jwt.claims;
