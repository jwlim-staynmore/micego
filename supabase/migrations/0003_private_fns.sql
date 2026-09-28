-- MICEGO 0003: private 스키마 함수 — 상태 머신, 영업일 계산, enqueue, tick
set search_path = public;

-- ---------- auth helpers ----------
create or replace function private.is_operator() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'operator'
$$;

-- ---------- KST business-day helpers ----------
-- KST = UTC+9. 요일: 0=일 .. 6=토 (Postgres dow 와 동일)
create or replace function private.kst_date(ts timestamptz) returns date
language sql immutable as $$
  select (ts at time zone 'Asia/Seoul')::date
$$;

create or replace function private.is_biz(ts timestamptz) returns boolean
language sql stable as $$
  select extract(dow from (ts at time zone 'Asia/Seoul')) not in (0,6)
     and not exists (select 1 from kr_holidays h where h.day = private.kst_date(ts))
$$;

-- 해당 날짜(KST) 18:00 을 timestamptz 로
create or replace function private.at18(ts timestamptz) returns timestamptz
language sql immutable as $$
  select (private.kst_date(ts)::text || ' 18:00 Asia/Seoul')::timestamptz
$$;

-- from_ms 다음 날부터 세어 n번째 영업일 18:00 KST
create or replace function private.add_business_days(from_ts timestamptz, n int) returns timestamptz
language plpgsql stable as $$
declare
  t timestamptz := from_ts;
  c int := 0;
  guard int := 0;
begin
  if n <= 0 then
    return private.at18(from_ts);
  end if;
  while c < n loop
    t := t + interval '1 day';
    guard := guard + 1;
    if guard > 400 then raise exception 'MG:INTERNAL' using detail = 'add_business_days runaway'; end if;
    if private.is_biz(t) then c := c + 1; end if;
  end loop;
  return private.at18(t);
end;
$$;

-- 기산점이 영업일이고 18시 이전이면 그날이 1일째: n-1 영업일 더, 아니면 n 영업일
create or replace function private.due(start_ts timestamptz, n int) returns timestamptz
language plpgsql stable as $$
declare
  h int;
begin
  h := extract(hour from (start_ts at time zone 'Asia/Seoul'));
  if private.is_biz(start_ts) and h < 18 then
    return private.add_business_days(start_ts, n - 1);
  else
    return private.add_business_days(start_ts, n);
  end if;
end;
$$;

-- ---------- reference numbers ----------
create or replace function private.next_ref(p_prefix text) returns text
language plpgsql as $$
declare
  v_yymm text := to_char(now() at time zone 'Asia/Seoul', 'YYMM');
  v_n int;
begin
  insert into ref_counters(prefix, yymm, n) values (p_prefix, v_yymm, 1)
    on conflict (prefix, yymm) do update set n = ref_counters.n + 1
    returning ref_counters.n into v_n;
  return p_prefix || '-' || v_yymm || '-' || lpad(v_n::text, 3, '0');
end;
$$;

-- ---------- track slug (organizer-facing state label) ----------
create or replace function private.track_slug(p_state rfp_state, p_round int) returns text
language sql immutable as $$
  select case
    when p_state = 'open' then 'verifying'
    when p_state = 'bidding' and p_round >= 2 then 'rebid'
    else p_state::text
  end
$$;

-- ---------- rate limiting ----------
-- bucket 안의 window_s 초 창에서 key 의 카운트를 늘리고, limit 을 넘기면 false(거부) 를 돌려준다.
create or replace function private.rl_hit(p_bucket text, p_key text, p_limit int, p_window_s int) returns boolean
language plpgsql as $$
declare
  ws timestamptz;
  c int;
begin
  ws := to_timestamp(floor(extract(epoch from now()) / p_window_s) * p_window_s);
  insert into rate_limits(bucket, key, window_start, count) values (p_bucket, p_key, ws, 1)
    on conflict (bucket, key, window_start) do update set count = rate_limits.count + 1
    returning count into c;
  return c <= p_limit;
end;
$$;

