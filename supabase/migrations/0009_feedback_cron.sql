-- MICEGO 0009: 피드백 pg_cron 스케줄. 0007_cron.sql 과 동일하게 pg_cron/pg_net 이 없는 로컬 테스트
-- 환경에서는 건너뛴다. SPEC_FEEDBACK.md §2.12.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- 10분마다: 메일 재시도 (feedback-mail-retry, pg_net 필요)
    if exists (select 1 from pg_extension where extname = 'pg_net') then
      perform cron.schedule(
        'mgfb-mail-retry',
        '*/10 * * * *',
        $job$
        select net.http_post(
          url := current_setting('app.settings.functions_url', true) || '/feedback-mail-retry',
          headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', current_setting('app.settings.feedback_cron_secret', true)),
          body := '{}'::jsonb
        );
        $job$
      );
    end if;

    -- 매시 7분: 레이트리밋 이벤트 정리(48시간 초과)
    perform cron.schedule(
      'mgfb-rate-purge',
      '7 * * * *',
      $job$ select feedback_rate_purge(); $job$
    );

    -- 매일 18:20 UTC: DEMO 피드백 삭제(30일 초과)
    perform cron.schedule(
      'mgfb-demo-purge',
      '20 18 * * *',
      $job$ select feedback_purge_demo(); $job$
    );

    -- 매월 1일 18:10 UTC: 12개월 초과 피드백 익명화
    perform cron.schedule(
      'mgfb-anonymize',
      '10 18 1 * *',
      $job$ select feedback_anonymize(); $job$
    );
  end if;
end $$;
