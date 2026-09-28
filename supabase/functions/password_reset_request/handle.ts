// POST /password_reset_request — anon. {email} → {sent:true} (항상). SPEC_LAUNCH.md §3, SPEC_ACCOUNTS.md A3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { clientIp, hashIp } from "../_shared/http.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ip = clientIp(req);
  const ipHash = await hashIp(ip, deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "pw_reset_ip", ipHash, 20, 3600); // 20/h/IP

  const email = asString(body.email).trim().toLowerCase();
  if (!email) throw new MGError("BAD_REQUEST");

  await rateLimit(deps.db, "pw_reset_email", email, 5, 3600); // 5/h/email

  const mrows = await deps.db.query<{ id: string; name: string }>(`select id, name from members where lower(email)=$1 and state <> 'withdrawn'`, [email]);
  if (mrows.length) {
    const link = await deps.authAdmin.generateRecoveryLink(email).catch(() => null);
    if (link?.hashed_token) {
      const resetUrl = `${deps.env.SITE_BASE_URL ?? ""}/ko/reset.html?k=${link.hashed_token}`;
      const sendResult = await deps.send({ templateId: "ACC_PW_RESET", channel: "email", to: email, vars: { RESET_URL: resetUrl, EXPIRES_MIN: "30" } })
        .catch((e) => ({ ok: false, error: String(e) }));
      await deps.db.query(
        `insert into notification_log (template_id, recipient_kind, member_id, to_email, vars, idempotency_key, status, attempts)
         values ('ACC_PW_RESET','mem',$1,$2,$3::jsonb,$4,$5,1) on conflict (idempotency_key) do nothing`,
        [mrows[0].id, email, JSON.stringify({ RESET_URL: "[redacted]" }), `ACC_PW_RESET:${mrows[0].id}:${deps.now().getTime()}`, sendResult.ok ? "done" : "failed"],
      );
    }
  }

  return { sent: true };
}
