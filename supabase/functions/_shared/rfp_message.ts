// request_change / ask_question 공용 로직 (SPEC_LAUNCH.md §3). 두 함수는 kind 만 다르다.
import type { Deps } from "./deps.ts";
import { MGError } from "./errors.ts";
import { asString } from "./validate.ts";
import { rateLimit } from "./ratelimit.ts";
import { isShareToken } from "./tokens.ts";
import { sendInternalInbound } from "./notify/internal.ts";

const TERMINAL_STATES = ["won", "lost", "rejected", "cancelled"];

export async function handleRfpMessage(req: Request, deps: Deps, kind: "change" | "question"): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const token = asString(body.token);
  const message = asString(body.message);
  const proposals = Array.isArray(body.proposals) ? (body.proposals as unknown[]).map((p) => String(p)) : null;

  if (!token) throw new MGError("BAD_REQUEST");
  if (isShareToken(token)) throw new MGError("FORBIDDEN_SHARE");
  if (message.length < 1 || message.length > 2000) throw new MGError("VALIDATION", { fields: [{ name: "message", code: "length" }] });

  const trows = await deps.db.query<{ id: string; rfp_id: string; state: string; kind: string }>(
    `select id, rfp_id, state, kind from rfp_tokens where token=$1`,
    [token],
  );
  if (!trows.length) throw new MGError("TOKEN_INVALID");
  const trow = trows[0];
  if (trow.kind === "share") throw new MGError("FORBIDDEN_SHARE");
  if (trow.state !== "active") throw new MGError("TOKEN_REVOKED");

  const rrows = await deps.db.query<{ id: string; ref: string; state: string; contact_name: string; contact_email: string }>(
    `select id, ref, state, contact_name, contact_email from rfps where id=$1`,
    [trow.rfp_id],
  );
  if (!rrows.length) throw new MGError("TOKEN_INVALID");
  const r = rrows[0];
  if (TERMINAL_STATES.includes(r.state)) throw new MGError("STATE_CONFLICT");

  await rateLimit(deps.db, "rfp_message", r.id, 10, 86400); // 10/day/RFP (request_change 와 ask_question 합산)

  const now = deps.now().toISOString();
  await deps.db.query(
    `insert into rfp_messages (rfp_id, kind, body, proposal_labels, token_id, created_at) values ($1,$2,$3,$4,$5,$6)`,
    [r.id, kind, message, proposals, trow.id, now],
  );

  const memoLabel = kind === "change" ? "변경 요청" : "문의";
  await deps.db.query(
    `insert into rfp_history (rfp_id, at, actor, actor_label, memo) values ($1,$2,'organizer','오거나이저',$3)`,
    [r.id, now, `${memoLabel}: ${message.slice(0, 200)}`],
  );

  const idemKey = `INTERNAL_INBOUND:${kind}:${r.id}:${now}`;
  const result = await sendInternalInbound({
    ops_inbox: deps.env.OPS_INBOX ?? "",
    from_address: deps.env.FROM_ADDRESS ?? "notify@micego.example",
    resend_api_key: deps.env.RESEND_API_KEY,
    notify_mode: deps.env.NOTIFY_MODE === "live" ? "live" : "log",
    subject: `[MICEGO] ${memoLabel} · ${r.ref}`,
    fields: { RFP_ID: r.ref, ORG_CONTACT_NAME: r.contact_name, ORG_EMAIL: r.contact_email, PROPOSALS: proposals?.join(",") ?? null },
    message,
    idempotencyKey: idemKey,
  }).catch((e) => ({ ok: false, error: String(e) }));

  await deps.db.query(
    `insert into notification_log (template_id, recipient_kind, rfp_id, to_email, vars, idempotency_key, status, attempts)
     values ('INTERNAL_INBOUND','ops',$1,$2,$3::jsonb,$4,$5,1)
     on conflict (idempotency_key) do nothing`,
    [r.id, deps.env.OPS_INBOX ?? "", JSON.stringify({ kind, message }), idemKey, result.ok ? "done" : "failed"],
  );

  return { received: true };
}
