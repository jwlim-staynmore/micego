-- MICEGO 0005: 운영자용 RPC (security definer, admin_snapshot 등)
set search_path = public;

create table if not exists notif_template_meta (
  id text primary key,
  name text not null
);

create or replace function private.require_operator() returns void
language plpgsql as $$
begin
  if not private.is_operator() then
    raise exception using errcode = 'P0001', message = 'MG:FORBIDDEN';
  end if;
end;
$$;

-- ---------- per-entity JSON shape (admin_snapshot 과 admin_rfp 가 공유) ----------
create or replace function private.rfp_to_json(p_id uuid) returns jsonb
language plpgsql stable as $$
declare
  r rfps%rowtype;
  trk text;
  invs jsonb;
  qts jsonb;
  hist jsonb;
begin
  select * into r from rfps where id = p_id;
  if r.id is null then return null; end if;
  select token into trk from rfp_tokens where rfp_id = p_id and kind = 'track' and state = 'active' limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'hotelId', p.code, 'hotel', p.name, 'email', p.contact_email,
    'status', i.status, 'round', i.round, 'viewedAt', i.viewed_at, 'submittedAt', i.submitted_at,
    'sel', case i.result when 'selected' then 'selected' when 'not_selected' then 'notselected' else null end,
    'note', i.note, 'deadline', i.deadline
  ) order by i.invited_at), '[]'::jsonb) into invs
  from invitations i join partners p on p.id = i.partner_id where i.rfp_id = p_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'invId', q.invitation_id, 'round', q.round, 'label', q.label, 'currency', q.currency,
    'twin', q.twin_rate, 'king', q.king_rate,
    'tax', case when q.tax_included then '포함' else coalesce(q.tax_note,'') end,
    'breakfast', case when q.breakfast_included then '포함' else '별도' end,
    'validUntil', q.valid_until, 'cancel', q.cancellation, 'usdRef', q.usd_ref, 'usdDate', q.usd_date
  ) order by q.submitted_at), '[]'::jsonb) into qts
  from quotes q where q.rfp_id = p_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    't', h.at, 'actor', h.actor_label, 'from', h.from_state, 'to', h.to_state, 'memo', h.memo
  ) order by h.at), '[]'::jsonb) into hist
  from rfp_history h where h.rfp_id = p_id;

  return jsonb_build_object(
    'id', r.ref, 'token', trk, 'state', r.state, 'round', r.round,
    'createdAt', r.created_at, 'verifyingAt', r.verifying_at,
    'destination', coalesce(r.destination, r.region), 'eventType', r.event_type,
    'headcount', coalesce(r.headcount, 0), 'start', r.start_date, 'end', r.end_date,
    'twin', r.twin_rooms, 'king', r.king_rooms,
    'ballroom', coalesce(r.ballroom_note, case when r.ballroom_use then '필요 · ' || coalesce(r.ballroom_purpose,'') else '불필요' end),
    'publicMemo', r.public_memo, 'rawMemo', r.note,
    'organizer', jsonb_build_object('company', r.company, 'contact', r.contact_name, 'email', r.contact_email, 'phone', r.contact_phone, 'budget', coalesce(r.budget_note, '미기재')),
    'anonReviewed', r.anon_reviewed, 'anonAt', r.anon_at, 'deadline', r.deadline,
    'invitations', invs, 'quotes', qts, 'connectDone', to_jsonb(r.connect_done),
    'history', hist, 'ownerId', r.owner_id, 'pickOtp', r.pick_otp
  );
end;
$$;

create or replace function private.partner_to_json(p_id uuid) returns jsonb
language plpgsql stable as $$
declare
  p partners%rowtype;
  hist jsonb;
