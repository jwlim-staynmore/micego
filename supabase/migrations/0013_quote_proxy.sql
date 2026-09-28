-- MICEGO 0013: 호텔 견적 대리 입력 + 호텔 확인 링크  - 클로드
-- 설계 §5. 파트너가 콘솔에서 견적을 대신 입력하면 초대 상태가 proxy_entered 가 되고, 호텔의 MICEGO 등록 연락처로
-- 1회용 확인 토큰(72h)이 간다. 호텔이 확인해야(→ submitted + quotes.confirmed_at) 비교표에 실린다. enum 값 hotel_confirmed 는 예비로만 남긴다. 호텔이 고쳐 내면 '호텔 직접 제출'로 처리.
set search_path = public;

alter table invitations
  add column if not exists confirm_token_sha256 text unique,
  add column if not exists confirm_token_expires_at timestamptz,
  add column if not exists confirm_token_used_at timestamptz,
  add column if not exists confirm_sent_at timestamptz,
  add column if not exists confirm_sent_to citext,
  add column if not exists confirm_remind_count smallint not null default 0,
  add column if not exists proxy_quote_id uuid,
  add column if not exists disputed_at timestamptz,
  add column if not exists dispute_reason text check (dispute_reason is null or length(dispute_reason) <= 1000),
  add column if not exists possible_proxy_as_hotel boolean not null default false;
create index if not exists invitations_confirm8_idx on invitations (left(confirm_token_sha256, 8));
create index if not exists invitations_proxy_exp_idx on invitations (confirm_token_expires_at) where status = 'proxy_entered';

alter table quotes
  add column if not exists entered_by text not null default 'hotel' check (entered_by in ('hotel','partner','operator')),
  add column if not exists entered_by_user uuid,
  add column if not exists entered_by_partner uuid references partner_org(id),
  add column if not exists proxy_entered_at timestamptz,
  add column if not exists proxy_evidence_note text check (proxy_evidence_note is null or length(proxy_evidence_note) between 5 and 1000),
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_via text check (confirmed_via is null or confirmed_via in ('confirm_link')),
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by uuid;
alter table quotes drop constraint if exists quote_entry_shape;
alter table quotes add constraint quote_entry_shape check (
  case entered_by when 'hotel' then entered_by_user is null and proxy_entered_at is null and confirmed_at is null
  else entered_by_user is not null and proxy_entered_at is not null and proxy_evidence_note is not null end);
alter table quotes drop constraint if exists quote_partner_has_org;
alter table quotes add constraint quote_partner_has_org check (entered_by <> 'partner' or entered_by_partner is not null);

-- ---------- 금액 불변: 콘솔(authenticated) 세션은 금액·조건 컬럼을 바꿀 수 없다(호텔 제출 경로=service_role, 대리 입력 RPC=definer만 허용) ----------
create or replace function private.quote_immutable() returns trigger
language plpgsql as $$
declare allowed text[] := array['usd_ref','usd_date','tax_rate_pct','op_memo','label','updated_at','confirmed_at','confirmed_via','superseded_at','superseded_by'];
begin
  if tg_op = 'DELETE' then
    if current_user in ('anon','authenticated') then raise exception using errcode='P0001', message='MG:QUOTE_IMMUTABLE'; end if;
    return old;
  end if;
  if current_user in ('anon','authenticated') or current_setting('mg.quote_guard', true) = 'on' then
    if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
      raise exception using errcode='P0001', message='MG:QUOTE_IMMUTABLE';
    end if;
  end if;
  if old.confirmed_at is not null and new.confirmed_at is distinct from old.confirmed_at and current_setting('mg.quote_reset', true) is distinct from 'on' then
    raise exception using errcode='P0001', message='MG:QUOTE_IMMUTABLE';
  end if;
  return new;
end $$;
drop trigger if exists quotes_immutable on quotes;
create trigger quotes_immutable before update or delete on quotes for each row execute function private.quote_immutable();

-- 비교 가능 견적 (호텔 직접 제출 또는 호텔 확인 완료)
create or replace view v_comparable_quote with (security_invoker = true) as
select q.* from quotes q join invitations i on i.id = q.invitation_id
 where q.superseded_by is null and (q.entered_by = 'hotel' or q.confirmed_at is not null) and i.status in ('submitted','hotel_confirmed');
