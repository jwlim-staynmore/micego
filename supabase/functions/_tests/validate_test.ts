// 검증 헬퍼 단위 테스트 — 비밀번호 규칙(SPEC_ACCOUNTS.md A1), 이메일/전화 정규식, 전화번호 정규화/마스킹.
import { assert, assertEquals } from "./_assert.ts";
import { RE_EMAIL, RE_PHONE_KR, validatePassword, normalizePhone, maskPhone, digitsOnly, isIsoDate } from "../_shared/validate.ts";

Deno.test("RE_EMAIL matches ko/index.html's EMAIL_RE exactly (TLD needs >=2 chars)", () => {
  assert(RE_EMAIL.test("a@b.co"));
  assert(RE_EMAIL.test("haneul.kim@hanbit-tour.example"));
  assert(!RE_EMAIL.test("a@b.c")); // TLD 1글자는 거부
  assert(!RE_EMAIL.test("no-at-sign"));
  assert(!RE_EMAIL.test("a @b.com")); // 공백 포함 거부
});

Deno.test("RE_PHONE_KR matches Korean mobile formats with/without dashes and +82", () => {
  assert(RE_PHONE_KR.test("010-1234-5678"));
  assert(RE_PHONE_KR.test("01012345678"));
  assert(RE_PHONE_KR.test("+82-10-1234-5678"));
  assert(RE_PHONE_KR.test("+82 10 1234 5678".replace(/\s+/g, ""))); // 클라이언트가 공백 제거 후 검사
  assert(!RE_PHONE_KR.test("02-1234-5678")); // 유선전화 거부
  assert(!RE_PHONE_KR.test("123"));
});

Deno.test("validatePassword: 10 chars minimum, 2-of-3 kinds under 12 chars, any kind at 12+, no email local-part", () => {
  // 10자 미만은 무조건 거부
  assert(!validatePassword("abc12345", "user@example.com")); // 8자
  // 10~11자: 2종 이상 필요
  assert(!validatePassword("abcdefghij", "user@example.com")); // 영문만 (1종)
  assert(validatePassword("abcdefgh12", "user@example.com")); // 영문+숫자 (2종)
  assert(validatePassword("abcdefg!23", "user@example.com")); // 영문+숫자+특수문자 (3종, 10자)
  // 12자 이상이면 종류 무관
  assert(validatePassword("aaaaaaaaaaaa", "user@example.com")); // 영문만이어도 12자면 통과
  // 이메일 로컬파트 포함 금지
  assert(!validatePassword("user12345678", "user@example.com")); // 'user' 포함
  assert(validatePassword("totallyfine123", "user@example.com"));
});

Deno.test("normalizePhone / maskPhone: strips separators, converts +82, masks middle digits", () => {
  assertEquals(normalizePhone("010-1234-5678"), "01012345678");
  assertEquals(normalizePhone("+82-10-1234-5678"), "01012345678");
  assertEquals(normalizePhone("+82 10 1234 5678"), "01012345678");
  assertEquals(maskPhone("01012345678"), "010-****-5678");
});

Deno.test("digitsOnly / isIsoDate helpers", () => {
  assertEquals(digitsOnly("010-1234-5678"), "01012345678");
  assert(isIsoDate("2026-10-08"));
  assert(!isIsoDate("2026/10/08"));
  assert(!isIsoDate(""));
});
