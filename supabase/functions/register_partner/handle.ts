// POST /register_partner — anon. en/index.html #register 폼. SPEC_LAUNCH.md §3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { FieldErrors, RE_EMAIL, asString, asBool } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { randomToken } from "../_shared/tokens.ts";
import { clientIp, hashIp } from "../_shared/http.ts";

function parseCapNumber(band: string): number | null {
  const m = /(\d+)/.exec(band);
  return m ? Number(m[1]) : null;
}

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ip = clientIp(req);
  const ipHash = await hashIp(ip, deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "register_partner_ip", ipHash, 5, 3600); // 5/h/IP

  const hotelName = asString(body.hotelName).trim();
  const hotelLocation = asString(body.hotelLocation).trim();
  const groupCapacity = asString(body.groupCapacity);
  const banquetSpace = asString(body.banquetSpace);
  const contactName = asString(body.contactName).trim();
  const contactEmail = asString(body.contactEmail).trim().toLowerCase();
  const contactPhone = asString(body.contactPhone).trim();
  const consent = asBool(body.consent);
  const idem = asString(body.idem);

  const fe = new FieldErrors();
  fe.check("hotelName", hotelName.length >= 1);
  fe.check("hotelLocation", hotelLocation.length >= 1);
  fe.check("groupCapacity", !!groupCapacity);
  fe.check("banquetSpace", banquetSpace === "Available" || banquetSpace === "Not available");
  fe.check("contactName", contactName.length >= 1);
  fe.check("contactEmail", RE_EMAIL.test(contactEmail));
  fe.check("consent", consent === true);
  fe.throwIfAny();

  // 대기중(pending) 동일 이메일+상호명 재제출은 기존 행을 그대로 돌려준다.
  const existing = await deps.db.query<{ code: string; review_due_at: string }>(
    `select code, review_due_at from partners where lower(contact_email)=$1 and name=$2 and state='pending' order by applied_at desc limit 1`,
    [contactEmail, hotelName],
  );
  if (existing.length) {
    return { partner_id: existing[0].code, review_by: existing[0].review_due_at };
  }
  if (idem) {
    const byIdem = await deps.db.query<{ code: string; review_due_at: string }>(
      `select code, review_due_at from partners where source->>'idem' = $1 order by applied_at desc limit 1`,
      [idem],
    );
    if (byIdem.length) return { partner_id: byIdem[0].code, review_by: byIdem[0].review_due_at };
  }

  const code = await deps.db.scalar<string>(`select private.next_ref('PT')`);
  const nowIso = deps.now().toISOString();
  const reviewBy = await deps.db.scalar<string>(`select private.due($1, 5)`, [nowIso]);
  const unsubToken = randomToken(deps.rand, 24, "u_");
  const domain = contactEmail.includes("@") ? contactEmail.split("@")[1] : null;

  const rows = await deps.db.query<{ id: string }>(
    `insert into partners (
       code, state, name, location, dest, cap_band, cap, banquet,
       contact_name, contact_email, contact_phone, domain,
       applied_at, review_due_at, unsubscribe_token, consent_at, source
     ) values (
       $1,'pending',$2,$3,$3,$4,$5,$6,
       $7,$8,$9,$10,
       $11,$12,$13,$11,$14::jsonb
     ) returning id`,
    [
      code, hotelName, hotelLocation, groupCapacity, parseCapNumber(groupCapacity), banquetSpace === "Available",
      contactName, contactEmail, contactPhone || null, domain,
      nowIso, reviewBy, unsubToken,
      JSON.stringify({ idem: idem || null, ip_hash: ipHash }),
    ],
  );
  const partnerId = rows[0].id;

  await deps.db.query(
    `insert into partner_history (partner_id, at, actor, actor_label, to_state, memo) values ($1,$2,'system','시스템','pending','신청 접수')`,
    [partnerId, nowIso],
  );

  const { enqueueAndDispatch } = await import("../_shared/notify/enqueue_and_dispatch.ts");
  await enqueueAndDispatch(deps.db, deps.env, deps.now, "PTN_APPLIED", `PTN_APPLIED:${partnerId}`, {
    partner_id: partnerId, to_email: contactEmail, recipient_kind: "ptn",
  });

  return { partner_id: code, review_by: reviewBy };
}