grant select on v_comparable_quote to authenticated;

-- ---------- 대리 입력 (파트너·운영자) ----------
create or replace function private.gen_token() returns text
language sql volatile as $$ select replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=','') $$;

create or replace function partner_quote_proxy_enter(p_ref text, p_invitation_id uuid, p_quote jsonb, p_evidence_note text) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare
  x record; r rfps%rowtype; inv invitations%rowtype; hp partners%rowtype; q quotes%rowtype; raw text; t0 timestamptz := now(); hrs int; v_min date;
  cur text; twin numeric; king numeric; existing quotes%rowtype;
begin
  select * into x from private.rfp_for_write(p_ref); r := x.r;
  if r.state not in ('open','bidding','collecting') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  select * into inv from invitations where id = p_invitation_id and rfp_id = r.id for update;
  if inv.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  if inv.status not in ('invited','viewed','proxy_entered','proxy_expired','proxy_disputed') then raise exception using errcode='P0001', message='MG:QUOTE_EXISTS'; end if;
  if coalesce(inv.deadline, r.deadline) is not null and coalesce(inv.deadline, r.deadline) <= t0 then raise exception using errcode='P0001', message='MG:DEADLINE_PASSED'; end if;
  select * into hp from partners where id = inv.partner_id;
  if hp.state <> 'approved' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  if p_evidence_note is null or length(btrim(p_evidence_note)) < 5 then raise exception using errcode='P0001', message='MG:GUARD_EVIDENCE'; end if;

  cur := upper(coalesce(p_quote->>'currency','')); twin := nullif(p_quote->>'twinRate','')::numeric; king := nullif(p_quote->>'kingRate','')::numeric;
  if cur !~ '^[A-Z]{3}$' or twin is null or twin < 0 or king is null or king < 0 or coalesce(p_quote->>'ballroomName','') = '' or length(coalesce(p_quote->>'cancellation','')) < 5 or (p_quote->>'validUntil') is null then
    raise exception using errcode='P0001', message='MG:VALIDATION';
  end if;
  v_min := private.due(coalesce(inv.deadline, r.deadline), 2)::date;
  if (p_quote->>'validUntil')::date < v_min then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;

  select * into existing from quotes where invitation_id = inv.id;
  if existing.id is not null and existing.entered_by = 'hotel' then raise exception using errcode='P0001', message='MG:QUOTE_EXISTS'; end if;

  perform set_config('mg.quote_reset', 'on', true);
  if existing.id is null then
    insert into quotes (invitation_id, rfp_id, round, currency, twin_rate, king_rate, breakfast_included, breakfast_supplement, tax_included, tax_note,
      availability_all, availability_notes, ballroom_fee, ballroom_name, fnb_minimum, ballroom_includes, valid_until, cancellation, additional_proposals,
      hotel_name, contact_name, contact_email, contact_phone, revision, submitted_at,
      entered_by, entered_by_user, entered_by_partner, proxy_entered_at, proxy_evidence_note)
    values (inv.id, r.id, inv.round, cur, twin, king, coalesce((p_quote->>'breakfastIncluded')::boolean, (p_quote->>'breakfast') = 'included'), nullif(p_quote->>'breakfastSupplement','')::numeric,
      coalesce((p_quote->>'taxIncluded')::boolean, (p_quote->>'tax') = 'included'), p_quote->>'taxNote',
      coalesce((p_quote->>'availabilityAll')::boolean, coalesce(p_quote->>'availability','all') = 'all'), p_quote->>'availabilityNotes', nullif(p_quote->>'ballroomFee','')::numeric, p_quote->>'ballroomName',
      nullif(p_quote->>'fnbMinimum','')::numeric, p_quote->>'ballroomIncludes', (p_quote->>'validUntil')::date, p_quote->>'cancellation', p_quote->>'additionalProposals',
      coalesce(p_quote->>'hotelName', hp.name), coalesce(p_quote->>'contactName', hp.contact_name), coalesce(p_quote->>'contactEmail', hp.contact_email), coalesce(p_quote->>'contactPhone', hp.contact_phone), 1, t0,
      case when (x.me).role = 'operator' then 'operator' else 'partner' end, (x.me).user_id, (x.me).partner_id, t0, btrim(p_evidence_note))
    returning * into q;
  else
    update quotes set currency = cur, twin_rate = twin, king_rate = king,
      breakfast_included = coalesce((p_quote->>'breakfastIncluded')::boolean, (p_quote->>'breakfast') = 'included'), breakfast_supplement = nullif(p_quote->>'breakfastSupplement','')::numeric,
      tax_included = coalesce((p_quote->>'taxIncluded')::boolean, (p_quote->>'tax') = 'included'), tax_note = p_quote->>'taxNote',
      availability_all = coalesce((p_quote->>'availabilityAll')::boolean, coalesce(p_quote->>'availability','all') = 'all'), availability_notes = p_quote->>'availabilityNotes',
      ballroom_fee = nullif(p_quote->>'ballroomFee','')::numeric, ballroom_name = p_quote->>'ballroomName', fnb_minimum = nullif(p_quote->>'fnbMinimum','')::numeric, ballroom_includes = p_quote->>'ballroomIncludes',
      valid_until = (p_quote->>'validUntil')::date, cancellation = p_quote->>'cancellation', additional_proposals = p_quote->>'additionalProposals',
      revision = revision + 1, submitted_at = t0, updated_at = t0,
      entered_by = case when (x.me).role = 'operator' then 'operator' else 'partner' end, entered_by_user = (x.me).user_id, entered_by_partner = (x.me).partner_id, proxy_entered_at = t0, proxy_evidence_note = btrim(p_evidence_note),
      confirmed_at = null, confirmed_via = null
    where id = existing.id returning * into q;
  end if;
  insert into quote_revisions (quote_id, revision, payload, submitted_at) values (q.id, q.revision, p_quote || jsonb_build_object('_proxy', true, '_by', (x.me).user_id), t0);

  -- 확인 토큰(1회용). 원문은 알림 변수로만 나가고 DB에는 해시만
  raw := private.gen_token();
  select coalesce((value)::int, 72) into hrs from settings where key = 'proxy_confirm_hours';
  update invitations set status = 'proxy_entered', proxy_quote_id = q.id, confirm_token_sha256 = encode(digest(raw, 'sha256'), 'hex'),
    confirm_token_expires_at = t0 + make_interval(hours => coalesce(hrs,72)), confirm_token_used_at = null, confirm_sent_at = t0, confirm_sent_to = hp.contact_email,
    disputed_at = null, dispute_reason = null
  where id = inv.id;

  perform private.enqueue_if_template('HTL_CONFIRM', 'HTL_CONFIRM:' || inv.id || ':' || q.revision,
    jsonb_build_object('rfp_id', r.id, 'partner_id', hp.id, 'invitation_id', inv.id, 'to_email', hp.contact_email, 'recipient_kind', 'htl'),
    jsonb_build_object('CONFIRM_TOKEN', raw, 'ROUND', r.round, 'PARTNER_PUBLIC_NAME', coalesce((select public_name from partner_org where id = (x.me).partner_id), 'MICEGO'), 'EXPIRES_HOURS', coalesce(hrs,72)), r.id);
  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo)
  values (r.id, t0, 'operator', private.actor_label(x.me), (x.me).user_id, hp.name || ' 견적 대리 입력 (rev.' || q.revision || ') · 호텔 확인 요청 발송');
  update rfps set row_version = row_version + 1 where id = r.id;
  perform private.audit('quote', q.id::text, 'proxy_enter', null, jsonb_build_object('invitation', inv.id, 'revision', q.revision), r.id, x.hq_override, p_evidence_note);
  return private.rfp_to_json(r.id);
