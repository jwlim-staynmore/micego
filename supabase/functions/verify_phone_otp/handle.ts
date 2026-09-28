// POST /verify_phone_otp — ticket 또는 JWT. {ticket?,otp_id,code} → signup: {state:'active',linked_count}; change: {phone_masked}
// SPEC_LAUNCH.md §3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString, maskPhone, normalizePhone } from "../_shared/validate.ts";
import { verifyOtp } from "../_shared/otp.ts";
import { enqueueAndDispatch } from "../_shared/notify/enqueue_and_dispatch.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const otpId = asString(body.otp_id);
  const code = asString(body.code);
  if (!otpId || !code) throw new MGError("BAD_REQUEST");

  const otpRow = await verifyOtp(deps.db, deps.now, { otpId, code, pepper: deps.env.OTP_PEPPER ?? "", lockSeconds: 600 });
  const purpose = String(otpRow.purpose);
  const memberId = String(otpRow.member_id);
  const phoneDigits = String(otpRow.target);
  const phoneNorm = normalizePhone(phoneDigits);

  if (purpose === "signup_phone") {
    const mrows = await deps.db.query<{ id: string; email: string; name: string }>(`select id, email, name from members where id=$1`, [memberId]);
    if (!mrows.length) throw new MGError("BAD_REQUEST");
    const member = mrows[0];

    const taken = await deps.db.query<{ id: string }>(`select id from members where phone=$1 and state='active' and id<>$2`, [phoneNorm, memberId]);
    if (taken.length) throw new MGError("PHONE_TAKEN");

    const nowIso = deps.now().toISOString();
    await deps.db.query(`update members set phone=$2, state='active', phone_verified_at=$3 where id=$1`, [memberId, phoneNorm, nowIso]);

    const linked = await deps.db.query<{ id: string }>(
      `update rfps set owner_id=$1 where owner_id is null and lower(contact_email)=lower($2) returning id`,
      [memberId, member.email],
    );
    const linkedCount = linked.length;

    await enqueueAndDispatch(deps.db, deps.env, deps.now, "ACC_WELCOME", `ACC_WELCOME:${memberId}`, {
      member_id: memberId, to_email: member.email, to_phone: phoneNorm, recipient_kind: "mem",
    }, { CONTACT_NAME: member.name, LINKED_COUNT: linkedCount });

    if (linkedCount > 0) {
      const refs = await deps.db.query<{ ref: string }>(`select ref from rfps where id = any($1::uuid[])`, [linked.map((l) => l.id)]);
      await enqueueAndDispatch(deps.db, deps.env, deps.now, "ACC_LINKED", `ACC_LINKED:${memberId}:auto`, {
        member_id: memberId, to_email: member.email, recipient_kind: "mem",
      }, { LINKED_COUNT: linkedCount, RFP_REFS: refs.map((r) => r.ref).join(", ") });
    }

    return { state: "active", linked_count: linkedCount };
  }

  if (purpose === "phone_change") {
    const taken = await deps.db.query<{ id: string }>(`select id from members where phone=$1 and state='active' and id<>$2`, [phoneNorm, memberId]);
    if (taken.length) throw new MGError("PHONE_TAKEN");

    const nowIso = deps.now().toISOString();
    await deps.db.query(`update members set phone=$2, phone_verified_at=$3 where id=$1`, [memberId, phoneNorm, nowIso]);
    const mrows = await deps.db.query<{ email: string }>(`select email from members where id=$1`, [memberId]);
    const phoneMasked = maskPhone(phoneNorm);
    await enqueueAndDispatch(deps.db, deps.env, deps.now, "ACC_PHONE_CHANGED", `ACC_PHONE_CHANGED:${memberId}:${nowIso}`, {
      member_id: memberId, to_email: mrows[0]?.email, recipient_kind: "mem",
    }, { NEW_PHONE_MASKED: phoneMasked, CHANGED_AT: nowIso });

    return { phone_masked: phoneMasked };
  }

  throw new MGError("BAD_REQUEST");
}
