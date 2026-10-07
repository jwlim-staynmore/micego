-- MICEGO 0017: 호텔 커미션(호텔별 고정 요율) — 승인 시 요율 제안 → 호텔 토큰 링크 동의 → 초대·정산에 스냅샷  - 클로드
-- 설계 docs/hotel-commission-design-v1 - 클로드.md §1·§2. 오거나이저는 계속 수수료 없음(D-32) — 이 요율은 호텔에서 받는 커미션이며 오거나이저 화면에는 노출하지 않는다.
-- 기존 마이그레이션은 고치지 않고 함수를 create or replace 로 재정의한다(admin_partner_transition 은 인자가 늘어 기존 시그니처를 먼저 drop).
set search_path = public;

-- ---------- settings ----------
insert into settings (key, value) values
  ('commission_terms_version', '"PT-2026-10"'::jsonb),
  ('commission_accept_hours', '168'::jsonb)
on conflict (key) do nothing;

-- ---------- partners(호텔): 합의 요율·대기 제안·동의 토큰 ----------
alter table partners
  add column if not exists commission_rate_pct numeric(5,2) check (commission_rate_pct > 0 and commission_rate_pct <= 50),
  add column if not exists commission_basis_scope text not null default 'rooms_fnb_net' check (commission_basis_scope in ('rooms_fnb_net')),
  add column if not exists commission_accepted_at timestamptz,
  add column if not exists commission_terms_version text,
  add column if not exists commission_accept_ip_hash text,
  add column if not exists commission_pending_rate_pct numeric(5,2) check (commission_pending_rate_pct > 0 and commission_pending_rate_pct <= 50),
  add column if not exists commission_pending_reason text,
  add column if not exists commission_set_by uuid,
  add column if not exists commission_set_by_role console_role,
  add column if not exists commission_set_at timestamptz,
  add column if not exists commission_token_sha256 text unique,
  add column if not exists commission_token_expires_at timestamptz,
  add column if not exists commission_token_used_at timestamptz,
  add column if not exists commission_token_sent_at timestamptz,
  add column if not exists commission_token_send_count smallint not null default 0;
alter table partners drop constraint if exists partners_commission_accepted_has_rate;
alter table partners add constraint partners_commission_accepted_has_rate check (commission_accepted_at is null or commission_rate_pct is not null);

-- ---------- 민감 컬럼 보호: 콘솔 직접 조회(PostgREST)로 동의 토큰 해시·IP 해시·제안 사유를 못 읽게 한다 ----------
-- 0006 이 partners 에 테이블 전체 SELECT 를 authenticated 에 줬으므로, 테이블 권한을 회수하고 민감 컬럼을 뺀 나머지 컬럼만 다시 부여한다.
-- 콘솔은 SECURITY DEFINER RPC(partner_to_json 등)로만 읽고, Edge Function 은 service_role 이라 영향 없다.
-- 이 마이그레이션 이후 partners 에 컬럼을 추가하면 그 마이그레이션에서 직접 grant select(컬럼) 해야 한다.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'partners'
     and column_name not in ('commission_token_sha256','commission_token_expires_at','commission_token_used_at','commission_token_sent_at','commission_token_send_count','commission_accept_ip_hash','commission_pending_reason');
  execute 'revoke select on public.partners from authenticated';
  execute 'grant select (' || cols || ') on public.partners to authenticated';
end $$;

-- ---------- 이력(append-only): RLS 켜고 정책은 두지 않는다 — 콘솔은 partner_to_json 으로만 읽는다 ----------
create table if not exists partner_commission_event (
  id bigserial primary key,
  partner_id uuid not null references partners(id) on delete cascade,
  action text not null check (action in ('proposed','resent','accepted','expired','backfilled')),
  rate_pct numeric(5,2),
  prev_rate_pct numeric(5,2),
  basis_scope text,
  terms_version text,
  actor uuid,
  actor_role console_role,
  reason text,
  hq_override boolean not null default false,
  ip_hash text,
  at timestamptz not null default now()
);
create index if not exists partner_commission_event_idx on partner_commission_event (partner_id, at);
alter table partner_commission_event enable row level security;
drop trigger if exists partner_commission_event_immutable on partner_commission_event;
create trigger partner_commission_event_immutable before update or delete on partner_commission_event for each row execute function private.deny_change();

-- ---------- 초대·정산에 요율 스냅샷 ----------
alter table invitations
  add column if not exists commission_rate_pct numeric(5,2),
  add column if not exists commission_basis_scope text,
  add column if not exists commission_terms_version text;
alter table settlements
  add column if not exists agreed_rate_pct numeric(5,2),
  add column if not exists commission_basis_scope text,
  add column if not exists commission_terms_version text;

-- ---------- 알림 템플릿 등록(본문은 알림 WP) ----------
insert into notif_template_meta (id, name) values
  ('PTN_COMMISSION_TERMS', 'Commission terms to accept')
on conflict (id) do update set name = excluded.name;

