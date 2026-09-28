-- 피드백 시스템: REF 생성, 전이 가드(모든 GUARD_* 코드), RLS, 레이트리밋 슬라이딩 윈도,
-- 메일 임대(claim_mail), RFP 연결 조회(resolve_rfp) 매치 4종, 익명화. SPEC_FEEDBACK.md §2.
-- 이 파일 전체가 참조할 가짜 운영자/회원 auth.users 행 (FK 대상).
do $$
begin
  insert into auth.users(id, email) values
    ('00000000-0000-0000-0000-000000000099', 'fb-test-operator@example.com'),
    ('00000000-0000-0000-0000-000000000001', 'fb-test-member@example.com')
  on conflict (id) do nothing;
end $$;

do $$
declare
  f1 uuid; f2 uuid;
  fb feedback%rowtype;
  caught text;
  n int;
begin
  -- ---------- REF 생성 / KST 날짜 ----------
  insert into feedback (client_submission_id, source, category, content, body_hash, user_type, page_path, mode, lang)
    values (gen_random_uuid(), 'widget', 'ETC', repeat('가',25), encode(digest('ref-test-body','sha256'),'hex'), 'visitor', '/index.html', 'root', 'ko')
    returning id into f1;
  select * into fb from feedback where id = f1;
  if fb.ref !~ '^FB-[0-9]{6}-[A-HJ-NP-Z2-9]{4}$' then
    raise exception 'ref format mismatch: %', fb.ref;
  end if;
  if left(fb.ref, 9) <> 'FB-' || to_char(now() at time zone 'Asia/Seoul', 'YYMMDD') then
    raise exception 'ref date segment should be KST today, got %', fb.ref;
  end if;
  if fb.status <> 'new' then raise exception 'newly inserted feedback must start as new'; end if;
  raise notice 'PASS ref format/KST date';

  -- ---------- feedback_set_status: 전이 가드 (모든 GUARD_* 코드) ----------
  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000099","app_metadata":{"role":"operator"}}', true);

  insert into feedback (client_submission_id, source, category, content, body_hash, user_type, page_path, mode, lang)
    values (gen_random_uuid(), 'widget', 'OPS', repeat('나',25), encode(digest('guard-test-body-1','sha256'),'hex'), 'visitor', '/ko/index.html', 'agency', 'ko')
    returning id into f1;

  -- GUARD_TRIAGE_FIELDS: priority/subcode 없이 triaged 시도
  begin
    perform feedback_set_status(f1, 'triaged', null, null);
    raise exception 'expected GUARD_TRIAGE_FIELDS not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_TRIAGE_FIELDS' then raise exception 'unexpected error: %', caught; end if;
  end;

  update feedback set priority = 2 where id = f1; -- subcode 는 여전히 null (OPS 는 ETC 가 아니므로 필요)
  begin
    perform feedback_set_status(f1, 'triaged', null, null);
    raise exception 'expected GUARD_TRIAGE_FIELDS(subcode) not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_TRIAGE_FIELDS' then raise exception 'unexpected error: %', caught; end if;
  end;

  update feedback set subcode = 'RFP' where id = f1;
  fb := feedback_set_status(f1, 'triaged', null, null);
  if fb.status <> 'triaged' or fb.triaged_at is null then raise exception 'triaged transition failed'; end if;

  -- INVALID_TRANSITION: triaged -> done 은 허용되지만, new 로 되돌아가는 건 불가
  begin
    perform feedback_set_status(f1, 'new', null, null);
    raise exception 'expected INVALID_TRANSITION not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:INVALID_TRANSITION' then raise exception 'unexpected error: %', caught; end if;
  end;

  -- GUARD_ASSIGNEE: 담당자 없이 in_progress 시도
  begin
    perform feedback_set_status(f1, 'in_progress', null, null);
    raise exception 'expected GUARD_ASSIGNEE not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_ASSIGNEE' then raise exception 'unexpected error: %', caught; end if;
  end;

  update feedback set assignee = '00000000-0000-0000-0000-000000000099' where id = f1;
  fb := feedback_set_status(f1, 'in_progress', null, null);
  if fb.status <> 'in_progress' or fb.started_at is null then raise exception 'in_progress transition failed'; end if;

  -- GUARD_HOLD_NOTE: 메모 없이 on_hold 시도
  begin
    perform feedback_set_status(f1, 'on_hold', null, null);
    raise exception 'expected GUARD_HOLD_NOTE not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_HOLD_NOTE' then raise exception 'unexpected error: %', caught; end if;
  end;

  fb := feedback_set_status(f1, 'on_hold', null, '파트너 회신 대기');
  if fb.status <> 'on_hold' then raise exception 'on_hold transition failed'; end if;
  if not exists (select 1 from feedback_note where feedback_id = f1 and body = '파트너 회신 대기') then
    raise exception 'on_hold note should have been recorded';
  end if;

  -- 재진행 (on_hold -> in_progress, 담당 이미 있음)
  fb := feedback_set_status(f1, 'in_progress', null, null);
  if fb.status <> 'in_progress' then raise exception 'reopen-to-in_progress transition failed'; end if;

  -- GUARD_RESOLUTION: 결과 없이 done 시도
  begin
    perform feedback_set_status(f1, 'done', null, null);
    raise exception 'expected GUARD_RESOLUTION not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_RESOLUTION' then raise exception 'unexpected error: %', caught; end if;
  end;

  fb := feedback_set_status(f1, 'done', 'fixed', null);
  if fb.status <> 'done' or fb.resolution <> 'fixed' or fb.done_at is null then
    raise exception 'done transition failed';
  end if;

  -- GUARD_REOPEN_NOTE: 메모 없이 done 에서 재오픈 시도
  begin
    perform feedback_set_status(f1, 'in_progress', null, null);
    raise exception 'expected GUARD_REOPEN_NOTE not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_REOPEN_NOTE' then raise exception 'unexpected error: %', caught; end if;
  end;

  fb := feedback_set_status(f1, 'in_progress', null, '추가 확인 필요해 재오픈');
  if fb.status <> 'in_progress' or fb.resolution is not null or fb.done_at is not null then
    raise exception 'reopen should clear resolution/done_at, got resolution=% done_at=%', fb.resolution, fb.done_at;
  end if;

  -- GUARD_NEW_TO_DONE: new 상태에서 곧바로 done 인데 결과가 spam/duplicate/no_action 이 아님
  insert into feedback (client_submission_id, source, category, content, body_hash, user_type, page_path, mode, lang)
    values (gen_random_uuid(), 'widget', 'SYS', repeat('다',25), encode(digest('guard-test-body-2','sha256'),'hex'), 'visitor', '/ko/index.html', 'root', 'ko')
    returning id into f2;
  begin
    perform feedback_set_status(f2, 'done', 'fixed', null);
    raise exception 'expected GUARD_NEW_TO_DONE not raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:GUARD_NEW_TO_DONE' then raise exception 'unexpected error: %', caught; end if;
  end;
  fb := feedback_set_status(f2, 'done', 'spam', null);
  if fb.status <> 'done' or fb.resolution <> 'spam' then raise exception 'new->done(spam) transition failed'; end if;

  -- FORBIDDEN: operator 아닌 채로 feedback_set_status 호출
  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}', true);
  begin
    perform feedback_set_status(f1, 'done', 'fixed', null);
    raise exception 'expected FORBIDDEN not raised for non-operator';
  exception when sqlstate '42501' then
    get stacked diagnostics caught = message_text;
    if caught <> 'MG:FORBIDDEN' then raise exception 'unexpected error: %', caught; end if;
  end;

  reset request.jwt.claims;
  raise notice 'PASS feedback_set_status transition guards';