end $$;
revoke all on function partner_quote_proxy_enter(text,uuid,jsonb,text) from public; grant execute on function partner_quote_proxy_enter(text,uuid,jsonb,text) to authenticated;

create or replace function partner_quote_proxy_resend(p_ref text, p_invitation_id uuid) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; inv invitations%rowtype; hp partners%rowtype; raw text; t0 timestamptz := now(); hrs int; q quotes%rowtype;
begin
  select * into x from private.rfp_for_write(p_ref);
  select * into inv from invitations where id = p_invitation_id and rfp_id = (x.r).id for update;
  if inv.id is null or inv.status not in ('proxy_entered','proxy_expired') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  if inv.confirm_remind_count >= 3 then raise exception using errcode='P0001', message='MG:RATE_LIMITED'; end if;
  select * into hp from partners where id = inv.partner_id; select * into q from quotes where id = inv.proxy_quote_id;
  raw := private.gen_token();
  select coalesce((value)::int, 72) into hrs from settings where key = 'proxy_confirm_hours';
  update invitations set status = 'proxy_entered', confirm_token_sha256 = encode(digest(raw, 'sha256'), 'hex'), confirm_token_expires_at = t0 + make_interval(hours => coalesce(hrs,72)),
    confirm_token_used_at = null, confirm_sent_at = t0, confirm_sent_to = hp.contact_email, confirm_remind_count = confirm_remind_count + 1 where id = inv.id;
  perform private.enqueue_if_template('HTL_CONFIRM', 'HTL_CONFIRM:' || inv.id || ':' || q.revision || ':r' || (inv.confirm_remind_count + 1),
    jsonb_build_object('rfp_id', (x.r).id, 'partner_id', hp.id, 'invitation_id', inv.id, 'to_email', hp.contact_email, 'recipient_kind', 'htl'),
    jsonb_build_object('CONFIRM_TOKEN', raw, 'ROUND', (x.r).round, 'EXPIRES_HOURS', coalesce(hrs,72)), (x.r).id);
  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo) values ((x.r).id, t0, 'operator', private.actor_label(x.me), (x.me).user_id, hp.name || ' 확인 요청 재발송');
  return private.rfp_to_json((x.r).id);
