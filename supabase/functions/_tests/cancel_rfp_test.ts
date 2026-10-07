// cancel_rfp: 공유 링크 거절·사유 검증·DB 함수 호출·SQL 오류 매핑.  - 클로드
import { assert, assertEquals } from "./_assert.ts";
import { makeMockDeps, mockRequest } from "./mock_deps.ts";
import { handle } from "../cancel_rfp/handle.ts";
import { MGError } from "../_shared/errors.ts";

const TRACK = "trk_abcdefghijklmnopqrstuvwxyz012345";

function deps(over: { kind?: string; state?: string; cancelErr?: string; calls?: unknown[][] } = {}) {
  return makeMockDeps({
    queryHandler: (sql, p) => {
      const s = sql.toLowerCase();
      if (s.includes("from rfp_tokens")) return [{ id: "t1", rfp_id: "r1", state: over.state ?? "active", kind: over.kind ?? "track" }];
      if (s.includes("rfp_organizer_cancel")) {
        if (over.cancelErr) throw new Error(over.cancelErr);
        over.calls?.push(p);
        return [{ v: { state: "cancelled", already: false } }];
      }
      return undefined;
    },
  });
}
async function code(p: Promise<unknown>): Promise<string | null> {
  try { await p; return null; } catch (e) { return e instanceof MGError ? e.code : "OTHER"; }
}

Deno.test("cancel_rfp: 공유(보기 전용) 토큰은 FORBIDDEN_SHARE", async () => {
  assertEquals(await code(handle(mockRequest({ token: TRACK, reason: "일정 변경" }), deps({ kind: "share" }))), "FORBIDDEN_SHARE");
});

Deno.test("cancel_rfp: 목록에 없는 사유는 VALIDATION", async () => {
  assertEquals(await code(handle(mockRequest({ token: TRACK, reason: "그냥" }), deps())), "VALIDATION");
});

Deno.test("cancel_rfp: 기타는 메모가 있어야 한다", async () => {
  assertEquals(await code(handle(mockRequest({ token: TRACK, reason: "기타", note: "  " }), deps())), "VALIDATION");
});

Deno.test("cancel_rfp: 정상 요청은 rfp_organizer_cancel(rfp_id, reason, note) 를 부른다", async () => {
  const calls: unknown[][] = [];
  const res = await handle(mockRequest({ token: TRACK, reason: "행사 취소" }), deps({ calls })) as Record<string, unknown>;
  assertEquals(res.state, "cancelled");
  assertEquals(calls.length, 1);
  assertEquals(calls[0], ["r1", "행사 취소", null]);
});

Deno.test("cancel_rfp: 호텔 발송 뒤에는 CANCEL_NOT_ALLOWED", async () => {
  assertEquals(await code(handle(mockRequest({ token: TRACK, reason: "일정 변경" }), deps({ cancelErr: "MG:CANCEL_NOT_ALLOWED" }))), "CANCEL_NOT_ALLOWED");
});

Deno.test("cancel_rfp: 폐기된 토큰은 TOKEN_REVOKED", async () => {
  const c = await code(handle(mockRequest({ token: TRACK, reason: "일정 변경" }), deps({ state: "revoked" })));
  assert(c === "TOKEN_REVOKED");
});
