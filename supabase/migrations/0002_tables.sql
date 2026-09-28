-- MICEGO 0002: tables, indexes
-- SPEC_LAUNCH.md §2 표를 그대로 옮긴다. anon/authenticated 권한은 0006_rls.sql 에서 부여한다.

set search_path = public;

-- ---------- members ----------
create table members (
  id uuid primary key,
  state member_state not null default 'pending_email',
  name text,
  company text,
  org_type text check (org_type in ('여행사','기업(인하우스)','기타')),
  email citext,
  phone text,
  consents jsonb not null default '{}'::jsonb,
  mkt_email boolean not null default false,
  mkt_sms boolean not null default false,
  mkt_at timestamptz,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  last_login_at timestamptz,
  locked_at timestamptz,
  suspended_at timestamptz,
  withdrawn_at timestamptz,
  purge_after timestamptz,
  retained_note text,
  created_at timestamptz not null default now()
);
create unique index members_email_uk on members (lower(email)) where state <> 'withdrawn';
create unique index members_phone_uk on members (phone) where state = 'active';

create table member_access_log (
  id bigserial primary key,
  member_id uuid references members(id),
  at timestamptz not null default now(),
  ip inet,
  ua text,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index member_access_log_idx on member_access_log (member_id, at desc);

create table login_attempts (
  id bigserial primary key,
  email_norm citext not null,
  at timestamptz not null default now(),
  ip inet,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_idx on login_attempts (email_norm, at);

create table signup_tickets (
  ticket text primary key,
  member_id uuid,
  email citext,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------- rfps ----------
create table rfps (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  state rfp_state not null default 'received',
  round int not null default 1,
  owner_id uuid references members(id),
  -- form snapshot
  org_type text,
  company text,
  contact_name text,
  contact_email citext,
  contact_phone text,
  event_type text,
  start_date date,
  end_date date,
  headcount_band text,
  region text,
  twin_rooms int,
  king_rooms int,
  ballroom_use boolean,
  ballroom_purpose text,
  note text,
  consent_at timestamptz,
  source jsonb not null default '{}'::jsonb,
  -- operator fields
  destination text,
  headcount int,
  ballroom_note text,
  public_memo text,
  budget_note text,
  anon_reviewed boolean not null default false,
  anon_at timestamptz,
  deadline timestamptz,
  verifying_at timestamptz,
  sla_due_at timestamptz,
  open_at timestamptz,
  bidding_at timestamptz,
  delivered_at timestamptz,
  closed_at timestamptz,
  close_reason text,
  change_summary text,
  connect_done text[] not null default '{}',
  pick_otp jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index rfps_state_idx on rfps (state);
create index rfps_owner_idx on rfps (owner_id);
create index rfps_email_idx on rfps (lower(contact_email));
create index rfps_phone_idx on rfps (contact_phone);
create index rfps_created_idx on rfps (created_at desc);

create table rfp_history (
  id bigserial primary key,
  rfp_id uuid not null references rfps(id) on delete cascade,
  at timestamptz not null default now(),
  actor actor_kind not null,
  actor_label text,
  operator_id uuid,
  from_state text,
  to_state text,
  memo text,
  created_at timestamptz not null default now()
);
create index rfp_history_rfp_idx on rfp_history (rfp_id, at);

create table rfp_tokens (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references rfps(id) on delete cascade,
  kind token_kind not null,
  token text unique not null,
  state share_state not null default 'active',
  created_by uuid,
  revoked_at timestamptz,
  expires_at timestamptz,
  views int not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index rfp_tokens_active_uk on rfp_tokens (rfp_id, kind) where state = 'active';

create table rfp_messages (
  id bigserial primary key,
  rfp_id uuid not null references rfps(id) on delete cascade,
  kind text not null check (kind in ('change','question')),
  body text not null check (char_length(body) <= 2000),
  proposal_labels text[],
  token_id uuid,
  handled_at timestamptz,
  handled_by uuid,
  created_at timestamptz not null default now()
);

-- ---------- partners ----------
create table partners (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  state partner_state not null default 'pending',
  name text,
  location text,
  dest text,
  cap_band text,
  cap int,
  banquet boolean,
  contact_name text,
  contact_email citext,
  contact_phone text,
  domain text,
  description text,
  check_ jsonb not null default '{}'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  applied_at timestamptz not null default now(),
  review_due_at timestamptz,
  reviewed_at timestamptz,
  unsubscribe_token text unique,
  invite_opt_out_at timestamptz,
  consent_at timestamptz,
  source jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index partners_state_idx on partners (state);

create table partner_history (
  id bigserial primary key,
  partner_id uuid not null references partners(id) on delete cascade,
  at timestamptz not null default now(),
  actor actor_kind not null,
  actor_label text,
  operator_id uuid,
  from_state text,
  to_state text,
  memo text,
  created_at timestamptz not null default now()
);

-- ---------- invitations / quotes ----------
create table invitations (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references rfps(id) on delete cascade,
  partner_id uuid not null references partners(id),
  round int not null,
  status invitation_status not null default 'invited',
  result invitation_result,
  token text unique not null,
  deadline timestamptz,
  invited_at timestamptz not null default now(),
  invite_sent_at timestamptz,
  viewed_at timestamptz,
  submitted_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  decline_note text,
  reminder_sent_at timestamptz,
  reinvited_from uuid,
  inaccurate boolean,
  note text,
  created_at timestamptz not null default now()
);
create unique index invitations_active_uk on invitations (rfp_id, partner_id, round) where status <> 'reinvited';
create index invitations_rfp_round_idx on invitations (rfp_id, round);
create index invitations_partner_idx on invitations (partner_id);
create index invitations_deadline_idx on invitations (deadline) where status in ('invited','viewed');

create table quotes (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid unique not null references invitations(id) on delete cascade,
  rfp_id uuid not null references rfps(id) on delete cascade,
  round int not null,
  label text,
  currency char(3) check (currency ~ '^[A-Z]{3}$'),
  twin_rate numeric(14,2),
  king_rate numeric(14,2),
  breakfast_included boolean,
  breakfast_supplement numeric,
  tax_included boolean,
  tax_note text,
  tax_rate_pct numeric,
  availability_all boolean,
  availability_notes text,
  ballroom_fee numeric,
  ballroom_name text,
  fnb_minimum numeric,
  ballroom_includes text,
  valid_until date,
  cancellation text,
  additional_proposals text,
  hotel_name text,
  contact_name text,
  contact_email citext,
  contact_phone text,
  usd_ref numeric,
  usd_date date,
  op_memo text,
  revision int not null default 1,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table quote_revisions (
  id bigserial primary key,
  quote_id uuid not null references quotes(id) on delete cascade,
  revision int not null,
  payload jsonb not null,
  submitted_at timestamptz not null default now(),
  ip_hash text
);

create table selections (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid unique not null references rfps(id) on delete cascade,
  quote_id uuid not null references quotes(id),
  invitation_id uuid not null references invitations(id),
  otp_id uuid,
  operator_override boolean not null default false,
  verified_at timestamptz,
  verified_phone_masked text,
  org_snapshot jsonb,
  connected_at timestamptz not null default now(),
  retain_until date
);

create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  purpose otp_purpose not null,
  member_id uuid,
  rfp_id uuid,
  ticket text,
  target text not null,
  target_hash text not null,
  meta jsonb not null default '{}'::jsonb,
  code_hash text not null,
  attempts int not null default 0,
  max_attempts int not null default 5,
  expires_at timestamptz not null,
  resend_after timestamptz,
  consumed_at timestamptz,
  voided_at timestamptz,
  locked_until timestamptz,
  ip inet,
  created_at timestamptz not null default now()
);
create index otp_codes_target_idx on otp_codes (target_hash, created_at);
create index otp_codes_rfp_idx on otp_codes (rfp_id, purpose, created_at);

create table link_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  rfp_id uuid not null references rfps(id),
  match_type text not null default 'phone',
  status link_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid,
  reason text
);
create index link_requests_status_idx on link_requests (status);

create table audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor actor_kind not null,
  operator_id uuid,
  member_id uuid,
  rfp_id uuid,
  partner_id uuid,
  action text not null,
  label text,
  reason text,
  notif text,
  meta jsonb not null default '{}'::jsonb
);
create index audit_log_member_idx on audit_log (member_id, at);
create index audit_log_rfp_idx on audit_log (rfp_id, at);

create table notification_log (
  id bigserial primary key,
  template_id text not null,
  recipient_kind text,
  rfp_id uuid,
  partner_id uuid,
  member_id uuid,
  invitation_id uuid,
  to_email citext,
  cc_email citext,
  to_phone text,
  vars jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  scheduled_at timestamptz not null default now(),
  status notif_status not null default 'pending',
  attempts int not null default 0,
  next_attempt_at timestamptz,
  last_error text,
  manual_resolved_at timestamptz,
  manual_resolved_by uuid,
  created_at timestamptz not null default now()
);
create index notification_log_pending_idx on notification_log (status, next_attempt_at) where status in ('pending','partial');
create index notification_log_rfp_idx on notification_log (rfp_id);
create index notification_log_member_idx on notification_log (member_id);

create table notification_deliveries (
  id bigserial primary key,
  log_id bigint not null references notification_log(id) on delete cascade,
  channel notif_channel not null,
  provider text,
  to_addr text,
  status delivery_status not null default 'queued',
  provider_msg_id text,
  error text,
  attempts int not null default 0,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  preview text
);

create table contact_messages (
  id bigserial primary key,
  lang text,
  topic text,
  name text,
  email citext,
  org text,
  ref text,
  message text,
  ip_hash text,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create table kr_holidays (
  day date primary key,
  name text not null
);

create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table rate_limits (
  bucket text not null,
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (bucket, key, window_start)
);

create table ref_counters (
  prefix text not null,
  yymm text not null,
  n int not null default 0,
  primary key (prefix, yymm)
);