-- ---------- notification enqueue ----------
-- target: {rfp_id?, partner_id?, member_id?, invitation_id?, to_email?, cc_email?, to_phone?, recipient_kind?}
-- vars: 추가 변수만 (공통 변수는 발송 시 TS 쪽에서 DB로부터 계산)
create or replace function private.enqueue(
  p_template_id text,
  p_idem_key text,
  p_target jsonb,
  p_vars jsonb default '{}'::jsonb,
  p_scheduled_at timestamptz default now()
) returns bigint
language plpgsql as $$
declare
  v_id bigint;
begin
  insert into notification_log (
    template_id, recipient_kind, rfp_id, partner_id, member_id, invitation_id,
    to_email, cc_email, to_phone, vars, idempotency_key, scheduled_at, status
  ) values (
    p_template_id,
    p_target ->> 'recipient_kind',
    nullif(p_target ->> 'rfp_id','')::uuid,
    nullif(p_target ->> 'partner_id','')::uuid,
    nullif(p_target ->> 'member_id','')::uuid,
    nullif(p_target ->> 'invitation_id','')::uuid,
    nullif(p_target ->> 'to_email',''),
    nullif(p_target ->> 'cc_email',''),
    nullif(p_target ->> 'to_phone',''),
    coalesce(p_vars, '{}'::jsonb),
    p_idem_key,
    p_scheduled_at,
    'pending'
  )
  on conflict (idempotency_key) do nothing
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- RFP state machine ----------
create or replace function private.allowed_actions(p_state rfp_state) returns text[]
language sql immutable as $$
  select case p_state
    when 'received' then array['verifying','cancelled']
    when 'verifying' then array['rejected','open','cancelled']
    when 'open' then array['bidding','cancelled']
    when 'bidding' then array['collecting','cancelled']
    when 'collecting' then array['delivered','lost','rebid','cancelled']
    when 'delivered' then array['won','lost','rebid','cancelled']
    else array[]::text[]
  end
$$;

-- 현재 라운드 초대 (재초대로 이력만 남은 행 제외)
create or replace function private.current_invitations(p_rfp_id uuid, p_round int) returns setof invitations
language sql stable as $$
  select * from invitations where rfp_id = p_rfp_id and round = p_round and status <> 'reinvited'
$$;

create or replace function private.rfp_vars_common(r rfps) returns jsonb
language plpgsql stable as $$
declare
  trk rfp_tokens%rowtype;
