// feedback-submit handle() 테스트: Origin/크기/버전/레이트리밋/허니팟/검증/멱등/중복본문/유저유형 판정/메일 payload.
// SPEC_FEEDBACK.md §3.3, §3.9, §4.5.
import { assert, assertEquals } from "./_assert.ts";
import { makeMockDeps } from "./mock_deps.ts";
import { handle } from "../feedback-submit/handle.ts";
import { FeedbackError } from "../feedback-submit/errors.ts";
import { buildOpsAlertMail, buildAckMail } from "../_shared/feedback_templates.ts";
import type { Deps } from "../_shared/deps.ts";

const ENV = {
  FEEDBACK_ALLOWED_ORIGINS: "https://micego.kr",
  FEEDBACK_STAGING_ORIGINS: "https://staging.micego.kr",
  FEEDBACK_IP_PEPPER: "test-pepper",
  FEEDBACK_INBOX: "ops@micego.kr",
  FEEDBACK_FROM: "MICEGO <noreply@notify.micego.kr>",
  FEEDBACK_CONSOLE_BASE_URL: "https://micego.kr/admin",
  NOTIFY_MODE: "log",
};

function fbRequest(body: unknown, opts: { origin?: string; method?: string; raw?: string } = {}): Request {
  const headers: Record<string, string> = { "content-type": "text/plain;charset=UTF-8" };
  if (opts.origin !== undefined) headers["origin"] = opts.origin;
  const method = opts.method ?? "POST";
  const canHaveBody = method !== "GET" && method !== "HEAD";
  return new Request("https://edge.local/feedback-submit", {
    method,
    headers,
    ...(canHaveBody ? { body: opts.raw !== undefined ? opts.raw : JSON.stringify(body) } : {}),
  });
}

const VALID_CTX = {
  page_path: "/ko/track.html", mode: "agency", lang: "ko", ui_state: "delivered",
  rfp_ref: null, token_kind: null, token_hash8: null,
  viewport: "390x844@3", ua: "iOS 17 · Safari", referrer: null,
  last_js_errors: [], tz: "Asia/Seoul", build_version: "2026.10.01-3", submitted_at: "2026-10-08T10:00:00.000Z",
};

const VALID_BODY = {
  v: 1,
  client_submission_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  source: "widget",
  category: "SYS",
  content: "이 페이지에서 버튼을 눌렀는데 아무 반응이 없었습니다. 새로고침해도 동일합니다.",
  reply_email: null,
  reply_consent: false,
  contact_name: null,
  hp: "",
  dwell_ms: 12000,
  auth: null,
  ctx: VALID_CTX,
};

function depsWith(overrides: {
  queryHandler?: (sql: string, params: unknown[]) => unknown[] | undefined;
  authAdmin?: Partial<Deps["authAdmin"]>;
  env?: Record<string, string | undefined>;
} = {}): Deps {
  return makeMockDeps({
    env: { ...ENV, ...overrides.env },
    authAdmin: overrides.authAdmin,
    queryHandler: (sql, params) => {
      const custom = overrides.queryHandler?.(sql, params);
      if (custom !== undefined) return custom;
      const s = sql.toLowerCase();
      if (s.includes("feedback_rate_hit")) return [{ feedback_rate_hit: { allowed: true } }];
      if (s.includes("select id, ref from feedback where client_submission_id")) return [];
      if (s.includes("select id from feedback where body_hash")) return [];
      if (s.includes("count(*)::int as n from feedback where ops_mail_status")) return [{ n: 0 }];
      if (s.includes("count(*)::int as n from feedback where reply_email")) return [{ n: 0 }];
      if (s.includes("insert into feedback")) {
        return [{ id: "fb-1", ref: "FB-261008-ABCD", created_at: "2026-10-08T10:00:00.000Z" }];
      }
      return undefined;
    },
  });
}

async function expectError(p: Promise<unknown>, code: string) {
  let caught: FeedbackError | null = null;
  try {
    await p;
  } catch (e) {
    caught = e as FeedbackError;
  }
  assert(caught instanceof FeedbackError, `expected FeedbackError, got ${caught}`);
  assertEquals(caught!.code, code);
  return caught!;
}

Deno.test("feedback-submit: disallowed origin -> ORIGIN_DENIED", async () => {
  const deps = depsWith();
  await expectError(handle(fbRequest(VALID_BODY, { origin: "https://evil.example" }), deps), "ORIGIN_DENIED");
});

Deno.test("feedback-submit: no origin header -> ORIGIN_DENIED", async () => {
  const deps = depsWith();
  await expectError(handle(fbRequest(VALID_BODY), deps), "ORIGIN_DENIED");
});

