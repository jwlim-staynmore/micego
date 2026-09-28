// 피드백 필드 검증 매트릭스 + maskSecrets. SPEC_FEEDBACK.md §3.6.
import { assert, assertEquals } from "./_assert.ts";
import { validateSubmission, maskSecrets, sanitizeErrorMessage, normalizeContent, charLen } from "../_shared/feedback_sanitize.ts";

const VALID_CTX = {
  page_path: "/ko/track.html", mode: "agency", lang: "ko", ui_state: "delivered",
  rfp_ref: "MG-2610-014", token_kind: "track", token_hash8: "9f86d081",
  viewport: "390x844@3", ua: "iOS 17 · Safari", referrer: "/ko/index.html",
  last_js_errors: [], tz: "Asia/Seoul", build_version: "2026.10.01-3", submitted_at: "2026-10-08T10:00:00.000Z",
};

const VALID_BODY = {
  v: 1,
  client_submission_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  source: "widget",
  category: "SYS",
  content: "이 페이지에서 버튼을 눌렀는데 아무 반응이 없었습니다. 새로고침해도 동일합니다.",
  reply_email: "user@example.com",
  reply_consent: true,
  contact_name: null,
  hp: "",
  dwell_ms: 12000,
  auth: null,
  ctx: VALID_CTX,
};

Deno.test("validateSubmission: happy path has no errors", () => {
  const { errors, value } = validateSubmission(VALID_BODY);
  assertEquals(errors, []);
  assertEquals(value.source, "widget");
  assertEquals(value.category, "SYS");
  assertEquals(value.reply_email, "user@example.com");
  assertEquals(value.ctx.token_kind, "track");
  assertEquals(value.ctx.token_hash8, "9f86d081");
});

Deno.test("validateSubmission: invalid client_submission_id", () => {
  const { errors } = validateSubmission({ ...VALID_BODY, client_submission_id: "not-a-uuid" });
  assert(errors.some((e) => e.name === "client_submission_id" && e.code === "csid_invalid"));
});

Deno.test("validateSubmission: invalid source", () => {
  const { errors } = validateSubmission({ ...VALID_BODY, source: "sms" });
  assert(errors.some((e) => e.name === "source" && e.code === "source_invalid"));
});

Deno.test("validateSubmission: category required for widget, ignored for contact (forced OPS)", () => {
  const { errors } = validateSubmission({ ...VALID_BODY, category: "" });
  assert(errors.some((e) => e.name === "category" && e.code === "category_required"));

  const { errors: e2, value } = validateSubmission({ ...VALID_BODY, source: "contact", category: "garbage", contact_name: "홍길동" });
  assertEquals(e2.filter((e) => e.name === "category"), []);
  assertEquals(value.category, "OPS");
});

Deno.test("validateSubmission: content too short / too long", () => {
  const short = validateSubmission({ ...VALID_BODY, content: "짧음" });
  assert(short.errors.some((e) => e.name === "content" && e.code === "content_short"));

  const long = validateSubmission({ ...VALID_BODY, content: "가".repeat(2001) });
  assert(long.errors.some((e) => e.name === "content" && e.code === "content_long"));
});

Deno.test("validateSubmission: content boundary 20/2000 chars pass", () => {
  const c20 = "가".repeat(20);
  const r1 = validateSubmission({ ...VALID_BODY, content: c20 });
  assertEquals(r1.errors.filter((e) => e.name === "content"), []);
  const c2000 = "가".repeat(2000);
  const r2 = validateSubmission({ ...VALID_BODY, content: c2000 });
  assertEquals(r2.errors.filter((e) => e.name === "content"), []);
});

Deno.test("validateSubmission: malformed email", () => {
  const { errors } = validateSubmission({ ...VALID_BODY, reply_email: "not-an-email" });
  assert(errors.some((e) => e.name === "reply_email" && e.code === "email_invalid"));
});

Deno.test("validateSubmission: email present requires consent", () => {
  const { errors } = validateSubmission({ ...VALID_BODY, reply_email: "user@example.com", reply_consent: false });
  assert(errors.some((e) => e.name === "reply_consent" && e.code === "consent_required"));
});

Deno.test("validateSubmission: no email means consent not required", () => {
  const { errors } = validateSubmission({ ...VALID_BODY, reply_email: null, reply_consent: false });
  assertEquals(errors.filter((e) => e.name === "reply_consent"), []);
});

Deno.test("validateSubmission: contact_name too long (contact source)", () => {
  const { errors } = validateSubmission({ ...VALID_BODY, source: "contact", contact_name: "가".repeat(61), reply_email: "a@b.com" });
  assert(errors.some((e) => e.name === "contact_name" && e.code === "name_long"));
});

Deno.test("validateSubmission: contact_name ignored for widget source", () => {
  const { value } = validateSubmission({ ...VALID_BODY, source: "widget", contact_name: "가".repeat(61) });
  assertEquals(value.contact_name, null);
});