begin
  select * into p from partners where id = p_id;
  if p.id is null then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    't', h.at, 'actor', h.actor_label, 'from', h.from_state, 'to', h.to_state, 'memo', h.memo
  ) order by h.at), '[]'::jsonb) into hist
  from partner_history h where h.partner_id = p_id;

  return jsonb_build_object(
    'id', p.code, 'name', p.name, 'dest', p.dest, 'cap', p.cap, 'ballroom', p.banquet,
    'email', p.contact_email, 'status', p.state, 'appliedAt', p.applied_at,
    'hotelLocation', p.location, 'hotelDomain', p.domain, 'capBand', p.cap_band,
    'contactName', p.contact_name, 'contactPhone', p.contact_phone, 'description', p.description,
    'check', p.check_, 'history', hist, 'optOutAt', p.invite_opt_out_at
  );
end;
$$;

create or replace function admin_snapshot() returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare
  out_rfps jsonb; out_partners jsonb; out_members jsonb; out_share jsonb; out_link jsonb;
  out_audit jsonb; out_mlog jsonb; out_send jsonb; out_fail jsonb; out_hol jsonb; out_arch jsonb;
  out_inacc jsonb; out_metrics jsonb;
  win timestamptz := now() - interval '180 days';
begin
  perform private.require_operator();

  select coalesce(jsonb_agg(private.rfp_to_json(r.id) order by r.created_at desc), '[]'::jsonb) into out_rfps
  from rfps r where r.state not in ('won','lost','rejected','cancelled') or r.closed_at > win or r.created_at > win;

  select coalesce(jsonb_agg(private.partner_to_json(p.id) order by p.applied_at desc), '[]'::jsonb) into out_partners
  from partners p;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'name', m.name, 'company', m.company, 'orgType', m.org_type, 'email', m.email, 'phone', m.phone,
    'state', m.state, 'createdAt', m.created_at, 'emailVerifiedAt', m.email_verified_at, 'phoneVerifiedAt', m.phone_verified_at,
    'lastLoginAt', m.last_login_at, 'mktEmail', m.mkt_email, 'mktSms', m.mkt_sms, 'mktAt', m.mkt_at,
    'fails', (select count(*) from login_attempts la where la.email_norm = m.email and la.at > now() - interval '1 hour' and not la.ok),
    'sends', (select count(*) from otp_codes o where o.member_id = m.id and o.purpose = 'signup_email' and o.created_at::date = now()::date),
    'phoneSends', (select count(*) from otp_codes o where o.member_id = m.id and o.purpose in ('signup_phone','phone_change') and o.created_at::date = now()::date),
    'sessions', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'device', s.user_agent, 'ip', s.ip, 'at', s.updated_at)), '[]'::jsonb) from auth.sessions s where s.user_id = m.id),
    'access', (select coalesce(jsonb_agg(jsonb_build_object('t', al.at, 'ip', al.ip, 'ua', al.ua, 'ok', al.ok) order by al.at desc), '[]'::jsonb) from member_access_log al where al.member_id = m.id and al.at > now() - interval '3 months'),
    'refs', (select coalesce(jsonb_agg(jsonb_build_object('id', r2.ref, 'title', coalesce(r2.destination,r2.region)||' · '||coalesce(r2.event_type,''), 'state', r2.state, 'createdAt', r2.created_at)), '[]'::jsonb)
             from rfps r2 where r2.owner_id = m.id and r2.created_at <= win)
  ) order by m.created_at desc), '[]'::jsonb) into out_members
  from members m;

  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'rfpId', (select ref from rfps where id = l.rfp_id), 'memberId', l.created_by,
    'token', l.token, 'status', l.state, 'createdAt', l.created_at, 'revokedAt', l.revoked_at, 'views', l.views, 'lastViewedAt', l.last_viewed_at)), '[]'::jsonb)
  into out_share from rfp_tokens l where l.kind = 'share';

  select coalesce(jsonb_agg(jsonb_build_object('id', lr.id, 'memberId', lr.member_id, 'matchType', lr.match_type,
    'requestedAt', lr.requested_at, 'status', lr.status,
    'ref', jsonb_build_object('id', r3.ref, 'title', coalesce(r3.destination,r3.region)||' · '||coalesce(r3.event_type,''), 'state', r3.state, 'createdAt', r3.created_at))), '[]'::jsonb)
  into out_link from link_requests lr join rfps r3 on r3.id = lr.rfp_id;

  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'memberId', a.member_id, 't', a.at, 'actor',
    case a.actor when 'operator' then '운영자' when 'system' then '시스템' else a.actor::text end,
    'action', a.action, 'label', a.label, 'reason', a.reason, 'notif', a.notif) order by a.at), '[]'::jsonb)
  into out_audit from audit_log a where a.member_id is not null;

  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'memberId', d.member_id, 't', d.scheduled_at, 'template',
    coalesce((select tm.name from notif_template_meta tm where tm.id = d.template_id), d.template_id) || ' ' || d.template_id,
    'to', d.to_email, 'status', d.status) order by d.scheduled_at), '[]'::jsonb)
  into out_mlog from notification_log d where d.member_id is not null;

  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'to', d.to_addr, 'template',
    l.template_id || ' ' || coalesce((select tm.name from notif_template_meta tm where tm.id = l.template_id), ''),
    'at', d.sent_at, 'rfpId', (select ref from rfps where id = l.rfp_id), 'status', d.status, 'cc', l.cc_email) order by d.sent_at desc)
    , '[]'::jsonb)
  into out_send
  from notification_deliveries d join notification_log l on l.id = d.log_id
  where d.channel = 'email' and d.status in ('sent','delivered');

  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'to', l.to_email,
    'template', l.template_id || ' ' || coalesce((select tm.name from notif_template_meta tm where tm.id = l.template_id), ''),
    'at', l.scheduled_at, 'rfpId', (select ref from rfps where id = l.rfp_id), 'manual', l.manual_resolved_at is not null)), '[]'::jsonb)
  into out_fail
  from notification_log l where l.status = 'failed';

  select coalesce(jsonb_agg(jsonb_build_object('date', h.day, 'name', h.name) order by h.day), '[]'::jsonb) into out_hol from kr_holidays h;

  select coalesce(jsonb_agg(jsonb_build_object('rfpId', (select ref from rfps where id=i.rfp_id), 'round', i.round,
    'hotelId', p.code, 'invitedAt', i.invited_at, 'status', i.status, 'submittedAt', i.submitted_at, 'inaccurate', coalesce(i.inaccurate,false))), '[]'::jsonb)
  into out_arch
  from invitations i join partners p on p.id = i.partner_id join rfps rr on rr.id = i.rfp_id
  where rr.closed_at is not null and rr.closed_at <= win;

  select coalesce(jsonb_object_agg((select ref from rfps where id = i.rfp_id) || '|' || i.round || '|' || p.code, i.inaccurate), '{}'::jsonb)
  into out_inacc
  from invitations i join partners p on p.id = i.partner_id where i.inaccurate is not null;

  out_metrics := jsonb_build_object(
    'month', to_char(now(),'YYYY-MM'),
    'base', (select count(*) from rfps where created_at >= date_trunc('month', now())),
    'items', jsonb_build_array(
      jsonb_build_object('key','sla','name','SLA 준수율','value',
        (select case when count(*) filter (where state in ('verifying','open')) = 0 then '100%'
          else round(100.0 * count(*) filter (where sla_due_at is null or sla_due_at >= now() or state not in ('verifying','open')) / greatest(count(*),1))::text || '%' end
         from rfps where created_at >= date_trunc('month', now())),
        'sub','자동 계산','target','기준 90% 이상','met', null),
      jsonb_build_object('key','lead','name','접수→전달 소요일','value',
        (select coalesce(round(avg(extract(epoch from delivered_at - created_at)) / 86400)::text,'—') || '영업일' from rfps where delivered_at is not null and created_at >= date_trunc('month', now())),
        'sub','평균','target','기준 7영업일 이하','met', null)
    )
  );

  return jsonb_build_object(
    'tick', 0, 'rfps', out_rfps, 'partners', out_partners, 'invArchive', out_arch, 'inaccMarks', out_inacc,
    'holidays', out_hol, 'sendLog', out_send, 'members', out_members, 'shareLinks', out_share,
    'linkRequests', out_link, 'memberAudit', out_audit, 'memberLog', out_mlog, 'failures', out_fail, 'metrics', out_metrics
  );
