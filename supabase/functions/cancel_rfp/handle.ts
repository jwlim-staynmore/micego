// POST /cancel_rfp — anon (진행 상황 토큰). 오거나이저가 호텔 발송 전에 요청을 직접 취소한다(D-47).  - 클로드
// body: { token, reason, note? }
// 허용 범위 판정(received·verifying, 또는 open + 초대 0건)은 DB 함수 private.rfp_organizer_cancel 이 한다.
import type { Deps } from "../_shared/deps.ts";
import { MGError, fromSqlError } from "../_shared/errors.ts";
import { asString } from "../_shared/validate.ts";
import { rateLimit } from "../_shared/ratelimit.ts";
import { isShareToken } from "../_shared/tokens.ts";
import { clientIp, hashIp } from "../_shared/http.ts";

export const CANCEL_REASONS = ["일정 변경", "다른 경로로 예약", "행사 취소", "기타"];

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const token = asString(body.token);
  const reason = asString(body.reason);
  const note = asString(body.note).trim();

  if (!token) throw new MGError("BAD_REQUEST");
  if (isShareToken(token)) throw new MGError("FORBIDDEN_SHARE");

  const ipHash = await hashIp(clientIp(req), deps.env.IP_HASH_SALT ?? "");
  await rateLimit(deps.db, "cancel_rfp_ip", ipHash, 10, 600);

  if (!CANCEL_REASONS.includes(reason)) throw new MGError("VALIDATION", { fields: [{ name: "reason", code: "invalid" }] });
  if (reason === "기타" && note.length < 1) throw new MGError("VALIDATION", { fields: [{ name: "note", code: "required" }] });
  if (note.length > 500) throw new MGError("VALIDATION", { fields: [{ name: "note", code: "length" }] });

  const trows = await deps.db.query<{ id: string; rfp_id: string; state: string; kind: string }>(
    `select id, rfp_id, state, kind from rfp_tokens where token=$1`,
    [token],
  );
  if (!trows.length) throw new MGError("TOKEN_INVALID");
  const trow = trows[0];
  if (trow.kind === "share") throw new MGError("FORBIDDEN_SHARE");
  if (trow.state !== "active") throw new MGError("TOKEN_REVOKED");

  await rateLimit(deps.db, "cancel_rfp", trow.rfp_id, 5, 86400);

  try {
    return await deps.db.scalar<Record<string, unknown>>(
      `select private.rfp_organizer_cancel($1,$2,$3)`,
      [trow.rfp_id, reason, note || null],
    );
  } catch (e) {
    throw fromSqlError(e);
  }
}
