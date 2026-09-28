// 민감한 동작(이메일/휴대전화/비밀번호 변경, 탈퇴)은 마지막 로그인 후 10분이 지났으면 비밀번호 재확인이 필요하다.
// SPEC_LAUNCH.md §3 account_update 행 / SPEC_ACCOUNTS.md A5.
import type { Deps } from "./deps.ts";
import { MGError } from "./errors.ts";
import type { MemberRow } from "./auth_ctx.ts";

const REAUTH_WINDOW_MS = 600_000; // 10분

export async function requireReauthIfStale(deps: Deps, member: MemberRow, password: string | undefined): Promise<void> {
  const lastMs = member.last_login_at ? new Date(member.last_login_at).getTime() : 0;
  if (deps.now().getTime() - lastMs <= REAUTH_WINDOW_MS) return; // 최근 로그인 -> 재인증 불필요
  if (!password) throw new MGError("REAUTH_REQUIRED");
  if (!member.email) throw new MGError("REAUTH_REQUIRED");
  try {
    await deps.authAdmin.signInWithPassword(member.email, password);
  } catch {
    throw new MGError("REAUTH_REQUIRED");
  }
}
