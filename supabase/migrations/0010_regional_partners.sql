-- MICEGO 0010: 지역 운영 파트너 — 조직·지역·콘솔 계정·RFP 위임·신원 열람 로그·개입 알림  - 클로드
-- 설계: 지역파트너 콘솔 기술설계서 v1 §2~4, §7. 테이블명은 실제 스키마(rfps / invitations / quotes / partners=호텔)로 치환.
set search_path = public;

-- ---------- enums ----------
do $$ begin create type public.console_role as enum ('operator','partner_admin','partner_member'); exception when duplicate_object then null; end $$;
do $$ begin create type public.console_user_status as enum ('invited','active','disabled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.partner_org_status as enum ('onboarding','active','suspended','terminated'); exception when duplicate_object then null; end $$;
do $$ begin create type public.rfp_delegation as enum ('delegated','hq_held','taken_over'); exception when duplicate_object then null; end $$;
do $$ begin create type public.hotel_approved_via as enum ('hq','partner'); exception when duplicate_object then null; end $$;
do $$ begin create type public.intervention_kind as enum ('unassigned_stale','partner_idle','sla_breach','partner_inactive','proxy_disputed','organizer_voc','settlement_overdue','hotel_unreviewed_won'); exception when duplicate_object then null; end $$;

-- ---------- 통화 반올림 ----------
create or replace function public.ccy_minor(p_ccy char(3)) returns int
language sql immutable parallel safe as $$ select case when p_ccy in ('KRW','VND','JPY','IDR') then 0 else 2 end $$;
create or replace function public.ccy_round(p_amt numeric, p_ccy char(3)) returns numeric
language sql immutable parallel safe as $$ select round(p_amt, public.ccy_minor(p_ccy)) $$;

-- ---------- region ----------
create table if not exists region (
  code text primary key check (code ~ '^[A-Z]{2}(-[A-Z0-9]{2,3})?$'),
  country_code char(2) not null generated always as (left(code,2)) stored,
  is_country boolean not null generated always as (length(code) = 2) stored,
  name_ko text not null,
  name_en text not null,
  utc_offset_label text,
  active boolean not null default true,
  sort smallint not null default 100,
  created_at timestamptz not null default now()
);
alter table region drop constraint if exists region_city_parent;
alter table region add constraint region_city_parent foreign key (country_code) references region(code) deferrable initially deferred;

create table if not exists region_alias (
  alias_norm text primary key,
  region_code text not null references region(code),
  alias_display text not null,
  source text not null default 'seed' check (source in ('seed','operator')),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists region_alias_code_idx on region_alias (region_code);

create or replace function public.region_normalize(p text) returns text
language sql immutable parallel safe as $$
  select regexp_replace(regexp_replace(lower(normalize(coalesce(p,''), NFC)), '[[:space:]\-\.,\(\)''’·]+', '', 'g'), '(시|섬|island|city|province|주)$', '')
$$;

create or replace function public.region_covers(p_partner_code text, p_rfp_code text) returns boolean
language sql immutable parallel safe as $$
  select p_rfp_code is not null and p_partner_code is not null and (p_rfp_code = p_partner_code or (length(p_partner_code) = 2 and left(p_rfp_code, 2) = p_partner_code))
$$;

-- seed (국가 → 도시)
insert into region (code, name_ko, name_en, utc_offset_label, sort) values
 ('TH','태국','Thailand','+07:00',10), ('VN','베트남','Vietnam','+07:00',20), ('ID','인도네시아','Indonesia','+08:00',30),
 ('MY','말레이시아','Malaysia','+08:00',40), ('PH','필리핀','Philippines','+08:00',50), ('SG','싱가포르','Singapore','+08:00',60),
 ('JP','일본','Japan','+09:00',70), ('TW','대만','Taiwan','+08:00',80), ('HK','홍콩','Hong Kong','+08:00',90), ('MO','마카오','Macau','+08:00',95),
 ('GU','괌','Guam','+10:00',100), ('MP','사이판','Saipan','+10:00',105), ('US','미국','United States','-10:00',110),
 ('TH-BKK','방콕','Bangkok','+07:00',11), ('TH-UTP','파타야','Pattaya','+07:00',12), ('TH-HKT','푸껫','Phuket','+07:00',13), ('TH-KBV','끄라비','Krabi','+07:00',14), ('TH-USM','코사무이','Koh Samui','+07:00',15), ('TH-CNX','치앙마이','Chiang Mai','+07:00',16),
 ('VN-DAD','다낭','Da Nang','+07:00',21), ('VN-CXR','나트랑·깜라인','Nha Trang / Cam Ranh','+07:00',22), ('VN-PQC','푸꾸옥','Phu Quoc','+07:00',23), ('VN-SGN','호찌민','Ho Chi Minh City','+07:00',24), ('VN-HAN','하노이','Hanoi','+07:00',25),
 ('ID-DPS','발리','Bali','+08:00',31), ('MY-BKI','코타키나발루','Kota Kinabalu','+08:00',41), ('MY-KUL','쿠알라룸푸르','Kuala Lumpur','+08:00',42), ('PH-CEB','세부','Cebu','+08:00',51), ('US-HI','하와이','Hawaii','-10:00',111)
on conflict (code) do nothing;

insert into region_alias (alias_norm, region_code, alias_display)
select public.region_normalize(a), c, a from (values
 ('태국','TH'),('타이','TH'),('thailand','TH'),('방콕','TH-BKK'),('bangkok','TH-BKK'),('krungthep','TH-BKK'),('bkk','TH-BKK'),
 ('파타야','TH-UTP'),('pattaya','TH-UTP'),('촌부리','TH-UTP'),('푸켓','TH-HKT'),('푸껫','TH-HKT'),('phuket','TH-HKT'),('hkt','TH-HKT'),
 ('끄라비','TH-KBV'),('크라비','TH-KBV'),('krabi','TH-KBV'),('사무이','TH-USM'),('코사무이','TH-USM'),('samui','TH-USM'),('kohsamui','TH-USM'),
 ('치앙마이','TH-CNX'),('chiangmai','TH-CNX'),
 ('베트남','VN'),('vietnam','VN'),('vietnam','VN'),('다낭','VN-DAD'),('danang','VN-DAD'),('호이안','VN-DAD'),('hoian','VN-DAD'),('dad','VN-DAD'),
 ('나트랑','VN-CXR'),('냐짱','VN-CXR'),('nhatrang','VN-CXR'),('깜라인','VN-CXR'),('캄란','VN-CXR'),('camranh','VN-CXR'),
 ('푸꾸옥','VN-PQC'),('푸쿠옥','VN-PQC'),('phuquoc','VN-PQC'),('호치민','VN-SGN'),('호찌민','VN-SGN'),('사이공','VN-SGN'),('hcmc','VN-SGN'),('saigon','VN-SGN'),
 ('하노이','VN-HAN'),('hanoi','VN-HAN'),('하롱베이','VN-HAN'),('halong','VN-HAN'),
 ('인도네시아','ID'),('indonesia','ID'),('발리','ID-DPS'),('bali','ID-DPS'),('누사두아','ID-DPS'),('우붓','ID-DPS'),('스미냑','ID-DPS'),('denpasar','ID-DPS'),
 ('말레이시아','MY'),('malaysia','MY'),('코타키나발루','MY-BKI'),('코키','MY-BKI'),('kotakinabalu','MY-BKI'),('쿠알라룸푸르','MY-KUL'),('kualalumpur','MY-KUL'),
 ('필리핀','PH'),('philippines','PH'),('세부','PH-CEB'),('cebu','PH-CEB'),('막탄','PH-CEB'),
 ('싱가포르','SG'),('싱가폴','SG'),('singapore','SG'),('일본','JP'),('japan','JP'),('대만','TW'),('타이완','TW'),('taiwan','TW'),
 ('홍콩','HK'),('hongkong','HK'),('마카오','MO'),('macau','MO'),('괌','GU'),('guam','GU'),('사이판','MP'),('saipan','MP'),
 ('미국','US'),('하와이','US-HI'),('호놀룰루','US-HI'),('와이키키','US-HI'),('마우이','US-HI'),('hawaii','US-HI'),('honolulu','US-HI')
) v(a, c)
on conflict (alias_norm) do nothing;

-- ---------- partner_org / partner_region ----------
create table if not exists partner_org (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{3,12}$'),
  legal_name text not null,
  display_name text not null,
  public_name text not null,
  country_code char(2) not null,
  status partner_org_status not null default 'onboarding',
  revenue_share_pct numeric(5,2) not null default 70.00 check (revenue_share_pct between 0 and 100),
  settlement_currency char(3) not null default 'USD',
  accepting_new boolean not null default true,
  max_active_rfps int check (max_active_rfps is null or max_active_rfps > 0),
  max_accounts int not null default 10,
  contact_name text, contact_email citext, contact_phone text,
  timezone text not null default 'Asia/Bangkok',
  contract_ref text, contract_start date, contract_end date,
  dpa_signed_at timestamptz,
  suspended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint partner_active_needs_dpa check (status <> 'active' or dpa_signed_at is not null)
);

create table if not exists partner_region (
  partner_id uuid not null references partner_org(id) on delete restrict,
  region_code text not null references region(code),
  is_primary boolean not null default false,
  priority smallint not null default 100,
  active boolean not null default true,
  note text,
  created_by uuid, created_at timestamptz not null default now(),
  primary key (partner_id, region_code)
);
create unique index if not exists partner_region_one_primary on partner_region (region_code) where is_primary and active;
create index if not exists partner_region_code_idx on partner_region (region_code) where active;

-- ---------- console_user ----------
create table if not exists console_user (
  user_id uuid primary key,
  role console_role not null,
  partner_id uuid references partner_org(id) on delete restrict,
  status console_user_status not null default 'invited',
  email citext not null unique,
  display_name text not null,
  phone text,
  claims_version int not null default 1,
  invited_by uuid, invited_at timestamptz not null default now(),
  accepted_at timestamptz, last_seen_at timestamptz,
  disabled_at timestamptz, disabled_by uuid, disabled_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint console_user_partner_scope check ((role = 'operator') = (partner_id is null))
);
create index if not exists console_user_partner_idx on console_user (partner_id) where status <> 'disabled';

-- ---------- rfps 컬럼 ----------
alter table rfps
  add column if not exists region_code text references region(code),
  add column if not exists region_source text check (region_source in ('auto','operator')),
  add column if not exists region_input text,
  add column if not exists partner_org_id uuid references partner_org(id),
  add column if not exists delegation rfp_delegation not null default 'hq_held',
  add column if not exists hold_reason text default 'pending' check (hold_reason is null or hold_reason in ('pending','region_unmapped','multi_region','no_partner','partner_ineligible','partner_declined','auto_assign_off','manual','legacy')),
  add column if not exists delegated_at timestamptz,
  add column if not exists delegated_by uuid,
  add column if not exists taken_over_at timestamptz,
  add column if not exists taken_over_by uuid,
  add column if not exists takeover_reason text,
  add column if not exists partner_share_override_pct numeric(5,2) check (partner_share_override_pct is null or partner_share_override_pct between 0 and 100),
  add column if not exists row_version int not null default 1;

alter table rfps drop constraint if exists rfp_delegation_shape;
alter table rfps add constraint rfp_delegation_shape check (
  case delegation
    when 'delegated'  then partner_org_id is not null and region_code is not null and delegated_at is not null
    when 'taken_over' then partner_org_id is not null and taken_over_at is not null and taken_over_by is not null
    when 'hq_held'    then partner_org_id is null and hold_reason is not null
  end);
create index if not exists rfps_partner_org_idx on rfps (partner_org_id, state) where partner_org_id is not null;
create index if not exists rfps_delegation_idx on rfps (delegation, state);
create index if not exists rfps_region_code_idx on rfps (region_code);

create table if not exists rfp_assignment_event (
  id bigserial primary key,
  rfp_id uuid not null references rfps(id) on delete cascade,
  action text not null check (action in ('auto_assign','auto_hold','assign','reassign','hold','decline','takeover','release','region_set','hq_override')),
  from_partner uuid references partner_org(id),
  to_partner uuid references partner_org(id),
  from_delegation rfp_delegation,
  to_delegation rfp_delegation,
  region_code text,
  reason text,
  payload jsonb not null default '{}'::jsonb,
  actor uuid,
  actor_role console_role,
  created_at timestamptz not null default now()
);
create index if not exists rfp_assignment_event_idx on rfp_assignment_event (rfp_id, created_at);

-- ---------- partners(호텔) 컬럼 ----------
alter table partners
  add column if not exists region_code text references region(code),
  add column if not exists sourced_by_partner uuid references partner_org(id),
  add column if not exists approved_via hotel_approved_via,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists hq_reviewed_at timestamptz,
  add column if not exists hq_reviewed_by uuid,
  add column if not exists contact_email_verified_at timestamptz,
  add column if not exists risk_flags text[] not null default '{}';
create index if not exists partners_region_idx on partners (region_code, state);
create index if not exists partners_sourced_idx on partners (sourced_by_partner) where sourced_by_partner is not null;
create index if not exists partners_hq_review_idx on partners (hq_reviewed_at) where approved_via = 'partner' and hq_reviewed_at is null;

-- 기존 승인 호텔은 HQ 승인·검토 완료로 백필
update partners set approved_via = 'hq', approved_at = coalesce(reviewed_at, updated_at), hq_reviewed_at = coalesce(reviewed_at, updated_at)
 where state = 'approved' and approved_via is null;
-- 호텔 지역 백필: dest 문자열을 별칭으로 매핑(실패하면 null — 운영자가 콘솔에서 지정)
update partners p set region_code = a.region_code
  from region_alias a where p.region_code is null and a.alias_norm = public.region_normalize(p.dest);

-- ---------- identity_view_log / intervention_alert ----------
create table if not exists identity_view_log (
  id bigserial primary key,
  rfp_id uuid not null references rfps(id) on delete cascade,
  viewer uuid not null,
  viewer_role console_role not null,
  partner_id uuid references partner_org(id),
  fields text[] not null,
  context text not null check (context in ('rfp_detail','reveal_phone','export','notification_preview')),
  created_at timestamptz not null default now()
);
create index if not exists identity_view_log_rfp_idx on identity_view_log (rfp_id, created_at desc);
create index if not exists identity_view_log_partner_idx on identity_view_log (partner_id, created_at desc);
create index if not exists identity_view_log_viewer_idx on identity_view_log (viewer, created_at desc);

create or replace function private.deny_change() returns trigger language plpgsql as $$
begin raise exception using errcode = 'P0001', message = 'MG:IMMUTABLE'; end $$;
drop trigger if exists identity_view_log_immutable on identity_view_log;
create trigger identity_view_log_immutable before update or delete on identity_view_log for each row execute function private.deny_change();

create table if not exists intervention_alert (
  id bigserial primary key,
  rfp_id uuid references rfps(id) on delete cascade,
  settlement_id uuid,
  partner_id uuid references partner_org(id),
  kind intervention_kind not null,
  severity smallint not null check (severity between 1 and 3),
  detail jsonb not null default '{}'::jsonb,
  opened_at timestamptz not null default now(),
  last_notified_at timestamptz,
  snoozed_until timestamptz,
  resolved_at timestamptz, resolved_by uuid,
  resolution text check (resolution is null or resolution in ('auto_cleared','taken_over','reassigned','dismissed'))
);
create unique index if not exists intervention_open_uniq on intervention_alert (coalesce(rfp_id, settlement_id), kind) where resolved_at is null;

-- audit_log 확장
alter table audit_log
  add column if not exists actor_role console_role,
  add column if not exists partner_org_id uuid,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists before jsonb,
  add column if not exists after jsonb,
  add column if not exists hq_override boolean not null default false;
create index if not exists audit_log_partner_org_idx on audit_log (partner_org_id, at desc);

-- ---------- settings 기본값 ----------
insert into settings (key, value) values
  ('partner_auto_assign_enabled', 'true'::jsonb),
  ('partner_idle_hours', '24'::jsonb),
  ('collect_due_days', '30'::jsonb),
  ('remit_due_days', '14'::jsonb),
  ('supported_currencies', '["KRW","USD","THB","VND","IDR","MYR","JPY","EUR","SGD","PHP"]'::jsonb),
  ('proxy_confirm_hours', '72'::jsonb),
  ('commission_rate_range', '[5,20]'::jsonb)
on conflict (key) do nothing;

-- ---------- 권한 헬퍼 (public: RLS 정책에서 호출) ----------
-- 활성 콘솔 계정. security definer: console_user 자체에 RLS가 걸려 있어 재귀 방지.
create or replace function public.console_me() returns console_user
language sql stable security definer set search_path = public, pg_temp as $$
  select * from console_user where user_id = auth.uid() and status = 'active'
$$;

-- 운영자 판정: console_user 기준. 아직 console_user 행이 없는 계정은 JWT app_metadata.role='operator'로 인정(기존 운영자·테스트 호환).
create or replace function public.is_operator() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when exists (select 1 from console_user cu where cu.user_id = auth.uid()) then
      exists (select 1 from console_user cu where cu.user_id = auth.uid() and cu.status = 'active' and cu.role = 'operator')
    else coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'operator'
  end
$$;
create or replace function private.is_operator() returns boolean
language sql stable as $$ select public.is_operator() $$;

create or replace function public.my_partner_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select cu.partner_id from console_user cu join partner_org po on po.id = cu.partner_id
   where cu.user_id = auth.uid() and cu.status = 'active' and cu.role in ('partner_admin','partner_member')
     and po.status in ('active','suspended')
$$;
create or replace function public.is_partner() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$ select public.my_partner_id() is not null $$;
create or replace function public.is_partner_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.my_partner_id() is not null and (select role from console_user where user_id = auth.uid()) = 'partner_admin'
$$;
create or replace function public.my_regions() returns text[]
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(pr.region_code), '{}'::text[]) from partner_region pr where pr.partner_id = public.my_partner_id() and pr.active
$$;
create or replace function public.region_is_mine(p_code text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select p_code is not null and exists (select 1 from unnest(public.my_regions()) r where public.region_covers(r, p_code))
$$;
create or replace function public.can_read_rfp(p_rfp_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_operator() or exists (
    select 1 from rfps r where r.id = p_rfp_id and r.partner_org_id is not null
      and r.partner_org_id = public.my_partner_id() and r.delegation in ('delegated','taken_over'))
$$;

-- 콘솔 계정 요구 (RPC용). p_roles null = 모든 역할
create or replace function private.require_console(p_roles console_role[] default null) returns console_user
language plpgsql stable as $$
declare me console_user%rowtype;
begin
  select * into me from console_user where user_id = auth.uid() and status = 'active';
  if me.user_id is null then
    -- console_user 행이 없는 JWT 운영자(기존 계정) 호환
    if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'operator' and not exists (select 1 from console_user where user_id = auth.uid()) then
      me.user_id := auth.uid(); me.role := 'operator'; me.status := 'active'; me.display_name := '운영자'; me.email := coalesce(auth.jwt() ->> 'email', 'operator@local');
    else
      raise exception using errcode = 'P0001', message = 'MG:FORBIDDEN';
    end if;
  end if;
  if p_roles is not null and not (me.role = any(p_roles)) then
    raise exception using errcode = 'P0001', message = 'MG:FORBIDDEN';
  end if;
  if me.role <> 'operator' then
    if not exists (select 1 from partner_org where id = me.partner_id and status in ('active','suspended')) then
      raise exception using errcode = 'P0001', message = 'MG:FORBIDDEN';
    end if;
  end if;
  return me;
end $$;

-- 기존 require_operator 는 그대로 두되 새 판정을 쓴다
create or replace function private.require_operator() returns void
language plpgsql as $$
begin
  if not public.is_operator() then raise exception using errcode = 'P0001', message = 'MG:FORBIDDEN'; end if;
end $$;

-- RFP 쓰기 판정. 반환 true = HQ가 파트너 위임 건을 직접 처리(hq_override).
create or replace function private.assert_rfp_write(r rfps, me console_user) returns boolean
language plpgsql stable as $$
begin
  if me.role = 'operator' then return r.delegation = 'delegated'; end if;
  if r.partner_org_id is distinct from me.partner_id then raise exception using errcode = 'P0001', message = 'MG:NOT_FOUND'; end if;
  if r.delegation = 'taken_over' then raise exception using errcode = 'P0001', message = 'MG:RFP_TAKEN_OVER'; end if;
  if r.delegation <> 'delegated' then raise exception using errcode = 'P0001', message = 'MG:NOT_FOUND'; end if;
  if not public.region_is_mine(r.region_code) then raise exception using errcode = 'P0001', message = 'MG:REGION_REVOKED'; end if;
  if (select status from partner_org where id = me.partner_id) <> 'active' then raise exception using errcode = 'P0001', message = 'MG:PARTNER_SUSPENDED'; end if;
  return false;
end $$;

-- 감사 기록 공통
create or replace function private.audit(p_entity_type text, p_entity_id text, p_action text, p_before jsonb, p_after jsonb, p_rfp_id uuid default null, p_hq_override boolean default false, p_reason text default null) returns void
language plpgsql as $$
declare me console_user%rowtype;
begin
  select * into me from console_user where user_id = auth.uid();
  insert into audit_log (actor, operator_id, rfp_id, action, reason, actor_role, partner_org_id, entity_type, entity_id, before, after, hq_override)
  values (case when me.role in ('partner_admin','partner_member') then 'operator'::actor_kind else 'operator'::actor_kind end,
          auth.uid(), p_rfp_id, p_action, p_reason, coalesce(me.role, case when public.is_operator() then 'operator'::console_role end),
          me.partner_id, p_entity_type, p_entity_id, p_before, p_after, p_hq_override);
end $$;

-- 템플릿이 아직 라이브러리에 없으면 발송 대신 이력만 남긴다(알림 WP에서 템플릿 추가 후 자동 활성)
create or replace function private.enqueue_if_template(p_template_id text, p_idem_key text, p_target jsonb, p_vars jsonb default '{}'::jsonb, p_rfp_id uuid default null) returns bigint
language plpgsql as $$
begin
  if exists (select 1 from notif_template_meta where id = p_template_id) then
    return private.enqueue(p_template_id, p_idem_key, p_target, p_vars, now());
  end if;
  if p_rfp_id is not null then
    insert into rfp_history(rfp_id, at, actor, actor_label, memo) values (p_rfp_id, now(), 'system', '시스템', p_template_id || ' 알림 예정(템플릿 미등록 · 수동 안내 필요)');
  end if;
  return null;
end $$;

-- 파트너 조직 구성원 전원에게 알림
create or replace function private.notify_partner(p_partner_id uuid, p_template_id text, p_idem_prefix text, p_rfp_id uuid, p_vars jsonb default '{}'::jsonb) returns void
language plpgsql as $$
declare u console_user%rowtype;
begin
  for u in select * from console_user where partner_id = p_partner_id and status = 'active' loop
    perform private.enqueue_if_template(p_template_id, p_idem_prefix || ':' || u.user_id,
      jsonb_build_object('rfp_id', p_rfp_id, 'to_email', u.email, 'recipient_kind', 'ptr'), p_vars, null);
  end loop;
end $$;

create or replace function private.notify_hq(p_template_id text, p_idem_key text, p_rfp_id uuid, p_vars jsonb default '{}'::jsonb) returns void
language plpgsql as $$
declare v_to text;
begin
  select value #>> '{}' into v_to from settings where key = 'ops_email';
  if v_to is null then
    select email into v_to from console_user where role = 'operator' and status = 'active' order by created_at limit 1;
  end if;
  perform private.enqueue_if_template(p_template_id, p_idem_key, jsonb_build_object('rfp_id', p_rfp_id, 'to_email', v_to, 'recipient_kind', 'ops'), p_vars, p_rfp_id);
end $$;

-- ---------- 지역 매핑 ----------
create or replace function public.region_resolve(p_text text) returns table (code text, confidence text, reason text)
language plpgsql stable as $$
declare
  toks text[]; t text; a region_alias%rowtype; hits text[] := '{}'; countries text[] := '{}'; cities text[] := '{}'; c text;
begin
  toks := regexp_split_to_array(coalesce(p_text,''), '[,/·&]|\s및\s|\sand\s|\s+');
  foreach t in array toks loop
    if btrim(t) = '' then continue; end if;
    select * into a from region_alias where alias_norm = public.region_normalize(t);
    if a.region_code is null then
      select * into a from region_alias where alias_norm = public.region_normalize(regexp_replace(t, '(시|섬|island|city)$', ''));
    end if;
    if a.region_code is not null then hits := hits || a.region_code; end if;
  end loop;
  -- 두 단어 결합(예: '코타 키나발루', 'Nha Trang')도 한 번 시도
  if array_length(hits,1) is null and array_length(toks,1) >= 2 then
    select * into a from region_alias where alias_norm = public.region_normalize(array_to_string(toks, ''));
    if a.region_code is not null then hits := hits || a.region_code; end if;
  end if;
  select coalesce(array_agg(distinct left(h,2)), '{}') into countries from unnest(hits) h;
  if array_length(countries,1) is null then return query select null::text, 'none'::text, 'region_unmapped'::text; return; end if;
  if array_length(countries,1) > 1 then return query select null::text, 'none'::text, 'multi_region'::text; return; end if;
  c := countries[1];
  select coalesce(array_agg(distinct h), '{}') into cities from unnest(hits) h where length(h) > 2;
  if array_length(cities,1) = 1 then return query select cities[1], 'high'::text, 'city'::text; return; end if;
  if array_length(cities,1) > 1 then return query select c, 'medium'::text, 'multi_city_same_country'::text; return; end if;
  return query select c, 'high'::text, 'country'::text;
end $$;

-- ---------- 배정 ----------
create or replace function private.rfp_hold(p_rfp_id uuid, p_reason text, p_action text, p_payload jsonb default '{}'::jsonb, p_actor uuid default null) returns void
language plpgsql as $$
declare r rfps%rowtype;
begin
  select * into r from rfps where id = p_rfp_id for update;
  update rfps set partner_org_id = null, delegation = 'hq_held', hold_reason = p_reason, delegated_at = null, delegated_by = null, row_version = row_version + 1, updated_at = now() where id = p_rfp_id;
  insert into rfp_assignment_event (rfp_id, action, from_partner, from_delegation, to_delegation, region_code, reason, payload, actor)
  values (p_rfp_id, p_action, r.partner_org_id, r.delegation, 'hq_held', r.region_code, p_reason, p_payload, p_actor);
  if r.partner_org_id is not null then
    perform private.notify_partner(r.partner_org_id, 'PTR_UNASSIGNED', 'PTR_UNASSIGNED:' || p_rfp_id || ':' || r.row_version, p_rfp_id, jsonb_build_object('RFP_ID', r.ref));
  end if;
  perform private.notify_hq('HQ_RFP_HELD', 'HQ_RFP_HELD:' || p_rfp_id || ':' || p_reason || ':' || (r.row_version + 1), p_rfp_id, jsonb_build_object('RFP_ID', r.ref, 'HOLD_REASON', p_reason));
end $$;

create or replace function private.rfp_assign_to(p_rfp_id uuid, p_partner_id uuid, p_action text, p_actor uuid, p_reason text default null, p_payload jsonb default '{}'::jsonb) returns void
language plpgsql as $$
declare r rfps%rowtype; po partner_org%rowtype;
begin
  select * into r from rfps where id = p_rfp_id for update;
  select * into po from partner_org where id = p_partner_id;
  update rfps set partner_org_id = p_partner_id, delegation = 'delegated', hold_reason = null, delegated_at = now(), delegated_by = p_actor,
                  taken_over_at = null, taken_over_by = null, takeover_reason = null, row_version = row_version + 1, updated_at = now()
   where id = p_rfp_id;
  insert into rfp_assignment_event (rfp_id, action, from_partner, to_partner, from_delegation, to_delegation, region_code, reason, payload, actor)
  values (p_rfp_id, p_action, r.partner_org_id, p_partner_id, r.delegation, 'delegated', r.region_code, p_reason, p_payload, p_actor);
  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo)
  values (p_rfp_id, now(), (case when p_actor is null then 'system' else 'operator' end)::actor_kind, case when p_actor is null then '시스템' else '운영자' end, p_actor,
          case p_action when 'auto_assign' then '지역 파트너 자동 배정 · ' else '지역 파트너 배정 · ' end || po.display_name || ' (' || coalesce(r.region_code, '-') || ')');
  if r.partner_org_id is not null and r.partner_org_id <> p_partner_id then
    perform private.notify_partner(r.partner_org_id, 'PTR_UNASSIGNED', 'PTR_UNASSIGNED:' || p_rfp_id || ':' || r.row_version, p_rfp_id, jsonb_build_object('RFP_ID', r.ref));
  end if;
  perform private.notify_partner(p_partner_id, 'PTR_ASSIGNED', 'PTR_ASSIGNED:' || p_rfp_id || ':' || (r.row_version + 1), p_rfp_id, jsonb_build_object('RFP_ID', r.ref, 'DESTINATION', coalesce(r.destination, r.region, '')));
end $$;

create or replace function private.partner_eligible(p_partner_id uuid, out ok boolean, out why text)
language plpgsql stable as $$
declare po partner_org%rowtype; n int;
begin
  select * into po from partner_org where id = p_partner_id;
  if po.status <> 'active' then ok := false; why := 'status:' || po.status; return; end if;
  if not po.accepting_new then ok := false; why := 'not_accepting'; return; end if;
  if po.max_active_rfps is not null then
    select count(*) into n from rfps where partner_org_id = po.id and delegation = 'delegated' and state not in ('won','lost','cancelled','rejected');
    if n >= po.max_active_rfps then ok := false; why := 'max_active'; return; end if;
  end if;
  if not exists (select 1 from console_user where partner_id = po.id and role = 'partner_admin' and status = 'active') then ok := false; why := 'no_admin'; return; end if;
  ok := true; why := null;
end $$;

-- 자동 배정 (rfps AFTER INSERT). 접수는 어떤 경우에도 성공해야 하므로 예외를 삼킨다.
create or replace function private.rfp_auto_assign(p_rfp_id uuid, p_region_code text default null) returns void
language plpgsql as $$
declare
  r rfps%rowtype; res record; cand record; skipped jsonb := '[]'::jsonb; e record; v_enabled boolean;
begin
  select * into r from rfps where id = p_rfp_id for update;
  if p_region_code is not null then
    select p_region_code as code, 'high'::text as confidence, 'operator'::text as reason into res;
    update rfps set region_code = p_region_code, region_source = 'operator' where id = p_rfp_id;
  else
    select * into res from public.region_resolve(coalesce(r.destination, r.region));
    update rfps set region_code = res.code, region_source = 'auto', region_input = coalesce(r.destination, r.region) where id = p_rfp_id;
  end if;
  select coalesce((value)::boolean, true) into v_enabled from settings where key = 'partner_auto_assign_enabled';
  if res.code is null then perform private.rfp_hold(p_rfp_id, res.reason, 'auto_hold', jsonb_build_object('input', coalesce(r.destination, r.region))); return; end if;
  if not coalesce(v_enabled, true) then perform private.rfp_hold(p_rfp_id, 'auto_assign_off', 'auto_hold'); return; end if;
  for cand in
    select pr.partner_id, pr.region_code, po.code
      from partner_region pr join partner_org po on po.id = pr.partner_id
     where pr.active and public.region_covers(pr.region_code, res.code)
     order by length(pr.region_code) desc, pr.is_primary desc, pr.priority asc, po.code asc
  loop
    select * into e from private.partner_eligible(cand.partner_id);
    if e.ok then
      perform private.rfp_assign_to(p_rfp_id, cand.partner_id, 'auto_assign', null, null, jsonb_build_object('confidence', res.confidence, 'match', cand.region_code, 'skipped', skipped));
      return;
    end if;
    skipped := skipped || jsonb_build_object('partner', cand.code, 'why', e.why);
  end loop;
  perform private.rfp_hold(p_rfp_id, case when jsonb_array_length(skipped) = 0 then 'no_partner' else 'partner_ineligible' end, 'auto_hold', jsonb_build_object('skipped', skipped, 'confidence', res.confidence));
exception when others then
  begin
    update rfps set delegation = 'hq_held', partner_org_id = null, hold_reason = 'manual' where id = p_rfp_id;
    insert into rfp_assignment_event (rfp_id, action, to_delegation, reason, payload) values (p_rfp_id, 'auto_hold', 'hq_held', 'manual', jsonb_build_object('error', sqlerrm));
  exception when others then null; end;
end $$;

create or replace function private.trg_rfp_auto_assign() returns trigger language plpgsql as $$
begin perform private.rfp_auto_assign(new.id); return null; end $$;
drop trigger if exists rfps_auto_assign on rfps;
create trigger rfps_auto_assign after insert on rfps for each row execute function private.trg_rfp_auto_assign();

-- 기존 데이터 백필: 지역만 매핑하고 전부 hq_held/legacy
do $$
declare x record; res record;
begin
  for x in select id, destination, region from rfps where region_code is null loop
    select * into res from public.region_resolve(coalesce(x.destination, x.region));
    update rfps set region_code = res.code, region_source = 'auto', region_input = coalesce(x.destination, x.region), hold_reason = 'legacy' where id = x.id and delegation = 'hq_held';
  end loop;
end $$;

-- ---------- RPC: 배정·보류·지역·인계 ----------
create or replace function private.rfp_by_ref_lock(p_ref text) returns rfps
language plpgsql as $$
declare r rfps%rowtype;
begin
  select * into r from rfps where ref = p_ref for update;
  if r.id is null then raise exception using errcode='P0001', message='MG:TOKEN_INVALID'; end if;
  return r;
end $$;

create or replace function rfp_assign(p_ref text, p_partner_code text, p_reason text default null) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; r rfps%rowtype; po partner_org%rowtype; e record; warnings text[] := '{}';
begin
  me := private.require_console(array['operator']::console_role[]);
  r := private.rfp_by_ref_lock(p_ref);
  select * into po from partner_org where code = p_partner_code;
  if po.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  if po.status <> 'active' then raise exception using errcode='P0001', message='MG:PARTNER_SUSPENDED'; end if;
  if r.region_code is null or not exists (select 1 from partner_region pr where pr.partner_id = po.id and pr.active and public.region_covers(pr.region_code, r.region_code)) then
    raise exception using errcode='P0001', message='MG:REGION_MISMATCH';
  end if;
  if r.state in ('won','lost','cancelled','rejected') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  select * into e from private.partner_eligible(po.id);
  if not e.ok then warnings := warnings || e.why; end if;
  perform private.rfp_assign_to(r.id, po.id, case when r.partner_org_id is null then 'assign' else 'reassign' end, me.user_id, p_reason, jsonb_build_object('warnings', to_jsonb(warnings)));
  perform private.audit('rfp', r.ref, 'assign', jsonb_build_object('partner', r.partner_org_id, 'delegation', r.delegation), jsonb_build_object('partner', po.id, 'delegation', 'delegated'), r.id, false, p_reason);
  update intervention_alert set resolved_at = now(), resolved_by = me.user_id, resolution = 'reassigned' where rfp_id = r.id and resolved_at is null and kind in ('unassigned_stale','partner_idle','partner_inactive');
  return jsonb_build_object('ok', true, 'warnings', to_jsonb(warnings), 'rfp', private.rfp_to_json(r.id));
end $$;
revoke all on function rfp_assign(text,text,text) from public; grant execute on function rfp_assign(text,text,text) to authenticated;

create or replace function rfp_hold(p_ref text, p_reason text) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; r rfps%rowtype;
begin
  me := private.require_console(array['operator']::console_role[]);
  r := private.rfp_by_ref_lock(p_ref);
  if r.delegation = 'hq_held' then return jsonb_build_object('ok', true, 'rfp', private.rfp_to_json(r.id)); end if;
  perform private.rfp_hold(r.id, 'manual', 'hold', jsonb_build_object('note', p_reason), me.user_id);
  perform private.audit('rfp', r.ref, 'hold', jsonb_build_object('partner', r.partner_org_id), jsonb_build_object('partner', null), r.id, false, p_reason);
  return jsonb_build_object('ok', true, 'rfp', private.rfp_to_json(r.id));
end $$;
revoke all on function rfp_hold(text,text) from public; grant execute on function rfp_hold(text,text) to authenticated;

create or replace function rfp_set_region(p_ref text, p_region_code text, p_reason text default null, p_reassign boolean default true) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; r rfps%rowtype; keep boolean := false;
begin
  me := private.require_console(array['operator']::console_role[]);
  r := private.rfp_by_ref_lock(p_ref);
  if not exists (select 1 from region where code = p_region_code and active) then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  update rfps set region_code = p_region_code, region_source = 'operator', row_version = row_version + 1, updated_at = now() where id = r.id;
  insert into rfp_assignment_event (rfp_id, action, region_code, reason, actor, actor_role, from_partner, to_partner, from_delegation, to_delegation)
  values (r.id, 'region_set', p_region_code, p_reason, me.user_id, 'operator', r.partner_org_id, r.partner_org_id, r.delegation, r.delegation);
  if r.partner_org_id is not null and exists (select 1 from partner_region pr where pr.partner_id = r.partner_org_id and pr.active and public.region_covers(pr.region_code, p_region_code)) then keep := true; end if;
  if p_reassign and not keep and r.state not in ('won','lost','cancelled','rejected') then
    if r.delegation = 'delegated' then perform private.rfp_hold(r.id, 'manual', 'hold', jsonb_build_object('note', '지역 변경'), me.user_id); end if;
    if r.delegation <> 'taken_over' then perform private.rfp_auto_assign(r.id, p_region_code); end if;
  end if;
  perform private.audit('rfp', r.ref, 'region_set', jsonb_build_object('region', r.region_code), jsonb_build_object('region', p_region_code), r.id, false, p_reason);
  return jsonb_build_object('ok', true, 'rfp', private.rfp_to_json(r.id));
end $$;
revoke all on function rfp_set_region(text,text,text,boolean) from public; grant execute on function rfp_set_region(text,text,text,boolean) to authenticated;

create or replace function rfp_decline_assignment(p_ref text, p_reason text) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; r rfps%rowtype;
begin
  me := private.require_console(array['partner_admin']::console_role[]);
  r := private.rfp_by_ref_lock(p_ref);
  if r.partner_org_id is distinct from me.partner_id or r.delegation <> 'delegated' then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
  if r.state not in ('received','verifying') then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
  perform private.rfp_hold(r.id, 'partner_declined', 'decline', jsonb_build_object('note', p_reason), me.user_id);
  perform private.notify_hq('HQ_PARTNER_DECLINED', 'HQ_PARTNER_DECLINED:' || r.id || ':' || r.row_version, r.id, jsonb_build_object('RFP_ID', r.ref, 'REASON', p_reason));
  perform private.audit('rfp', r.ref, 'decline', jsonb_build_object('partner', r.partner_org_id), null, r.id, false, p_reason);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function rfp_decline_assignment(text,text) from public; grant execute on function rfp_decline_assignment(text,text) to authenticated;

create or replace function rfp_takeover(p_ref text, p_reason text, p_share_override_pct numeric default null) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; r rfps%rowtype;
begin
  me := private.require_console(array['operator']::console_role[]);
  r := private.rfp_by_ref_lock(p_ref);
  if r.delegation <> 'delegated' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception using errcode='P0001', message='MG:GUARD_REASON'; end if;
  update rfps set delegation = 'taken_over', taken_over_at = now(), taken_over_by = me.user_id, takeover_reason = p_reason,
                  partner_share_override_pct = p_share_override_pct, row_version = row_version + 1, updated_at = now() where id = r.id;
  insert into rfp_assignment_event (rfp_id, action, from_partner, to_partner, from_delegation, to_delegation, region_code, reason, payload, actor, actor_role)
  values (r.id, 'takeover', r.partner_org_id, r.partner_org_id, 'delegated', 'taken_over', r.region_code, p_reason, jsonb_build_object('share_override_pct', p_share_override_pct), me.user_id, 'operator');
  insert into rfp_history(rfp_id, at, actor, actor_label, operator_id, memo) values (r.id, now(), 'operator', '운영자', me.user_id, '본사 인계 · ' || p_reason);
  perform private.notify_partner(r.partner_org_id, 'PTR_TAKEN_OVER', 'PTR_TAKEN_OVER:' || r.id || ':' || r.row_version, r.id, jsonb_build_object('RFP_ID', r.ref, 'REASON', p_reason));
  update intervention_alert set resolved_at = now(), resolved_by = me.user_id, resolution = 'taken_over' where rfp_id = r.id and resolved_at is null;
  perform private.audit('rfp', r.ref, 'takeover', jsonb_build_object('delegation', 'delegated'), jsonb_build_object('delegation', 'taken_over', 'share_override_pct', p_share_override_pct), r.id, false, p_reason);
  return jsonb_build_object('ok', true, 'rfp', private.rfp_to_json(r.id));
end $$;
revoke all on function rfp_takeover(text,text,numeric) from public; grant execute on function rfp_takeover(text,text,numeric) to authenticated;

create or replace function rfp_release(p_ref text, p_reason text default null) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; r rfps%rowtype;
begin
  me := private.require_console(array['operator']::console_role[]);
  r := private.rfp_by_ref_lock(p_ref);
  if r.delegation <> 'taken_over' then raise exception using errcode='P0001', message='MG:STATE_CONFLICT'; end if;
  update rfps set delegation = 'delegated', taken_over_at = null, taken_over_by = null, takeover_reason = null, partner_share_override_pct = null,
                  delegated_at = coalesce(delegated_at, now()), row_version = row_version + 1, updated_at = now() where id = r.id;
  insert into rfp_assignment_event (rfp_id, action, from_partner, to_partner, from_delegation, to_delegation, region_code, reason, actor, actor_role)
  values (r.id, 'release', r.partner_org_id, r.partner_org_id, 'taken_over', 'delegated', r.region_code, p_reason, me.user_id, 'operator');
  perform private.notify_partner(r.partner_org_id, 'PTR_RELEASED', 'PTR_RELEASED:' || r.id || ':' || r.row_version, r.id, jsonb_build_object('RFP_ID', r.ref));
  perform private.audit('rfp', r.ref, 'release', jsonb_build_object('delegation', 'taken_over'), jsonb_build_object('delegation', 'delegated'), r.id, false, p_reason);
  return jsonb_build_object('ok', true, 'rfp', private.rfp_to_json(r.id));
end $$;
revoke all on function rfp_release(text,text) from public; grant execute on function rfp_release(text,text) to authenticated;

-- ---------- 신원 열람 ----------
create or replace function rfp_get_identity(p_ref text, p_context text default 'rfp_detail') returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; r rfps%rowtype; last_at timestamptz; phone_out text;
begin
  me := private.require_console(null);
  select * into r from rfps where ref = p_ref;
  if r.id is null or not public.can_read_rfp(r.id) then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
  if p_context not in ('rfp_detail','reveal_phone','export') then p_context := 'rfp_detail'; end if;
  select max(created_at) into last_at from identity_view_log where rfp_id = r.id and viewer = me.user_id and context = 'rfp_detail';
  if p_context <> 'rfp_detail' or last_at is null or last_at < now() - interval '10 minutes' then
    insert into identity_view_log (rfp_id, viewer, viewer_role, partner_id, fields, context)
    values (r.id, me.user_id, me.role, me.partner_id, array['company','name','email', case when p_context = 'reveal_phone' then 'phone' else 'phone_masked' end], p_context);
  end if;
  phone_out := case when p_context = 'reveal_phone' then r.contact_phone
                    else regexp_replace(coalesce(r.contact_phone,''), '(\d{2,3})-?(\d{3,4})-?(\d{4})$', '\1-****-\3') end;
  return jsonb_build_object('company', r.company, 'contact', r.contact_name, 'email', r.contact_email, 'phone', phone_out, 'ownerId', r.owner_id,
                            'disclosedAt', r.delegated_at, 'budget', coalesce(r.budget_note, '미기재'));
end $$;
revoke all on function rfp_get_identity(text,text) from public; grant execute on function rfp_get_identity(text,text) to authenticated;

-- ---------- 콘솔 정체성·설정 ----------
create or replace function console_whoami() returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; po partner_org%rowtype; regs text[];
begin
  select * into me from console_user where user_id = auth.uid();
  if me.user_id is null then
    if public.is_operator() then
      return jsonb_build_object('userId', auth.uid(), 'role', 'operator', 'displayName', '운영자', 'email', auth.jwt() ->> 'email', 'cv', 0, 'legacy', true);
    end if;
    return null;
  end if;
  if me.status <> 'active' then return jsonb_build_object('userId', me.user_id, 'status', me.status); end if;
  update console_user set last_seen_at = now() where user_id = me.user_id;
  if me.partner_id is not null then
    select * into po from partner_org where id = me.partner_id;
    select coalesce(array_agg(region_code order by region_code), '{}') into regs from partner_region where partner_id = me.partner_id and active;
  end if;
  return jsonb_build_object('userId', me.user_id, 'role', me.role, 'status', me.status, 'displayName', me.display_name, 'email', me.email, 'cv', me.claims_version,
    'partnerId', me.partner_id, 'partnerCode', po.code, 'partnerName', po.display_name, 'partnerStatus', po.status, 'partnerCountry', po.country_code,
    'partnerTz', po.timezone, 'regions', to_jsonb(regs), 'sharePct', po.revenue_share_pct);
end $$;
revoke all on function console_whoami() from public; grant execute on function console_whoami() to authenticated;

create or replace function console_settings() returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; out jsonb;
begin
  me := private.require_console(null);
  select jsonb_object_agg(key, value) into out from settings
   where key in ('partner_idle_hours','collect_due_days','remit_due_days','supported_currencies','proxy_confirm_hours','commission_rate_range','sla_hours','biz_end_hour');
  return coalesce(out, '{}'::jsonb) || jsonb_build_object('regions', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'nameKo', name_ko, 'nameEn', name_en, 'isCountry', is_country) order by sort, code), '[]'::jsonb) from region where active));
