// POST /quote_confirm — anon (호텔 확인 토큰). 파트너가 대리 입력한 견적을 호텔이 확인하거나 이의를 제기한다.  - 클로드
// body: { token, action: 'lookup' | 'confirm' | 'dispute', reason? }
// lookup 은 GET 대용(POST). 기업 메일 보안 스캐너가 링크를 미리 열어도 토큰이 소비되지 않도록 확인은 POST + action 으로만 처리한다(설계 12장 d).
import type { Deps } from "../_shared/deps.ts";
import { MGError, fromSqlError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { clientIp, hashIp } from "../_shared/http.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ipHash = await hashIp(clientIp(req), deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "quote_confirm_ip", ipHash, 60, 600);
  const token = asString(body.token);
  const action = asString(body.action) || "lookup";
  if (!token || !/^[A-Za-z0-9_\-]{16,64}$/.test(token)) throw new MGError("BAD_REQUEST");

  if (action === "lookup") {
    const view = await deps.db.scalar<Record<string, unknown> | null>(`select private.quote_confirm_lookup($1)`, [token]);
    if (!view) { await rateLimit(deps.db, "quote_confirm_miss_ip", ipHash, 20, 600); throw new MGError("TOKEN_INVALID"); }
    return view;
  }
  if (action !== "confirm" && action !== "dispute") throw new MGError("BAD_REQUEST");
  const reason = asString(body.reason).trim();
  try {
    return await deps.db.scalar<Record<string, unknown>>(`select private.quote_confirm_apply($1,$2,$3)`, [token, action, reason || null]);
  } catch (e) {
    throw fromSqlError(e);
  }
}