end $$;
revoke all on function partner_quote_proxy_resend(text,uuid) from public; grant execute on function partner_quote_proxy_resend(text,uuid) to authenticated;

-- ---------- 호텔 확인 (Edge Function quote_confirm / get_bid 가 service_role 로 호출) ----------
create or replace function private.quote_confirm_lookup(p_token text) returns jsonb
language plpgsql as $$
declare inv invitations%rowtype; q quotes%rowtype; r rfps%rowtype; hp partners%rowtype; h text;
begin
  h := encode(digest(p_token, 'sha256'), 'hex');
  select * into inv from invitations where confirm_token_sha256 = h;
  if inv.id is null then return null; end if;
  select * into q from quotes where id = inv.proxy_quote_id; select * into r from rfps where id = inv.rfp_id; select * into hp from partners where id = inv.partner_id;
  return jsonb_build_object('invitationId', inv.id, 'ref', r.ref, 'round', inv.round, 'hotel', hp.name, 'bidToken', inv.token,
    'status', case when inv.confirm_token_used_at is not null then 'used' when inv.confirm_token_expires_at < now() then 'expired' when inv.status <> 'proxy_entered' then 'stale' else 'pending' end,
    'expiresAt', inv.confirm_token_expires_at, 'enteredBy', (select coalesce(public_name, 'MICEGO') from partner_org where id = q.entered_by_partner),
    'quote', jsonb_build_object('currency', q.currency, 'twinRate', q.twin_rate, 'kingRate', q.king_rate, 'breakfast', case when q.breakfast_included then 'included' else 'not_included' end,
      'breakfastSupplement', q.breakfast_supplement, 'tax', case when q.tax_included then 'included' else 'not_included' end, 'taxNote', q.tax_note,
      'availability', case when q.availability_all then 'all' else 'partial' end, 'availabilityNotes', q.availability_notes, 'ballroomFee', q.ballroom_fee, 'ballroomName', q.ballroom_name,
      'fnbMinimum', q.fnb_minimum, 'ballroomIncludes', q.ballroom_includes, 'validUntil', q.valid_until, 'cancellation', q.cancellation, 'additionalProposals', q.additional_proposals, 'revision', q.revision));
end $$;

