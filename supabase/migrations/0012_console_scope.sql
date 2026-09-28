-- MICEGO 0012: 콘솔 RPC를 역할 기반으로 전환 — 파트너는 배정된 RFP·자기 지역 호텔만  - 클로드
-- 0005 의 admin_* 를 같은 시그니처로 재정의한다(콘솔 호환). 운영자 동작은 그대로, 파트너는 스코프 안에서만.
set search_path = public;

-- 파트너 표시용 라벨
create or replace function private.actor_label(me console_user) returns text
language sql stable as $$
  select case when me.role = 'operator' then '운영자'
              else '파트너 · ' || coalesce((select display_name from partner_org where id = me.partner_id), '') || ' · ' || coalesce(me.display_name,'') end
$$;

-- 최근 이력 행의 actor_label 을 파트너 표기로 교체 (rfp_transition 이 '운영자'로 남긴 것)
create or replace function private.relabel_last_history(p_rfp_id uuid, me console_user) returns void
language plpgsql as $$
begin
  if me.role <> 'operator' then
    update rfp_history set actor_label = private.actor_label(me) where id = (select max(id) from rfp_history where rfp_id = p_rfp_id and operator_id = me.user_id);
  end if;
end $$;

-- ---------- rfp_to_json: 파트너 필드 추가 + 파트너에게는 신원 마스킹 ----------
create or replace function private.rfp_to_json(p_id uuid) returns jsonb
language plpgsql stable as $$
declare
  r rfps%rowtype; trk text; invs jsonb; qts jsonb; hist jsonb; po partner_org%rowtype; asg jsonb; is_op boolean; organizer jsonb;
begin
  select * into r from rfps where id = p_id;
  if r.id is null then return null; end if;
  is_op := public.is_operator();
  select token into trk from rfp_tokens where rfp_id = p_id and kind = 'track' and state = 'active' limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'hotelId', p.code, 'hotel', p.name, 'email', p.contact_email,
    'status', i.status, 'round', i.round, 'viewedAt', i.viewed_at, 'submittedAt', i.submitted_at,
    'sel', case i.result when 'selected' then 'selected' when 'not_selected' then 'notselected' else null end,
    'note', i.note, 'deadline', i.deadline,
    'proxyQuoteId', i.proxy_quote_id, 'confirmSentAt', i.confirm_sent_at, 'confirmExpiresAt', i.confirm_token_expires_at,
    'disputedAt', i.disputed_at, 'disputeReason', i.dispute_reason
  ) order by i.invited_at), '[]'::jsonb) into invs
  from invitations i join partners p on p.id = i.partner_id where i.rfp_id = p_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'invId', q.invitation_id, 'round', q.round, 'label', q.label, 'currency', q.currency,
    'twin', q.twin_rate, 'king', q.king_rate,
    'tax', case when q.tax_included then '포함' else coalesce(q.tax_note,'') end,
    'breakfast', case when q.breakfast_included then '포함' else '별도' end,
    'validUntil', q.valid_until, 'cancel', q.cancellation, 'usdRef', q.usd_ref, 'usdDate', q.usd_date,
    'enteredBy', q.entered_by, 'proxyEnteredAt', q.proxy_entered_at, 'confirmedAt', q.confirmed_at, 'supersededBy', q.superseded_by, 'evidenceNote', q.proxy_evidence_note,
    'comparable', (q.superseded_by is null and (q.entered_by = 'hotel' or q.confirmed_at is not null))
  ) order by q.submitted_at), '[]'::jsonb) into qts
  from quotes q where q.rfp_id = p_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    't', h.at, 'actor', h.actor_label, 'from', h.from_state, 'to', h.to_state, 'memo', h.memo
  ) order by h.at), '[]'::jsonb) into hist
  from rfp_history h where h.rfp_id = p_id;

  if r.partner_org_id is not null then select * into po from partner_org where id = r.partner_org_id; end if;
  select coalesce(jsonb_agg(jsonb_build_object('t', e.created_at, 'action', e.action, 'from', (select code from partner_org where id = e.from_partner), 'to', (select code from partner_org where id = e.to_partner),
    'reason', e.reason, 'payload', e.payload) order by e.created_at), '[]'::jsonb) into asg from rfp_assignment_event e where e.rfp_id = p_id;

  -- 신원: 운영자는 그대로, 파트너는 마스킹(상세 열람은 rfp_get_identity 로 로그를 남기며 조회)
  if is_op then
    organizer := jsonb_build_object('company', r.company, 'contact', r.contact_name, 'email', r.contact_email, 'phone', r.contact_phone, 'budget', coalesce(r.budget_note, '미기재'));
  else
    organizer := jsonb_build_object('company', case when r.company is null then null else left(r.company, 1) || '**' end, 'contact', null, 'email', null, 'phone', null, 'budget', coalesce(r.budget_note, '미기재'), 'masked', true);
  end if;

  return jsonb_build_object(
    'id', r.ref, 'token', case when is_op then trk else null end, 'state', r.state, 'round', r.round,
    'createdAt', r.created_at, 'verifyingAt', r.verifying_at,
    'destination', coalesce(r.destination, r.region), 'eventType', r.event_type,
    'headcount', coalesce(r.headcount, 0), 'start', r.start_date, 'end', r.end_date,
    'twin', r.twin_rooms, 'king', r.king_rooms,
    'ballroom', coalesce(r.ballroom_note, case when r.ballroom_use then '필요 · ' || coalesce(r.ballroom_purpose,'') else '불필요' end),
    'publicMemo', r.public_memo, 'rawMemo', r.note,
    'organizer', organizer,
    'anonReviewed', r.anon_reviewed, 'anonAt', r.anon_at, 'deadline', r.deadline,
    'invitations', invs, 'quotes', qts, 'connectDone', to_jsonb(r.connect_done),
    'history', hist, 'ownerId', case when is_op then r.owner_id else null end, 'pickOtp', case when is_op then r.pick_otp else null end,
    'regionCode', r.region_code, 'regionSource', r.region_source, 'delegation', r.delegation, 'holdReason', r.hold_reason,
    'partner', case when po.id is null then null else jsonb_build_object('code', po.code, 'name', po.display_name, 'status', po.status) end,
    'delegatedAt', r.delegated_at, 'takenOverAt', r.taken_over_at, 'takeoverReason', r.takeover_reason, 'shareOverridePct', r.partner_share_override_pct,
    'rowVersion', r.row_version, 'assignments', asg,
    'identityViews', (select count(*) from identity_view_log v where v.rfp_id = p_id)
  );
