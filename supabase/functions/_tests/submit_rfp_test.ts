// submit_rfp 검증 매트릭스 + 성공 경로 테스트 (SPEC_LAUNCH.md §8: "the validation matrix").
// ko/index.html #registerForm 의 validate() 를 서버가 그대로 재현하는지 확인한다.
import { assert, assertEquals } from "./_assert.ts";
import { makeMockDeps, mockRequest } from "./mock_deps.ts";
import { handle } from "../submit_rfp/handle.ts";
import { MGError } from "../_shared/errors.ts";

const VALID_BODY = {
  orgType: "여행사", company: "한빛투어", name: "김하늘", email: "haneul.kim@hanbit-tour.example",
  phone: "010-2345-5678", eventType: "인센티브", startDate: "2026-11-01", endDate: "2026-11-03",
  headcount: "50~100명", region: "다낭", twinRooms: 20, kingRooms: 5,
  ballroomUse: "사용", ballroomPurpose: "디너", note: "", consent: true,
};

async function expectValidationField(body: Record<string, unknown>, fieldName: string) {
  const deps = makeMockDeps({
    queryHandler: (sql) => {
      const s = sql.toLowerCase();
      if (s.includes("insert into rfps")) return [{ id: "rfp-1", created_at: "2026-10-08T00:00:00.000Z" }];
      return undefined;
    },
  });
  let caught: MGError | null = null;
  try {
    await handle(mockRequest(body), deps);
  } catch (e) {
    caught = e as MGError;
  }
  assert(caught instanceof MGError, `expected MGError for missing/invalid ${fieldName}`);
  assertEquals(caught!.code, "VALIDATION", `expected VALIDATION for ${fieldName}, got ${caught!.code}`);
  const names = (caught!.fields ?? []).map((f) => f.name);
  assert(names.includes(fieldName), `expected fields to include "${fieldName}", got [${names.join(",")}]`);
}

Deno.test("submit_rfp validation: missing orgType", async () => {
  await expectValidationField({ ...VALID_BODY, orgType: "" }, "orgType");
});
Deno.test("submit_rfp validation: empty company", async () => {
  await expectValidationField({ ...VALID_BODY, company: "  " }, "company");
});
Deno.test("submit_rfp validation: name too short", async () => {
  await expectValidationField({ ...VALID_BODY, name: "김" }, "name");
});
Deno.test("submit_rfp validation: malformed email", async () => {
  await expectValidationField({ ...VALID_BODY, email: "not-an-email" }, "email");
});
Deno.test("submit_rfp validation: phone not Korean mobile format", async () => {
  await expectValidationField({ ...VALID_BODY, phone: "02-1234-5678" }, "phone");
});
Deno.test("submit_rfp validation: endDate before startDate", async () => {
  await expectValidationField({ ...VALID_BODY, startDate: "2026-11-10", endDate: "2026-11-01" }, "endDate");
});
Deno.test("submit_rfp validation: unknown headcount band", async () => {
  await expectValidationField({ ...VALID_BODY, headcount: "아무거나" }, "headcount");
});
Deno.test("submit_rfp validation: negative twinRooms", async () => {
  await expectValidationField({ ...VALID_BODY, twinRooms: -1 }, "twinRooms");
});
Deno.test("submit_rfp validation: ballroomPurpose required only when ballroomUse is 사용", async () => {
  await expectValidationField({ ...VALID_BODY, ballroomUse: "사용", ballroomPurpose: "" }, "ballroomPurpose");
});
Deno.test("submit_rfp validation: ballroomPurpose NOT required when ballroomUse is 미사용", async () => {
  const deps = makeMockDeps({
    queryHandler: (sql) => {
      const s = sql.toLowerCase();
      if (s.includes("insert into rfps")) return [{ id: "rfp-1", created_at: "2026-10-08T00:00:00.000Z" }];
      if (s.includes("select private.next_ref")) return [{ next_ref: "MG-2610-001" }];
      return undefined;
    },
  });
  const result = await handle(mockRequest({ ...VALID_BODY, ballroomUse: "미사용", ballroomPurpose: "" }), deps) as Record<string, unknown>;
  assertEquals(result.ref, "MG-2610-001");
});
Deno.test("submit_rfp validation: consent must be true", async () => {
  await expectValidationField({ ...VALID_BODY, consent: false }, "consent");
});
Deno.test("submit_rfp validation: startDate must not be in the past (KST)", async () => {
  await expectValidationField({ ...VALID_BODY, startDate: "2020-01-01" }, "startDate");
});

Deno.test("submit_rfp: happy path inserts an rfp, a track token, enqueues ORG_RECEIVED, and returns ref+track_url", async () => {
  const inserted: Record<string, unknown[]> = {};
  const deps = makeMockDeps({
    queryHandler: (sql, params) => {
      const s = sql.toLowerCase();
      if (s.includes("select private.next_ref")) return [{ next_ref: "MG-2610-002" }];
      if (s.includes("insert into rfps")) { inserted.rfp = params; return [{ id: "rfp-42", created_at: "2026-10-08T00:00:00.000Z" }]; }
      if (s.includes("insert into rfp_tokens")) { inserted.token = params; return []; }
      if (s.includes("select private.enqueue")) return [{ enqueue: 1 }];
      if (s.includes("from notification_log where idempotency_key")) return []; // 즉시발송 대상 없음 (dispatch_one 스킵)
      return undefined;
    },
  });
  const result = await handle(mockRequest(VALID_BODY), deps) as Record<string, unknown>;
  assertEquals(result.ref, "MG-2610-002");
  assert(typeof result.track_token === "string" && (result.track_token as string).length > 0);
  assert((result.track_url as string).startsWith("https://micego.example/ko/track.html?t="));
  assert((result.track_url as string).endsWith(result.track_token as string), "track_url should embed track_token");
});