begin
  select * into trk from rfp_tokens where rfp_id = r.id and kind = 'track' and state = 'active' limit 1;
  return jsonb_build_object(
    'RFP_ID', r.ref,
    'DESTINATION', coalesce(r.destination, r.region),
    'EVENT_TYPE', r.event_type,
    'PAX', r.headcount_band,
    'ORG_CONTACT_NAME', r.contact_name,
    'ORG_COMPANY', r.company,
    'ORG_EMAIL', r.contact_email,
    'ORG_PHONE', r.contact_phone,
    'RECEIVED_AT', to_char(r.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'),
    'TRACK_TOKEN', trk.token
  );
end;
$$;

-- 성사(전달됨→성사) 공통 처리: 관리자 우선지정(override) 과 오거나이저 OTP 선택 양쪽에서 호출
create or replace function private.finalize_won(
  p_rfp_id uuid,
  p_invitation_id uuid,
  p_actor actor_kind,
  p_operator_id uuid,
  p_otp_id uuid,
  p_phone_masked text,
  p_operator_override boolean
) returns rfps
language plpgsql as $$
declare
  r rfps%rowtype;
  inv invitations%rowtype;
  qte quotes%rowtype;
  ptn partners%rowtype;
  other invitations%rowtype;
  memo text;
  t0 timestamptz := now();
begin
  select * into r from rfps where id = p_rfp_id for update;
  if r.id is null then raise exception using errcode = 'P0001', message = 'MG:BAD_REQUEST'; end if;
  if r.state <> 'delivered' then raise exception using errcode = 'P0001', message = 'MG:STATE_CONFLICT'; end if;

  select * into inv from invitations where id = p_invitation_id;
  select * into qte from quotes where invitation_id = p_invitation_id;
  select * into ptn from partners where id = inv.partner_id;

  update invitations set result = 'selected' where id = p_invitation_id;
  update invitations set result = 'not_selected'
    where rfp_id = p_rfp_id and round = r.round and status <> 'reinvited' and id <> p_invitation_id;

  insert into selections(rfp_id, quote_id, invitation_id, otp_id, operator_override, verified_at, verified_phone_masked, org_snapshot, connected_at, retain_until)
  values (
    p_rfp_id, qte.id, p_invitation_id, p_otp_id, p_operator_override,
    case when p_operator_override then null else t0 end,
    p_phone_masked,
    jsonb_build_object('company', r.company, 'contact_name', r.contact_name, 'email', r.contact_email, 'phone', r.contact_phone),
    t0,
    (t0 + interval '3 years')::date
  );

  memo := case when p_operator_override
    then '운영자 확인으로 성사 처리 (휴대전화 인증 없음)'
    else '제안 ' || coalesce(qte.label,'') || ' 선택 · 휴대전화 인증' end;

  update rfps set state = 'won', closed_at = t0, updated_at = t0,
    pick_otp = jsonb_build_object('at', case when p_operator_override then null else t0 end, 'phone_masked', p_phone_masked, 'operator', p_operator_override)
    where id = p_rfp_id
    returning * into r;

  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, from_state, to_state, memo)
  values (p_rfp_id, t0, p_actor, case p_actor when 'operator' then '운영자' when 'organizer' then '오거나이저' else '시스템' end, p_operator_id, 'delivered', 'won', memo);

  -- HTL_SELECTED_CONNECT: 선정 호텔 (오거나이저 참조)
  perform private.enqueue('HTL_SELECTED_CONNECT', 'HTL_SELECTED_CONNECT:' || p_invitation_id,
    jsonb_build_object('rfp_id', p_rfp_id, 'partner_id', inv.partner_id, 'invitation_id', p_invitation_id,
      'to_email', ptn.contact_email, 'cc_email', r.contact_email, 'recipient_kind', 'htl'),
    '{}'::jsonb, t0);

  -- HTL_NOT_SELECTED: 제출한 나머지 호텔
  for other in select * from invitations where rfp_id = p_rfp_id and round = r.round and status = 'submitted' and id <> p_invitation_id loop
    perform private.enqueue('HTL_NOT_SELECTED', 'HTL_NOT_SELECTED:' || other.id,
      jsonb_build_object('rfp_id', p_rfp_id, 'partner_id', other.partner_id, 'invitation_id', other.id,
        'to_email', (select contact_email from partners where id = other.partner_id), 'recipient_kind', 'htl'),
      '{}'::jsonb, t0);
  end loop;

  -- ORG_WON
  perform private.enqueue('ORG_WON', 'ORG_WON:' || p_rfp_id,
    jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind', 'org'),
    '{}'::jsonb, t0);

  return r;
end;
$$;

-- 오거나이저 OTP 선택 확정
create or replace function private.pick_and_win(p_rfp_id uuid, p_label text, p_otp_id uuid, p_phone_masked text) returns jsonb
language plpgsql as $$
declare
  r rfps%rowtype;
  inv invitations%rowtype;
  qte quotes%rowtype;
  ptn partners%rowtype;
  out_r rfps%rowtype;
begin
  select * into r from rfps where id = p_rfp_id for update;
  if r.id is null then raise exception using errcode = 'P0001', message = 'MG:BAD_REQUEST'; end if;
  if r.state <> 'delivered' then raise exception using errcode = 'P0001', message = 'MG:STATE_CONFLICT'; end if;

  select q.* into qte from quotes q join invitations i on i.id = q.invitation_id
    where q.rfp_id = p_rfp_id and q.round = r.round and q.label = p_label and i.status = 'submitted'
    limit 1;
  if qte.id is null then raise exception using errcode = 'P0001', message = 'MG:VALIDATION'; end if;
  select * into inv from invitations where id = qte.invitation_id;
  select * into ptn from partners where id = inv.partner_id;

  out_r := private.finalize_won(p_rfp_id, inv.id, 'organizer', null, p_otp_id, p_phone_masked, false);
  return jsonb_build_object('state','won','selected', jsonb_build_object('label', qte.label, 'hotel_name', ptn.name), 'connected_at', out_r.closed_at);