end;
$$;

create or replace function private.partner_to_json(p_id uuid) returns jsonb
language plpgsql stable as $$
declare p partners%rowtype; hist jsonb;
begin
  select * into p from partners where id = p_id;
  if p.id is null then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('t', h.at, 'actor', h.actor_label, 'from', h.from_state, 'to', h.to_state, 'memo', h.memo) order by h.at), '[]'::jsonb) into hist
  from partner_history h where h.partner_id = p_id;
  return jsonb_build_object(
    'id', p.code, 'name', p.name, 'dest', p.dest, 'cap', p.cap, 'ballroom', p.banquet,
    'email', p.contact_email, 'status', p.state, 'appliedAt', p.applied_at,
    'hotelLocation', p.location, 'hotelDomain', p.domain, 'capBand', p.cap_band,
    'contactName', p.contact_name, 'contactPhone', p.contact_phone, 'description', p.description,
    'check', p.check_, 'history', hist, 'optOutAt', p.invite_opt_out_at,
    'regionCode', p.region_code, 'sourcedBy', (select code from partner_org where id = p.sourced_by_partner),
    'approvedVia', p.approved_via, 'approvedAt', p.approved_at, 'hqReviewedAt', p.hq_reviewed_at, 'riskFlags', to_jsonb(p.risk_flags),
    'emailVerifiedAt', p.contact_email_verified_at
  );
end;
$$;

-- ---------- admin_snapshot: 역할별 스코프 ----------
create or replace function admin_snapshot() returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare
  me console_user%rowtype;
  out_rfps jsonb; out_partners jsonb; out_members jsonb; out_share jsonb; out_link jsonb;
  out_audit jsonb; out_mlog jsonb; out_send jsonb; out_fail jsonb; out_hol jsonb; out_arch jsonb;
  out_inacc jsonb; out_metrics jsonb; out_orgs jsonb; out_alerts jsonb; out_settle jsonb;
  win timestamptz := now() - interval '180 days';
  pid uuid;
