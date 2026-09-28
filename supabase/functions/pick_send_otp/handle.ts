// POST /pick_send_otp — anon. {token,proposal:'A'} → {otp_id,phone_masked,expires_at,resend_at,sends_left}
// SPEC_LAUNCH.md §3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString, digitsOnly, maskPhone, normalizePhone } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { isShareToken } from "../_shared/tokens.ts";
import { createOtp } from "../_shared/otp.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const token = asString(body.token);
  const proposal = asString(body.proposal);
  if (!token || !proposal) throw new MGError("BAD_REQUEST");
  if (isShareToken(token)) throw new MGError("FORBIDDEN_SHARE");

  const trows = await deps.db.query<{ id: string; rfp_id: string; state: string; kind: string }>(
    `select id, rfp_id, state, kind from rfp_tokens where token=$1`,
    [token],
  );
  if (!trows.length) throw new MGError("TOKEN_INVALID");
  if (trows[0].kind === "share") throw new MGError("FORBIDDEN_SHARE");
  if (trows[0].state !== "active") throw new MGError("TOKEN_REVOKED");

  const rrows = await deps.db.query<{ id: string; ref: string; state: string; round: number; owner_id: string | null; contact_phone: string }>(
    `select id, ref, state, round, owner_id, contact_phone from rfps where id=$1`,
    [trows[0].rfp_id],
  );
  if (!rrows.length) throw new MGError("TOKEN_INVALID");
  const r = rrows[0];
  if (r.state !== "delivered") throw new MGError("STATE_CONFLICT");

  const lrows = await deps.db.query<{ label: string }>(
    `select q.label from quotes q join invitations i on i.id = q.invitation_id
     where q.rfp_id=$1 and q.round=$2 and i.status in ('submitted','hotel_confirmed') and q.label=$3`,
    [r.id, r.round, proposal],
  );
  if (!lrows.length) throw new MGError("VALIDATION", { fields: [{ name: "proposal", code: "unknown" }] });

  await rateLimit(deps.db, "pick_send_otp", r.id, 10, 86400); // 10/day/RFP

  let phone = r.contact_phone;
  let memberId: string | null = null;
  if (r.owner_id) {
    const mrows = await deps.db.query<{ id: string; state: string; phone: string }>(`select id, state, phone from members where id=$1`, [r.owner_id]);
    if (mrows.length && mrows[0].state === "active") {
      phone = mrows[0].phone;
      memberId = mrows[0].id;
    }
  }
  const phoneNorm = normalizePhone(phone);
  const target = digitsOnly(phoneNorm);

  const pepper = deps.env.OTP_PEPPER ?? "";
  const demoFixed = deps.env.MG_DEMO_OTP === "1" && deps.env.NOTIFY_MODE !== "live" ? "123456" : null;

  const otp = await createOtp(deps.db, deps.now, deps.rand, {
    purpose: "pick",
    memberId,
    rfpId: r.id,
    target,
    ttlSeconds: 180, // 3분 (SPEC_ACCOUNTS.md A8: "3:00 timer")
    cooldownSeconds: 60,
    maxAttempts: 5,
    dailyCap: 10,
    pepper,
    demoFixedCode: demoFixed,
  });

  const phoneMasked = maskPhone(phoneNorm);
  const vars = { CODE: otp.code, REF: r.ref, EXPIRES_MIN: "3" };
  const sendResult = await deps.send({ templateId: "ORG_PICK_OTP", channel: "sms", to: phoneNorm, vars }).catch((e) => ({ ok: false, error: String(e) }));

  await deps.db.query(
    `insert into notification_log (template_id, recipient_kind, rfp_id, member_id, to_phone, vars, idempotency_key, status, attempts)
     values ('ORG_PICK_OTP','org',$1,$2,$3,$4::jsonb,$5,$6,1)
     on conflict (idempotency_key) do nothing`,
    [r.id, memberId, phoneNorm, JSON.stringify({ CODE: "[redacted]" }), `ORG_PICK_OTP:${otp.otpId}`, sendResult.ok ? "done" : "failed"],
  );

  const todayCount = await deps.db.scalar<string>(
    `select count(*) from otp_codes where target_hash=(select target_hash from otp_codes where id=$1) and purpose='pick' and created_at::date = (now() at time zone 'utc')::date`,
    [otp.otpId],
  );
  const sendsLeft = Math.max(0, 10 - Number(todayCount ?? 0));

  return { otp_id: otp.otpId, phone_masked: phoneMasked, expires_at: otp.expiresAt, resend_at: otp.resendAt, sends_left: sendsLeft };
}
