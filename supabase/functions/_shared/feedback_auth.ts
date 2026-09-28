// 피드백 세션 검증 · 유저 유형 서버 판정. SPEC_FEEDBACK.md D3, §4.5.
// 클라이언트는 member_id 를 보내지 않는다 — 본문 auth.access_token 을 deps.authAdmin.getUser() 로 직접 검증한다
// (Authorization 헤더가 아니다 — D1/D2: 헤더를 붙이면 CORS preflight 가 생긴다).
import type { Deps, AuthUser } from "./deps.ts";

export interface ResolvedIdentity {
  isOperator: boolean;
  memberId: string | null;
  email: string | null;
}

// 세션 검증 실패(토큰 없음/만료/잘못됨)는 조용히 비회원으로 처리한다(§3.3 순서 10) — 절대 던지지 않는다.
export async function resolveSession(deps: Deps, accessToken: string | null): Promise<ResolvedIdentity> {
  if (!accessToken) return { isOperator: false, memberId: null, email: null };
  let user: AuthUser | null = null;
  try {
    user = await deps.authAdmin.getUser(accessToken);
  } catch {
    user = null;
  }
  if (!user) return { isOperator: false, memberId: null, email: null };
  const isOperator = (user.app_metadata as Record<string, unknown> | undefined)?.role === "operator";
  return { isOperator, memberId: isOperator ? null : user.id, email: user.email };
}

export type FeedbackUserType = "travel_agency" | "organizer_guest" | "hotel" | "admin" | "visitor";

// §4.5 서버 판정: operator JWT→admin; bid+hash→hotel; JWT(비운영자)→travel_agency; track|share+hash→organizer_guest; 그 밖 visitor.
export function deriveUserType(identity: ResolvedIdentity, tokenKind: string | null): FeedbackUserType {
  if (identity.isOperator) return "admin";
  if (tokenKind === "bid") return "hotel";
  if (identity.memberId) return "travel_agency";
  if (tokenKind === "track" || tokenKind === "share") return "organizer_guest";
  return "visitor";
}