begin
  me := private.require_console(null);
  pid := me.partner_id;

  if me.role = 'operator' then
    select coalesce(jsonb_agg(private.rfp_to_json(r.id) order by r.created_at desc), '[]'::jsonb) into out_rfps
    from rfps r where r.state not in ('won','lost','rejected','cancelled') or r.closed_at > win or r.created_at > win;
    select coalesce(jsonb_agg(private.partner_to_json(p.id) order by p.applied_at desc), '[]'::jsonb) into out_partners from partners p;
  else
    select coalesce(jsonb_agg(private.rfp_to_json(r.id) order by r.created_at desc), '[]'::jsonb) into out_rfps
    from rfps r where r.partner_org_id = pid and r.delegation in ('delegated','taken_over') and (r.state not in ('won','lost','rejected','cancelled') or r.closed_at > win or r.created_at > win);
    select coalesce(jsonb_agg(private.partner_to_json(p.id) order by p.applied_at desc), '[]'::jsonb) into out_partners
    from partners p where public.region_is_mine(p.region_code) or p.sourced_by_partner = pid;
  end if;

  if me.role = 'operator' then
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
    ) order by m.created_at desc), '[]'::jsonb) into out_members from members m;

    select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'rfpId', (select ref from rfps where id = l.rfp_id), 'memberId', l.created_by,
      'token', l.token, 'status', l.state, 'createdAt', l.created_at, 'revokedAt', l.revoked_at, 'views', l.views, 'lastViewedAt', l.last_viewed_at)), '[]'::jsonb)
    into out_share from rfp_tokens l where l.kind = 'share';
    select coalesce(jsonb_agg(jsonb_build_object('id', lr.id, 'memberId', lr.member_id, 'matchType', lr.match_type, 'requestedAt', lr.requested_at, 'status', lr.status,
      'ref', jsonb_build_object('id', r3.ref, 'title', coalesce(r3.destination,r3.region)||' · '||coalesce(r3.event_type,''), 'state', r3.state, 'createdAt', r3.created_at))), '[]'::jsonb)
    into out_link from link_requests lr join rfps r3 on r3.id = lr.rfp_id;
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'memberId', a.member_id, 't', a.at, 'actor',
      case a.actor when 'operator' then '운영자' when 'system' then '시스템' else a.actor::text end,
      'action', a.action, 'label', a.label, 'reason', a.reason, 'notif', a.notif) order by a.at), '[]'::jsonb)
    into out_audit from audit_log a where a.member_id is not null;
    select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'memberId', d.member_id, 't', d.scheduled_at, 'template',
      coalesce((select tm.name from notif_template_meta tm where tm.id = d.template_id), d.template_id) || ' ' || d.template_id, 'to', d.to_email, 'status', d.status) order by d.scheduled_at), '[]'::jsonb)
    into out_mlog from notification_log d where d.member_id is not null;
    select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'to', d.to_addr, 'template', l.template_id || ' ' || coalesce((select tm.name from notif_template_meta tm where tm.id = l.template_id), ''),
      'at', d.sent_at, 'rfpId', (select ref from rfps where id = l.rfp_id), 'status', d.status, 'cc', l.cc_email) order by d.sent_at desc), '[]'::jsonb)
    into out_send from notification_deliveries d join notification_log l on l.id = d.log_id where d.channel = 'email' and d.status in ('sent','delivered');
    select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'to', l.to_email, 'template', l.template_id || ' ' || coalesce((select tm.name from notif_template_meta tm where tm.id = l.template_id), ''),
      'at', l.scheduled_at, 'rfpId', (select ref from rfps where id = l.rfp_id), 'manual', l.manual_resolved_at is not null)), '[]'::jsonb)
    into out_fail from notification_log l where l.status = 'failed';
    select coalesce(jsonb_agg(private.partner_org_to_json(po.id) order by po.created_at), '[]'::jsonb) into out_orgs from partner_org po;
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'rfpId', (select ref from rfps where id = a.rfp_id), 'settlementId', a.settlement_id, 'partner', (select code from partner_org where id = a.partner_id),
      'kind', a.kind, 'severity', a.severity, 'detail', a.detail, 'openedAt', a.opened_at, 'snoozedUntil', a.snoozed_until) order by a.severity, a.opened_at), '[]'::jsonb)
    into out_alerts from intervention_alert a where a.resolved_at is null;
  else
    out_members := '[]'::jsonb; out_share := '[]'::jsonb; out_link := '[]'::jsonb; out_audit := '[]'::jsonb; out_mlog := '[]'::jsonb;
    -- 파트너에게는 발송 내역의 오거나이저 주소를 가린다
    select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'to', case when l.recipient_kind = 'org' then '오거나이저(비공개)' else d.to_addr end,
      'template', l.template_id || ' ' || coalesce((select tm.name from notif_template_meta tm where tm.id = l.template_id), ''),
      'at', d.sent_at, 'rfpId', (select ref from rfps where id = l.rfp_id), 'status', d.status) order by d.sent_at desc), '[]'::jsonb)
    into out_send from notification_deliveries d join notification_log l on l.id = d.log_id join rfps r on r.id = l.rfp_id
    where d.channel = 'email' and d.status in ('sent','delivered') and r.partner_org_id = pid and r.delegation in ('delegated','taken_over');
    out_fail := '[]'::jsonb;
    select coalesce(jsonb_agg(private.partner_org_to_json(po.id)), '[]'::jsonb) into out_orgs from partner_org po where po.id = pid;
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'rfpId', (select ref from rfps where id = a.rfp_id), 'settlementId', a.settlement_id, 'partner', (select code from partner_org where id = a.partner_id),
      'kind', a.kind, 'severity', a.severity, 'detail', a.detail, 'openedAt', a.opened_at) order by a.severity, a.opened_at), '[]'::jsonb)
    into out_alerts from intervention_alert a where a.resolved_at is null and a.partner_id = pid and a.kind in ('partner_idle','sla_breach','proxy_disputed','settlement_overdue');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('date', h.day, 'name', h.name) order by h.day), '[]'::jsonb) into out_hol from kr_holidays h;

  select coalesce(jsonb_agg(jsonb_build_object('rfpId', rr.ref, 'round', i.round, 'hotelId', p.code, 'invitedAt', i.invited_at, 'status', i.status, 'submittedAt', i.submitted_at, 'inaccurate', coalesce(i.inaccurate,false))), '[]'::jsonb)
  into out_arch from invitations i join partners p on p.id = i.partner_id join rfps rr on rr.id = i.rfp_id
  where rr.closed_at is not null and rr.closed_at <= win and (me.role = 'operator' or rr.partner_org_id = pid);

  select coalesce(jsonb_object_agg(rr.ref || '|' || i.round || '|' || p.code, i.inaccurate), '{}'::jsonb)
  into out_inacc from invitations i join partners p on p.id = i.partner_id join rfps rr on rr.id = i.rfp_id where i.inaccurate is not null and (me.role = 'operator' or rr.partner_org_id = pid);

  out_metrics := jsonb_build_object(
    'month', to_char(now(),'YYYY-MM'),
    'base', (select count(*) from rfps where created_at >= date_trunc('month', now()) and (me.role = 'operator' or partner_org_id = pid)),
    'items', jsonb_build_array(
      jsonb_build_object('key','sla','name','SLA 준수율','value',
        (select case when count(*) filter (where state in ('verifying','open')) = 0 then '100%'
          else round(100.0 * count(*) filter (where sla_due_at is null or sla_due_at >= now() or state not in ('verifying','open')) / greatest(count(*),1))::text || '%' end
         from rfps where created_at >= date_trunc('month', now()) and (me.role = 'operator' or partner_org_id = pid)),
        'sub','자동 계산','target','기준 90% 이상','met', null),
      jsonb_build_object('key','lead','name','접수→전달 소요일','value',
        (select coalesce(round(avg(extract(epoch from delivered_at - created_at)) / 86400)::text,'—') || '영업일' from rfps where delivered_at is not null and created_at >= date_trunc('month', now()) and (me.role = 'operator' or partner_org_id = pid)),
        'sub','평균','target','기준 7영업일 이하','met', null)
    )
  );

  out_settle := private.settlements_json(me);

  return jsonb_build_object(
    'tick', 0, 'rfps', out_rfps, 'partners', out_partners, 'invArchive', out_arch, 'inaccMarks', out_inacc,
    'holidays', out_hol, 'sendLog', out_send, 'members', out_members, 'shareLinks', out_share,
    'linkRequests', out_link, 'memberAudit', out_audit, 'memberLog', out_mlog, 'failures', out_fail, 'metrics', out_metrics,
    'me', console_whoami(), 'partnerOrgs', out_orgs, 'interventions', out_alerts, 'settlements', out_settle
  );
