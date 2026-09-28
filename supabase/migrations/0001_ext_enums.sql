-- MICEGO 0001: extensions, schemas, enums
-- 확장, 스키마, enum 정의. private 스키마는 클라이언트에 노출되지 않는다.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- pg_cron / pg_net 은 Supabase 프로젝트에서만 사용 가능. 로컬 테스트 환경에는 없을 수 있으므로 guard.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

create schema if not exists private;
revoke all on schema private from anon, authenticated, public;

-- ---------- enums ----------
do $$ begin
  create type public.rfp_state as enum ('received','verifying','rejected','open','bidding','collecting','delivered','won','lost','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('invited','viewed','submitted','declined','expired','reinvited');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_result as enum ('selected','not_selected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.partner_state as enum ('pending','reviewing','approved','rejected','suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_state as enum ('pending_email','pending_phone','active','locked','suspended','withdrawn','purged');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.share_state as enum ('active','revoked','expired','disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.token_kind as enum ('track','share');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.otp_purpose as enum ('signup_email','signup_phone','pick','email_change','phone_change');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.link_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notif_channel as enum ('email','alimtalk','lms','sms');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notif_status as enum ('pending','processing','done','partial','failed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_status as enum ('queued','sent','delivered','failed','skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.actor_kind as enum ('system','operator','organizer','hotel','member');
exception when duplicate_object then null; end $$;
