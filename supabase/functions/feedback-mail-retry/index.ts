// Deno.serve 진입점. cron(x-internal-secret, Origin 없음)과 콘솔 단건(Bearer + 콘솔 Origin) 을 모두 받는다.
import { defaultDeps } from "../_shared/deps.ts";
import { resolveConsoleOrigin, feedbackCorsHeaders } from "../_shared/feedback_cors.ts";
import { handle, RetryError } from "./handle.ts";

function jsonResponse(status: number, body: unknown, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const deps = defaultDeps();
  // cron 호출은 Origin 헤더가 없다 — 그 경우 CORS 헤더 없이 처리한다. 브라우저(콘솔) 호출만 Origin 검사한다.
  const headers = origin ? feedbackCorsHeaders(resolveConsoleOrigin(origin, deps.env)) : { "Cache-Control": "no-store" };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return jsonResponse(405, { ok: false, error: { code: "METHOD_NOT_ALLOWED" } }, headers);

  try {
    const result = await handle(req, deps);
    return jsonResponse(200, result, headers);
  } catch (e) {
    const err = e instanceof RetryError ? e : new RetryError("INTERNAL");
    if (!(e instanceof RetryError)) console.error("feedback-mail-retry unhandled error:", e);
    return jsonResponse(err.status, { ok: false, error: { code: err.code } }, headers);
  }
});
