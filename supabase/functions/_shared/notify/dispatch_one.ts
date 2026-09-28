// notification_log 한 행을 채널별로 발송하고 notification_log/notification_deliveries 를 갱신한다.
// dispatch_notifications (크론) 과 "즉시 발송" (submit_rfp 의 ORG_RECEIVED 등) 이 함께 사용한다.
import type { DbClient } from "../deps.ts";
import { getTemplate } from "./render.ts";
import { sendEmail, sendAlimtalkChannel, sendSmsChannel, sendLmsFallback, type NotifyEnv, type SendOneResult } from "./router.ts";
import { buildVars } from "./vars.ts";

// 백오프 스케줄 (분): 1차 실패 후 1분, 2차 5분, 3차 30분, 4차 120분, 5차 360분. 5회를 넘기면 failed.
export const BACKOFF_MINUTES = [1, 5, 30, 120, 360];
export const MAX_ATTEMPTS = 5;

export interface LogRow {
  id: number;
  template_id: string;
  to_email: string | null;
  cc_email: string | null;
  to_phone: string | null;
  vars: Record<string, unknown>;
  attempts: number;
  rfp_id: string | null;
  invitation_id: string | null;
  partner_id: string | null;
  member_id: string | null;
}

export interface DispatchOneResult {
  logId: number;
  status: "done" | "partial" | "failed" | "pending" | "cancelled";
  channelResults: SendOneResult[];
}

function envFromRecord(env: Record<string, string | undefined>): NotifyEnv {
  return {
    NOTIFY_MODE: (env.NOTIFY_MODE === "live" ? "live" : "log"),
    SITE_BASE_URL: env.SITE_BASE_URL ?? "https://micego.example",
    FROM_ADDRESS: env.FROM_ADDRESS ?? "notify@micego.example",
    SUPPORT_EMAIL: env.SUPPORT_EMAIL ?? "support@micego.example",
    RESEND_API_KEY: env.RESEND_API_KEY,
    SMS_VENDOR: env.SMS_VENDOR,
    SOLAPI_API_KEY: env.SOLAPI_API_KEY,
    SOLAPI_API_SECRET: env.SOLAPI_API_SECRET,
    SMS_SENDER: env.SMS_SENDER,
    KAKAO_PF_ID: env.KAKAO_PF_ID,
    ALIGO_KEY: env.ALIGO_KEY,
    ALIGO_USER_ID: env.ALIGO_USER_ID,
  };
}

// OPS_* 등 채널이 전부 false 인 템플릿(이력 전용) 은 실제 발송 없이 done 처리한다.
function hasAnyChannel(ch: { email: boolean; alimtalk: boolean; lms: boolean; sms: boolean }): boolean {
  return ch.email || ch.alimtalk || ch.sms || ch.lms;
}

// 실제로 한 행을 발송 시도한다 (전송만; notification_log/deliveries 갱신은 dispatchOne 이 담당).
async function sendChannels(
  env: NotifyEnv,
  now: () => Date,
  templateId: string,
  row: LogRow,
  vars: Record<string, unknown>,
): Promise<SendOneResult[]> {
  const def = getTemplate(templateId);
  if (!def) throw new Error(`unknown template: ${templateId}`);
  const results: SendOneResult[] = [];

  if (def.channels.email) {
    if (!row.to_email) results.push({ ok: false, channel: "email", error: "NO_ADDRESS", preview: "" });
    else results.push(await sendEmail(env, now, templateId, row.to_email, row.cc_email ?? undefined, vars, `${row.id}:email`));
  }
  if (def.channels.alimtalk) {
    if (!row.to_phone) results.push({ ok: false, channel: "alimtalk", error: "NO_ADDRESS", preview: "" });
    else {
      const r = await sendAlimtalkChannel(env, now, templateId, row.to_phone, vars);
      results.push(r);
      // 알림톡 실패 + LMS 폴백 대상 템플릿 + Aligo 벤더일 때만 명시적 LMS 를 별도로 보낸다.
      // (Solapi 는 알림톡 실패 시 벤더 자체적으로 LMS 로 대체하므로 우리가 다시 보낼 필요가 없다.)
      if (!r.ok && def.channels.lms && env.SMS_VENDOR === "aligo") {
        results.push(await sendLmsFallback(env, now, templateId, row.to_phone, vars));
      }
    }
  } else if (def.channels.lms) {
    // alimtalk 없이 lms 만 켜진 템플릿은 정의상 없지만, 방어적으로 처리.
    if (!row.to_phone) results.push({ ok: false, channel: "lms", error: "NO_ADDRESS", preview: "" });
    else results.push(await sendLmsFallback(env, now, templateId, row.to_phone, vars));
  }
  if (def.channels.sms) {
    if (!row.to_phone) results.push({ ok: false, channel: "sms", error: "NO_ADDRESS", preview: "" });
    else results.push(await sendSmsChannel(env, now, templateId, row.to_phone, vars));
  }
  return results;
}