end;
$$;

-- 운영자 전이 (검증중/반려/오픈/비딩중/취합중/전달됨/미성사/새라운드/취소/성사-운영자확정)
create or replace function private.rfp_transition(
  p_rfp_id uuid,
  p_action text,
  p_actor actor_kind,
  p_operator_id uuid,
  p_reason text,
  p_note text,
  p_memo text
) returns rfps
language plpgsql as $$
declare
  r rfps%rowtype;
  to_state rfp_state;
  t0 timestamptz := now();
  n_submitted int;
  n_usd_missing int;
  n_cur_inv int;
  sel_inv invitations%rowtype;
  n_selected int;
  memo_full text;
  cur_currencies int;
  lbl_rank int;
  q_rec record;
  v_reason_label text;
  v_from_state text;
  v_prev_state rfp_state;
begin
  select * into r from rfps where id = p_rfp_id for update;
  if r.id is null then raise exception using errcode = 'P0001', message = 'MG:BAD_REQUEST'; end if;

  if not (p_action = any(private.allowed_actions(r.state))) then
    raise exception using errcode = 'P0001', message = 'MG:STATE_CONFLICT';
  end if;

  -- guards
  if p_action = 'open' and not r.anon_reviewed then
    raise exception using errcode = 'P0001', message = 'MG:GUARD_ANON';
  end if;

  if p_action = 'bidding' and r.state = 'open' then
    select count(*) into n_cur_inv from private.current_invitations(p_rfp_id, r.round);
    if r.deadline is null or n_cur_inv < 1 then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_BIDDING';
    end if;
  end if;

  if p_action = 'delivered' then
    select count(*) into n_submitted from private.current_invitations(p_rfp_id, r.round) i where i.status = 'submitted';
    if n_submitted < 1 then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_NO_QUOTE';
    end if;
    select count(distinct q.currency) into cur_currencies from quotes q join invitations i on i.id = q.invitation_id
      where q.rfp_id = p_rfp_id and q.round = r.round and i.status = 'submitted';
    if cur_currencies >= 2 then
      select count(*) into n_usd_missing from quotes q join invitations i on i.id = q.invitation_id
        where q.rfp_id = p_rfp_id and q.round = r.round and i.status = 'submitted'
        and (q.usd_ref is null or q.usd_ref <= 0 or q.usd_date is null);
      if n_usd_missing > 0 then
        raise exception using errcode = 'P0001', message = 'MG:GUARD_USD';
      end if;
    end if;
  end if;

  if p_action = 'lost' and r.state = 'collecting' then
    select count(*) into n_submitted from private.current_invitations(p_rfp_id, r.round) i where i.status = 'submitted';
    if n_submitted > 0 or r.round < 2 then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_LOST_COLLECTING';
    end if;
  end if;

  if p_action = 'won' then
    select count(*) into n_selected from invitations where rfp_id = p_rfp_id and round = r.round and status <> 'reinvited' and result = 'selected';
    if n_selected <> 1 then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_SELECT_ONE';
    end if;
  end if;

  if p_action in ('rejected','lost','cancelled') then
    if p_reason is null or trim(p_reason) = '' then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_REASON';
    end if;
    if p_reason = '기타' and (p_note is null or trim(p_note) = '') then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_REASON';
    end if;
  end if;

  -- won: delegate to finalize_won (returns early)
  if p_action = 'won' then
    select * into sel_inv from invitations where rfp_id = p_rfp_id and round = r.round and status <> 'reinvited' and result = 'selected' limit 1;
    return private.finalize_won(p_rfp_id, sel_inv.id, 'operator', p_operator_id, null, null, true);
  end if;

  to_state := case when p_action = 'rebid' then 'bidding' else p_action::rfp_state end;
  memo_full := coalesce(p_reason, '') || case when p_note is not null and p_note <> '' then ' · ' || p_note else '' end;
  if memo_full = '' then memo_full := coalesce(p_memo, ''); end if;
  v_from_state := case when p_action = 'rebid' then 'delivered/collecting' else r.state::text end;
  v_prev_state := r.state;

  -- side effects prior to state flip
  if p_action = 'collecting' then
    update invitations set status = 'expired'
      where rfp_id = p_rfp_id and round = r.round and status in ('invited','viewed');
  end if;

  if p_action = 'delivered' then
    lbl_rank := 0;
    for q_rec in
      select q.id from quotes q join invitations i on i.id = q.invitation_id
      where q.rfp_id = p_rfp_id and q.round = r.round and i.status = 'submitted'
      order by q.submitted_at asc
    loop
      update quotes set label = chr(65 + lbl_rank) where id = q_rec.id;
      lbl_rank := lbl_rank + 1;
    end loop;
  end if;

  update rfps set
    state = to_state,
    updated_at = t0,
    verifying_at = case when p_action = 'verifying' then t0 else verifying_at end,
    sla_due_at = case when p_action = 'verifying' then private.due(t0, 3) else sla_due_at end,
    open_at = case when p_action = 'open' then t0 else open_at end,
    bidding_at = case when to_state = 'bidding' then t0 else bidding_at end,
    delivered_at = case when p_action = 'delivered' then t0 else delivered_at end,
    closed_at = case when p_action in ('rejected','lost','cancelled') then t0 else closed_at end,
    close_reason = case when p_action in ('rejected','lost','cancelled') then memo_full else close_reason end,
    change_summary = case when p_action = 'rebid' then p_memo else change_summary end,
    round = case when p_action = 'rebid' then r.round + 1 else r.round end,
    deadline = case when p_action = 'rebid' then null else deadline end
  where id = p_rfp_id
  returning * into r;

  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, from_state, to_state, memo)
  values (p_rfp_id, t0,
    coalesce(p_actor, 'operator'),
    case coalesce(p_actor,'operator') when 'operator' then '운영자' when 'system' then '시스템' else '오거나이저' end,
    p_operator_id,
    v_from_state,
    to_state::text,
    memo_full);

  -- notifications
  if p_action = 'rejected' then
    perform private.enqueue('ORG_REJECTED', 'ORG_REJECTED:' || p_rfp_id,
      jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'),
      jsonb_build_object('REJECT_REASON', memo_full), t0);
  elsif to_state = 'bidding' then
    if p_action = 'rebid' or r.round >= 2 then
      perform private.enqueue('ORG_REBID', 'ORG_REBID:' || p_rfp_id || ':' || r.round,
        jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'),
        jsonb_build_object('ROUND', r.round, 'CHANGE_SUMMARY', coalesce(r.change_summary,'')), t0);
    else
      perform private.enqueue('ORG_BIDDING', 'ORG_BIDDING:' || p_rfp_id,
        jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'),
        '{}'::jsonb, t0);
    end if;
  elsif p_action = 'delivered' then
    perform private.enqueue('ORG_DELIVERED', 'ORG_DELIVERED:' || p_rfp_id,
      jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'),
      '{}'::jsonb, t0);
  elsif p_action = 'lost' then
    perform private.enqueue('ORG_LOST', 'ORG_LOST:' || p_rfp_id || ':' || r.round,
      jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'),
      jsonb_build_object('LOST_REASON', memo_full), t0);
  elsif p_action = 'cancelled' then
    -- 회원 탈퇴로 인한 자동 취소는 ORG_CANCELLED 를 보내지 않는다 (SPEC_LAUNCH.md §3 withdraw: "no ORG_CANCELLED").
    if p_reason is distinct from '회원 탈퇴' then
      perform private.enqueue('ORG_CANCELLED', 'ORG_CANCELLED:' || p_rfp_id,
        jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'),
        jsonb_build_object('CANCEL_REASON', memo_full), t0);
    end if;
    if v_prev_state = 'bidding' then
      insert into rfp_history(rfp_id, at, actor, actor_label, memo)
      values (p_rfp_id, t0, 'operator', '운영자', 'OPS_HTL_CANCELLED 안내는 자동 발송되지 않습니다 · 초대 호텔에 직접 안내 필요');
    end if;
  end if;

  return r;