create or replace function private.quote_confirm_apply(p_token text, p_action text, p_reason text default null) returns jsonb
language plpgsql as $$
declare inv invitations%rowtype; q quotes%rowtype; r rfps%rowtype; hp partners%rowtype; h text; t0 timestamptz := now();
begin
  h := encode(digest(p_token, 'sha256'), 'hex');
  select * into inv from invitations where confirm_token_sha256 = h for update;
  if inv.id is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
  if inv.confirm_token_used_at is not null then raise exception using errcode='P0001', message='MG:TOKEN_USED'; end if;
  if inv.confirm_token_expires_at < t0 then raise exception using errcode='P0001', message='MG:TOKEN_EXPIRED'; end if;
  if inv.status <> 'proxy_entered' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  select * into r from rfps where id = inv.rfp_id for update; select * into q from quotes where id = inv.proxy_quote_id; select * into hp from partners where id = inv.partner_id;
  if p_action = 'confirm' then
    if r.state not in ('open','bidding','collecting') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    update quotes set confirmed_at = t0, confirmed_via = 'confirm_link', updated_at = t0 where id = q.id;
    -- 확인된 대리 견적은 일반 제출(submitted)과 같은 상태로 둔다: 선정·추적·비교표 등 기존 경로가 그대로 적용된다. 확인 사실은 quotes.confirmed_at/confirmed_via 에 남는다.
    update invitations set status = 'submitted', submitted_at = coalesce(submitted_at, t0), confirm_token_used_at = t0 where id = inv.id;
    insert into rfp_history(rfp_id, at, actor, actor_label, memo) values (r.id, t0, 'hotel', '호텔', hp.name || ' 대리 입력 견적 확인 (rev.' || q.revision || ')');
    if q.entered_by_partner is not null then
      perform private.notify_partner(q.entered_by_partner, 'PTR_HOTEL_CONFIRMED', 'PTR_HOTEL_CONFIRMED:' || inv.id || ':' || q.revision, r.id, jsonb_build_object('RFP_ID', r.ref, 'HOTEL', hp.name));
    end if;
    return jsonb_build_object('ok', true, 'status', 'confirmed');
  elsif p_action = 'dispute' then
    if p_reason is null or length(btrim(p_reason)) < 3 then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
    update invitations set status = 'proxy_disputed', disputed_at = t0, dispute_reason = left(btrim(p_reason), 1000), confirm_token_used_at = t0 where id = inv.id;
    insert into rfp_history(rfp_id, at, actor, actor_label, memo) values (r.id, t0, 'hotel', '호텔', hp.name || ' 대리 입력 견적 이의 · ' || left(btrim(p_reason), 200));
    insert into intervention_alert (rfp_id, partner_id, kind, severity, detail) values (r.id, q.entered_by_partner, 'proxy_disputed', 2, jsonb_build_object('invitation', inv.id, 'hotel', hp.name, 'reason', left(p_reason, 300))) on conflict do nothing;
    if q.entered_by_partner is not null then
      perform private.notify_partner(q.entered_by_partner, 'PTR_HOTEL_DISPUTED', 'PTR_HOTEL_DISPUTED:' || inv.id || ':' || q.revision, r.id, jsonb_build_object('RFP_ID', r.ref, 'HOTEL', hp.name, 'REASON', left(p_reason, 300)));
    end if;
    perform private.notify_hq('HQ_PROXY_DISPUTED', 'HQ_PROXY_DISPUTED:' || inv.id || ':' || q.revision, r.id, jsonb_build_object('RFP_ID', r.ref, 'HOTEL', hp.name));
    return jsonb_build_object('ok', true, 'status', 'disputed');
  end if;
  raise exception using errcode='P0001', message='MG:BAD_REQUEST';
end $$;

-- 호텔이 비딩 링크로 직접 제출/수정하면 '호텔 직접 제출'로 전환 (submit_quote 가 호출)
create or replace function private.quote_mark_hotel_submitted(p_invitation_id uuid) returns void
language plpgsql as $$
begin
  perform set_config('mg.quote_reset', 'on', true);
  update quotes set entered_by = 'hotel', entered_by_user = null, entered_by_partner = null, proxy_entered_at = null, proxy_evidence_note = null, confirmed_at = null, confirmed_via = null
   where invitation_id = p_invitation_id and entered_by <> 'hotel';
  update invitations set status = 'submitted', proxy_quote_id = null, confirm_token_used_at = coalesce(confirm_token_used_at, now()), disputed_at = null, dispute_reason = null
   where id = p_invitation_id and status in ('proxy_entered','hotel_confirmed','proxy_disputed','proxy_expired');
end $$;

