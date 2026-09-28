// feedback-mail-retry handle() 테스트: 두 인증 모드(cron secret / 콘솔 운영자 Bearer) + 404/403.
// SPEC_FEEDBACK.md §3.10.
import { assert, assertEquals } from "./_assert.ts";
import { makeMockDeps } from "./mock_deps.ts";
import { handle, RetryError } from "../feedback-mail-retry/handle.ts";
import type { Deps } from "../_shared/deps.ts";

const ENV = { FEEDBACK_CRON_SECRET: "cron-secret-value", NOTIFY_MODE: "log", FEEDBACK_INBOX: "ops@micego.kr", FEEDBACK_FROM: "MICEGO <noreply@notify.micego.kr>" };

const MAIL_ROW = {
  id: "fb-1", ref: "FB-261008-ABCD", source: "widget", category: "SYS", user_type: "visitor",
  content: "본문입니다 재시도 테스트용 내용입니다 스무자 이상", reply_email: "user@example.com", contact_name: null,
  member_id: null, created_at: "2026-10-08T10:00:00.000Z", lang: "ko", mode: "root", page_path: "/index.html",
  ui_state: null, rfp_ref: null, ua: null, viewport: null, tz: null, build_version: null, referrer: null,
  last_js_errors: null, ops_mail_status: "pending", ops_mail_attempts: 0, ack_mail_status: "pending", ack_mail_attempts: 0,
};

function req(opts: { headers?: Record<string, string>; body?: unknown } = {}): Request {
  return new Request("https://edge.local/feedback-mail-retry", {
    method: "POST",
    headers: { "content-type": "application/json", ...(opts.headers ?? {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

function depsWith(overrides: { queryHandler?: (sql: string, params: unknown[]) => unknown[] | undefined; authAdmin?: Partial<Deps["authAdmin"]> } = {}): Deps {
  return makeMockDeps({ env: ENV, authAdmin: overrides.authAdmin, queryHandler: overrides.queryHandler });
}

Deno.test("feedback-mail-retry: cron secret -> batch mode via feedback_claim_mail", async () => {
  let claimed = false;
  const deps = depsWith({
    queryHandler: (sql) => {
      const s = sql.toLowerCase();
      if (s.includes("feedback_claim_mail")) { claimed = true; return [MAIL_ROW]; }
      if (s.startsWith("update feedback set")) return [];
      if (s.startsWith("insert into feedback_event")) return [];
      return undefined;
    },
  });
  const result = await handle(req({ headers: { "x-internal-secret": "cron-secret-value" } }), deps);
  assert(claimed, "expected feedback_claim_mail() to be called");
  assertEquals(result.processed, 1);
  assertEquals(result.sent, 2); // ops + ack both pending -> both sent (log mode)
  assertEquals(result.failed, 0);
});

Deno.test("feedback-mail-retry: wrong cron secret + no bearer -> FORBIDDEN", async () => {
  const deps = depsWith();
  let caught: RetryError | null = null;
  try {
    await handle(req({ headers: { "x-internal-secret": "wrong" } }), deps);
  } catch (e) {
    caught = e as RetryError;
  }
  assert(caught instanceof RetryError);
  assertEquals(caught!.code, "FORBIDDEN");
});

Deno.test("feedback-mail-retry: console single-item, operator bearer -> resets failed attempts then sends", async () => {
  const failedRow = { ...MAIL_ROW, ops_mail_status: "failed", ops_mail_attempts: 3, ack_mail_status: "sent" };
  let resetParams: unknown[] | undefined;
  const deps = depsWith({
    authAdmin: { getUser: async () => ({ id: "op-1", email: "op@micego.kr", app_metadata: { role: "operator" } }) },
    queryHandler: (sql, params) => {
      const s = sql.toLowerCase();
      if (s.includes("select * from feedback where id")) return [failedRow];
      if (s.startsWith("update feedback set") && s.includes("ops_mail_status = case")) { resetParams = params; return []; }
      if (s.startsWith("update feedback set ops_mail")) return []; // markMail's update
      if (s.startsWith("insert into feedback_event")) return [];
      return undefined;
    },
  });
  const result = await handle(req({ headers: { authorization: "Bearer op-token" }, body: { id: "fb-1" } }), deps);
  assert(resetParams, "expected attempts to be reset before retry");
  assertEquals(resetParams![0], "fb-1");
  assertEquals(resetParams![1], true); // resetOps
  assertEquals(resetParams![2], false); // resetAck (already sent)
  assertEquals(result.processed, 1);
  assertEquals(result.sent, 1); // only ops resent (ack already sent, not attempted again)
});

Deno.test("feedback-mail-retry: console single-item, non-operator bearer -> FORBIDDEN", async () => {
  const deps = depsWith({ authAdmin: { getUser: async () => ({ id: "m-1", email: "m@example.com", app_metadata: {} }) } });
  let caught: RetryError | null = null;
  try {
    await handle(req({ headers: { authorization: "Bearer member-token" }, body: { id: "fb-1" } }), deps);
  } catch (e) {
    caught = e as RetryError;
  }
  assert(caught instanceof RetryError);
  assertEquals(caught!.code, "FORBIDDEN");
});

Deno.test("feedback-mail-retry: console single-item, unknown id -> NOT_FOUND", async () => {
  const deps = depsWith({
    authAdmin: { getUser: async () => ({ id: "op-1", email: "op@micego.kr", app_metadata: { role: "operator" } }) },
    queryHandler: (sql) => {
      if (sql.toLowerCase().includes("select * from feedback where id")) return [];
      return undefined;
    },
  });
  let caught: RetryError | null = null;
  try {
    await handle(req({ headers: { authorization: "Bearer op-token" }, body: { id: "missing" } }), deps);
  } catch (e) {
    caught = e as RetryError;
  }
  assert(caught instanceof RetryError);
  assertEquals(caught!.code, "NOT_FOUND");
});

Deno.test("feedback-mail-retry: no secret and no bearer -> FORBIDDEN", async () => {
  const deps = depsWith();
  let caught: RetryError | null = null;
  try {
    await handle(req(), deps);
  } catch (e) {
    caught = e as RetryError;
  }
  assert(caught instanceof RetryError);
  assertEquals(caught!.code, "FORBIDDEN");
});
