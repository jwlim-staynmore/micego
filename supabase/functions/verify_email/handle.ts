// POST /verify_email — anon. {ticket,code} → {state:'pending_phone'}. SPEC_LAUNCH.md §3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { verifyOtp } from "../_shared/otp.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ticket = asString(body.ticket);
  const code = asString(body.code);
  if (!ticket || !code) throw new MGError("BAD_REQUEST");

  const trows = await deps.db.query<{ ticket: string; member_id: string | null; expires_at: string }>(
    `select ticket, member_id, expires_at from signup_tickets where ticket=$1`,
    [ticket],
  );
  if (!trows.length || trows[0].member_id === null) {
    // 디코이 티켓이거나 존재하지 않는 티켓: 열거 방지를 위해 항상 OTP_WRONG 으로 답한다.
    throw new MGError("OTP_WRONG", { extra: { remaining: 4 } });
  }
  const t = trows[0];
  if (new Date(t.expires_at).getTime() <= deps.now().getTime()) throw new MGError("TOKEN_INVALID");

  const orows = await deps.db.query<{ id: string }>(
    `select id from otp_codes where ticket=$1 and purpose='signup_email' and consumed_at is null and voided_at is null order by created_at desc limit 1`,
    [ticket],
  );
  if (!orows.length) throw new MGError("OTP_EXPIRED");

  await verifyOtp(deps.db, deps.now, { otpId: orows[0].id, code, pepper: deps.env.OTP_PEPPER ?? "" }); // lockSeconds 없음 -> 5회 오답 시 void

  const memberId = t.member_id as string;
  await deps.authAdmin.updateUserById(memberId, { email_confirm: true });
  await deps.db.query(`update members set state='pending_phone', email_verified_at=$2 where id=$1`, [memberId, deps.now().toISOString()]);

  return { state: "pending_phone" };
}