end;
$$;
revoke all on function admin_snapshot() from public;
grant execute on function admin_snapshot() to authenticated;

create or replace function admin_rfp(p_ref text) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare rid uuid;
begin
  perform private.require_operator();
  select id into rid from rfps where ref = p_ref;
  if rid is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
  return private.rfp_to_json(rid);
end;
$$;
revoke all on function admin_rfp(text) from public;
grant execute on function admin_rfp(text) to authenticated;

create or replace function admin_transition(p_ref text, p_action text, p_reason text default null, p_note text default null, p_memo text default null) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare rid uuid; oid uuid; r rfps%rowtype;
begin
  perform private.require_operator();
  oid := nullif(auth.uid()::text,'')::uuid;
  select id into rid from rfps where ref = p_ref;
  if rid is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
  r := private.rfp_transition(rid, p_action, 'operator', oid, p_reason, p_note, p_memo);
  return private.rfp_to_json(r.id);
end;
$$;
revoke all on function admin_transition(text,text,text,text,text) from public;
grant execute on function admin_transition(text,text,text,text,text) to authenticated;

create or replace function admin_rfp_update(p_ref text, p_patch jsonb) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare rid uuid; k text; t0 timestamptz := now(); changes text[] := '{}';
begin
  perform private.require_operator();
  select id into rid from rfps where ref = p_ref;
  if rid is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;

  if p_patch ? 'deadline' then
    update rfps set deadline = nullif(p_patch->>'deadline','')::timestamptz, updated_at = t0 where id = rid;
    changes := changes || '마감일시 변경';
  end if;
  if p_patch ? 'publicMemo' then
    update rfps set public_memo = p_patch->>'publicMemo', updated_at = t0 where id = rid;
    changes := changes || '공개 메모 수정';
  end if;
  if p_patch ? 'anonReviewed' then
    update rfps set anon_reviewed = (p_patch->>'anonReviewed')::boolean, anon_at = case when (p_patch->>'anonReviewed')::boolean then t0 else null end, updated_at = t0 where id = rid;
    changes := changes || '익명화 검토 표시';
  end if;
  if p_patch ? 'destination' then
    update rfps set destination = p_patch->>'destination', updated_at = t0 where id = rid; changes := changes || '목적지 수정';
  end if;
  if p_patch ? 'headcount' then
    update rfps set headcount = nullif(p_patch->>'headcount','')::int, updated_at = t0 where id = rid; changes := changes || '인원 수정';
  end if;
  if p_patch ? 'ballroom_note' then
    update rfps set ballroom_note = p_patch->>'ballroom_note', updated_at = t0 where id = rid; changes := changes || '볼룸 메모 수정';
  end if;
  if p_patch ? 'budget_note' then
    update rfps set budget_note = p_patch->>'budget_note', updated_at = t0 where id = rid; changes := changes || '예산 메모 수정';
  end if;

  if array_length(changes,1) > 0 then
    insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo)
    values (rid, t0, 'operator', '운영자', nullif(auth.uid()::text,'')::uuid, array_to_string(changes, ', '));
  end if;
  return private.rfp_to_json(rid);
