// OTP 발급/검증 공용 로직. code_hash = sha256(code + ':' + otp_id + ':' + OTP_PEPPER) (SPEC_LAUNCH.md §4).
import { MGError } from "./errors.ts";
import type { DbClient } from "./deps.ts";

export function genCode(rand: (n: number) => Uint8Array): string {
  const bytes = rand(4);
  const n = new DataView(bytes.buffer).getUint32(0) % 1000000;
  return n.toString().padStart(6, "0");
}

export async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function codeHash(code: string, otpId: string, pepper: string): Promise<string> {
  return await sha256Hex(`${code}:${otpId}:${pepper}`);
}

export interface CreateOtpArgs {
  purpose: string;
  memberId?: string | null;
  rfpId?: string | null;
  ticket?: string | null;
  target: string; // lowercase email or digits-only phone
  meta?: Record<string, unknown>;
  ttlSeconds: number;
  cooldownSeconds: number;
  maxAttempts: number;
  dailyCap: number;
  pepper: string;
  demoFixedCode?: string | null;
}

export interface CreateOtpResult {
  otpId: string;
  code: string;
  expiresAt: string;
  resendAt: string;
}

export async function createOtp(db: DbClient, now: () => Date, rand: (n: number) => Uint8Array, args: CreateOtpArgs): Promise<CreateOtpResult> {
  const targetHash = await sha256Hex(args.target);
  const nowIso = now().toISOString();

  const [{ recent, today }] = await db.query<{ recent: string | null; today: string }>(
    `select
       (select created_at from otp_codes where target_hash=$1 and purpose=$2 and voided_at is null and consumed_at is null order by created_at desc limit 1) as recent,
       (select count(*) from otp_codes where target_hash=$1 and purpose=$2 and created_at::date = $3::date) as today
     `,
    [targetHash, args.purpose, nowIso],
  );
  if (recent) {
    const recentMs = new Date(recent as unknown as string).getTime();
    if (now().getTime() - recentMs < args.cooldownSeconds * 1000) {
      throw new MGError("OTP_COOLDOWN");
    }
  }
  if (Number(today) >= args.dailyCap) {
    throw new MGError("OTP_CAP");
  }

  // 이전 미소비 코드는 새 코드 발급 시 자동 폐기
  await db.query(`update otp_codes set voided_at = $1 where target_hash=$2 and purpose=$3 and consumed_at is null and voided_at is null`, [
    nowIso,
    targetHash,
    args.purpose,
  ]);

  const code = args.demoFixedCode ?? genCode(rand);
  const expiresAt = new Date(now().getTime() + args.ttlSeconds * 1000).toISOString();
  const resendAt = new Date(now().getTime() + args.cooldownSeconds * 1000).toISOString();

  const rows = await db.query<{ id: string }>(
    `insert into otp_codes(purpose, member_id, rfp_id, ticket, target, target_hash, meta, code_hash, max_attempts, expires_at, resend_after)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
    [
      args.purpose,
      args.memberId ?? null,
      args.rfpId ?? null,
      args.ticket ?? null,
      args.target,
      targetHash,
      JSON.stringify(args.meta ?? {}),
      "PENDING", // placeholder, updated right after we know the id (hash includes otp id)
      args.maxAttempts,
      expiresAt,
      resendAt,
    ],
  );
  const otpId = rows[0].id;
  const hash = await codeHash(code, otpId, args.pepper);
  await db.query(`update otp_codes set code_hash=$1 where id=$2`, [hash, otpId]);

  return { otpId, code, expiresAt, resendAt };
}

export interface VerifyOtpArgs {
  otpId: string;
  code: string;
  pepper: string;
  lockSeconds?: number; // 지정 시 5회 오답 -> lock, 미지정 시 -> void
}

export async function verifyOtp(db: DbClient, now: () => Date, args: VerifyOtpArgs): Promise<Record<string, unknown>> {
  const rows = await db.query<Record<string, unknown>>(`select * from otp_codes where id=$1`, [args.otpId]);
  if (!rows.length) throw new MGError("OTP_WRONG", { extra: { remaining: 0 } });
  const row = rows[0];
  const nowMs = now().getTime();

  if (row.locked_until && new Date(row.locked_until as string).getTime() > nowMs) throw new MGError("OTP_LOCKED");
  if (row.voided_at) throw new MGError("OTP_VOID");
  if (row.consumed_at) throw new MGError("OTP_EXPIRED");
  if (new Date(row.expires_at as string).getTime() <= nowMs) throw new MGError("OTP_EXPIRED");

  const expect = await codeHash(args.code, args.otpId, args.pepper);
  if (expect !== row.code_hash) {
    const attempts = (row.attempts as number) + 1;
    const maxAttempts = row.max_attempts as number;
    if (attempts >= maxAttempts) {
      if (args.lockSeconds) {
        await db.query(`update otp_codes set attempts=$1, locked_until=$2 where id=$3`, [
          attempts,
          new Date(nowMs + args.lockSeconds * 1000).toISOString(),
          args.otpId,
        ]);
        throw new MGError("OTP_LOCKED");
      } else {
        await db.query(`update otp_codes set attempts=$1, voided_at=$2 where id=$3`, [attempts, now().toISOString(), args.otpId]);
        throw new MGError("OTP_VOID");
      }
    }
    await db.query(`update otp_codes set attempts=$1 where id=$2`, [attempts, args.otpId]);
    throw new MGError("OTP_WRONG", { extra: { remaining: maxAttempts - attempts } });
  }

  await db.query(`update otp_codes set consumed_at=$1 where id=$2`, [now().toISOString(), args.otpId]);
  return row;
}
