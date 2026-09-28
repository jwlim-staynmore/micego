// POST /submit_rfp — anon (선택적으로 회원 JWT). ko/index.html #registerForm 의 validate() 를 서버에서 그대로 재현한다.
// SPEC_LAUNCH.md §3 표의 submit_rfp 행.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { FieldErrors, RE_EMAIL, RE_PHONE_KR, asString, asBool, isIsoDate, normalizePhone } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { randomToken } from "../_shared/tokens.ts";
import { clientIp, hashIp } from "../_shared/http.ts";
import { bearerToken } from "../_shared/auth_ctx.ts";

const HEADCOUNT_BANDS = ["50명 미만", "50~100명", "100~300명", "300~500명", "500명 이상"];
const BALLROOM_USE = ["사용", "미사용"];
const BALLROOM_PURPOSE = ["디너", "Full Day", "Half Day", "기타"];
const ORG_TYPES = ["여행사", "기업(인하우스)", "기타"];

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const ip = clientIp(req);
  const ipHash = await hashIp(ip, deps.env.IP_HASH_SALT ?? "");

  await rateLimit(deps.db, "submit_rfp_ip", ipHash, 5, 600); // 5/10min/IP

  const orgType = asString(body.orgType);
  const company = asString(body.company).trim();
  const name = asString(body.name).trim();
  const email = asString(body.email).trim().toLowerCase();
  const phoneRaw = asString(body.phone).trim();
  const eventType = asString(body.eventType);
  const startDate = asString(body.startDate);
  const endDate = asString(body.endDate);
  const headcount = asString(body.headcount);
  const region = asString(body.region).trim();
  const twinRooms = body.twinRooms;
  const kingRooms = body.kingRooms;
  const ballroomUse = asString(body.ballroomUse);
  const ballroomPurpose = asString(body.ballroomPurpose);
  const note = asString(body.note);
  const consent = asBool(body.consent);
  const idem = asString(body.idem);
  const lang = asString(body.lang) === "en" ? "en" : "ko";

  const fe = new FieldErrors();
  fe.check("orgType", ORG_TYPES.includes(orgType));
  fe.check("company", company.length >= 1);
  fe.check("name", name.length >= 2);
  fe.check("email", RE_EMAIL.test(email));
  const phoneNorm = phoneRaw.replace(/\s+/g, "");
  fe.check("phone", RE_PHONE_KR.test(phoneNorm));
  fe.check("eventType", !!eventType);
  fe.check("startDate", isIsoDate(startDate));
  if (isIsoDate(startDate)) {
    const todayKst = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(deps.now());
    fe.check("startDate", startDate >= todayKst, "past");
  }
  if (endDate) fe.check("endDate", isIsoDate(endDate) && endDate >= startDate, "before_start");
  fe.check("headcount", HEADCOUNT_BANDS.includes(headcount));
  fe.check("region", region.length >= 1);
  const twinN = Number(twinRooms);
  fe.check("twinRooms", twinRooms !== undefined && twinRooms !== null && String(twinRooms).trim() !== "" && twinN >= 0 && isFinite(twinN));
  const kingN = Number(kingRooms);
  fe.check("kingRooms", kingRooms !== undefined && kingRooms !== null && String(kingRooms).trim() !== "" && kingN >= 0 && isFinite(kingN));
  fe.check("ballroomUse", BALLROOM_USE.includes(ballroomUse));
  if (ballroomUse === "사용") fe.check("ballroomPurpose", BALLROOM_PURPOSE.includes(ballroomPurpose));
  fe.check("consent", consent === true);
  fe.throwIfAny();

  await rateLimit(deps.db, "submit_rfp_email", email, 20, 86400); // 20/day/email

  // idem 재요청은 동일 응답을 돌려준다.
  if (idem) {
    const existing = await deps.db.query<{ ref: string; created_at: string; id: string }>(
      `select id, ref, created_at from rfps where source->>'idem' = $1 order by created_at desc limit 1`,
      [idem],
    );
    if (existing.length) {
      const trk = await deps.db.query<{ token: string }>(`select token from rfp_tokens where rfp_id=$1 and kind='track' and state='active' limit 1`, [existing[0].id]);
      return {
        ref: existing[0].ref,
        track_token: trk[0]?.token ?? null,
        track_url: trk[0] ? `${deps.env.SITE_BASE_URL ?? ""}/${lang}/track.html?t=${trk[0].token}` : null,
        received_at: existing[0].created_at,
      };
    }
  }

  // 활성 회원 JWT 가 있으면 owner_id 설정 + 프로필에서 연락처를 채운다.
  let ownerId: string | null = null;
  let ownerContact: { name: string; company: string; email: string; phone: string } | null = null;
  const token = bearerToken(req);
  if (token) {
    const user = await deps.authAdmin.getUser(token);
    if (user) {
      const rows = await deps.db.query<{ id: string; state: string; name: string; company: string; email: string; phone: string }>(
        `select id, state, name, company, email, phone from members where id=$1`,
        [user.id],
      );
      if (rows.length && rows[0].state === "active") {
        ownerId = rows[0].id;
        ownerContact = { name: rows[0].name, company: rows[0].company, email: rows[0].email, phone: rows[0].phone };
      }
    }
  }

  const ref = await deps.db.scalar<string>(`select private.next_ref('MG')`);
  const nowIso = deps.now().toISOString();
  const finalPhone = ownerContact?.phone ?? phoneNorm;

  const rows = await deps.db.query<{ id: string; created_at: string }>(
    `insert into rfps (
       ref, state, owner_id, org_type, company, contact_name, contact_email, contact_phone,
       event_type, start_date, end_date, headcount_band, region, twin_rooms, king_rooms,
       ballroom_use, ballroom_purpose, note, consent_at, source
     ) values (
       $1,'received',$2,$3,$4,$5,$6,$7,
       $8,$9,nullif($10,'')::date,$11,$12,$13,$14,
       $15,$16,$17,$18,$19::jsonb
     ) returning id, created_at`,
    [
      ref, ownerId, orgType, ownerContact?.company ?? company, ownerContact?.name ?? name, ownerContact?.email ?? email, finalPhone,
      eventType, startDate, endDate, headcount, region, twinN, kingN,
      ballroomUse === "사용", ballroomUse === "사용" ? ballroomPurpose : null, note, nowIso,
      JSON.stringify({ idem: idem || null, ip_hash: ipHash, lang }),
    ],
  );
  const rfpId = rows[0].id;

  const trackToken = randomToken(deps.rand, 24);
  await deps.db.query(
    `insert into rfp_tokens (rfp_id, kind, token, state, created_by) values ($1,'track',$2,'active',$3)`,
    [rfpId, trackToken, ownerId],
  );

  await deps.db.query(
    `insert into rfp_history (rfp_id, at, actor, actor_label, from_state, to_state, memo) values ($1,$2,$3,$4,null,'received',$5)`,
    [rfpId, nowIso, ownerId ? "organizer" : "organizer", ownerId ? "오거나이저(회원)" : "오거나이저", "접수 폼 제출"],
  );

  const { enqueueAndDispatch } = await import("../_shared/notify/enqueue_and_dispatch.ts");
  await enqueueAndDispatch(deps.db, deps.env, deps.now, "ORG_RECEIVED", `ORG_RECEIVED:${rfpId}`, {
    rfp_id: rfpId, to_email: ownerContact?.email ?? email, to_phone: finalPhone, recipient_kind: "org",
  });

  return {
    ref,
    track_token: trackToken,
    track_url: `${deps.env.SITE_BASE_URL ?? ""}/${lang}/track.html?t=${trackToken}`,
    received_at: rows[0].created_at,
  };
}