end;
$$;
revoke all on function admin_rfp_update(text,jsonb) from public;
grant execute on function admin_rfp_update(text,jsonb) to authenticated;

create or replace function admin_invite(p_ref text, p_partner_codes text[]) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare
  r rfps%rowtype; pid uuid; code text; inv_id uuid; t0 timestamptz := now(); n int := 0; names text[] := '{}';
begin
  perform private.require_operator();
  select * into r from rfps where ref = p_ref for update;
  if r.id is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
  if not r.anon_reviewed or r.deadline is null then raise exception using errcode='P0001', message='MG:GUARD_ANON'; end if;
  if r.state not in ('open','bidding') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;

  foreach code in array p_partner_codes loop
    select id into pid from partners where code = code and state = 'approved' and invite_opt_out_at is null;
    if pid is null then continue; end if;
    if exists (select 1 from invitations where rfp_id = r.id and partner_id = pid and round = r.round and status <> 'reinvited') then continue; end if;
    insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at)
      values (r.id, pid, r.round, 'invited', encode(gen_random_bytes(24),'base64'), r.deadline, t0)
      returning id into inv_id;
    update invitations set token = replace(replace(replace(token,'+','-'),'/','_'),'=','') where id = inv_id;
    perform private.enqueue('HTL_INVITE', 'HTL_INVITE:' || inv_id,
      jsonb_build_object('rfp_id', r.id, 'partner_id', pid, 'invitation_id', inv_id,
        'to_email', (select contact_email from partners where id = pid), 'recipient_kind','htl'),
      jsonb_build_object('ROUND', r.round), t0);
    n := n + 1;
    names := names || (select name from partners where id = pid);
  end loop;

  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo)
  values (r.id, t0, 'operator', '운영자', nullif(auth.uid()::text,'')::uuid, '호텔 ' || n || '곳 초대 (' || array_to_string(names, ', ') || ')');

  return private.rfp_to_json(r.id);
