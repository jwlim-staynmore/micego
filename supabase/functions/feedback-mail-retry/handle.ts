// POST /feedback-mail-retry — SPEC_FEEDBACK.md §3.10.
// 두 가지 호출자: (1) pg_cron(x-internal-secret) 이 배치로 20건씩 재시도, (2) 운영 콘솔이 Bearer 운영자 JWT 로 단건 재발송.
import type { Deps } from "../_shared/deps.ts";
import { sendFeedbackMail, type FeedbackMailRow } from "../_shared/feedback_mail.ts";

export class RetryError extends Error {
  code: "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL";
  status: number;
  constructor(code: RetryError["code"]) {
    super(code);
    this.code = code;
    this.status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "BAD_REQUEST" ? 400 : 500;
  }
}

export interface RetryResult {
  processed: number;
  sent: number;
  failed: number;
}

function countResult(r: { ops?: boolean; ack?: boolean }): { sent: number; failed: number } {
  let sent = 0, failed = 0;
  for (const v of [r.ops, r.ack]) {
    if (v === true) sent++;
    else if (v === false) failed++;
  }
  return { sent, failed };
}

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  const m = h ? /^Bearer\s+(.+)$/i.exec(h) : null;
  return m ? m[1] : null;
}

export async function handle(req: Request, deps: Deps): Promise<RetryResult> {
  const internalSecret = req.headers.get("x-internal-secret");
  const isCron = !!internalSecret && !!deps.env.FEEDBACK_CRON_SECRET && internalSecret === deps.env.FEEDBACK_CRON_SECRET;

  if (isCron) {
    const rows = await deps.db.query<FeedbackMailRow>(`select * from feedback_claim_mail(20)`);
    let processed = 0, sent = 0, failed = 0;
    for (const row of rows) {
      processed++;
      const r = await sendFeedbackMail(deps, row, deps.env);
      const c = countResult(r);
      sent += c.sent;
      failed += c.failed;
    }
    return { processed, sent, failed };
  }

  // 단건: 콘솔 브라우저 호출, Bearer 운영자 JWT.
  const token = bearerToken(req);
  if (!token) throw new RetryError("FORBIDDEN");
  const user = await deps.authAdmin.getUser(token).catch(() => null);
  if (!user || (user.app_metadata as Record<string, unknown> | undefined)?.role !== "operator") {
    throw new RetryError("FORBIDDEN");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    throw new RetryError("BAD_REQUEST");
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) throw new RetryError("BAD_REQUEST");

  const rows = await deps.db.query<FeedbackMailRow>(`select * from feedback where id = $1`, [id]);
  if (!rows.length) throw new RetryError("NOT_FOUND");
  let row = rows[0];

  // failed 면 attempts 0 · pending 으로 되돌린 뒤 처리한다.
  const resetOps = row.ops_mail_status === "failed";
  const resetAck = row.ack_mail_status === "failed";
  if (resetOps || resetAck) {
    await deps.db.query(
      `update feedback set
         ops_mail_status = case when $2 then 'pending' else ops_mail_status end,
         ops_mail_attempts = case when $2 then 0 else ops_mail_attempts end,
         ack_mail_status = case when $3 then 'pending' else ack_mail_status end,
         ack_mail_attempts = case when $3 then 0 else ack_mail_attempts end
       where id = $1`,
      [id, resetOps, resetAck],
    );
    row = { ...row, ops_mail_status: resetOps ? "pending" : row.ops_mail_status, ack_mail_status: resetAck ? "pending" : row.ack_mail_status };
  }

  const r = await sendFeedbackMail(deps, row, deps.env);
  const c = countResult(r);
  return { processed: 1, sent: c.sent, failed: c.failed };
}
