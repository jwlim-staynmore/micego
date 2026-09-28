// Authorization: Bearer <access_token> 에서 회원/운영자를 뽑아낸다.
import { MGError } from "./errors.ts";
import type { Deps, AuthUser } from "./deps.ts";

export function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

export async function requireAuthUser(req: Request, deps: Deps): Promise<AuthUser> {
  const token = bearerToken(req);
  if (!token) throw new MGError("AUTH_REQUIRED");
  const user = await deps.authAdmin.getUser(token);
  if (!user) throw new MGError("AUTH_REQUIRED");
  return user;
}

export async function requireOperator(req: Request, deps: Deps): Promise<AuthUser> {
  const user = await requireAuthUser(req, deps);
  if (user.app_metadata?.role !== "operator") throw new MGError("FORBIDDEN");
  return user;
}

export interface MemberRow {
  id: string;
  state: string;
  name: string | null;
  company: string | null;
  org_type: string | null;
  email: string | null;
  phone: string | null;
  last_login_at: string | null;
}

export async function requireActiveMember(req: Request, deps: Deps): Promise<MemberRow> {
  const user = await requireAuthUser(req, deps);
  const rows = await deps.db.query<MemberRow>(`select id, state, name, company, org_type, email, phone, last_login_at from members where id=$1`, [user.id]);
  if (!rows.length || rows[0].state === "withdrawn" || rows[0].state === "purged") throw new MGError("AUTH_REQUIRED");
  return rows[0];
}

// auth.jwt()/auth.uid() 가 읽는 request.jwt.claims GUC 를 흉내내기 위한 최소 클레임.
// (PostgREST 가 실제로 만드는 JWT 페이로드의 부분집합 — sub/role/app_metadata 만 있으면 우리 SQL 함수들엔 충분.)
export function claimsFor(user: AuthUser): Record<string, unknown> {
  return { sub: user.id, role: "authenticated", email: user.email, app_metadata: user.app_metadata ?? {} };
}
