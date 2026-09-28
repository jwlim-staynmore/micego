// 간단한 필드 검증 헬퍼. 실패 시 VALIDATION + fields[] 를 던진다.
import { MGError } from "./errors.ts";

export type FieldError = { name: string; code: string };

export class FieldErrors {
  errors: FieldError[] = [];
  require(name: string, value: unknown, code = "required") {
    if (value === undefined || value === null || value === "") this.errors.push({ name, code });
  }
  check(name: string, ok: boolean, code = "invalid") {
    if (!ok) this.errors.push({ name, code });
  }
  throwIfAny() {
    if (this.errors.length) throw new MGError("VALIDATION", { fields: this.errors });
  }
}

// ko/index.html #registerForm 의 validate() 와 정확히 동일한 정규식 (SPEC_LAUNCH.md §3: "same rules as the landing validate()").
export const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const RE_PHONE_KR = /^(?:01[016789]-?\d{3,4}-?\d{4}|\+82-?\s?10-?\d{3,4}-?\d{4})$/;
export const RE_TOKEN = /^[A-Za-z0-9_-]{4,64}$/;

export function digitsOnly(s: string): string {
  return (s || "").replace(/\D/g, "");
}

export function isIsoDate(s: unknown): boolean {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

export function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function asBool(v: unknown): boolean {
  return v === true || v === "true";
}

export function asNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
}

// 전화번호를 저장/비교용 표준형으로: 하이픈·공백 제거, +82 10 -> 010.
export function normalizePhone(raw: string): string {
  let s = (raw || "").trim().replace(/\s+/g, "");
  s = s.replace(/^\+82-?/, "0");
  s = s.replace(/-/g, "");
  return s;
}

// 전화번호 마스킹: 010-1234-5678 -> 010-****-5678 (표시용, SMS 발송 로그/응답에 사용).
export function maskPhone(normalized: string): string {
  const d = digitsOnly(normalized);
  if (d.length < 7) return normalized;
  const last4 = d.slice(-4);
  const first3 = d.slice(0, 3);
  return `${first3}-****-${last4}`;
}

// 비밀번호 규칙 (SPEC_ACCOUNTS.md A1): 10자 이상 + 영문·숫자·특수문자 중 2종, 12자 이상이면 종류 무관,
// 이메일 앞부분(로컬파트) 포함 금지.
export function validatePassword(password: string, email: string): boolean {
  if (password.length < 10) return false;
  const localPart = (email.split("@")[0] || "").toLowerCase();
  if (localPart.length >= 3 && password.toLowerCase().includes(localPart)) return false;
  if (password.length >= 12) return true;
  let kinds = 0;
  if (/[A-Za-z]/.test(password)) kinds++;
  if (/[0-9]/.test(password)) kinds++;
  if (/[^A-Za-z0-9]/.test(password)) kinds++;
  return kinds >= 2;
}
