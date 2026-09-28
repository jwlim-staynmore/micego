// 피드백 요청 검증·정규화. SPEC_FEEDBACK.md §3.6 필드 검증 표를 그대로 구현한다.
// 위젯(4.6)의 클라이언트 검증과 정확히 같은 규칙이어야 한다 — 규칙을 바꿀 때는 assets/feedback.js (WP-F2) 도 맞춰야 한다.

export type FieldError = { name: string; code: string };

const RE_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const RE_EMAIL_FB = /^[^\s@,;<>"]{1,64}@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
const RE_PAGE_PATH = /^\/[A-Za-z0-9/_\-.]{0,199}$/;
const RE_UI_STATE = /^(preview:)?[a-z0-9_]{1,32}$/;
const RE_RFP_REF = /^MG-\d{4}-\d{3,4}$/;
const RE_TOKEN_HASH8 = /^[0-9a-f]{8}$/;
const RE_VIEWPORT = /^[0-9]{2,5}x[0-9]{2,5}@[0-9.]{1,4}$/;

const CATEGORIES = ["SYS", "OPS", "ETC"] as const;
const SOURCES = ["widget", "contact"] as const;
const MODES = ["agency", "hotel", "admin", "root"] as const;
const LANGS = ["ko", "en"] as const;
const TOKEN_KINDS = ["track", "share", "bid"] as const;

export function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// content: NFC → CRLF→LF → \n·\t 외 제어문자 제거 → trim
export function normalizeContent(raw: string): string {
  let s = raw.normalize("NFC");
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // deno-lint-ignore no-control-regex
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return s.trim();
}

export function charLen(s: string): number {
  return Array.from(s).length;
}

// [?&](t|s|token|access_token)=<값> → [token]; JWT 패턴 → [jwt]
export function maskSecrets(raw: string): string {
  let s = raw.replace(/([?&](?:t|s|token|access_token)=)[A-Za-z0-9._~-]{8,}/g, "$1[token]");
  s = s.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[jwt]");
  return s;
}

// 오류 메시지 재마스킹: maskSecrets + 이메일→[email] + 9자리 이상 숫자→[num], 500자 절단.
export function sanitizeErrorMessage(raw: string): string {
  let s = maskSecrets(raw);
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]");
  s = s.replace(/\d{9,}/g, "[num]");
  return s.slice(0, 500);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) : s;
}

export interface SanitizedCtx {
  page_path: string;
  mode: (typeof MODES)[number];
  lang: (typeof LANGS)[number];
  ui_state: string | null;
  rfp_ref: string | null;
  token_kind: (typeof TOKEN_KINDS)[number] | null;
  token_hash8: string | null;
  viewport: string | null;
  ua: string | null;
  referrer: string | null;
  last_js_errors: { t: string; m: string; s: string; l: string }[] | null;
  tz: string | null;
  build_version: string | null;
  submitted_at: string | null;
}

export interface SanitizedSubmission {
  client_submission_id: string;
  source: (typeof SOURCES)[number];
  category: (typeof CATEGORIES)[number];
  content: string;
  reply_email: string | null;
  reply_consent: boolean;
  contact_name: string | null;
  hp: string;
  dwell_ms: number;
  authAccessToken: string | null;
  ctx: SanitizedCtx;
  isDemoHint: boolean;
  userTypeHint: string | null;
}

function sanitizeCtx(raw: unknown, errors: FieldError[]): SanitizedCtx {
  const c = (raw && typeof raw === "object" ? raw as Record<string, unknown> : {}) as Record<string, unknown>;

  let pagePath = asStr(c.page_path);
  pagePath = pagePath.split("?")[0].split("#")[0];
  pagePath = truncate(pagePath, 200);
  if (!RE_PAGE_PATH.test(pagePath)) errors.push({ name: "ctx.page_path", code: "ctx_invalid" });

  const modeRaw = asStr(c.mode);
  if (!(MODES as readonly string[]).includes(modeRaw)) errors.push({ name: "ctx.mode", code: "ctx_invalid" });
  const mode = (MODES as readonly string[]).includes(modeRaw) ? (modeRaw as SanitizedCtx["mode"]) : "root";

  const langRaw = asStr(c.lang);
  if (!(LANGS as readonly string[]).includes(langRaw)) errors.push({ name: "ctx.lang", code: "ctx_invalid" });
  const lang = (LANGS as readonly string[]).includes(langRaw) ? (langRaw as SanitizedCtx["lang"]) : "ko";

  const uiStateRaw = asStr(c.ui_state);
  const uiState = RE_UI_STATE.test(uiStateRaw) ? uiStateRaw : null;

  const rfpRefRaw = asStr(c.rfp_ref);
  const rfpRef = RE_RFP_REF.test(rfpRefRaw) ? rfpRefRaw : null;

  let tokenKind = asStr(c.token_kind);
  let tokenHash8 = asStr(c.token_hash8);
  const kindOk = (TOKEN_KINDS as readonly string[]).includes(tokenKind);
  const hashOk = RE_TOKEN_HASH8.test(tokenHash8);
  if (!(kindOk && hashOk)) {
    tokenKind = "";
    tokenHash8 = "";
  }

  const viewportRaw = asStr(c.viewport);
  const viewport = RE_VIEWPORT.test(viewportRaw) ? viewportRaw : null;

  const ua = c.ua != null ? truncate(asStr(c.ua), 120) || null : null;

  let referrer: string | null = null;
  if (c.referrer != null) referrer = truncate(asStr(c.referrer), 200) || null;

  const tz = c.tz != null ? truncate(asStr(c.tz), 64) || null : null;
  const buildVersion = c.build_version != null ? truncate(asStr(c.build_version), 40) || null : null;

  let lastJsErrors: SanitizedCtx["last_js_errors"] = null;
  if (Array.isArray(c.last_js_errors)) {
    const seen = new Set<string>();
    const out: { t: string; m: string; s: string; l: string }[] = [];
    for (const raw of c.last_js_errors as unknown[]) {
      if (out.length >= 3) break;
      if (!raw || typeof raw !== "object") continue;
      const e = raw as Record<string, unknown>;
      const m = sanitizeErrorMessage(asStr(e.m));
      const key = m;
      if (seen.has(key)) continue; // 연속 중복 제거 (근사: 전체 중복 제거)
      seen.add(key);
      out.push({
        t: asStr(e.t).slice(0, 40),
        m,
        s: asStr(e.s).split("?")[0].slice(0, 200),
        l: asStr(e.l).slice(0, 20),
      });
    }
    lastJsErrors = out.length ? out : null;
  }

  const submittedAtRaw = asStr(c.submitted_at);
  const submittedAtMs = submittedAtRaw ? Date.parse(submittedAtRaw) : NaN;
  const submittedAt = Number.isFinite(submittedAtMs) ? new Date(submittedAtMs).toISOString() : null;

  return {
    page_path: pagePath,
    mode,
    lang,
    ui_state: uiState,
    rfp_ref: rfpRef,
    token_kind: (tokenKind || null) as SanitizedCtx["token_kind"],
    token_hash8: tokenHash8 || null,
    viewport,
    ua,
    referrer,
    last_js_errors: lastJsErrors,
    tz,
    build_version: buildVersion,
    submitted_at: submittedAt,
  };
}