end $$;

-- ---------- RLS: anon 아무것도 못 봄, 회원(비운영자) 아무것도 못 봄, 운영자는 전체 ----------
do $$
declare f1 uuid;
begin
  insert into feedback (client_submission_id, source, category, content, body_hash, user_type, page_path, mode, lang)
    values (gen_random_uuid(), 'widget', 'ETC', repeat('라',25), encode(digest('rls-test-body','sha256'),'hex'), 'visitor', '/index.html', 'root', 'ko')
    returning id into f1;
  insert into feedback_note(feedback_id, author, body) values (f1, '00000000-0000-0000-0000-000000000099', '메모');
  raise notice 'fixture feedback %', f1;
end $$;

set role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}', false);
do $$
declare n int;
begin
  select count(*) into n from feedback; if n <> 0 then raise exception 'non-operator member should see 0 feedback rows, saw %', n; end if;
  select count(*) into n from feedback_note; if n <> 0 then raise exception 'non-operator member should see 0 feedback_note rows, saw %', n; end if;
  select count(*) into n from feedback_event; if n <> 0 then raise exception 'non-operator member should see 0 feedback_event rows, saw %', n; end if;
  raise notice 'PASS non-operator member sees 0 feedback rows (RLS)';
end $$;
reset role;
reset request.jwt.claims;

