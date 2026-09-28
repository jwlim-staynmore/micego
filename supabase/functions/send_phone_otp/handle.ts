// POST /send_phone_otp — ticket(회원가입 3단계) 또는 member JWT(번호 변경). SPEC_LAUNCH.md §3, SPEC_ACCOUNTS.md A1/A5.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString, digitsOnly, maskPhone, normalizePhone, RE_PHONE_KR } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { clientIp, hashIp } from "../_shared/http.ts";
import { createOtp } from "../_shared/otp.ts";
import { bearerToken, requireActiveMember } from "../_shared/auth_ctx.ts";
import { requireReauthIfStale } from "../_shared/reauth.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ip = clientIp(req);
  const ipHash = await hashIp(ip, deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "send_phone_otp_ip", ipHash, 20, 86400); // 20/day/IP

  const ticket = asString(body.ticket);
  const phoneRaw = asString(body.phone);
  const purpose = asString(body.purpose);
  const password = asString(body.password) || undefined;
  if (purpose !== "signup_phone" && purpose !== "phone_change") throw new MGError("BAD_REQUEST");
  const phoneNorm = normalizePhone(phoneRaw);
  if (!RE_PHONE_KR.test(phoneRaw.replace(/\s+/g, ""))) throw new MGError("VALIDATION", { fields: [{ name: "phone", code: "invalid" }] });

  let memberId: string;

  if (purpose === "signup_phone") {
    if (!ticket) throw new MGError("BAD_REQUEST");
    const trows = await deps.db.query<{ member_id: string | null; expires_at: string }>(`select member_id, expires_at from signup_tickets where ticket=$1`, [ticket]);
    if (!trows.length || !trows[0].member_id) throw new MGError("TOKEN_INVALID");
    if (new Date(trows[0].expires_at).getTime() <= deps.now().getTime()) throw new MGError("TOKEN_INVALID");
    const mrows = await deps.db.query<{ id: string; state: string }>(`select id, state from members where id=$1`, [trows[0].member_id]);
    if (!mrows.length || mrows[0].state !== "pending_phone") throw new MGError("NOT_ACTIVE");
    memberId = mrows[0].id;
  } else {
    const token = bearerToken(req);
    if (!token) throw new MGError("AUTH_REQUIRED");
    const member = await requireActiveMember(req, deps);
    if (member.state !== "active") throw new MGError("NOT_ACTIVE");
    await requireReauthIfStale(deps, member, password);
    memberId = member.id;
  }

  const target = digitsOnly(phoneNorm);
  const otp = await createOtp(deps.db, deps.now, deps.rand, {
    purpose,
    memberId,
    target,
    ttlSeconds: 180, // 3분 (SPEC_ACCOUNTS.md A1 step3 / A5)
    cooldownSeconds: 60,
    maxAttempts: 5,
    dailyCap: 5, // 5 sends/day/number
    pepper: deps.env.OTP_PEPPER ?? "",
    demoFixedCode: deps.env.MG_DEMO_OTP === "1" && deps.env.NOTIFY_MODE !== "live" ? "123456" : null,
  });

  const phoneMasked = maskPhone(phoneNorm);
  const sendResult = await deps.send({ templateId: "ACC_SMS_OTP", channel: "sms", to: phoneNorm, vars: { CODE: otp.code, EXPIRES_MIN: "3" } })
    .catch((e) => ({ ok: false, error: String(e) }));
  await deps.db.query(
    `insert into notification_log (template_id, recipient_kind, member_id, to_phone, vars, idempotency_key, status, attempts)
     values ('ACC_SMS_OTP','mem',$1,$2,$3::jsonb,$4,$5,1) on conflict (idempotency_key) do nothing`,
    [memberId, phoneNorm, JSON.stringify({ CODE: "[redacted]" }), `ACC_SMS_OTP:${otp.otpId}`, sendResult.ok ? "done" : "failed"],
  );

  return { otp_id: otp.otpId, phone_masked: phoneMasked, expires_at: otp.expiresAt, resend_at: otp.resendAt };
}