end;
$$;

-- settlements_json 은 0014 에서 정의. 여기서는 빈 배열 스텁을 두어 순서 의존을 끊는다.
create or replace function private.settlements_json(me console_user) returns jsonb
language sql stable as $$ select '[]'::jsonb $$;

-- ---------- RFP 단위 RPC: require_console + assert_rfp_write ----------
create or replace function private.rfp_for_write(p_ref text, out r rfps, out me console_user, out hq_override boolean)
language plpgsql as $$
begin
  me := private.require_console(null);
  select * into r from rfps where ref = p_ref for update;
  if r.id is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
  hq_override := private.assert_rfp_write(r, me);
end $$;

create or replace function private.rfp_for_read(p_ref text, out r rfps, out me console_user)
language plpgsql as $$
begin
  me := private.require_console(null);
  select * into r from rfps where ref = p_ref;
  if r.id is null or not public.can_read_rfp(r.id) then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
end $$;

create or replace function admin_rfp(p_ref text) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record;
begin
  select * into x from private.rfp_for_read(p_ref);
  return private.rfp_to_json((x.r).id);
end $$;

create or replace function admin_transition(p_ref text, p_action text, p_reason text default null, p_note text default null, p_memo text default null) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; r rfps%rowtype;
begin
  select * into x from private.rfp_for_write(p_ref);
  -- 파트너 담당자는 rejected/cancelled 불가(관리자만)
  if (x.me).role = 'partner_member' and p_action in ('rejected','cancelled') then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
  r := private.rfp_transition((x.r).id, p_action, 'operator', (x.me).user_id, p_reason, p_note, p_memo);
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

