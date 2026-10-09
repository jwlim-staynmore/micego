// POST /withdraw — member JWT. {password,reasons:[],confirm:true} → {state:'withdrawn'}. SPEC_LAUNCH.md §3, SPEC_ACCOUNTS.md A6.
import type { Deps } from "../_shared/deps.ts";
import { MGError } from "../_shared/errors.ts";
import { asBool, asString } from "../_shared/validate.ts";
import { requireActiveMember } from "../_shared/auth_ctx.ts";
import { enqueueAndDispatch } from "../_shared/notify/enqueue_and_dispatch.ts";

const BLOCKING_STATES = ["bidding", "collecting", "delivered"];
const AUTO_CANCEL_STATES = ["received", "verifying", "open"];

export async function handle(req: Request, deps: Deps): Promise<unknown> {
  const member = await requireActiveMember(req, deps);
  const body = await req.json().catch(() => { throw new MGError("BAD_REQUEST"); });
  const password = asString(body.password);
  const reasons = Array.isArray(body.reasons) ? (body.reasons as unknown[]).map(String) : [];
  const confirm = asBool(body.confirm);
  if (!confirm) throw new MGError("VALIDATION", { fields: [{ name: "confirm", code: "required" }] });

  if (!member.email) throw new MGError("LOGIN_FAILED");
  try {
    await deps.authAdmin.signInWithPassword(member.email, password);
  } catch {
    throw new MGError("LOGIN_FAILED");
  }

  const owned = await deps.db.query<{ id: string; ref: string; state: string }>(`select id, ref, state from rfps where owner_id=$1`, [member.id]);
  const blockers = owned.filter((r) => BLOCKING_STATES.includes(r.state)).map((r) => ({ ref: r.ref, track_state: r.state }));
  if (blockers.length) throw new MGError("WITHDRAW_BLOCKED", { extra: { blockers } });

  const nowIso = deps.now().toISOString();

  // 진행 중이 아닌(접수됨/요건 확인 중/초대 준비) 요청은 자동 취소 — ORG_CANCELLED 는 보내지 않는다 (rfp_transition 이 reason='회원 탈퇴' 로 억제).
  for (const r of owned) {
    if (AUTO_CANCEL_STATES.includes(r.state)) {
      await deps.db.query(`select private.rfp_transition($1,'cancelled','system',null,'회원 탈퇴',null,null)`, [r.id]).catch((e) => console.error("withdraw auto-cancel failed:", r.ref, e));
    }
  }

  const ownedIds = owned.map((r) => r.id);
  if (ownedIds.length) {
    await deps.db.query(`update rfp_tokens set state='disabled' where rfp_id = any($1::uuid[]) and kind='share' and state='active'`, [ownedIds]);
    await deps.db.query(`update rfp_tokens set state='revoked', revoked_at=$2 where rfp_id = any($1::uuid[]) and kind='track' and state='active'`, [ownedIds, nowIso]);
    // 성사(선정) 기록이 없는 요청만 연락처를 지운다 — 성사 연결 기록은 selections.org_snapshot 쪽에서 별도 보관기한(3년)을 따른다.
    await deps.db.query(
      `update rfps set contact_name=null, contact_email=null, contact_phone=null
       where id = any($1::uuid[]) and id not in (select rfp_id from selections)`,
      [ownedIds],
    );
  }

  // 탈퇴 완료 메일은 계정 정보를 지우기 전에 보낸다 (수신 주소는 아래에서 이미 스냅샷으로 캡처).
  await enqueueAndDispatch(deps.db, deps.env, deps.now, "ACC_WITHDRAWN", `ACC_WITHDRAWN:${member.id}`, {
    member_id: member.id, to_email: member.email, recipient_kind: "mem",
  }, { WITHDRAWN_AT: nowIso });

  await deps.db.query(
    `insert into audit_log (at, actor, member_id, action, meta) values ($1,'member',$2,'withdraw',$3::jsonb)`,
    [nowIso, member.id, JSON.stringify({ reasons })],
  );

  // 회원 PII 삭제: members 행 자체는 남기되(다른 요청의 owner_id 참조 무결성 유지) 상태만 withdrawn 으로, 개인정보는 null 처리.
  await deps.db.query(
    `update members set state='withdrawn', withdrawn_at=$2, name=null, email=null, phone=null, consents='{}'::jsonb where id=$1`,
    [member.id, nowIso],
  );
  await deps.authAdmin.deleteUser(member.id).catch((e) => console.error("auth deleteUser failed:", e));

  return { state: "withdrawn" };
}
