// partner_commission_accept: lookup 은 토큰을 소비하지 않고, accept 만 apply 를 호출하며 IP 해시를 넘긴다.  - 클로드
import { assert, assertEquals } from "./_assert.ts";
import { makeMockDeps, mockRequest } from "./mock_deps.ts";
import { handle } from "../partner_commission_accept/handle.ts";
import { MGError } from "../_shared/errors.ts";

const TOKEN = "abcdefghijklmnopqrstuvwx-_0123456789ABCD".slice(0, 32);

Deno.test("commission_accept: lookup 은 lookup 함수만 호출하고 apply 는 부르지 않는다", async () => {
  const calls: string[] = [];
  const deps = makeMockDeps({
    queryHandler: (sql) => {
      const s = sql.toLowerCase();
      if (s.includes("partner_commission_lookup")) { calls.push("lookup"); return [{ v: { hotel: "Ocean Pearl", ratePct: 10, status: "pending" } }]; }
      if (s.includes("partner_commission_apply")) { calls.push("apply"); return [{ v: { ok: true } }]; }
      return undefined;
    },
  });
  const res = await handle(mockRequest({ token: TOKEN, action: "lookup" }), deps) as Record<string, unknown>;
  assertEquals(res.status, "pending");
  assertEquals(calls, ["lookup"]);
});

Deno.test("commission_accept: action 생략 시 lookup 으로 처리", async () => {
  const deps = makeMockDeps({ queryHandler: (sql) => sql.toLowerCase().includes("partner_commission_lookup") ? [{ v: { status: "pending" } }] : undefined });
  const res = await handle(mockRequest({ token: TOKEN }), deps) as Record<string, unknown>;
  assertEquals(res.status, "pending");
});

Deno.test("commission_accept: 없는 토큰은 TOKEN_INVALID", async () => {
  const deps = makeMockDeps({ queryHandler: (sql) => sql.toLowerCase().includes("partner_commission_lookup") ? [{ v: null }] : undefined });
  let caught: MGError | null = null;
  try { await handle(mockRequest({ token: TOKEN, action: "lookup" }), deps); } catch (e) { caught = e as MGError; }
  assert(caught instanceof MGError);
  assertEquals(caught!.code, "TOKEN_INVALID");
});

Deno.test("commission_accept: accept 는 apply 에 토큰과 IP 해시를 넘긴다", async () => {
  let params: unknown[] = [];
  const deps = makeMockDeps({
    queryHandler: (sql, p) => {
      if (sql.toLowerCase().includes("partner_commission_apply")) { params = p; return [{ v: { ok: true, status: "accepted" } }]; }
      return undefined;
    },
  });
  const res = await handle(mockRequest({ token: TOKEN, action: "accept" }), deps) as Record<string, unknown>;
  assertEquals(res.status, "accepted");
  assertEquals(params[0], TOKEN);
  assert(typeof params[1] === "string" && (params[1] as string).length > 8, "ip hash expected");
});

Deno.test("commission_accept: SQL 의 MG:TOKEN_USED 는 TOKEN_USED 로 매핑", async () => {
  const deps = makeMockDeps({
    queryHandler: (sql) => {
      if (sql.toLowerCase().includes("partner_commission_apply")) throw new Error("MG:TOKEN_USED");
      return undefined;
    },
  });
  let caught: MGError | null = null;
  try { await handle(mockRequest({ token: TOKEN, action: "accept" }), deps); } catch (e) { caught = e as MGError; }
  assertEquals(caught?.code, "TOKEN_USED");
});

Deno.test("commission_accept: 형식이 다른 토큰·알 수 없는 action 은 BAD_REQUEST", async () => {
  for (const body of [{ token: "short", action: "lookup" }, { token: TOKEN, action: "confirm" }, { action: "lookup" }]) {
    let caught: MGError | null = null;
    try { await handle(mockRequest(body), makeMockDeps()); } catch (e) { caught = e as MGError; }
    assertEquals(caught?.code, "BAD_REQUEST");
  }
});
