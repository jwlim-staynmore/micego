// 피드백 전용 IP 추출/해시. SPEC_FEEDBACK.md §3.5.
// 기존 _shared/http.ts 의 clientIp()/hashIp() 는 x-forwarded-for 만 보고 plain SHA-256 을 쓴다 —
// 피드백은 cf-connecting-ip 우선순위 + IPv6 /64 + HMAC(pepper) 를 요구하므로 별도로 둔다.
// IP 원문/해시는 feedback 행에 저장하지 않는다(S6) — rate 이벤트에만 잠깐(48h) 남는다.

// 우선순위: cf-connecting-ip -> x-real-ip -> x-forwarded-for 첫 값. 없으면 "" (호출부가 'noip' 처리).
export function extractIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real && real.trim()) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "";
}

// IPv6 주소를 /64 접두사로 정규화한다(:: 압축 확장 포함). IPv4/빈 값은 그대로.
export function normalizeIp(rawIp: string): string {
  const ip = (rawIp || "").trim();
  if (!ip) return "";
  if (!ip.includes(":")) return ip; // IPv4
  const clean = ip.split("%")[0]; // zone id 제거
  const dc = clean.indexOf("::");
  let groups: string[];
  if (dc !== -1) {
    const left = clean.slice(0, dc).split(":").filter((s) => s.length > 0);
    const right = clean.slice(dc + 2).split(":").filter((s) => s.length > 0);
    const missing = Math.max(8 - left.length - right.length, 0);
    groups = [...left, ...Array(missing).fill("0"), ...right];
  } else {
    groups = clean.split(":");
  }
  const first4 = groups.slice(0, 4).map((g) => (g === "" ? "0" : g));
  while (first4.length < 4) first4.push("0");
  return first4.join(":") + "::/64";
}

// HMAC-SHA256(pepper, ip).slice(0,32). ip 가 없으면 공용 버킷 'noip' (해시하지 않는다).
export async function hashIpForRateLimit(rawIp: string, pepper: string): Promise<string> {
  const ip = normalizeIp(rawIp);
  if (!ip) return "noip";
  const keyData = new TextEncoder().encode(pepper || "");
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 32);
}