end;
$$;
revoke all on function admin_invite(text,text[]) from public;
grant execute on function admin_invite(text,text[]) to authenticated;

create or replace function admin_reinvite(p_ref text, p_invitation_id uuid) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare r rfps%rowtype; old invitations%rowtype; new_id uuid; t0 timestamptz := now();
begin
  perform private.require_operator();
  select * into r from rfps where ref = p_ref for update;
  if r.id is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
  select * into old from invitations where id = p_invitation_id and rfp_id = r.id;
  if old.id is null or r.deadline is null then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;

  update invitations set status = 'reinvited', reinvited_from = old.id where id = old.id;
  insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at, reinvited_from)
    values (r.id, old.partner_id, r.round, 'invited', encode(gen_random_bytes(24),'base64'), r.deadline, t0, old.id)
    returning id into new_id;
  update invitations set token = replace(replace(replace(token,'+','-'),'/','_'),'=','') where id = new_id;

  perform private.enqueue('HTL_INVITE', 'HTL_INVITE:' || new_id,
    jsonb_build_object('rfp_id', r.id, 'partner_id', old.partner_id, 'invitation_id', new_id,
      'to_email', (select contact_email from partners where id = old.partner_id), 'recipient_kind','htl'),
    jsonb_build_object('ROUND', r.round, 'PREV_DEADLINE', old.deadline), t0);

  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo)
  values (r.id, t0, 'operator', '운영자', nullif(auth.uid()::text,'')::uuid, '재초대 · 새 마감 ' || t0);

  return private.rfp_to_json(r.id);
end;
$$;
revoke all on function admin_reinvite(text,uuid) from public;
grant execute on function admin_reinvite(text,uuid) to authenticated;

create or replace function admin_mark_selection(p_ref text, p_invitation_id uuid, p_sel text) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare rid uuid; v_result invitation_result;
begin
  perform private.require_operator();
  select id into rid from rfps where ref = p_ref;
  if rid is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
  v_result := case p_sel when 'selected' then 'selected'::invitation_result when 'notselected' then 'not_selected'::invitation_result else null end;
  update invitations set result = v_result where id = p_invitation_id and rfp_id = rid;
  return private.rfp_to_json(rid);
