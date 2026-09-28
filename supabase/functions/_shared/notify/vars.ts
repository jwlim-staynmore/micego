// notification_log 행(비동기 발송 대상) + 관련 DB 행으로부터 전체 변수 세트를 만든다.
// OTP/재설정 계열(ACC_EMAIL_CODE, ACC_SMS_OTP, ACC_PW_RESET, ORG_PICK_OTP, ACC_EMAIL_EXISTS)은
// 호출 함수가 인라인으로 직접 vars 를 넘기므로 여기서는 다루지 않는다 (SPEC_LAUNCH.md §4).
import type { DbClient } from "../deps.ts";

function fmtKstDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}(${g("weekday")}) ${g("hour")}:${g("minute")}`;
}

export async function buildVars(db: DbClient, base: string, log: Record<string, unknown>): Promise<Record<string, unknown>> {
  const vars: Record<string, unknown> = { ...(log.vars as Record<string, unknown> ?? {}) };
  vars.SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") ?? "support@micego.example";
  // 지역 파트너 콘솔: 대리 입력 견적 확인 링크(1회용 토큰은 enqueue 시 vars 로 전달) · 콘솔 알림 링크
  if (typeof vars.CONFIRM_TOKEN === "string" && vars.CONFIRM_TOKEN) { vars.CONFIRM_URL = `${base}/en/confirm.html?t=${vars.CONFIRM_TOKEN}`; delete vars.CONFIRM_TOKEN; }
  if (typeof vars.CONSOLE_PATH === "string" && vars.CONSOLE_PATH) vars.CONSOLE_URL = `${base}${vars.CONSOLE_PATH}`;
  if (!("EXPIRES_HOURS" in vars)) vars.EXPIRES_HOURS = 72;
  if (!("PARTNER_PUBLIC_NAME" in vars)) vars.PARTNER_PUBLIC_NAME = "MICEGO";
  vars.FROM_ADDRESS = Deno.env.get("FROM_ADDRESS") ?? "notify@micego.example";

  if (log.rfp_id) {
    const rows = await db.query<Record<string, unknown>>(
      `select r.*, (select token from rfp_tokens t where t.rfp_id=r.id and t.kind='track' and t.state='active' limit 1) as track_token
       from rfps r where r.id=$1`,
      [log.rfp_id],
    );
    if (rows.length) {
      const r = rows[0];
      vars.RFP_ID = r.ref;
      vars.DESTINATION = r.destination ?? r.region;
      vars.EVENT_TYPE = r.event_type;
      vars.PAX = r.headcount_band;
      vars.ORG_CONTACT_NAME = r.contact_name;
      vars.ORG_COMPANY = r.company;
      vars.ORG_EMAIL = r.contact_email;
      vars.ORG_PHONE = r.contact_phone;
      vars.ORG_CONTACT_FULL = `${r.contact_name ?? ""} (${r.contact_email ?? ""})`;
      vars.RECEIVED_AT = fmtKstDateTime(r.created_at as string);
      vars.EVENT_DATES = r.start_date && r.end_date ? `${r.start_date} ~ ${r.end_date}` : "";
      vars.TRACK_TOKEN = r.track_token ?? "";
      vars.TRACK_URL = r.track_token ? `${base}/ko/track.html?t=${r.track_token}` : "";
      vars.ROUND = vars.ROUND ?? r.round;
      if (!("REJECT_REASON" in vars)) vars.REJECT_REASON = r.close_reason ?? "";
      if (!("LOST_REASON" in vars)) vars.LOST_REASON = r.close_reason ?? "";
      if (!("CHANGE_SUMMARY" in vars)) vars.CHANGE_SUMMARY = r.change_summary ?? "";
      vars.CANCELLED_AT = fmtKstDateTime(r.closed_at as string);
      // 지역 운영 파트너 고지(결정 2026-09-27): 위임 건이면 오거나이저 메일에 REGIONAL_PARTNER 블록을 켠다
      if (r.partner_org_id && r.delegation === "delegated") {
        const po = await db.query<{ public_name: string }>(`select public_name from partner_org where id=$1`, [r.partner_org_id]);
        if (po.length) { vars.PARTNER_PUBLIC_NAME = po[0].public_name; vars.__block_REGIONAL_PARTNER = true; }
      }
    }
  }

  if (log.invitation_id) {
    const rows = await db.query<Record<string, unknown>>(
      `select i.*, q.label, p.name as hotel_name, p.contact_name as hotel_contact_name, p.contact_email as hotel_contact_email
       from invitations i left join quotes q on q.invitation_id=i.id left join partners p on p.id=i.partner_id where i.id=$1`,
      [log.invitation_id],
    );
    if (rows.length) {
      const i = rows[0];
      vars.HOTEL_BID_URL = `${base}/en/bid.html?t=${i.token}`;
      vars.HOTEL_NAME = i.hotel_name ?? "";
      vars.HOTEL_CONTACT_NAME = i.hotel_contact_name ?? "";
      vars.HOTEL_CONTACT_EMAIL = i.hotel_contact_email ?? "";
      vars.SELECTED_HOTEL = i.hotel_name ?? "";
      vars.PROPERTY_NAME = i.hotel_name ?? "";
      if (i.deadline) vars.DEADLINE_KST = fmtKstDateTime(i.deadline as string);
    }
  }

  if (log.partner_id) {
    const rows = await db.query<Record<string, unknown>>(`select * from partners where id=$1`, [log.partner_id]);
    if (rows.length) {
      const p = rows[0];
      vars.PARTNER_ID = p.code;
      vars.PROPERTY_NAME = vars.PROPERTY_NAME ?? p.name;
      vars.PROPERTY_LOCATION = p.location ?? "";
      vars.APPLICANT_NAME = p.contact_name ?? "";
      vars.APPLIED_AT = fmtKstDateTime(p.applied_at as string);
      vars.REVIEW_BY = fmtKstDateTime(p.review_due_at as string);
      vars.UNSUBSCRIBE_URL = `${base}/en/unsubscribe.html?t=${p.unsubscribe_token}`;
      if (!("PTN_REJECT_REASON" in vars)) vars.PTN_REJECT_REASON = "";
    }
  }

  if (log.member_id) {
    const rows = await db.query<Record<string, unknown>>(`select * from members where id=$1`, [log.member_id]);
    if (rows.length) {
      const m = rows[0];
      vars.TO_NAME = m.name ?? "";
      vars.CONTACT_NAME = m.name ?? "";
      vars.MEMBER_EMAIL = m.email ?? "";
      vars.MY_URL = `${base}/ko/my.html`;
      vars.LOGIN_URL = `${base}/ko/login.html`;
      vars.LOCKED_AT = fmtKstDateTime(m.locked_at as string);
      vars.WITHDRAWN_AT = fmtKstDateTime(m.withdrawn_at as string);
      vars.CHANGED_AT = fmtKstDateTime((m.updated_at as string) ?? (m.created_at as string));
    }
  }

  vars.RFP_REFS = vars.RFP_REFS ?? "";
  vars.LINKED_COUNT = vars.LINKED_COUNT ?? 0;
  vars.PREV_DEADLINE = vars.PREV_DEADLINE ? fmtKstDateTime(String(vars.PREV_DEADLINE)) : "";
  return vars;
}