-- 확인 기한 경과 정리 (system_tick 에서 호출 가능)
create or replace function private.proxy_expire_sweep() returns int
language plpgsql as $$
declare n int;
begin
  with u as (update invitations set status = 'proxy_expired' where status = 'proxy_entered' and confirm_token_expires_at < now() returning id, rfp_id)
  insert into rfp_history(rfp_id, at, actor, actor_label, memo) select rfp_id, now(), 'system', '시스템', '대리 입력 견적 호텔 확인 기한 경과 · 비교표 제외' from u;
  get diagnostics n = row_count; return n;
end $$;

-- ---------- rfp_transition 보완: hotel_confirmed 를 제출로 인정, collecting 시 미확인 대리 견적 만료 ----------
create or replace function private.rfp_transition(p_rfp_id uuid, p_action text, p_actor actor_kind, p_operator_id uuid, p_reason text, p_note text, p_memo text) returns rfps
language plpgsql as $$
declare
  r rfps%rowtype; to_state rfp_state; t0 timestamptz := now(); n_submitted int; n_usd_missing int; n_cur_inv int; sel_inv invitations%rowtype; n_selected int;
  memo_full text; cur_currencies int; lbl_rank int; q_rec record; v_from_state text; v_prev_state rfp_state; n_unreviewed int;
