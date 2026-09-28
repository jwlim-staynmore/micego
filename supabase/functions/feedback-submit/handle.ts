// POST /feedback-submit — 단순 CORS 요청(D1), verify_jwt=false(D2). SPEC_FEEDBACK.md §3.
// 유일한 쓰기 진입점: 위젯(assets/feedback.js, WP-F2)과 contact.html 이 모두 여기로 보낸다.
import type { Deps } from "../_shared/deps.ts";
import { resolveOrigin } from "../_shared/feedback_cors.ts";
import { FeedbackError } from "./errors.ts";
import { validateSubmission, maskSecrets, sha256Hex, asStr } from "../_shared/feedback_sanitize.ts";
import { resolveSession, deriveUserType } from "../_shared/feedback_auth.ts";
import { sendFeedbackMail, type FeedbackMailRow } from "../_shared/feedback_mail.ts";
import { fakeRef } from "../_shared/feedback_templates.ts";

const MAX_BODY_BYTES = 16_384;

export interface SubmitOk {
  ok: true;
  ref: string;
  duplicate: boolean;
  ack: "queued" | "none";
}

export interface HandleResult {
  status: number;
  body: SubmitOk;
  // 새로 INSERT 된 경우에만 채워진다 — index.ts 가 EdgeRuntime.waitUntil(sendFeedbackMail(...)) 로 발송한다.
  mailRow?: FeedbackMailRow;
}

