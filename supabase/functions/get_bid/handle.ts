// POST /get_bid — anon. {token} → bid view model. SPEC_LAUNCH.md §3 "Bid view model".
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { clientIp, hashIp } from "../_shared/http.ts";

function nightsBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

function quoteToJson(q: Record<string, unknown>) {
  return {
    currency: q.currency, twinRate: q.twin_rate, kingRate: q.king_rate,
    breakfast: q.breakfast_included ? "included" : "not_included", breakfastSupplement: q.breakfast_supplement,
    tax: q.tax_included ? "included" : "not_included", taxNote: q.tax_note,
    availability: q.availability_all ? "all" : "partial", availabilityNotes: q.availability_notes,
    ballroomFee: q.ballroom_fee, ballroomName: q.ballroom_name, fnbMinimum: q.fnb_minimum, ballroomIncludes: q.ballroom_includes,
    validUntil: q.valid_until, cancellation: q.cancellation, additionalProposals: q.additional_proposals,
    hotelName: q.hotel_name, contactName: q.contact_name, contactEmail: q.contact_email, contactPhone: q.contact_phone,
    submitted_at: q.submitted_at, revision: q.revision,
  };
}

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ip = clientIp(req);
  const ipHash = await hashIp(ip, deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "get_bid_ip", ipHash, 60, 60);

  const token = asString(body.token);
  if (!token) throw new MGError("BAD_REQUEST");

  const irows = await deps.db.query<Record<string, unknown>>(`select * from invitations where token=$1`, [token]);
  if (!irows.length) {
    await rateLimit(deps.db, "get_bid_miss_ip", ipHash, 20, 600);
    throw new MGError("TOKEN_INVALID");
  }
  const inv = irows[0];

  const rrows = await deps.db.query<Record<string, unknown>>(`select * from rfps where id=$1`, [inv.rfp_id]);
  if (!rrows.length) throw new MGError("TOKEN_INVALID");
  const r = rrows[0];

  const prows = await deps.db.query<Record<string, unknown>>(`select * from partners where id=$1`, [inv.partner_id]);
  const p = prows[0];

  if (inv.status === "invited" && !inv.viewed_at) {
    await deps.db.query(`update invitations set status='viewed', viewed_at=$2 where id=$1`, [inv.id, deps.now().toISOString()]);
    inv.status = "viewed";
  }

  // 상태 판정 (SPEC_LAUNCH.md §3 "State derivation, first match wins")
  let state: string;
  if (r.state === "cancelled") state = "cancelled";
  else if (inv.status === "reinvited" || inv.status === "expired") state = "expired";
  else if (inv.status === "declined") state = "declined";
  else if (r.state === "won" && inv.result === "selected") state = "selected";
  else if (r.state === "won" && (inv.status === "submitted" || inv.status === "hotel_confirmed")) state = "not_selected";
  else if (inv.status === "submitted" || inv.status === "hotel_confirmed") state = "submitted";
  else state = "open"; // proxy_entered / proxy_disputed / proxy_expired: 호텔 입장에서는 직접 제출 가능

  const deadline = (inv.deadline ?? r.deadline) as string | null;
  const canRevise = (state === "open" || state === "submitted") && !!deadline && new Date(deadline).getTime() > deps.now().getTime();
  const minValidUntil = deadline ? await deps.db.scalar<string>(`select private.due($1, 2)::date`, [deadline]) : null;

  const qrows = await deps.db.query<Record<string, unknown>>(`select * from quotes where invitation_id=$1`, [inv.id]);

  let prevDeadline: string | null = null;
  if (inv.reinvited_from) {
    const prev = await deps.db.query<{ deadline: string | null }>(`select deadline from invitations where id=$1`, [inv.reinvited_from]);
    prevDeadline = prev[0]?.deadline ?? null;
  }

  const view: Record<string, unknown> = {
    ref: r.ref, state, can_revise: canRevise, round: inv.round,
    deadline_at: deadline, min_valid_until: minValidUntil,
    request: {
      destination: r.destination ?? r.region, event_type: r.event_type, start_date: r.start_date, end_date: r.end_date,
      nights: nightsBetween(r.start_date as string | null, r.end_date as string | null),
      headcount_label: r.headcount_band, twin_rooms: r.twin_rooms, king_rooms: r.king_rooms,
      ballroom: { use: r.ballroom_use, purpose: r.ballroom_purpose },
      public_memo: r.public_memo,
      ...(prevDeadline ? { prev_deadline: prevDeadline } : {}),
      ...(r.change_summary ? { change_summary: r.change_summary } : {}),
    },
    hotel: { name: p?.name, contact_name: p?.contact_name, contact_email: p?.contact_email, contact_phone: p?.contact_phone },
  };
  if (qrows.length) view.quote = quoteToJson(qrows[0]);
  if (["proxy_entered", "hotel_confirmed", "proxy_disputed", "proxy_expired"].includes(String(inv.status)) || (qrows[0] && qrows[0].entered_by === "partner")) {
    view.proxy = { status: qrows[0]?.confirmed_at ? "hotel_confirmed" : inv.status, entered_by: "partner", confirmed_at: qrows[0]?.confirmed_at ?? null };
  }
  // 호텔 합의 요율(초대 시점 스냅샷). 호텔 전용 화면에만 내려가며 요청자 응답에는 없다.
  view.commission = inv.commission_rate_pct != null ? { rate_pct: Number(inv.commission_rate_pct), basis: inv.commission_basis_scope ?? "rooms_fnb_net" } : null;
  if (state === "selected") {
    view.organizer = { company: r.company, contact_name: r.contact_name, email: r.contact_email, phone: r.contact_phone };
  }

  return view;
}