create or replace function admin_rfp_update(p_ref text, p_patch jsonb) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; rid uuid; t0 timestamptz := now(); changes text[] := '{}';
begin
  select * into x from private.rfp_for_write(p_ref); rid := (x.r).id;
  if p_patch ? 'deadline' then update rfps set deadline = nullif(p_patch->>'deadline','')::timestamptz, updated_at = t0 where id = rid; changes := array_append(changes, '마감일시 변경'); end if;
  if p_patch ? 'publicMemo' then update rfps set public_memo = p_patch->>'publicMemo', updated_at = t0 where id = rid; changes := array_append(changes, '공개 메모 수정'); end if;
  if p_patch ? 'anonReviewed' then update rfps set anon_reviewed = (p_patch->>'anonReviewed')::boolean, anon_at = case when (p_patch->>'anonReviewed')::boolean then t0 else null end, updated_at = t0 where id = rid; changes := array_append(changes, '익명화 검토 표시'); end if;
  if p_patch ? 'destination' then update rfps set destination = p_patch->>'destination', updated_at = t0 where id = rid; changes := array_append(changes, '목적지 수정'); end if;
  if p_patch ? 'headcount' then update rfps set headcount = nullif(p_patch->>'headcount','')::int, updated_at = t0 where id = rid; changes := array_append(changes, '인원 수정'); end if;
  if p_patch ? 'ballroom_note' then update rfps set ballroom_note = p_patch->>'ballroom_note', updated_at = t0 where id = rid; changes := array_append(changes, '볼룸 메모 수정'); end if;
  if p_patch ? 'budget_note' then update rfps set budget_note = p_patch->>'budget_note', updated_at = t0 where id = rid; changes := array_append(changes, '예산 메모 수정'); end if;
  if array_length(changes,1) > 0 then
    update rfps set row_version = row_version + 1 where id = rid;
    insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo) values (rid, t0, 'operator', private.actor_label(x.me), (x.me).user_id, array_to_string(changes, ', '));
    perform private.audit('rfp', p_ref, 'update', null, p_patch, rid, x.hq_override);
  end if;
  return private.rfp_to_json(rid);
end $$;

create or replace function admin_invite(p_ref text, p_partner_codes text[]) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; r rfps%rowtype; pid uuid; hp partners%rowtype; v_code text; inv_id uuid; t0 timestamptz := now(); n int := 0; names text[] := '{}'; skipped text[] := '{}';
begin
  select * into x from private.rfp_for_write(p_ref); r := x.r;
  if not r.anon_reviewed or r.deadline is null then raise exception using errcode='P0001', message='MG:GUARD_ANON'; end if;
  if r.state not in ('open','bidding') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  foreach v_code in array p_partner_codes loop
    select * into hp from partners where partners.code = v_code and state = 'approved' and invite_opt_out_at is null;
    if hp.id is null then continue; end if;
    -- 파트너는 RFP 지역 안의 호텔만 초대 (지역 밖 호텔은 HQ가 초대)
    if (x.me).role <> 'operator' and not (public.region_covers(r.region_code, hp.region_code) or public.region_covers(hp.region_code, r.region_code) or hp.sourced_by_partner = (x.me).partner_id) then
      skipped := skipped || hp.name; continue;
    end if;
    pid := hp.id;
    if exists (select 1 from invitations where rfp_id = r.id and partner_id = pid and round = r.round and status <> 'reinvited') then continue; end if;
    insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at)
      values (r.id, pid, r.round, 'invited', encode(gen_random_bytes(24),'base64'), r.deadline, t0) returning id into inv_id;
    update invitations set token = replace(replace(replace(token,'+','-'),'/','_'),'=','') where id = inv_id;
    perform private.enqueue('HTL_INVITE', 'HTL_INVITE:' || inv_id,
      jsonb_build_object('rfp_id', r.id, 'partner_id', pid, 'invitation_id', inv_id, 'to_email', hp.contact_email, 'recipient_kind','htl'),
      jsonb_build_object('ROUND', r.round), t0);
    n := n + 1; names := names || hp.name;
  end loop;
  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo)
  values (r.id, t0, 'operator', private.actor_label(x.me), (x.me).user_id, '호텔 ' || n || '곳 초대 (' || array_to_string(names, ', ') || ')' || case when array_length(skipped,1) > 0 then ' · 지역 밖 제외: ' || array_to_string(skipped, ', ') else '' end);
  update rfps set row_version = row_version + 1 where id = r.id;
  perform private.audit('rfp', r.ref, 'invite', null, jsonb_build_object('hotels', to_jsonb(names), 'skipped', to_jsonb(skipped)), r.id, x.hq_override);
  return private.rfp_to_json(r.id);
