-- MICEGO 0006: RLS. anon/authenticated 는 테이블에 직접 쓰기 권한이 없다. 모든 쓰기는
-- security definer RPC 또는 서비스 롤(Edge Function)을 통한다.
set search_path = public;

revoke all on all tables in schema public from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated, public;
-- 함수는 스키마 단위로 일괄 회수하지 않는다: citext/pgcrypto 등 확장이 설치한 연산자 지원 함수까지
-- PUBLIC 실행권한을 잃어 lower()/citext 비교 같은 기본 SQL 조차 실패하게 된다.
-- 대신 이 파일과 0004/0005 에서 만든 RPC 각각에 대해 개별적으로
-- `revoke ... from public` 후 필요한 role 에만 grant 한다 (각 CREATE FUNCTION 바로 아래 참고).

alter table members enable row level security;
alter table rfps enable row level security;
alter table rfp_tokens enable row level security;
alter table rfp_history enable row level security;
alter table rfp_messages enable row level security;
alter table partners enable row level security;
alter table partner_history enable row level security;
alter table invitations enable row level security;
alter table quotes enable row level security;
alter table quote_revisions enable row level security;
alter table selections enable row level security;
alter table otp_codes enable row level security;
alter table link_requests enable row level security;
alter table audit_log enable row level security;
alter table notification_log enable row level security;
alter table notification_deliveries enable row level security;
alter table contact_messages enable row level security;
alter table kr_holidays enable row level security;
alter table settings enable row level security;
alter table rate_limits enable row level security;
alter table ref_counters enable row level security;
alter table member_access_log enable row level security;
alter table login_attempts enable row level security;
alter table signup_tickets enable row level security;
alter table notif_template_meta enable row level security;

-- members: 본인 행만 SELECT, 운영자는 전체 SELECT
create policy members_self_select on members for select to authenticated
  using (id = auth.uid() or private.is_operator());

create policy rfps_owner_select on rfps for select to authenticated
  using (owner_id = auth.uid() or private.is_operator());

create policy rfp_tokens_owner_select on rfp_tokens for select to authenticated
  using (private.is_operator() or (state = 'active' and exists (select 1 from rfps r where r.id = rfp_tokens.rfp_id and r.owner_id = auth.uid())));

-- 그 외 모든 테이블: 운영자만 SELECT. 클라이언트에는 INSERT/UPDATE/DELETE 정책이 전혀 없다.
create policy op_select on rfp_history for select to authenticated using (private.is_operator());
create policy op_select on rfp_messages for select to authenticated using (private.is_operator());
create policy op_select on partners for select to authenticated using (private.is_operator());
create policy op_select on partner_history for select to authenticated using (private.is_operator());
create policy op_select on invitations for select to authenticated using (private.is_operator());
create policy op_select on quotes for select to authenticated using (private.is_operator());
create policy op_select on quote_revisions for select to authenticated using (private.is_operator());
create policy op_select on selections for select to authenticated using (private.is_operator());
create policy op_select on otp_codes for select to authenticated using (private.is_operator());
create policy op_select on link_requests for select to authenticated using (private.is_operator());
create policy op_select on audit_log for select to authenticated using (private.is_operator());
create policy op_select on notification_log for select to authenticated using (private.is_operator());
create policy op_select on notification_deliveries for select to authenticated using (private.is_operator());
create policy op_select on contact_messages for select to authenticated using (private.is_operator());
create policy op_select on kr_holidays for select to authenticated using (private.is_operator());
create policy op_select on settings for select to authenticated using (private.is_operator());
create policy op_select on member_access_log for select to authenticated using (private.is_operator());
create policy op_select on login_attempts for select to authenticated using (private.is_operator());

-- ---------- grants ----------
-- 테이블 SELECT 권한은 모든 테이블에 대해 authenticated 에 부여하고, 실제 행 제한은 RLS 정책이 한다
-- (스펙 RLS 표에서 회원의 "—" 는 정책이 0건으로 거른다는 뜻이지, GRANT 자체가 없다는 뜻이 아니다).
grant usage on schema public to anon, authenticated;
grant select on
  members, rfps, rfp_tokens, rfp_history, rfp_messages, partners, partner_history,
  invitations, quotes, quote_revisions, selections, otp_codes, link_requests,
  audit_log, notification_log, notification_deliveries, contact_messages,
  kr_holidays, settings, member_access_log, login_attempts, notif_template_meta
  to authenticated;

grant execute on function
  my_profile(), my_sessions(), my_rfps(), create_share_link(text), revoke_share_link(text), link_request(text)
  to authenticated;

grant execute on function
  admin_snapshot(), admin_rfp(text), admin_transition(text,text,text,text,text), admin_rfp_update(text,jsonb),
  admin_invite(text,text[]), admin_reinvite(text,uuid), admin_mark_selection(text,uuid,text),
  admin_quote_update(uuid,jsonb), admin_invitation_flag(uuid,boolean), admin_add_note(text,text),
  admin_partner_transition(text,text,text,text,text), admin_partner_update(text,jsonb),
  admin_link_decide(uuid,text,text), admin_holiday_add(date,text), admin_holiday_delete(date),
  admin_delivery_resolve(bigint,boolean), admin_resend(bigint)
  to authenticated;

-- service_role 은 기본적으로 RLS 를 우회하고 (bypassrls) 모든 스키마에 접근 가능하지만,
-- Edge Function 은 직접 Postgres 연결(SUPABASE_DB_URL)로 private.* 함수까지 호출한다 (README 참고).
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
