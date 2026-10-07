// POST /account_update — member JWT. op 별 분기. SPEC_LAUNCH.md §3, SPEC_ACCOUNTS.md A5.
//
// 스펙과의 차이점 (§3 표는 모든 op 가 {member} 를 돌려준다고 되어 있지만): op:'email_start' 는 클라이언트가
// 다음 단계(이메일 인증 코드 입력)를 진행하려면 otp_id/expires_at/resend_at 이 필요하다. 다른 모든 인증코드
// 발급 엔드포인트(pick_send_otp, send_phone_otp 등)와의 일관성을 위해 이 op 만 {otp_id,expires_at,resend_at}
// 를 돌려주고, 나머지 op(profile/marketing/email_verify/password)는 스펙대로 {member} 를 돌려준다.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { FieldErrors, RE_EMAIL, asBool, asString, validatePassword } from "../_shared/validate.ts";
import { requireActiveMember } from "../_shared/auth_ctx.ts";
import { requireReauthIfStale } from "../_shared/reauth.ts";
import { createOtp, verifyOtp } from "../_shared/otp.ts";
import { enqueueAndDispatch } from "../_shared/notify/enqueue_and_dispatch.ts";
import type { MemberRow } from "../_shared/auth_ctx.ts";

// 견적 요청 폼·가입·계정 설정이 같은 목록을 쓴다(0018_org_types_currencies).
const ORG_TYPES = ["여행사", "랜드사", "기업(행사 주최)", "협회·기관", "기타"];

function memberView(m: Record<string, unknown>) {
  return {
    name: m.name, company: m.company, orgType: m.org_type, email: m.email, phone: m.phone, state: m.state,
    mktEmail: m.mkt_email, mktSms: m.mkt_sms, mktAt: m.mkt_at, lastLoginAt: m.last_login_at,
  };
}