-- ---------- 요율 검증: 반환값 = 본사 예외(hq_override) 여부 ----------
create or replace function private.commission_rate_check(me console_user, p_rate numeric, p_reason text) returns boolean
language plpgsql stable as $$
declare rng jsonb; oor boolean;
begin
  if p_rate is null or p_rate <= 0 or p_rate > 50 then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
  select value into rng from settings where key = 'commission_rate_range';
  oor := rng is not null and (p_rate < (rng->>0)::numeric or p_rate > (rng->>1)::numeric);
  if not oor then return false; end if;
  if me.role <> 'operator' then raise exception using errcode='P0001', message='MG:COMMISSION_OUT_OF_RANGE'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
  return true;
end $$;

-- ---------- 요율 제안 + 1회용 동의 토큰(원문은 알림 변수로만 나가고 DB에는 해시만) ----------
create or replace function private.partner_commission_propose(p_partner_id uuid, me console_user, p_rate numeric, p_reason text, p_template text) returns void
language plpgsql as $$
declare p partners%rowtype; hq boolean; raw text; hrs int; ver text; t0 timestamptz := now(); rate numeric := round(p_rate, 2);
begin
  select * into p from partners where id = p_partner_id for update;
  if p.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  hq := private.commission_rate_check(me, rate, p_reason);
  raw := private.gen_token();
  select coalesce((value)::int, 168) into hrs from settings where key = 'commission_accept_hours';
  select value #>> '{}' into ver from settings where key = 'commission_terms_version';
  update partners set commission_pending_rate_pct = rate, commission_pending_reason = nullif(btrim(coalesce(p_reason,'')), ''),
    commission_set_by = me.user_id, commission_set_by_role = me.role, commission_set_at = t0,
    commission_token_sha256 = encode(digest(raw, 'sha256'), 'hex'), commission_token_expires_at = t0 + make_interval(hours => coalesce(hrs,168)),
    commission_token_used_at = null, commission_token_sent_at = t0, commission_token_send_count = 1, updated_at = t0
  where id = p.id;
  insert into partner_commission_event (partner_id, action, rate_pct, prev_rate_pct, basis_scope, terms_version, actor, actor_role, reason, hq_override, at)
  values (p.id, 'proposed', rate, p.commission_rate_pct, p.commission_basis_scope, ver, me.user_id, me.role, nullif(btrim(coalesce(p_reason,'')), ''), hq, t0);
  perform private.enqueue(p_template, p_template || ':' || p.id || ':' || extract(epoch from t0),
    jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind', 'ptn'),
    jsonb_build_object('COMMISSION_TOKEN', raw, 'COMMISSION_RATE', trim_scale(rate)::text, 'EXPIRES_HOURS', coalesce(hrs,168), 'TERMS_VERSION', ver), t0);
end $$;

-- ---------- 호텔 동의 (Edge Function partner_commission_accept 가 service_role 로 호출) ----------
create or replace function private.partner_commission_lookup(p_token text) returns jsonb
language plpgsql as $$
declare p partners%rowtype; h text; ver text;
begin
  h := encode(digest(p_token, 'sha256'), 'hex');
  select * into p from partners where commission_token_sha256 = h;
  if p.id is null then return null; end if;
  select value #>> '{}' into ver from settings where key = 'commission_terms_version';
  return jsonb_build_object('hotel', p.name, 'ratePct', p.commission_pending_rate_pct, 'basis', p.commission_basis_scope, 'termsVersion', ver,
    'expiresAt', p.commission_token_expires_at,
    'status', case when p.commission_token_used_at is not null then 'used' when p.commission_token_expires_at < now() then 'expired' when p.commission_pending_rate_pct is null then 'stale' else 'pending' end);
end $$;

