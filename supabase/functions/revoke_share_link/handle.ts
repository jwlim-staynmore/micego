// POST /revoke_share_link — member(owner) JWT. SQL RPC revoke_share_link(ref) 을 그대로 감싼다.
import type { Deps } from "../_shared/deps.ts";
import { MGError, fromSqlError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { requireAuthUser, claimsFor } from "../_shared/auth_ctx.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const user = await requireAuthUser(req, deps);
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ref = asString(body.ref);
  if (!ref) throw new MGError("BAD_REQUEST");

  await rateLimit(deps.db, "create_share_link", user.id, 20, 86400); // 같은 버킷 (SPEC: 20/day/member 는 발급+회수 합산)

  try {
    return await deps.db.withClaims(claimsFor(user), async (db) => {
      return await db.scalar<Record<string, unknown>>(`select revoke_share_link($1)`, [ref]);
    });
  } catch (e) {
    throw fromSqlError(e);
  }
}
