// MICEGO 오류 카탈로그. SPEC_LAUNCH.md §3 "오류 카탈로그" 를 그대로 옮긴다.
// mg.js (WP3) 는 이 표를 그대로 미러링한다 — 코드/문구를 바꿀 때는 두 곳을 함께 고친다.

export interface ErrorSpec {
  status: number;
  ko: string;
  en: string;
}

export const ERRORS: Record<string, ErrorSpec> = {
  BAD_REQUEST: { status: 400, ko: "요청 형식이 올바르지 않습니다. 새로고침 후 다시 시도해 주세요.", en: "Invalid request. Please reload and try again." },
  VALIDATION: { status: 422, ko: "입력 내용을 확인해 주세요.", en: "Please check the highlighted fields." },
  TOKEN_INVALID: { status: 404, ko: "링크를 열 수 없습니다. 메일의 링크를 다시 눌러 주세요.", en: "This link is not valid." },
  TOKEN_REVOKED: { status: 410, ko: "더 이상 쓰지 않는 링크입니다.", en: "This link is no longer active." },
  FORBIDDEN_SHARE: { status: 403, ko: "보기 전용 링크에서는 할 수 없습니다.", en: "Not available on a view-only link." },
  STATE_CONFLICT: { status: 409, ko: "요청 상태가 바뀌어 처리하지 못했습니다. 새로고침해 주세요.", en: "The request has changed. Please reload." },
  DEADLINE_PASSED: { status: 409, ko: "제안 마감이 지났습니다.", en: "The quote deadline has passed." },
  RATE_LIMITED: { status: 429, ko: "잠시 후 다시 시도해 주세요.", en: "Too many attempts. Try again later." },
  OTP_WRONG: { status: 400, ko: "인증번호가 맞지 않습니다.", en: "Incorrect code." },
  OTP_EXPIRED: { status: 410, ko: "인증번호가 만료되었습니다. 인증번호를 다시 받아 주세요.", en: "The code has expired. Please request a new one." },
  OTP_VOID: { status: 410, ko: "인증번호를 5회 잘못 입력해 무효가 되었습니다. 새 인증번호를 받아 주세요.", en: "The code was voided after 5 wrong tries. Please request a new one." },
  OTP_LOCKED: { status: 423, ko: "5회 틀려 10분 동안 입력할 수 없습니다.", en: "Locked for 10 minutes after 5 wrong tries." },
  OTP_COOLDOWN: { status: 429, ko: "잠시 후 다시 받을 수 있습니다.", en: "You can request a new code shortly." },
  OTP_CAP: { status: 429, ko: "오늘 보낼 수 있는 인증번호를 모두 썼습니다. 내일 다시 시도해 주세요.", en: "You've reached today's limit for codes. Please try again tomorrow." },
  AUTH_REQUIRED: { status: 401, ko: "로그인이 필요합니다.", en: "Please sign in." },
  REAUTH_REQUIRED: { status: 403, ko: "보안을 위해 비밀번호를 다시 입력해 주세요.", en: "For security, please re-enter your password." },
  LOGIN_FAILED: { status: 401, ko: "이메일 또는 비밀번호가 맞지 않습니다.", en: "Incorrect email or password." },
  LOGIN_COOLDOWN: { status: 429, ko: "로그인에 5회 실패해 15분 동안 시도할 수 없습니다.", en: "5 failed attempts. Please wait 15 minutes." },
  ACCOUNT_LOCKED: { status: 423, ko: "계정이 잠겼습니다. 비밀번호를 재설정해 주세요.", en: "This account is locked. Please reset your password." },
  ACCOUNT_SUSPENDED: { status: 403, ko: "이용이 제한된 계정입니다.", en: "This account is suspended." },
  NOT_ACTIVE: { status: 403, ko: "가입 인증이 남아 있습니다.", en: "Signup verification is not complete." },
  PHONE_TAKEN: { status: 409, ko: "다른 계정에서 쓰는 번호입니다. 문의해 주세요.", en: "This number is already used by another account." },
  WITHDRAW_BLOCKED: { status: 409, ko: "진행 중인 요청이 있어 지금은 탈퇴할 수 없습니다.", en: "You have requests in progress, so you can't withdraw right now." },
  FORBIDDEN: { status: 403, ko: "권한이 없습니다.", en: "You don't have permission." },
  NOT_FOUND: { status: 404, ko: "찾을 수 없습니다.", en: "Not found." },
  TOKEN_USED: { status: 410, ko: "이미 처리된 확인 링크입니다.", en: "This confirmation link has already been used." },
  TOKEN_EXPIRED: { status: 410, ko: "확인 링크 유효기간이 지났습니다. 담당 파트너에게 재발송을 요청해 주세요.", en: "This confirmation link has expired. Please ask the regional partner to resend it." },
  GUARD_REASON: { status: 422, ko: "사유를 입력해 주세요.", en: "Please enter a reason." },
  RFP_TAKEN_OVER: { status: 409, ko: "본사가 인계한 요청입니다. 읽기만 가능합니다.", en: "This request has been taken over by HQ (read-only)." },
  REGION_REVOKED: { status: 409, ko: "담당 지역에서 제외된 요청입니다. 본사에 문의해 주세요.", en: "This request's region is no longer assigned to you." },
  PARTNER_SUSPENDED: { status: 403, ko: "파트너 조직이 정지 상태라 처리할 수 없습니다.", en: "The partner organization is suspended." },
  ACCOUNT_LIMIT: { status: 409, ko: "조직의 계정 수 상한에 도달했습니다.", en: "Account limit reached for this organization." },
  DUPLICATE: { status: 409, ko: "이미 등록된 항목입니다.", en: "Already registered." },
  INTERNAL: { status: 500, ko: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.", en: "Temporary error. Please try again." },
};

export class MGError extends Error {
  code: string;
  fields?: { name: string; code: string }[];
  extra?: Record<string, unknown>;
  constructor(code: string, opts?: { fields?: { name: string; code: string }[]; extra?: Record<string, unknown> }) {
    super(code);
    this.code = code in ERRORS ? code : "INTERNAL";
    this.fields = opts?.fields;
    this.extra = opts?.extra;
  }
}

export function errorBody(err: MGError) {
  const spec = ERRORS[err.code] ?? ERRORS.INTERNAL;
  return {
    status: spec.status,
    body: {
      error: {
        code: err.code,
        message_ko: spec.ko,
        message_en: spec.en,
        ...(err.fields ? { fields: err.fields } : {}),
        ...(err.extra ?? {}),
      },
    },
  };
}

// SQL 쪽에서 raise exception message='MG:<CODE>' 로 던진 오류를 매핑한다.
// (P0001 로 오는 메시지는 "MG:GUARD_ANON" 형태 — 콜론 뒤가 코드)
export function fromSqlError(e: unknown): MGError {
  const msg = (e as { message?: string })?.message ?? String(e);
  const m = /MG:([A-Z_]+)/.exec(String(msg));
  if (m && m[1] in ERRORS) return new MGError(m[1]);
  return new MGError("INTERNAL");
}
