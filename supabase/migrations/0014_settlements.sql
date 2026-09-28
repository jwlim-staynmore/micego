-- MICEGO 0014: 정산 (성사 → 커미션 확정 → 수금 → 송금 → 입금 확인) + 분쟁·무효  - 클로드
-- 설계 §6. 파트너 70 : MICEGO 30 (조직 revenue_share_pct, 인계 시 rfps.partner_share_override_pct). 통화: 호텔 통화 + 송금 통화 + 수동 환율.
set search_path = public;

do $$ begin create type public.settlement_status as enum ('pending_commission','commission_submitted','commission_confirmed','collected','remitted','completed','disputed','voided'); exception when duplicate_object then null; end $$;

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  rfp_id uuid not null unique references rfps(id),
  partner_org_id uuid references partner_org(id),
  hotel_id uuid not null references partners(id),
  quote_id uuid not null references quotes(id),
  status settlement_status not null default 'pending_commission',
  status_before_dispute settlement_status,
  won_at timestamptz not null,
  event_end date,
  collect_due_date date,
  remit_due_date date,
  hotel_currency char(3) not null,
  contract_amount numeric(18,2) check (contract_amount is null or contract_amount > 0),
  commission_basis text check (commission_basis is null or commission_basis in ('rate','fixed')),
  commission_rate_pct numeric(6,3) check (commission_rate_pct is null or commission_rate_pct between 0 and 50),
  commission_amount numeric(18,2) check (commission_amount is null or commission_amount >= 0),
  partner_share_pct numeric(5,2) not null check (partner_share_pct between 0 and 100),
  partner_share_amount numeric(18,2) generated always as (public.ccy_round(commission_amount * partner_share_pct / 100, hotel_currency)) stored,
  micego_share_amount numeric(18,2) generated always as (commission_amount - public.ccy_round(commission_amount * partner_share_pct / 100, hotel_currency)) stored,
  collected_at timestamptz, collected_amount numeric(18,2),
  remit_currency char(3),
  fx_rate numeric(18,8) check (fx_rate is null or fx_rate > 0),
  fx_rate_date date, fx_rate_source text,
  remit_amount_expected numeric(18,2) generated always as (public.ccy_round((commission_amount - public.ccy_round(commission_amount * partner_share_pct / 100, hotel_currency)) * fx_rate, remit_currency)) stored,
  remitted_at timestamptz, remit_amount_actual numeric(18,2), remit_reference text,
  received_at timestamptz, received_amount numeric(18,2), received_by uuid,
  commission_submitted_at timestamptz, commission_submitted_by uuid,
  commission_approved_at timestamptz, commission_approved_by uuid, commission_reject_reason text,
  dispute_opened_at timestamptz, dispute_opened_by uuid, dispute_reason text, dispute_resolution text,
  voided_at timestamptz, void_reason text,
  flags text[] not null default '{}',
  attachments jsonb not null default '[]'::jsonb,   -- [{kind,name,url,at,by}] (스토리지 연동 전에는 URL/메모)
  row_version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint st_commission_le_contract check (commission_amount is null or contract_amount is null or commission_amount <= contract_amount),
  constraint st_same_ccy_fx check (remit_currency is null or remit_currency <> hotel_currency or fx_rate = 1),
  constraint st_hq_only_share check (partner_org_id is not null or partner_share_pct = 0)
);
create index if not exists settlements_partner_idx on settlements (partner_org_id, status);
create index if not exists settlements_due_idx on settlements (status, collect_due_date);

create table if not exists settlement_events (
  id bigserial primary key,
  settlement_id uuid not null references settlements(id) on delete cascade,
  action text not null,
  from_status settlement_status, to_status settlement_status,
  diff jsonb not null default '{}'::jsonb,
  note text,
  actor uuid, actor_role console_role,
  created_at timestamptz not null default now()
);
create index if not exists settlement_events_idx on settlement_events (settlement_id, created_at);

create table if not exists settlement_periods (
  period char(7) primary key check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  closed_at timestamptz not null default now(), closed_by uuid, note text
);

alter table intervention_alert drop constraint if exists intervention_alert_settlement_fk;
alter table intervention_alert add constraint intervention_alert_settlement_fk foreign key (settlement_id) references settlements(id) on delete cascade;