Deno.test("validateSubmission: dwell_ms out of range resets to 0", () => {
  const { value } = validateSubmission({ ...VALID_BODY, dwell_ms: -5 });
  assertEquals(value.dwell_ms, 0);
  const { value: v2 } = validateSubmission({ ...VALID_BODY, dwell_ms: 999999999999 });
  assertEquals(v2.dwell_ms, 0);
});

Deno.test("validateSubmission: ctx.page_path invalid rejects request", () => {
  const { errors } = validateSubmission({ ...VALID_BODY, ctx: { ...VALID_CTX, page_path: "not-a-path" } });
  assert(errors.some((e) => e.name === "ctx.page_path" && e.code === "ctx_invalid"));
});

Deno.test("validateSubmission: ctx.page_path strips query/hash before checking", () => {
  const { errors, value } = validateSubmission({ ...VALID_BODY, ctx: { ...VALID_CTX, page_path: "/ko/track.html?t=SECRET#frag" } });
  assertEquals(errors.filter((e) => e.name === "ctx.page_path"), []);
  assertEquals(value.ctx.page_path, "/ko/track.html");
});

Deno.test("validateSubmission: ctx.ui_state falls back to null (no error) when malformed", () => {
  const { errors, value } = validateSubmission({ ...VALID_BODY, ctx: { ...VALID_CTX, ui_state: "Not Valid!!" } });
  assertEquals(errors.filter((e) => e.name.startsWith("ctx.ui_state")), []);
  assertEquals(value.ctx.ui_state, null);
});

Deno.test("validateSubmission: ctx.rfp_ref falls back to null when malformed", () => {
  const { value } = validateSubmission({ ...VALID_BODY, ctx: { ...VALID_CTX, rfp_ref: "garbage" } });
  assertEquals(value.ctx.rfp_ref, null);
});

Deno.test("validateSubmission: token_kind/token_hash8 must both be present or both null", () => {
  const onlyKind = validateSubmission({ ...VALID_BODY, ctx: { ...VALID_CTX, token_kind: "track", token_hash8: "" } });
  assertEquals(onlyKind.value.ctx.token_kind, null);
  assertEquals(onlyKind.value.ctx.token_hash8, null);

  const badHash = validateSubmission({ ...VALID_BODY, ctx: { ...VALID_CTX, token_kind: "bid", token_hash8: "nothex!!" } });
  assertEquals(badHash.value.ctx.token_kind, null);
  assertEquals(badHash.value.ctx.token_hash8, null);
});

Deno.test("validateSubmission: ctx.mode/lang enum errors", () => {
  const { errors } = validateSubmission({ ...VALID_BODY, ctx: { ...VALID_CTX, mode: "bogus", lang: "fr" } });
  assert(errors.some((e) => e.name === "ctx.mode"));
  assert(errors.some((e) => e.name === "ctx.lang"));
});

Deno.test("validateSubmission: last_js_errors capped at 3, dedup consecutive-identical, m sanitized", () => {
  const { value } = validateSubmission({
    ...VALID_BODY,
    ctx: {
      ...VALID_CTX,
      last_js_errors: [
        { t: "2026-10-08T00:00:00.000Z", m: "boom user@example.com", s: "/assets/x.js?token=abcdefgh12345678", l: "1:1" },
        { t: "2026-10-08T00:00:01.000Z", m: "boom user@example.com", s: "/assets/x.js", l: "1:1" },
        { t: "2026-10-08T00:00:02.000Z", m: "err2", s: "/assets/y.js", l: "2:2" },
        { t: "2026-10-08T00:00:03.000Z", m: "err3", s: "/assets/z.js", l: "3:3" },
        { t: "2026-10-08T00:00:04.000Z", m: "err4 should be dropped (cap 3)", s: "/assets/w.js", l: "4:4" },
      ],
    },
  });
  assert(value.ctx.last_js_errors !== null);
  assertEquals(value.ctx.last_js_errors!.length, 3);
  assertEquals(value.ctx.last_js_errors![0].m, "boom [email]");
  assertEquals(value.ctx.last_js_errors![0].s, "/assets/x.js"); // 쿼리(토큰) 제거
});

Deno.test("normalizeContent: CRLF -> LF, strips control chars, trims", () => {
  const s = normalizeContent("  hello\r\nworld\u0007  ");
  assertEquals(s, "hello\nworld");
});

Deno.test("charLen: counts unicode code points (surrogate-pair safe)", () => {
  assertEquals(charLen("한글테스트"), 5);
});

Deno.test("maskSecrets: masks token-like query params and JWTs", () => {
  const s = maskSecrets("see /ko/track.html?t=abcdEFGH12345678 and Authorization: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dQw4w9WgXcQ_abc123");
  assert(s.includes("[token]"));
  assert(s.includes("[jwt]"));
  assert(!s.includes("abcdEFGH12345678"));
});

Deno.test("sanitizeErrorMessage: masks email + long numbers, truncates to 500", () => {
  const s = sanitizeErrorMessage("contact me at user@example.com or call 010123456789 " + "x".repeat(600));
  assert(s.includes("[email]"));
  assert(s.includes("[num]"));
  assertEquals(s.length, 500);
});
