// 여러 핸들러 테스트가 공유하는 범용 스크립트형 mock Deps.
// query()/scalar() 호출을 SQL 텍스트로 패턴 매칭해 응답하며, private.rl_hit() 는 기본적으로 항상 통과시킨다
// (레이트리밋 자체는 SQL 레이어(tests/sql/*.sql, private.rl_hit)에서 이미 검증되었으므로 여기서는 재검증하지 않는다).
import type { Deps, DbClient, AuthAdminClient, AuthUser } from "../_shared/deps.ts";

export type QueryHandler = (sql: string, params: unknown[]) => unknown[] | undefined;

export function makeMockDb(handler: QueryHandler = () => undefined): DbClient {
  const db: DbClient = {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
      const sql = text.replace(/\s+/g, " ").trim().toLowerCase();
      if (sql.startsWith("select private.rl_hit")) return [{ rl_hit: true } as unknown as T];
      const result = handler(text, params);
      if (result !== undefined) return result as T[];
      return [];
    },
    async scalar<T = unknown>(text: string, params: unknown[] = []): Promise<T> {
      const rows = await db.query<Record<string, unknown>>(text, params);
      if (!rows.length) return null as T;
      const row = rows[0];
      return row[Object.keys(row)[0]] as T;
    },
    async withClaims<T>(_claims: Record<string, unknown>, fn: (d: DbClient) => Promise<T>): Promise<T> {
      return await fn(db);
    },
  };
  return db;
}

export function makeMockAuthAdmin(overrides: Partial<AuthAdminClient> = {}): AuthAdminClient {
  return {
    createUser: async () => ({ id: "mock-user-id" }),
    inviteUserByEmail: async () => ({ id: "mock-invited-id", existed: false }),
    updateUserById: async () => {},
    deleteUser: async () => {},
    generateRecoveryLink: async () => ({ hashed_token: "mock-hashed-token" }),
    signInWithPassword: async () => ({ access_token: "mock-access", refresh_token: "mock-refresh", expires_in: 3600 }),
    signOutAll: async () => {},
    getUser: async (): Promise<AuthUser | null> => null,
    ...overrides,
  };
}

export function makeMockDeps(opts: {
  queryHandler?: QueryHandler;
  authAdmin?: Partial<AuthAdminClient>;
  env?: Record<string, string | undefined>;
  now?: () => Date;
} = {}): Deps {
  return {
    db: makeMockDb(opts.queryHandler),
    authAdmin: makeMockAuthAdmin(opts.authAdmin),
    send: async () => ({ ok: true, providerMsgId: "mock" }),
    now: opts.now ?? (() => new Date("2026-10-08T00:00:00.000Z")),
    rand: (n: number) => new Uint8Array(n).fill(7),
    env: { SITE_BASE_URL: "https://micego.example", NOTIFY_MODE: "log", OTP_PEPPER: "pepper", IP_HASH_SALT: "salt", ...opts.env },
  };
}

export function mockRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://edge.local/fn", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.1", ...headers },
    body: JSON.stringify(body),
  });
}