end $$;
revoke all on function console_settings() from public; grant execute on function console_settings() to authenticated;

-- ---------- 파트너 조직·계정 관리 RPC (HQ) ----------
create or replace function partner_org_upsert(p jsonb) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; po partner_org%rowtype; before jsonb;
begin
  me := private.require_console(array['operator']::console_role[]);
  if p ? 'id' then select * into po from partner_org where id = (p->>'id')::uuid for update; before := to_jsonb(po); end if;
  if po.id is null then
    insert into partner_org (code, legal_name, display_name, public_name, country_code, status, revenue_share_pct, settlement_currency, contact_name, contact_email, contact_phone, timezone, contract_ref, contract_start, contract_end, dpa_signed_at, max_active_rfps, max_accounts, updated_by)
    values (upper(p->>'code'), p->>'legalName', p->>'displayName', coalesce(p->>'publicName', 'MICEGO · ' || (p->>'displayName')), upper(p->>'countryCode'),
            coalesce((p->>'status')::partner_org_status, 'onboarding'), coalesce((p->>'sharePct')::numeric, 70), coalesce(p->>'settlementCurrency','USD'),
            p->>'contactName', p->>'contactEmail', p->>'contactPhone', coalesce(p->>'timezone','Asia/Bangkok'), p->>'contractRef', (p->>'contractStart')::date, (p->>'contractEnd')::date,
            (p->>'dpaSignedAt')::timestamptz, (p->>'maxActiveRfps')::int, coalesce((p->>'maxAccounts')::int, 10), me.user_id)
    returning * into po;
  else
    update partner_org set
      legal_name = coalesce(p->>'legalName', legal_name), display_name = coalesce(p->>'displayName', display_name), public_name = coalesce(p->>'publicName', public_name),
      country_code = coalesce(upper(p->>'countryCode'), country_code), status = coalesce((p->>'status')::partner_org_status, status),
      revenue_share_pct = coalesce((p->>'sharePct')::numeric, revenue_share_pct), settlement_currency = coalesce(p->>'settlementCurrency', settlement_currency),
      accepting_new = coalesce((p->>'acceptingNew')::boolean, accepting_new), max_active_rfps = case when p ? 'maxActiveRfps' then (p->>'maxActiveRfps')::int else max_active_rfps end,
      max_accounts = coalesce((p->>'maxAccounts')::int, max_accounts), contact_name = coalesce(p->>'contactName', contact_name), contact_email = coalesce(p->>'contactEmail', contact_email),
      contact_phone = coalesce(p->>'contactPhone', contact_phone), timezone = coalesce(p->>'timezone', timezone), contract_ref = coalesce(p->>'contractRef', contract_ref),
      contract_start = coalesce((p->>'contractStart')::date, contract_start), contract_end = coalesce((p->>'contractEnd')::date, contract_end),
      dpa_signed_at = coalesce((p->>'dpaSignedAt')::timestamptz, dpa_signed_at), suspended_reason = case when p ? 'suspendedReason' then p->>'suspendedReason' else suspended_reason end,
      updated_at = now(), updated_by = me.user_id
    where id = po.id returning * into po;
    -- 정지·종료 시 진행 중 위임 건은 보류로 되돌리고 HQ 알림
    if po.status in ('suspended','terminated') and before->>'status' not in ('suspended','terminated') then
      insert into intervention_alert (rfp_id, partner_id, kind, severity, detail)
      select r.id, po.id, 'partner_inactive', 1, jsonb_build_object('status', po.status) from rfps r where r.partner_org_id = po.id and r.delegation = 'delegated' and r.state not in ('won','lost','cancelled','rejected')
      on conflict do nothing;
      if po.status = 'terminated' then
        update console_user set status = 'disabled', disabled_at = now(), disabled_by = me.user_id, disabled_reason = '조직 종료' where partner_id = po.id and status <> 'disabled';
      end if;
    end if;
  end if;
  perform private.audit('partner_org', po.code, case when before is null then 'create' else 'update' end, before, to_jsonb(po), null);
  return private.partner_org_to_json(po.id);
