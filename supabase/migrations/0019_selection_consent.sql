-- 0019_selection_consent.sql
-- 운영자 대리 확정(콘솔 '성사로 닫기') 때 요청자 동의를 어떻게 확인했는지 기록한다(2026-10-07).
-- 이용약관 제7조 ⑧: 휴대전화 인증 없이 운영자가 선정을 대신 확정하면 확인 방법과 일시를 기록한다.
-- 옛 0010_selection_consent(다른 세션에서 유실)를 다시 설계해 0019로 넣는다.
--
-- 설계(D-48·D-49)
--  · 휴대전화 인증 경로(pick_and_win)는 selections 생성과 won 전이를 한 번에 끝내므로,
--    콘솔 admin_transition('won')은 언제나 OTP 없는 대리 확정이다 → 콘솔 성사에는 동의 기록이 필수.
--  · private.finalize_won·rfp_transition 시그니처는 바꾸지 않는다. 공개 경로는 admin_transition 하나뿐이라
--    거기서 검증하고, 같은 트랜잭션 안에서 selections에 기록한다.
--  · 파트너 담당자(partner_member)는 성사 처리 불가, 파트너 관리자는 가능하되 본사에 알림.

alter table selections
  add column if not exists consent_method text
    check (consent_method in ('otp','email_reply','phone_call','other','legacy_unrecorded')),
  add column if not exists consent_confirmed_at timestamptz,
  add column if not exists consent_note text,
  add column if not exists consent_recorded_by uuid,
  add column if not exists consent_recorded_role console_role,
  add column if not exists consent_partner_org_id uuid references partner_org(id);

update selections
   set consent_method = case when operator_override then 'legacy_unrecorded' else 'otp' end,
       consent_confirmed_at = case when operator_override then null else verified_at end
 where consent_method is null;

-- OTP 경로는 finalize_won을 고치지 않고 트리거로 기본값을 채운다
create or replace function private.trg_selection_consent_default() returns trigger
language plpgsql as $$
begin
  if new.consent_method is null and not new.operator_override then
    new.consent_method := 'otp';
    new.consent_confirmed_at := coalesce(new.consent_confirmed_at, new.verified_at);
  end if;
  return new;
end $$;
drop trigger if exists selections_consent_default on selections;
create trigger selections_consent_default before insert on selections
  for each row execute function private.trg_selection_consent_default();

-- ---------- admin_transition: p_consent 추가(5인자 → 6인자) ----------
-- 오버로드로 남기면 PostgREST 이름 인자 호출이 모호해지므로 지우고 다시 만든다.
drop function if exists admin_transition(text,text,text,text,text);
create or replace function admin_transition(p_ref text, p_action text, p_reason text default null, p_note text default null, p_memo text default null, p_consent jsonb default null) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; r rfps%rowtype; v_method text; v_note text; v_at timestamptz; v_label text;
begin
  select * into x from private.rfp_for_write(p_ref);
  -- 파트너 담당자는 rejected/cancelled/won 불가(관리자만)
  if (x.me).role = 'partner_member' and p_action in ('rejected','cancelled','won') then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;

  if p_action = 'won' then
    if p_consent is null or jsonb_typeof(p_consent) <> 'object' then raise exception using errcode='P0001', message='MG:GUARD_CONSENT'; end if;
    v_method := p_consent->>'method';
    v_note := trim(coalesce(p_consent->>'note', ''));
    begin
      v_at := (p_consent->>'confirmed_at')::timestamptz;
    exception when others then v_at := null;
    end;
    if v_method is null or v_method not in ('email_reply','phone_call','other')
       or v_at is null or v_at > now() + interval '5 minutes' or v_at < (x.r).created_at
       or char_length(v_note) < 10 or char_length(v_note) > 1000 then
      raise exception using errcode='P0001', message='MG:GUARD_CONSENT';
    end if;
  end if;

  r := private.rfp_transition((x.r).id, p_action, 'operator', (x.me).user_id, p_reason, p_note, p_memo);

  if p_action = 'won' then
    update selections
       set consent_method = v_method, consent_confirmed_at = v_at, consent_note = v_note,
           consent_recorded_by = coalesce((x.me).user_id, auth.uid()), consent_recorded_role = (x.me).role,
           consent_partner_org_id = (x.me).partner_id
     where rfp_id = r.id;
    -- 콘솔 표시용 요약(개인정보 없음). pickOtp는 운영자에게만 노출된다(0012 rfp_to_json).
    update rfps set pick_otp = coalesce(pick_otp, '{}'::jsonb)
        || jsonb_build_object('consent', jsonb_build_object('method', v_method, 'at', v_at, 'by_role', (x.me).role))
     where id = r.id;
    v_label := case v_method when 'email_reply' then '이메일 회신' when 'phone_call' then '통화' else '기타' end;
    update rfp_history
       set memo = coalesce(memo, '') || ' · 동의 확인: ' || v_label || ' ' || to_char(v_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI')
     where id = (select max(id) from rfp_history where rfp_id = r.id and to_state = 'won');
    if (x.me).role = 'partner_admin' then
      perform private.notify_hq('HQ_PROXY_CONSENT_RECORDED', 'HQ_PROXY_CONSENT_RECORDED:' || r.id, r.id,
        jsonb_build_object('RFP_ID', r.ref, 'PARTNER', (select display_name from partner_org where id = (x.me).partner_id), 'METHOD', v_label));
    end if;
  end if;

  perform private.relabel_last_history(r.id, x.me);
  update rfps set row_version = row_version + 1 where id = r.id;
  if x.hq_override then
    insert into rfp_assignment_event (rfp_id, action, from_partner, to_partner, from_delegation, to_delegation, region_code, reason, payload, actor, actor_role)
    values (r.id, 'hq_override', r.partner_org_id, r.partner_org_id, 'delegated', 'delegated', r.region_code, p_action, jsonb_build_object('action', p_action), (x.me).user_id, 'operator');
    perform private.notify_partner(r.partner_org_id, 'PTR_HQ_ACTION', 'PTR_HQ_ACTION:' || r.id || ':' || p_action || ':' || r.round, r.id, jsonb_build_object('RFP_ID', r.ref, 'ACTION', p_action));
  end if;
  perform private.audit('rfp', r.ref, 'transition:' || p_action, jsonb_build_object('state', (x.r).state), jsonb_build_object('state', r.state), r.id, x.hq_override, p_reason);
  return private.rfp_to_json(r.id);
end $$;

revoke all on function admin_transition(text,text,text,text,text,jsonb) from public;
grant execute on function admin_transition(text,text,text,text,text,jsonb) to authenticated;

-- ---------- 3년 보관 후 근거 메모 파기(org_snapshot과 같은 시점) ----------
create or replace function private.system_tick_all() returns jsonb
language plpgsql as $$
declare a jsonb; b jsonb;
begin
  a := private.system_tick();
  b := private.intervention_sweep();
  update selections set consent_note = null
   where retain_until is not null and retain_until <= current_date and consent_note is not null;
  return a || jsonb_build_object('interventions', b);
end $$;

grant execute on all functions in schema private to service_role;