async function fetchMember(deps: Deps, id: string) {
  const rows = await deps.db.query<Record<string, unknown>>(`select * from members where id=$1`, [id]);
  return rows[0];
}

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const member: MemberRow = await requireActiveMember(req, deps);
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const op = asString(body.op);

  if (op === "profile") {
    const name = asString(body.name).trim();
    const company = asString(body.company).trim();
    const orgType = asString(body.orgType);
    const fe = new FieldErrors();
    fe.check("name", name.length >= 2);
    fe.check("company", company.length >= 1);
    fe.check("orgType", ORG_TYPES.includes(orgType));
    fe.throwIfAny();
    await deps.db.query(`update members set name=$2, company=$3, org_type=$4 where id=$1`, [member.id, name, company, orgType]);
    return { member: memberView(await fetchMember(deps, member.id)) };
  }

  if (op === "marketing") {
    const mktEmail = asBool(body.mktEmail);
    const mktSms = asBool(body.mktSms);
    await deps.db.query(`update members set mkt_email=$2, mkt_sms=$3, mkt_at=$4 where id=$1`, [member.id, mktEmail, mktSms, deps.now().toISOString()]);
    return { member: memberView(await fetchMember(deps, member.id)) };
  }

  if (op === "email_start") {
    const newEmail = asString(body.new_email).trim().toLowerCase();
    const password = asString(body.password) || undefined;
    if (!RE_EMAIL.test(newEmail)) throw new MGError("VALIDATION", { fields: [{ name: "new_email", code: "invalid" }] });
    await requireReauthIfStale(deps, member, password);

    const taken = await deps.db.query<{ id: string }>(`select id from members where lower(email)=$1 and state<>'withdrawn' and id<>$2`, [newEmail, member.id]);
    const pepper = deps.env.OTP_PEPPER ?? "";
    const demoFixed = deps.env.MG_DEMO_OTP === "1" && deps.env.NOTIFY_MODE !== "live" ? "123456" : null;

    if (taken.length) {
      // 이미 다른 회원이 쓰는 이메일: 열거 방지를 위해 정상과 같은 모양으로 응답하되, 실제로는 아무도 인증할 수 없는
      // 디코이 OTP(회원 연결 없음)를 만든다 — email_verify 는 이 otp_id 에 대해 항상 OTP_WRONG 을 돌려준다.
      const otp = await createOtp(deps.db, deps.now, deps.rand, {
        purpose: "email_change", memberId: null, target: `decoy:${newEmail}:${member.id}`,
        ttlSeconds: 600, cooldownSeconds: 60, maxAttempts: 5, dailyCap: 10, pepper, demoFixedCode: null,
      });
      return { otp_id: otp.otpId, expires_at: otp.expiresAt, resend_at: otp.resendAt };
    }

    const otp = await createOtp(deps.db, deps.now, deps.rand, {
      purpose: "email_change", memberId: member.id, target: newEmail, meta: { new_email: newEmail },
      ttlSeconds: 600, cooldownSeconds: 60, maxAttempts: 5, dailyCap: 10, pepper, demoFixedCode: demoFixed,
    });
    const sendResult = await deps.send({ templateId: "ACC_EMAIL_CODE", channel: "email", to: newEmail, vars: { CODE: otp.code, EXPIRES_MIN: "10", PURPOSE: "이메일 변경" } })
      .catch((e) => ({ ok: false, error: String(e) }));
    await deps.db.query(
      `insert into notification_log (template_id, recipient_kind, member_id, to_email, vars, idempotency_key, status, attempts)
       values ('ACC_EMAIL_CODE','mem',$1,$2,$3::jsonb,$4,$5,1) on conflict (idempotency_key) do nothing`,
      [member.id, newEmail, JSON.stringify({ CODE: "[redacted]", PURPOSE: "이메일 변경" }), `ACC_EMAIL_CODE:${otp.otpId}`, sendResult.ok ? "done" : "failed"],
    );
    return { otp_id: otp.otpId, expires_at: otp.expiresAt, resend_at: otp.resendAt };
  }

  if (op === "email_verify") {
    const otpId = asString(body.otp_id);
    const code = asString(body.code);
    const otpRow = await verifyOtp(deps.db, deps.now, { otpId, code, pepper: deps.env.OTP_PEPPER ?? "" });
    if (String(otpRow.member_id) !== member.id) throw new MGError("OTP_WRONG", { extra: { remaining: 0 } });
    const meta = (otpRow.meta ?? {}) as Record<string, unknown>;
    const newEmail = String(meta.new_email ?? "");
    if (!newEmail) throw new MGError("BAD_REQUEST");

    const oldEmail = member.email;
    await deps.authAdmin.updateUserById(member.id, { email: newEmail, email_confirm: true });
    await deps.db.query(`update members set email=$2 where id=$1`, [member.id, newEmail]);

    const nowIso = deps.now().toISOString();
    await enqueueAndDispatch(deps.db, deps.env, deps.now, "ACC_EMAIL_CHANGED", `ACC_EMAIL_CHANGED:${member.id}:${nowIso}`, {
      member_id: member.id, to_email: oldEmail, recipient_kind: "mem",
    }, { NEW_EMAIL_MASKED: newEmail.replace(/^(.).*(@.*)$/, "$1***$2"), CHANGED_AT: nowIso });

    return { member: memberView(await fetchMember(deps, member.id)) };
  }

  if (op === "password") {
    const current = asString(body.current);
    const newPassword = asString(body.new);
    if (!member.email) throw new MGError("REAUTH_REQUIRED");
    try {
      await deps.authAdmin.signInWithPassword(member.email, current);
    } catch {
      throw new MGError("REAUTH_REQUIRED");
    }
    if (!validatePassword(newPassword, member.email)) throw new MGError("VALIDATION", { fields: [{ name: "new", code: "invalid" }] });

    await deps.authAdmin.updateUserById(member.id, { password: newPassword });
    await deps.authAdmin.signOutAll(member.id); // 다른 세션 종료 (현재 세션 보존은 관리자 API 제약상 근사치)

    const nowIso = deps.now().toISOString();
    await enqueueAndDispatch(deps.db, deps.env, deps.now, "ACC_PW_CHANGED", `ACC_PW_CHANGED:${member.id}:${nowIso}`, {
      member_id: member.id, to_email: member.email, recipient_kind: "mem",
    }, { CHANGED_AT: nowIso, RESET_URL: `${deps.env.SITE_BASE_URL ?? ""}/ko/reset.html` });

    return { member: memberView(await fetchMember(deps, member.id)) };
  }

  throw new MGError("BAD_REQUEST");
}
