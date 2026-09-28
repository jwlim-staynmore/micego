// 공용 의존성 타입 + 기본(운영) 구현. 테스트는 이 타입을 구현하는 목(mock) 객체를 주입한다.
// deno.land 대신 npm 스펙으로 postgres 클라이언트를 가져온다 (cdn 호환, Deno 2 네이티브 지원).
import postgres from "npm:postgres@3.4.4";

export interface DbClient {
  // 단순 파라미터 바인딩 쿼리 실행. 반환값은 행 배열.
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  // SELECT ... 함수 하나만 호출하고 첫 행 첫 컬럼을 돌려주는 편의 메서드
  scalar<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
  // 회원/운영자 JWT 클레임을 트랜잭션-로컬 GUC (request.jwt.claims) 로 설정한 뒤 fn 을 실행한다.
  // Edge Function 은 PostgREST 를 거치지 않고 SUPABASE_DB_URL 로 직접 접속하므로, auth.uid()/auth.jwt() 에
  // 의존하는 SECURITY DEFINER 함수(예: create_share_link, revoke_share_link)를 호출하려면 이 방법으로
  // 클레임을 흉내내야 한다. set_config(..., true) 는 트랜잭션이 끝나면 자동으로 사라진다.
  withClaims<T>(claims: Record<string, unknown>, fn: (db: DbClient) => Promise<T>): Promise<T>;
}

export interface AuthUser {
  id: string;
  email: string | null;
  app_metadata: Record<string, unknown>;
}

export interface AuthAdminClient {
  createUser(args: { email: string; password: string; email_confirm: boolean }): Promise<{ id: string }>;
  // Supabase 기본 초대 메일(magic link)을 보낸다. 이미 있는 계정이면 { id, existed: true }.
  inviteUserByEmail(email: string, opts: { redirectTo?: string; data?: Record<string, unknown> }): Promise<{ id: string; existed: boolean }>;
  updateUserById(id: string, patch: Record<string, unknown>): Promise<void>;
  deleteUser(id: string): Promise<void>;
  generateRecoveryLink(email: string): Promise<{ hashed_token: string }>;
  signInWithPassword(email: string, password: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
  signOutAll(userId: string): Promise<void>;
  // Authorization: Bearer <access_token> 를 검증해 사용자 정보를 돌려준다 (없거나 만료면 null).
  getUser(accessToken: string): Promise<AuthUser | null>;
}

export type SendFn = (args: {
  templateId: string;
  channel: "email" | "alimtalk" | "lms" | "sms";
  to: string;
  vars: Record<string, string>;
}) => Promise<{ ok: boolean; providerMsgId?: string; error?: string }>;

export interface Deps {
  db: DbClient;
  authAdmin: AuthAdminClient;
  send: SendFn;
  now: () => Date;
  rand: (nbytes: number) => Uint8Array;
  env: Record<string, string | undefined>;
}

// ---------- 운영 구현 ----------

let _sql: ReturnType<typeof postgres> | null = null;
function sql() {
  if (!_sql) {
    const url = Deno.env.get("SUPABASE_DB_URL");
    if (!url) throw new Error("SUPABASE_DB_URL is not set");
    _sql = postgres(url, { max: 5 });
  }
  return _sql;
}

// postgres.js 의 커넥션/트랜잭션 핸들(Sql 또는 TransactionSql) 하나를 감싸는 DbClient.
// withClaims 로 얻은 트랜잭션-스코프 DbClient 위에서 다시 withClaims 를 불러도 같은 트랜잭션 위에서 동작한다.
// deno-lint-ignore no-explicit-any
function wrapSql(s: any): DbClient {
  const client: DbClient = {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
      return await s.unsafe(text, params) as unknown as T[];
    },
    async scalar<T = unknown>(text: string, params: unknown[] = []) {
      const rows = await client.query<Record<string, unknown>>(text, params);
      if (!rows.length) return null as T;
      const row = rows[0];
      const firstKey = Object.keys(row)[0];
      return row[firstKey] as T;
    },
    async withClaims<T>(claims: Record<string, unknown>, fn: (db: DbClient) => Promise<T>) {
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
      return await fn(client);
    },
  };
  return client;
}

export function makeDb(): DbClient {
  const s = sql();
  const base = wrapSql(s);
  return {
    ...base,
    // 최상위 makeDb() 는 커넥션 풀에서 매번 다른 커넥션을 빌려올 수 있으므로, withClaims 는 반드시
    // 하나의 트랜잭션(=하나의 커넥션) 안에서 set_config 와 실제 호출이 함께 일어나도록 sql.begin 을 쓴다.
    async withClaims<T>(claims: Record<string, unknown>, fn: (db: DbClient) => Promise<T>): Promise<T> {
      const result = await s.begin(async (tx) => {
        const txClient = wrapSql(tx);
        await txClient.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
        return await fn(txClient);
      });
      return result as T;
    },
  };
}

