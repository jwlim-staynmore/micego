// Aligo 2번째 SMS 어댑터 스텁 — SMS/LMS 만 지원, ALIGO_* 가 없으면 NOT_CONFIGURED.
export class NotConfiguredError extends Error {}

export interface AligoSmsArgs {
  apiKey?: string; userId?: string; sender?: string;
  to: string; text: string; mode: "live" | "log";
}

export async function sendAligoSms(args: AligoSmsArgs): Promise<{ ok: boolean; providerMsgId?: string; error?: string }> {
  if (!args.apiKey || !args.userId || !args.sender) {
    throw new NotConfiguredError("ALIGO_KEY/ALIGO_USER_ID/SMS_SENDER not set");
  }
  if (args.mode === "log") return { ok: true, providerMsgId: "log-mode" };
  const body = new URLSearchParams({
    key: args.apiKey, user_id: args.userId, sender: args.sender, receiver: args.to, msg: args.text,
  });
  const r = await fetch("https://apis.aligo.in/send/", { method: "POST", body });
  const j = await r.json().catch(() => ({}));
  if (String(j.result_code) !== "1") return { ok: false, error: j.message ?? "aligo error" };
  return { ok: true, providerMsgId: j.msg_id };
}
