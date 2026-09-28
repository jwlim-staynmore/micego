// POST /contact — anon. {lang,topic,name,email,org,ref?,message,consent:true} → {received:true}. SPEC_LAUNCH.md §3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { FieldErrors, RE_EMAIL, asString, asBool } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { clientIp, hashIp } from "../_shared/http.ts";
import { sendInternalInbound } from "../_shared/notify/internal.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ip = clientIp(req);
  const ipHash = await hashIp(ip, deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "contact_ip", ipHash, 5, 600); // 5/10min/IP

  const lang = asString(body.lang) === "en" ? "en" : "ko";
  const topic = asString(body.topic);
  const name = asString(body.name).trim();
  const email = asString(body.email).trim().toLowerCase();
  const org = asString(body.org).trim();
  const ref = asString(body.ref);
  const message = asString(body.message).trim();
  const consent = asBool(body.consent);

  const fe = new FieldErrors();
  fe.check("name", name.length >= 1);
  fe.check("email", RE_EMAIL.test(email));
  fe.check("message", message.length >= 1 && message.length <= 5000);
  fe.check("consent", consent === true);
  fe.throwIfAny();

  const nowIso = deps.now().toISOString();
  await deps.db.query(
    `insert into contact_messages (lang, topic, name, email, org, ref, message, ip_hash, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [lang, topic || null, name, email, org || null, ref || null, message, ipHash, nowIso],
  );

  const idemKey = `INTERNAL_INBOUND:contact:${email}:${nowIso}`;
  const result = await sendInternalInbound({
    ops_inbox: deps.env.OPS_INBOX ?? "",
    from_address: deps.env.FROM_ADDRESS ?? "notify@micego.example",
    resend_api_key: deps.env.RESEND_API_KEY,
    notify_mode: deps.env.NOTIFY_MODE === "live" ? "live" : "log",
    subject: `[MICEGO] 문의 · ${topic || "일반"}${ref ? " · " + ref : ""}`,
    fields: { NAME: name, EMAIL: email, ORG: org, TOPIC: topic, REF: ref },
    message,
    idempotencyKey: idemKey,
  }).catch((e) => ({ ok: false, error: String(e) }));

  await deps.db.query(
    `insert into notification_log (template_id, recipient_kind, to_email, vars, idempotency_key, status, attempts)
     values ('INTERNAL_INBOUND','ops',$1,$2::jsonb,$3,$4,1)
     on conflict (idempotency_key) do nothing`,
    [deps.env.OPS_INBOX ?? "", JSON.stringify({ topic, name, email }), idemKey, result.ok ? "done" : "failed"],
  );

  return { received: true };
}
