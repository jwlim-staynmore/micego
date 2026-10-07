// POST /signup_start — anon. SPEC_LAUNCH.md §3 + SPEC_ACCOUNTS.md A1.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { FieldErrors, RE_EMAIL, asString, asBool, validatePassword } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { randomToken } from "../_shared/tokens.ts";
import { createOtp } from "../_shared/otp.ts";
import { clientIp, hashIp } from "../_shared/http.ts";
import { requireTurnstile } from "../_shared/turnstile.ts";

// 견적 요청 폼·가입·계정 설정이 같은 목록을 쓴다(0018_org_types_currencies).
const ORG_TYPES = ["여행사", "랜드사", "기업(행사 주최)", "협회·기관", "기타"];

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ip = clientIp(req);
  const ipHash = await hashIp(ip, deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "signup_start_ip", ipHash, 10, 3600); // 10/h/IP

  const email = asString(body.email).trim().toLowerCase();
  const password = asString(body.password);
  const name = asString(body.name).trim();
  const orgType = asString(body.orgType);
  const company = asString(body.company).trim();
  const consents = (body.consents ?? {}) as Record<string, unknown>;

  const fe = new FieldErrors();
  fe.check("email", RE_EMAIL.test(email));
  fe.check("password", validatePassword(password, email));
  fe.check("name", name.length >= 2);
  fe.check("orgType", ORG_TYPES.includes(orgType));
  fe.check("company", company.length >= 1);
  fe.check("age", asBool(consents.age));
  fe.check("terms", asBool(consents.terms));
  fe.check("privacy", asBool(consents.privacy));
  fe.throwIfAny();
  await requireTurnstile(deps, req, body.turnstile_token); // D-50 · 시크릿 없으면 통과

  await rateLimit(deps.db, "signup_start_email", email, 10, 86400); // 10/day/email

  const marketing = asBool(consents.marketing);
  const channels = Array.isArray(consents.channels) ? (consents.channels as unknown[]).map(String) : [];
  const mktEmail = marketing && channels.includes("email");
  const mktSms = marketing && channels.includes("sms");

  const nowIso = deps.now().toISOString();
  const existing = await deps.db.query<{ id: string; state: string }>(
    `select id, state from members where lower(email)=$1 and state <> 'withdrawn' order by created_at desc limit 1`,
    [email],
  );

  if (existing.length && ["active", "locked", "suspended"].includes(existing[0].state)) {
    // 이미 가입된 이메일: 열거 공격 방지를 위해 정상 흐름과 동일한 모양의 티켓을 돌려주되, 실제로는 계정을 만들지 않는다.
    await rateLimit(deps.db, "signup_email_exists", email, 1, 3600); // ACC_EMAIL_EXISTS 는 최대 1/h
    const decoyTicket = randomToken(deps.rand, 24, "dk_");
    await deps.db.query(
      `insert into signup_tickets (ticket, member_id, email, expires_at, created_at) values ($1,null,$2,$3,$4)`,
      [decoyTicket, email, new Date(deps.now().getTime() + 86400_000).toISOString(), nowIso],
    );
    const idemKey = `ACC_EMAIL_EXISTS:${email}:${Math.floor(deps.now().getTime() / 3600_000)}`;
    const sendResult = await deps.send({
      templateId: "ACC_EMAIL_EXISTS", channel: "email", to: email,
      vars: { LOGIN_URL: `${deps.env.SITE_BASE_URL ?? ""}/ko/login.html`, RESET_URL: `${deps.env.SITE_BASE_URL ?? ""}/ko/reset.html` },
    }).catch((e) => ({ ok: false, error: String(e) }));
    await deps.db.query(
      `insert into notification_log (template_id, recipient_kind, to_email, vars, idempotency_key, status, attempts)
       values ('ACC_EMAIL_EXISTS','mem',$1,'{}'::jsonb,$2,$3,1) on conflict (idempotency_key) do nothing`,
      [email, idemKey, sendResult.ok ? "done" : "failed"],
    );
    return { ticket: decoyTicket, expires_at: new Date(deps.now().getTime() + 600_000).toISOString(), resend_at: new Date(deps.now().getTime() + 60_000).toISOString() };
  }

  // 새 가입이거나 이전에 완료되지 않은 가입(pending_*) 이 있으면 지우고 새로 만든다.
  if (existing.length) {
    await deps.authAdmin.deleteUser(existing[0].id).catch(() => {});
    await deps.db.query(`delete from members where id=$1`, [existing[0].id]);
  }

  const authUser = await deps.authAdmin.createUser({ email, password, email_confirm: false });
  await deps.db.query(
    `insert into members (id, state, name, company, org_type, email, consents, mkt_email, mkt_sms, mkt_at, created_at)
     values ($1,'pending_email',$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)`,
    [authUser.id, name, company, orgType, email, JSON.stringify(consents), mktEmail, mktSms, marketing ? nowIso : null, nowIso],
  );

  const ticket = randomToken(deps.rand, 24);
  await deps.db.query(
    `insert into signup_tickets (ticket, member_id, email, expires_at, created_at) values ($1,$2,$3,$4,$5)`,
    [ticket, authUser.id, email, new Date(deps.now().getTime() + 86400_000).toISOString(), nowIso],
  );

  const otp = await createOtp(deps.db, deps.now, deps.rand, {
    purpose: "signup_email",
    memberId: authUser.id,
    ticket,
    target: email,
    ttlSeconds: 600, // 10분
    cooldownSeconds: 60,
    maxAttempts: 5,
    dailyCap: 10,
    pepper: deps.env.OTP_PEPPER ?? "",
    demoFixedCode: deps.env.MG_DEMO_OTP === "1" && deps.env.NOTIFY_MODE !== "live" ? "123456" : null,
  });

  const sendResult = await deps.send({ templateId: "ACC_EMAIL_CODE", channel: "email", to: email, vars: { CODE: otp.code, EXPIRES_MIN: "10", PURPOSE: "가입" } })
    .catch((e) => ({ ok: false, error: String(e) }));
  await deps.db.query(
    `insert into notification_log (template_id, recipient_kind, member_id, to_email, vars, idempotency_key, status, attempts)
     values ('ACC_EMAIL_CODE','mem',$1,$2,$3::jsonb,$4,$5,1) on conflict (idempotency_key) do nothing`,
    [authUser.id, email, JSON.stringify({ CODE: "[redacted]", PURPOSE: "가입" }), `ACC_EMAIL_CODE:${otp.otpId}`, sendResult.ok ? "done" : "failed"],
  );

  return { ticket, expires_at: otp.expiresAt, resend_at: otp.resendAt };
}