end $$;
revoke all on function partner_org_upsert(jsonb) from public; grant execute on function partner_org_upsert(jsonb) to authenticated;

create or replace function partner_region_set(p_partner_code text, p_region_code text, p_is_primary boolean, p_priority int default 100, p_active boolean default true, p_force boolean default false) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; po partner_org%rowtype; n int;
begin
  me := private.require_console(array['operator']::console_role[]);
  select * into po from partner_org where code = p_partner_code; if po.id is null then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  if not exists (select 1 from region where code = p_region_code) then raise exception using errcode='P0001', message='MG:BAD_REQUEST'; end if;
  if not p_active and not p_force then
    select count(*) into n from rfps where partner_org_id = po.id and delegation = 'delegated' and public.region_covers(p_region_code, region_code) and state not in ('won','lost','cancelled','rejected');
    if n > 0 then return jsonb_build_object('ok', false, 'error', 'MG:REGION_IN_USE', 'activeRfps', n); end if;
  end if;
  if p_is_primary then update partner_region set is_primary = false where region_code = p_region_code and partner_id <> po.id and is_primary; end if;
  insert into partner_region (partner_id, region_code, is_primary, priority, active, created_by) values (po.id, p_region_code, p_is_primary, p_priority, p_active, me.user_id)
  on conflict (partner_id, region_code) do update set is_primary = excluded.is_primary, priority = excluded.priority, active = excluded.active;
  perform private.audit('partner_org', po.code, 'region_set', null, jsonb_build_object('region', p_region_code, 'primary', p_is_primary, 'active', p_active), null);
  return jsonb_build_object('ok', true, 'org', private.partner_org_to_json(po.id));