end;
$$;
revoke all on function admin_mark_selection(text,uuid,text) from public;
grant execute on function admin_mark_selection(text,uuid,text) to authenticated;

create or replace function admin_quote_update(p_quote_id uuid, p_patch jsonb) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare rid uuid;
begin
  perform private.require_operator();
  select rfp_id into rid from quotes where id = p_quote_id;
  if rid is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  update quotes set
    usd_ref = coalesce(nullif(p_patch->>'usdRef','')::numeric, usd_ref),
    usd_date = coalesce(nullif(p_patch->>'usdDate','')::date, usd_date),
    tax_rate_pct = coalesce(nullif(p_patch->>'taxRatePct','')::numeric, tax_rate_pct),
    op_memo = coalesce(p_patch->>'opMemo', op_memo),
    updated_at = now()
  where id = p_quote_id;
  return private.rfp_to_json(rid);
end;
$$;
revoke all on function admin_quote_update(uuid,jsonb) from public;
grant execute on function admin_quote_update(uuid,jsonb) to authenticated;

create or replace function admin_invitation_flag(p_invitation_id uuid, p_inaccurate boolean) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare rid uuid;
begin
  perform private.require_operator();
  select rfp_id into rid from invitations where id = p_invitation_id;
  if rid is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  update invitations set inaccurate = p_inaccurate where id = p_invitation_id;
  return private.rfp_to_json(rid);
end;
$$;
revoke all on function admin_invitation_flag(uuid,boolean) from public;
grant execute on function admin_invitation_flag(uuid,boolean) to authenticated;

create or replace function admin_add_note(p_ref text, p_memo text) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare rid uuid;
begin
  perform private.require_operator();
  select id into rid from rfps where ref = p_ref;
  if rid is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo)
    values (rid, now(), 'operator', '운영자', nullif(auth.uid()::text,'')::uuid, p_memo);
  return private.rfp_to_json(rid);
end;
$$;
revoke all on function admin_add_note(text,text) from public;
grant execute on function admin_add_note(text,text) to authenticated;

create or replace function admin_partner_transition(p_code text, p_action text, p_reason text default null, p_note text default null, p_memo text default null) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare
  p partners%rowtype; allowed text[]; t0 timestamptz := now(); memo text; oid uuid := nullif(auth.uid()::text,'')::uuid;
