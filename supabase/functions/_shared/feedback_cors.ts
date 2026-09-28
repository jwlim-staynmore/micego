// 피드백 전용 CORS. SPEC_FEEDBACK.md §3.7 / D1/D2/D4.
// 기존 _shared/http.ts 의 corsHeaders() 는 apikey/Authorization 헤더를 Allow-Headers 에 포함해
// (SITE_ORIGINS 도 이 함수용이 아니다) 단순 요청(D1) 전제와 맞지 않는다. feedback-submit/feedback-mail-retry
// 는 각자 다른 origin 목록·판정 규칙을 쓰므로 별도로 둔다.

export interface OriginResolution {
  allowed: boolean;
  isDemo: boolean; // D4: 스테이징 Origin이면 항상 true, 운영이면 항상 false. 클라이언트 힌트는 무시.
  originHeader: string; // 허용 시 Access-Control-Allow-Origin 에 그대로 echo. 불허면 "".
}

function parseList(v: string | undefined): string[] {
  return (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

// FEEDBACK_ALLOWED_ORIGINS(운영) / FEEDBACK_STAGING_ORIGINS(스테이징) 중 어디에 속하는지로 판정한다.
export function resolveOrigin(origin: string | null, env: Record<string, string | undefined>): OriginResolution {
  if (!origin) return { allowed: false, isDemo: false, originHeader: "" };
  const prod = parseList(env.FEEDBACK_ALLOWED_ORIGINS);
  const staging = parseList(env.FEEDBACK_STAGING_ORIGINS);
  if (prod.includes(origin)) return { allowed: true, isDemo: false, originHeader: origin };
  if (staging.includes(origin)) return { allowed: true, isDemo: true, originHeader: origin };
  return { allowed: false, isDemo: false, originHeader: "" };
}

// feedback-mail-retry 단건(브라우저·콘솔) 호출은 콘솔 도메인만 허용한다 (§3.10).
export function resolveConsoleOrigin(origin: string | null, env: Record<string, string | undefined>): OriginResolution {
  if (!origin) return { allowed: false, isDemo: false, originHeader: "" };
  let consoleOrigin = "";
  try {
    consoleOrigin = new URL(env.FEEDBACK_CONSOLE_BASE_URL ?? "").origin;
  } catch {
    consoleOrigin = "";
  }
  if (consoleOrigin && origin === consoleOrigin) return { allowed: true, isDemo: false, originHeader: origin };
  return { allowed: false, isDemo: false, originHeader: "" };
}

// 응답 헤더: 허용이면 ACAO echo, 불허(null 포함)면 ACAO 없음(§3.7). 오류 응답에도 Vary: Origin 을 넣는다.
export function feedbackCorsHeaders(res: OriginResolution): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
  if (res.allowed) headers["Access-Control-Allow-Origin"] = res.originHeader;
  return headers;
}