end $$;
revoke all on function partner_region_set(text,text,boolean,int,boolean,boolean) from public; grant execute on function partner_region_set(text,text,boolean,int,boolean,boolean) to authenticated;

-- 초대 레코드(auth.users 생성은 Edge Function partner_invite 가 inviteUserByEmail 로 수행한 뒤 이 함수로 등록)
create or replace function private.console_user_register(p_user_id uuid, p_email text, p_display_name text, p_role console_role, p_partner_id uuid, p_invited_by uuid) returns console_user
language plpgsql as $$
declare cu console_user%rowtype; n int; mx int;
begin
  if p_role <> 'operator' then
    select count(*), max(po.max_accounts) into n, mx from console_user cu2 join partner_org po on po.id = p_partner_id where cu2.partner_id = p_partner_id and cu2.status <> 'disabled';
    if n >= coalesce(mx, 10) then raise exception using errcode='P0001', message='MG:ACCOUNT_LIMIT'; end if;
  end if;
  insert into console_user (user_id, role, partner_id, status, email, display_name, invited_by)
  values (p_user_id, p_role, p_partner_id, 'invited', p_email, p_display_name, p_invited_by)
  on conflict (user_id) do update set role = excluded.role, partner_id = excluded.partner_id, display_name = excluded.display_name, claims_version = console_user.claims_version + 1, updated_at = now()
  returning * into cu;
  return cu;