// notification_deliveries 에 채널별 시도 기록을 남긴다 (호출마다 새 행을 추가 — 시도 이력 보존).
async function recordDeliveries(db: DbClient, logId: number, toEmail: string | null, toPhone: string | null, results: SendOneResult[]): Promise<void> {
  for (const r of results) {
    const toAddr = r.channel === "email" ? toEmail : toPhone;
    const status = r.error === "NOT_CONFIGURED" ? "skipped" : r.ok ? "sent" : "failed";
    await db.query(
      `insert into notification_deliveries (log_id, channel, provider, to_addr, status, provider_msg_id, error, attempts, sent_at, preview)
       values ($1,$2,$3,$4,$5,$6,$7,1,$8,$9)`,
      [logId, r.channel, providerFor(r.channel), toAddr, status, r.providerMsgId ?? null, r.error ?? null, r.ok ? new Date().toISOString() : null, r.preview ?? ""],
    );
  }
}

function providerFor(channel: string): string {
  if (channel === "email") return "resend";
  if (channel === "alimtalk" || channel === "sms" || channel === "lms") return "solapi_or_aligo";
  return "unknown";
}

// notification_log 한 행을 로드해서 발송하고, log 행의 status/attempts/next_attempt_at/last_error 를 갱신한다.
// dispatch_notifications 가 'for update skip locked' 로 잠근 뒤 이 함수를 호출한다.
export async function dispatchOne(
  db: DbClient,
  env: Record<string, string | undefined>,
  now: () => Date,
  row: LogRow,
): Promise<DispatchOneResult> {
  const def = getTemplate(row.template_id);
  if (!def) {
    await db.query(`update notification_log set status='failed', last_error=$2, attempts=attempts+1 where id=$1`, [row.id, `UNKNOWN_TEMPLATE:${row.template_id}`]);
    return { logId: row.id, status: "failed", channelResults: [] };
  }

  if (!hasAnyChannel(def.channels)) {
    // OPS_* 이력 전용 템플릿: 실제 발송 없이 완료 처리.
    await db.query(`update notification_log set status='done', attempts=attempts+1, next_attempt_at=null, last_error=null where id=$1`, [row.id]);
    return { logId: row.id, status: "done", channelResults: [] };
  }

  const nenv = envFromRecord(env);
  const vars = await buildVars(db, nenv.SITE_BASE_URL, row as unknown as Record<string, unknown>);
  const results = await sendChannels(nenv, now, row.template_id, row, vars);
  await recordDeliveries(db, row.id, row.to_email, row.to_phone, results);

  const attempts = row.attempts + 1;
  const allOk = results.length > 0 && results.every((r) => r.ok || r.error === "NOT_CONFIGURED");
  const anyOk = results.some((r) => r.ok);
  const errSummary = results.filter((r) => !r.ok && r.error !== "NOT_CONFIGURED").map((r) => `${r.channel}:${r.error}`).join("; ") || null;

  let status: DispatchOneResult["status"];
  let nextAttemptAt: string | null = null;
  if (allOk) {
    status = "done";
  } else if (attempts >= MAX_ATTEMPTS) {
    status = "failed";
  } else {
    status = anyOk ? "partial" : "pending";
    const backoffIdx = Math.min(attempts, BACKOFF_MINUTES.length) - 1;
    const minutes = BACKOFF_MINUTES[backoffIdx];
    nextAttemptAt = new Date(now().getTime() + minutes * 60_000).toISOString();
  }

  await db.query(
    `update notification_log set status=$2, attempts=$3, next_attempt_at=$4, last_error=$5 where id=$1`,
    [row.id, status, attempts, nextAttemptAt, errSummary],
  );

  return { logId: row.id, status, channelResults: results };
}
