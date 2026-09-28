// POST /password_reset_complete — recovery-session JWT. {password} → {done:true}. SPEC_LAUNCH.md §3, SPEC_ACCOUNTS.md A3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString, validatePassword } from "../_shared/validate.ts";
import { requireAuthUser } from "../_shared/auth_ctx.ts";
import { enqueueAndDispatch } from "../_shared/notify/enqueue_and_dispatch.ts";

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const user = await requireAuthUser(req, deps);
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const password = asString(body.password);
  if (!user.email || !validatePassword(password, user.email)) throw new MGError("VALIDATION", { fields: [{ name: "password", code: "invalid" }] });

  await deps.authAdmin.updateUserById(user.id, { password });
  await deps.authAdmin.updateUserById(user.id, { ban_duration: "none" }).catch(() => {});

  const nowIso = deps.now().toISOString();
  const mrows = await deps.db.query<{ state: string; email: string }>(`select state, email from members where id=$1`, [user.id]);
  const wasLocked = mrows.length && mrows[0].state === "locked";
  await deps.db.query(`update members set state = case when state='locked' then 'active' else state end, locked_at = null where id=$1`, [user.id]);

  await deps.authAdmin.signOutAll(user.id);

  await enqueueAndDispatch(deps.db, deps.env, deps.now, "ACC_PW_CHANGED", `ACC_PW_CHANGED:${user.id}:${nowIso}`, {
    member_id: user.id, to_email: mrows[0]?.email ?? user.email, recipient_kind: "mem",
  }, { CHANGED_AT: nowIso, RESET_URL: `${deps.env.SITE_BASE_URL ?? ""}/ko/reset.html`, WAS_LOCKED: wasLocked });

  return { done: true };
}
