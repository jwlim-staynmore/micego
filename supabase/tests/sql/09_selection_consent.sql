-- 0019: 콘솔 대리 확정(성사로 닫기)에는 동의 확인 기록이 필수  - 클로드
-- 픽스처(RLS 밖): 본사 보유 건 1, 태국 위임 건 2(담당자 거절용·관리자 성사용). 모두 delivered + 선택 1건.
do $$
declare rid uuid; pid uuid; inv uuid; ref text; i int := 0;
begin
  insert into partners(code, state, name, contact_email, contact_phone) values ('PT-TEST-090','approved','동의테스트호텔','c90@example.com','010-9') returning id into pid;
  foreach ref in array array['MG-TEST-091','MG-TEST-092','MG-TEST-093'] loop
    i := i + 1;
    insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band, company, contact_name, region)
      values (ref, 'received', 1, 'c' || i || '@example.com', '010-0000-009' || i, '메모', now() - interval '3 days', '50–99명', '동의테스트', '이동의',
              case when ref = 'MG-TEST-091' then '화성' else '태국 방콕' end)
      returning id into rid;
    update rfps set state = 'delivered' where id = rid; -- 픽스처 전용(전이 규칙 검증은 02 에서)
    insert into invitations(rfp_id, partner_id, round, status, token, result) values (rid, pid, 1, 'submitted', 'tok-consent-' || i, 'selected') returning id into inv;
    insert into quotes(invitation_id, rfp_id, round, currency, twin_rate, king_rate, breakfast_included, tax_included, availability_all, valid_until, hotel_name, submitted_at, label)
      values (inv, rid, 1, 'USD', 100, 150, true, true, true, current_date + 30, '동의테스트호텔', now(), 'A');
  end loop;
end $$;

-- OTP 로 고른 기존 선택은 consent_method = 'otp'
do $$ begin
  if exists (select 1 from selections where not operator_override and consent_method is distinct from 'otp') then raise exception 'otp selections must be backfilled/defaulted to otp'; end if;
end $$;

select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'ops@matchgo.example';
set role authenticated;
do $$
declare j jsonb; bad jsonb[]; b jsonb; ok boolean;
begin
  -- 동의 기록 없이 성사 → GUARD_CONSENT
  begin perform admin_transition('MG-TEST-091', 'won'); raise exception 'won without consent must fail'; exception when others then if sqlerrm not like 'MG:GUARD_CONSENT%' then raise; end if; end;
  bad := array[
    jsonb_build_object('method','sms','confirmed_at',now()::text,'note','통화로 선정 동의 확인함 0000'),
    jsonb_build_object('method','phone_call','confirmed_at',(now() + interval '1 day')::text,'note','통화로 선정 동의 확인함 0000'),
    jsonb_build_object('method','phone_call','confirmed_at','어제','note','통화로 선정 동의 확인함 0000'),
    jsonb_build_object('method','phone_call','confirmed_at',now()::text,'note','확인함')
  ];
  foreach b in array bad loop
    ok := false;
    begin perform admin_transition('MG-TEST-091', 'won', null, null, null, b); exception when others then if sqlerrm like 'MG:GUARD_CONSENT%' then ok := true; else raise; end if; end;
    if not ok then raise exception 'bad consent accepted: %', b; end if;
  end loop;

  j := admin_transition('MG-TEST-091', 'won', null, null, null,
        jsonb_build_object('method','email_reply','confirmed_at',now()::text,'note','10/07 담당자 메일 회신으로 제안 A 선정 및 정보 제공 동의 확인'));
  if j->>'state' <> 'won' then raise exception 'won with consent failed'; end if;
  if (j->'pickOtp'->'consent'->>'method') <> 'email_reply' then raise exception 'pickOtp.consent missing: %', j->'pickOtp'; end if;
  raise notice 'PASS consent guard + record';
end $$;
reset role; reset request.jwt.claims;

do $$ declare s selections%rowtype; begin
  select sl.* into s from selections sl join rfps r on r.id = sl.rfp_id where r.ref = 'MG-TEST-091';
  if s.consent_method <> 'email_reply' or s.consent_confirmed_at is null or char_length(s.consent_note) < 10 or s.consent_recorded_role <> 'operator' or s.consent_recorded_by is null then
    raise exception 'selection consent columns wrong: % % %', s.consent_method, s.consent_recorded_role, s.consent_recorded_by;
  end if;
  if not exists (select 1 from rfp_history h join rfps r on r.id = h.rfp_id where r.ref = 'MG-TEST-091' and h.to_state = 'won' and h.memo like '%동의 확인: 이메일 회신%') then raise exception 'history memo should carry consent'; end if;
end $$;

-- 파트너 담당자는 성사 처리 불가
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pm1@tmthai.example';
set role authenticated;
do $$ begin
  begin perform admin_transition('MG-TEST-092', 'won', null, null, null, jsonb_build_object('method','phone_call','confirmed_at',now()::text,'note','통화로 선정 동의를 확인했습니다')); raise exception 'member must not close won'; exception when others then if sqlerrm not like 'MG:FORBIDDEN%' then raise; end if; end;
  raise notice 'PASS member cannot close won';
end $$;
reset role; reset request.jwt.claims;

-- 파트너 관리자는 가능 + 본사에 알림
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', user_id::text)::text, false) from console_user where email = 'pa1@tmthai.example';
set role authenticated;
do $$ declare j jsonb; begin
  j := admin_transition('MG-TEST-093', 'won', null, null, null, jsonb_build_object('method','phone_call','confirmed_at',now()::text,'note','10/07 통화로 제안 A 선정과 정보 제공 동의를 확인'));
  if j->>'state' <> 'won' then raise exception 'partner admin won failed'; end if;
end $$;
reset role; reset request.jwt.claims;
do $$ begin
  if not exists (select 1 from notification_log where template_id = 'CONSOLE_NOTICE' and vars->>'SOURCE_TEMPLATE' = 'HQ_PROXY_CONSENT_RECORDED') then raise exception 'HQ_PROXY_CONSENT_RECORDED not enqueued'; end if;
  if (select consent_recorded_role from selections s join rfps r on r.id = s.rfp_id where r.ref = 'MG-TEST-093') <> 'partner_admin' then raise exception 'partner role not recorded'; end if;
  -- 3년 뒤 파기
  update selections set retain_until = current_date - 1 where rfp_id = (select id from rfps where ref = 'MG-TEST-091');
  perform private.system_tick_all();
  if (select consent_note from selections s join rfps r on r.id = s.rfp_id where r.ref = 'MG-TEST-091') is not null then raise exception 'consent_note should be purged after retention'; end if;
  raise notice 'PASS partner admin proxy consent + HQ notice + purge';
end $$;
