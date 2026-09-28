// POST /partner_invite — 콘솔 계정 초대 (운영자·파트너 관리자). 지역파트너 콘솔 설계서 §8.  - 클로드
// Supabase 기본 초대 메일(magic link)을 보내고, app_metadata(role/partner_id/cv) + console_user 행을 만든다.
// 초대 링크는 admin/accept.html 로 떨어지며, 거기서 비밀번호를 정하면 console_accept() 가 계정을 활성화한다.
import type { Deps } from "../_shared/deps.ts";
import { MGError, fromSqlError } from "../_shared/errors.ts";
import { asString, RE_EMAIL } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { requireAuthUser, claimsFor } from "../_shared/auth_ctx.ts";

interface Me { userId: string; role: string; partnerId: string | null; partnerCode: string | null; legacy?: boolean }

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const user = await requireAuthUser(req, deps);
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const email = asString(body.email).trim().toLowerCase();
  const displayName = asString(body.display_name).trim();
  const role = asString(body.role);
  const partnerCode = asString(body.partner_code).trim().toUpperCase() || null;
  if (!RE_EMAIL.test(email) || displayName.length < 1 || !["operator", "partner_admin", "partner_member"].includes(role)) {
    throw new MGError("VALIDATION");
  }
  await rateLimit(deps.db, "partner_invite_user", user.id, 30, 86400);

  // 호출자 판정은 DB(console_user)가 한다
  const me = await deps.db.withClaims(claimsFor(user), (db) => db.scalar<Me | null>(`select console_whoami()`));
  if (!me || !me.role) throw new MGError("FORBIDDEN");

  let partnerId: string | null = null;
  if (role === "operator") {
    if (me.role !== "operator") throw new MGError("FORBIDDEN");
  } else {
    if (me.role === "operator") {
      if (!partnerCode) throw new MGError("VALIDATION", { fields: [{ name: "partner_code", code: "required" }] });
      const rows = await deps.db.query<{ id: string; status: string }>(`select id, status from partner_org where code=$1`, [partnerCode]);
      if (!rows.length) throw new MGError("NOT_FOUND");
      partnerId = rows[0].id;
    } else if (me.role === "partner_admin") {
      partnerId = me.partnerId;
      if (!partnerId) throw new MGError("FORBIDDEN");
    } else {
      throw new MGError("FORBIDDEN");
    }
  }

  const redirectTo = `${(deps.env.SITE_BASE_URL ?? "").replace(/\/$/, "")}/admin/accept.html`;
  const inv = await deps.authAdmin.inviteUserByEmail(email, { redirectTo, data: { display_name: displayName, console: true } });

  let cu: Record<string, unknown>;
  try {
    cu = await deps.db.scalar<Record<string, unknown>>(
      `select to_jsonb(private.console_user_register($1,$2,$3,$4::console_role,$5,$6))`,
      [inv.id, email, displayName, role, partnerId, user.id],
    );
  } catch (e) {
    throw fromSqlError(e);
  }
  await deps.authAdmin.updateUserById(inv.id, {
    app_metadata: { role, partner_id: partnerId, cv: cu.claims_version ?? 1, console: true },
  });
  await deps.db.query(
    `insert into audit_log (actor, operator_id, action, label, partner_org_id, entity_type, entity_id, meta) values ('operator', $1, 'console_invite', $2, $3, 'console_user', $4, $5::jsonb)`,
    [user.id, email, partnerId, inv.id, JSON.stringify({ role, existed: inv.existed })],
  );
  return { user_id: inv.id, email, role, partner_id: partnerId, status: cu.status ?? "invited", existed: inv.existed };
}
