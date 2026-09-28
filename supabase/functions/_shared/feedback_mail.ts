// 피드백 메일 발송 + 상태 기록. feedback-submit(즉시 waitUntil)과 feedback-mail-retry(배치/단건) 가 공유한다.
// SPEC_FEEDBACK.md §3.9/§3.10.
import type { Deps } from "./deps.ts";
import { sendResend } from "./notify/resend.ts";
import { buildOpsAlertMail, buildAckMail } from "./feedback_templates.ts";

export interface FeedbackMailRow {
  id: string;
  ref: string;
  source: "widget" | "contact";
  category: "SYS" | "OPS" | "ETC";
  user_type: string;
  content: string;
  reply_email: string | null;
  contact_name: string | null;
  member_id: string | null;
  created_at: string;
  lang: "ko" | "en";
  mode: string;
  page_path: string;
  ui_state: string | null;
  rfp_ref: string | null;
  ua: string | null;
  viewport: string | null;
  tz: string | null;
  build_version: string | null;
  referrer: string | null;
  last_js_errors: { t: string; m: string; s: string; l: string }[] | null;
  ops_mail_status: string;
  ops_mail_attempts: number;
  ack_mail_status: string;
  ack_mail_attempts: number;
}

export interface FeedbackMailEnv {
  FEEDBACK_FROM?: string;
  FEEDBACK_INBOX?: string;
  FEEDBACK_CONSOLE_BASE_URL?: string;
  RESEND_API_KEY?: string;
  NOTIFY_MODE?: string;
}

async function markMail(deps: Deps, id: string, which: "ops" | "ack", ok: boolean, error: string | null): Promise<void> {
  const col = which === "ops" ? "ops_mail" : "ack_mail";
  if (ok) {
    await deps.db.query(
      `update feedback set ${col}_status='sent', ${col}_attempts=${col}_attempts+1, ${col}_error=null, ${col}_sent_at=now() where id=$1`,
      [id],
    );
  } else {
    await deps.db.query(
      `update feedback set ${col}_status='failed', ${col}_attempts=${col}_attempts+1, ${col}_error=$2 where id=$1`,
      [id, (error ?? "unknown").slice(0, 200)],
    );
  }
  await deps.db.query(
    `insert into feedback_event(feedback_id, actor, kind, field, to_value) values ($1, null, 'mail', $2, $3)`,
    [id, which, ok ? "sent" : "failed"],
  );
}

// row 의 현재 ops/ack 상태가 pending|failed 인 것만 실제로 보낸다(§3.10: attempts<5 는 호출부가 claim/조회 시 이미 걸렀다).
export async function sendFeedbackMail(deps: Deps, row: FeedbackMailRow, env: FeedbackMailEnv): Promise<{ ops?: boolean; ack?: boolean }> {
  const mode: "live" | "log" = env.NOTIFY_MODE === "live" ? "live" : "log";
  const from = env.FEEDBACK_FROM ?? "MICEGO <noreply@notify.micego.kr>";
  const out: { ops?: boolean; ack?: boolean } = {};

  if (row.ops_mail_status === "pending" || row.ops_mail_status === "failed") {
    const tpl = buildOpsAlertMail({
      id: row.id,
      ref: row.ref,
      source: row.source,
      category: row.category,
      userType: row.user_type,
      content: row.content,
      replyEmail: row.reply_email,
      contactName: row.contact_name,
      isMember: !!row.member_id,
      createdAt: new Date(row.created_at),
      lang: row.lang,
      mode: row.mode,
      pagePath: row.page_path,
      uiState: row.ui_state,
      rfpRef: row.rfp_ref,
      ua: row.ua,
      viewport: row.viewport,
      tz: row.tz,
      buildVersion: row.build_version,
      referrer: row.referrer,
      lastJsErrors: row.last_js_errors,
      consoleBaseUrl: env.FEEDBACK_CONSOLE_BASE_URL ?? "",
    });
    const r = await sendResend({
      apiKey: env.RESEND_API_KEY ?? "",
      from,
      to: env.FEEDBACK_INBOX ?? "",
      ...(row.reply_email ? { replyTo: row.reply_email } : {}),
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      extraHeaders: { "X-MICEGO-Ref": row.ref },
      idempotencyKey: `fb-ops-${row.id}`,
      mode,
    });
    await markMail(deps, row.id, "ops", r.ok, r.ok ? null : r.error ?? "unknown");
    out.ops = r.ok;
  }

  if (row.ack_mail_status === "pending" || row.ack_mail_status === "failed") {
    const tpl = buildAckMail({ ref: row.ref, category: row.category, createdAt: new Date(row.created_at), lang: row.lang });
    const r = await sendResend({
      apiKey: env.RESEND_API_KEY ?? "",
      from,
      to: row.reply_email ?? "",
      replyTo: env.FEEDBACK_INBOX ?? "",
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      idempotencyKey: `fb-ack-${row.id}`,
      mode,
    });
    await markMail(deps, row.id, "ack", r.ok, r.ok ? null : r.error ?? "unknown");
    out.ack = r.ok;
  }

  return out;
}
