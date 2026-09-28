// feedback-submit 전용 오류 카탈로그/응답 포맷. SPEC_FEEDBACK.md §3.8.
// 기존 _shared/errors.ts(MGError/errorBody) 는 {error:{code,message_ko,message_en}} 형태를 쓰지만,
// 피드백은 "코드만(문구는 위젯 i18n)" + {ok:false,...} 봉투를 요구해 그대로 재사용할 수 없다.
import type { FieldError } from "../_shared/feedback_sanitize.ts";

export type FeedbackErrorCode =
  | "BAD_JSON"
  | "BAD_VERSION"
  | "VALIDATION"
  | "ORIGIN_DENIED"
  | "METHOD_NOT_ALLOWED"
  | "DUPLICATE_CONTENT"
  | "TOO_LARGE"
  | "RATE_LIMITED"
  | "BUSY"
  | "INTERNAL";

const STATUS: Record<FeedbackErrorCode, number> = {
  BAD_JSON: 400,
  BAD_VERSION: 400,
  VALIDATION: 400,
  ORIGIN_DENIED: 403,
  METHOD_NOT_ALLOWED: 405,
  DUPLICATE_CONTENT: 409,
  TOO_LARGE: 413,
  RATE_LIMITED: 429,
  BUSY: 503,
  INTERNAL: 500,
};

export class FeedbackError extends Error {
  code: FeedbackErrorCode;
  status: number;
  fields?: FieldError[];
  retryAfterSec?: number;
  constructor(code: FeedbackErrorCode, opts?: { fields?: FieldError[]; retryAfterSec?: number }) {
    super(code);
    this.code = code;
    this.status = STATUS[code];
    this.fields = opts?.fields;
    this.retryAfterSec = opts?.retryAfterSec;
  }
}

export function feedbackErrorBody(e: FeedbackError): { status: number; body: unknown } {
  return {
    status: e.status,
    body: {
      ok: false,
      error: {
        code: e.code,
        ...(e.retryAfterSec != null ? { retry_after_sec: e.retryAfterSec } : {}),
        ...(e.fields ? { fields: e.fields } : {}),
      },
    },
  };
}