set role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"operator"}}', false);
do $$
declare n int;
begin
  select count(*) into n from feedback; if n < 1 then raise exception 'operator should see feedback rows, saw %', n; end if;
  select count(*) into n from feedback_note; if n < 1 then raise exception 'operator should see feedback_note rows, saw %', n; end if;
  raise notice 'PASS operator sees all feedback rows (RLS)';
end $$;
reset role;
reset request.jwt.claims;

set role anon;
do $$
begin
  begin
    perform count(*) from feedback;
    raise exception 'anon select on feedback should have failed';
  exception when insufficient_privilege then
    raise notice 'PASS anon denied on feedback';
  end;
end $$;
reset role;

-- ---------- feedback_rate_hit: 슬라이딩 윈도 ----------
do $$
declare
  ip text := encode(digest('rate-test-ip','sha256'),'hex'); -- 32자만 쓰면 되지만 64자 그대로 넣어도 함수는 그대로 키로 씀
  r jsonb;
  i int;
begin
  ip := left(ip, 32);
  for i in 1..5 loop
    r := feedback_rate_hit(ip, 5, 30, 500);
    if (r->>'allowed')::boolean is not true then raise exception 'hit % should be allowed, got %', i, r; end if;
  end loop;

  r := feedback_rate_hit(ip, 5, 30, 500);
  if (r->>'allowed')::boolean is not false or r->>'reason' <> 'ip_10m' then
    raise exception '6th hit within 10m should be denied(ip_10m), got %', r;
  end if;

  -- 슬라이딩 윈도: 이벤트를 10분보다 이전으로 옮기면 다시 허용되어야 한다
  update private.feedback_rate_event set created_at = now() - interval '11 minutes' where ip_hash = ip;
  r := feedback_rate_hit(ip, 5, 30, 500);
  if (r->>'allowed')::boolean is not true then raise exception 'hit after window slide should be allowed, got %', r; end if;

  raise notice 'PASS feedback_rate_hit sliding window (ip_10m)';
end $$;

do $$
declare
  ip text := left(encode(digest('rate-test-ip-day','sha256'),'hex'), 32);
  r jsonb;
  i int;
begin
  -- max_10m 을 크게 잡아 10분 상한에 걸리지 않게 하고, max_day=3 으로 하루 상한을 테스트한다
  for i in 1..3 loop
    r := feedback_rate_hit(ip, 100, 3, 500);
    if (r->>'allowed')::boolean is not true then raise exception 'day hit % should be allowed, got %', i, r; end if;
  end loop;
  r := feedback_rate_hit(ip, 100, 3, 500);
  if (r->>'allowed')::boolean is not false or r->>'reason' <> 'ip_day' then
    raise exception '4th hit should be denied(ip_day), got %', r;
  end if;
  raise notice 'PASS feedback_rate_hit ip_day cap';
