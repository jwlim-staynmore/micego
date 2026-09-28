-- 로컬 테스트용 Supabase 최소 shim: 실제 프로젝트에는 존재하는 auth 스키마/역할을 흉내낸다.
-- 실제 Supabase 프로젝트에 배포할 때는 이 파일을 적용하지 않는다 (README 참고).
create extension if not exists pgcrypto;
create extension if not exists citext;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
grant anon to postgres;
grant authenticated to postgres;
grant service_role to postgres;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email citext,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  banned_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_agent text,
  ip inet,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  not_after timestamptz
);

-- auth.uid() / auth.jwt() / auth.role(): PostgREST 가 request.jwt.claims GUC 로 넘기는 값을 읽는다.
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', 'anon')
$$;

grant execute on function auth.jwt() to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;

