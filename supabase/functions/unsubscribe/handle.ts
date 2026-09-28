// POST /unsubscribe — anon. {token,action:'check'|'confirm'} → {state,property}. SPEC_LAUNCH.md §3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { clientIp, hashIp } from "../_shared/http.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ip = clientIp(req);
  const ipHash = await hashIp(ip, deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "unsubscribe_ip", ipHash, 20, 600);

  const token = asString(body.token);
  const action = asString(body.action);
  if (!token || (action !== "check" && action !== "confirm")) throw new MGError("BAD_REQUEST");

  const rows = await deps.db.query<{ id: string; name: string; invite_opt_out_at: string | null }>(
    `select id, name, invite_opt_out_at from partners where unsubscribe_token=$1`,
    [token],
  );
  if (!rows.length) throw new MGError("TOKEN_INVALID");
  const p = rows[0];

  if (p.invite_opt_out_at) return { state: "already", property: p.name };
  if (action === "check") return { state: "confirm", property: p.name };

  const nowIso = deps.now().toISOString();
  await deps.db.query(`update partners set invite_opt_out_at=$2 where id=$1`, [p.id, nowIso]);
  await deps.db.query(
    `insert into partner_history (partner_id, at, actor, actor_label, memo) values ($1,$2,'hotel','호텔','초대 메일 수신 거부')`,
    [p.id, nowIso],
  );
  return { state: "done", property: p.name };
}
