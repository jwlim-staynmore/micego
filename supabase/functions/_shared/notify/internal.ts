// 내부 운영 메일 (문의/변경요청/질문) — SPEC_LAUNCH.md §4: "INTERNAL_INBOUND" 라는 이름의 내부 전용 템플릿을
// OPS_INBOX 로 보낸다. docs/notification-templates.json 에는 이 템플릿 정의가 없으므로(고객 대상 템플릿이 아님),
// templates.gen.ts 파이프라인을 거치지 않고 여기서 직접 최소한의 이메일을 구성해 보낸다.
import { sendResend } from "./resend.ts";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface InternalInboundArgs {
  ops_inbox: string;
  from_address: string;
  resend_api_key?: string;
  notify_mode: "live" | "log";
  subject: string;
  fields: Record<string, string | null | undefined>;
  message?: string;
  idempotencyKey: string;
}

export async function sendInternalInbound(args: InternalInboundArgs): Promise<{ ok: boolean; providerMsgId?: string; error?: string }> {
  const rows = Object.entries(args.fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `<tr><td style="padding:2px 8px;color:#666">${escapeHtml(k)}</td><td style="padding:2px 8px">${escapeHtml(String(v))}</td></tr>`)
    .join("\n");
  const msgHtml = args.message ? `<p style="white-space:pre-wrap">${escapeHtml(args.message)}</p>` : "";
  const html = `<div><h3>${escapeHtml(args.subject)}</h3><table>${rows}</table>${msgHtml}</div>`;
  return await sendResend({
    apiKey: args.resend_api_key ?? "",
    from: `MICEGO <${args.from_address}>`,
    to: args.ops_inbox,
    subject: args.subject,
    html,
    idempotencyKey: args.idempotencyKey,
    mode: args.notify_mode,
  });
}