end;
$$;

-- ---------- system_tick ----------
create or replace function private.system_tick() returns jsonb
language plpgsql as $$
declare
  r record;
  n_collect int := 0;
  n_reminder int := 0;
  n_share int := 0;
  n_purge int := 0;
  t0 timestamptz := now();
begin
  -- 1) bidding → collecting: 현재 라운드 모든 초대가 마감 경과 또는 전원 응답
  for r in
    select rf.id, rf.round from rfps rf
    where rf.state = 'bidding'
      and exists (select 1 from invitations i where i.rfp_id = rf.id and i.round = rf.round and i.status <> 'reinvited')
      and not exists (
        select 1 from invitations i where i.rfp_id = rf.id and i.round = rf.round and i.status <> 'reinvited'
        and i.status in ('invited','viewed') and coalesce(i.deadline, rf.deadline) > t0
      )
  loop
    update invitations set status = 'expired' where rfp_id = r.id and round = r.round and status in ('invited','viewed');
    update rfps set state = 'collecting', updated_at = t0 where id = r.id;
    insert into rfp_history(rfp_id, at, actor, actor_label, from_state, to_state, memo)
      values (r.id, t0, 'system', '시스템', 'bidding', 'collecting', '마감 경과 또는 전원 응답 · 자동 전이');
    n_collect := n_collect + 1;
  end loop;

  -- 2) 마감 24시간 전 HTL_REMINDER (1회)
  for r in
    select i.id as inv_id, i.rfp_id, i.partner_id, i.deadline, p.contact_email, p.contact_phone
    from invitations i join partners p on p.id = i.partner_id
    where i.status in ('invited','viewed')
      and i.deadline is not null and i.deadline - interval '24 hours' <= t0
      and i.reminder_sent_at is null
  loop
    perform private.enqueue('HTL_REMINDER', 'HTL_REMINDER:' || r.inv_id,
      jsonb_build_object('rfp_id', r.rfp_id, 'partner_id', r.partner_id, 'invitation_id', r.inv_id,
        'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','htl'), '{}'::jsonb, t0);
    update invitations set reminder_sent_at = t0 where id = r.inv_id;
    n_reminder := n_reminder + 1;
  end loop;

  -- 3) 공유 링크 만료: 종료 30일 경과
  for r in
    select rt.id from rfp_tokens rt join rfps rf on rf.id = rt.rfp_id
    where rt.kind = 'share' and rt.state = 'active'
      and rf.state in ('won','lost','rejected','cancelled')
      and rf.closed_at is not null and rf.closed_at + interval '30 days' <= t0
  loop
    update rfp_tokens set state = 'expired' where id = r.id;
    n_share := n_share + 1;
  end loop;

  -- 4) pending_* 회원 72시간 경과 파기
  for r in
    select id from members where state in ('pending_email','pending_phone') and created_at + interval '72 hours' <= t0
  loop
    delete from members where id = r.id;
    n_purge := n_purge + 1;
  end loop;

  -- 5) 오래된 데이터 정리
  delete from otp_codes where created_at < t0 - interval '7 days';
  delete from login_attempts where at < t0 - interval '30 days';
  delete from member_access_log where at < t0 - interval '3 months';
  delete from rate_limits where window_start < t0 - interval '2 days';

  -- 6) 성사 연결 기록의 개인정보 보관기한 경과 시 null 처리
  update selections set org_snapshot = null where retain_until is not null and retain_until <= t0::date and org_snapshot is not null;

  return jsonb_build_object('collecting', n_collect, 'reminders', n_reminder, 'share_expired', n_share, 'purged', n_purge);
end;
$$;
