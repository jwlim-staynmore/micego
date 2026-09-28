// Resend 이메일 어댑터. POST https://api.resend.com/emails (SPEC_LAUNCH.md §4).
export interface ResendArgs {
  apiKey: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  html: string;
  // feedback-submit (SPEC_FEEDBACK.md §3.9): text 본문(플레인텍스트) + Reply-To.
  // 둘 다 선택값으로 추가한다 — 기존 호출부(SPEC_LAUNCH.md 알림)는 그대로 동작한다.
  text?: string;
  replyTo?: string;
  extraHeaders?: Record<string, string>; // 예: X-MICEGO-Ref
  idempotencyKey: string;
  listUnsubscribe?: string;
  mode: "live" | "log";
}

export interface ResendResult {
  ok: boolean;
  providerMsgId?: string;
  error?: string;
  payload: Record<string, unknown>; // 테스트에서 payload shape 확인용
}

export async function sendResend(args: ResendArgs): Promise<ResendResult> {
  const headers: Record<string, string> = { ...(args.extraHeaders ?? {}) };
  if (args.listUnsubscribe) headers["List-Unsubscribe"] = `<${args.listUnsubscribe}>`;
  const payload = {
    from: args.from,
    to: [args.to],
    ...(args.cc ? { cc: [args.cc] } : {}),
    subject: args.subject,
    html: args.html,
    ...(args.text ? { text: args.text } : {}),
    ...(args.replyTo ? { reply_to: [args.replyTo] } : {}),
    ...(Object.keys(headers).length ? { headers } : {}),
  };

  if (args.mode === "log") {
    return { ok: true, providerMsgId: "log-mode", payload };
  }

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
      "Idempotency-Key": args.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: j.message ?? `HTTP ${r.status}`, payload };
  return { ok: true, providerMsgId: j.id, payload };
}