begin
  select * into r from rfps where id = p_rfp_id for update;
  if r.id is null then raise exception using errcode = 'P0001', message = 'MG:BAD_REQUEST'; end if;
  if not (p_action = any(private.allowed_actions(r.state))) then raise exception using errcode = 'P0001', message = 'MG:STATE_CONFLICT'; end if;
  if p_action = 'open' and not r.anon_reviewed then raise exception using errcode = 'P0001', message = 'MG:GUARD_ANON'; end if;
  if p_action = 'bidding' and r.state = 'open' then
    select count(*) into n_cur_inv from private.current_invitations(p_rfp_id, r.round);
    if r.deadline is null or n_cur_inv < 1 then raise exception using errcode = 'P0001', message = 'MG:GUARD_BIDDING'; end if;
  end if;
  if p_action = 'delivered' then
    select count(*) into n_submitted from private.current_invitations(p_rfp_id, r.round) i where i.status in ('submitted','hotel_confirmed');
    if n_submitted < 1 then raise exception using errcode = 'P0001', message = 'MG:GUARD_NO_QUOTE'; end if;
    select count(distinct q.currency) into cur_currencies from v_comparable_quote q where q.rfp_id = p_rfp_id and q.round = r.round;
    if cur_currencies >= 2 then
      select count(*) into n_usd_missing from v_comparable_quote q where q.rfp_id = p_rfp_id and q.round = r.round and (q.usd_ref is null or q.usd_ref <= 0 or q.usd_date is null);
      if n_usd_missing > 0 then raise exception using errcode = 'P0001', message = 'MG:GUARD_USD'; end if;
    end if;
  end if;
  if p_action = 'lost' and r.state = 'collecting' then
    select count(*) into n_submitted from private.current_invitations(p_rfp_id, r.round) i where i.status in ('submitted','hotel_confirmed');
    if n_submitted > 0 or r.round < 2 then raise exception using errcode = 'P0001', message = 'MG:GUARD_LOST_COLLECTING'; end if;
  end if;
  if p_action = 'won' then
    select count(*) into n_selected from invitations where rfp_id = p_rfp_id and round = r.round and status <> 'reinvited' and result = 'selected';
    if n_selected <> 1 then raise exception using errcode = 'P0001', message = 'MG:GUARD_SELECT_ONE'; end if;
  end if;
  if p_action in ('rejected','lost','cancelled') then
    if p_reason is null or trim(p_reason) = '' then raise exception using errcode = 'P0001', message = 'MG:GUARD_REASON'; end if;
    if p_reason = '기타' and (p_note is null or trim(p_note) = '') then raise exception using errcode = 'P0001', message = 'MG:GUARD_REASON'; end if;
  end if;
  if p_action = 'won' then
    select * into sel_inv from invitations where rfp_id = p_rfp_id and round = r.round and status <> 'reinvited' and result = 'selected' limit 1;
    return private.finalize_won(p_rfp_id, sel_inv.id, 'operator', p_operator_id, null, null, true);
  end if;

  to_state := case when p_action = 'rebid' then 'bidding' else p_action::rfp_state end;
  memo_full := coalesce(p_reason, '') || case when p_note is not null and p_note <> '' then ' · ' || p_note else '' end;
  if memo_full = '' then memo_full := coalesce(p_memo, ''); end if;
  v_from_state := case when p_action = 'rebid' then 'delivered/collecting' else r.state::text end;
  v_prev_state := r.state;

  if p_action = 'collecting' then
    update invitations set status = 'expired' where rfp_id = p_rfp_id and round = r.round and status in ('invited','viewed');
    update invitations set status = 'proxy_expired' where rfp_id = p_rfp_id and round = r.round and status = 'proxy_entered';
  end if;
  if p_action = 'delivered' then
    lbl_rank := 0;
    for q_rec in select q.id from v_comparable_quote q where q.rfp_id = p_rfp_id and q.round = r.round order by q.submitted_at asc loop
      update quotes set label = chr(65 + lbl_rank) where id = q_rec.id; lbl_rank := lbl_rank + 1;
    end loop;
    -- HQ 미검토 파트너 승인 호텔이 비교표에 포함되면 알림만(N28 확정: 게이트 없음)
    select count(*) into n_unreviewed from v_comparable_quote q join invitations i on i.id = q.invitation_id join partners p on p.id = i.partner_id
     where q.rfp_id = p_rfp_id and q.round = r.round and p.approved_via = 'partner' and p.hq_reviewed_at is null;
    if n_unreviewed > 0 then
      perform private.notify_hq('HQ_HOTEL_UNREVIEWED_DELIVERED', 'HQ_HOTEL_UNREVIEWED_DELIVERED:' || p_rfp_id || ':' || r.round, p_rfp_id, jsonb_build_object('RFP_ID', r.ref, 'COUNT', n_unreviewed));
    end if;
  end if;

  update rfps set state = to_state, updated_at = t0,
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
  where id = p_rfp_id returning * into r;

  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, from_state, to_state, memo)
  values (p_rfp_id, t0, coalesce(p_actor, 'operator'), case coalesce(p_actor,'operator') when 'operator' then '운영자' when 'system' then '시스템' else '오거나이저' end, p_operator_id, v_from_state, to_state::text, memo_full);

  if p_action = 'rejected' then
    perform private.enqueue('ORG_REJECTED', 'ORG_REJECTED:' || p_rfp_id, jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'), jsonb_build_object('REJECT_REASON', memo_full), t0);
  elsif to_state = 'bidding' then
    if p_action = 'rebid' or r.round >= 2 then
      perform private.enqueue('ORG_REBID', 'ORG_REBID:' || p_rfp_id || ':' || r.round, jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'), jsonb_build_object('ROUND', r.round, 'CHANGE_SUMMARY', coalesce(r.change_summary,'')), t0);
    else
      perform private.enqueue('ORG_BIDDING', 'ORG_BIDDING:' || p_rfp_id, jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'), '{}'::jsonb, t0);
    end if;
  elsif p_action = 'delivered' then
    perform private.enqueue('ORG_DELIVERED', 'ORG_DELIVERED:' || p_rfp_id, jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'), '{}'::jsonb, t0);
  elsif p_action = 'lost' then
    perform private.enqueue('ORG_LOST', 'ORG_LOST:' || p_rfp_id || ':' || r.round, jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'), jsonb_build_object('LOST_REASON', memo_full), t0);
  elsif p_action = 'cancelled' then
    if p_reason is distinct from '회원 탈퇴' then
      perform private.enqueue('ORG_CANCELLED', 'ORG_CANCELLED:' || p_rfp_id, jsonb_build_object('rfp_id', p_rfp_id, 'to_email', r.contact_email, 'to_phone', r.contact_phone, 'recipient_kind','org'), jsonb_build_object('CANCEL_REASON', memo_full), t0);
    end if;
    if v_prev_state = 'bidding' then
      insert into rfp_history(rfp_id, at, actor, actor_label, memo) values (p_rfp_id, t0, 'operator', '운영자', 'OPS_HTL_CANCELLED 안내는 자동 발송되지 않습니다 · 초대 호텔에 직접 안내 필요');
    end if;
  end if;
  return r;
end;
$$;
