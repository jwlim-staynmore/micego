-- MICEGO 0004: 회원용 RPC (security definer). 모두 auth.uid() 가 활성 회원인지 검사한다.
set search_path = public;

create or replace function private.current_member() returns members
language plpgsql stable as $$
declare m members%rowtype;
begin
  select * into m from members where id = auth.uid();
  return m;
end;
$$;

create or replace function my_profile() returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare m members%rowtype;
begin
  m := private.current_member();
  if m.id is null or m.state = 'withdrawn' or m.state = 'purged' then
    raise exception using errcode = 'P0001', message = 'MG:AUTH_REQUIRED';
  end if;
  return jsonb_build_object(
    'name', m.name, 'company', m.company, 'orgType', m.org_type, 'email', m.email, 'phone', m.phone,
    'state', m.state, 'mktEmail', m.mkt_email, 'mktSms', m.mkt_sms, 'mktAt', m.mkt_at, 'lastLoginAt', m.last_login_at
  );
end;
$$;
revoke all on function my_profile() from public;
grant execute on function my_profile() to authenticated;

create or replace function my_sessions() returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare m members%rowtype; out jsonb;
begin
  m := private.current_member();
  if m.id is null or m.state not in ('active','locked','suspended') then
    raise exception using errcode = 'P0001', message = 'MG:AUTH_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'ua', s.user_agent, 'ip', s.ip,
      'updated_at', s.updated_at, 'current', s.id = nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'session_id','')::uuid
    ) order by s.updated_at desc), '[]'::jsonb) into out
  from auth.sessions s where s.user_id = m.id;
  return out;
end;
$$;
revoke all on function my_sessions() from public;
grant execute on function my_sessions() to authenticated;

-- 진행 상태를 한국어 next_step 문구로
create or replace function private.rfp_next_step(r rfps) returns text
language plpgsql stable as $$
declare has_share boolean;
begin
  return case r.state
    when 'received' then '접수 확인 중'
    when 'verifying' then '검토 중 · 3영업일 안에 진행 상황 안내'
    when 'open' then '호텔 초대 준비 중'
    when 'bidding' then '호텔 제안 대기 · 마감 ' || coalesce(to_char(r.deadline at time zone 'Asia/Seoul','MM-DD(Dy) HH24:MI'), '미정')
    when 'collecting' then '제안 취합 중'
    when 'delivered' then '비교표 도착 · 선택 대기'
    when 'won' then '성사 완료'
    when 'lost' then '미성사로 종료'
    when 'rejected' then '반려됨'
    when 'cancelled' then '취소됨'
    else ''
  end;
end;
$$;

create or replace function my_rfps() returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare
  m members%rowtype;
  rows_out jsonb;
  candidates jsonb;
  linked_recent int;
begin
  m := private.current_member();
  if m.id is null or m.state not in ('active','locked','suspended') then
    raise exception using errcode = 'P0001', message = 'MG:AUTH_REQUIRED';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'ref', r.ref,
    'title', coalesce(r.destination, r.region) || ' · ' || coalesce(r.event_type,''),
    'region', coalesce(r.destination, r.region),
    'start_date', r.start_date, 'end_date', r.end_date,
    'state', r.state,
    'track_state', private.track_slug(r.state, r.round),
    'group', case when r.state in ('won','lost','rejected','cancelled') then 'closed' else 'active' end,
    'next_step', private.rfp_next_step(r),
    'needs_action', r.state = 'delivered',
    'track_token', (select token from rfp_tokens where rfp_id = r.id and kind = 'track' and state = 'active' limit 1),
    'share', (select jsonb_build_object('state', s.state, 'token', s.token, 'created_at', s.created_at)
              from rfp_tokens s where s.rfp_id = r.id and s.kind = 'share' and s.state = 'active' limit 1),
    'linked_from_guest', false
  ) order by r.created_at desc), '[]'::jsonb)
  into rows_out
  from rfps r where r.owner_id = m.id;

  select coalesce(jsonb_agg(jsonb_build_object('ref', r.ref, 'region', coalesce(r.destination, r.region), 'created_at', r.created_at)), '[]'::jsonb)
  into candidates
  from rfps r
  where r.owner_id is null and r.contact_phone = m.phone and lower(r.contact_email) <> lower(m.email)
    and not exists (select 1 from link_requests lr where lr.rfp_id = r.id and lr.status = 'pending');

  select count(*) into linked_recent from rfps where owner_id = m.id and created_at > now() - interval '30 days';

  return jsonb_build_object('rows', rows_out, 'link_candidates', candidates, 'linked_recent', linked_recent);
end;
$$;
revoke all on function my_rfps() from public;
grant execute on function my_rfps() to authenticated;

create or replace function create_share_link(p_ref text) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare
  m members%rowtype;
  r rfps%rowtype;
  tok text;
begin
  m := private.current_member();
  if m.id is null or m.state <> 'active' then raise exception using errcode='P0001', message='MG:AUTH_REQUIRED'; end if;
  select * into r from rfps where ref = p_ref and owner_id = m.id;
  if r.id is null then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
  if r.state in ('won','lost','rejected','cancelled') and r.closed_at is not null and r.closed_at + interval '30 days' <= now() then
    raise exception using errcode='P0001', message='MG:STATE_CONFLICT';
  end if;
  update rfp_tokens set state = 'revoked', revoked_at = now() where rfp_id = r.id and kind = 'share' and state = 'active';
  tok := 's_' || encode(gen_random_bytes(24), 'base64');
  tok := replace(replace(replace(tok, '+','-'), '/','_'), '=','');
  insert into rfp_tokens(rfp_id, kind, token, state, created_by) values (r.id, 'share', tok, 'active', m.id);
  return jsonb_build_object('token', tok, 'url', '/ko/track.html?s=' || tok, 'created_at', now());
end;
$$;
revoke all on function create_share_link(text) from public;
grant execute on function create_share_link(text) to authenticated;

create or replace function revoke_share_link(p_ref text) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare m members%rowtype; r rfps%rowtype;
begin
  m := private.current_member();
  if m.id is null or m.state <> 'active' then raise exception using errcode='P0001', message='MG:AUTH_REQUIRED'; end if;
  select * into r from rfps where ref = p_ref and owner_id = m.id;
  if r.id is null then raise exception using errcode='P0001', message='MG:FORBIDDEN'; end if;
  update rfp_tokens set state = 'revoked', revoked_at = now() where rfp_id = r.id and kind = 'share' and state = 'active';
  return jsonb_build_object('revoked', true);
end;
$$;
revoke all on function revoke_share_link(text) from public;
grant execute on function revoke_share_link(text) to authenticated;

create or replace function link_request(p_ref text) returns jsonb
security definer set search_path = public, private
language plpgsql as $$
declare m members%rowtype; r rfps%rowtype;
begin
  m := private.current_member();
  if m.id is null or m.state <> 'active' then raise exception using errcode='P0001', message='MG:AUTH_REQUIRED'; end if;
  select * into r from rfps where ref = p_ref;
  if r.id is null or r.owner_id is not null or r.contact_phone <> m.phone then
    raise exception using errcode='P0001', message='MG:FORBIDDEN';
  end if;
  insert into link_requests(member_id, rfp_id, match_type, status) values (m.id, r.id, 'phone', 'pending')
    on conflict do nothing;
  return jsonb_build_object('requested', true);
end;
$$;
revoke all on function link_request(text) from public;
grant execute on function link_request(text) to authenticated;
