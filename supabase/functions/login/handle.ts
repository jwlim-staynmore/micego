// POST /login — anon. {email,password,keep} → {access_token,refresh_token,expires_at,member}. SPEC_LAUNCH.md §3, SPEC_ACCOUNTS.md A2.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { clientIp, hashIp } from "../_shared/http.ts";
import { enqueueAndDispatch } from "../_shared/notify/enqueue_and_dispatch.ts";

const WINDOW_15M = 15 * 60_000;
const WINDOW_1H = 60 * 60_000;

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ip = clientIp(req);
  const ipHash = await hashIp(ip, deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "login_ip", ipHash, 30, 600); // 30/10min/IP

  const email = asString(body.email).trim().toLowerCase();
  const password = asString(body.password);
  if (!email || !password) throw new MGError("BAD_REQUEST");

  const nowMs = deps.now().getTime();
  const mrows = await deps.db.query<{ id: string; email: string; state: string; name: string; company: string; org_type: string }>(
    `select id, email, state, name, company, org_type from members where lower(email)=$1 and state <> 'withdrawn'`,
    [email],
  );
  const member = mrows.length ? mrows[0] : null;

  if (member && member.state === "locked") throw new MGError("ACCOUNT_LOCKED");

  const fails15 = await deps.db.query<{ oldest: string; n: string }>(
    `select min(at) as oldest, count(*) as n from login_attempts where email_norm=$1 and ok=false and at > $2`,
    [email, new Date(nowMs - WINDOW_15M).toISOString()],
  );
  const n15 = Number(fails15[0]?.n ?? 0);
  if (n15 >= 5) {
    const oldestMs = fails15[0]?.oldest ? new Date(fails15[0].oldest).getTime() : nowMs;
    const retryAfter = Math.max(1, Math.round((oldestMs + WINDOW_15M - nowMs) / 1000));
    throw new MGError("LOGIN_COOLDOWN", { extra: { retry_after: retryAfter } });
  }

  let ok = false;
  let tokens: { access_token: string; refresh_token: string; expires_in: number } | null = null;
  if (member) {
    try {
      tokens = await deps.authAdmin.signInWithPassword(email, password);
      ok = true;
    } catch {
      ok = false;
    }
  }

  await deps.db.query(`insert into login_attempts (email_norm, at, ip, ok) values ($1,$2,$3,$4)`, [email, deps.now().toISOString(), ip, ok]);

  if (!ok) {
    const fails1h = await deps.db.query<{ n: string }>(
      `select count(*) as n from login_attempts where email_norm=$1 and ok=false and at > $2`,
      [email, new Date(nowMs - WINDOW_1H).toISOString()],
    );
    const n1h = Number(fails1h[0]?.n ?? 0);
    if (member && n1h >= 10) {
      const nowIso = deps.now().toISOString();
      await deps.db.query(`update members set state='locked', locked_at=$2 where id=$1`, [member.id, nowIso]);
      await deps.authAdmin.updateUserById(member.id, { ban_duration: "876000h" }).catch(() => {});
      await enqueueAndDispatch(deps.db, deps.env, deps.now, "ACC_LOCKED", `ACC_LOCKED:${member.id}:${nowIso}`, {
        member_id: member.id, to_email: member.email, recipient_kind: "mem",
      }, { LOCKED_AT: nowIso, RESET_URL: `${deps.env.SITE_BASE_URL ?? ""}/ko/reset.html` });
      throw new MGError("ACCOUNT_LOCKED");
    }
    if (member && n15 + 1 >= 5) {
      await deps.authAdmin.updateUserById(member.id, { ban_duration: "15m" }).catch(() => {});
      throw new MGError("LOGIN_COOLDOWN", { extra: { retry_after: 900 } });
    }
    throw new MGError("LOGIN_FAILED");
  }

  // 성공: 카운터 초기화(과거 실패 기록 삭제), 접속 기록, last_login_at
  if (member!.state === "suspended") throw new MGError("ACCOUNT_SUSPENDED");

  await deps.db.query(`delete from login_attempts where email_norm=$1 and ok=false`, [email]);
  const nowIso = deps.now().toISOString();
  await deps.db.query(`update members set last_login_at=$2 where id=$1`, [member!.id, nowIso]);
  await deps.db.query(`insert into member_access_log (member_id, at, ip, ua, ok) values ($1,$2,$3,$4,true)`, [member!.id, nowIso, ip, req.headers.get("user-agent") ?? ""]);

  return {
    access_token: tokens!.access_token,
    refresh_token: tokens!.refresh_token,
    expires_at: new Date(deps.now().getTime() + tokens!.expires_in * 1000).toISOString(),
    member: { name: member!.name, company: member!.company, orgType: member!.org_type, state: member!.state },
  };
}
