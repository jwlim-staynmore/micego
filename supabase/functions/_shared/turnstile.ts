// Cloudflare Turnstile 서버 검증(D-50).  - 클로드
// · TURNSTILE_SECRET 이 없으면 검사하지 않는다(로컬·스테이징·키 발급 전). isolate 당 한 번 경고 로그.
// · 시크릿이 있으면 fail-closed: 토큰 없음·검증 실패·Cloudflare 응답 없음은 모두 TURNSTILE_FAILED(403).
//   급할 때 완화는 시크릿을 지우는 것(재배포·재빌드 불필요).
// · 토큰은 1회용이라 호출 위치는 필드 검증 뒤, DB 쓰기 직전이다.
import type { Deps } from "./deps.ts";
import { MGError } from "./errors.ts";
import { clientIp } from "./http.ts";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
let warned = false;

export async function requireTurnstile(
  deps: Deps,
  req: Request,
  token: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const secret = deps.env.TURNSTILE_SECRET;
  if (!secret) {
    if (!warned) { console.warn("turnstile: skipped (no TURNSTILE_SECRET)"); warned = true; }
    return;
  }
  if (typeof token !== "string" || token.length < 1 || token.length > 2048) {
    console.error("turnstile: rejected missing");
    throw new MGError("TURNSTILE_FAILED");
  }
  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  const ip = clientIp(req);
  if (ip) form.set("remoteip", ip);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  let data: { success?: boolean; "error-codes"?: string[] } = {};
  try {
    const res = await fetchImpl(VERIFY_URL, { method: "POST", body: form, signal: ctrl.signal });
    data = await res.json();
  } catch (e) {
    console.error("turnstile: rejected unavailable", String(e));
    throw new MGError("TURNSTILE_FAILED");
  } finally {
    clearTimeout(timer);
  }
  if (data.success !== true) {
    console.error("turnstile: rejected invalid", (data["error-codes"] ?? []).join(","));
    throw new MGError("TURNSTILE_FAILED");
  }
}