create or replace function private.partner_commission_apply(p_token text, p_ip_hash text default null) returns jsonb
language plpgsql as $$
declare p partners%rowtype; h text; t0 timestamptz := now(); ver text; rng jsonb; oor boolean; po uuid;
begin
  h := encode(digest(p_token, 'sha256'), 'hex');
  select * into p from partners where commission_token_sha256 = h for update;
  if p.id is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
  if p.commission_token_used_at is not null then raise exception using errcode='P0001', message='MG:TOKEN_USED'; end if;
  if p.commission_token_expires_at < t0 then raise exception using errcode='P0001', message='MG:TOKEN_EXPIRED'; end if;
  if p.commission_pending_rate_pct is null or p.state not in ('approved','suspended') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  select value #>> '{}' into ver from settings where key = 'commission_terms_version';
  select value into rng from settings where key = 'commission_rate_range';
  oor := rng is not null and (p.commission_pending_rate_pct < (rng->>0)::numeric or p.commission_pending_rate_pct > (rng->>1)::numeric);
  update partners set commission_rate_pct = p.commission_pending_rate_pct, commission_pending_rate_pct = null, commission_pending_reason = null,
    commission_accepted_at = t0, commission_terms_version = ver, commission_accept_ip_hash = p_ip_hash, commission_token_used_at = t0, updated_at = t0
  where id = p.id;
  insert into partner_commission_event (partner_id, action, rate_pct, prev_rate_pct, basis_scope, terms_version, actor, actor_role, reason, hq_override, ip_hash, at)
  values (p.id, 'accepted', p.commission_pending_rate_pct, p.commission_rate_pct, p.commission_basis_scope, ver, null, null, p.commission_pending_reason,
          coalesce(p.commission_set_by_role = 'operator' and oor, false), p_ip_hash, t0);
  insert into partner_history(partner_id, at, actor, actor_label, memo)
  values (p.id, t0, 'hotel', '호텔', '커미션 ' || trim_scale(p.commission_pending_rate_pct)::text || '% 동의 (약관 ' || coalesce(ver,'-') || ')');
  select partner_id into po from console_user where user_id = p.commission_set_by;
  if p.commission_set_by_role in ('partner_admin','partner_member') and po is not null then
    perform private.notify_partner(po, 'PTR_HOTEL_TERMS_ACCEPTED', 'PTR_HOTEL_TERMS_ACCEPTED:' || p.id || ':' || extract(epoch from t0), null, jsonb_build_object('HOTEL', p.name, 'RATE', trim_scale(p.commission_pending_rate_pct)::text));
  else
    perform private.notify_hq('HQ_HOTEL_TERMS_ACCEPTED', 'HQ_HOTEL_TERMS_ACCEPTED:' || p.id || ':' || extract(epoch from t0), null, jsonb_build_object('HOTEL', p.name, 'RATE', trim_scale(p.commission_pending_rate_pct)::text));
  end if;
  return jsonb_build_object('ok', true, 'status', 'accepted', 'hotel', p.name, 'ratePct', p.commission_pending_rate_pct);
end $$;

-- ---------- 콘솔 JSON: 호텔에 commission 객체 ----------
create or replace function private.partner_to_json(p_id uuid) returns jsonb
language plpgsql stable as $$
declare p partners%rowtype; hist jsonb; cm jsonb; cev jsonb;
begin
  select * into p from partners where id = p_id;
  if p.id is null then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('t', h.at, 'actor', h.actor_label, 'from', h.from_state, 'to', h.to_state, 'memo', h.memo) order by h.at), '[]'::jsonb) into hist
  from partner_history h where h.partner_id = p_id;
  select coalesce(jsonb_agg(jsonb_build_object('t', e.at, 'action', e.action, 'ratePct', e.rate_pct, 'prevRatePct', e.prev_rate_pct, 'basis', e.basis_scope, 'termsVersion', e.terms_version,
    'actorRole', e.actor_role, 'reason', e.reason, 'hqOverride', e.hq_override) order by e.at, e.id), '[]'::jsonb) into cev
  from partner_commission_event e where e.partner_id = p_id;
  cm := jsonb_build_object('ratePct', p.commission_rate_pct, 'basis', p.commission_basis_scope, 'acceptedAt', p.commission_accepted_at, 'termsVersion', p.commission_terms_version,
    'pendingRatePct', p.commission_pending_rate_pct, 'pendingReason', p.commission_pending_reason, 'setByRole', p.commission_set_by_role, 'setAt', p.commission_set_at,
    'tokenSentAt', p.commission_token_sent_at, 'tokenExpiresAt', p.commission_token_expires_at, 'tokenUsedAt', p.commission_token_used_at, 'sendCount', p.commission_token_send_count,
    'status', case when p.commission_pending_rate_pct is not null and p.commission_token_used_at is null then (case when p.commission_token_expires_at < now() then 'expired' else 'pending' end)
                   when p.commission_accepted_at is not null then 'agreed' else 'none' end,
    'history', cev);
  return jsonb_build_object(
    'id', p.code, 'name', p.name, 'dest', p.dest, 'cap', p.cap, 'ballroom', p.banquet,
    'email', p.contact_email, 'status', p.state, 'appliedAt', p.applied_at,
    'hotelLocation', p.location, 'hotelDomain', p.domain, 'capBand', p.cap_band,
    'contactName', p.contact_name, 'contactPhone', p.contact_phone, 'description', p.description,
    'check', p.check_, 'history', hist, 'optOutAt', p.invite_opt_out_at,
    'regionCode', p.region_code, 'sourcedBy', (select code from partner_org where id = p.sourced_by_partner),
    'approvedVia', p.approved_via, 'approvedAt', p.approved_at, 'hqReviewedAt', p.hq_reviewed_at, 'riskFlags', to_jsonb(p.risk_flags),
    'emailVerifiedAt', p.contact_email_verified_at, 'commission', cm
  );
end;
$$;


