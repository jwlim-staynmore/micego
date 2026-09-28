-- MICEGO seed_demo.sql — mock-data.js 의 인물·상태 구성을 그대로 반영한 데모 데이터.
-- prod:true 빌드에서는 실행하지 않는다 (README 참고). 전부 example.com/.example 가상 데이터.
set search_path = public;

do $$
declare
  p1 uuid; p2 uuid; p7 uuid; p11 uuid; p18 uuid; p19 uuid; p20 uuid; p21 uuid;
  m1 uuid; m5 uuid; m6 uuid; m7 uuid; m8 uuid;
  r_received uuid; r_verifying uuid; r_open uuid; r_bidding uuid; r_collecting uuid; r_delivered uuid; r_won uuid; r_lost uuid; r_rejected uuid; r_cancelled uuid;
  inv1 uuid; inv2 uuid; inv3 uuid; inv4 uuid; inv5 uuid; inv6 uuid;
  q1 uuid; q2 uuid;
begin
  -- ---------- partners ----------
  insert into partners(code, state, name, location, dest, cap_band, cap, banquet, contact_name, contact_email, contact_phone, domain, description, check_, applied_at, unsubscribe_token)
    values ('PT-2606-001','approved','Ocean Pearl Resort Da Nang','베트남 · 다낭','다낭','400+',400,true,'Tran Minh Anh','events@oceanpearl-danang.example','+84 000 000 1001','oceanpearl-danang.example','해변가 대형 리조트. 단체 연회장 3개 보유.', '{"url":"https://oceanpearl-danang.example","exists":true,"capOk":true,"contactOk":true,"affil":""}', now() - interval '90 days', 'u_' || replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''))
    returning id into p1;
  insert into partners(code, state, name, location, dest, cap_band, cap, banquet, contact_name, contact_email, contact_phone, domain, description, check_, applied_at, unsubscribe_token)
    values ('PT-2606-002','approved','Lotus Bay Resort Da Nang','베트남 · 다낭','다낭','200–399',300,true,'Le Hoang Nam','sales@lotusbay-danang.example','+84 000 000 1002','lotusbay-danang.example','다낭 시내 접근성이 좋은 비즈니스 리조트.', '{"url":"https://lotusbay-danang.example","exists":true,"capOk":true,"contactOk":true,"affil":""}', now() - interval '88 days', 'u_' || replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''))
    returning id into p2;
  insert into partners(code, state, name, location, dest, cap_band, cap, banquet, contact_name, contact_email, contact_phone, domain, description, check_, applied_at, unsubscribe_token)
    values ('PT-2606-007','approved','Chao Phraya Grand Bangkok','태국 · 방콕','방콕','400+',600,true,'Somsak K.','events@chaophrayagrand.example','+66 000 000 1007','chaophrayagrand.example','방콕 대형 컨벤션 호텔. 동시통역 부스 상시 보유.', '{"url":"https://chaophrayagrand.example","exists":true,"capOk":true,"contactOk":true,"affil":""}', now() - interval '86 days', 'u_' || replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''))
    returning id into p7;
  insert into partners(code, state, name, location, dest, cap_band, cap, banquet, contact_name, contact_email, contact_phone, domain, description, check_, applied_at, unsubscribe_token)
    values ('PT-2606-011','approved','Ubud Rice Terrace Resort','인도네시아 · 발리','발리','100–199',200,false,'Ketut Adi','groups@ubudriceterrace.example','+62 000 000 1011','ubudriceterrace.example','우붓 논밭 전망의 소규모 리조트. 볼룸 없음.', '{"url":"https://ubudriceterrace.example","exists":true,"capOk":true,"contactOk":true,"affil":""}', now() - interval '80 days', 'u_' || replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''))
    returning id into p11;
  insert into partners(code, state, name, location, dest, cap_band, cap, banquet, contact_name, contact_email, contact_phone, domain, description, check_, applied_at, unsubscribe_token)
    values ('PT-2609-018','pending','Sanur Lagoon Hotel','인도네시아 · 발리','발리','200–399',220,true,'Wayan Sari','sales@sanurlagoon.example','+62 000 000 1018','sanurlagoon.example','사누르 해변의 중형 호텔.', '{"url":"","exists":false,"capOk":false,"contactOk":false,"affil":""}', now() - interval '3 days', 'u_' || replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''))
    returning id into p18;
  insert into partners(code, state, name, location, dest, cap_band, cap, banquet, contact_name, contact_email, contact_phone, domain, description, check_, applied_at, unsubscribe_token)
    values ('PT-2610-019','reviewing','Patong Sands Hotel','태국 · 방콕','방콕','100–199',120,false,'Somchai P.','groupsales.patongsands@gmail.com','+66 000 000 0019','patongsands.example','객실 120실 규모의 시티 호텔.', '{"url":"","exists":false,"capOk":false,"contactOk":false,"affil":""}', now() - interval '2 days', 'u_' || replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''))
    returning id into p19;
  insert into partners(code, state, name, location, dest, cap_band, cap, banquet, contact_name, contact_email, contact_phone, domain, description, check_, applied_at, reviewed_at, unsubscribe_token)
    values ('PT-2610-020','rejected','Gangneung Sea Hotel','대한민국 · 강릉','강릉','200–399',300,true,'박세라','sales@gangneungsea.example','033-000-0020','gangneungsea.example','동해안 비즈니스 호텔.', '{"url":"","exists":false,"capOk":false,"contactOk":false,"affil":""}', now() - interval '8 days', now() - interval '7 days', 'u_' || replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''))
    returning id into p20;
  insert into partners(code, state, name, location, dest, cap_band, cap, banquet, contact_name, contact_email, contact_phone, domain, description, check_, applied_at, reviewed_at, invite_opt_out_at, unsubscribe_token)
    values ('PT-2607-021','suspended','Bangkok Riverfront Suites','태국 · 방콕','방콕','100–199',180,true,'Pimchanok S.','events@riverfrontsuites.example','+66 000 000 1021','riverfrontsuites.example','강변 스위트 중심의 호텔.', '{"url":"https://riverfrontsuites.example","exists":true,"capOk":true,"contactOk":true,"affil":""}', now() - interval '75 days', now() - interval '73 days', null, 'u_' || replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''))
    returning id into p21;

  insert into partner_history(partner_id, at, actor, actor_label, from_state, to_state, memo) values
    (p1, now() - interval '90 days', 'system', '시스템', null, 'pending', '신청 접수'),
    (p1, now() - interval '87 days', 'operator', '운영자', 'pending', 'approved', '체크리스트 완료 · 시스템이 결과 메일 발송'),
    (p19, now() - interval '2 days', 'system', '시스템', null, 'pending', '신청 접수'),
    (p19, now() - interval '1 days', 'operator', '운영자', 'pending', 'reviewing', '호텔 대표번호로 소속 확인 중'),
    (p20, now() - interval '8 days', 'system', '시스템', null, 'pending', '신청 접수'),
    (p20, now() - interval '7 days', 'operator', '운영자', 'pending', 'rejected', '국내 소재 · 시스템이 결과 메일 발송'),
    (p21, now() - interval '75 days', 'system', '시스템', null, 'pending', '신청 접수'),
    (p21, now() - interval '73 days', 'operator', '운영자', 'pending', 'approved', '시스템이 결과 메일 발송'),
    (p21, now() - interval '8 days', 'operator', '운영자', 'approved', 'suspended', '반복 부정확 견적 · 중지 안내 메일은 직접 발송');

  -- ---------- members (+ auth.users shim rows) ----------
  m1 := gen_random_uuid();
  insert into auth.users(id, email, encrypted_password, email_confirmed_at, raw_app_meta_data) values (m1, 'jieun.kim@hanbit-tour.example', crypt('Demopass1!', gen_salt('bf')), now() - interval '40 days', '{}');
  insert into members(id, state, name, company, org_type, email, phone, consents, mkt_email, mkt_sms, mkt_at, email_verified_at, phone_verified_at, last_login_at, created_at)
    values (m1, 'active', '김지은', '한빛투어', '여행사', 'jieun.kim@hanbit-tour.example', '010-2345-5678', '{"age":true,"terms":true,"privacy":true,"terms_version":"v1"}', true, false, now() - interval '40 days', now() - interval '40 days', now() - interval '40 days', now() - interval '1 days', now() - interval '40 days');

  m5 := gen_random_uuid();
  insert into auth.users(id, email, encrypted_password, email_confirmed_at, raw_app_meta_data) values (m5, 'jihun.oh@hanul-promotion.example', crypt('Demopass1!', gen_salt('bf')), now() - interval '20 days', '{}');
  insert into members(id, state, name, company, org_type, email, phone, consents, locked_at, email_verified_at, phone_verified_at, last_login_at, created_at)
    values (m5, 'locked', '오지훈', '한울프로모션', '여행사', 'jihun.oh@hanul-promotion.example', '010-6789-3456', '{"age":true,"terms":true,"privacy":true}', now() - interval '2 hours', now() - interval '20 days', now() - interval '20 days', now() - interval '5 days', now() - interval '20 days');

  m6 := gen_random_uuid();
  insert into auth.users(id, email, encrypted_password, email_confirmed_at, raw_app_meta_data) values (m6, 'jihyun.bae@sodam-travel.example', crypt('Demopass1!', gen_salt('bf')), now() - interval '25 days', '{}');
  insert into members(id, state, name, company, org_type, email, phone, consents, suspended_at, email_verified_at, phone_verified_at, last_login_at, created_at)
    values (m6, 'suspended', '배지현', '소담트래블', '여행사', 'jihyun.bae@sodam-travel.example', '010-7890-4321', '{"age":true,"terms":true,"privacy":true}', now() - interval '10 days', now() - interval '25 days', now() - interval '25 days', now() - interval '10 days', now() - interval '25 days');

  m7 := gen_random_uuid();
  insert into auth.users(id, email, encrypted_password, email_confirmed_at, raw_app_meta_data) values (m7, 'gaon.lee@saessak-tour.example', crypt('Demopass1!', gen_salt('bf')), null, '{}');
  insert into members(id, state, name, company, org_type, email, consents, created_at)
    values (m7, 'pending_email', '이가온', '새싹투어', '여행사', 'gaon.lee@saessak-tour.example', '{"age":true,"terms":true,"privacy":true}', now() - interval '2 hours');

  m8 := gen_random_uuid();
  insert into auth.users(id, email, encrypted_password, email_confirmed_at, raw_app_meta_data) values (m8, 'yujin.jung@onnuri-edu.example', crypt('Demopass1!', gen_salt('bf')), now() - interval '1 days', '{}');
  insert into members(id, state, name, company, org_type, email, phone, consents, email_verified_at, created_at)
    values (m8, 'pending_phone', '정유진', '온누리에듀', '기업(인하우스)', 'yujin.jung@onnuri-edu.example', null, '{"age":true,"terms":true,"privacy":true}', now() - interval '1 days', now() - interval '1 days');

  -- ---------- rfps: 파이프라인 각 상태 ----------
  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, twin_rooms, king_rooms, ballroom_use, ballroom_purpose, note, consent_at, destination, headcount, public_memo, anon_reviewed, created_at)
    values (private.next_ref('MG'), 'received', 1, '여행사', '새길여행사(주)', '박민수', 'minsu.park@saegil-travel.example', '02-000-1111', '인센티브', current_date + 120, current_date + 123, '50–99명', '방콕', 35, 5, true, '디너', '임직원 80명 인센티브이고 1인 예산은 130만 원 내외로 생각합니다.', now(), '방콕', 80, '방콕 도심 5성급 선호.', false, now() - interval '1 hours')
    returning id into r_received;

  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, twin_rooms, king_rooms, ballroom_use, note, consent_at, destination, headcount, public_memo, anon_reviewed, verifying_at, sla_due_at, owner_id, created_at)
    values (private.next_ref('MG'), 'verifying', 1, '기업(행사 주최)', '대한제약(주)', '이도윤', 'dy.lee@daehan-pharma.example', '010-2345-6789', '인센티브', current_date + 160, current_date + 163, '50–99명', '발리', 30, 5, false, '대한제약 임직원 70명 워크숍입니다.', now(), '발리', 70, '대한제약 임직원 70명 워크숍입니다. 1인 예산 200만 원.', false, now() - interval '20 hours', private.due(now() - interval '20 hours', 3), m1, now() - interval '20 hours')
    returning id into r_verifying;

  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, twin_rooms, king_rooms, ballroom_use, ballroom_purpose, note, consent_at, destination, headcount, public_memo, anon_reviewed, anon_at, verifying_at, owner_id, created_at)
    values (private.next_ref('MG'), 'open', 1, '여행사', '바른여행(주)', '최서연', 'seoyeon.choi@barun-travel.example', '02-000-5678', '인센티브', current_date + 150, current_date + 153, '100–199명', '푸꾸옥', 55, 5, true, '시상식', '푸꾸옥 해변 리조트, 마지막 날 저녁 시상식.', now(), '푸꾸옥', 120, '해변 리조트 선호. 마지막 날 저녁 시상식(약 120명).', true, now() - interval '10 hours', now() - interval '30 hours', m1, now() - interval '32 hours')
    returning id into r_open;

  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, twin_rooms, king_rooms, ballroom_use, note, consent_at, destination, headcount, public_memo, anon_reviewed, anon_at, verifying_at, deadline, owner_id, created_at)
    values (private.next_ref('MG'), 'bidding', 1, '여행사', '한울프로모션', '오지훈', 'jihun.oh@hanul-promotion.example', '010-6789-3456', '워크숍', current_date + 90, current_date + 92, '100–199명', '발리', 40, 8, false, '발리 워크숍, 우붓/사누르 리조트 선호.', now(), '발리', 130, '발리 워크숍. 우붓 또는 사누르 리조트 선호.', true, now() - interval '5 days', now() - interval '6 days', now() + interval '2 days', m5, now() - interval '6 days')
    returning id into r_bidding;

  insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at, viewed_at)
    values (r_bidding, p11, 1, 'viewed', replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''), now() + interval '2 days', now() - interval '5 days', now() - interval '4 days')
    returning id into inv1;
  insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at)
    values (r_bidding, p18, 1, 'invited', replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''), now() + interval '2 days', now() - interval '5 days')
    returning id into inv2;

  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, twin_rooms, king_rooms, ballroom_use, ballroom_purpose, note, consent_at, destination, headcount, public_memo, anon_reviewed, anon_at, verifying_at, deadline, owner_id, created_at)
    values (private.next_ref('MG'), 'collecting', 2, '기타', '푸른길컨설팅', '윤서진', 'seojin.yoon@purungil.example', '010-4567-2468', '컨퍼런스', current_date + 200, current_date + 203, '100–199명', '방콕', 60, 10, true, '오프닝 세션', '전체 150명 참석 컨퍼런스, 동시통역 부스 필요.', now(), '방콕', 150, '개막 세션에 전체 인원이 모이는 컨퍼런스. 동시통역 부스 설치 가능 여부 확인 희망.', true, now() - interval '15 days', now() - interval '16 days', now() - interval '1 days', null, now() - interval '16 days')
    returning id into r_collecting;

  insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at, viewed_at, submitted_at)
    values (r_collecting, p7, 2, 'submitted', replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''), now() - interval '1 days', now() - interval '8 days', now() - interval '7 days', now() - interval '3 days')
    returning id into inv3;
  insert into quotes(invitation_id, rfp_id, round, currency, twin_rate, king_rate, breakfast_included, tax_included, tax_note, availability_all, ballroom_fee, ballroom_name, valid_until, cancellation, hotel_name, contact_name, contact_email, contact_phone, submitted_at)
    values (inv3, r_collecting, 2, 'USD', 145, 220, true, false, '10% 서비스료 + 7% VAT', true, 3500, 'Chao Phraya Grand Ballroom', current_date + 60, '60일 전 무료 취소, 30일 이내 30%', 'Chao Phraya Grand Bangkok', 'Somsak K.', 'events@chaophrayagrand.example', '+66 000 000 1007', now() - interval '3 days');
  insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at)
    values (r_collecting, p2, 2, 'expired', replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''), now() - interval '1 days', now() - interval '8 days');

  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, twin_rooms, king_rooms, ballroom_use, note, consent_at, destination, headcount, public_memo, anon_reviewed, anon_at, verifying_at, deadline, delivered_at, owner_id, created_at)
    values (private.next_ref('MG'), 'delivered', 1, '여행사', '한빛투어', '김지은', 'jieun.kim@hanbit-tour.example', '010-2345-5678', '인센티브', current_date + 100, current_date + 103, '50–99명', '다낭', 45, 6, false, '다낭 해변 리조트 인센티브.', now(), '다낭', 90, '다낭 해변 리조트 선호.', true, now() - interval '10 days', now() - interval '11 days', now() - interval '2 days', now() - interval '1 days', m1, now() - interval '11 days')
    returning id into r_delivered;

  insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at, viewed_at, submitted_at)
    values (r_delivered, p1, 1, 'submitted', replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''), now() - interval '2 days', now() - interval '9 days', now() - interval '8 days', now() - interval '5 days')
    returning id into inv4;
  insert into quotes(invitation_id, rfp_id, round, label, currency, twin_rate, king_rate, breakfast_included, tax_included, availability_all, ballroom_fee, ballroom_name, valid_until, cancellation, hotel_name, contact_name, contact_email, contact_phone, submitted_at)
    values (inv4, r_delivered, 1, 'A', 'USD', 120, 180, true, true, true, 0, null, current_date + 45, '30일 전 무료 취소', 'Ocean Pearl Resort Da Nang', 'Tran Minh Anh', 'events@oceanpearl-danang.example', '+84 000 000 1001', now() - interval '5 days')
    returning id into q1;
  insert into invitations(rfp_id, partner_id, round, status, token, deadline, invited_at, viewed_at, submitted_at)
    values (r_delivered, p2, 1, 'submitted', replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''), now() - interval '2 days', now() - interval '9 days', now() - interval '8 days', now() - interval '4 days')
    returning id into inv5;
  insert into quotes(invitation_id, rfp_id, round, label, currency, twin_rate, king_rate, breakfast_included, tax_included, availability_all, ballroom_fee, ballroom_name, valid_until, cancellation, hotel_name, contact_name, contact_email, contact_phone, submitted_at)
    values (inv5, r_delivered, 1, 'B', 'USD', 110, 170, false, true, true, 0, null, current_date + 40, '45일 전 무료 취소', 'Lotus Bay Resort Da Nang', 'Le Hoang Nam', 'sales@lotusbay-danang.example', '+84 000 000 1002', now() - interval '4 days')
    returning id into q2;

  -- ---------- won (연결 완료) ----------
  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, twin_rooms, king_rooms, ballroom_use, note, consent_at, destination, headcount, public_memo, anon_reviewed, anon_at, verifying_at, deadline, delivered_at, closed_at, owner_id, created_at, pick_otp)
    values (private.next_ref('MG'), 'won', 1, '기업(행사 주최)', '세종메디컬', '임수아', 'sua.im@sejong-medical.example', '010-3456-8642', '컨퍼런스', current_date + 30, current_date + 33, '50–99명', '방콕', 50, 8, true, '방콕 컨퍼런스, 선정 완료.', now(), '방콕', 95, '방콕 컨퍼런스. 선정 완료.', true, now() - interval '30 days', now() - interval '32 days', now() - interval '20 days', now() - interval '19 days', now() - interval '18 days', null, now() - interval '32 days', '{}')
    returning id into r_won;
  insert into invitations(rfp_id, partner_id, round, status, result, token, deadline, invited_at, viewed_at, submitted_at)
    values (r_won, p7, 1, 'submitted', 'selected', replace(replace(replace(encode(gen_random_bytes(24),'base64'),'+','-'),'/','_'),'=',''), now() - interval '20 days', now() - interval '28 days', now() - interval '27 days', now() - interval '22 days')
    returning id into inv6;
  insert into quotes(invitation_id, rfp_id, round, label, currency, twin_rate, king_rate, breakfast_included, tax_included, availability_all, ballroom_fee, valid_until, cancellation, hotel_name, contact_name, contact_email, contact_phone, submitted_at)
    values (inv6, r_won, 1, 'A', 'USD', 150, 230, true, true, true, 4000, current_date + 20, '60일 전 무료 취소', 'Chao Phraya Grand Bangkok', 'Somsak K.', 'events@chaophrayagrand.example', '+66 000 000 1007', now() - interval '22 days');
  insert into selections(rfp_id, quote_id, invitation_id, operator_override, verified_at, verified_phone_masked, org_snapshot, connected_at, retain_until)
    select r_won, q.id, inv6, false, now() - interval '18 days', '010-****-8642', jsonb_build_object('company','세종메디컬','contact_name','임수아','email','sua.im@sejong-medical.example','phone','010-3456-8642'), now() - interval '18 days', (now() - interval '18 days' + interval '3 years')::date
    from quotes q where q.invitation_id = inv6;
  update rfps set pick_otp = jsonb_build_object('at', now() - interval '18 days', 'phone_masked', '010-****-8642', 'operator', false) where id = r_won;

  -- ---------- lost / rejected / cancelled ----------
  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, twin_rooms, king_rooms, ballroom_use, note, consent_at, destination, headcount, anon_reviewed, verifying_at, deadline, closed_at, close_reason, created_at)
    values (private.next_ref('MG'), 'lost', 2, '여행사', '소담트래블', '배지현', 'jihyun.bae@sodam-travel.example', '010-7890-4321', '워크숍', current_date + 70, current_date + 73, '50–99명', '방콕', 25, 4, false, '방콕 워크숍, 두 차례 요청에도 제안 없음.', now(), '방콕', 60, true, now() - interval '40 days', now() - interval '25 days', now() - interval '24 days', '두 차례 요청에도 제안 없음', now() - interval '41 days')
    returning id into r_lost;

  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, note, consent_at, destination, headcount, anon_reviewed, verifying_at, closed_at, close_reason, created_at)
    values (private.next_ref('MG'), 'rejected', 1, '기업(행사 주최)', '강릉수산(주)', '박세라', 'sera.park@gangneung-corp.example', '033-000-1234', '워크숍', current_date + 10, current_date + 12, '50–99명', '강릉', '국내 강릉 워크숍입니다.', now(), '강릉', 55, false, now() - interval '15 days', now() - interval '15 days', '국내 행사(정책 2)', now() - interval '15 days')
    returning id into r_rejected;

  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, note, consent_at, destination, headcount, anon_reviewed, verifying_at, deadline, closed_at, close_reason, created_at)
    values (private.next_ref('MG'), 'cancelled', 1, '여행사', '새싹투어', '이가온', 'gaon.lee@saessak-tour.example', '010-1111-2222', '인센티브', current_date + 200, current_date + 203, '50–99명', '발리', '오거나이저 요청으로 취소.', now(), '발리', 65, true, now() - interval '35 days', now() - interval '5 days', now() - interval '5 days', '오거나이저 요청', now() - interval '36 days')
    returning id into r_cancelled;

  -- ---------- 이력 ----------
  insert into rfp_history(rfp_id, at, actor, actor_label, from_state, to_state, memo) values
    (r_received, now() - interval '1 hours', 'system', '시스템', null, 'received', 'ORG_RECEIVED 발송 · 이력 기록'),
    (r_verifying, now() - interval '20 hours', 'system', '시스템', null, 'received', 'ORG_RECEIVED 발송'),
    (r_verifying, now() - interval '20 hours', 'operator', '운영자', 'received', 'verifying', ''),
    (r_open, now() - interval '32 hours', 'system', '시스템', null, 'received', 'ORG_RECEIVED 발송'),
    (r_open, now() - interval '30 hours', 'operator', '운영자', 'received', 'verifying', ''),
    (r_open, now() - interval '10 hours', 'operator', '운영자', 'verifying', 'open', '익명화 검토 완료'),
    (r_bidding, now() - interval '6 days', 'operator', '운영자', 'verifying', 'open', '익명화 검토 완료'),
    (r_bidding, now() - interval '5 days', 'operator', '운영자', null, null, '호텔 2곳 초대 (Ubud Rice Terrace Resort, Sanur Lagoon Hotel)'),
    (r_bidding, now() - interval '5 days', 'operator', '운영자', 'open', 'bidding', '초대 2곳 · 마감'),
    (r_collecting, now() - interval '9 days', 'operator', '운영자', 'bidding', 'collecting', '1라운드 마감 · 제출 0건'),
    (r_collecting, now() - interval '9 days', 'operator', '운영자', 'collecting', 'bidding', '새 라운드 2 · 인원 재확인'),
    (r_collecting, now() - interval '1 days', 'system', '시스템', 'bidding', 'collecting', '마감 경과 · 자동 전이'),
    (r_delivered, now() - interval '2 days', 'operator', '운영자', 'collecting', 'delivered', '견적 2건 도착'),
    (r_lost, now() - interval '24 days', 'operator', '운영자', 'collecting', 'lost', '두 차례 요청에도 제안 없음'),
    (r_rejected, now() - interval '15 days', 'operator', '운영자', 'verifying', 'rejected', '국내 행사(정책 2)'),
    (r_cancelled, now() - interval '5 days', 'operator', '운영자', 'open', 'cancelled', '오거나이저 요청');

  -- ---------- track 토큰 (전체 RFP) ----------
  insert into rfp_tokens(rfp_id, kind, token, state)
    select id, 'track', 'trk_' || replace(replace(replace(encode(gen_random_bytes(18),'base64'),'+','-'),'/','_'),'=',''), 'active' from rfps
    where not exists (select 1 from rfp_tokens t where t.rfp_id = rfps.id and t.kind = 'track');

  insert into rfp_tokens(rfp_id, kind, token, state, created_by, views, last_viewed_at)
    values (r_delivered, 'share', 's_demoShare0001', 'active', m1, 4, now() - interval '1 days');

  -- ---------- link request 데모 ----------
  insert into rfps(ref, state, round, org_type, company, contact_name, contact_email, contact_phone, event_type, start_date, end_date, headcount_band, region, note, consent_at, destination, headcount, anon_reviewed, closed_at, close_reason, created_at)
    values (private.next_ref('MG'), 'lost', 1, '여행사', '한빛투어', '김지은', 'old.jieun@hanbit-tour.example', '010-2345-5678', '인센티브', current_date - 10, current_date - 7, '50–99명', '방콕', '휴대전화만 일치하는 과거 요청.', now() - interval '60 days', '방콕', 70, true, now() - interval '58 days', '선택하지 않음', now() - interval '61 days')
    returning id into r_lost;
  insert into link_requests(member_id, rfp_id, match_type, status, requested_at) values (m1, r_lost, 'phone', 'pending', now() - interval '2 hours');

  -- ---------- 발송 기록 (sendLog/failures/memberLog) ----------
  insert into notification_log(template_id, recipient_kind, rfp_id, to_email, vars, idempotency_key, status, scheduled_at)
    values ('ORG_RECEIVED', 'org', r_received, 'minsu.park@saegil-travel.example', '{}', 'ORG_RECEIVED:' || r_received, 'failed', now() - interval '1 hours');
  insert into notification_deliveries(log_id, channel, provider, to_addr, status, error, attempts, updated_at)
    select id, 'email', 'resend', 'minsu.park@saegil-travel.exampel', 'failed', 'domain not found', 1, now() from notification_log where idempotency_key = 'ORG_RECEIVED:' || r_received;

  insert into notification_log(template_id, recipient_kind, rfp_id, to_email, vars, idempotency_key, status, scheduled_at)
    values ('ORG_DELIVERED', 'org', r_delivered, 'jieun.kim@hanbit-tour.example', '{}', 'ORG_DELIVERED:' || r_delivered, 'done', now() - interval '2 days');
  insert into notification_deliveries(log_id, channel, provider, to_addr, status, sent_at, updated_at)
    select id, 'email', 'resend', 'jieun.kim@hanbit-tour.example', 'sent', now() - interval '2 days', now() from notification_log where idempotency_key = 'ORG_DELIVERED:' || r_delivered;

  insert into notification_log(template_id, recipient_kind, member_id, to_email, vars, idempotency_key, status, scheduled_at)
    values ('ACC_WELCOME', 'mem', m1, 'jieun.kim@hanbit-tour.example', '{}', 'ACC_WELCOME:' || m1, 'done', now() - interval '40 days');

  -- ---------- 회원 감사 로그 ----------
  insert into audit_log(actor, member_id, action, label, reason, notif, at) values
    ('system', m1, 'signup', '가입 완료(이메일·휴대전화 인증)', '', 'ACC_WELCOME', now() - interval '40 days'),
    ('system', m5, 'lock', '로그인 실패 10회로 잠금', '1시간 내 10회 실패', 'ACC_LOCKED', now() - interval '2 hours'),
    ('operator', m6, 'suspend', '이용 정지', '계정 공유 의심 · 서로 다른 IP 2곳에서 동시 로그인', '', now() - interval '10 days');

  insert into member_access_log(member_id, at, ip, ua, ok) values
    (m1, now() - interval '1 days', '203.0.113.24', 'Chrome · Windows', true),
    (m1, now() - interval '20 days', '203.0.113.24', 'Chrome · Windows', false),
    (m5, now() - interval '2 hours', '203.0.113.200', 'Chrome · Windows', false),
    (m5, now() - interval '2 hours' - interval '2 minutes', '203.0.113.200', 'Chrome · Windows', false);