end $$;

create or replace function admin_reinvite(p_ref text, p_invitation_id uuid) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; r rfps%rowtype; old invitations%rowtype; new_id uuid; t0 timestamptz := now();
begin
  select * into x from private.rfp_for_write(p_ref); r := x.r;
  select * into old from invitations where id = p_invitation_id and rfp_id = r.id;
  if old.id is null or r.deadline is null then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
  update invitations set status = 'reinvited', reinvited_from = old.id where id = old.id;
  insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at, reinvited_from)
    values (r.id, old.partner_id, r.round, 'invited', encode(gen_random_bytes(24),'base64'), r.deadline, t0, old.id) returning id into new_id;
  update invitations set token = replace(replace(replace(token,'+','-'),'/','_'),'=','') where id = new_id;
  perform private.enqueue('HTL_INVITE', 'HTL_INVITE:' || new_id,
    jsonb_build_object('rfp_id', r.id, 'partner_id', old.partner_id, 'invitation_id', new_id, 'to_email', (select contact_email from partners where id = old.partner_id), 'recipient_kind','htl'),
    jsonb_build_object('ROUND', r.round, 'PREV_DEADLINE', old.deadline), t0);
  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo) values (r.id, t0, 'operator', private.actor_label(x.me), (x.me).user_id, '재초대 · 새 마감 ' || t0);
  update rfps set row_version = row_version + 1 where id = r.id;
  perform private.audit('rfp', r.ref, 'reinvite', null, jsonb_build_object('invitation', new_id), r.id, x.hq_override);
  return private.rfp_to_json(r.id);
end $$;

create or replace function admin_mark_selection(p_ref text, p_invitation_id uuid, p_sel text) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; v_result invitation_result;
begin
  select * into x from private.rfp_for_write(p_ref);
  v_result := case p_sel when 'selected' then 'selected'::invitation_result when 'notselected' then 'not_selected'::invitation_result else null end;
  update invitations set result = v_result where id = p_invitation_id and rfp_id = (x.r).id;
  perform private.audit('rfp', p_ref, 'mark_selection', null, jsonb_build_object('invitation', p_invitation_id, 'sel', p_sel), (x.r).id, x.hq_override);
  return private.rfp_to_json((x.r).id);
end $$;

create or replace function admin_quote_update(p_quote_id uuid, p_patch jsonb) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; ref text;
begin
  select r.ref into ref from quotes q join rfps r on r.id = q.rfp_id where q.id = p_quote_id;
  if ref is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  select * into x from private.rfp_for_write(ref);
  -- 운영 보조 필드만 수정 가능(금액·조건은 불변 트리거로 보호됨)
  update quotes set
    usd_ref = coalesce(nullif(p_patch->>'usdRef','')::numeric, usd_ref),
    usd_date = coalesce(nullif(p_patch->>'usdDate','')::date, usd_date),
    tax_rate_pct = coalesce(nullif(p_patch->>'taxRatePct','')::numeric, tax_rate_pct),
    op_memo = coalesce(p_patch->>'opMemo', op_memo),
    updated_at = now()
  where id = p_quote_id;
  perform private.audit('quote', p_quote_id::text, 'op_update', null, p_patch, (x.r).id, x.hq_override);
  return private.rfp_to_json((x.r).id);
end $$;

create or replace function admin_invitation_flag(p_invitation_id uuid, p_inaccurate boolean) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; ref text;
begin
  select r.ref into ref from invitations i join rfps r on r.id = i.rfp_id where i.id = p_invitation_id;
  if ref is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  select * into x from private.rfp_for_write(ref);
  update invitations set inaccurate = p_inaccurate where id = p_invitation_id;
  return private.rfp_to_json((x.r).id);
end $$;

create or replace function admin_add_note(p_ref text, p_memo text) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record;
begin
  select * into x from private.rfp_for_read(p_ref);
  if (x.me).role <> 'operator' then
    if (x.r).partner_org_id is distinct from (x.me).partner_id then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
  end if;
  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo) values ((x.r).id, now(), 'operator', private.actor_label(x.me), (x.me).user_id, p_memo);
  return private.rfp_to_json((x.r).id);
end $$;

