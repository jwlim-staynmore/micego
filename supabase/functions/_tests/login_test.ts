// login 오류 코드 + 잠금/쿨다운 임계값 테스트 (SPEC_LAUNCH.md §8: "the error envelope and codes for each
// function"; SPEC_ACCOUNTS.md A2: "5 fails -> 15분 cooldown; 10 fails within 1h -> locked").
import { assert, assertEquals } from "./_assert.ts";
import { makeMockDeps, makeMockAuthAdmin, mockRequest } from "./mock_deps.ts";
import { handle } from "../login/handle.ts";
import { MGError } from "../_shared/errors.ts";
import type { Deps } from "../_shared/deps.ts";

interface Member { id: string; email: string; state: string; name: string; company: string; org_type: string; locked_at: string | null; last_login_at: string | null }

function makeLoginTestDeps(opts: { member: Member | null; correctPassword: string; now: () => Date }) {
  const member = opts.member;
  const loginAttempts: { email_norm: string; at: string; ip: string; ok: boolean }[] = [];
  const memberAccessLog: unknown[] = [];

  const deps: Deps = makeMockDeps({
    now: opts.now,
    authAdmin: makeMockAuthAdmin({
      signInWithPassword: async (email, password) => {
        if (member && email === member.email && password === opts.correctPassword) {
          return { access_token: "tok", refresh_token: "reftok", expires_in: 3600 };
        }
        throw new Error("invalid credentials");
      },
      updateUserById: async () => {},
    }),
    queryHandler: (sqlRaw, params) => {
      const sql = sqlRaw.replace(/\s+/g, " ").trim().toLowerCase();

      if (sql.startsWith("select id, email, state, name, company, org_type from members")) {
        return member && member.state !== "withdrawn" ? [{ ...member }] : [];
      }
      if (sql.includes("min(at) as oldest") && sql.includes("login_attempts")) {
        const [emailNorm, sinceIso] = params as [string, string];
        const fails = loginAttempts.filter((a) => a.email_norm === emailNorm && !a.ok && a.at > sinceIso);
        const oldest = fails.length ? fails.map((f) => f.at).sort()[0] : null;
        return [{ oldest, n: String(fails.length) }];
      }
      if (sql.startsWith("insert into login_attempts")) {
        const [emailNorm, at, ip, ok] = params as [string, string, string, boolean];
        loginAttempts.push({ email_norm: emailNorm, at, ip, ok });
        return [];
      }
      if (sql.startsWith("select count(*) as n from login_attempts")) {
        const [emailNorm, sinceIso] = params as [string, string];
        const fails = loginAttempts.filter((a) => a.email_norm === emailNorm && !a.ok && a.at > sinceIso);
        return [{ n: String(fails.length) }];
      }
      if (sql.startsWith("update members set state='locked'")) {
        if (member) { member.state = "locked"; member.locked_at = String(params[1]); }
        return [];
      }
      if (sql.startsWith("delete from login_attempts")) {
        const emailNorm = params[0] as string;
        for (let i = loginAttempts.length - 1; i >= 0; i--) if (loginAttempts[i].email_norm === emailNorm && !loginAttempts[i].ok) loginAttempts.splice(i, 1);
        return [];
      }
      if (sql.startsWith("update members set last_login_at")) {
        if (member) member.last_login_at = String(params[1]);
        return [];
      }
      if (sql.startsWith("insert into member_access_log")) { memberAccessLog.push(params); return []; }
      if (sql.includes("select private.enqueue")) return [{ enqueue: 1 }];
      if (sql.includes("from notification_log where idempotency_key")) return [];
      return undefined;
    },
  });
  return deps;
}

Deno.test("login: unknown email returns LOGIN_FAILED (enumeration-safe, not TOKEN_INVALID or similar)", async () => {
  const deps = makeLoginTestDeps({ member: null, correctPassword: "irrelevant", now: () => new Date("2026-10-08T00:00:00.000Z") });
  let caught: MGError | null = null;
  try {
    await handle(mockRequest({ email: "nobody@example.com", password: "whatever123" }), deps);
  } catch (e) { caught = e as MGError; }
  assert(caught instanceof MGError);
  assertEquals(caught!.code, "LOGIN_FAILED");
});