-- ---------- 성사 시 자동 생성 ----------
create or replace function private.settlement_create(p_rfp_id uuid) returns uuid
language plpgsql as $$
declare r rfps%rowtype; sel selections%rowtype; q quotes%rowtype; inv invitations%rowtype; hp partners%rowtype; po partner_org%rowtype; sid uuid; days int; pct numeric; f text[] := '{}'; v_ref text;
begin
  select * into r from rfps where id = p_rfp_id;
  if exists (select 1 from settlements where rfp_id = p_rfp_id) then return (select id from settlements where rfp_id = p_rfp_id); end if;
  select * into sel from selections where rfp_id = p_rfp_id; if sel.id is null then return null; end if;
  select * into q from quotes where id = sel.quote_id; select * into inv from invitations where id = sel.invitation_id; select * into hp from partners where id = inv.partner_id;
  if r.partner_org_id is not null then select * into po from partner_org where id = r.partner_org_id; end if;
  select coalesce((value)::int, 30) into days from settings where key = 'collect_due_days';
  pct := case when r.partner_org_id is null then 0 else coalesce(r.partner_share_override_pct, po.revenue_share_pct, 70) end;
  if hp.approved_via = 'partner' and hp.hq_reviewed_at is null then f := array_append(f, 'hotel_unreviewed'); end if;
  v_ref := 'ST-' || to_char(now() at time zone 'Asia/Seoul', 'YYMM') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4));
  insert into settlements (ref, rfp_id, partner_org_id, hotel_id, quote_id, won_at, event_end, collect_due_date, hotel_currency, partner_share_pct, flags, remit_currency)
  values (v_ref, p_rfp_id, r.partner_org_id, hp.id, q.id, coalesce(r.closed_at, now()), r.end_date, coalesce(r.end_date, now()::date) + coalesce(days,30), coalesce(q.currency, 'USD'), pct, f, coalesce(po.settlement_currency, 'USD'))
  returning id into sid;
  insert into settlement_events (settlement_id, action, to_status, diff) values (sid, 'created', 'pending_commission', jsonb_build_object('partner_share_pct', pct, 'flags', to_jsonb(f)));
  if 'hotel_unreviewed' = any(f) then
    insert into intervention_alert (rfp_id, settlement_id, partner_id, kind, severity, detail) values (p_rfp_id, sid, r.partner_org_id, 'hotel_unreviewed_won', 2, jsonb_build_object('hotel_id', hp.id, 'hotel', hp.name)) on conflict do nothing;
  end if;
  if r.partner_org_id is not null then
    perform private.notify_partner(r.partner_org_id, 'PTR_WON', 'PTR_WON:' || p_rfp_id, p_rfp_id, jsonb_build_object('RFP_ID', r.ref, 'HOTEL', hp.name, 'SETTLEMENT_REF', v_ref));
  end if;
  return sid;
end $$;

create or replace function private.trg_rfps_won_settlement() returns trigger language plpgsql as $$
begin
  if new.state = 'won' and old.state is distinct from 'won' then perform private.settlement_create(new.id); end if;
  return null;
end $$;
drop trigger if exists rfps_won_settlement on rfps;
create trigger rfps_won_settlement after update of state on rfps for each row execute function private.trg_rfps_won_settlement();

-- 기존 성사 건 백필
do $$ declare x record; begin
  for x in select id from rfps where state = 'won' and not exists (select 1 from settlements s where s.rfp_id = rfps.id) loop perform private.settlement_create(x.id); end loop;
end $$;

