// otp.ts (_shared/otp.ts) 가 실제로 내는 SQL 패턴만 흉내내는 최소 in-memory mock DbClient.
// 실제 Postgres 대신 순수 TS 로직(코드 해시/쿨다운/캡/오답 카운트)을 단위 테스트하기 위한 것.
import type { DbClient } from "../_shared/deps.ts";

interface OtpRow {
  id: string;
  purpose: string;
  target: string;
  target_hash: string;
  code_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  consumed_at: string | null;
  voided_at: string | null;
  locked_until: string | null;
  created_at: string;
  meta: Record<string, unknown>;
  member_id: string | null;
  rfp_id: string | null;
}

export function makeOtpMockDb(now: () => Date) {
  const rows = new Map<string, OtpRow>();
  let seq = 0;

  const db: DbClient = {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
      const sql = text.replace(/\s+/g, " ").trim();

      if (sql.startsWith("select") && sql.includes("as recent") && sql.includes("as today")) {
        const [targetHash, purpose, nowIso] = params as [string, string, string];
        const day = nowIso.slice(0, 10);
        const candidates = [...rows.values()].filter((r) => r.target_hash === targetHash && r.purpose === purpose);
        const recent = candidates.filter((r) => !r.voided_at && !r.consumed_at).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        const today = candidates.filter((r) => r.created_at.slice(0, 10) === day).length;
        return [{ recent: recent ? recent.created_at : null, today: String(today) }] as unknown as T[];
      }

      if (sql.startsWith("update otp_codes set voided_at =")) {
        const [nowIso, targetHash, purpose] = params as [string, string, string];
        for (const r of rows.values()) {
          if (r.target_hash === targetHash && r.purpose === purpose && !r.consumed_at && !r.voided_at) r.voided_at = nowIso;
        }
        return [] as T[];
      }

      if (sql.startsWith("insert into otp_codes")) {
        seq++;
        const id = `otp_${seq}`;
        const [purpose, memberId, rfpId, _ticket, target, targetHash, meta, codeHash, maxAttempts, expiresAt] = params as [
          string, string | null, string | null, string | null, string, string, string, string, number, string,
        ];
        rows.set(id, {
          id, purpose, target, target_hash: targetHash, code_hash: codeHash, attempts: 0, max_attempts: maxAttempts,
          expires_at: expiresAt, consumed_at: null, voided_at: null, locked_until: null, created_at: now().toISOString(),
          meta: JSON.parse(meta), member_id: memberId, rfp_id: rfpId,
        });
        return [{ id }] as unknown as T[];
      }

      if (sql.startsWith("update otp_codes set code_hash=")) {
        const [hash, id] = params as [string, string];
        const r = rows.get(id);
        if (r) r.code_hash = hash;
        return [] as T[];
      }

      if (sql.startsWith("select * from otp_codes where id=")) {
        const [id] = params as [string];
        const r = rows.get(id);
        return (r ? [{ ...r }] : []) as unknown as T[];
      }

      if (sql.startsWith("update otp_codes set attempts=$1, locked_until=$2")) {
        const [attempts, lockedUntil, id] = params as [number, string, string];
        const r = rows.get(id);
        if (r) { r.attempts = attempts; r.locked_until = lockedUntil; }
        return [] as T[];
      }
      if (sql.startsWith("update otp_codes set attempts=$1, voided_at=$2")) {
        const [attempts, voidedAt, id] = params as [number, string, string];
        const r = rows.get(id);
        if (r) { r.attempts = attempts; r.voided_at = voidedAt; }
        return [] as T[];
      }
      if (sql.startsWith("update otp_codes set attempts=$1 where")) {
        const [attempts, id] = params as [number, string];
        const r = rows.get(id);
        if (r) r.attempts = attempts;
        return [] as T[];
      }
      if (sql.startsWith("update otp_codes set consumed_at=$1")) {
        const [consumedAt, id] = params as [string, string];
        const r = rows.get(id);
        if (r) r.consumed_at = consumedAt;
        return [] as T[];
      }

      throw new Error(`otp_mock_db: unhandled query: ${sql}`);
    },
    async scalar<T = unknown>(text: string, params: unknown[] = []): Promise<T> {
      const rowsOut = await db.query<Record<string, unknown>>(text, params);
      if (!rowsOut.length) return null as T;
      const row = rowsOut[0];
      return row[Object.keys(row)[0]] as T;
    },
    async withClaims<T>(_claims: Record<string, unknown>, fn: (d: DbClient) => Promise<T>): Promise<T> {
      return await fn(db);
    },
  };
  return db;
}
