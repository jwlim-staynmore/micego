-- MICEGO 0008: 피드백 시스템 — enum, feedback/feedback_note/feedback_event/private.feedback_rate_event,
-- REF 생성/전이 가드/감사 트리거, RPC(feedback_set_status/feedback_rate_hit/feedback_claim_mail/
-- feedback_resolve_rfp/feedback_anonymize/feedback_purge_demo/feedback_rate_purge), RLS.
-- SPEC_FEEDBACK.md §2 이 근거이며, SPEC_FEEDBACK_ADDENDUM.md §A 가 우선한다(특히 A6: private.is_operator()
-- 재사용, A6: 토큰은 평문 저장이라 sha256 앞 8자를 표현식 인덱스로 직접 계산).
set search_path = public;

-- ---------- enums ----------
do $$ begin
  create type feedback_category    as enum ('SYS','OPS','ETC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedback_status      as enum ('new','triaged','in_progress','done','on_hold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedback_user_type   as enum ('travel_agency','organizer_guest','hotel','admin','visitor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedback_resolution  as enum ('fixed','answered','wontfix','duplicate','spam','no_action');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedback_mail_status as enum ('pending','sent','failed','skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedback_source      as enum ('widget','contact');
exception when duplicate_object then null; end $$;

-- ---------- public.feedback ----------
create table feedback (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique check (ref ~ '^FB-[0-9]{6}-[A-HJ-NP-Z2-9]{4}$'),
  client_submission_id uuid not null unique,
  source feedback_source not null default 'widget',
  -- 분류·처리 (운영자)
  category feedback_category not null,
  subcode text null,
  priority smallint null check (priority between 1 and 4),
  status feedback_status not null default 'new',
  resolution feedback_resolution null,
  assignee uuid null references auth.users(id) on delete set null,
  triaged_at timestamptz null, started_at timestamptz null, done_at timestamptz null,
  -- 본문 (유저)
  content text not null check (char_length(content) between 20 and 2000),
  body_hash text not null check (body_hash ~ '^[0-9a-f]{64}$'),
  reply_email text null check (reply_email is null or (char_length(reply_email) <= 254 and reply_email = lower(reply_email)
     and reply_email ~ '^[^\s@,;<>"]{1,64}@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$')),
  reply_consent_at timestamptz null,
  contact_name text null check (char_length(contact_name) <= 60),
  -- 신원 (서버 판정만)
  user_type feedback_user_type not null,
  member_id uuid null references auth.users(id) on delete set null,
  -- 자동 컨텍스트
  page_path text not null check (page_path ~ '^/' and char_length(page_path) <= 200),
  mode text not null check (mode in ('agency','hotel','admin','root')),
  lang text not null check (lang in ('ko','en')),
  ui_state text null check (ui_state ~ '^(preview:)?[a-z0-9_]{1,32}$'),
  rfp_ref text null check (rfp_ref ~ '^MG-[0-9]{4}-[0-9]{3,4}$'),
  token_kind text null check (token_kind in ('track','share','bid')),
  token_hash8 text null check (token_hash8 ~ '^[0-9a-f]{8}$'),
  viewport text null check (viewport ~ '^[0-9]{2,5}x[0-9]{2,5}@[0-9.]{1,4}$'),
  ua text null check (char_length(ua) <= 120),
  referrer text null check (char_length(referrer) <= 200),
  last_js_errors jsonb null check (last_js_errors is null or (jsonb_typeof(last_js_errors) = 'array' and jsonb_array_length(last_js_errors) <= 3)),
  tz text null check (char_length(tz) <= 64),
  build_version text null check (char_length(build_version) <= 40),
  submitted_at timestamptz null,
  dwell_ms integer null check (dwell_ms >= 0),
  -- 플래그
  is_demo boolean not null default false,
  is_suspect boolean not null default false,
  suspect_reasons text[] not null default '{}',      -- 'urls','fast','dup_cross','cap'
  -- 메일 상태
  ops_mail_status feedback_mail_status not null default 'pending',
  ops_mail_attempts smallint not null default 0, ops_mail_error text null, ops_mail_sent_at timestamptz null,
  ack_mail_status feedback_mail_status not null default 'skipped',
  ack_mail_attempts smallint not null default 0, ack_mail_error text null, ack_mail_sent_at timestamptz null,
  mail_lease_until timestamptz null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), anonymized_at timestamptz null,
  constraint fb_subcode_by_category check (subcode is null
    or (category = 'SYS' and subcode in ('BUG','IDEA','TEXT'))
    or (category = 'OPS' and subcode in ('RFP','BID','ACCT','PARTNER','POLICY'))),
  constraint fb_done_needs_resolution check (status <> 'done' or resolution is not null),
  constraint fb_contact_needs_email check (source <> 'contact' or reply_email is not null or anonymized_at is not null),
  constraint fb_email_needs_consent check (reply_email is null or reply_consent_at is not null),
  constraint fb_token_pair check ((token_kind is null) = (token_hash8 is null))
);

-- 부속 테이블
create table feedback_note (
  id bigint generated always as identity primary key,
  feedback_id uuid not null references feedback(id) on delete cascade,
  author uuid not null default auth.uid() references auth.users(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table feedback_event (
  id bigint generated always as identity primary key,
  feedback_id uuid not null references feedback(id) on delete cascade,
  actor uuid null, kind text not null check (kind in ('status','triage','note','mail','anonymize')),
  field text null, from_value text null, to_value text null, created_at timestamptz not null default now()
);
create table private.feedback_rate_event (
  id bigint generated always as identity primary key,
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{32}$|^noip$'),
  created_at timestamptz not null default now()
);

-- 인덱스
create index fb_inbox_idx on feedback (status, priority, created_at desc) where is_demo = false;
create index fb_created_idx on feedback (created_at desc);
create index fb_rfp_idx on feedback (rfp_ref) where rfp_ref is not null;
create index fb_tokenhash_idx on feedback (token_hash8) where token_hash8 is not null;
create index fb_bodyhash_idx on feedback (body_hash, created_at desc);
create index fb_reply_idx on feedback (reply_email, created_at desc) where reply_email is not null;
create index fb_assignee_idx on feedback (assignee) where status in ('triaged','in_progress','on_hold');
create index fb_mail_due_idx on feedback (created_at) where ops_mail_status in ('pending','failed') or ack_mail_status in ('pending','failed');
create index fb_note_fk_idx on feedback_note (feedback_id, created_at);
create index fb_event_fk_idx on feedback_event (feedback_id, created_at);
create index fb_rate_idx on private.feedback_rate_event (ip_hash, created_at desc);

-- SPEC_FEEDBACK_ADDENDUM.md §A6: 토큰은 rfp_tokens.token / invitations.token 에 평문 저장되어 있다.
-- token_hash8 검증용 표현식 인덱스 (해당 테이블은 0002 소유, 여기서는 인덱스만 추가한다).
create index rfp_tokens_hash8_idx on rfp_tokens (left(encode(digest(token,'sha256'),'hex'), 8));
create index invitations_hash8_idx on invitations (left(encode(digest(token,'sha256'),'hex'), 8));

-- ---------- REF 생성 (BEFORE INSERT) ----------
-- FB- + KST YYMMDD + - + 4자(알파벳 32자: 0 O 1 I 제외)
create or replace function private.feedback_gen_ref() returns trigger
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 24 letters (no I/O) + 8 digits (no 0/1) = 32
  v_day text := to_char(now() at time zone 'Asia/Seoul', 'YYMMDD');
  v_ref text;
  b bytea;
  i int;
  suffix text;
  attempt int := 0;
begin
  new.status := 'new';
  if new.ref is not null then
    return new;
  end if;
  loop
    attempt := attempt + 1;
    b := gen_random_bytes(4);
    suffix := '';
    for i in 0..3 loop
      suffix := suffix || substr(alphabet, (get_byte(b, i) & 31) + 1, 1);
    end loop;
    v_ref := 'FB-' || v_day || '-' || suffix;
    exit when not exists (select 1 from feedback where ref = v_ref);
    if attempt >= 8 then
      raise exception using errcode = 'P0001', message = 'MG:INTERNAL';
    end if;
  end loop;
  new.ref := v_ref;
  return new;
end;
$$;

create trigger feedback_ref_biu before insert on feedback for each row execute function private.feedback_gen_ref();

-- ---------- 전이 가드 ----------
create or replace function private.feedback_transition_ok(p_from feedback_status, p_to feedback_status) returns boolean
language sql immutable as $$
  select (p_from, p_to) in (
    ('new','triaged'), ('new','done'),
    ('triaged','in_progress'), ('triaged','on_hold'), ('triaged','done'),
    ('in_progress','done'), ('in_progress','on_hold'),
    ('on_hold','in_progress'), ('on_hold','done'),
    ('done','in_progress')
  )
$$;

-- BEFORE UPDATE: updated_at 자동, mgfb.anonymizing 가 'on' 이 아니면 불변 필드 보호, 전이 검사 + 타임스탬프
create or replace function private.feedback_before_update() returns trigger
language plpgsql as $$
declare
  anonymizing boolean := coalesce(current_setting('mgfb.anonymizing', true), 'off') = 'on';
begin
  new.updated_at := now();

  if not anonymizing then
    if new.content is distinct from old.content
       or new.reply_email is distinct from old.reply_email
       or new.page_path is distinct from old.page_path
       or new.member_id is distinct from old.member_id
       or new.ref is distinct from old.ref
       or new.created_at is distinct from old.created_at then
      raise exception using errcode = '42501', message = 'MG:FORBIDDEN_FIELD';
    end if;
  end if;

  if new.status is distinct from old.status then
    if not private.feedback_transition_ok(old.status, new.status) then
      raise exception using errcode = 'P0001', message = 'MG:INVALID_TRANSITION';
    end if;
    if new.status = 'triaged' then
      new.triaged_at := now();
    elsif new.status = 'in_progress' then
      new.started_at := now();
    elsif new.status = 'done' then
      new.done_at := now();
    end if;
    if old.status = 'done' and new.status <> 'done' then
      new.done_at := null;
      new.resolution := null;
    end if;
  end if;

  return new;
end;
$$;

create trigger feedback_biu before update on feedback for each row execute function private.feedback_before_update();

-- AFTER UPDATE: category/subcode/priority/assignee/status 변경 감사 로그 (actor=auth.uid(), 서비스 롤이면 null).
-- authenticated 는 feedback_event 에 INSERT 권한이 없으므로(§2.8) 이 트리거는 security definer 로 우회한다.
create or replace function private.feedback_audit() returns trigger
security definer set search_path = public, pg_temp
language plpgsql as $$
declare
  v_actor uuid := auth.uid();
begin
  if new.category is distinct from old.category then
    insert into feedback_event(feedback_id, actor, kind, field, from_value, to_value) values (new.id, v_actor, 'triage', 'category', old.category::text, new.category::text);
  end if;
  if new.subcode is distinct from old.subcode then
    insert into feedback_event(feedback_id, actor, kind, field, from_value, to_value) values (new.id, v_actor, 'triage', 'subcode', old.subcode, new.subcode);
  end if;
  if new.priority is distinct from old.priority then
    insert into feedback_event(feedback_id, actor, kind, field, from_value, to_value) values (new.id, v_actor, 'triage', 'priority', old.priority::text, new.priority::text);
  end if;
  if new.assignee is distinct from old.assignee then
    insert into feedback_event(feedback_id, actor, kind, field, from_value, to_value) values (new.id, v_actor, 'triage', 'assignee', old.assignee::text, new.assignee::text);
  end if;
  if new.status is distinct from old.status then
    insert into feedback_event(feedback_id, actor, kind, field, from_value, to_value) values (new.id, v_actor, 'status', 'status', old.status::text, new.status::text);
  end if;
  return new;
end;
$$;

create trigger feedback_aud after update on feedback for each row execute function private.feedback_audit();

-- ---------- feedback_set_status ----------
create or replace function feedback_set_status(p_id uuid, p_to feedback_status, p_resolution feedback_resolution default null, p_note text default null) returns feedback
security definer set search_path = public, pg_temp
language plpgsql as $$
declare
  f feedback%rowtype;
  v_actor uuid := auth.uid();
begin
  if not private.is_operator() then
    raise exception using errcode = '42501', message = 'MG:FORBIDDEN';
  end if;

  select * into f from feedback where id = p_id for update;
  if f.id is null then
    raise exception using errcode = 'P0002', message = 'MG:NOT_FOUND';
  end if;
  if not private.feedback_transition_ok(f.status, p_to) then
    raise exception using errcode = 'P0001', message = 'MG:INVALID_TRANSITION';
  end if;

  if p_to = 'triaged' then
    if f.priority is null or (f.category <> 'ETC' and f.subcode is null) then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_TRIAGE_FIELDS';
    end if;
  end if;
  if p_to = 'in_progress' then
    if f.assignee is null then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_ASSIGNEE';
    end if;
  end if;
  if p_to = 'on_hold' then
    if p_note is null or trim(p_note) = '' then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_HOLD_NOTE';
    end if;
  end if;
  if p_to = 'done' then
    if p_resolution is null then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_RESOLUTION';
    end if;
    if f.status = 'new' and p_resolution not in ('spam','duplicate','no_action') then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_NEW_TO_DONE';
    end if;
  end if;
  if f.status = 'done' and p_to <> 'done' then
    if p_note is null or trim(p_note) = '' then
      raise exception using errcode = 'P0001', message = 'MG:GUARD_REOPEN_NOTE';
    end if;
  end if;

  update feedback set status = p_to, resolution = case when p_to = 'done' then p_resolution else resolution end
    where id = p_id
    returning * into f;

  if p_note is not null and trim(p_note) <> '' then
    insert into feedback_note(feedback_id, author, body) values (p_id, v_actor, p_note);
  end if;

  return f;
end;
$$;

revoke all on function feedback_set_status(uuid, feedback_status, feedback_resolution, text) from public;
grant execute on function feedback_set_status(uuid, feedback_status, feedback_resolution, text) to authenticated;

-- ---------- feedback_rate_hit ----------
create or replace function feedback_rate_hit(p_ip_hash text, p_max_10m int default 5, p_max_day int default 30, p_global_day int default 500) returns jsonb
security definer set search_path = private, public, pg_temp
language plpgsql as $$
declare
  c10 int; c24 int; cglobal int;
begin
  perform pg_advisory_xact_lock(hashtextextended('mgfb:' || p_ip_hash, 0));

  select count(*) into c10 from private.feedback_rate_event where ip_hash = p_ip_hash and created_at > now() - interval '10 minutes';
  if c10 >= p_max_10m then
    return jsonb_build_object('allowed', false, 'reason', 'ip_10m', 'retry_after_sec', 600);
  end if;

  select count(*) into c24 from private.feedback_rate_event where ip_hash = p_ip_hash and created_at > now() - interval '24 hours';
  if c24 >= p_max_day then
    return jsonb_build_object('allowed', false, 'reason', 'ip_day', 'retry_after_sec', 86400);
  end if;

  select count(*) into cglobal from feedback where created_at > now() - interval '24 hours' and is_demo = false;
  if cglobal >= p_global_day then
    return jsonb_build_object('allowed', false, 'reason', 'global', 'retry_after_sec', 3600);
  end if;

  insert into private.feedback_rate_event(ip_hash) values (p_ip_hash);
  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function feedback_rate_hit(text, int, int, int) from public;
grant execute on function feedback_rate_hit(text, int, int, int) to service_role;

-- ---------- feedback_claim_mail ----------
create or replace function feedback_claim_mail(p_limit int default 20) returns setof feedback
security definer set search_path = public, pg_temp
language plpgsql as $$
begin
  return query
  update feedback f set mail_lease_until = now() + interval '2 minutes'
  where f.id in (
    select id from feedback
    where created_at > now() - interval '2 days'
      and (mail_lease_until is null or mail_lease_until < now())
      and (
        (ops_mail_status in ('pending','failed') and ops_mail_attempts < 5)
        or (ack_mail_status in ('pending','failed') and ack_mail_attempts < 5)
      )
    order by created_at asc
    limit p_limit
    for update skip locked
  )
  returning f.*;
end;
$$;

revoke all on function feedback_claim_mail(int) from public;
grant execute on function feedback_claim_mail(int) to service_role;

-- ---------- feedback_resolve_rfp ----------
-- token_kind='bid' 는 invitations.token, 그 외(track/share)는 rfp_tokens.token 에서 후보를 찾는다.
create or replace function private.feedback_token_candidates(p_kind text, p_hash8 text) returns table (rfp_id uuid, ref text, hotel_name text)
language plpgsql stable as $$
begin
  if p_kind = 'bid' then
    return query
      select i.rfp_id, r.ref, p.name
      from invitations i join rfps r on r.id = i.rfp_id join partners p on p.id = i.partner_id
      where left(encode(digest(i.token, 'sha256'), 'hex'), 8) = p_hash8;
  else
    return query
      select rt.rfp_id, r.ref, null::text
      from rfp_tokens rt join rfps r on r.id = rt.rfp_id
      where rt.kind::text = p_kind and left(encode(digest(rt.token, 'sha256'), 'hex'), 8) = p_hash8;
  end if;
end;
$$;

create or replace function feedback_resolve_rfp(p_feedback_id uuid) returns table (rfp_id uuid, rfp_ref text, match text, token_kind text, hotel_name text)
security definer set search_path = public, pg_temp
language plpgsql as $$
declare
  f feedback%rowtype;
  v_ref_id uuid;
  v_ref_ref text;
  v_has_ref boolean := false;
  v_has_token boolean := false;
  v_cand_count int := 0;
begin
  if not private.is_operator() then
    raise exception using errcode = '42501', message = 'MG:FORBIDDEN';
  end if;

  select * into f from feedback where id = p_feedback_id;
  if f.id is null then
    raise exception using errcode = 'P0002', message = 'MG:NOT_FOUND';
  end if;

  v_has_token := f.token_kind is not null and f.token_hash8 is not null;
  if v_has_token then
    select count(*) into v_cand_count from private.feedback_token_candidates(f.token_kind, f.token_hash8);
  end if;

  if f.rfp_ref is not null then
    select r.id, r.ref into v_ref_id, v_ref_ref from rfps r where r.ref = f.rfp_ref;
    v_has_ref := v_ref_id is not null;
  end if;

  if v_has_token and v_cand_count > 0 then
    if v_has_ref and exists (select 1 from private.feedback_token_candidates(f.token_kind, f.token_hash8) t where t.ref = v_ref_ref) then
      return query
        select v_ref_id, v_ref_ref, 'verified'::text, f.token_kind,
          (select t.hotel_name from private.feedback_token_candidates(f.token_kind, f.token_hash8) t where t.ref = v_ref_ref limit 1);
    elsif v_has_ref then
      return query
        select v_ref_id, v_ref_ref, 'mismatch'::text, f.token_kind, null::text
        union all
        select t.rfp_id, t.ref, 'mismatch'::text, f.token_kind, t.hotel_name from private.feedback_token_candidates(f.token_kind, f.token_hash8) t;
    else
      return query
        select t.rfp_id, t.ref, 'token_only'::text, f.token_kind, t.hotel_name from private.feedback_token_candidates(f.token_kind, f.token_hash8) t;
    end if;
  elsif v_has_ref then
    return query select v_ref_id, v_ref_ref, 'ref_only'::text, f.token_kind, null::text;
  end if;
  return;
end;
$$;

revoke all on function feedback_resolve_rfp(uuid) from public;
grant execute on function feedback_resolve_rfp(uuid) to authenticated;

-- ---------- 보관·익명화 ----------
create or replace function private.feedback_mask_pii(p_text text) returns text
language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(p_text, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'),
             '(?:\+82[-.\s]?)?0?1[0-9][-.\s]?\d{3,4}[-.\s]?\d{4}', '[phone]', 'g'),
           'https?://\S+', '[link]', 'g')
$$;

create or replace function feedback_anonymize(p_before timestamptz default now() - interval '12 months') returns int
security definer set search_path = public, pg_temp
language plpgsql as $$
declare
  ids uuid[];
begin
  perform set_config('mgfb.anonymizing', 'on', true);

  select coalesce(array_agg(id), '{}') into ids from feedback where anonymized_at is null and created_at < p_before;

  -- token_kind 도 함께 null 처리한다: token_hash8 만 지우면 fb_token_pair 체크(둘 다 있거나 둘 다 없음)를 어긴다.
  update feedback set
    reply_email = null, contact_name = null, member_id = null, token_kind = null, token_hash8 = null,
    ua = null, viewport = null, referrer = null, last_js_errors = null, tz = null, reply_consent_at = null,
    content = private.feedback_mask_pii(content),
    anonymized_at = now()
  where id = any(ids);

  update feedback_note set body = private.feedback_mask_pii(body) where feedback_id = any(ids);

  insert into feedback_event(feedback_id, actor, kind)
    select x, null, 'anonymize' from unnest(ids) as x;

  perform set_config('mgfb.anonymizing', 'off', true);
  return coalesce(array_length(ids, 1), 0);
end;
$$;

revoke all on function feedback_anonymize(timestamptz) from public;
grant execute on function feedback_anonymize(timestamptz) to service_role;

create or replace function feedback_purge_demo(p_before timestamptz default now() - interval '30 days') returns int
security definer set search_path = public, pg_temp
language plpgsql as $$
declare n int;
begin
  delete from feedback where is_demo = true and created_at < p_before;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function feedback_purge_demo(timestamptz) from public;
grant execute on function feedback_purge_demo(timestamptz) to service_role;

create or replace function feedback_rate_purge(p_before timestamptz default now() - interval '48 hours') returns int
security definer set search_path = private, public, pg_temp
language plpgsql as $$
declare n int;
begin
  delete from private.feedback_rate_event where created_at < p_before;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function feedback_rate_purge(timestamptz) from public;
grant execute on function feedback_rate_purge(timestamptz) to service_role;

-- ---------- RLS (anon 완전 차단) ----------
alter table feedback enable row level security;
alter table feedback_note enable row level security;
alter table feedback_event enable row level security;
alter table private.feedback_rate_event enable row level security; -- 정책 없음 = service_role(bypassrls)만

revoke all on feedback, feedback_note, feedback_event from public, anon, authenticated;

grant select on feedback to authenticated;
grant update (category, subcode, priority, assignee) on feedback to authenticated;
grant select, insert on feedback_note to authenticated;
grant select on feedback_event to authenticated;

create policy fb_sel on feedback for select to authenticated using (private.is_operator());
create policy fb_upd on feedback for update to authenticated using (private.is_operator()) with check (private.is_operator());
create policy fbn_sel on feedback_note for select to authenticated using (private.is_operator());
create policy fbn_ins on feedback_note for insert to authenticated with check (private.is_operator() and author = auth.uid());
create policy fbe_sel on feedback_event for select to authenticated using (private.is_operator());

-- service_role: 이 마이그레이션에서 새로 만든 테이블/스키마는 0006 의 일괄 GRANT 이후에 생성되었으므로 별도 부여.
grant usage on schema private to service_role;
grant all on feedback, feedback_note, feedback_event to service_role;
grant all on private.feedback_rate_event to service_role;
grant all on all sequences in schema public to service_role;