-- ---------- JSON ----------
create or replace function private.settlement_to_json(p_id uuid) returns jsonb
language plpgsql stable as $$
declare s settlements%rowtype; r rfps%rowtype; hp partners%rowtype; po partner_org%rowtype; ev jsonb;
begin
  select * into s from settlements where id = p_id; if s.id is null then return null; end if;
  select * into r from rfps where id = s.rfp_id; select * into hp from partners where id = s.hotel_id; if s.partner_org_id is not null then select * into po from partner_org where id = s.partner_org_id; end if;
  select coalesce(jsonb_agg(jsonb_build_object('t', e.created_at, 'action', e.action, 'from', e.from_status, 'to', e.to_status, 'note', e.note, 'diff', e.diff, 'actorRole', e.actor_role,
    'actor', coalesce((select display_name from console_user where user_id = e.actor), case when e.actor is null then '시스템' else '운영자' end)) order by e.created_at), '[]'::jsonb) into ev from settlement_events e where e.settlement_id = p_id;
  return jsonb_build_object('id', s.id, 'ref', s.ref, 'rfpId', r.ref, 'destination', coalesce(r.destination, r.region), 'eventType', r.event_type, 'partner', case when po.id is null then null else jsonb_build_object('code', po.code, 'name', po.display_name) end,
    'hotel', hp.name, 'hotelCode', hp.code, 'status', s.status, 'statusBeforeDispute', s.status_before_dispute, 'wonAt', s.won_at, 'eventEnd', s.event_end, 'collectDue', s.collect_due_date, 'remitDue', s.remit_due_date,
    'hotelCurrency', s.hotel_currency, 'contractAmount', s.contract_amount, 'commissionBasis', s.commission_basis, 'commissionRatePct', s.commission_rate_pct, 'commissionAmount', s.commission_amount,
    'partnerSharePct', s.partner_share_pct, 'partnerShareAmount', s.partner_share_amount, 'micegoShareAmount', s.micego_share_amount,
    'collectedAt', s.collected_at, 'collectedAmount', s.collected_amount, 'remitCurrency', s.remit_currency, 'fxRate', s.fx_rate, 'fxRateDate', s.fx_rate_date, 'fxRateSource', s.fx_rate_source,
    'remitExpected', s.remit_amount_expected, 'remittedAt', s.remitted_at, 'remitActual', s.remit_amount_actual, 'remitReference', s.remit_reference,
    'receivedAt', s.received_at, 'receivedAmount', s.received_amount, 'commissionRejectReason', s.commission_reject_reason, 'disputeReason', s.dispute_reason, 'disputeResolution', s.dispute_resolution,
    'voidReason', s.void_reason, 'flags', to_jsonb(s.flags), 'attachments', s.attachments, 'rowVersion', s.row_version, 'createdAt', s.created_at, 'events', ev);
end $$;

create or replace function private.settlements_json(me console_user) returns jsonb
language plpgsql stable as $$
declare out jsonb;
begin
  if me.role = 'operator' then
    select coalesce(jsonb_agg(private.settlement_to_json(s.id) order by s.created_at desc), '[]'::jsonb) into out from settlements s;
  else
    select coalesce(jsonb_agg(private.settlement_to_json(s.id) order by s.created_at desc), '[]'::jsonb) into out from settlements s where s.partner_org_id = me.partner_id;
  end if;
  return out;
end $$;

-- ---------- 상태 전이 RPC ----------
create or replace function settlement_action(p_ref text, p_action text, p jsonb default '{}'::jsonb, p_note text default null) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare
  me console_user%rowtype; s settlements%rowtype; before settlements%rowtype; to_st settlement_status; t0 timestamptz := now(); days int; rng jsonb; basis text; amt numeric; contract numeric; rate numeric; sup text[]; f text[]; is_partner boolean;