export function validateSubmission(raw: unknown): { errors: FieldError[]; value: SanitizedSubmission } {
  const errors: FieldError[] = [];
  const body = (raw && typeof raw === "object" ? raw as Record<string, unknown> : {}) as Record<string, unknown>;

  const csid = asStr(body.client_submission_id);
  if (!RE_UUID_V4.test(csid)) errors.push({ name: "client_submission_id", code: "csid_invalid" });

  const sourceRaw = asStr(body.source);
  const sourceOk = (SOURCES as readonly string[]).includes(sourceRaw);
  if (!sourceOk) errors.push({ name: "source", code: "source_invalid" });
  const source = sourceOk ? (sourceRaw as SanitizedSubmission["source"]) : "widget";

  let category: SanitizedSubmission["category"] = "OPS";
  if (source === "contact") {
    category = "OPS"; // contact 면 무시하고 OPS
  } else {
    const categoryRaw = asStr(body.category);
    if (!(CATEGORIES as readonly string[]).includes(categoryRaw)) {
      errors.push({ name: "category", code: "category_required" });
    } else {
      category = categoryRaw as SanitizedSubmission["category"];
    }
  }

  const content = normalizeContent(asStr(body.content));
  const len = charLen(content);
  if (len < 20) errors.push({ name: "content", code: "content_short" });
  else if (len > 2000) errors.push({ name: "content", code: "content_long" });

  let replyEmail: string | null = null;
  const replyEmailRaw = body.reply_email;
  if (replyEmailRaw !== null && replyEmailRaw !== undefined && asStr(replyEmailRaw).trim() !== "") {
    const e = asStr(replyEmailRaw).trim().toLowerCase();
    if (e.length > 254 || !RE_EMAIL_FB.test(e)) errors.push({ name: "reply_email", code: "email_invalid" });
    else replyEmail = e;
  }

  const replyConsent = body.reply_consent === true;
  if (replyEmail && !replyConsent) errors.push({ name: "reply_consent", code: "consent_required" });

  let contactName: string | null = null;
  if (source === "contact") {
    const raw = asStr(body.contact_name);
    // deno-lint-ignore no-control-regex
    const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, "").trim();
    if (cleaned.length > 60) errors.push({ name: "contact_name", code: "name_long" });
    else contactName = cleaned || null;
  }

  const hp = asStr(body.hp);

  let dwellMs = Number(body.dwell_ms);
  if (!Number.isFinite(dwellMs) || dwellMs < 0 || dwellMs > 86_400_000 || !Number.isInteger(dwellMs)) dwellMs = 0;

  let authAccessToken: string | null = null;
  if (body.auth && typeof body.auth === "object") {
    const t = asStr((body.auth as Record<string, unknown>).access_token);
    authAccessToken = t || null;
  }

  const ctx = sanitizeCtx(body.ctx, errors);

  const ctxRaw = (body.ctx && typeof body.ctx === "object" ? body.ctx as Record<string, unknown> : {}) as Record<string, unknown>;
  const isDemoHint = ctxRaw.is_demo_hint === true;
  const userTypeHint = ctxRaw.user_type_hint != null ? asStr(ctxRaw.user_type_hint) : null;

  return {
    errors,
    value: {
      client_submission_id: csid,
      source,
      category,
      content,
      reply_email: replyEmail,
      reply_consent: replyConsent,
      contact_name: contactName,
      hp,
      dwell_ms: dwellMs,
      authAccessToken,
      ctx,
      isDemoHint,
      userTypeHint,
    },
  };
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
