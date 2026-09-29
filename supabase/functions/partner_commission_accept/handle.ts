// POST /partner_commission_accept — anon (호텔 커미션 동의 토큰). 승인 메일의 1회용 링크에서 호텔이 요율에 동의한다.  - 클로드
// body: { token, action: 'lookup' | 'accept' }
// lookup 은 GET 대용(POST). 기업 메일 보안 스캐너가 링크를 미리 열어도 토큰이 소비되지 않도록 동의는 POST + action 으로만 처리한다(quote_confirm 과 같은 방식).
import type { Deps } from "../_shared/deps.ts";
import { MGError, fromSqlError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { clientIp, hashIp } from "../_shared/http.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ipHash = await hashIp(clientIp(req), deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "commission_accept_ip", ipHash, 60, 600);
  const token = asString(body.token);
  const action = asString(body.action) || "lookup";
  if (!token || !/^[A-Za-z0-9_\-]{16,64}$/.test(token)) throw new MGError("BAD_REQUEST");

  if (action === "lookup") {
    const view = await deps.db.scalar<Record<string, unknown> | null>(`select private.partner_commission_lookup($1)`, [token]);
    if (!view) { await rateLimit(deps.db, "commission_accept_miss_ip", ipHash, 20, 600); throw new MGError("TOKEN_INVALID"); }
    return view;
  }
  if (action !== "accept") throw new MGError("BAD_REQUEST");
  try {
    return await deps.db.scalar<Record<string, unknown>>(`select private.partner_commission_apply($1,$2)`, [token, ipHash]);
  } catch (e) {
    throw fromSqlError(e);
  }
}