begin
  me := private.require_console(null);
  select * into s from settlements where ref = p_ref for update;
  if s.id is null then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
  is_partner := me.role <> 'operator';
  if is_partner then
    if s.partner_org_id is distinct from me.partner_id then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
    if me.role <> 'partner_admin' then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
    if (select status from partner_org where id = me.partner_id) <> 'active' and p_action not in ('open_dispute') then raise exception using errcode='P0001', message='MG:PARTNER_SUSPENDED'; end if;
  end if;
  before := s; f := s.flags;
  select value into rng from settings where key = 'commission_rate_range';
  select coalesce(array(select jsonb_array_elements_text(value)), '{}') into sup from settings where key = 'supported_currencies';

  if p_action = 'submit_commission' then
    if s.status <> 'pending_commission' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    if s.partner_org_id is null and is_partner then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
    contract := nullif(p->>'contractAmount','')::numeric; basis := p->>'commissionBasis'; rate := nullif(p->>'commissionRatePct','')::numeric;
    if contract is null or contract <= 0 or basis not in ('rate','fixed') then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
    if p ? 'hotelCurrency' and (p->>'hotelCurrency') <> s.hotel_currency then
      if not ((p->>'hotelCurrency') = any(sup)) or coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
      s.hotel_currency := p->>'hotelCurrency';
    end if;
    if basis = 'rate' then
      if rate is null or rate <= 0 or rate > 50 then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
      amt := public.ccy_round(contract * rate / 100, s.hotel_currency);
    else
      amt := nullif(p->>'commissionAmount','')::numeric; rate := null;
      if amt is null or amt < 0 or amt > contract * 0.5 then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
    end if;
    if basis = 'rate' and rng is not null and (rate < (rng->>0)::numeric or rate > (rng->>1)::numeric) and coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:GUARD_NOTE'; end if;
    f := array_remove(f, 'contract_below_quote');
    if contract < coalesce((select coalesce(q.twin_rate,0) * coalesce(r.twin_rooms,0) + coalesce(q.king_rate,0) * coalesce(r.king_rooms,0) from quotes q join rfps r on r.id = q.rfp_id where q.id = s.quote_id), 0) * 0.7 then
      if coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:GUARD_NOTE'; end if;
      f := array_append(f, 'contract_below_quote');
    end if;
    update settlements set contract_amount = contract, commission_basis = basis, commission_rate_pct = rate, commission_amount = amt, hotel_currency = s.hotel_currency,
      commission_submitted_at = t0, commission_submitted_by = me.user_id, status = 'commission_submitted', flags = f, row_version = row_version + 1, updated_at = t0 where id = s.id;
    to_st := 'commission_submitted';
    perform private.notify_hq('HQ_COMMISSION_SUBMITTED', 'HQ_COMMISSION_SUBMITTED:' || s.id || ':' || s.row_version, s.rfp_id, jsonb_build_object('SETTLEMENT_REF', s.ref));

  elsif p_action = 'approve_commission' then
    if not (me.role = 'operator') then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
    if s.status <> 'commission_submitted' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    if s.commission_submitted_by = me.user_id and s.partner_org_id is not null then raise exception using errcode='P0001', message='MG:GUARD_SAME_ACTOR'; end if;
    if 'hotel_unreviewed' = any(s.flags) and (select hq_reviewed_at from partners where id = s.hotel_id) is null then raise exception using errcode='P0001', message='MG:GUARD_HOTEL_REVIEW'; end if;
    f := array_remove(f, 'hotel_unreviewed');
    update settlements set status = 'commission_confirmed', commission_approved_at = t0, commission_approved_by = me.user_id, commission_reject_reason = null, flags = f, row_version = row_version + 1, updated_at = t0 where id = s.id;
    to_st := 'commission_confirmed';
    if s.partner_org_id is not null then perform private.notify_partner(s.partner_org_id, 'PTR_COMMISSION_APPROVED', 'PTR_COMMISSION_APPROVED:' || s.id || ':' || s.row_version, s.rfp_id, jsonb_build_object('SETTLEMENT_REF', s.ref)); end if;

  elsif p_action = 'reject_commission' then
    if me.role <> 'operator' then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
    if s.status <> 'commission_submitted' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    if coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
    update settlements set status = 'pending_commission', commission_reject_reason = p_note, row_version = row_version + 1, updated_at = t0 where id = s.id;
    to_st := 'pending_commission';
    if s.partner_org_id is not null then perform private.notify_partner(s.partner_org_id, 'PTR_COMMISSION_REJECTED', 'PTR_COMMISSION_REJECTED:' || s.id || ':' || s.row_version, s.rfp_id, jsonb_build_object('SETTLEMENT_REF', s.ref, 'REASON', p_note)); end if;

  elsif p_action = 'record_collection' then
    if s.status <> 'commission_confirmed' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    amt := nullif(p->>'collectedAmount','')::numeric;
    if amt is null or amt < 0 or (p->>'collectedAt') is null then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
    f := array_remove(f, 'collection_variance');
    if amt <> s.commission_amount then if coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:GUARD_NOTE'; end if; f := array_append(f, 'collection_variance'); end if;
    select coalesce((value)::int, 14) into days from settings where key = 'remit_due_days';
    update settlements set status = 'collected', collected_at = (p->>'collectedAt')::timestamptz, collected_amount = amt, remit_due_date = ((p->>'collectedAt')::timestamptz at time zone 'Asia/Seoul')::date + coalesce(days,14),
      flags = f, row_version = row_version + 1, updated_at = t0 where id = s.id;
    to_st := 'collected';

  elsif p_action = 'record_remittance' then
    if s.status <> 'collected' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    if (p->>'remitCurrency') is null or not ((p->>'remitCurrency') = any(sup)) or nullif(p->>'fxRate','')::numeric is null or nullif(p->>'remitAmount','')::numeric is null or (p->>'remittedAt') is null then
      raise exception using errcode='P0001', message='MG:VALIDATION';
    end if;
    if (p->>'remitCurrency') = s.hotel_currency and nullif(p->>'fxRate','')::numeric <> 1 then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
    update settlements set status = 'remitted', remit_currency = p->>'remitCurrency', fx_rate = (p->>'fxRate')::numeric, fx_rate_date = coalesce((p->>'fxRateDate')::date, t0::date), fx_rate_source = p->>'fxRateSource',
      remitted_at = (p->>'remittedAt')::timestamptz, remit_amount_actual = (p->>'remitAmount')::numeric, remit_reference = p->>'remitReference', row_version = row_version + 1, updated_at = t0 where id = s.id;
    select * into s from settlements where id = s.id;
    f := array_remove(array_remove(s.flags, 'remit_variance'), 'fx_outlier');
    if s.remit_amount_expected is not null and abs(s.remit_amount_actual - s.remit_amount_expected) > greatest(1, s.remit_amount_expected * 0.02) then f := array_append(f, 'remit_variance'); end if;
    update settlements set flags = f where id = s.id;
    to_st := 'remitted';
    perform private.notify_hq('HQ_REMITTED', 'HQ_REMITTED:' || s.id || ':' || s.row_version, s.rfp_id, jsonb_build_object('SETTLEMENT_REF', s.ref, 'AMOUNT', s.remit_amount_actual, 'CURRENCY', s.remit_currency));

  elsif p_action = 'confirm_receipt' then
    if me.role <> 'operator' then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
    if s.status <> 'remitted' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    amt := coalesce(nullif(p->>'receivedAmount','')::numeric, s.remit_amount_actual);
    if amt <> s.remit_amount_actual and coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:GUARD_NOTE'; end if;
    update settlements set status = 'completed', received_at = coalesce((p->>'receivedAt')::timestamptz, t0), received_amount = amt, received_by = me.user_id, row_version = row_version + 1, updated_at = t0 where id = s.id;
    to_st := 'completed';
    update intervention_alert set resolved_at = t0, resolved_by = me.user_id, resolution = 'auto_cleared' where settlement_id = s.id and resolved_at is null;
    if s.partner_org_id is not null then perform private.notify_partner(s.partner_org_id, 'PTR_SETTLEMENT_COMPLETED', 'PTR_SETTLEMENT_COMPLETED:' || s.id, s.rfp_id, jsonb_build_object('SETTLEMENT_REF', s.ref)); end if;

  elsif p_action = 'open_dispute' then
    if s.status in ('disputed','voided','completed') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    if coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
    update settlements set status = 'disputed', status_before_dispute = s.status, dispute_opened_at = t0, dispute_opened_by = me.user_id, dispute_reason = p_note, row_version = row_version + 1, updated_at = t0 where id = s.id;
    to_st := 'disputed';
    perform private.notify_hq('HQ_SETTLEMENT_DISPUTE', 'HQ_SETTLEMENT_DISPUTE:' || s.id || ':' || s.row_version, s.rfp_id, jsonb_build_object('SETTLEMENT_REF', s.ref, 'REASON', p_note));

  elsif p_action = 'resolve_dispute' then
    if me.role <> 'operator' then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
    if s.status <> 'disputed' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    if coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
    to_st := coalesce((p->>'toStatus')::settlement_status, s.status_before_dispute, 'pending_commission');
    if to_st in ('disputed','completed') then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
    if p ? 'commissionAmount' then
      amt := nullif(p->>'commissionAmount','')::numeric;
      update settlements set commission_amount = amt, commission_basis = coalesce(commission_basis, 'fixed'), commission_rate_pct = null where id = s.id;
    end if;
    update settlements set status = to_st, status_before_dispute = null, dispute_resolution = p_note, row_version = row_version + 1, updated_at = t0 where id = s.id;
    if s.partner_org_id is not null then perform private.notify_partner(s.partner_org_id, 'PTR_SETTLEMENT_RESOLVED', 'PTR_SETTLEMENT_RESOLVED:' || s.id || ':' || s.row_version, s.rfp_id, jsonb_build_object('SETTLEMENT_REF', s.ref, 'RESOLUTION', p_note)); end if;

  elsif p_action = 'void' then
    if me.role <> 'operator' then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
    if s.status in ('completed','voided') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    if coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
    update settlements set status = 'voided', voided_at = t0, void_reason = p_note, row_version = row_version + 1, updated_at = t0 where id = s.id;
    to_st := 'voided';
    update intervention_alert set resolved_at = t0, resolved_by = me.user_id, resolution = 'dismissed' where settlement_id = s.id and resolved_at is null;

  elsif p_action = 'add_attachment' then
    if coalesce(p->>'name','') = '' or coalesce(p->>'kind','') not in ('hotel_contract','hotel_invoice','collection_proof','remit_proof','other') then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
    update settlements set attachments = attachments || jsonb_build_array(jsonb_build_object('kind', p->>'kind', 'name', p->>'name', 'url', p->>'url', 'note', p->>'note', 'at', t0, 'by', me.display_name)), updated_at = t0 where id = s.id;
    to_st := s.status;
  else
    raise exception using errcode='P0001', message='MG:BAD_REQUEST';
  end if;

  insert into settlement_events (settlement_id, action, from_status, to_status, diff, note, actor, actor_role)
  values (s.id, p_action, before.status, to_st, p - 'note', p_note, me.user_id, me.role);
  perform private.audit('settlement', s.ref, p_action, jsonb_build_object('status', before.status), jsonb_build_object('status', to_st), s.rfp_id, false, p_note);
  return private.settlement_to_json(s.id);
