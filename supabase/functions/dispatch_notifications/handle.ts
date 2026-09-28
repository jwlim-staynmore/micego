// POST /dispatch_notifications — service role 또는 x-cron-secret. {limit?} → {processed,sent,failed}.
// SPEC_LAUNCH.md §4 "Dispatcher". pg_cron 이 매분 pg_net.http_post 로 호출하고, enqueue 직후의 즉시 발송은
// 각 함수가 직접 dispatch_one.ts 를 부르므로 이 함수를 거치지 않는다 — 이 함수는 그 즉시발송이 실패했거나
// 아직 시도되지 않은 행들을 주기적으로 재시도하는 배치 경로다.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { dispatchOne, type LogRow } from "../_shared/notify/dispatch_one.ts";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const cronSecret = req.headers.get("x-cron-secret") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  const bearer = /^Bearer\s+(.+)$/i.exec(auth)?.[1] ?? "";
  const okCron = !!deps.env.CRON_SECRET && timingSafeEqual(cronSecret, deps.env.CRON_SECRET);
  const okService = !!deps.env.SUPABASE_SERVICE_ROLE_KEY && timingSafeEqual(bearer, deps.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!okCron && !okService) throw new MGError("FORBIDDEN");

  const body = await req.json().catch(() => ({}));
  const limit = Number.isFinite(body?.limit) && Number(body.limit) > 0 ? Math.min(Number(body.limit), 200) : 50;

  const rows = await deps.db.query<LogRow>(
    `with picked as (
       select id from notification_log
       where status in ('pending','partial') and coalesce(next_attempt_at, scheduled_at) <= now()
       order by scheduled_at asc
       for update skip locked
       limit $1
     )
     update notification_log set status = 'processing'
     where id in (select id from picked)
     returning id, template_id, to_email, cc_email, to_phone, vars, attempts, rfp_id, invitation_id, partner_id, member_id`,
    [limit],
  );

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const result = await dispatchOne(deps.db, deps.env, deps.now, row);
      if (result.status === "done") sent++;
      else if (result.status === "failed") failed++;
    } catch (e) {
      console.error(`dispatch failed for log #${row.id}:`, e);
      await deps.db.query(`update notification_log set status='pending', last_error=$2 where id=$1`, [row.id, String(e)]).catch(() => {});
      failed++;
    }
  }

  return { processed: rows.length, sent, failed };
}