end $$;

create or replace function private.console_user_activate(p_user_id uuid) returns void
language plpgsql as $$
begin update console_user set status = 'active', accepted_at = coalesce(accepted_at, now()), updated_at = now() where user_id = p_user_id and status = 'invited'; end $$;

-- 계정 정지/복구/역할 변경 (HQ는 전부, 파트너 관리자는 자기 조직의 member 만)
create or replace function console_user_action(p_user_id uuid, p_action text, p_reason text default null) returns jsonb
security definer set search_path = public, private language plpgsql as $$
declare me console_user%rowtype; t console_user%rowtype;
begin
  me := private.require_console(array['operator','partner_admin']::console_role[]);
  select * into t from console_user where user_id = p_user_id for update;
  if t.user_id is null then raise exception using errcode='P0001', message='MG:NOT_FOUND'; end if;
  if me.role = 'partner_admin' then
    if t.partner_id is distinct from me.partner_id or t.user_id = me.user_id then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
    if p_action in ('promote','demote') and t.role = 'partner_admin' and p_action = 'demote' and (select count(*) from console_user where partner_id = me.partner_id and role = 'partner_admin' and status = 'active') <= 1 then
      raise exception using errcode='P0001', message='MG:LAST_ADMIN';
    end if;
  end if;
  if p_action = 'disable' then
    update console_user set status = 'disabled', disabled_at = now(), disabled_by = me.user_id, disabled_reason = p_reason, claims_version = claims_version + 1, updated_at = now() where user_id = t.user_id;
  elsif p_action = 'enable' then
    update console_user set status = 'active', disabled_at = null, disabled_by = null, disabled_reason = null, claims_version = claims_version + 1, updated_at = now() where user_id = t.user_id;
  elsif p_action = 'promote' and t.role = 'partner_member' then
    update console_user set role = 'partner_admin', claims_version = claims_version + 1, updated_at = now() where user_id = t.user_id;
  elsif p_action = 'demote' and t.role = 'partner_admin' then
    update console_user set role = 'partner_member', claims_version = claims_version + 1, updated_at = now() where user_id = t.user_id;
  else
    raise exception using errcode='P0001', message='MG:BAD_REQUEST';
  end if;
  perform private.audit('console_user', t.user_id::text, p_action, to_jsonb(t), (select to_jsonb(c) from console_user c where c.user_id = t.user_id), null, false, p_reason);
  return jsonb_build_object('ok', true, 'user', (select jsonb_build_object('userId', c.user_id, 'role', c.role, 'status', c.status, 'email', c.email, 'displayName', c.display_name, 'cv', c.claims_version) from console_user c where c.user_id = t.user_id));