end $$;
revoke all on function settlement_action(text,text,jsonb,text) from public; grant execute on function settlement_action(text,text,jsonb,text) to authenticated;

create or replace function settlement_get(p_ref text) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; s settlements%rowtype;
begin
  me := private.require_console(null);
  select * into s from settlements where ref = p_ref;
  if s.id is null or (me.role <> 'operator' and s.partner_org_id is distinct from me.partner_id) then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
  return private.settlement_to_json(s.id);
end $$;
revoke all on function settlement_get(text) from public; grant execute on function settlement_get(text) to authenticated;

-- 월별 요약 (파트너별 미수·미송금 합계)
create or replace view v_settlement_monthly with (security_invoker = true) as
select to_char(s.won_at at time zone 'Asia/Seoul', 'YYYY-MM') as period, s.partner_org_id, po.code as partner_code, s.hotel_currency,
       count(*) as n, count(*) filter (where s.status = 'completed') as n_completed,
       sum(s.commission_amount) filter (where s.status not in ('voided')) as commission_total,
       sum(s.micego_share_amount) filter (where s.status not in ('voided')) as micego_total,
       sum(s.micego_share_amount) filter (where s.status in ('commission_confirmed','collected')) as micego_unremitted,
       sum(s.commission_amount) filter (where s.status = 'commission_confirmed' and s.collect_due_date < current_date) as overdue_collect