Deno.test("feedback-submit: non-POST method -> METHOD_NOT_ALLOWED", async () => {
  const deps = depsWith();
  await expectError(handle(fbRequest(VALID_BODY, { origin: "https://micego.kr", method: "GET" }), deps), "METHOD_NOT_ALLOWED");
});

Deno.test("feedback-submit: oversized body -> TOO_LARGE", async () => {
  const deps = depsWith();
  const big = { ...VALID_BODY, content: VALID_BODY.content + "x".repeat(20000) };
  await expectError(handle(fbRequest(big, { origin: "https://micego.kr" }), deps), "TOO_LARGE");
});

Deno.test("feedback-submit: malformed JSON -> BAD_JSON", async () => {
  const deps = depsWith();
  await expectError(handle(fbRequest(null, { origin: "https://micego.kr", raw: "{not json" }), deps), "BAD_JSON");
});

Deno.test("feedback-submit: v != 1 -> BAD_VERSION", async () => {
  const deps = depsWith();
  await expectError(handle(fbRequest({ ...VALID_BODY, v: 2 }, { origin: "https://micego.kr" }), deps), "BAD_VERSION");
});

Deno.test("feedback-submit: rate limited (ip_10m) -> RATE_LIMITED with retry_after_sec", async () => {
  const deps = depsWith({
    queryHandler: (sql) => {
      if (sql.toLowerCase().includes("feedback_rate_hit")) return [{ feedback_rate_hit: { allowed: false, reason: "ip_10m", retry_after_sec: 600 } }];
      return undefined;
    },
  });
  const err = await expectError(handle(fbRequest(VALID_BODY, { origin: "https://micego.kr" }), deps), "RATE_LIMITED");
  assertEquals(err.retryAfterSec, 600);
});

Deno.test("feedback-submit: rate limited (global) -> BUSY", async () => {
  const deps = depsWith({
    queryHandler: (sql) => {
      if (sql.toLowerCase().includes("feedback_rate_hit")) return [{ feedback_rate_hit: { allowed: false, reason: "global", retry_after_sec: 3600 } }];
      return undefined;
    },
  });
  await expectError(handle(fbRequest(VALID_BODY, { origin: "https://micego.kr" }), deps), "BUSY");
});

Deno.test("feedback-submit: honeypot filled -> fake 201 success, no insert", async () => {
  let insertCalled = false;
  const deps = depsWith({
    queryHandler: (sql) => {
      if (sql.toLowerCase().includes("insert into feedback")) { insertCalled = true; return []; }
      return undefined;
    },
  });
  const result = await handle(fbRequest({ ...VALID_BODY, hp: "im-a-bot" }, { origin: "https://micego.kr" }), deps) as unknown as { status: number; body: Record<string, unknown> };
  assertEquals(result.status, 201);
  assertEquals(result.body.ok, true);
  assertEquals(result.body.duplicate, false);
  assertEquals(result.body.ack, "none");
  assert(/^FB-\d{6}-[A-HJ-NP-Z2-9]{4}$/.test(result.body.ref as string));
  assert(!insertCalled, "honeypot path must not insert a row");
});

Deno.test("feedback-submit: validation errors surface as VALIDATION with fields", async () => {
  const deps = depsWith();
  const err = await expectError(handle(fbRequest({ ...VALID_BODY, content: "short" }, { origin: "https://micego.kr" }), deps), "VALIDATION");
  assert(err.fields?.some((f) => f.name === "content" && f.code === "content_short"));
});

Deno.test("feedback-submit: idempotent client_submission_id -> 200 duplicate:true", async () => {
  const deps = depsWith({
    queryHandler: (sql) => {
      if (sql.toLowerCase().includes("select id, ref from feedback where client_submission_id")) {
        return [{ id: "fb-existing", ref: "FB-261008-WXYZ" }];
      }
      return undefined;
    },
  });
  const result = await handle(fbRequest(VALID_BODY, { origin: "https://micego.kr" }), deps) as unknown as { status: number; body: Record<string, unknown> };
  assertEquals(result.status, 200);
  assertEquals(result.body.duplicate, true);
  assertEquals(result.body.ref, "FB-261008-WXYZ");
  assertEquals(result.body.ack, "none");
});

Deno.test("feedback-submit: duplicate content within 24h -> DUPLICATE_CONTENT", async () => {
  const deps = depsWith({
    queryHandler: (sql) => {
      if (sql.toLowerCase().includes("select id from feedback where body_hash")) return [{ id: "fb-dup" }];
      return undefined;
    },
  });
  await expectError(handle(fbRequest(VALID_BODY, { origin: "https://micego.kr" }), deps), "DUPLICATE_CONTENT");
});