function countUrls(s: string): number {
  const m = s.match(/https?:\/\//gi);
  return m ? m.length : 0;
}

function envInt(env: Record<string, string | undefined>, key: string, fallback: number): number {
  const n = Number(env[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function handle(req: Request, deps: Deps): Promise<HandleResult> {
  if (req.method !== "POST") throw new FeedbackError("METHOD_NOT_ALLOWED");

  const origin = req.headers.get("origin");
  const originRes = resolveOrigin(origin, deps.env);
  if (!originRes.allowed) throw new FeedbackError("ORIGIN_DENIED");

  // 3) 크기 상한 (Content-Length 선확인 + 실제 바이트 길이 재확인)
  const cl = Number(req.headers.get("content-length") ?? "0");
  if (cl > MAX_BODY_BYTES) throw new FeedbackError("TOO_LARGE");
  const rawText = await req.text();
  if (new TextEncoder().encode(rawText).length > MAX_BODY_BYTES) throw new FeedbackError("TOO_LARGE");

  // 4) JSON 파싱 + 버전
  let parsed: unknown;
  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new FeedbackError("BAD_JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new FeedbackError("BAD_JSON");
  const body = parsed as Record<string, unknown>;
  if (body.v !== 1) throw new FeedbackError("BAD_VERSION");

  // 5) 레이트리밋 (ip hash -> rpc, advisory lock + sliding window)
  const { extractIp, hashIpForRateLimit } = await import("../_shared/feedback_ip.ts");
  const ipHash = await hashIpForRateLimit(extractIp(req), deps.env.FEEDBACK_IP_PEPPER ?? "");
  const rl = await deps.db.scalar<{ allowed: boolean; reason?: string; retry_after_sec?: number }>(
    `select feedback_rate_hit($1,$2,$3,$4)`,
    [ipHash, 5, 30, envInt(deps.env, "FEEDBACK_DAILY_CAP", 500)],
  );
  if (rl && rl.allowed === false) {
    if (rl.reason === "global") throw new FeedbackError("BUSY", { retryAfterSec: rl.retry_after_sec ?? 3600 });
    throw new FeedbackError("RATE_LIMITED", { retryAfterSec: rl.retry_after_sec ?? 600 });
  }

  // 6) 허니팟 — 저장 없이 가짜 201
  const hp = asStr(body.hp);
  if (hp !== "") {
    return { status: 201, body: { ok: true, ref: fakeRef(deps.now()), duplicate: false, ack: "none" } };
  }

  // 7) 스키마 검증
  const { errors, value } = validateSubmission(body);
  if (errors.length) throw new FeedbackError("VALIDATION", { fields: errors });

  // 8) 멱등 (csid 존재 -> 200 duplicate)
  const existing = await deps.db.query<{ id: string; ref: string }>(
    `select id, ref from feedback where client_submission_id = $1 limit 1`,
    [value.client_submission_id],
  );
  if (existing.length) {
    return { status: 200, body: { ok: true, ref: existing[0].ref, duplicate: true, ack: "none" } };
  }

  // 9) 본문 해시 24h 중복
  const bodyHash = await sha256Hex(value.content);
  const dup = await deps.db.query<{ id: string }>(
    `select id from feedback where body_hash = $1 and created_at > now() - interval '24 hours' limit 1`,
    [bodyHash],
  );
  if (dup.length) throw new FeedbackError("DUPLICATE_CONTENT");

  // 10) 세션 검증 (실패하면 조용히 비회원)
  const identity = await resolveSession(deps, value.authAccessToken);

  // 11) 서버 판정
  const isDemo = originRes.isDemo; // D4: 클라이언트 힌트 무시, Origin 으로만 정한다
  const userType = deriveUserType(identity, value.ctx.token_kind);
  const suspectReasons: string[] = [];
  if (countUrls(value.content) > 3) suspectReasons.push("urls");
  if (value.dwell_ms > 0 && value.dwell_ms < 3000) suspectReasons.push("fast");
  const isSuspect = suspectReasons.length > 0;
  const storedContent = maskSecrets(value.content);

  // 12) 메일 결정
  const opsCap = envInt(deps.env, "FEEDBACK_OPS_MAIL_DAILY_CAP", 150);
  const ackPerEmailDay = envInt(deps.env, "FEEDBACK_ACK_PER_EMAIL_DAY", 3);
  let opsMailsToday = 0;
  if (!isDemo && !isSuspect) {
    const r = await deps.db.query<{ n: number }>(
      `select count(*)::int as n from feedback where ops_mail_status='sent' and ops_mail_sent_at > now() - interval '24 hours'`,
    );
    opsMailsToday = r[0]?.n ?? 0;
  }
  const opsCapHit = !isDemo && !isSuspect && opsMailsToday >= opsCap;

  let ackAllowed = false;
  if (value.reply_email && !isDemo && !isSuspect) {
    const r = await deps.db.query<{ n: number }>(
      `select count(*)::int as n from feedback where reply_email=$1 and ack_mail_status='sent' and ack_mail_sent_at > now() - interval '24 hours'`,
      [value.reply_email],
    );
    ackAllowed = (r[0]?.n ?? 0) < ackPerEmailDay;
  }

  const opsMailStatus = isDemo || opsCapHit ? "skipped" : "pending";
  const ackMailStatus = ackAllowed ? "pending" : "skipped";

  // 13) INSERT (ref 충돌 1회 재시도, csid 충돌 -> duplicate)
  const insertSql = `insert into feedback (
      client_submission_id, source, category, content, body_hash,
      reply_email, reply_consent_at, contact_name, user_type, member_id,
      page_path, mode, lang, ui_state, rfp_ref, token_kind, token_hash8, viewport, ua, referrer,
      last_js_errors, tz, build_version, submitted_at, dwell_ms,
      is_demo, is_suspect, suspect_reasons, ops_mail_status, ack_mail_status, mail_lease_until
    ) values (
      $1,$2,$3,$4,$5,
      $6, case when $6::text is not null then now() else null end, $7,$8,$9,
      $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
      $20::jsonb,$21,$22,$23,$24,
      $25,$26,$27,$28,$29, now() + interval '2 minutes'
    )
    returning id, ref, created_at`;
  const insertParams = [
    value.client_submission_id, value.source, value.category, storedContent, bodyHash,
    value.reply_email, value.reply_email, value.contact_name, userType, identity.memberId,
    value.ctx.page_path, value.ctx.mode, value.ctx.lang, value.ctx.ui_state, value.ctx.rfp_ref,
    value.ctx.token_kind, value.ctx.token_hash8, value.ctx.viewport, value.ctx.ua, value.ctx.referrer,
    value.ctx.last_js_errors ? JSON.stringify(value.ctx.last_js_errors) : null, value.ctx.tz, value.ctx.build_version,
    value.ctx.submitted_at, value.dwell_ms,
    isDemo, isSuspect, suspectReasons, opsMailStatus, ackMailStatus,
  ];

  let inserted: { id: string; ref: string; created_at: string }[];
  try {
    inserted = await deps.db.query<{ id: string; ref: string; created_at: string }>(insertSql, insertParams);
  } catch (e) {
    const code = (e as { code?: string })?.code;
    const constraint = (e as { constraint_name?: string; constraint?: string })?.constraint_name
      ?? (e as { constraint?: string })?.constraint ?? "";
    if (code === "23505" && /client_submission_id/.test(String(constraint))) {
      const again = await deps.db.query<{ id: string; ref: string }>(
        `select id, ref from feedback where client_submission_id = $1 limit 1`,
        [value.client_submission_id],
      );
      if (again.length) return { status: 200, body: { ok: true, ref: again[0].ref, duplicate: true, ack: "none" } };
      throw new FeedbackError("INTERNAL");
    }
    if (code === "23505") {
      // ref 충돌: 트리거가 새 ref 를 다시 생성하도록 1회만 재시도한다.
      inserted = await deps.db.query<{ id: string; ref: string; created_at: string }>(insertSql, insertParams);
    } else {
      throw e;
    }
  }

  const row = inserted[0];
  const mailRow: FeedbackMailRow = {
    id: row.id,
    ref: row.ref,
    source: value.source,
    category: value.category,
    user_type: userType,
    content: storedContent,
    reply_email: value.reply_email,
    contact_name: value.contact_name,
    member_id: identity.memberId,
    created_at: row.created_at,
    lang: value.ctx.lang,
    mode: value.ctx.mode,
    page_path: value.ctx.page_path,
    ui_state: value.ctx.ui_state,
    rfp_ref: value.ctx.rfp_ref,
    ua: value.ctx.ua,
    viewport: value.ctx.viewport,
    tz: value.ctx.tz,
    build_version: value.ctx.build_version,
    referrer: value.ctx.referrer,
    last_js_errors: value.ctx.last_js_errors,
    ops_mail_status: opsMailStatus,
    ops_mail_attempts: 0,
    ack_mail_status: ackMailStatus,
    ack_mail_attempts: 0,
  };

  return {
    status: 201,
    body: { ok: true, ref: row.ref, duplicate: false, ack: ackMailStatus === "pending" ? "queued" : "none" },
    mailRow,
  };
}

export { sendFeedbackMail };
