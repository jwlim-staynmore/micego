// POST /resend_email_code — anon. {ticket} → {resend_at,sends_left}. SPEC_LAUNCH.md §3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { createOtp } from "../_shared/otp.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ticket = asString(body.ticket);
  if (!ticket) throw new MGError("BAD_REQUEST");

  const trows = await deps.db.query<{ ticket: string; member_id: string | null; email: string; expires_at: string }>(
    `select ticket, member_id, email, expires_at from signup_tickets where ticket=$1`,
    [ticket],
  );
  if (!trows.length) throw new MGError("TOKEN_INVALID");
  const t = trows[0];
  if (new Date(t.expires_at).getTime() <= deps.now().getTime()) throw new MGError("TOKEN_INVALID");

  if (!t.member_id) {
    // 디코이 티켓: 열거 방지를 위해 정상과 같은 모양으로 응답하되, 실제 발송은 시간당 1회로 제한한다.
    const { rateLimit } = await import("../_shared/ratelimit.ts");
    const idemKey = `ACC_EMAIL_EXISTS:${t.email}:${Math.floor(deps.now().getTime() / 3600_000)}`;
    try {
      await rateLimit(deps.db, "signup_email_exists", t.email, 1, 3600);
      const sendResult = await deps.send({
        templateId: "ACC_EMAIL_EXISTS", channel: "email", to: t.email,
        vars: { LOGIN_URL: `${deps.env.SITE_BASE_URL ?? ""}/ko/login.html`, RESET_URL: `${deps.env.SITE_BASE_URL ?? ""}/ko/reset.html` },
      }).catch((e) => ({ ok: false, error: String(e) }));
      await deps.db.query(
        `insert into notification_log (template_id, recipient_kind, to_email, vars, idempotency_key, status, attempts)
         values ('ACC_EMAIL_EXISTS','mem',$1,'{}'::jsonb,$2,$3,1) on conflict (idempotency_key) do nothing`,
        [t.email, idemKey, sendResult.ok ? "done" : "failed"],
      );
    } catch {
      // 1시간에 이미 보냈으면 조용히 무시 — 그래도 정상 모양의 응답을 돌려준다.
    }
    return { resend_at: new Date(deps.now().getTime() + 60_000).toISOString(), sends_left: 9 };
  }

  const otp = await createOtp(deps.db, deps.now, deps.rand, {
    purpose: "signup_email",
    memberId: t.member_id,
    ticket,
    target: t.email,
    ttlSeconds: 600,
    cooldownSeconds: 60,
    maxAttempts: 5,
    dailyCap: 10,
    pepper: deps.env.OTP_PEPPER ?? "",
    demoFixedCode: deps.env.MG_DEMO_OTP === "1" && deps.env.NOTIFY_MODE !== "live" ? "123456" : null,
  });

  const sendResult = await deps.send({ templateId: "ACC_EMAIL_CODE", channel: "email", to: t.email, vars: { CODE: otp.code, EXPIRES_MIN: "10", PURPOSE: "가입" } })
    .catch((e) => ({ ok: false, error: String(e) }));
  await deps.db.query(
    `insert into notification_log (template_id, recipient_kind, member_id, to_email, vars, idempotency_key, status, attempts)
     values ('ACC_EMAIL_CODE','mem',$1,$2,$3::jsonb,$4,$5,1) on conflict (idempotency_key) do nothing`,
    [t.member_id, t.email, JSON.stringify({ CODE: "[redacted]", PURPOSE: "가입" }), `ACC_EMAIL_CODE:${otp.otpId}`, sendResult.ok ? "done" : "failed"],
  );

  const todayCount = await deps.db.scalar<string>(
    `select count(*) from otp_codes where target_hash=(select target_hash from otp_codes where id=$1) and purpose='signup_email' and created_at::date = (now() at time zone 'utc')::date`,
    [otp.otpId],
  );
  const sendsLeft = Math.max(0, 10 - Number(todayCount ?? 0));

  return { resend_at: otp.resendAt, sends_left: sendsLeft };
}