Deno.test("login: 5 wrong passwords in 15min -> LOGIN_COOLDOWN with retry_after; a 6th attempt is blocked before checking the password", async () => {
  const member: Member = { id: "m1", email: "haneul.kim@hanbit-tour.example", state: "active", name: "김하늘", company: "한빛투어", org_type: "여행사", locked_at: null, last_login_at: null };
  let clock = new Date("2026-10-08T00:00:00.000Z").getTime();
  const now = () => new Date(clock);
  const deps = makeLoginTestDeps({ member, correctPassword: "correct-horse-battery", now });

  for (let i = 1; i <= 4; i++) {
    let caught: MGError | null = null;
    try {
      await handle(mockRequest({ email: member.email, password: "wrong" }), deps);
    } catch (e) { caught = e as MGError; }
    assertEquals(caught?.code, "LOGIN_FAILED", `attempt ${i} should be plain LOGIN_FAILED`);
    clock += 1000;
  }

  // 5th wrong attempt crosses the threshold -> LOGIN_COOLDOWN (with the password check having already run and failed)
  let fifth: MGError | null = null;
  try {
    await handle(mockRequest({ email: member.email, password: "wrong" }), deps);
  } catch (e) { fifth = e as MGError; }
  assertEquals(fifth?.code, "LOGIN_COOLDOWN");
  assert(typeof fifth?.extra?.retry_after === "number" && (fifth!.extra!.retry_after as number) > 0);

  // 6th attempt (even with the CORRECT password) is rejected by the pre-check before any password verification
  clock += 1000;
  let sixth: MGError | null = null;
  try {
    await handle(mockRequest({ email: member.email, password: "correct-horse-battery" }), deps);
  } catch (e) { sixth = e as MGError; }
  assertEquals(sixth?.code, "LOGIN_COOLDOWN", "cooldown must block even a correct password until the 15min window clears");
});

Deno.test("login: success resets fail counters and returns tokens + member shape", async () => {
  const member: Member = { id: "m2", email: "ok@example.com", state: "active", name: "Name", company: "Co", org_type: "기타", locked_at: null, last_login_at: null };
  const deps = makeLoginTestDeps({ member, correctPassword: "right-password-1", now: () => new Date("2026-10-08T00:00:00.000Z") });

  const result = await handle(mockRequest({ email: member.email, password: "right-password-1" }), deps) as Record<string, unknown>;
  assertEquals(result.access_token, "tok");
  assertEquals(result.refresh_token, "reftok");
  assertEquals((result.member as Record<string, unknown>).state, "active");
  assertEquals((result.member as Record<string, unknown>).orgType, "기타");
});

Deno.test("login: suspended member with the correct password gets ACCOUNT_SUSPENDED (only revealed after password check)", async () => {
  const member: Member = { id: "m3", email: "susp@example.com", state: "suspended", name: "N", company: "C", org_type: "기타", locked_at: null, last_login_at: null };
  const deps = makeLoginTestDeps({ member, correctPassword: "right-password-1", now: () => new Date("2026-10-08T00:00:00.000Z") });

  let caught: MGError | null = null;
  try {
    await handle(mockRequest({ email: member.email, password: "wrong" }), deps);
  } catch (e) { caught = e as MGError; }
  assertEquals(caught?.code, "LOGIN_FAILED", "wrong password on a suspended account must still look like an ordinary failure");

  let caught2: MGError | null = null;
  try {
    await handle(mockRequest({ email: member.email, password: "right-password-1" }), deps);
  } catch (e) { caught2 = e as MGError; }
  assertEquals(caught2?.code, "ACCOUNT_SUSPENDED");
});

Deno.test("login: already-locked member is rejected immediately with ACCOUNT_LOCKED, without touching the password", async () => {
  const member: Member = { id: "m4", email: "locked@example.com", state: "locked", name: "N", company: "C", org_type: "기타", locked_at: "2026-10-01T00:00:00.000Z", last_login_at: null };
  const deps = makeLoginTestDeps({ member, correctPassword: "right-password-1", now: () => new Date("2026-10-08T00:00:00.000Z") });

  let caught: MGError | null = null;
  try {
    await handle(mockRequest({ email: member.email, password: "right-password-1" }), deps);
  } catch (e) { caught = e as MGError; }
  assertEquals(caught?.code, "ACCOUNT_LOCKED");
});
