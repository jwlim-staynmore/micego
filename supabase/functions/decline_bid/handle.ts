// POST /decline_bid — anon (bid 토큰). SPEC_LAUNCH.md §3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";

const REASONS = ["Dates unavailable", "Capacity doesn't fit", "Other"];

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const token = asString(body.token);
  const reason = asString(body.reason);
  const note = asString(body.note);
  if (!token) throw new MGError("BAD_REQUEST");
  if (!REASONS.includes(reason)) throw new MGError("VALIDATION", { fields: [{ name: "reason", code: "invalid" }] });

  await rateLimit(deps.db, "decline_bid_token", token, 10, 3600); // 10/h/token

  const irows = await deps.db.query<Record<string, unknown>>(`select * from invitations where token=$1`, [token]);
  if (!irows.length) throw new MGError("TOKEN_INVALID");
  const inv = irows[0];
  const rrows = await deps.db.query<Record<string, unknown>>(`select * from rfps where id=$1`, [inv.rfp_id]);
  if (!rrows.length) throw new MGError("TOKEN_INVALID");
  const r = rrows[0];

  if (!["invited", "viewed"].includes(String(inv.status))) throw new MGError("STATE_CONFLICT");
  const deadline = (inv.deadline ?? r.deadline) as string | null;
  if (deadline && new Date(deadline).getTime() <= deps.now().getTime()) throw new MGError("DEADLINE_PASSED");

  const nowIso = deps.now().toISOString();
  await deps.db.query(
    `update invitations set status='declined', declined_at=$2, decline_reason=$3, decline_note=$4 where id=$1`,
    [inv.id, nowIso, reason, note || null],
  );

  const pr = await deps.db.query<{ name: string }>(`select name from partners where id=$1`, [inv.partner_id]);
  await deps.db.query(
    `insert into rfp_history (rfp_id, at, actor, actor_label, memo) values ($1,$2,'hotel','호텔',$3)`,
    [inv.rfp_id, nowIso, `${pr[0]?.name ?? ""} 제안 거절 · ${reason}${note ? " · " + note : ""}`],
  );

  return { declined_at: nowIso };
}