-- ---------- 호텔 파트너: 파트너 등록·지역 내 승인 ----------
create or replace function private.hotel_risk_flags(p_email text, p_domain text, p_partner_id uuid) returns text[]
language plpgsql stable as $$
declare f text[] := '{}'; d text; pe text;
begin
  d := lower(split_part(coalesce(p_email,''), '@', 2));
  if d ~ '^(gmail|googlemail|naver|daum|hanmail|kakao|yahoo|hotmail|outlook|live|icloud|msn|proton|protonmail)\.' then f := array_append(f, 'free_mail'); end if;
  if p_domain is not null and d <> '' and lower(regexp_replace(p_domain, '^(https?://)?(www\.)?', '')) !~ ('(^|\.)' || regexp_replace(d, '\.', '\\.', 'g') || '$') and d !~ ('(^|\.)' || regexp_replace(lower(regexp_replace(p_domain, '^(https?://)?(www\.)?', '')), '\.', '\\.', 'g') || '$') then f := array_append(f, 'domain_mismatch'); end if;
  if p_partner_id is not null then
    select lower(split_part(contact_email, '@', 2)) into pe from partner_org where id = p_partner_id;
    if pe is not null and pe <> '' and pe = d then f := array_append(f, 'email_matches_partner'); end if;
    if exists (select 1 from console_user where partner_id = p_partner_id and lower(email) = lower(p_email)) then f := array_append(f, 'email_matches_partner'); end if;
  end if;
  return f;
end $$;

create or replace function partner_hotel_register(p jsonb) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; hp partners%rowtype; v_code text; v_region text; flags text[];
begin
  me := private.require_console(array['operator','partner_admin','partner_member']::console_role[]);
  v_region := p->>'regionCode';
  if v_region is null or not exists (select 1 from region where code = v_region) then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  if me.role <> 'operator' and not public.region_is_mine(v_region) then raise exception using errcode='P0001', message='MG:REGION_MISMATCH'; end if;
  if coalesce(p->>'name','') = '' or coalesce(p->>'contactEmail','') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
  if exists (select 1 from partners where lower(contact_email) = lower(p->>'contactEmail') and state <> 'rejected') then raise exception using errcode='P0001', message='MG:DUPLICATE'; end if;
  v_code := private.next_ref('PT');
  flags := private.hotel_risk_flags(p->>'contactEmail', p->>'domain', me.partner_id);
  insert into partners (code, state, name, location, dest, cap_band, cap, banquet, contact_name, contact_email, contact_phone, domain, description, region_code, sourced_by_partner, risk_flags, source, consent_at)
  values (v_code, 'pending', p->>'name', p->>'location', coalesce(p->>'dest', (select name_ko from region where code = v_region)), p->>'capBand', nullif(p->>'cap','')::int, coalesce((p->>'banquet')::boolean, false),
          p->>'contactName', p->>'contactEmail', p->>'contactPhone', p->>'domain', p->>'description', v_region, me.partner_id, flags,
          jsonb_build_object('via', 'console', 'by', me.user_id), now())
  returning * into hp;
  insert into partner_history(partner_id, at, actor, actor_label, operator_id, from_state, to_state, memo) values (hp.id, now(), 'operator', private.actor_label(me), me.user_id, null, 'pending', '콘솔에서 등록' || case when array_length(flags,1) > 0 then ' · 위험 플래그: ' || array_to_string(flags, ', ') else '' end);
  perform private.audit('hotel', hp.code, 'register', null, jsonb_build_object('region', v_region, 'flags', to_jsonb(flags)), null);
  return private.partner_to_json(hp.id);
end $$;
revoke all on function partner_hotel_register(jsonb) from public; grant execute on function partner_hotel_register(jsonb) to authenticated;

