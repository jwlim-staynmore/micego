// Deno.serve 진입점. handle() 이 비즈니스 로직 전체를 맡고, 여기서는 OPTIONS/CORS/봉투/메일 발송 예약만 한다.
// SPEC_FEEDBACK.md D1/D2: 단순 CORS 요청, verify_jwt=false — 이 함수가 유일한 진입점.
import { defaultDeps } from "../_shared/deps.ts";
import { resolveOrigin, feedbackCorsHeaders } from "../_shared/feedback_cors.ts";
import { handle, sendFeedbackMail } from "./handle.ts";
import { FeedbackError, feedbackErrorBody } from "./errors.ts";

// Supabase Edge Runtime 전역. deno.json 의 lib(deno.window) 에는 없으므로 직접 선언한다.
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;

function jsonResponse(status: number, body: unknown, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const deps = defaultDeps();
  const originRes = resolveOrigin(origin, deps.env);
  const headers = feedbackCorsHeaders(originRes);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    const result = await handle(req, deps);
    if (result.mailRow) {
      const task = sendFeedbackMail(deps, result.mailRow, deps.env).catch((e) => console.error("feedback mail send failed:", e));
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(task);
    }
    return jsonResponse(result.status, result.body, headers);
  } catch (e) {
    const err = e instanceof FeedbackError ? e : new FeedbackError("INTERNAL");
    if (!(e instanceof FeedbackError)) console.error("feedback-submit unhandled error:", e);
    const { status, body } = feedbackErrorBody(err);
    return jsonResponse(status, body, headers);
  }
});
