// POST /pick_verify — anon. {token,proposal,otp_id,code} → {state:'won',selected,connected_at} | {state:'delivered',pending:true}
// SPEC_LAUNCH.md §3.
import type { Deps } from "../_shared/deps.ts";
import { MGError, fromSqlError } from "../_shared/errors.ts";
import { asString, maskPhone, normalizePhone } from "../_shared/validate.ts";
import { isShareToken } from "../_shared/tokens.ts";
import { verifyOtp } from "../_shared/otp.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const token = asString(body.token);
  const proposal = asString(body.proposal);
  const otpId = asString(body.otp_id);
  const code = asString(body.code);
  if (!token || !proposal || !otpId || !code) throw new MGError("BAD_REQUEST");
  if (isShareToken(token)) throw new MGError("FORBIDDEN_SHARE");

  const trows = await deps.db.query<{ id: string; rfp_id: string; state: string; kind: string }>(
    `select id, rfp_id, state, kind from rfp_tokens where token=$1`,
    [token],
  );
  if (!trows.length) throw new MGError("TOKEN_INVALID");
  if (trows[0].kind === "share") throw new MGError("FORBIDDEN_SHARE");
  if (trows[0].state !== "active") throw new MGError("TOKEN_REVOKED");

  const rrows = await deps.db.query<{ id: string; state: string }>(`select id, state from rfps where id=$1`, [trows[0].rfp_id]);
  if (!rrows.length) throw new MGError("TOKEN_INVALID");
  const r = rrows[0];
  if (r.state !== "delivered") throw new MGError("STATE_CONFLICT");

  const otpRow = await verifyOtp(deps.db, deps.now, { otpId, code, pepper: deps.env.OTP_PEPPER ?? "", lockSeconds: 600 });
  if (otpRow.rfp_id !== r.id) throw new MGError("OTP_WRONG", { extra: { remaining: 0 } });

  const phoneMasked = maskPhone(normalizePhone(String(otpRow.target ?? "")));

  const autoCloseSetting = await deps.db.scalar<string>(`select value::text from settings where key='pick_auto_close'`);
  const autoClose = autoCloseSetting !== "false";

  if (!autoClose) {
    // 운영자 확인 후 확정하는 모드: RFP 상태는 delivered 로 유지하고 선택 의사만 기록한다.
    await deps.db.query(
      `update rfps set pick_otp = jsonb_build_object('proposal', $2::text, 'otp_id', $3::text, 'phone_masked', $4::text, 'at', $5::timestamptz) where id=$1`,
      [r.id, proposal, otpId, phoneMasked, deps.now().toISOString()],
    );
    await deps.db.query(
      `insert into rfp_history (rfp_id, at, actor, actor_label, memo) values ($1,$2,'organizer','요청자',$3)`,
      [r.id, deps.now().toISOString(), `제안 ${proposal} 선택 (휴대전화 인증, 운영자 확인 대기)`],
    );
    return { state: "delivered", pending: true };
  }

  try {
    const result = await deps.db.scalar<Record<string, unknown>>(
      `select private.pick_and_win($1,$2,$3,$4)`,
      [r.id, proposal, otpId, phoneMasked],
    );
    return result;
  } catch (e) {
    throw fromSqlError(e);
  }
}