end $$;

do $$
declare
  ip text := left(encode(digest('rate-test-ip-global','sha256'),'hex'), 32);
  r jsonb;
  n_before int;
begin
  -- feedback_rate_hit 의 global 카운트는 24시간 이내 & is_demo=false 건만 센다(§3.7) — 동일 조건으로 계산해야
  -- seed_demo.sql 의 오래된 데모 픽스처(예: 2일 전/13개월 전 접수 행)에 흔들리지 않는다.
  select count(*) into n_before from feedback
    where is_demo = false and created_at > now() - interval '24 hours';
  r := feedback_rate_hit(ip, 100, 100, n_before); -- global cap == 현재(24h) non-demo 건수 -> 즉시 상한 도달
  if (r->>'allowed')::boolean is not false or r->>'reason' <> 'global' then
    raise exception 'global cap should deny with reason=global, got %', r;
  end if;
  raise notice 'PASS feedback_rate_hit global cap (BUSY)';
end $$;

-- 이전 픽스처들(기본값 ops_mail_status='pending')이 claim_mail 테스트를 오염시키지 않도록 초기화한다.
update feedback set ops_mail_status = 'skipped', ack_mail_status = 'skipped'
  where ops_mail_status <> 'skipped' or ack_mail_status <> 'skipped';

-- ---------- feedback_claim_mail: 임대(lease) ----------
do $$
declare
  f1 uuid; f2 uuid;
  n int;
  lease1 timestamptz;
begin
  insert into feedback (client_submission_id, source, category, content, body_hash, user_type, page_path, mode, lang, ops_mail_status, ack_mail_status)
    values (gen_random_uuid(), 'widget', 'ETC', repeat('마',25), encode(digest('claim-test-body-1','sha256'),'hex'), 'visitor', '/index.html', 'root', 'ko', 'pending', 'skipped')
    returning id into f1;
  insert into feedback (client_submission_id, source, category, content, body_hash, user_type, page_path, mode, lang, ops_mail_status, ack_mail_status)
    values (gen_random_uuid(), 'widget', 'ETC', repeat('바',25), encode(digest('claim-test-body-2','sha256'),'hex'), 'visitor', '/index.html', 'root', 'ko', 'skipped', 'skipped') -- 대상 아님
    returning id into f2;

  select count(*) into n from feedback_claim_mail(20) where id = f1;
  if n <> 1 then raise exception 'expected f1 to be claimed, got % rows', n; end if;
  select count(*) into n from feedback_claim_mail(20) where id = f2;
  if n <> 0 then raise exception 'f2 (ops skipped, no pending channel) should never be claimed, got % rows', n; end if;

  select mail_lease_until into lease1 from feedback where id = f1;
  if lease1 is null or lease1 <= now() then raise exception 'claimed row should have a future mail_lease_until, got %', lease1; end if;

  -- 임대 중에는 다시 클레임되지 않는다
  select count(*) into n from feedback_claim_mail(20) where id = f1;
  if n <> 0 then raise exception 'leased row should not be reclaimed while lease is active, got % rows', n; end if;

  -- 임대 만료 후에는 다시 클레임된다
  update feedback set mail_lease_until = now() - interval '1 minute' where id = f1;
  select count(*) into n from feedback_claim_mail(20) where id = f1;
  if n <> 1 then raise exception 'row should be reclaimable after lease expiry, got % rows', n; end if;

  raise notice 'PASS feedback_claim_mail lease';
end $$;

-- ---------- feedback_resolve_rfp: verified / ref_only / mismatch / token_only ----------
do $$
declare
  r_a uuid; r_b uuid;
  trk_a text := 'trk_resolvetest0000000000a';
  trk_b text := 'trk_resolvetest0000000000b';
  hash_a text; hash_b text;
  f_verified uuid; f_ref_only uuid; f_mismatch uuid; f_token_only uuid;
  rows_out record;
  n int;