Deno.test("feedback-submit: happy path inserts, returns 201 + ref, ack:none when no reply_email", async () => {
  const deps = depsWith();
  const result = await handle(fbRequest(VALID_BODY, { origin: "https://micego.kr" }), deps) as unknown as { status: number; body: Record<string, unknown>; mailRow?: Record<string, unknown> };
  assertEquals(result.status, 201);
  assertEquals(result.body.ref, "FB-261008-ABCD");
  assertEquals(result.body.duplicate, false);
  assertEquals(result.body.ack, "none");
  assert(result.mailRow, "expected mailRow to be present for a fresh insert");
});

Deno.test("feedback-submit: reply_email + consent -> ack:queued and mailRow ack pending", async () => {
  const deps = depsWith();
  const body = { ...VALID_BODY, reply_email: "user@example.com", reply_consent: true };
  const result = await handle(fbRequest(body, { origin: "https://micego.kr" }), deps) as unknown as { body: Record<string, unknown>; mailRow?: { ack_mail_status: string } };
  assertEquals(result.body.ack, "queued");
  assertEquals(result.mailRow?.ack_mail_status, "pending");
});

Deno.test("feedback-submit: staging origin -> is_demo true, ops mail skipped", async () => {
  const deps = depsWith();
  const result = await handle(fbRequest(VALID_BODY, { origin: "https://staging.micego.kr" }), deps) as { mailRow?: { ops_mail_status: string } };
  assertEquals(result.mailRow?.ops_mail_status, "skipped");
});

Deno.test("feedback-submit: client is_demo_hint on prod origin is ignored (D4)", async () => {
  const deps = depsWith();
  const body = { ...VALID_BODY, ctx: { ...VALID_CTX, is_demo_hint: true } };
  const result = await handle(fbRequest(body, { origin: "https://micego.kr" }), deps) as { mailRow?: { ops_mail_status: string } };
  assertEquals(result.mailRow?.ops_mail_status, "pending"); // 운영 Origin이면 클라이언트 힌트 무시하고 false
});

Deno.test("feedback-submit user_type: operator JWT -> admin, member_id null", async () => {
  let capturedParams: unknown[] | undefined;
  const deps = depsWith({
    authAdmin: { getUser: async () => ({ id: "op-1", email: "op@micego.kr", app_metadata: { role: "operator" } }) },
    queryHandler: (sql, params) => {
      if (sql.toLowerCase().includes("insert into feedback")) capturedParams = params;
      return undefined;
    },
  });
  const body = { ...VALID_BODY, auth: { access_token: "tok" } };
  await handle(fbRequest(body, { origin: "https://micego.kr" }), deps);
  assert(capturedParams, "insert should have been called");
  assertEquals(capturedParams![8], "admin");
  assertEquals(capturedParams![9], null);
});

Deno.test("feedback-submit user_type: bid token + hash, no session -> hotel", async () => {
  let capturedParams: unknown[] | undefined;
  const deps = depsWith({
    queryHandler: (sql, params) => {
      if (sql.toLowerCase().includes("insert into feedback")) capturedParams = params;
      return undefined;
    },
  });
  const body = { ...VALID_BODY, ctx: { ...VALID_CTX, token_kind: "bid", token_hash8: "9f86d081" } };
  await handle(fbRequest(body, { origin: "https://micego.kr" }), deps);
  assertEquals(capturedParams![8], "hotel");
  assertEquals(capturedParams![9], null);
});

Deno.test("feedback-submit user_type: non-operator JWT -> travel_agency, member_id set", async () => {
  let capturedParams: unknown[] | undefined;
  const deps = depsWith({
    authAdmin: { getUser: async () => ({ id: "member-42", email: "m@hanbit.example", app_metadata: {} }) },
    queryHandler: (sql, params) => {
      if (sql.toLowerCase().includes("insert into feedback")) capturedParams = params;
      return undefined;
    },
  });
  const body = { ...VALID_BODY, auth: { access_token: "tok" } };
  await handle(fbRequest(body, { origin: "https://micego.kr" }), deps);
  assertEquals(capturedParams![8], "travel_agency");
  assertEquals(capturedParams![9], "member-42");
});

Deno.test("feedback-submit user_type: track token + hash, no session -> organizer_guest", async () => {
  let capturedParams: unknown[] | undefined;
  const deps = depsWith({
    queryHandler: (sql, params) => {
      if (sql.toLowerCase().includes("insert into feedback")) capturedParams = params;
      return undefined;
    },
  });
  const body = { ...VALID_BODY, ctx: { ...VALID_CTX, token_kind: "track", token_hash8: "9f86d081" } };
  await handle(fbRequest(body, { origin: "https://micego.kr" }), deps);
  assertEquals(capturedParams![8], "organizer_guest");
});

