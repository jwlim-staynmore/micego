// Turnstile 서버 검증: 시크릿 없으면 통과, 있으면 fail-closed.  - 클로드
import { assert, assertEquals } from "./_assert.ts";
import { makeMockDeps, mockRequest } from "./mock_deps.ts";
import { requireTurnstile } from "../_shared/turnstile.ts";
import { MGError } from "../_shared/errors.ts";

function fakeFetch(resp: unknown, calls: unknown[] = []): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body) });
    return new Response(JSON.stringify(resp), { status: 200 });
  }) as unknown as typeof fetch;
}
async function code(p: Promise<unknown>): Promise<string | null> {
  try { await p; return null; } catch (e) { return e instanceof MGError ? e.code : "OTHER"; }
}

Deno.test("turnstile: 시크릿이 없으면 토큰 없이도 통과", async () => {
  const deps = makeMockDeps();
  assertEquals(await code(requireTurnstile(deps, mockRequest({}), undefined, fakeFetch({ success: false }))), null);
});

Deno.test("turnstile: 시크릿이 있고 토큰이 없으면 TURNSTILE_FAILED", async () => {
  const deps = makeMockDeps({ env: { TURNSTILE_SECRET: "s" } });
  assertEquals(await code(requireTurnstile(deps, mockRequest({}), "", fakeFetch({ success: true }))), "TURNSTILE_FAILED");
});

Deno.test("turnstile: success=false 는 거절", async () => {
  const deps = makeMockDeps({ env: { TURNSTILE_SECRET: "s" } });
  assertEquals(await code(requireTurnstile(deps, mockRequest({}), "tok", fakeFetch({ success: false, "error-codes": ["invalid-input-response"] }))), "TURNSTILE_FAILED");
});

Deno.test("turnstile: Cloudflare 응답이 없으면 fail-closed", async () => {
  const deps = makeMockDeps({ env: { TURNSTILE_SECRET: "s" } });
  const boom = (async () => { throw new Error("network"); }) as unknown as typeof fetch;
  assertEquals(await code(requireTurnstile(deps, mockRequest({}), "tok", boom)), "TURNSTILE_FAILED");
});

Deno.test("turnstile: 성공이면 통과하고 secret·response·remoteip 를 보낸다", async () => {
  const deps = makeMockDeps({ env: { TURNSTILE_SECRET: "s3" } });
  const calls: { url: string; body: string }[] = [];
  assertEquals(await code(requireTurnstile(deps, mockRequest({}), "tok1", fakeFetch({ success: true }, calls))), null);
  assertEquals(calls.length, 1);
  assert(calls[0].body.includes("secret=s3") && calls[0].body.includes("response=tok1") && calls[0].body.includes("remoteip=203.0.113.1"));
});
