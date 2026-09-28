import { MGError } from "./errors.ts";
import type { DbClient } from "./deps.ts";

// private.rl_hit(bucket,key,limit,window_s) — 창을 넘기면 false. false 면 RATE_LIMITED 를 던진다.
export async function rateLimit(db: DbClient, bucket: string, key: string, limit: number, windowSeconds: number): Promise<void> {
  const ok = await db.scalar<boolean>(`select private.rl_hit($1,$2,$3,$4)`, [bucket, key, limit, windowSeconds]);
  if (!ok) throw new MGError("RATE_LIMITED");
}