end $$;

-- ============================================================
-- 피드백 데모 데이터 (13건). SPEC_FEEDBACK.md §5.3 표를 그대로 반영한다.
-- BEFORE INSERT 트리거(private.feedback_gen_ref)가 status 를 항상 'new' 로 강제하므로,
-- new 가 아닌 상태의 데모 행은 feedback_set_status()(operator 클레임) 로 전이시켜서 만든다 —
-- 그래야 감사 로그(feedback_event)·전이 가드가 실제 운영 경로와 똑같이 남는다.
-- is_demo=false, #12(DEMO 미리보기)만 is_demo=true (SPEC_FEEDBACK_ADDENDUM.md §B).
-- ============================================================
do $$
declare
  op1 uuid := gen_random_uuid();
  rid_bidding uuid; ref_bidding text; bid_token text; bid_hash8 text; hotel_email text;
  rid_delivered uuid; ref_delivered text; trk_token text; trk_hash8 text;
  f1 uuid; f2 uuid; f3 uuid; f4 uuid; f5 uuid; f6 uuid; f7 uuid; f8 uuid; f9 uuid; f10 uuid; f11 uuid; f12 uuid; f13 uuid;
  jieun_id uuid;
begin
  insert into auth.users(id, email, encrypted_password, email_confirmed_at, raw_app_meta_data)
    values (op1, 'ops.kim@micego.kr', crypt('Demopass1!', gen_salt('bf')), now() - interval '200 days', '{"role":"operator"}');

  select id into jieun_id from members where email = 'jieun.kim@hanbit-tour.example' limit 1;

  select id, ref into rid_bidding, ref_bidding from rfps where company = '한울프로모션' and state = 'bidding' limit 1;
  select i.token, p.contact_email into bid_token, hotel_email
    from invitations i join partners p on p.id = i.partner_id where i.rfp_id = rid_bidding limit 1;
  bid_hash8 := left(encode(digest(bid_token, 'sha256'), 'hex'), 8);

  select id, ref into rid_delivered, ref_delivered from rfps where company = '한빛투어' and state = 'delivered' limit 1;
  select token into trk_token from rfp_tokens where rfp_id = rid_delivered and kind = 'track' limit 1;
  trk_hash8 := left(encode(digest(trk_token, 'sha256'), 'hex'), 8);

  perform set_config('request.jwt.claims', jsonb_build_object('role','authenticated','sub',op1::text,'app_metadata',jsonb_build_object('role','operator'))::text, true);

  -- #1 new · SYS · organizer_guest — track delivered, verified(ref+track 토큰 일치), 회신 이메일, JS 오류 2건
  insert into feedback (
    client_submission_id, source, category, content, body_hash, reply_email, reply_consent_at,
    user_type, page_path, mode, lang, ui_state, rfp_ref, token_kind, token_hash8, viewport, ua, tz, build_version,
    last_js_errors, dwell_ms, submitted_at, ops_mail_status, ops_mail_sent_at, ack_mail_status, ack_mail_sent_at, created_at
  ) values (
    gen_random_uuid(), 'widget', 'SYS',
    '견적을 다 받았다고 나오는데 목록에서 두 번째 호텔 견적이 안 보여요. 새로고침해도 똑같이 하나만 보입니다.',
    encode(digest('demo-fb-1','sha256'),'hex'), 'jieun.kim@hanbit-tour.example', now() - interval '6 hours',
    'organizer_guest', '/ko/track.html', 'agency', 'ko', 'delivered', ref_delivered, 'track', trk_hash8,
    '390x844@3', 'iOS 17 · Safari', 'Asia/Seoul', '2026.10.01-3',
    '[{"t":"2026-09-27T09:55:00.000Z","m":"TypeError: Cannot read properties of null","s":"/assets/track.js","l":"142:9"},
      {"t":"2026-09-27T09:55:01.000Z","m":"NetworkError fetching quotes","s":"/assets/track.js","l":"88:3"}]'::jsonb,
    45000, now() - interval '6 hours', 'sent', now() - interval '6 hours' + interval '10 seconds',
    'sent', now() - interval '6 hours' + interval '15 seconds', now() - interval '6 hours'
  ) returning id into f1;

  -- #2 new · OPS · hotel — bid, 호텔 담당자 이메일 프리필, token_only(rfp_ref 없음)
  insert into feedback (
    client_submission_id, source, category, content, body_hash, reply_email, reply_consent_at,
    user_type, page_path, mode, lang, token_kind, token_hash8, viewport, ua, tz,
    dwell_ms, submitted_at, ops_mail_status, ops_mail_sent_at, ack_mail_status, ack_mail_sent_at, created_at
  ) values (
    gen_random_uuid(), 'widget', 'OPS',
    '견적 입력 화면에서 조식 포함 여부를 체크했는데 저장 후 다시 들어오면 체크가 풀려 있습니다.',
    encode(digest('demo-fb-2','sha256'),'hex'), hotel_email, now() - interval '4 hours',
    'hotel', '/en/bid.html', 'hotel', 'en', 'bid', bid_hash8, '1440x900@2', 'Windows · Chrome 128', 'Asia/Ho_Chi_Minh',
    30000, now() - interval '4 hours', 'sent', now() - interval '4 hours' + interval '8 seconds',
    'sent', now() - interval '4 hours' + interval '12 seconds', now() - interval '4 hours'
  ) returning id into f2;

  -- #3 new · ETC · visitor — 회신 이메일 없음, 분류 지연(2일 경과, 여전히 new)
  insert into feedback (
    client_submission_id, source, category, content, body_hash,
    user_type, page_path, mode, lang, viewport, ua, tz,
    dwell_ms, submitted_at, ops_mail_status, ops_mail_sent_at, created_at
  ) values (
    gen_random_uuid(), 'widget', 'ETC',
    '사이트 정말 잘 쓰고 있는데 다크 모드도 있으면 좋을 것 같아서 의견 남겨봅니다.',
    encode(digest('demo-fb-3','sha256'),'hex'),
    'visitor', '/ko/index.html', 'root', 'ko', '1280x720@1', 'Mac · Safari 17', 'Asia/Seoul',
    9000, now() - interval '2 days', 'sent', now() - interval '2 days' + interval '9 seconds', now() - interval '2 days'
  ) returning id into f3;

  -- #4 new · SYS · visitor — 의심(URL 5개), 알림 skipped
  insert into feedback (
    client_submission_id, source, category, content, body_hash,
    user_type, page_path, mode, lang, viewport, ua, tz,
    is_suspect, suspect_reasons, dwell_ms, submitted_at, ops_mail_status, created_at
  ) values (
    gen_random_uuid(), 'widget', 'SYS',
    '이 상품 정말 좋아요 http://a.example http://b.example http://c.example http://d.example http://e.example 확인해보세요.',
    encode(digest('demo-fb-4','sha256'),'hex'),
    'visitor', '/index.html', 'root', 'ko', '390x844@3', 'Android 14 · Chrome 128', 'Asia/Seoul',
    true, array['urls'], 2000, now() - interval '3 hours', 'skipped', now() - interval '3 hours'
  ) returning id into f4;

  -- #5 triaged · SYS·TEXT · travel_agency — P3, 담당 미지정, 김지은(m1 회원)
  insert into feedback (
    client_submission_id, source, category, content, body_hash,
    user_type, member_id, page_path, mode, lang, viewport, ua, tz,
    dwell_ms, submitted_at, ops_mail_status, ops_mail_sent_at, created_at
  ) values (
    gen_random_uuid(), 'widget', 'SYS',
    '견적 비교표에서 "세금 포함" 문구가 영문 페이지에서는 그대로 한글로 나옵니다. 확인 부탁드려요.',
    encode(digest('demo-fb-5','sha256'),'hex'),
    'travel_agency', jieun_id, '/ko/track.html', 'agency', 'ko', '1536x864@1.25', 'Windows · Edge 128', 'Asia/Seoul',
    60000, now() - interval '1 days', 'sent', now() - interval '1 days' + interval '9 seconds', now() - interval '1 days'
  ) returning id into f5;
  update feedback set priority = 3, subcode = 'TEXT' where id = f5;
  perform feedback_set_status(f5, 'triaged', null, null);

  -- #6 in_progress · SYS·BUG · organizer_guest — P1, 착수 1시간 전, 카카오 인앱 UA
  insert into feedback (
    client_submission_id, source, category, content, body_hash,
    user_type, page_path, mode, lang, ui_state, viewport, ua, tz,
    dwell_ms, submitted_at, ops_mail_status, ops_mail_sent_at, created_at
  ) values (
    gen_random_uuid(), 'widget', 'SYS',
    '카카오톡으로 들어온 링크로 접속했는데 제출 버튼을 눌러도 계속 로딩만 됩니다. 다른 방법이 없을까요.',
    encode(digest('demo-fb-6','sha256'),'hex'),
    'organizer_guest', '/ko/track.html', 'agency', 'ko', 'bidding', '390x844@3', 'iOS 17 · Safari · KakaoTalk', 'Asia/Seoul',
    20000, now() - interval '2 hours', 'sent', now() - interval '2 hours' + interval '9 seconds', now() - interval '2 hours'
  ) returning id into f6;
  update feedback set priority = 1, subcode = 'BUG', assignee = op1 where id = f6;
  perform feedback_set_status(f6, 'triaged', null, null);
  perform feedback_set_status(f6, 'in_progress', null, null);
  update feedback set started_at = now() - interval '1 hours' where id = f6;

  -- #7 in_progress · OPS·RFP · travel_agency — P2, mismatch(요청번호는 비딩 건인데 토큰은 전달됨 건)
  insert into feedback (
    client_submission_id, source, category, content, body_hash,
    user_type, member_id, page_path, mode, lang, rfp_ref, token_kind, token_hash8, viewport, ua, tz,
    dwell_ms, submitted_at, ops_mail_status, ops_mail_sent_at, created_at
  ) values (
    gen_random_uuid(), 'widget', 'OPS',
    '요청번호로는 다른 견적 건이 뜨는 것 같아요. 제가 보낸 링크가 맞는지 확인 부탁드립니다.',
    encode(digest('demo-fb-7','sha256'),'hex'),
    'travel_agency', jieun_id, '/ko/track.html', 'agency', 'ko', ref_bidding, 'track', trk_hash8, '390x844@3', 'iOS 17 · Safari', 'Asia/Seoul',
    50000, now() - interval '3 days', 'sent', now() - interval '3 days' + interval '9 seconds', now() - interval '3 days'
  ) returning id into f7;
  update feedback set priority = 2, subcode = 'RFP', assignee = op1 where id = f7;
  perform feedback_set_status(f7, 'triaged', null, null);
  perform feedback_set_status(f7, 'in_progress', null, null);

  -- #8 on_hold · SYS·IDEA · hotel — P4, 보류 사유 메모
  insert into feedback (
    client_submission_id, source, category, content, body_hash,
    user_type, page_path, mode, lang, viewport, ua, tz,
    dwell_ms, submitted_at, ops_mail_status, ops_mail_sent_at, created_at
  ) values (
    gen_random_uuid(), 'widget', 'SYS',
    '견적서 다운로드 버튼이 있으면 좋겠습니다. 매번 화면 캡처해서 내부 보고에 쓰고 있어요.',
    encode(digest('demo-fb-8','sha256'),'hex'),
    'hotel', '/en/bid.html', 'hotel', 'en', '1440x900@2', 'Mac · Chrome 128', 'Asia/Bangkok',
    40000, now() - interval '5 days', 'sent', now() - interval '5 days' + interval '9 seconds', now() - interval '5 days'
  ) returning id into f8;
  update feedback set priority = 4, subcode = 'IDEA', assignee = op1 where id = f8;
  perform feedback_set_status(f8, 'triaged', null, null);
  perform feedback_set_status(f8, 'on_hold', null, '다음 분기 로드맵에서 다운로드 기능 검토 예정 · 보류');

  -- #9 done · OPS·ACCT · travel_agency — 결과 answered, 메모 2건, 처리 이력 다수
  insert into feedback (
    client_submission_id, source, category, content, body_hash, reply_email, reply_consent_at,
    user_type, member_id, page_path, mode, lang, viewport, ua, tz,
    dwell_ms, submitted_at, ops_mail_status, ops_mail_sent_at, ack_mail_status, ack_mail_sent_at, created_at
  ) values (
    gen_random_uuid(), 'widget', 'OPS',
    '회사 계정에 담당자를 한 명 더 추가하고 싶은데 어디서 하는 건가요? 계정 설정에는 안 보이네요.',
    encode(digest('demo-fb-9','sha256'),'hex'), 'jieun.kim@hanbit-tour.example', now() - interval '10 days',
    'travel_agency', jieun_id, '/ko/settings.html', 'agency', 'ko', '390x844@3', 'iOS 17 · Safari', 'Asia/Seoul',
    35000, now() - interval '10 days', 'sent', now() - interval '10 days' + interval '9 seconds',
    'sent', now() - interval '10 days' + interval '14 seconds', now() - interval '10 days'
  ) returning id into f9;
  update feedback set priority = 3, subcode = 'ACCT', assignee = op1 where id = f9;
  perform feedback_set_status(f9, 'triaged', null, null);
  perform feedback_set_status(f9, 'in_progress', null, null);
  perform feedback_set_status(f9, 'on_hold', null, '정책팀 확인 후 회신 예정');
  perform feedback_set_status(f9, 'in_progress', null, '정책팀 확인 완료 · 답변 준비');
  perform feedback_set_status(f9, 'done', 'answered', '담당자 추가는 현재 1계정 1담당자 정책이라 지원하지 않음을 안내함');

  -- #10 done · SYS · visitor — new 에서 바로 spam 종료
  insert into feedback (
    client_submission_id, source, category, content, body_hash,
    user_type, page_path, mode, lang, viewport, ua, tz,
    dwell_ms, submitted_at, ops_mail_status, ops_mail_sent_at, created_at
  ) values (
    gen_random_uuid(), 'widget', 'SYS',
    '무료 상담 받아보세요 지금 바로 연락주시면 특별 혜택 드립니다 아래 링크 확인하세요 http://spam.example',
    encode(digest('demo-fb-10','sha256'),'hex'),
    'visitor', '/index.html', 'root', 'ko', '390x844@3', 'Android 14 · Chrome 128', 'Asia/Seoul',
    500, now() - interval '7 days', 'sent', now() - interval '7 days' + interval '9 seconds', now() - interval '7 days'
  ) returning id into f10;
  perform feedback_set_status(f10, 'done', 'spam', null);

  -- #11 new · OPS · visitor — source=contact, 이름, 운영 알림 failed(3회)
  insert into feedback (
    client_submission_id, source, category, content, body_hash, reply_email, reply_consent_at, contact_name,
    user_type, page_path, mode, lang, viewport, ua, tz,
    dwell_ms, submitted_at, ops_mail_status, ops_mail_attempts, ops_mail_error, created_at
  ) values (
    gen_random_uuid(), 'contact', 'OPS',
    '다낭 지역 풀빌라 단체 계약 관련해서 미팅을 요청드리고 싶습니다. 회신 부탁드립니다.',
    encode(digest('demo-fb-11','sha256'),'hex'), 'partner.lead@newresort.example', now() - interval '1 days', '박준호',
    'visitor', '/ko/contact.html', 'root', 'ko', '1920x1080@1', 'Windows · Chrome 128', 'Asia/Seoul',
    75000, now() - interval '1 days', 'failed', 3, 'Resend 500: temporary delivery error', now() - interval '1 days'
  ) returning id into f11;

  -- #12 new · SYS · organizer_guest — DEMO(preview:bidding), 기본 필터에서 숨김(is_demo=true)
  insert into feedback (
    client_submission_id, source, category, content, body_hash,
    user_type, page_path, mode, lang, ui_state, viewport, ua, tz,
    is_demo, dwell_ms, submitted_at, ops_mail_status, created_at
  ) values (
    gen_random_uuid(), 'widget', 'SYS',
    '이건 스테이징에서 미리 보다가 남긴 테스트 의견입니다. 실제 문제는 아니에요.',
    encode(digest('demo-fb-12','sha256'),'hex'),
    'organizer_guest', '/ko/track.html', 'agency', 'ko', 'preview:bidding', '390x844@3', 'iOS 17 · Safari', 'Asia/Seoul',
    true, 12000, now() - interval '1 hours', 'skipped', now() - interval '1 hours'
  ) returning id into f12;

  -- #13 done · SYS·BUG · visitor — 익명화 대상(13개월 전 접수, 아래 feedback_anonymize() 호출로 실제 익명화됨)
  insert into feedback (
    client_submission_id, source, category, content, body_hash, reply_email, reply_consent_at,
    user_type, page_path, mode, lang, viewport, ua, tz, referrer, token_kind, token_hash8,
    last_js_errors, dwell_ms, submitted_at, ops_mail_status, ops_mail_sent_at, ack_mail_status, ack_mail_sent_at, created_at
  ) values (
    gen_random_uuid(), 'widget', 'SYS',
    '결제 화면에서 오류가 나서 old.visitor@example.com 또는 010-9999-8888 로 연락 부탁드렸었습니다.',
    encode(digest('demo-fb-13','sha256'),'hex'), 'old.visitor@example.com', now() - interval '13 months', 'visitor',
    '/ko/index.html', 'root', 'ko', '375x667@2', 'iOS 15 · Safari', 'Asia/Seoul', '/ko/track.html', 'track', 'aaaa1111',
    '[{"t":"2025-08-20T00:00:00.000Z","m":"old error","s":"/assets/old.js","l":"1:1"}]'::jsonb,
    18000, now() - interval '13 months', 'sent', now() - interval '13 months' + interval '9 seconds',
    'sent', now() - interval '13 months' + interval '14 seconds', now() - interval '13 months'
  ) returning id into f13;
  update feedback set priority = 2, subcode = 'BUG', assignee = op1 where id = f13;
  perform feedback_set_status(f13, 'triaged', null, null);
  perform feedback_set_status(f13, 'in_progress', null, null);
  perform feedback_set_status(f13, 'done', 'fixed', null);

  reset request.jwt.claims;

  -- #13 을 실제로 12개월 보관기한 초과분으로 익명화한다(다른 데모 행은 전부 최근 데이터라 영향 없음).
  perform feedback_anonymize(now() - interval '12 months');
end $$;