end $$;
revoke all on function console_user_action(uuid,text,text) from public; grant execute on function console_user_action(uuid,text,text) to authenticated;

-- ---------- 파트너 조직 JSON ----------
create or replace function private.partner_org_to_json(p_id uuid) returns jsonb
language plpgsql stable as $$
declare po partner_org%rowtype;
begin
  select * into po from partner_org where id = p_id; if po.id is null then return null; end if;
  return jsonb_build_object(
    'id', po.id, 'code', po.code, 'legalName', po.legal_name, 'displayName', po.display_name, 'publicName', po.public_name, 'countryCode', po.country_code,
    'status', po.status, 'sharePct', po.revenue_share_pct, 'settlementCurrency', po.settlement_currency, 'acceptingNew', po.accepting_new,
    'maxActiveRfps', po.max_active_rfps, 'maxAccounts', po.max_accounts, 'contactName', po.contact_name, 'contactEmail', po.contact_email, 'contactPhone', po.contact_phone,
    'timezone', po.timezone, 'contractRef', po.contract_ref, 'contractStart', po.contract_start, 'contractEnd', po.contract_end, 'dpaSignedAt', po.dpa_signed_at,
    'suspendedReason', po.suspended_reason, 'createdAt', po.created_at,
    'regions', (select coalesce(jsonb_agg(jsonb_build_object('code', pr.region_code, 'primary', pr.is_primary, 'priority', pr.priority, 'active', pr.active) order by pr.region_code), '[]'::jsonb) from partner_region pr where pr.partner_id = po.id),
    'users', (select coalesce(jsonb_agg(jsonb_build_object('userId', cu.user_id, 'role', cu.role, 'status', cu.status, 'email', cu.email, 'displayName', cu.display_name, 'invitedAt', cu.invited_at, 'acceptedAt', cu.accepted_at, 'lastSeenAt', cu.last_seen_at) order by cu.role, cu.created_at), '[]'::jsonb) from console_user cu where cu.partner_id = po.id),
    'activeRfps', (select count(*) from rfps r where r.partner_org_id = po.id and r.delegation = 'delegated' and r.state not in ('won','lost','cancelled','rejected'))
  );
