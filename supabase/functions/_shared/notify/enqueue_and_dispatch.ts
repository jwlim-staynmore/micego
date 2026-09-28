// enqueue 후 그 자리에서 즉시 한 번 발송을 시도하는 공용 헬퍼 ("fire-and-forget 성격이지만 결과를 기다려
// 실패를 로그에 남긴다" — 실패해도 notification_log 는 pending/partial 로 남아 cron dispatch_notifications 가 재시도한다).
// OTP/재설정처럼 비밀 코드를 담은 단일 채널 메시지는 이 경로를 쓰지 않고 deps.send() 로 직접 인라인 발송한다 (SPEC_LAUNCH.md §4).
import type { DbClient } from "../deps.ts";
import { dispatchOne, type LogRow } from "./dispatch_one.ts";

export async function enqueueAndDispatch(
  db: DbClient,
  env: Record<string, string | undefined>,
  now: () => Date,
  templateId: string,
  idemKey: string,
  target: Record<string, unknown>,
  vars: Record<string, unknown> = {},
): Promise<void> {
  await db.query(`select private.enqueue($1,$2,$3::jsonb,$4::jsonb,$5)`, [templateId, idemKey, JSON.stringify(target), JSON.stringify(vars), now().toISOString()]);
  const rows = await db.query<LogRow>(
    `select id, template_id, to_email, cc_email, to_phone, vars, attempts, rfp_id, invitation_id, partner_id, member_id
     from notification_log where idempotency_key = $1`,
    [idemKey],
  );
  if (rows.length) {
    await dispatchOne(db, env, now, rows[0]).catch((e) => console.error(`immediate dispatch failed for ${templateId}:`, e));
  }
}