begin
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band)
    values ('MG-2610-901','received',1,'resolvea@example.com','010-0000-0011','메모', now(), '50–99명') returning id into r_a;
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band)
    values ('MG-2610-902','received',1,'resolveb@example.com','010-0000-0012','메모', now(), '50–99명') returning id into r_b;
  insert into rfp_tokens(rfp_id, kind, token, state) values (r_a, 'track', trk_a, 'active');
  insert into rfp_tokens(rfp_id, kind, token, state) values (r_b, 'track', trk_b, 'active');
  hash_a := left(encode(digest(trk_a,'sha256'),'hex'), 8);
  hash_b := left(encode(digest(trk_b,'sha256'),'hex'), 8);

  -- verified: rfp_ref 와 토큰 후보가 같은 rfp 를 가리킴
  insert into feedback (client_submission_id, source, category, content, body_hash, user_type, page_path, mode, lang, rfp_ref, token_kind, token_hash8)
    values (gen_random_uuid(), 'widget', 'OPS', repeat('사',25), encode(digest('resolve-verified','sha256'),'hex'), 'organizer_guest', '/ko/track.html', 'agency', 'ko', 'MG-2610-901', 'track', hash_a)
    returning id into f_verified;

  -- ref_only: rfp_ref 만 있고 토큰 정보 없음
  insert into feedback (client_submission_id, source, category, content, body_hash, user_type, page_path, mode, lang, rfp_ref, token_kind, token_hash8)
    values (gen_random_uuid(), 'widget', 'OPS', repeat('아',25), encode(digest('resolve-refonly','sha256'),'hex'), 'organizer_guest', '/ko/track.html', 'agency', 'ko', 'MG-2610-901', null, null)
    returning id into f_ref_only;

  -- mismatch: rfp_ref 는 A, 토큰은 B 를 가리킴
  insert into feedback (client_submission_id, source, category, content, body_hash, user_type, page_path, mode, lang, rfp_ref, token_kind, token_hash8)
    values (gen_random_uuid(), 'widget', 'OPS', repeat('자',25), encode(digest('resolve-mismatch','sha256'),'hex'), 'organizer_guest', '/ko/track.html', 'agency', 'ko', 'MG-2610-901', 'track', hash_b)
    returning id into f_mismatch;

  -- token_only: 토큰만 있고 rfp_ref 없음
  insert into feedback (client_submission_id, source, category, content, body_hash, user_type, page_path, mode, lang, rfp_ref, token_kind, token_hash8)
    values (gen_random_uuid(), 'widget', 'OPS', repeat('차',25), encode(digest('resolve-tokenonly','sha256'),'hex'), 'organizer_guest', '/ko/track.html', 'agency', 'ko', null, 'track', hash_b)
    returning id into f_token_only;

  perform set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"operator"}}', true);

  select count(*) into n from feedback_resolve_rfp(f_verified) where match = 'verified' and rfp_ref = 'MG-2610-901';
  if n <> 1 then raise exception 'expected verified match for f_verified, got % rows', n; end if;

  select count(*) into n from feedback_resolve_rfp(f_ref_only) where match = 'ref_only' and rfp_ref = 'MG-2610-901';
  if n <> 1 then raise exception 'expected ref_only match for f_ref_only, got % rows', n; end if;

  select count(*) into n from feedback_resolve_rfp(f_mismatch) where match = 'mismatch';
  if n <> 2 then raise exception 'expected mismatch to return both candidates (2 rows), got % rows', n; end if;
  if not exists (select 1 from feedback_resolve_rfp(f_mismatch) where match = 'mismatch' and rfp_ref = 'MG-2610-901') then
    raise exception 'mismatch result should include the ref-based row (A)';
  end if;
  if not exists (select 1 from feedback_resolve_rfp(f_mismatch) where match = 'mismatch' and rfp_ref = 'MG-2610-902') then
    raise exception 'mismatch result should include the token-based row (B)';
  end if;

  select count(*) into n from feedback_resolve_rfp(f_token_only) where match = 'token_only' and rfp_ref = 'MG-2610-902';
  if n <> 1 then raise exception 'expected token_only match for f_token_only, got % rows', n; end if;

  reset request.jwt.claims;
  raise notice 'PASS feedback_resolve_rfp match cases (verified/ref_only/mismatch/token_only)';