function authHeaders(key: string) {
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

export function makeAuthAdmin(): AuthAdminClient {
  const base = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  return {
    async createUser(args) {
      const r = await fetch(`${base}/auth/v1/admin/users`, {
        method: "POST",
        headers: authHeaders(serviceKey),
        body: JSON.stringify({ email: args.email, password: args.password, email_confirm: args.email_confirm }),
      });
      if (!r.ok) throw new Error(`createUser failed: ${r.status} ${await r.text()}`);
      return await r.json();
    },
    async inviteUserByEmail(email, opts) {
      const r = await fetch(`${base}/auth/v1/invite`, {
        method: "POST",
        headers: authHeaders(serviceKey),
        body: JSON.stringify({ email, data: opts.data ?? {}, ...(opts.redirectTo ? { redirect_to: opts.redirectTo } : {}) }),
      });
      if (r.ok) { const j = await r.json(); return { id: j.id, existed: false }; }
      const txt = await r.text();
      if (r.status === 422 || /already/i.test(txt)) {
        const db = makeDb();
        const rows = await db.query<{ id: string }>("select id from auth.users where lower(email) = lower($1)", [email]);
        if (rows.length) return { id: rows[0].id, existed: true };
      }
      throw new Error(`inviteUserByEmail failed: ${r.status} ${txt}`);
    },
    async updateUserById(id, patch) {
      const r = await fetch(`${base}/auth/v1/admin/users/${id}`, {
        method: "PUT",
        headers: authHeaders(serviceKey),
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(`updateUserById failed: ${r.status} ${await r.text()}`);
    },
    async deleteUser(id) {
      const r = await fetch(`${base}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: authHeaders(serviceKey) });
      if (!r.ok && r.status !== 404) throw new Error(`deleteUser failed: ${r.status} ${await r.text()}`);
    },
    async generateRecoveryLink(email) {
      const r = await fetch(`${base}/auth/v1/admin/generate_link`, {
        method: "POST",
        headers: authHeaders(serviceKey),
        body: JSON.stringify({ type: "recovery", email }),
      });
      if (!r.ok) throw new Error(`generateLink failed: ${r.status} ${await r.text()}`);
      const j = await r.json();
      return { hashed_token: j.hashed_token ?? j.email_otp ?? "" };
    },
    async signInWithPassword(email, password) {
      const r = await fetch(`${base}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: authHeaders(anonKey),
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error_description || j.msg || "login failed");
      return { access_token: j.access_token, refresh_token: j.refresh_token, expires_in: j.expires_in };
    },
    async signOutAll(userId) {
      const db = makeDb();
      await db.query("delete from auth.sessions where user_id = $1", [userId]);
    },
    async getUser(accessToken) {
      const r = await fetch(`${base}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      });
      if (!r.ok) return null;
      const j = await r.json();
      return { id: j.id, email: j.email ?? null, app_metadata: j.app_metadata ?? {} };
    },
  };
}

// 인라인 발송(OTP/재설정 등)이 쓰는 기본 SendFn. _shared/notify/router.ts 의 채널별 발송기를 그대로 감싼다.
// (배치 디스패처는 이 SendFn 을 쓰지 않고 dispatch_one.ts 가 router.ts 를 직접 호출한다 — 템플릿당 여러 채널을
//  병렬로 다루고 notification_deliveries 에 여러 행을 남겨야 하기 때문.)
async function defaultSend(args: { templateId: string; channel: "email" | "alimtalk" | "lms" | "sms"; to: string; vars: Record<string, string> }) {
  // deno 동적 import 순환을 피하기 위해 지연 로드.
  const { sendEmail, sendAlimtalkChannel, sendSmsChannel, sendLmsFallback } = await import("./notify/router.ts");
  const env = Deno.env.toObject();
  const nenv = {
    NOTIFY_MODE: (env.NOTIFY_MODE === "live" ? "live" : "log") as "live" | "log",
    SITE_BASE_URL: env.SITE_BASE_URL ?? "https://micego.example",
    FROM_ADDRESS: env.FROM_ADDRESS ?? "notify@micego.example",
    SUPPORT_EMAIL: env.SUPPORT_EMAIL ?? "support@micego.example",
    RESEND_API_KEY: env.RESEND_API_KEY,
    SMS_VENDOR: env.SMS_VENDOR,
    SOLAPI_API_KEY: env.SOLAPI_API_KEY,
    SOLAPI_API_SECRET: env.SOLAPI_API_SECRET,
    SMS_SENDER: env.SMS_SENDER,
    KAKAO_PF_ID: env.KAKAO_PF_ID,
    ALIGO_KEY: env.ALIGO_KEY,
    ALIGO_USER_ID: env.ALIGO_USER_ID,
  };
  const now = () => new Date();
  let r;
  if (args.channel === "email") r = await sendEmail(nenv, now, args.templateId, args.to, undefined, args.vars, `inline:${args.templateId}:${args.to}:${Date.now()}`);
  else if (args.channel === "alimtalk") r = await sendAlimtalkChannel(nenv, now, args.templateId, args.to, args.vars);
  else if (args.channel === "lms") r = await sendLmsFallback(nenv, now, args.templateId, args.to, args.vars);
  else r = await sendSmsChannel(nenv, now, args.templateId, args.to, args.vars);
  return { ok: r.ok, providerMsgId: r.providerMsgId, error: r.error };
}

export function defaultDeps(): Deps {
  return {
    db: makeDb(),
    authAdmin: makeAuthAdmin(),
    send: defaultSend,
    now: () => new Date(),
    rand: (n: number) => crypto.getRandomValues(new Uint8Array(n)),
    env: Deno.env.toObject(),
  };
}