create or replace function admin_partner_transition(p_code text, p_action text, p_reason text default null, p_note text default null, p_memo text default null) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; p partners%rowtype; allowed text[]; t0 timestamptz := now(); memo text;
begin
  me := private.require_console(array['operator','partner_admin']::console_role[]);
  select * into p from partners where code = p_code for update;
  if p.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  if me.role = 'partner_admin' then
    if not (public.region_is_mine(p.region_code) or p.sourced_by_partner = me.partner_id) then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
    if p_action not in ('reviewing','approved') then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
    if p_action = 'approved' and array_length(p.risk_flags,1) > 0 then raise exception using errcode='P0001', message='MG:HOTEL_RISK_HQ_ONLY'; end if;
    if (select status from partner_org where id = me.partner_id) <> 'active' then raise exception using errcode='P0001', message='MG:PARTNER_SUSPENDED'; end if;
  end if;
  allowed := case p.state when 'pending' then array['reviewing','approved','rejected'] when 'reviewing' then array['approved','rejected'] when 'approved' then array['suspended'] when 'suspended' then array['approved'] else array[]::text[] end;
  if not (p_action = any(allowed)) then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  if p_action = 'approved' then
    if not (coalesce((p.check_->>'exists')::boolean,false) and coalesce((p.check_->>'capOk')::boolean,false) and coalesce((p.check_->>'contactOk')::boolean,false)) then
      raise exception using errcode='P0001', message='MG:VALIDATION';
    end if;
    memo := coalesce(p_memo, '체크리스트 완료');
  elsif p_action in ('rejected','suspended') then
    if p_reason is null or trim(p_reason) = '' then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
    memo := p_reason || case when p_note is not null and p_note <> '' then ' · '||p_note else '' end;
  else
    memo := coalesce(p_memo,'');
  end if;
  insert into partner_history(partner_id, at, actor, actor_label, operator_id, from_state, to_state, memo) values (p.id, t0, 'operator', private.actor_label(me), me.user_id, p.state::text, p_action, memo);
  update partners set state = p_action::partner_state,
    reviewed_at = case when p_action in ('approved','rejected') then t0 else reviewed_at end,
    approved_via = case when p_action = 'approved' then (case when me.role = 'operator' then 'hq' else 'partner' end)::hotel_approved_via else approved_via end,
    approved_by = case when p_action = 'approved' then me.user_id else approved_by end,
    approved_at = case when p_action = 'approved' then t0 else approved_at end,
    hq_reviewed_at = case when p_action = 'approved' and me.role = 'operator' then t0 else hq_reviewed_at end,
    hq_reviewed_by = case when p_action = 'approved' and me.role = 'operator' then me.user_id else hq_reviewed_by end,
    updated_at = t0 where id = p.id;
  if p_action = 'approved' then
    perform private.enqueue('PTN_APPROVED', 'PTN_APPROVED:' || p.id || ':' || extract(epoch from t0), jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind','ptn'), '{}'::jsonb, t0);
    if me.role <> 'operator' then perform private.notify_hq('HQ_HOTEL_APPROVED_BY_PARTNER', 'HQ_HOTEL_APPROVED_BY_PARTNER:' || p.id, null, jsonb_build_object('HOTEL', p.name, 'PARTNER', (select display_name from partner_org where id = me.partner_id))); end if;
  elsif p_action = 'rejected' then
    perform private.enqueue('PTN_REJECTED', 'PTN_REJECTED:' || p.id, jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind','ptn'), jsonb_build_object('REASON', memo), t0);
  end if;
  if p_action = 'approved' and p.state = 'suspended' then
    perform private.enqueue('PTN_REINSTATED', 'PTN_REINSTATED:' || p.id || ':' || extract(epoch from t0), jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind','ptn'), '{}'::jsonb, t0);
  end if;
  perform private.audit('hotel', p.code, 'transition:' || p_action, jsonb_build_object('state', p.state), jsonb_build_object('state', p_action), null, false, p_reason);
  return private.partner_to_json(p.id);
end $$;

create or replace function admin_partner_update(p_code text, p_patch jsonb) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; p partners%rowtype;
begin
  me := private.require_console(array['operator','partner_admin','partner_member']::console_role[]);
  select * into p from partners where code = p_code for update;
  if p.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  if me.role <> 'operator' and not (public.region_is_mine(p.region_code) or p.sourced_by_partner = me.partner_id) then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
  update partners set
    check_ = coalesce(p_patch->'check', check_), profile = coalesce(p_patch->'profile', profile), dest = coalesce(p_patch->>'dest', dest),
    cap = coalesce(nullif(p_patch->>'cap','')::int, cap), description = coalesce(p_patch->>'description', description),
    region_code = case when me.role = 'operator' and p_patch ? 'regionCode' then nullif(p_patch->>'regionCode','') else region_code end,
    hq_reviewed_at = case when me.role = 'operator' and coalesce((p_patch->>'hqReviewed')::boolean, false) then coalesce(hq_reviewed_at, now()) else hq_reviewed_at end,
    hq_reviewed_by = case when me.role = 'operator' and coalesce((p_patch->>'hqReviewed')::boolean, false) then coalesce(hq_reviewed_by, me.user_id) else hq_reviewed_by end,
    updated_at = now()
  where id = p.id;
  if me.role = 'operator' and coalesce((p_patch->>'hqReviewed')::boolean, false) and p.hq_reviewed_at is null then
    insert into partner_history(partner_id, at, actor, actor_label, operator_id, memo) values (p.id, now(), 'operator', '운영자', me.user_id, '본사 사후 검토 완료');
    update intervention_alert set resolved_at = now(), resolved_by = me.user_id, resolution = 'dismissed' where kind = 'hotel_unreviewed_won' and resolved_at is null and (detail->>'hotel_id')::uuid = p.id;
  end if;
  return private.partner_to_json(p.id);
end $$;
