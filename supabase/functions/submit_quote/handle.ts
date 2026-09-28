// POST /submit_quote — anon (bid 토큰). en/bid.html #bidForm 의 validate() 를 서버에서 재현한다.
// SPEC_LAUNCH.md §3.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { FieldErrors, RE_EMAIL, asString, asBool, isIsoDate } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";

function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const token = asString(body.token);
  if (!token) throw new MGError("BAD_REQUEST");

  await rateLimit(deps.db, "submit_quote_token", token, 30, 3600); // 30/h/token

  const irows = await deps.db.query<Record<string, unknown>>(`select * from invitations where token=$1`, [token]);
  if (!irows.length) throw new MGError("TOKEN_INVALID");
  const inv = irows[0];
  const rrows = await deps.db.query<Record<string, unknown>>(`select * from rfps where id=$1`, [inv.rfp_id]);
  if (!rrows.length) throw new MGError("TOKEN_INVALID");
  const r = rrows[0];

  // proxy_*: 파트너가 대리 입력한 상태. 호텔이 직접 제출하면 '호텔 직접 제출'로 전환된다(0013 quote_mark_hotel_submitted).
  if (!["invited", "viewed", "submitted", "proxy_entered", "hotel_confirmed", "proxy_disputed", "proxy_expired"].includes(String(inv.status))) throw new MGError("STATE_CONFLICT");
  // 취합(collecting) 까지만 제안 제출/수정이 가능하다. delivered 이후는 라벨(A/B/C)이 이미 매겨져 있어 수정이 막힌다.
  if (!["open", "bidding", "collecting"].includes(String(r.state))) throw new MGError("STATE_CONFLICT");
  const deadline = (inv.deadline ?? r.deadline) as string | null;
  if (deadline && new Date(deadline).getTime() <= deps.now().getTime()) throw new MGError("DEADLINE_PASSED");

  const currency = asString(body.currency).toUpperCase();
  const twinRate = numOrNull(body.twinRate);
  const kingRate = numOrNull(body.kingRate);
  const breakfast = asString(body.breakfast);
  const breakfastSupplement = numOrNull(body.breakfastSupplement);
  const tax = asString(body.tax);
  const taxNote = asString(body.taxNote).trim();
  const availability = asString(body.availability);
  const availabilityNotes = asString(body.availabilityNotes);
  const ballroomFee = numOrNull(body.ballroomFee);
  const ballroomName = asString(body.ballroomName).trim();
  const fnbMinimum = numOrNull(body.fnbMinimum);
  const ballroomIncludes = asString(body.ballroomIncludes);
  const validUntil = asString(body.validUntil);
  const cancellation = asString(body.cancellation).trim();
  const additionalProposals = asString(body.additionalProposals);
  const hotelName = asString(body.hotelName).trim();
  const contactName = asString(body.contactName).trim();
  const contactEmail = asString(body.contactEmail).trim().toLowerCase();
  const contactPhone = asString(body.contactPhone).trim();
  const consent = asBool(body.consent);

  const minValidUntil = deadline ? await deps.db.scalar<string>(`select private.due($1, 2)::date`, [deadline]) : null;

  const fe = new FieldErrors();
  fe.check("currency", /^[A-Z]{3}$/.test(currency));
  fe.check("twinRate", twinRate !== null && twinRate >= 0);
  fe.check("kingRate", kingRate !== null && kingRate >= 0);
  fe.check("breakfast", breakfast === "included" || breakfast === "not_included");
  fe.check("tax", tax === "included" || tax === "not_included");
  if (tax === "not_included") fe.check("taxNote", taxNote.length >= 3);
  fe.check("availability", availability === "all" || availability === "partial");
  fe.check("ballroomFee", ballroomFee !== null && ballroomFee >= 0);
  fe.check("ballroomName", ballroomName.length >= 1);
  fe.check("validUntil", isIsoDate(validUntil) && (!minValidUntil || validUntil >= minValidUntil));
  fe.check("cancellation", cancellation.length >= 5);
  fe.check("hotelName", hotelName.length >= 1);
  fe.check("contactName", contactName.length >= 1);
  fe.check("contactEmail", RE_EMAIL.test(contactEmail));
  fe.check("consent", consent === true);
  fe.throwIfAny();

  const nowIso = deps.now().toISOString();
  const existingQ = await deps.db.query<{ id: string; revision: number }>(`select id, revision from quotes where invitation_id=$1`, [inv.id]);
  const isRevision = existingQ.length > 0;
  const revision = isRevision ? existingQ[0].revision + 1 : 1;

  const payload = {
    currency, twin_rate: twinRate, king_rate: kingRate,
    breakfast_included: breakfast === "included", breakfast_supplement: breakfastSupplement,
    tax_included: tax === "included", tax_note: tax === "not_included" ? taxNote : null,
    availability_all: availability === "all", availability_notes: availabilityNotes || null,
    ballroom_fee: ballroomFee, ballroom_name: ballroomName, fnb_minimum: fnbMinimum, ballroom_includes: ballroomIncludes || null,
    valid_until: validUntil, cancellation, additional_proposals: additionalProposals || null,
    hotel_name: hotelName, contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone || null,
  };

  let quoteId: string;
  if (isRevision) {
    quoteId = existingQ[0].id;
    await deps.db.query(
      `update quotes set currency=$2, twin_rate=$3, king_rate=$4, breakfast_included=$5, breakfast_supplement=$6,
         tax_included=$7, tax_note=$8, availability_all=$9, availability_notes=$10, ballroom_fee=$11, ballroom_name=$12,
         fnb_minimum=$13, ballroom_includes=$14, valid_until=$15, cancellation=$16, additional_proposals=$17,
         hotel_name=$18, contact_name=$19, contact_email=$20, contact_phone=$21, revision=$22, submitted_at=$23, updated_at=$23
       where id=$1`,
      [quoteId, currency, twinRate, kingRate, payload.breakfast_included, breakfastSupplement,
        payload.tax_included, payload.tax_note, payload.availability_all, payload.availability_notes, ballroomFee, ballroomName,
        fnbMinimum, payload.ballroom_includes, validUntil, cancellation, payload.additional_proposals,
        hotelName, contactName, contactEmail, payload.contact_phone, revision, nowIso],
    );
  } else {
    const ins = await deps.db.query<{ id: string }>(
      `insert into quotes (
         invitation_id, rfp_id, round, currency, twin_rate, king_rate, breakfast_included, breakfast_supplement,
         tax_included, tax_note, availability_all, availability_notes, ballroom_fee, ballroom_name, fnb_minimum, ballroom_includes,
         valid_until, cancellation, additional_proposals, hotel_name, contact_name, contact_email, contact_phone, revision, submitted_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,
         $9,$10,$11,$12,$13,$14,$15,$16,
         $17,$18,$19,$20,$21,$22,$23,1,$24
       ) returning id`,
      [inv.id, inv.rfp_id, inv.round, currency, twinRate, kingRate, payload.breakfast_included, breakfastSupplement,
        payload.tax_included, payload.tax_note, payload.availability_all, payload.availability_notes, ballroomFee, ballroomName, fnbMinimum, payload.ballroom_includes,
        validUntil, cancellation, payload.additional_proposals, hotelName, contactName, contactEmail, payload.contact_phone, nowIso],
    );
    quoteId = ins[0].id;
  }

  await deps.db.query(
    `insert into quote_revisions (quote_id, revision, payload, submitted_at) values ($1,$2,$3::jsonb,$4)`,
    [quoteId, revision, JSON.stringify(body), nowIso],
  );

  await deps.db.query(`select private.quote_mark_hotel_submitted($1)`, [inv.id]);
  await deps.db.query(`update invitations set status='submitted', submitted_at=coalesce(submitted_at,$2) where id=$1`, [inv.id, nowIso]);

  await deps.db.query(
    `insert into rfp_history (rfp_id, at, actor, actor_label, memo) values ($1,$2,'hotel','호텔',$3)`,
    [inv.rfp_id, nowIso, `${hotelName} 제안 ${isRevision ? "수정" : "제출"} (rev.${revision})`],
  );

  const rp = await deps.db.query<{ contact_email: string; contact_phone: string; name: string }>(`select contact_email, contact_phone, name from partners where id=$1`, [inv.partner_id]);
  await deps.db.query(
    `select private.enqueue('HTL_QUOTE_RECEIVED', $1, $2::jsonb, $3::jsonb, $4)`,
    [
      `HTL_QUOTE_RECEIVED:${inv.id}:${revision}`,
      JSON.stringify({ rfp_id: inv.rfp_id, partner_id: inv.partner_id, invitation_id: inv.id, to_email: rp[0]?.contact_email, recipient_kind: "htl" }),
      JSON.stringify({ REVISION: revision }),
      nowIso,
    ],
  );

  return { submitted_at: nowIso, revision };
}
