import { assert } from "./_assert.ts";
import { sendResend } from "../_shared/notify/resend.ts";
import { solapiAuthHeader } from "../_shared/notify/solapi.ts";

Deno.test("Resend payload shape (log mode, no network)", async () => {
  const r = await sendResend({
    apiKey: "test", from: "MICEGO <notify@micego.example>", to: "a@b.com", cc: "c@d.com",
    subject: "hello", html: "<p>hi</p>", idempotencyKey: "abc:email",
    listUnsubscribe: "https://micego.example/en/unsubscribe.html?t=x", mode: "log",
  });
  assert(r.ok);
  assert(Array.isArray(r.payload.to) && r.payload.to[0] === "a@b.com", "to should be an array");
  assert(Array.isArray(r.payload.cc) && r.payload.cc[0] === "c@d.com", "cc should be an array");
  assert(r.payload.subject === "hello");
  const headers = r.payload.headers as Record<string, string> | undefined;
  assert(!!headers?.["List-Unsubscribe"], "List-Unsubscribe header should be set");
});

Deno.test("Resend payload omits cc/headers when not provided", async () => {
  const r = await sendResend({ apiKey: "t", from: "f", to: "a@b.com", subject: "s", html: "h", idempotencyKey: "k", mode: "log" });
  assert(!("cc" in r.payload));
  assert(!("headers" in r.payload));
});

Deno.test("Solapi Authorization header shape: HMAC-SHA256 apiKey=..., date=..., salt=..., signature=...", async () => {
  const header = await solapiAuthHeader("KEY123", "SECRET456", () => new Date("2026-10-08T00:00:00.000Z"));
  assert(header.startsWith("HMAC-SHA256 apiKey=KEY123, date="), header);
  assert(/salt=[0-9a-f]{32}/.test(header), "salt should be 32 hex chars: " + header);
  assert(/signature=[0-9a-f]{64}/.test(header), "signature should be 64 hex chars (sha256): " + header);
});