Deno.test("feedback-submit user_type: nothing -> visitor", async () => {
  let capturedParams: unknown[] | undefined;
  const deps = depsWith({
    queryHandler: (sql, params) => {
      if (sql.toLowerCase().includes("insert into feedback")) capturedParams = params;
      return undefined;
    },
  });
  await handle(fbRequest(VALID_BODY, { origin: "https://micego.kr" }), deps);
  assertEquals(capturedParams![8], "visitor");
});

Deno.test("feedback-submit: invalid/expired session silently falls back to visitor (never throws)", async () => {
  const deps = depsWith({ authAdmin: { getUser: async () => { throw new Error("boom"); } } });
  const body = { ...VALID_BODY, auth: { access_token: "expired" } };
  const result = await handle(fbRequest(body, { origin: "https://micego.kr" }), deps) as { status: number };
  assertEquals(result.status, 201);
});

// ---------- 메일 payload shape ----------

Deno.test("buildOpsAlertMail: subject format (widget) and excluded fields", () => {
  const tpl = buildOpsAlertMail({
    id: "fb-1", ref: "FB-261008-ABCD", source: "widget", category: "SYS", userType: "organizer_guest",
    content: "본문 내용입니다 토큰은 없습니다", replyEmail: "user@example.com", contactName: null, isMember: false,
    createdAt: new Date("2026-10-08T10:00:00.000Z"), lang: "ko", mode: "agency", pagePath: "/ko/track.html",
    uiState: "delivered", rfpRef: "MG-2610-014", ua: "iOS 17 · Safari", viewport: "390x844@3", tz: "Asia/Seoul",
    buildVersion: "2026.10.01-3", referrer: null, lastJsErrors: null, consoleBaseUrl: "https://micego.kr/admin",
  });
  assert(tpl.subject.startsWith("[MICEGO 피드백] FB-261008-ABCD"));
  assert(tpl.subject.includes("본문 내용입니다"));
  assert(tpl.text.includes("FB-261008-ABCD"));
  assert(!tpl.text.includes("member_id"));
  assert(!tpl.text.includes("csid"));
  assert(!tpl.text.includes("body_hash"));
});

Deno.test("buildOpsAlertMail: contact source subject uses name/email prefix", () => {
  const tpl = buildOpsAlertMail({
    id: "fb-2", ref: "FB-261008-EFGH", source: "contact", category: "OPS", userType: "visitor",
    content: "문의드립니다 견적 관련해서 궁금한 점이 있어요", replyEmail: "asker@example.com", contactName: "홍길동", isMember: false,
    createdAt: new Date("2026-10-08T10:00:00.000Z"), lang: "ko", mode: "root", pagePath: "/ko/contact.html",
    uiState: null, rfpRef: null, ua: null, viewport: null, tz: null, buildVersion: null, referrer: null,
    lastJsErrors: null, consoleBaseUrl: "https://micego.kr/admin",
  });
  assert(tpl.subject.startsWith("[MICEGO 문의] FB-261008-EFGH · 홍길동"));
});

Deno.test("buildOpsAlertMail: missing reply_email appends '회신 없음' to widget subject", () => {
  const tpl = buildOpsAlertMail({
    id: "fb-3", ref: "FB-261008-IJKL", source: "widget", category: "ETC", userType: "visitor",
    content: "의견입니다 별다른 문제는 아니에요 그냥 제안입니다", replyEmail: null, contactName: null, isMember: false,
    createdAt: new Date("2026-10-08T10:00:00.000Z"), lang: "ko", mode: "root", pagePath: "/index.html",
    uiState: null, rfpRef: null, ua: null, viewport: null, tz: null, buildVersion: null, referrer: null,
    lastJsErrors: null, consoleBaseUrl: "https://micego.kr/admin",
  });
  assert(tpl.subject.includes("회신 없음"));
});

Deno.test("buildAckMail: never includes user content (D7)", () => {
  const tpl = buildAckMail({ ref: "FB-261008-ABCD", category: "SYS", createdAt: new Date("2026-10-08T10:00:00.000Z"), lang: "ko" });
  assert(tpl.text.includes("FB-261008-ABCD"));
  assert(!tpl.text.includes("본문"));
  assertEquals(tpl.subject, "[MICEGO] 보내 주신 의견을 접수했습니다 (FB-261008-ABCD)");
});

Deno.test("buildAckMail: English variant", () => {
  const tpl = buildAckMail({ ref: "FB-261008-ABCD", category: "SYS", createdAt: new Date("2026-10-08T10:00:00.000Z"), lang: "en" });
  assertEquals(tpl.subject, "[MICEGO] We've received your feedback (FB-261008-ABCD)");
});
