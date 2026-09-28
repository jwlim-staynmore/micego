// POST /create_share_link — member(owner) JWT. SQL RPC create_share_link(ref) 을 그대로 감싼다.
// 20/day/member. RPC 는 auth.uid() 로 소유자를 판별하므로, PostgREST 를 거치지 않는 이 Edge Function 은
// withClaims 로 request.jwt.claims GUC 를 흉내낸 뒤 같은 함수를 호출한다.
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

  await rateLimit(deps.db, "create_share_link", user.id, 20, 86400);

  try {
    const result = await deps.db.withClaims(claimsFor(user), async (db) => {
      return await db.scalar<Record<string, unknown>>(`select create_share_link($1)`, [ref]);
    });
    return result;
  } catch (e) {
    throw fromSqlError(e);
  }
}
