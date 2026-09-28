// OTP 수명주기 단위 테스트 (SPEC_LAUNCH.md §8: "wrong → remaining, 5 wrong → void or lock, cooldown, cap").
// 실제 _shared/otp.ts 구현을 in-memory mock DbClient 위에서 그대로 실행한다 (재구현이 아니라 실물 테스트).
import { assert, assertEquals } from "./_assert.ts";
import { makeOtpMockDb } from "./otp_mock_db.ts";
import { createOtp, verifyOtp } from "../_shared/otp.ts";
import { MGError } from "../_shared/errors.ts";

function fixedRand(byte: number) {
  return (n: number) => new Uint8Array(n).fill(byte);
}

Deno.test("OTP: wrong code reports remaining attempts, then void after 5th wrong (email-style, no lock)", async () => {
  let clock = new Date("2026-10-08T00:00:00.000Z").getTime();
  const now = () => new Date(clock);
  const db = makeOtpMockDb(now);
  const otp = await createOtp(db, now, fixedRand(1), {
    purpose: "signup_email", target: "a@b.com", ttlSeconds: 600, cooldownSeconds: 60, maxAttempts: 5, dailyCap: 10, pepper: "pepper",
  });
  assertEquals(otp.code.length, 6);

  for (let i = 1; i <= 4; i++) {
    let threw = false;
    try {
      await verifyOtp(db, now, { otpId: otp.otpId, code: "000000", pepper: "pepper" });
    } catch (e) {
      threw = true;
      assert(e instanceof MGError && e.code === "OTP_WRONG", `expected OTP_WRONG, got ${(e as MGError).code}`);
      assertEquals((e as MGError).extra?.remaining, 5 - i, `wrong attempt ${i} should report remaining=${5 - i}`);
    }
    assert(threw, `attempt ${i} should have thrown`);
  }

  // 5th wrong attempt -> void (lockSeconds 를 넘기지 않았으므로)
  let voided = false;
  try {
    await verifyOtp(db, now, { otpId: otp.otpId, code: "000000", pepper: "pepper" });
  } catch (e) {
    voided = true;
    assert(e instanceof MGError && e.code === "OTP_VOID", `expected OTP_VOID, got ${(e as MGError).code}`);
  }
  assert(voided, "5th wrong attempt should void the code");

  // void 후에는 올바른 코드를 넣어도 OTP_VOID
  let stillVoid = false;
  try {
    await verifyOtp(db, now, { otpId: otp.otpId, code: otp.code, pepper: "pepper" });
  } catch (e) {
    stillVoid = true;
    assert(e instanceof MGError && e.code === "OTP_VOID");
  }
  assert(stillVoid, "voided code must stay void even with the correct code");
});

Deno.test("OTP: 5 wrong attempts locks for 10 minutes when lockSeconds is given (pick / phone-style)", async () => {
  let clock = new Date("2026-10-08T00:00:00.000Z").getTime();
  const now = () => new Date(clock);
  const db = makeOtpMockDb(now);
  // ttlSeconds 는 잠금 해제 시점(10분 뒤) 이후에도 코드가 아직 만료되지 않도록 넉넉히 잡는다
  // (실제 pick/phone OTP 는 ttl 3분이라 10분 잠금보다 먼저 만료되지만, 여기서는 "잠금이 attempts 카운트와
  // 별개로 정확히 10분 뒤 풀린다"는 것만 독립적으로 검증한다).
  const otp = await createOtp(db, now, fixedRand(2), {
    purpose: "pick", target: "01099998888", ttlSeconds: 900, cooldownSeconds: 60, maxAttempts: 5, dailyCap: 10, pepper: "pepper",
  });

  for (let i = 0; i < 4; i++) {
    try {
      await verifyOtp(db, now, { otpId: otp.otpId, code: "000000", pepper: "pepper", lockSeconds: 600 });
    } catch { /* expected OTP_WRONG */ }
  }
  let locked = false;
  try {
    await verifyOtp(db, now, { otpId: otp.otpId, code: "000000", pepper: "pepper", lockSeconds: 600 });
  } catch (e) {
    locked = true;
    assert(e instanceof MGError && e.code === "OTP_LOCKED", `expected OTP_LOCKED, got ${(e as MGError).code}`);
  }
  assert(locked, "5th wrong attempt should lock");

  // 잠금 중에는 올바른 코드도 거부된다
  let stillLocked = false;
  try {
    await verifyOtp(db, now, { otpId: otp.otpId, code: otp.code, pepper: "pepper", lockSeconds: 600 });
  } catch (e) {
    stillLocked = true;
    assert(e instanceof MGError && e.code === "OTP_LOCKED");
  }
  assert(stillLocked, "correct code during lock window must still be OTP_LOCKED");

  // 10분 뒤에는 잠금이 풀린다
  clock += 601_000;
  const row = await verifyOtp(db, now, { otpId: otp.otpId, code: otp.code, pepper: "pepper", lockSeconds: 600 });
  assertEquals(row.id, otp.otpId);
});

