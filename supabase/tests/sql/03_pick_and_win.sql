-- 오거나이저 OTP 선택 확정(pick_and_win): HTL_SELECTED_CONNECT/HTL_NOT_SELECTED/ORG_WON 3건이 정확히 enqueue 되는지 확인
do $$
declare
  rid uuid; pid1 uuid; pid2 uuid; inv1 uuid; inv2 uuid; otp_id uuid := gen_random_uuid();
  res jsonb; n_notif int;
begin
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band, company, contact_name)
    values ('MG-TEST-010','delivered',1,'pick@example.com','010-0000-0010','메모', now(), '50–99명','테스트','피커')
    returning id into rid;
  insert into partners(code, state, name, contact_email, contact_phone) values ('PT-TEST-010','approved','픽테스트호텔A','a@example.com','010-1') returning id into pid1;
  insert into partners(code, state, name, contact_email, contact_phone) values ('PT-TEST-011','approved','픽테스트호텔B','b@example.com','010-2') returning id into pid2;
  insert into invitations(rfp_id, partner_id, round, status, token, submitted_at) values (rid, pid1, 1, 'submitted', 'tok-pick-1', now()) returning id into inv1;
  insert into invitations(rfp_id, partner_id, round, status, token, submitted_at) values (rid, pid2, 1, 'submitted', 'tok-pick-2', now()) returning id into inv2;
  insert into quotes(invitation_id, rfp_id, round, label, currency, twin_rate, king_rate, breakfast_included, tax_included, availability_all, valid_until, hotel_name, submitted_at)
    values (inv1, rid, 1, 'A', 'USD', 100, 150, true, true, true, current_date+30, '픽테스트호텔A', now());
  insert into quotes(invitation_id, rfp_id, round, label, currency, twin_rate, king_rate, breakfast_included, tax_included, availability_all, valid_until, hotel_name, submitted_at)
    values (inv2, rid, 1, 'B', 'USD', 90, 140, true, true, true, current_date+30, '픽테스트호텔B', now());

  res := private.pick_and_win(rid, 'A', otp_id, '010-****-0010');
  if (res->>'state') <> 'won' then raise exception 'pick_and_win did not return won'; end if;
  if (res#>>'{selected,label}') <> 'A' then raise exception 'pick_and_win selected label mismatch'; end if;

  if (select state from rfps where id = rid) <> 'won' then raise exception 'rfp not won after pick_and_win'; end if;
  if (select result from invitations where id = inv1) <> 'selected' then raise exception 'inv1 not selected'; end if;
  if (select result from invitations where id = inv2) <> 'not_selected' then raise exception 'inv2 not not_selected'; end if;

  select count(*) into n_notif from notification_log where rfp_id = rid and template_id in ('HTL_SELECTED_CONNECT','HTL_NOT_SELECTED','ORG_WON');
  if n_notif <> 3 then raise exception 'expected exactly 3 notifications enqueued, got %', n_notif; end if;

  if not exists (select 1 from notification_log where rfp_id = rid and template_id = 'HTL_SELECTED_CONNECT' and invitation_id = inv1) then
    raise exception 'HTL_SELECTED_CONNECT missing for selected invitation';
  end if;
  if not exists (select 1 from notification_log where rfp_id = rid and template_id = 'HTL_NOT_SELECTED' and invitation_id = inv2) then
    raise exception 'HTL_NOT_SELECTED missing for other invitation';
  end if;

  -- 재선택 시도는 STATE_CONFLICT (이미 won)
  begin
    perform private.pick_and_win(rid, 'A', gen_random_uuid(), '010-****-0010');
    raise exception 'expected STATE_CONFLICT on already-won not raised';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'MG:STATE_CONFLICT' then raise exception 'unexpected: %', sqlerrm; end if;
  end;

  raise notice 'PASS 03_pick_and_win';
end $$;
