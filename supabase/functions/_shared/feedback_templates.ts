// 피드백 메일 2종(운영 알림/접수 확인) 템플릿. SPEC_FEEDBACK.md §3.9.
// _shared/notify/resend.ts 의 sendResend() 로 그대로 보낼 수 있는 {subject, html} 를 만든다.
// D7: 접수 확인 메일에는 유저가 쓴 본문을 넣지 않는다. S11: 값은 전부 HTML 이스케이프, textContent 로만 쓴다.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 제목에 들어가는 사용자 입력의 CR·LF·탭은 공백으로 치환한다.
export function sanitizeForSubject(s: string): string {
  return s.replace(/[\r\n\t]+/g, " ").trim();
}

export function formatKst(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute} KST`;
}

// FB-YYMMDD-XXXX 형식의 "가짜" 접수번호(허니팟 성공 응답용). DB 에 기록되지 않으므로 유일성 보장이 필요 없다.
const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function fakeRef(now: Date): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "2-digit", month: "2-digit", day: "2-digit" })
    .formatToParts(now).map((p) => p.value).join("").replace(/-/g, "");
  let suffix = "";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (let i = 0; i < 4; i++) suffix += REF_ALPHABET[bytes[i] & 31];
  return `FB-${day}-${suffix}`;
}

const CATEGORY_LABEL: Record<string, { ko: string; en: string }> = {
  SYS: { ko: "화면·기능 문제", en: "Site problem" },
  OPS: { ko: "견적·운영 문의", en: "Quotes & operations" },
  ETC: { ko: "기타", en: "Something else" },
};

const USER_TYPE_LABEL: Record<string, { ko: string; en: string }> = {
  travel_agency: { ko: "여행사 회원", en: "Agency member" },
  organizer_guest: { ko: "비회원 요청자", en: "Guest requester" },
  hotel: { ko: "호텔", en: "Hotel" },
  admin: { ko: "운영자", en: "Operator" },
  visitor: { ko: "방문자", en: "Visitor" },
};

export interface OpsAlertInput {
  id: string;
  ref: string;
  source: "widget" | "contact";
  category: "SYS" | "OPS" | "ETC";
  userType: string;
  content: string;
  replyEmail: string | null;
  contactName: string | null;
  isMember: boolean;
  createdAt: Date;
  lang: "ko" | "en";
  mode: string;
  pagePath: string;
  uiState: string | null;
  rfpRef: string | null;
  ua: string | null;
  viewport: string | null;
  tz: string | null;
  buildVersion: string | null;
  referrer: string | null;
  lastJsErrors: { t: string; m: string; s: string; l: string }[] | null;
  consoleBaseUrl: string;
}

export function buildOpsAlertMail(input: OpsAlertInput): { subject: string; html: string; text: string } {
  const preview = sanitizeForSubject(input.content).slice(0, 30);
  const catLabel = CATEGORY_LABEL[input.category]?.ko ?? input.category;
  const utLabel = USER_TYPE_LABEL[input.userType]?.ko ?? input.userType;
  const noReply = input.replyEmail ? "" : " · 회신 없음";

  let subject: string;
  if (input.source === "contact") {
    const who = sanitizeForSubject(input.contactName || input.replyEmail || "").slice(0, 30);
    subject = `[MICEGO 문의] ${input.ref} · ${who} · ${preview}…`;
  } else {
    subject = `[MICEGO 피드백] ${input.ref} · ${catLabel} · ${utLabel} · ${preview}…${noReply}`;
  }

  const rows: [string, string][] = [
    ["접수번호", input.ref],
    ["접수 시각(KST)", formatKst(input.createdAt)],
    ["유형", `${catLabel}${input.source === "contact" ? " · 문의" : ""}`],
    ["보낸 사람", input.isMember ? "로그인 확인됨" : utLabel],
    ["언어·모드", `${input.lang} · ${input.mode}`],
    ["회신 주소", input.replyEmail ? "메일함에서 이 메일에 그대로 답장하면 됩니다." : "남기지 않았습니다."],
  ];

  const screenRows: [string, string][] = [
    ["페이지", input.pagePath],
    ["화면 상태", input.uiState ?? "—"],
    ["요청번호", input.rfpRef ? `${input.rfpRef} (${input.consoleBaseUrl}/rfp.html?ref=${encodeURIComponent(input.rfpRef)})` : "—"],
    ["브라우저", input.ua ?? "—"],
    ["화면 크기·시간대", `${input.viewport ?? "—"} · ${input.tz ?? "—"}`],
    ["빌드", input.buildVersion ?? "—"],
    ["이전 페이지", input.referrer ?? "—"],
  ];

  const textLines: string[] = [];
  textLines.push("MICEGO 피드백이 접수되었습니다.");
  textLines.push("");
  for (const [k, v] of rows) textLines.push(`${k}: ${v}`);
  textLines.push("");
  textLines.push("── 내용 ──");
  textLines.push(input.content);
  textLines.push("");
  textLines.push("── 화면 정보 ──");
  for (const [k, v] of screenRows) textLines.push(`${k}: ${v}`);
  if (input.lastJsErrors && input.lastJsErrors.length) {
    textLines.push("");
    textLines.push("── 최근 오류 ──");
    for (const e of input.lastJsErrors) textLines.push(`${e.t} ${e.s} ${e.l} ${e.m}`.slice(0, 200));
  }
  textLines.push("");
  textLines.push(`콘솔: ${input.consoleBaseUrl}/feedback-detail.html?id=${input.id}`);
  textLines.push("제목의 접수번호를 지우지 말고 답장해 주세요.");
  const text = textLines.join("\n");

  const htmlRows = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#5B6788;">${escapeHtml(label)}</td><td style="padding:4px 0;color:#0F1E3D;font-weight:600;">${escapeHtml(value)}</td></tr>`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0F1E3D;">
    <p>MICEGO 피드백이 접수되었습니다.</p>
    <table role="presentation">${rows.map(([k, v]) => htmlRows(k, v)).join("")}</table>
    <p style="font-weight:700;margin-top:16px;">내용</p>
    <pre style="white-space:pre-wrap;font-family:inherit;background:#F6F8FB;padding:12px;border-radius:8px;">${escapeHtml(input.content)}</pre>
    <p style="font-weight:700;margin-top:16px;">화면 정보</p>
    <table role="presentation">${screenRows.map(([k, v]) => htmlRows(k, v)).join("")}</table>
    ${input.lastJsErrors && input.lastJsErrors.length
      ? `<p style="font-weight:700;margin-top:16px;">최근 오류</p><pre style="white-space:pre-wrap;font-family:monospace;font-size:12px;">${
          escapeHtml(input.lastJsErrors.map((e) => `${e.t} ${e.s} ${e.l} ${e.m}`.slice(0, 200)).join("\n"))
        }</pre>`
      : ""}
    <p style="margin-top:16px;"><a href="${escapeHtml(input.consoleBaseUrl)}/feedback-detail.html?id=${escapeHtml(input.id)}">콘솔에서 보기</a></p>
    <p style="color:#5B6788;font-size:12px;">제목의 접수번호를 지우지 말고 답장해 주세요.</p>
  </div>`;

  return { subject, html, text };
}

export interface AckMailInput {
  ref: string;
  category: "SYS" | "OPS" | "ETC";
  createdAt: Date;
  lang: "ko" | "en";
}

export function buildAckMail(input: AckMailInput): { subject: string; html: string; text: string } {
  const catLabel = CATEGORY_LABEL[input.category]?.[input.lang] ?? input.category;
  if (input.lang === "en") {
    const subject = `[MICEGO] We've received your feedback (${input.ref})`;
    const text = [
      "Thanks for sending feedback to MICEGO.",
      "",
      `Reference: ${input.ref}`,
      `Type: ${catLabel}`,
      `Received: ${formatKst(input.createdAt)}`,
      "",
      "If your message needs a reply, our team will respond to this address. To add details, just reply to this email and keep the reference in the subject line.",
      "",
      "If you didn't send this, you can ignore this email.",
      "",
      "The MICEGO team",
    ].join("\n");
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0F1E3D;">
      <p>Thanks for sending feedback to MICEGO.</p>
      <p>Reference: <b>${escapeHtml(input.ref)}</b><br>Type: ${escapeHtml(catLabel)}<br>Received: ${escapeHtml(formatKst(input.createdAt))}</p>
      <p>If your message needs a reply, our team will respond to this address. To add details, just reply to this email and keep the reference in the subject line.</p>
      <p style="color:#5B6788;font-size:12px;">If you didn't send this, you can ignore this email.</p>
      <p>The MICEGO team</p>
    </div>`;
    return { subject, html, text };
  }
  const subject = `[MICEGO] 보내 주신 의견을 접수했습니다 (${input.ref})`;
  const text = [
    "MICEGO에 의견을 보내 주셔서 감사합니다.",
    "",
    `접수번호: ${input.ref}`,
    `접수 유형: ${catLabel}`,
    `접수 시각: ${formatKst(input.createdAt)}`,
    "",
    "답변이 필요한 내용이면 담당자가 이 주소로 회신드립니다. 덧붙일 내용이 있으면 이 메일에 그대로 답장해 주세요. 제목의 접수번호는 지우지 말아 주세요.",
    "",
    "직접 보내신 적이 없다면 이 메일은 무시하셔도 됩니다.",
    "",
    "MICEGO 운영팀",
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0F1E3D;">
    <p>MICEGO에 의견을 보내 주셔서 감사합니다.</p>
    <p>접수번호: <b>${escapeHtml(input.ref)}</b><br>접수 유형: ${escapeHtml(catLabel)}<br>접수 시각: ${escapeHtml(formatKst(input.createdAt))}</p>
    <p>답변이 필요한 내용이면 담당자가 이 주소로 회신드립니다. 덧붙일 내용이 있으면 이 메일에 그대로 답장해 주세요. 제목의 접수번호는 지우지 말아 주세요.</p>
    <p style="color:#5B6788;font-size:12px;">직접 보내신 적이 없다면 이 메일은 무시하셔도 됩니다.</p>
    <p>MICEGO 운영팀</p>
  </div>`;
  return { subject, html, text };
}