Deno.test("OTP: resend before cooldown throws OTP_COOLDOWN; daily cap throws OTP_CAP", async () => {
  let clock = new Date("2026-10-08T00:00:00.000Z").getTime();
  const now = () => new Date(clock);
  const db = makeOtpMockDb(now);
  const args = { purpose: "phone_change" as const, target: "01011112222", ttlSeconds: 180, cooldownSeconds: 60, maxAttempts: 5, dailyCap: 2, pepper: "pepper" };

  await createOtp(db, now, fixedRand(3), args);
  let cooldown = false;
  try {
    await createOtp(db, now, fixedRand(3), args);
  } catch (e) {
    cooldown = true;
    assert(e instanceof MGError && e.code === "OTP_COOLDOWN");
  }
  assert(cooldown, "resending inside the cooldown window should throw OTP_COOLDOWN");

  clock += 61_000; // 쿨다운을 넘긴다
  await createOtp(db, now, fixedRand(3), args); // 2번째 발송 (dailyCap=2 이므로 아직 허용)

  clock += 61_000;
  let capped = false;
  try {
    await createOtp(db, now, fixedRand(3), args); // 3번째 발송은 cap 초과
  } catch (e) {
    capped = true;
    assert(e instanceof MGError && e.code === "OTP_CAP");
  }
  assert(capped, "3rd send with dailyCap=2 should throw OTP_CAP");
});

Deno.test("OTP: correct code on first try consumes it; reusing a consumed code throws OTP_EXPIRED", async () => {
  const now = () => new Date("2026-10-08T00:00:00.000Z");
  const db = makeOtpMockDb(now);
  const otp = await createOtp(db, now, fixedRand(4), {
    purpose: "signup_phone", target: "01033334444", ttlSeconds: 180, cooldownSeconds: 60, maxAttempts: 5, dailyCap: 5, pepper: "pepper",
  });
  const row = await verifyOtp(db, now, { otpId: otp.otpId, code: otp.code, pepper: "pepper" });
  assertEquals(row.id, otp.otpId);

  let expired = false;
  try {
    await verifyOtp(db, now, { otpId: otp.otpId, code: otp.code, pepper: "pepper" });
  } catch (e) {
    expired = true;
    assert(e instanceof MGError && e.code === "OTP_EXPIRED");
  }
  assert(expired, "verifying an already-consumed code should throw OTP_EXPIRED");
});

Deno.test("OTP: MG_DEMO_OTP fixed code (123456) still goes through the normal hash/verify path", async () => {
  const now = () => new Date("2026-10-08T00:00:00.000Z");
  const db = makeOtpMockDb(now);
  const otp = await createOtp(db, now, fixedRand(5), {
    purpose: "pick", target: "01055556666", ttlSeconds: 180, cooldownSeconds: 60, maxAttempts: 5, dailyCap: 10, pepper: "pepper", demoFixedCode: "123456",
  });
  assertEquals(otp.code, "123456");
  const row = await verifyOtp(db, now, { otpId: otp.otpId, code: "123456", pepper: "pepper" });
  assertEquals(row.id, otp.otpId);
});
