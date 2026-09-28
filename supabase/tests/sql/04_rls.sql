-- RLS: 회원은 본인 rfps/members 만, 운영자는 전체, anon 은 아무것도 못 봄
do $$
declare
  m1 uuid := gen_random_uuid();
  m2 uuid := gen_random_uuid();
  r1 uuid; r2 uuid; n int;
begin
  insert into auth.users(id, email) values (m1, 'rls1@example.com'), (m2, 'rls2@example.com');
  insert into members(id, state, name, email) values (m1, 'active', 'RLS1', 'rls1@example.com'), (m2, 'active', 'RLS2', 'rls2@example.com');
  insert into rfps(ref, state, owner_id, contact_email, contact_phone, note, consent_at, headcount_band)
    values ('MG-TEST-RLS1','received', m1, 'rls1@example.com','010-1','메모', now(), '50–99명') returning id into r1;
  insert into rfps(ref, state, owner_id, contact_email, contact_phone, note, consent_at, headcount_band)
    values ('MG-TEST-RLS2','received', m2, 'rls2@example.com','010-2','메모', now(), '50–99명') returning id into r2;
  raise notice 'fixture rfps % %', r1, r2;
end $$;

-- m1 으로 로그인: 자신의 rfp/members 행만 보여야 한다
-- (아직 postgres 역할일 때 claim 을 먼저 세팅한다 — role 을 먼저 바꾸면 RLS 때문에 위 select 가 0건이 된다)
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub', id::text)::text, false) from members where email = 'rls1@example.com';
set role authenticated;

do $$
declare n int;
begin
  select count(*) into n from rfps; if n <> 1 then raise exception 'member should see exactly 1 rfp, saw %', n; end if;
  select count(*) into n from members; if n <> 1 then raise exception 'member should see exactly 1 member row, saw %', n; end if;
  raise notice 'PASS member-scoped select';
end $$;

-- partners 등 "그 외 테이블"은 회원에게 0건으로 보인다 (GRANT 는 있으나 RLS 정책이 전부 거른다)
do $$
declare n int;
begin
  select count(*) into n from partners;
  if n <> 0 then raise exception 'member should see 0 partner rows via RLS, saw %', n; end if;
  raise notice 'PASS member sees 0 rows on partners (RLS, not grant)';
end $$;

reset role;
reset request.jwt.claims;

-- 운영자로: 전체
set role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"operator"}}', false);
do $$
declare n int;
begin
  select count(*) into n from rfps where ref like 'MG-TEST-RLS%'; if n <> 2 then raise exception 'operator should see 2 test rfps, saw %', n; end if;
  select count(*) into n from partners; if n < 1 then raise exception 'operator should see partners rows, saw %', n; end if;
  raise notice 'PASS operator select-all (rfps + partners)';
end $$;
reset role;
reset request.jwt.claims;

-- anon: 아무 것도 못 봄 (테이블 grant 자체가 없음)
set role anon;
do $$
begin
  begin
    perform count(*) from rfps;
    raise exception 'anon select on rfps should have failed';
  exception when insufficient_privilege then
    raise notice 'PASS anon denied';
  end;
end $$;
reset role;