create or replace function console_settings() returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; out jsonb;
begin
  me := private.require_console(null);
  select jsonb_object_agg(key, value) into out from settings
   where key in ('partner_idle_hours','collect_due_days','remit_due_days','supported_currencies','proxy_confirm_hours','commission_rate_range','commission_terms_version','commission_accept_hours','sla_hours','biz_end_hour');
  return coalesce(out, '{}'::jsonb) || jsonb_build_object('regions', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'nameKo', name_ko, 'nameEn', name_en, 'isCountry', is_country) order by sort, code), '[]'::jsonb) from region where active));
end $$;
revoke all on function console_settings() from public; grant execute on function console_settings() to authenticated;

-- ---------- 초대: 합의 전 호텔 제외 + 요율 스냅샷 ----------
create or replace function admin_invite(p_ref text, p_partner_codes text[]) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; r rfps%rowtype; pid uuid; hp partners%rowtype; v_code text; inv_id uuid; t0 timestamptz := now(); n int := 0; names text[] := '{}'; skipped text[] := '{}'; unagreed text[] := '{}';
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
    -- 요율 합의 전 호텔은 초대하지 않는다(설계 D4)
    if hp.commission_accepted_at is null then unagreed := unagreed || hp.name; continue; end if;
    pid := hp.id;
    if exists (select 1 from invitations where rfp_id = r.id and partner_id = pid and round = r.round and status <> 'reinvited') then continue; end if;
    insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at, commission_rate_pct, commission_basis_scope, commission_terms_version)
      values (r.id, pid, r.round, 'invited', encode(gen_random_bytes(24),'base64'), r.deadline, t0, hp.commission_rate_pct, hp.commission_basis_scope, hp.commission_terms_version) returning id into inv_id;
    update invitations set token = replace(replace(replace(token,'+','-'),'/','_'),'=','') where id = inv_id;
    perform private.enqueue('HTL_INVITE', 'HTL_INVITE:' || inv_id,
      jsonb_build_object('rfp_id', r.id, 'partner_id', pid, 'invitation_id', inv_id, 'to_email', hp.contact_email, 'recipient_kind','htl'),
      jsonb_build_object('ROUND', r.round), t0);
    n := n + 1; names := names || hp.name;
  end loop;
  -- 초대 가능한 호텔이 하나도 없고 합의 전 호텔 때문에 막힌 경우
  if n = 0 and array_length(unagreed, 1) > 0 then raise exception using errcode='P0001', message='MG:COMMISSION_NOT_AGREED'; end if;
  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo)
  values (r.id, t0, 'operator', private.actor_label(x.me), (x.me).user_id, '호텔 ' || n || '곳 초대 (' || array_to_string(names, ', ') || ')' || case when array_length(skipped,1) > 0 then ' · 지역 밖 제외: ' || array_to_string(skipped, ', ') else '' end || case when array_length(unagreed,1) > 0 then ' · 요율 합의 전 제외: ' || array_to_string(unagreed, ', ') else '' end);
  update rfps set row_version = row_version + 1 where id = r.id;
  perform private.audit('rfp', r.ref, 'invite', null, jsonb_build_object('hotels', to_jsonb(names), 'skipped', to_jsonb(skipped), 'unagreed', to_jsonb(unagreed)), r.id, x.hq_override);
  return private.rfp_to_json(r.id);
end $$;


create or replace function admin_reinvite(p_ref text, p_invitation_id uuid) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare x record; r rfps%rowtype; old invitations%rowtype; new_id uuid; t0 timestamptz := now(); hp partners%rowtype;
begin
  select * into x from private.rfp_for_write(p_ref); r := x.r;
  select * into old from invitations where id = p_invitation_id and rfp_id = r.id;
  if old.id is null or r.deadline is null then raise exception using errcode='P0001', message='MG:VALIDATION'; end if;
  select * into hp from partners where id = old.partner_id;
  if hp.commission_accepted_at is null then raise exception using errcode='P0001', message='MG:COMMISSION_NOT_AGREED'; end if;
  update invitations set status = 'reinvited', reinvited_from = old.id where id = old.id;
  insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at, reinvited_from, commission_rate_pct, commission_basis_scope, commission_terms_version)
    values (r.id, old.partner_id, r.round, 'invited', encode(gen_random_bytes(24),'base64'), r.deadline, t0, old.id, hp.commission_rate_pct, hp.commission_basis_scope, hp.commission_terms_version) returning id into new_id;
  update invitations set token = replace(replace(replace(token,'+','-'),'/','_'),'=','') where id = new_id;
  perform private.enqueue('HTL_INVITE', 'HTL_INVITE:' || new_id,
    jsonb_build_object('rfp_id', r.id, 'partner_id', old.partner_id, 'invitation_id', new_id, 'to_email', (select contact_email from partners where id = old.partner_id), 'recipient_kind','htl'),
    jsonb_build_object('ROUND', r.round, 'PREV_DEADLINE', old.deadline), t0);
  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo) values (r.id, t0, 'operator', private.actor_label(x.me), (x.me).user_id, '재초대 · 새 마감 ' || t0);
  update rfps set row_version = row_version + 1 where id = r.id;
  perform private.audit('rfp', r.ref, 'reinvite', null, jsonb_build_object('invitation', new_id), r.id, x.hq_override);
  return private.rfp_to_json(r.id);
