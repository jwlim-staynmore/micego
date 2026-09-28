// Solapi(=CoolSMS 동일 API) 어댑터. 알림톡(ATA, LMS 대체 자동) 과 SMS.
// Authorization: HMAC-SHA256 apiKey=..., date=..., salt=..., signature=hmac(date+salt) (SPEC_LAUNCH.md §4).

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function solapiAuthHeader(apiKey: string, apiSecret: string, now: () => Date): Promise<string> {
  const date = now().toISOString();
  const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const signature = await hmacSha256Hex(apiSecret, date + salt);
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export interface SolapiAlimtalkArgs {
  apiKey: string; apiSecret: string; now: () => Date;
  to: string; from: string; pfId: string; templateCode: string;
  variables: Record<string, string>; // '#{key}': value
  text: string; // fallback_body
  title: string; // fallback_title
  mode: "live" | "log";
}

export interface SolapiResult { ok: boolean; providerMsgId?: string; error?: string; payload: Record<string, unknown>; authHeader?: string }

export async function sendAlimtalk(args: SolapiAlimtalkArgs): Promise<SolapiResult> {
  const payload = {
    messages: [{
      to: args.to,
      from: args.from,
      type: "ATA",
      text: args.text,
      subject: args.title,
      kakaoOptions: { pfId: args.pfId, templateId: args.templateCode, variables: args.variables, disableSms: false },
    }],
  };
  if (args.mode === "log") return { ok: true, providerMsgId: "log-mode", payload };
  const auth = await solapiAuthHeader(args.apiKey, args.apiSecret, args.now);
  const r = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: j.errorMessage ?? `HTTP ${r.status}`, payload, authHeader: auth };
  return { ok: true, providerMsgId: j.groupId ?? j.messageId, payload, authHeader: auth };
}

export interface SolapiSmsArgs {
  apiKey: string; apiSecret: string; now: () => Date;
  to: string; from: string; text: string; mode: "live" | "log";
}

export async function sendSms(args: SolapiSmsArgs): Promise<SolapiResult> {
  const payload = { messages: [{ to: args.to, from: args.from, type: "SMS", text: args.text }] };
  if (args.mode === "log") return { ok: true, providerMsgId: "log-mode", payload };
  const auth = await solapiAuthHeader(args.apiKey, args.apiSecret, args.now);
  const r = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: j.errorMessage ?? `HTTP ${r.status}`, payload, authHeader: auth };
  return { ok: true, providerMsgId: j.groupId ?? j.messageId, payload, authHeader: auth };
}
