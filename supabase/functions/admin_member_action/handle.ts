// POST /admin_member_action — operator JWT. SPEC_LAUNCH.md §3. DB 쪽 상태 전이는 public._admin_member_action
// (service_role 전용 SQL) 이 맡고, Auth 부수효과(ban/signOut/deleteUser)와 실제 발송은 여기서 처리한다.
import type { Deps } from "../_shared/deps.ts";
import { MGError, fromSqlError } from "../_shared/errors.ts";
import { asBool, asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { requireOperator } from "../_shared/auth_ctx.ts";
import { createOtp } from "../_shared/otp.ts";
import { enqueueAndDispatch } from "../_shared/notify/enqueue_and_dispatch.ts";

const ACTIONS = ["unlock", "suspend", "unsuspend", "resend", "revoke", "transfer", "withdraw"];

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const operator = await requireOperator(req, deps);
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const memberId = asString(body.member_id);
  const action = asString(body.action);
  const reason = asString(body.reason);
  const note = asString(body.note);
  const rfpRef = asString(body.rfp_ref) || null;
  const toEmail = asString(body.to_email) || null;
  const selfConfirmed = asBool(body.self_request_confirmed);

  if (!memberId || !ACTIONS.includes(action)) throw new MGError("BAD_REQUEST");
  if (action === "withdraw" && !selfConfirmed) throw new MGError("VALIDATION", { fields: [{ name: "self_request_confirmed", code: "required" }] });
  if (action === "resend") await rateLimit(deps.db, "admin_resend_email", memberId, 10, 86400);

  // withdraw 는 SQL 쪽에서 email/name 을 즉시 null 처리하므로, 미리 캡처해 둔다 (탈퇴 메일 / 이관 메일에 필요).
  const pre = await deps.db.query<{ email: string | null; name: string | null }>(`select email, name from members where id=$1`, [memberId]);
  const emailBeforeWithdraw: string | null = pre[0]?.email ?? null;
  const nameBeforeWithdraw: string | null = pre[0]?.name ?? null;

  let result: { member: { id: string; state: string; name: string | null; email: string | null } };
  try {
    result = await deps.db.scalar<typeof result>(
      `select public._admin_member_action($1,$2,$3,$4,$5,$6,$7)`,
      [memberId, action, reason || null, note || null, operator.id, rfpRef, toEmail],
    );
  } catch (e) {
    throw fromSqlError(e);
  }

  // Auth 부수효과
  if (action === "unlock" || action === "unsuspend") {
    await deps.authAdmin.updateUserById(memberId, { ban_duration: "none" }).catch(() => {});
  } else if (action === "suspend") {
    await deps.authAdmin.updateUserById(memberId, { ban_duration: "876000h" }).catch(() => {});
    await deps.authAdmin.signOutAll(memberId).catch(() => {});
  } else if (action === "revoke") {
    await deps.authAdmin.signOutAll(memberId).catch(() => {});
  } else if (action === "withdraw") {
    await deps.authAdmin.deleteUser(memberId).catch(() => {});
  }

  const nowIso = deps.now().toISOString();

  if (action === "resend") {
    const mrows = await deps.db.query<{ email: string }>(`select email from members where id=$1`, [memberId]);
    const email = mrows[0]?.email;
    if (email) {
      const otp = await createOtp(deps.db, deps.now, deps.rand, {
        purpose: "signup_email", memberId, target: email,
        ttlSeconds: 600, cooldownSeconds: 0, maxAttempts: 5, dailyCap: 10,
        pepper: deps.env.OTP_PEPPER ?? "", demoFixedCode: deps.env.MG_DEMO_OTP === "1" && deps.env.NOTIFY_MODE !== "live" ? "123456" : null,
      });
      const sendResult = await deps.send({ templateId: "ACC_EMAIL_CODE", channel: "email", to: email, vars: { CODE: otp.code, EXPIRES_MIN: "10", PURPOSE: "가입" } })
        .catch((e) => ({ ok: false, error: String(e) }));
      await deps.db.query(
        `insert into notification_log (template_id, recipient_kind, member_id, to_email, vars, idempotency_key, status, attempts)
         values ('ACC_EMAIL_CODE','mem',$1,$2,$3::jsonb,$4,$5,1) on conflict (idempotency_key) do nothing`,
        [memberId, email, JSON.stringify({ CODE: "[redacted]", PURPOSE: "가입" }), `ACC_EMAIL_CODE:${otp.otpId}:admin`, sendResult.ok ? "done" : "failed"],
      );
    }
  } else if (action === "withdraw") {
    if (emailBeforeWithdraw) {
      await enqueueAndDispatch(deps.db, deps.env, deps.now, "ACC_WITHDRAWN", `ACC_WITHDRAWN:${memberId}:admin`, {
        member_id: memberId, to_email: emailBeforeWithdraw, recipient_kind: "mem",
      }, { WITHDRAWN_AT: nowIso });
    }
  } else if (action === "transfer" && rfpRef) {
    await enqueueAndDispatch(deps.db, deps.env, deps.now, "OPS_RFP_TRANSFER", `OPS_RFP_TRANSFER:${rfpRef}:${nowIso}`, {
      recipient_kind: "ops",
    }, { REF: rfpRef, FROM_NAME: nameBeforeWithdraw ?? result.member.name, TO_NAME: toEmail });
  }

  return result;
}