from settlements s left join partner_org po on po.id = s.partner_org_id
group by 1,2,3,4;
grant select on v_settlement_monthly to authenticated;

-- ---------- 개입 알림 감지 (system_tick 이 호출) ----------
create or replace function private.intervention_sweep() returns jsonb
language plpgsql as $$
declare t0 timestamptz := now(); n1 int := 0; n2 int := 0; n3 int := 0; n4 int := 0; idle_h int;
begin
  select coalesce((value)::int, 24) into idle_h from settings where key = 'partner_idle_hours';
  -- 미배정 방치 (4시간)
  insert into intervention_alert (rfp_id, kind, severity, detail)
  select r.id, 'unassigned_stale', 2, jsonb_build_object('hold_reason', r.hold_reason) from rfps r
   where r.delegation = 'hq_held' and r.hold_reason not in ('legacy','manual') and r.state in ('received','verifying') and r.created_at < t0 - interval '4 hours'
     and not exists (select 1 from intervention_alert a where a.rfp_id = r.id and a.kind = 'unassigned_stale' and a.resolved_at is null)
  on conflict do nothing; get diagnostics n1 = row_count;
  -- 파트너 미착수 (배정 후 idle_h 시간 동안 received)
  insert into intervention_alert (rfp_id, partner_id, kind, severity, detail)
  select r.id, r.partner_org_id, 'partner_idle', 2, jsonb_build_object('delegated_at', r.delegated_at) from rfps r
   where r.delegation = 'delegated' and r.state = 'received' and r.delegated_at < t0 - make_interval(hours => idle_h)
     and not exists (select 1 from intervention_alert a where a.rfp_id = r.id and a.kind = 'partner_idle' and a.resolved_at is null)
  on conflict do nothing; get diagnostics n2 = row_count;
  -- SLA 초과
  insert into intervention_alert (rfp_id, partner_id, kind, severity, detail)
  select r.id, r.partner_org_id, 'sla_breach', 1, jsonb_build_object('sla_due_at', r.sla_due_at) from rfps r
   where r.state in ('verifying','open') and r.sla_due_at < t0
     and not exists (select 1 from intervention_alert a where a.rfp_id = r.id and a.kind = 'sla_breach' and a.resolved_at is null)
  on conflict do nothing; get diagnostics n3 = row_count;
  -- 정산 기한 초과
  insert into intervention_alert (rfp_id, settlement_id, partner_id, kind, severity, detail)
  select s.rfp_id, s.id, s.partner_org_id, 'settlement_overdue', 2, jsonb_build_object('status', s.status, 'collect_due', s.collect_due_date, 'remit_due', s.remit_due_date) from settlements s
   where (s.status in ('pending_commission','commission_submitted','commission_confirmed') and s.collect_due_date < current_date)
      or (s.status = 'collected' and s.remit_due_date < current_date)
     and not exists (select 1 from intervention_alert a where a.settlement_id = s.id and a.kind = 'settlement_overdue' and a.resolved_at is null)
  on conflict do nothing; get diagnostics n4 = row_count;
  -- 자동 해소: 상태가 진전된 알림
  update intervention_alert a set resolved_at = t0, resolution = 'auto_cleared' where a.resolved_at is null and a.kind = 'partner_idle' and exists (select 1 from rfps r where r.id = a.rfp_id and r.state <> 'received');
  update intervention_alert a set resolved_at = t0, resolution = 'auto_cleared' where a.resolved_at is null and a.kind = 'unassigned_stale' and exists (select 1 from rfps r where r.id = a.rfp_id and r.delegation <> 'hq_held');
  update intervention_alert a set resolved_at = t0, resolution = 'auto_cleared' where a.resolved_at is null and a.kind = 'sla_breach' and exists (select 1 from rfps r where r.id = a.rfp_id and r.state not in ('verifying','open'));
  perform private.proxy_expire_sweep();
  return jsonb_build_object('unassigned', n1, 'idle', n2, 'sla', n3, 'settlement', n4);
end $$;

create or replace function intervention_resolve(p_id bigint, p_resolution text default 'dismissed', p_snooze_hours int default null) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype;
begin
  me := private.require_console(array['operator']::console_role[]);
  if p_snooze_hours is not null then
    update intervention_alert set snoozed_until = now() + make_interval(hours => p_snooze_hours) where id = p_id;
  else
    update intervention_alert set resolved_at = now(), resolved_by = me.user_id, resolution = coalesce(p_resolution, 'dismissed') where id = p_id and resolved_at is null;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function intervention_resolve(bigint,text,int) from public; grant execute on function intervention_resolve(bigint,text,int) to authenticated;

-- RLS
alter table settlements enable row level security;
alter table settlement_events enable row level security;
alter table settlement_periods enable row level security;
grant select on settlements, settlement_events, settlement_periods to authenticated;
create policy settlements_read on settlements for select to authenticated using (public.is_operator() or partner_org_id = public.my_partner_id());
create policy settlement_events_read on settlement_events for select to authenticated using (public.is_operator() or exists (select 1 from settlements s where s.id = settlement_events.settlement_id));
create policy settlement_periods_read on settlement_periods for select to authenticated using (public.is_operator() or public.is_partner());
grant execute on all functions in schema private to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
