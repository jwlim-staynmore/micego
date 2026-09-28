-- 상태 전이 허용/금지, 가드 코드, 전이 부수효과를 검증한다.
do $$
declare
  rid uuid; pid1 uuid; pid2 uuid; inv1 uuid; inv2 uuid; r rfps%rowtype;
  caught text;
  n int;
begin
  -- ---------- 픽스처 ----------
  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, headcount_band, region, note, consent_at, destination, headcount, anon_reviewed)
    values ('MG-TEST-001','received',1,'여행사','테스트여행사','홍길동','test@example.com','010-0000-0000','인센티브','50–99명','다낭','메모', now(), '다낭', 80, false)
    returning id into rid;

  insert into partners(code, state, name, contact_email, contact_phone) values ('PT-TEST-001','approved','테스트호텔1','hotel1@example.com','010-1111-1111') returning id into pid1;
  insert into partners(code, state, name, contact_email, contact_phone) values ('PT-TEST-002','approved','테스트호텔2','hotel2@example.com','010-2222-2222') returning id into pid2;

  -- STATE_CONFLICT: received 에서 'open' 은 허용되지 않음
  begin
    perform private.rfp_transition(rid, 'open', 'operator', null, null, null, null);
    raise exception 'expected STATE_CONFLICT not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:STATE_CONFLICT' then raise exception 'unexpected error: %', caught; end if;
  end;

  -- received -> verifying (허용, 부수효과: verifying_at, sla_due_at)
  r := private.rfp_transition(rid, 'verifying', 'operator', null, null, null, null);
  if r.state <> 'verifying' or r.verifying_at is null or r.sla_due_at is null then
    raise exception 'verifying transition side effects missing';
  end if;
  if not exists (select 1 from rfp_history where rfp_id = rid and to_state = 'verifying') then
    raise exception 'history row missing for verifying';
  end if;

  -- GUARD_ANON: anon_reviewed=false 인 채로 open 시도 (verifying -> open 허용 목록에는 있지만 가드가 막아야 함)
  begin
    perform private.rfp_transition(rid, 'open', 'operator', null, null, null, null);
    raise exception 'expected GUARD_ANON not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_ANON' then raise exception 'unexpected error: %', caught; end if;
  end;

  update rfps set anon_reviewed = true where id = rid;
  r := private.rfp_transition(rid, 'open', 'operator', null, null, null, null);
  if r.state <> 'open' then raise exception 'open transition failed'; end if;

  -- GUARD_BIDDING: 마감/초대 없이 bidding 시도
  begin
    perform private.rfp_transition(rid, 'bidding', 'operator', null, null, null, null);
    raise exception 'expected GUARD_BIDDING not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_BIDDING' then raise exception 'unexpected error: %', caught; end if;
  end;

  update rfps set deadline = now() + interval '3 days' where id = rid;
  insert into invitations(rfp_id, partner_id, round, status, token, deadline) values (rid, pid1, 1, 'invited', 'tok-test-1', now() + interval '3 days') returning id into inv1;
  insert into invitations(rfp_id, partner_id, round, status, token, deadline) values (rid, pid2, 1, 'invited', 'tok-test-2', now() + interval '3 days') returning id into inv2;

  r := private.rfp_transition(rid, 'bidding', 'operator', null, null, null, null);
  if r.state <> 'bidding' then raise exception 'bidding transition failed'; end if;

  -- collecting: 남은 invited/viewed 는 expired 로
  r := private.rfp_transition(rid, 'collecting', 'operator', null, null, null, null);
  if r.state <> 'collecting' then raise exception 'collecting transition failed'; end if;
  select count(*) into n from invitations where rfp_id = rid and status = 'expired';
  if n <> 2 then raise exception 'collecting side-effect expected 2 expired, got %', n; end if;

  -- GUARD_NO_QUOTE: 제출 없이 delivered 시도
  begin
    perform private.rfp_transition(rid, 'delivered', 'operator', null, null, null, null);
    raise exception 'expected GUARD_NO_QUOTE not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_NO_QUOTE' then raise exception 'unexpected error: %', caught; end if;
  end;

  -- GUARD_LOST_COLLECTING: round=1 이므로 lost 불가
  begin
    perform private.rfp_transition(rid, 'lost', 'operator', null, '두 차례 요청에도 제안 없음', null, null);
    raise exception 'expected GUARD_LOST_COLLECTING not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_LOST_COLLECTING' then raise exception 'unexpected error: %', caught; end if;
  end;

  -- 제출 준비: 초대 재개(invited) 후 제출 처리
  update invitations set status = 'submitted', submitted_at = now() where id = inv1;
  insert into quotes(invitation_id, rfp_id, round, currency, twin_rate, king_rate, breakfast_included, tax_included, availability_all, valid_until, hotel_name, submitted_at)
    values (inv1, rid, 1, 'USD', 100, 150, true, true, true, current_date + 30, '테스트호텔1', now());

  r := private.rfp_transition(rid, 'delivered', 'operator', null, null, null, null);
  if r.state <> 'delivered' or r.delivered_at is null then raise exception 'delivered transition failed'; end if;
  if not exists (select 1 from quotes where invitation_id = inv1 and label = 'A') then
    raise exception 'delivered did not assign label A';
  end if;

  -- GUARD_SELECT_ONE: 아무도 선택 표시 안 된 상태로 won 시도
  begin
    perform private.rfp_transition(rid, 'won', 'operator', null, null, null, null);
    raise exception 'expected GUARD_SELECT_ONE not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_SELECT_ONE' then raise exception 'unexpected error: %', caught; end if;
  end;

  update invitations set result = 'selected' where id = inv1;
  r := private.rfp_transition(rid, 'won', 'operator', null, null, null, null);
  if r.state <> 'won' then raise exception 'won transition failed'; end if;
  if not exists (select 1 from selections where rfp_id = rid) then raise exception 'selection row missing'; end if;
  if not (select operator_override from selections where rfp_id = rid) then raise exception 'operator_override should be true'; end if;

  -- 이후 어떤 전이도 불가 (terminal)
  begin
    perform private.rfp_transition(rid, 'lost', 'operator', null, '기타', '메모', null);
    raise exception 'expected STATE_CONFLICT on terminal not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:STATE_CONFLICT' then raise exception 'unexpected error: %', caught; end if;
  end;

  -- GUARD_REASON: 사유 없이 cancelled 시도 (다른 RFP 로)
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band)
    values ('MG-TEST-002','received',1,'test2@example.com','010-0000-0002','메모', now(), '50–99명') returning id into rid;
  begin
    perform private.rfp_transition(rid, 'cancelled', 'operator', null, null, null, null);
    raise exception 'expected GUARD_REASON(1) not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_REASON' then raise exception 'unexpected error: %', caught; end if;
  end;
  -- 기타 사유인데 메모 없음
  begin
    perform private.rfp_transition(rid, 'cancelled', 'operator', null, '기타', null, null);
    raise exception 'expected GUARD_REASON(기타) not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_REASON' then raise exception 'unexpected error: %', caught; end if;
  end;
  r := private.rfp_transition(rid, 'cancelled', 'operator', null, '오거나이저 요청', null, null);
  if r.state <> 'cancelled' then raise exception 'cancelled transition failed'; end if;

  -- rfp_history.from_state 는 전이 "전" 상태를 기록해야 한다 (전이 후 r 이 재대입되어도 흔들리면 안 됨)
  -- MG-TEST-002 는 'received' 상태에서 곧바로 cancelled 로 전이했다.
  if not exists (select 1 from rfp_history where rfp_id = rid and from_state = 'received' and to_state = 'cancelled') then
    raise exception 'from_state should be the pre-transition state (received), not the post-transition one';
  end if;
  if exists (select 1 from rfp_history where rfp_id = rid and from_state = to_state) then
    raise exception 'from_state must never equal to_state';
  end if;

  -- 회원 탈퇴 자동취소: reason='회원 탈퇴' 이면 ORG_CANCELLED 를 보내지 않는다 (SPEC_LAUNCH.md §3 withdraw)
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band)
    values ('MG-TEST-003','received',1,'test3@example.com','010-0000-0003','메모', now(), '50–99명') returning id into rid;
  r := private.rfp_transition(rid, 'cancelled', 'system', null, '회원 탈퇴', null, null);
  if r.state <> 'cancelled' then raise exception 'withdraw auto-cancel failed'; end if;
  if exists (select 1 from notification_log where template_id = 'ORG_CANCELLED' and rfp_id = rid) then
    raise exception 'ORG_CANCELLED must not be enqueued for withdraw auto-cancel';
  end if;

  -- 일반 취소는 여전히 ORG_CANCELLED 를 보낸다 (회귀 확인)
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band)
    values ('MG-TEST-004','received',1,'test4@example.com','010-0000-0004','메모', now(), '50–99명') returning id into rid;
  r := private.rfp_transition(rid, 'cancelled', 'operator', null, '오거나이저 요청', null, null);
  if not exists (select 1 from notification_log where template_id = 'ORG_CANCELLED' and rfp_id = rid) then
    raise exception 'ORG_CANCELLED should still be enqueued for an ordinary cancel';
  end if;

  -- system_tick: HTL_REMINDER 는 partner.contact_phone 컬럼도 문제 없이 읽어야 한다 (회귀: FOR 루프 레코드에 컬럼 누락 버그)
  declare
    rid5 uuid; pid5 uuid; inv5 uuid;
  begin
    insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band, deadline, anon_reviewed)
      values ('MG-TEST-005','bidding',1,'test5@example.com','010-0000-0005','메모', now(), '50–99명', now() + interval '1 hour', true)
      returning id into rid5;
    insert into partners(code, state, name, contact_email, contact_phone) values ('PT-TEST-005','approved','테스트호텔5','hotel5@example.com','010-5555-5555') returning id into pid5;
    insert into invitations(rfp_id, partner_id, round, status, token, deadline) values (rid5, pid5, 1, 'invited', 'tok-test-005', now() + interval '1 hour') returning id into inv5;
    perform private.system_tick();
    if not exists (select 1 from notification_log where template_id = 'HTL_REMINDER' and invitation_id = inv5) then
      raise exception 'HTL_REMINDER should have been enqueued by system_tick';
    end if;
    if not exists (select 1 from notification_log where template_id = 'HTL_REMINDER' and invitation_id = inv5 and to_phone = '010-5555-5555') then
      raise exception 'HTL_REMINDER should carry to_phone from the partner row';
    end if;
  end;

  raise notice 'PASS 02_transitions';
end $$;