end $$;


-- ---------- 호텔 상태 전이: 승인 시 요율 필수 → 제안·동의 링크 발송 ----------
drop function if exists admin_partner_transition(text,text,text,text,text);
create or replace function admin_partner_transition(p_code text, p_action text, p_reason text default null, p_note text default null, p_memo text default null, p_commission_rate_pct numeric default null, p_commission_reason text default null) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; p partners%rowtype; allowed text[]; t0 timestamptz := now(); memo text; had_agreed boolean; v_rate numeric := round(p_commission_rate_pct, 2);
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
    -- 요율: 재개(중지→승인)이고 이미 합의 요율이 있으면 생략 가능, 그 외에는 필수(범위 검증은 propose 와 같은 규칙)
    had_agreed := p.state = 'suspended' and p.commission_accepted_at is not null and p.commission_rate_pct is not null;
    if v_rate is null and not had_agreed then raise exception using errcode='P0001', message='MG:COMMISSION_RATE_REQUIRED'; end if;
    if v_rate is not null then perform private.commission_rate_check(me, v_rate, p_commission_reason); end if;
    memo := coalesce(p_memo, '체크리스트 완료') || case when v_rate is not null then ' · 커미션 ' || trim_scale(v_rate)::text || '% 제안(호텔 동의 대기)' else '' end;
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
    -- 알림은 한 통만: 신규 승인 = PTN_APPROVED(요율 있으면 동의 토큰 포함), 재개 = 요율 변경 없으면 PTN_REINSTATED, 새 요율이면 PTN_COMMISSION_TERMS(토큰 포함)
    if p.state = 'suspended' then
      if v_rate is not null then
        perform private.partner_commission_propose(p.id, me, v_rate, p_commission_reason, 'PTN_COMMISSION_TERMS');
      else
        perform private.enqueue('PTN_REINSTATED', 'PTN_REINSTATED:' || p.id || ':' || extract(epoch from t0), jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind','ptn'), '{}'::jsonb, t0);
      end if;
    elsif v_rate is not null then
      perform private.partner_commission_propose(p.id, me, v_rate, p_commission_reason, 'PTN_APPROVED');
    else
      perform private.enqueue('PTN_APPROVED', 'PTN_APPROVED:' || p.id || ':' || extract(epoch from t0), jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind','ptn'), '{}'::jsonb, t0);
    end if;
    if me.role <> 'operator' then perform private.notify_hq('HQ_HOTEL_APPROVED_BY_PARTNER', 'HQ_HOTEL_APPROVED_BY_PARTNER:' || p.id, null, jsonb_build_object('HOTEL', p.name, 'PARTNER', (select display_name from partner_org where id = me.partner_id))); end if;
  elsif p_action = 'rejected' then
    perform private.enqueue('PTN_REJECTED', 'PTN_REJECTED:' || p.id, jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind','ptn'), jsonb_build_object('REASON', memo), t0);
  end if;
  perform private.audit('hotel', p.code, 'transition:' || p_action, jsonb_build_object('state', p.state), jsonb_build_object('state', p_action, 'commissionRatePct', v_rate), null, false, p_reason);
  return private.partner_to_json(p.id);
end $$;

revoke all on function admin_partner_transition(text,text,text,text,text,numeric,text) from public;
grant execute on function admin_partner_transition(text,text,text,text,text,numeric,text) to authenticated;

create or replace function admin_partner_update(p_code text, p_patch jsonb) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; p partners%rowtype; v_rate numeric;
begin
  me := private.require_console(array['operator','partner_admin','partner_member']::console_role[]);
  select * into p from partners where code = p_code for update;
  if p.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  if me.role <> 'operator' and not (public.region_is_mine(p.region_code) or p.sourced_by_partner = me.partner_id) then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
  -- 요율 변경 제안(호텔 재동의 필요): 담당자(partner_member)는 불가
  if p_patch ? 'commissionRatePct' then
    if me.role = 'partner_member' then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
    if me.role = 'partner_admin' and (select status from partner_org where id = me.partner_id) <> 'active' then raise exception using errcode='P0001', message='MG:PARTNER_SUSPENDED'; end if;
    if p.state not in ('approved','suspended') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
    v_rate := nullif(p_patch->>'commissionRatePct','')::numeric;
  end if;
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
  if v_rate is not null then
    perform private.partner_commission_propose(p.id, me, v_rate, p_patch->>'commissionReason', 'PTN_COMMISSION_TERMS');
    insert into partner_history(partner_id, at, actor, actor_label, operator_id, memo) values (p.id, now(), 'operator', private.actor_label(me), me.user_id, '커미션 ' || trim_scale(round(v_rate, 2))::text || '% 제안(호텔 동의 대기)');
    perform private.audit('hotel', p.code, 'commission_propose', jsonb_build_object('ratePct', p.commission_rate_pct), jsonb_build_object('pendingRatePct', round(v_rate, 2)), null, false, p_patch->>'commissionReason');
  end if;
  return private.partner_to_json(p.id);
end $$;


-- ---------- 동의 링크 재발송(대기 중인 제안이 있을 때만, 최대 5회) ----------
create or replace function partner_commission_resend(p_code text) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; p partners%rowtype; raw text; hrs int; ver text; t0 timestamptz := now();
begin
  me := private.require_console(array['operator','partner_admin']::console_role[]);
  select * into p from partners where code = p_code for update;
  if p.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  if me.role <> 'operator' then
    if not (public.region_is_mine(p.region_code) or p.sourced_by_partner = me.partner_id) then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
    if (select status from partner_org where id = me.partner_id) <> 'active' then raise exception using errcode='P0001', message='MG:PARTNER_SUSPENDED'; end if;
  end if;
  if p.commission_pending_rate_pct is null or p.commission_token_used_at is not null then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  if p.commission_token_send_count >= 5 then raise exception using errcode='P0001', message='MG:RATE_LIMITED'; end if;
  raw := private.gen_token();
  select coalesce((value)::int, 168) into hrs from settings where key = 'commission_accept_hours';
  select value #>> '{}' into ver from settings where key = 'commission_terms_version';
  update partners set commission_token_sha256 = encode(digest(raw, 'sha256'), 'hex'), commission_token_expires_at = t0 + make_interval(hours => coalesce(hrs,168)),
    commission_token_used_at = null, commission_token_sent_at = t0, commission_token_send_count = commission_token_send_count + 1, updated_at = t0 where id = p.id;
  insert into partner_commission_event (partner_id, action, rate_pct, prev_rate_pct, basis_scope, terms_version, actor, actor_role, at)
  values (p.id, 'resent', p.commission_pending_rate_pct, p.commission_rate_pct, p.commission_basis_scope, ver, me.user_id, me.role, t0);
  perform private.enqueue('PTN_COMMISSION_TERMS', 'PTN_COMMISSION_TERMS:' || p.id || ':' || extract(epoch from t0),
    jsonb_build_object('partner_id', p.id, 'to_email', p.contact_email, 'recipient_kind', 'ptn'),
    jsonb_build_object('COMMISSION_TOKEN', raw, 'COMMISSION_RATE', trim_scale(p.commission_pending_rate_pct)::text, 'EXPIRES_HOURS', coalesce(hrs,168), 'TERMS_VERSION', ver), t0);
  insert into partner_history(partner_id, at, actor, actor_label, operator_id, memo) values (p.id, t0, 'operator', private.actor_label(me), me.user_id, '커미션 동의 링크 재발송 (' || (p.commission_token_send_count + 1) || '회차)');
  return private.partner_to_json(p.id);
end $$;
revoke all on function partner_commission_resend(text) from public; grant execute on function partner_commission_resend(text) to authenticated;

-- ---------- 정산: 요율 스냅샷 복사 ----------
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
  -- 선정된 초대의 요율 스냅샷을 복사한다(없으면 합의 요율 없음 플래그)
  if inv.commission_rate_pct is null then f := array_append(f, 'no_agreed_rate'); end if;
  insert into settlements (ref, rfp_id, partner_org_id, hotel_id, quote_id, won_at, event_end, collect_due_date, hotel_currency, partner_share_pct, flags, remit_currency, agreed_rate_pct, commission_basis_scope, commission_terms_version)
  values (v_ref, p_rfp_id, r.partner_org_id, hp.id, q.id, coalesce(r.closed_at, now()), r.end_date, coalesce(r.end_date, now()::date) + coalesce(days,30), coalesce(q.currency, 'USD'), pct, f, coalesce(po.settlement_currency, 'USD'), inv.commission_rate_pct, inv.commission_basis_scope, inv.commission_terms_version)
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
    'agreedRatePct', s.agreed_rate_pct, 'commissionBasisScope', s.commission_basis_scope, 'commissionTermsVersion', s.commission_terms_version,
    'voidReason', s.void_reason, 'flags', to_jsonb(s.flags), 'attachments', s.attachments, 'rowVersion', s.row_version, 'createdAt', s.created_at, 'events', ev);
end $$;


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
    -- 합의 요율이 있으면 기준·요율을 프리필한다(계약 금액은 객실 + 연회·F&B 세금·봉사료 제외 net 기준)
    if s.agreed_rate_pct is not null then
      if coalesce(basis,'') = '' then basis := 'rate'; end if;
      if rate is null and basis = 'rate' then rate := s.agreed_rate_pct; end if;
    end if;
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
    -- 합의 요율과 다르면(정률 아님 포함) 사유 필수 + 편차 플래그
    f := array_remove(f, 'rate_deviation');
    if s.agreed_rate_pct is not null and (basis <> 'rate' or rate is distinct from s.agreed_rate_pct) then
      if coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:GUARD_NOTE'; end if;
      f := array_append(f, 'rate_deviation');
    end if;
    f := array_remove(f, 'contract_below_quote');
    if contract < coalesce((select coalesce(q.twin_rate,0) * coalesce(r.twin_rooms,0) + coalesce(q.king_rate,0) * coalesce(r.king_rooms,0) from quotes q join rfps r on r.id = q.rfp_id where q.id = s.quote_id), 0) * 0.7 then
      if coalesce(p_note,'') = '' then raise exception using errcode='P0001', message='MG:GUARD_NOTE'; end if;
      f := array_append(f, 'contract_below_quote');
    end if;
    update settlements set contract_amount = contract, commission_basis = basis, commission_rate_pct = rate, commission_amount = amt, hotel_currency = s.hotel_currency,
      commission_submitted_at = t0, commission_submitted_by = me.user_id, status = 'commission_submitted', flags = f, row_version = row_version + 1, updated_at = t0 where id = s.id;
    to_st := 'commission_submitted';
    if 'rate_deviation' = any(f) then perform private.notify_hq('HQ_COMMISSION_RATE_DEVIATION', 'HQ_COMMISSION_RATE_DEVIATION:' || s.id || ':' || s.row_version, s.rfp_id, jsonb_build_object('SETTLEMENT_REF', s.ref)); end if;
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
      -- 금액을 직접 덮어쓰면 정액이 되므로, 합의 요율이 있는 건은 요율 편차 플래그를 남긴다(요율로 환산해 합의 요율과 같으면 제외)
      update settlements set commission_amount = amt, commission_basis = 'fixed', commission_rate_pct = null,
        flags = case when s.agreed_rate_pct is not null
                      and (s.contract_amount is null or s.contract_amount <= 0 or round(amt * 100 / s.contract_amount, 2) is distinct from s.agreed_rate_pct)
                     then array_append(array_remove(flags, 'rate_deviation'), 'rate_deviation')
                     else array_remove(flags, 'rate_deviation') end
      where id = s.id;
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

-- ---------- 콘솔 알림 문구 +3 ----------
create or replace function private.console_notice_text(p_template_id text, p_vars jsonb) returns jsonb
language plpgsql immutable as $$
declare v jsonb := coalesce(p_vars, '{}'::jsonb); ref text := coalesce(v->>'RFP_ID', ''); st text := coalesce(v->>'SETTLEMENT_REF', ''); t text; b text; u text;
begin
  u := case when st <> '' then '/admin/settlement.html?ref=' || st when ref <> '' then '/admin/rfp.html?id=' || ref else '/admin/dashboard.html' end;
  case p_template_id
    when 'PTR_ASSIGNED' then t := '새 요청 배정 · ' || ref; b := '담당 지역의 요청 ' || ref || '이(가) 배정되었습니다. 24시간 안에 검증을 시작해 주세요.';
    when 'PTR_UNASSIGNED' then t := '배정 해제 · ' || ref; b := '요청 ' || ref || '의 배정이 해제되었습니다' || coalesce(' (' || (v->>'REASON') || ')', '') || '. 더 이상 이 요청을 처리하지 않습니다.';
    when 'PTR_TAKEN_OVER' then t := '본사 인계 · ' || ref; b := '요청 ' || ref || '을(를) MICEGO 본사가 인계했습니다' || coalesce(' · ' || (v->>'REASON'), '') || '. 콘솔에서는 읽기 전용으로 보입니다.';
    when 'PTR_RELEASED' then t := '위임 복원 · ' || ref; b := '요청 ' || ref || '이(가) 다시 귀 조직에 위임되었습니다. 진행 상황을 확인해 주세요.';
    when 'PTR_HQ_ACTION' then t := '본사 처리 · ' || ref; b := 'MICEGO 본사가 요청 ' || ref || '에 대해 ' || coalesce(v->>'ACTION', '처리') || '을(를) 수행했습니다. 이력을 확인해 주세요.';
    when 'PTR_HOTEL_CONFIRMED' then t := '호텔 확인 완료 · ' || ref; b := coalesce(v->>'HOTEL', '호텔') || '이(가) 대리 입력 견적을 확인했습니다. 비교표에 포함됩니다.';
    when 'PTR_HOTEL_DISPUTED' then t := '호텔 이의 제기 · ' || ref; b := coalesce(v->>'HOTEL', '호텔') || '이(가) 대리 입력 견적에 이의를 제기했습니다' || coalesce(': ' || (v->>'REASON'), '') || '. 견적은 사용되지 않습니다. 호텔과 확인 후 다시 입력하거나 호텔이 직접 제출하도록 안내하세요.';
    when 'PTR_WON' then t := '성사 · 정산 시작 · ' || ref; b := '요청 ' || ref || '이(가) 성사되었습니다. 정산 ' || st || '에 호텔 계약 금액과 커미션을 입력해 주세요.';
    when 'PTR_COMMISSION_APPROVED' then t := '커미션 승인 · ' || st; b := '정산 ' || st || '의 커미션이 확정되었습니다. 행사 종료 후 수금을 기록해 주세요.';
    when 'PTR_COMMISSION_REJECTED' then t := '커미션 반려 · ' || st; b := '정산 ' || st || '의 커미션이 반려되었습니다' || coalesce(': ' || (v->>'REASON'), '') || '. 내용을 고쳐 다시 제출해 주세요.';
    when 'PTR_SETTLEMENT_RESOLVED' then t := '정산 분쟁 해소 · ' || st; b := '정산 ' || st || '의 분쟁이 해소되었습니다' || coalesce(': ' || (v->>'RESOLUTION'), '') || '.';
    when 'PTR_SETTLEMENT_COMPLETED' then t := '정산 완료 · ' || st; b := '정산 ' || st || '이(가) 완료되었습니다. 수고하셨습니다.';
    when 'HQ_RFP_HELD' then t := '본사 보유 · ' || ref; b := '요청 ' || ref || '이(가) 본사 보유 상태입니다 (사유: ' || coalesce(v->>'HOLD_REASON', '-') || '). 파트너를 배정하거나 직접 처리해 주세요.';
    when 'HQ_PARTNER_DECLINED' then t := '파트너 배정 반려 · ' || ref; b := '지역 파트너가 요청 ' || ref || '의 배정을 반려했습니다' || coalesce(': ' || (v->>'REASON'), '') || '. 본사에서 처리해 주세요.';
    when 'HQ_HOTEL_APPROVED_BY_PARTNER' then t := '파트너 호텔 승인 · 사후 검토 필요'; b := coalesce(v->>'PARTNER', '지역 파트너') || '이(가) 호텔 ' || coalesce(v->>'HOTEL', '') || '을(를) 승인했습니다. 호텔 상세에서 사후 검토를 완료해 주세요.'; u := '/admin/partners.html';
    when 'HQ_HOTEL_UNREVIEWED_DELIVERED' then t := '사후 검토 전 호텔 비교표 전달 · ' || ref; b := '요청 ' || ref || '의 비교표에 본사 사후 검토가 끝나지 않은 호텔 ' || coalesce(v->>'COUNT', '?') || '곳이 포함되어 전달되었습니다. 성사 시 커미션 승인 전에 검토가 필요합니다.';
    when 'HQ_PROXY_DISPUTED' then t := '호텔 이의(대리 입력) · ' || ref; b := coalesce(v->>'HOTEL', '호텔') || '이(가) 파트너 대리 입력 견적에 이의를 제기했습니다. 개입 목록을 확인해 주세요.';
    when 'HQ_COMMISSION_SUBMITTED' then t := '커미션 승인 요청 · ' || st; b := '정산 ' || st || '의 커미션이 제출되었습니다. 금액과 근거를 검토하고 승인해 주세요.';
    when 'HQ_REMITTED' then t := '송금 기록 · 입금 확인 요청 · ' || st; b := '정산 ' || st || '에 송금 ' || coalesce(v->>'CURRENCY', '') || ' ' || coalesce(v->>'AMOUNT', '') || '이(가) 기록되었습니다. 입금을 확인해 주세요.';
    when 'HQ_SETTLEMENT_DISPUTE' then t := '정산 분쟁 · ' || st; b := '정산 ' || st || '에 분쟁이 제기되었습니다' || coalesce(': ' || (v->>'REASON'), '') || '.';
    when 'PTR_HOTEL_TERMS_ACCEPTED' then t := '호텔 커미션 동의 · ' || coalesce(v->>'HOTEL', ''); b := coalesce(v->>'HOTEL', '호텔') || '이(가) 커미션 ' || coalesce(v->>'RATE', '?') || '%에 동의했습니다. 이제 견적 초대를 보낼 수 있습니다.'; u := '/admin/partners.html';
    when 'HQ_HOTEL_TERMS_ACCEPTED' then t := '호텔 커미션 동의 · ' || coalesce(v->>'HOTEL', ''); b := coalesce(v->>'HOTEL', '호텔') || '이(가) 커미션 ' || coalesce(v->>'RATE', '?') || '%에 동의했습니다.'; u := '/admin/partners.html';
    when 'HQ_COMMISSION_RATE_DEVIATION' then t := '합의 요율과 다른 커미션 제출 · ' || st; b := '정산 ' || st || '의 커미션이 호텔 합의 요율과 다르게 제출되었습니다. 사유를 확인하고 승인해 주세요.';
    else t := replace(p_template_id, '_', ' ') || coalesce(' · ' || nullif(ref, ''), ''); b := '콘솔에서 자세한 내용을 확인해 주세요.';
  end case;
  return jsonb_build_object('NOTICE_TITLE', t, 'NOTICE_BODY', b, 'CONSOLE_PATH', u);
end $$;


-- Edge Function(service_role)이 새 private 함수·테이블을 쓸 수 있게
grant execute on all functions in schema private to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