end $$;

-- ---------- RLS ----------
alter table region enable row level security;
alter table region_alias enable row level security;
alter table partner_org enable row level security;
alter table partner_region enable row level security;
alter table console_user enable row level security;
alter table rfp_assignment_event enable row level security;
alter table identity_view_log enable row level security;
alter table intervention_alert enable row level security;

grant select on region, region_alias, partner_org, partner_region, console_user, rfp_assignment_event, identity_view_log, intervention_alert to authenticated;

create policy region_read on region for select to authenticated using (public.is_operator() or public.is_partner());
create policy region_alias_read on region_alias for select to authenticated using (public.is_operator() or public.is_partner());
create policy partner_org_read on partner_org for select to authenticated using (public.is_operator() or id = public.my_partner_id());
create policy partner_region_read on partner_region for select to authenticated using (public.is_operator() or partner_id = public.my_partner_id());
create policy console_user_read on console_user for select to authenticated
  using (public.is_operator() or user_id = auth.uid() or (public.is_partner_admin() and partner_id = public.my_partner_id()));
create policy rfp_assignment_event_read on rfp_assignment_event for select to authenticated using (public.is_operator() or public.can_read_rfp(rfp_id));
create policy identity_view_log_read on identity_view_log for select to authenticated using (public.is_operator() or (public.is_partner_admin() and partner_id = public.my_partner_id()));
create policy intervention_alert_read on intervention_alert for select to authenticated
  using (public.is_operator() or (partner_id = public.my_partner_id() and kind in ('partner_idle','sla_breach','proxy_disputed','settlement_overdue')));

