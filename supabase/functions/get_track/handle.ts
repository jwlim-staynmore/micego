// POST /get_track — anon. {token} (오거나이저 본인용, 전체 조회) 또는 {share} (보기 전용 공유 링크).
// SPEC_LAUNCH.md §3 "Track view model" 을 그대로 만든다.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { clientIp, hashIp } from "../_shared/http.ts";

interface RfpRow {
  id: string; ref: string; state: string; round: number; owner_id: string | null;
  event_type: string; start_date: string | null; end_date: string | null; headcount_band: string; region: string;
  twin_rooms: number; king_rooms: number; ballroom_use: boolean; ballroom_purpose: string | null;
  created_at: string; verifying_at: string | null; deadline: string | null; bidding_at: string | null;
  delivered_at: string | null; closed_at: string | null; close_reason: string | null; change_summary: string | null;
  contact_email: string; contact_phone: string; pick_otp: Record<string, unknown> | null;
  partner_org_id?: string | null; delegation?: string | null; // 0010_regional_partners
}

function nightsBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ip = clientIp(req);
  const ipHash = await hashIp(ip, deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "get_track_ip", ipHash, 60, 60); // 60/min/IP

  const tokenStr = asString(body.token);
  const shareStr = asString(body.share);
  const isShare = !tokenStr && !!shareStr;
  const rawToken = tokenStr || shareStr;
  if (!rawToken) throw new MGError("BAD_REQUEST");

  const kind = isShare ? "share" : "track";
  const trows = await deps.db.query<{ id: string; rfp_id: string; state: string; views: number }>(
    `select id, rfp_id, state, views from rfp_tokens where token=$1 and kind=$2`,
    [rawToken, kind],
  );
  if (!trows.length) {
    await rateLimit(deps.db, "get_track_miss_ip", ipHash, 20, 600); // 20 misses/10min/IP
    throw new MGError("TOKEN_INVALID");
  }
  const trow = trows[0];
  if (trow.state !== "active") throw new MGError("TOKEN_REVOKED");

  const rrows = await deps.db.query<RfpRow>(`select * from rfps where id=$1`, [trow.rfp_id]);
  if (!rrows.length) throw new MGError("TOKEN_INVALID");
  const r = rrows[0];

  if (isShare) {
    await deps.db.query(`update rfp_tokens set views = views + 1, last_viewed_at = $2 where id = $1`, [trow.id, deps.now().toISOString()]);
  }

  const stateRaw = r.state;
  const stateSlug = await deps.db.scalar<string>(`select private.track_slug($1, $2)`, [stateRaw, r.round]);
  const nights = nightsBetween(r.start_date, r.end_date);

  const view: Record<string, unknown> = {
    view: isShare ? "share" : "owner",
    ref: r.ref,
    state: stateSlug,
    state_raw: stateRaw,
    round: r.round,
    is_member_owned: !!r.owner_id,
    caller_is_owner: !isShare,
    dates: {
      received_at: r.created_at, verifying_at: r.verifying_at, bidding_at: r.bidding_at,
      deadline_at: r.deadline, delivered_at: r.delivered_at, closed_at: r.closed_at,
    },
    event: {
      event_type: r.event_type, start_date: r.start_date, end_date: r.end_date, nights,
      region: r.region, headcount_label: r.headcount_band, twin_rooms: r.twin_rooms, king_rooms: r.king_rooms,
      ballroom_use: r.ballroom_use, ballroom_purpose: r.ballroom_purpose,
    },
  };

  if (["rejected", "lost", "cancelled"].includes(stateRaw) && r.close_reason) view.reason = { text: r.close_reason };
  // 지역 운영 파트너 고지(결정 2026-09-27): 파트너가 위임받아 진행 중이면 오거나이저에게 파트너 이름을 보여 준다
  if (r.partner_org_id && r.delegation === "delegated") {
    const po = await deps.db.query<{ public_name: string; country_code: string }>(`select public_name, country_code from partner_org where id=$1`, [r.partner_org_id]);
    if (po.length) view.regional_partner = { name: po[0].public_name, country: po[0].country_code };
  }
  if (r.change_summary) view.change_summary = r.change_summary;

  const invCountRows = await deps.db.query<{ n: string }>(
    `select count(*) as n from invitations where rfp_id=$1 and round=$2 and status <> 'reinvited'`,
    [r.id, r.round],
  );
  view.hotels_invited = Number(invCountRows[0]?.n ?? 0);
  // 호텔에 아무것도 보내기 전까지만 직접 취소 가능(D-47). 판정 기준은 private.rfp_organizer_cancel 과 같다.
  view.can_cancel = !isShare && (["received", "verifying"].includes(stateRaw) || (stateRaw === "open" && view.hotels_invited === 0));

  // 제안 비교표 (전달됨/성사 상태에서만 의미 있음, delivered 이후 라벨이 매겨짐)
  const won = stateRaw === "won";
  const qrows = await deps.db.query<Record<string, unknown>>(
    `select q.*, i.result, p.name as hotel_name, p.profile as hotel_profile
     from quotes q join invitations i on i.id = q.invitation_id join partners p on p.id = i.partner_id
     where q.rfp_id=$1 and q.round=$2 and i.status in ('submitted','hotel_confirmed')
     order by q.label asc nulls last, q.submitted_at asc`,
    [r.id, r.round],
  );
  if (qrows.length && (stateRaw === "delivered" || won)) {
    let arrivalRank = 0;
    const fxRates: Record<string, number> = {};
    let fxDate: string | null = null;
    view.proposals = qrows.map((q) => {
      arrivalRank += 1;
      const twin = Number(q.twin_rate ?? 0);
      const king = Number(q.king_rate ?? 0);
      const taxExcluded = q.tax_included === false;
      const rate = Number(q.tax_rate_pct ?? 0);
      let est = (twin * r.twin_rooms + king * r.king_rooms) * (nights ?? 1) + Number(q.ballroom_fee ?? 0);
      if (taxExcluded && rate) est = est * (1 + rate / 100);
      const currency = String(q.currency ?? "");
      if (currency !== "USD" && q.usd_ref) {
        fxRates[currency] = Number(twin) && Number(q.usd_ref) ? Number((twin / Number(q.usd_ref)).toFixed(4)) : 0;
        fxDate = String(q.usd_date ?? fxDate ?? "");
      }
      // hotel_name 은 성사(won) 이후 선정된 제안에만 붙는다 (owner/share 뷰 공통).
      const isSelected = won && q.result === "selected";
      return {
        label: q.label, arrival_rank: arrivalRank, submitted_at: q.submitted_at,
        currency: q.currency, twin_rate: q.twin_rate, king_rate: q.king_rate, usd_ref: q.usd_ref, usd_date: q.usd_date,
        breakfast: { included: q.breakfast_included, supplement: q.breakfast_supplement },
        tax: { included: q.tax_included, note: q.tax_note, rate_pct: q.tax_rate_pct },
        availability: { all: q.availability_all, notes: q.availability_notes },
        ballroom: { name: q.ballroom_name, fee: q.ballroom_fee, fnb_min: q.fnb_minimum, includes: q.ballroom_includes },
        valid_until: q.valid_until, cancellation: q.cancellation, extra: q.additional_proposals,
        profile: q.hotel_profile ?? {}, memo: q.op_memo, est_total: Math.round(est),
        ...(isSelected ? { hotel_name: q.hotel_name } : {}),
      };
    });
    if (Object.keys(fxRates).length) view.fx = { date: fxDate, rates: fxRates };
  }

  if (won) {
    const srows = await deps.db.query<{ label: string; hotel_name: string; connected_at: string }>(
      `select q.label, p.name as hotel_name, s.connected_at
       from selections s join quotes q on q.id = s.quote_id join invitations i on i.id = s.invitation_id join partners p on p.id = i.partner_id
       where s.rfp_id = $1`,
      [r.id],
    );
    if (srows.length) view.selection = srows[0];
  }

  if (!isShare) {
    if (r.state === "delivered" && r.pick_otp) {
      const pk = r.pick_otp;
      if (pk) view.pick = { phone_masked: pk.phone_masked, locked_until: pk.locked_until ?? undefined };
    }
    const shrows = await deps.db.query<{ token: string; state: string; created_at: string }>(
      `select token, state, created_at from rfp_tokens where rfp_id=$1 and kind='share' and state='active' limit 1`,
      [r.id],
    );
    view.share = shrows.length ? { state: shrows[0].state, url: `${deps.env.SITE_BASE_URL ?? ""}/ko/track.html?s=${shrows[0].token}` } : null;
  }

  return view;
}