begin
  perform private.require_operator();
  select * into p from partners where code = p_code for update;
  if p.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  allowed := case p.state
    when 'pending' then array['reviewing','approved','rejected']
    when 'reviewing' then array['approved','rejected']
    when 'approved' then array['suspended']
    when 'suspended' then array['approved']
    else array[]::text[] end;
  if not (p_action = any(allowed)) then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;

  if p_action = 'approved' then
    if not ( coalesce((p.check_->>'exists')::boolean,false) and coalesce((p.check_->>'capOk')::boolean,false) and coalesce((p.check_->>'contactOk')::boolean,false) ) then
      raise exception using errcode='P0001', message='MG:VALIDATION';
    end if;
    memo := coalesce(p_memo, '체크리스트 완료');
  elsif p_action = 'rejected' then
    if p_reason is null or trim(p_reason) = '' then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
    memo := p_reason || case when p_note is not null and p_note <> '' then ' · '||p_note else '' end;
  elsif p_action = 'suspended' then
    if p_reason is null or trim(p_reason) = '' then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
    memo := p_reason || case when p_note is not null and p_note <> '' then ' · '||p_note else '' end;
  else
    memo := coalesce(p_memo,'');
  end if;

  insert into partner_history(partner_id, at, actor, actor_label, operator_id, from_state, to_state, memo)
    values (p.id, t0, 'operator', '운영자', oid, p.state::text, p_action, memo);
  update partners set state = p_action::partner_state, reviewed_at = case when p_action in ('approved','rejected') then t0 else reviewed_at end, updated_at = t0 where id = p.id;

  if p_action = 'approved' then
    perform private.enqueue('PTN_APPROVED', 'PTN_APPROVED:' || p.id || ':' || extract(epoch from t0),
      jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind','ptn'), '{}'::jsonb, t0);
  elsif p_action = 'rejected' then
    perform private.enqueue('PTN_REJECTED', 'PTN_REJECTED:' || p.id,
      jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind','ptn'), jsonb_build_object('REASON', memo), t0);
  end if;
  if p_action = 'approved' and p.state = 'suspended' then
    perform private.enqueue('PTN_REINSTATED', 'PTN_REINSTATED:' || p.id || ':' || extract(epoch from t0),
      jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind','ptn'), '{}'::jsonb, t0);
  end if;

  return private.partner_to_json(p.id);
end;
$$;
revoke all on function admin_partner_transition(text,text,text,text,text) from public;
grant execute on function admin_partner_transition(text,text,text,text,text) to authenticated;

create or replace function admin_partner_update(p_code text, p_patch jsonb) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare pid uuid;
begin
  perform private.require_operator();
  select id into pid from partners where code = p_code;
  if pid is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  update partners set
    check_ = coalesce(p_patch->'check', check_),
    profile = coalesce(p_patch->'profile', profile),
    dest = coalesce(p_patch->>'dest', dest),
    cap = coalesce(nullif(p_patch->>'cap','')::int, cap),
    description = coalesce(p_patch->>'description', description),
    updated_at = now()
  where id = pid;
  return private.partner_to_json(pid);
end;
$$;
revoke all on function admin_partner_update(text,jsonb) from public;
grant execute on function admin_partner_update(text,jsonb) to authenticated;

create or replace function admin_link_decide(p_id uuid, p_decision text, p_reason text default null) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare lr link_requests%rowtype; oid uuid := nullif(auth.uid()::text,'')::uuid;
begin
  perform private.require_operator();
  select * into lr from link_requests where id = p_id for update;
  if lr.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  if p_decision not in ('approve','reject') then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;

  update link_requests set status = case p_decision when 'approve' then 'approved' else 'rejected' end::link_status,
    decided_at = now(), decided_by = oid, reason = p_reason
  where id = p_id;

  if p_decision = 'approve' then
    update rfps set owner_id = lr.member_id, updated_at = now() where id = lr.rfp_id;
    perform private.enqueue('ACC_LINKED', 'ACC_LINKED:' || p_id,
      jsonb_build_object('member_id', lr.member_id, 'to_email', (select email from members where id = lr.member_id), 'recipient_kind','mem'),
      jsonb_build_object('LINKED_COUNT', 1), now());
  end if;

  return jsonb_build_object('id', lr.id, 'status', p_decision);
end;
$$;
revoke all on function admin_link_decide(uuid,text,text) from public;
grant execute on function admin_link_decide(uuid,text,text) to authenticated;

create or replace function admin_holiday_add(p_day date, p_name text) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
begin
  perform private.require_operator();
  insert into kr_holidays(day, name) values (p_day, p_name) on conflict (day) do update set name = excluded.name;
  return jsonb_build_object('day', p_day, 'name', p_name);
end;
$$;
revoke all on function admin_holiday_add(date,text) from public;
grant execute on function admin_holiday_add(date,text) to authenticated;

create or replace function admin_holiday_delete(p_day date) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
begin
  perform private.require_operator();
  delete from kr_holidays where day = p_day;
  return jsonb_build_object('deleted', true);
end;
$$;
revoke all on function admin_holiday_delete(date) from public;
grant execute on function admin_holiday_delete(date) to authenticated;

create or replace function admin_delivery_resolve(p_log_id bigint, p_manual boolean) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
begin
  perform private.require_operator();
  update notification_log set manual_resolved_at = case when p_manual then now() else null end,
    manual_resolved_by = case when p_manual then nullif(auth.uid()::text,'')::uuid else null end
  where id = p_log_id;
  return jsonb_build_object('resolved', p_manual);
end;
$$;
revoke all on function admin_delivery_resolve(bigint,boolean) from public;
grant execute on function admin_delivery_resolve(bigint,boolean) to authenticated;

create or replace function admin_resend(p_log_id bigint) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
begin
  perform private.require_operator();
  update notification_log set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null
  where id = p_log_id;
  return jsonb_build_object('requeued', true);
end;
$$;
revoke all on function admin_resend(bigint) from public;
grant execute on function admin_resend(bigint) to authenticated;

-- ---------- admin_member_action helper RPC (Edge Function calls this for the DB side) ----------
-- public 스키마에 두되 service_role 에만 실행 권한을 준다 (PostgREST 는 private 스키마를 노출하지 않으므로).
create or replace function public._admin_member_action(p_member_id uuid, p_action text, p_reason text, p_note text, p_operator_id uuid, p_rfp_ref text default null, p_to_email text default null)
returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare
  m members%rowtype; t0 timestamptz := now(); rid uuid; label text; memo text;
begin
  select * into m from members where id = p_member_id for update;
  if m.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  memo := coalesce(p_reason,'') || case when p_note is not null and p_note <> '' then ' · '||p_note else '' end;

  if p_action = 'unlock' then
    if m.state <> 'locked' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    update members set state = 'active', locked_at = null where id = m.id;
    label := '잠금 해제';
  elsif p_action = 'suspend' then
    if m.state <> 'active' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    update members set state = 'suspended', suspended_at = t0 where id = m.id;
    label := '이용 정지';
  elsif p_action = 'unsuspend' then
    if m.state <> 'suspended' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    update members set state = 'active', suspended_at = null where id = m.id;
    label := '정지 해제';
  elsif p_action = 'resend' then
    if m.state <> 'pending_email' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    label := '인증 메일 재발송';
  elsif p_action = 'revoke' then
    label := '모든 세션 종료';
  elsif p_action = 'transfer' then
    if p_rfp_ref is null then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
    select id into rid from rfps where ref = p_rfp_ref and owner_id = m.id;
    if rid is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
    label := '요청 이관';
    insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo) values (rid, t0, 'operator', '운영자', p_operator_id, '이관: ' || memo);
  elsif p_action = 'withdraw' then
    if m.state <> 'active' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    if exists (select 1 from rfps where owner_id = m.id and state in ('bidding','collecting','delivered')) then
      raise exception using errcode='P0001', message='MG:WITHDRAW_BLOCKED';
    end if;
    update rfps set state = 'cancelled', close_reason = '회원 탈퇴', closed_at = t0 where owner_id = m.id and state in ('received','verifying','open');
    update rfp_tokens set state = 'disabled' where rfp_id in (select id from rfps where owner_id = m.id) and kind = 'share' and state = 'active';
    update rfp_tokens set state = 'revoked' where rfp_id in (select id from rfps where owner_id = m.id) and kind = 'track' and state = 'active';
    update rfps set contact_name = null, contact_email = null, contact_phone = null
      where owner_id = m.id and not exists (select 1 from selections where rfp_id = rfps.id);
    update members set state = 'withdrawn', withdrawn_at = t0, name = null, email = null, phone = null where id = m.id;
    label := '탈퇴 처리';
  else
    raise exception using errcode='P0001', message='MG:BAD_REQUEST';
  end if;

  insert into audit_log(actor, operator_id, member_id, action, label, reason, meta)
    values ('operator', p_operator_id, m.id, p_action, label, memo, jsonb_build_object('rfp_ref', p_rfp_ref, 'to_email', p_to_email));

  select * into m from members where id = p_member_id;
  return jsonb_build_object('member', jsonb_build_object('id', m.id, 'state', m.state, 'name', m.name, 'email', m.email));
end;
$$;
revoke all on function public._admin_member_action(uuid,text,text,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public._admin_member_action(uuid,text,text,text,uuid,text,text) to service_role;
