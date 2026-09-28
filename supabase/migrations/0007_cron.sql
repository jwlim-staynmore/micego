-- MICEGO 0007: pg_cron 스케줄. pg_cron/pg_net 이 없는 로컬 테스트 환경에서는 건너뛴다.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- 1분마다: 대기 중인 알림 발송 (Edge Function dispatch_notifications 호출, pg_net 사용)
    if exists (select 1 from pg_extension where extname = 'pg_net') then
      perform cron.schedule(
        'mg-dispatch-notifications',
        '* * * * *',
        $job$
        select net.http_post(
          url := current_setting('app.settings.functions_url', true) || '/dispatch_notifications',
          headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', current_setting('app.settings.cron_secret', true)),
          body := '{}'::jsonb
        );
        $job$
      );
    end if;

    -- 10분마다: system_tick (전이/리마인더/공유만료/파기)
    perform cron.schedule(
      'mg-system-tick',
      '*/10 * * * *',
      $job$ select private.system_tick(); $job$
    );
  end if;
end $$;