-- 기존 정책 교체: 파트너는 배정된 RFP(+자식)만, 호텔은 자기 지역 또는 자기가 소싱한 것만
drop policy if exists rfps_owner_select on rfps;
create policy rfps_owner_select on rfps for select to authenticated
  using (owner_id = auth.uid() or public.is_operator() or (partner_org_id = public.my_partner_id() and delegation in ('delegated','taken_over')));
drop policy if exists op_select on rfp_history;
create policy op_select on rfp_history for select to authenticated using (public.is_operator() or public.can_read_rfp(rfp_id));
drop policy if exists op_select on invitations;
create policy op_select on invitations for select to authenticated using (public.is_operator() or public.can_read_rfp(rfp_id));
drop policy if exists op_select on quotes;
create policy op_select on quotes for select to authenticated using (public.is_operator() or public.can_read_rfp(rfp_id));
drop policy if exists op_select on selections;
create policy op_select on selections for select to authenticated using (public.is_operator() or public.can_read_rfp(rfp_id));
drop policy if exists op_select on partners;
create policy op_select on partners for select to authenticated
  using (public.is_operator() or (public.is_partner() and (public.region_is_mine(region_code) or sourced_by_partner = public.my_partner_id())));
drop policy if exists op_select on partner_history;
create policy op_select on partner_history for select to authenticated
  using (public.is_operator() or exists (select 1 from partners p where p.id = partner_history.partner_id));
drop policy if exists op_select on kr_holidays;
create policy op_select on kr_holidays for select to authenticated using (public.is_operator() or public.is_partner());

grant execute on function public.console_me(), public.is_operator(), public.is_partner(), public.is_partner_admin(), public.my_partner_id(), public.my_regions(),
  public.region_is_mine(text), public.can_read_rfp(uuid), public.region_covers(text,text), public.ccy_round(numeric,char), public.ccy_minor(char),
  public.region_normalize(text), public.region_resolve(text) to authenticated;
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