end $$;

-- ---------- feedback_anonymize: 마스킹·null 처리 ----------
do $$
declare
  f1 uuid;
  fb feedback%rowtype;
  note_body text;
begin
  insert into feedback (
    client_submission_id, source, category, content, body_hash, reply_email, reply_consent_at, contact_name,
    user_type, member_id, page_path, mode, lang, token_kind, token_hash8, ua, viewport, referrer, tz,
    last_js_errors, created_at
  ) values (
    gen_random_uuid(), 'contact', 'OPS',
    '연락처는 old.user@example.com 이고 전화는 01099998888 입니다 자세히 알려주세요',
    encode(digest('anonymize-test-body','sha256'),'hex'),
    'old.user@example.com', now() - interval '13 months', '홍길동',
    'visitor', '00000000-0000-0000-0000-000000000001', '/ko/contact.html', 'root', 'ko', 'track', '9f86d081',
    'iOS 17 · Safari', '390x844@3', '/ko/index.html', 'Asia/Seoul',
    '[{"t":"2025-01-01T00:00:00.000Z","m":"err","s":"/a.js","l":"1:1"}]'::jsonb,
    now() - interval '13 months'
  ) returning id into f1;
  insert into feedback_note(feedback_id, author, body) values (f1, '00000000-0000-0000-0000-000000000099', '연락 주신 이메일은 old.user@example.com 입니다');

  perform feedback_anonymize(now() - interval '12 months');

  select * into fb from feedback where id = f1;
  if fb.reply_email is not null then raise exception 'reply_email should be nulled'; end if;
  if fb.contact_name is not null then raise exception 'contact_name should be nulled'; end if;
  if fb.member_id is not null then raise exception 'member_id should be nulled'; end if;
  if fb.token_hash8 is not null then raise exception 'token_hash8 should be nulled'; end if;
  if fb.token_kind is not null then raise exception 'token_kind should be nulled alongside token_hash8 (fb_token_pair)'; end if;
  if fb.ua is not null then raise exception 'ua should be nulled'; end if;
  if fb.viewport is not null then raise exception 'viewport should be nulled'; end if;
  if fb.referrer is not null then raise exception 'referrer should be nulled'; end if;
  if fb.tz is not null then raise exception 'tz should be nulled'; end if;
  if fb.last_js_errors is not null then raise exception 'last_js_errors should be nulled'; end if;
  if fb.reply_consent_at is not null then raise exception 'reply_consent_at should be nulled'; end if;
  if fb.anonymized_at is null then raise exception 'anonymized_at should be set'; end if;
  if fb.content like '%old.user@example.com%' then raise exception 'content email should be masked, got %', fb.content; end if;
  if fb.content like '%01099998888%' then raise exception 'content phone should be masked, got %', fb.content; end if;
  if fb.category is distinct from 'OPS' then raise exception 'category must survive anonymization'; end if;
  if fb.page_path is distinct from '/ko/contact.html' then raise exception 'page_path must survive anonymization'; end if;

  select body into note_body from feedback_note where feedback_id = f1;
  if note_body like '%old.user@example.com%' then raise exception 'note body email should be masked, got %', note_body; end if;

  if not exists (select 1 from feedback_event where feedback_id = f1 and kind = 'anonymize') then
    raise exception 'anonymize event should have been recorded';
  end if;

  raise notice 'PASS feedback_anonymize masks and nulls';
end $$;
