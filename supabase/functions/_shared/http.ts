// 공통 HTTP 유틸: CORS, JSON 파싱/응답, IP 해시.
import { MGError, errorBody } from "./errors.ts";

export function corsHeaders(origin: string | null, allowedOrigins: string[], notifyModeLog: boolean): HeadersInit {
  let allow = "";
  if (origin && allowedOrigins.includes(origin)) allow = origin;
  else if (origin === "null" && notifyModeLog) allow = "null";
  else if (allowedOrigins.includes("*")) allow = "*";
  return {
    "Access-Control-Allow-Origin": allow || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

export function jsonResponse(status: number, body: unknown, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text) return {};
    const v = JSON.parse(text);
    if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error("not an object");
    return v as Record<string, unknown>;
  } catch {
    throw new MGError("BAD_REQUEST");
  }
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  return first || "0.0.0.0";
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const enc = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 표준 핸들러 실행기: 성공은 200 JSON, MGError 는 매핑된 상태 코드로, 그 외는 INTERNAL 로 감싼다.
export async function serve(
  req: Request,
  opts: { allowedOrigins: string[]; notifyModeLog: boolean },
  fn: (req: Request) => Promise<unknown>,
): Promise<Response> {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin, opts.allowedOrigins, opts.notifyModeLog);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  try {
    const data = await fn(req);
    return jsonResponse(200, data, headers);
  } catch (e) {
    const err = e instanceof MGError ? e : new MGError("INTERNAL");
    if (!(e instanceof MGError)) console.error("unhandled error:", e);
    const { status, body } = errorBody(err);
    return jsonResponse(status, body, headers);
  }
}
