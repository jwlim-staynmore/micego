// 채널별 렌더 + 발송을 한 곳에 모은다. dispatch_notifications 와 인라인 발송(OTP 등)이 함께 쓴다.
import { renderEmail, renderAlimtalk, renderSms } from "./render.ts";
import { sendResend } from "./resend.ts";
import { sendAlimtalk, sendSms } from "./solapi.ts";
import { sendAligoSms, NotConfiguredError } from "./aligo.ts";
import { getTemplate } from "./render.ts";

export interface NotifyEnv {
  NOTIFY_MODE: "live" | "log";
  SITE_BASE_URL: string;
  FROM_ADDRESS: string;
  SUPPORT_EMAIL: string;
  RESEND_API_KEY?: string;
  SMS_VENDOR?: string;
  SOLAPI_API_KEY?: string;
  SOLAPI_API_SECRET?: string;
  SMS_SENDER?: string;
  KAKAO_PF_ID?: string;
  ALIGO_KEY?: string;
  ALIGO_USER_ID?: string;
}

export interface SendOneResult {
  ok: boolean;
  channel: "email" | "alimtalk" | "lms" | "sms";
  providerMsgId?: string;
  error?: string;
  preview: string; // subject 또는 본문 첫 200자 (코드는 항상 [redacted])
}

function redactCode(s: string, vars: Record<string, unknown>): string {
  if (typeof vars.CODE === "string" && vars.CODE) return s.split(String(vars.CODE)).join("[redacted]");
  return s;
}

export async function sendEmail(env: NotifyEnv, now: () => Date, templateId: string, to: string, cc: string | undefined, vars: Record<string, unknown>, idemKey: string): Promise<SendOneResult> {
  const rendered = renderEmail(templateId, vars, env.SITE_BASE_URL);
  const def = getTemplate(templateId);
  const listUnsub = (templateId === "HTL_INVITE" || templateId === "HTL_REMINDER") ? String(vars.UNSUBSCRIBE_URL ?? "") : undefined;
  const r = await sendResend({
    apiKey: env.RESEND_API_KEY ?? "",
    from: `MICEGO <${env.FROM_ADDRESS}>`,
    to, cc: def?.email?.cc ? cc : undefined,
    subject: rendered.subject, html: rendered.html,
    idempotencyKey: idemKey,
    listUnsubscribe: listUnsub,
    mode: env.NOTIFY_MODE,
  });
  return { ok: r.ok, channel: "email", providerMsgId: r.providerMsgId, error: r.error, preview: redactCode(rendered.subject, vars) };
}

export async function sendAlimtalkChannel(env: NotifyEnv, now: () => Date, templateId: string, to: string, vars: Record<string, unknown>): Promise<SendOneResult> {
  const rendered = renderAlimtalk(templateId, vars, env.SITE_BASE_URL);
  const variables: Record<string, string> = {};
  const def = getTemplate(templateId)!;
  for (const v of def.variables) variables[`#{${v.kr_name}}`] = String(vars[v.key] ?? "");
  const r = await sendAlimtalk({
    apiKey: env.SOLAPI_API_KEY ?? "", apiSecret: env.SOLAPI_API_SECRET ?? "", now,
    to, from: env.SMS_SENDER ?? "", pfId: env.KAKAO_PF_ID ?? "", templateCode: rendered.code,
    variables, text: rendered.fallbackBody, title: rendered.fallbackTitle,
    mode: env.NOTIFY_MODE,
  });
  return { ok: r.ok, channel: "alimtalk", providerMsgId: r.providerMsgId, error: r.error, preview: redactCode(rendered.fallbackBody.slice(0, 200), vars) };
}

export async function sendSmsChannel(env: NotifyEnv, now: () => Date, templateId: string, to: string, vars: Record<string, unknown>, viaAligo = false): Promise<SendOneResult> {
  const rendered = renderSms(templateId, vars);
  if (viaAligo || env.SMS_VENDOR === "aligo") {
    try {
      const r = await sendAligoSms({ apiKey: env.ALIGO_KEY, userId: env.ALIGO_USER_ID, sender: env.SMS_SENDER, to, text: rendered.body, mode: env.NOTIFY_MODE });
      return { ok: r.ok, channel: "sms", providerMsgId: r.providerMsgId, error: r.error, preview: redactCode(rendered.body, vars) };
    } catch (e) {
      if (e instanceof NotConfiguredError) return { ok: false, channel: "sms", error: "NOT_CONFIGURED", preview: "" };
      throw e;
    }
  }
  const r = await sendSms({ apiKey: env.SOLAPI_API_KEY ?? "", apiSecret: env.SOLAPI_API_SECRET ?? "", now, to, from: env.SMS_SENDER ?? "", text: rendered.body, mode: env.NOTIFY_MODE });
  return { ok: r.ok, channel: "sms", providerMsgId: r.providerMsgId, error: r.error, preview: redactCode(rendered.body, vars) };
}

// LMS 대체: 알림톡 발송 실패 + 벤더 자체 폴백이 없을 때 명시적으로 LMS(장문) 을 보낸다.
// Solapi 는 알림톡 실패 시 자체적으로 LMS 로 대체하므로, 우리 쪽 명시적 LMS 폴백은 Aligo 벤더일 때만 의미가 있다.
export async function sendLmsFallback(env: NotifyEnv, now: () => Date, templateId: string, to: string, vars: Record<string, unknown>): Promise<SendOneResult> {
  return await sendSmsChannel(env, now, templateId, to, vars, true);
}
