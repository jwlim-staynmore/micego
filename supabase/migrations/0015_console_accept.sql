-- MICEGO 0015: 초대 수락·크론 훅  - 클로드
set search_path = public;

-- 초대 링크로 들어와 비밀번호를 정한 뒤 호출: invited → active
create or replace function console_accept() returns jsonb
security definer set search_path = public, private language plpgsql as $$
begin
  if auth.uid() is null then raise exception using errcode='P0001', message='MG:AUTH_REQUIRED'; end if;
  perform private.console_user_activate(auth.uid());
  return console_whoami();
end $$;
revoke all on function console_accept() from public; grant execute on function console_accept() to authenticated;

-- system_tick 뒤에 개입 알림 스윕까지 (cron 이 부르는 이름은 그대로)
create or replace function private.system_tick_all() returns jsonb
language plpgsql as $$
declare a jsonb; b jsonb;
begin
  a := private.system_tick();
  b := private.intervention_sweep();
  return a || jsonb_build_object('interventions', b);
end $$;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('mg-system-tick');
    perform cron.schedule('mg-system-tick', '*/10 * * * *', $job$ select private.system_tick_all(); $job$);
  end if;
exception when others then null; end $$;
grant execute on all functions in schema private to service_role;
