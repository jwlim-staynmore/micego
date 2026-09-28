-- MICEGO seed.sql — 운영에 필요한 기준 데이터 (데모 RFP/파트너/회원은 seed_demo.sql 에 있음)
set search_path = public;

-- ---------- settings ----------
insert into settings(key, value) values
  ('sla_business_days', '3'),
  ('partner_review_days', '5'),
  ('bid_default_days', '3'),
  ('bid_large_days', '5'),
  ('large_group_min', '200'),
  ('quote_min_valid_business_days', '2'),
  ('share_expire_days', '30'),
  ('pick_auto_close', 'true'),
  ('ops_inbox', '"ops@micego.example"'),
  ('otp', '{"email_ttl":600,"sms_ttl":180,"cooldown":60,"max_wrong":5,"sms_lock":600,"email_day":10,"phone_day":5,"pick_day":10}')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ---------- 한국 공휴일 2026 (mock-data.js 와 동일) ----------
insert into kr_holidays(day, name) values
  ('2026-01-01','신정'), ('2026-02-16','설날 연휴'), ('2026-02-17','설날'), ('2026-02-18','설날 연휴'),
  ('2026-03-02','삼일절 대체공휴일'), ('2026-05-05','어린이날'), ('2026-05-25','부처님오신날 대체공휴일'),
  ('2026-08-17','광복절 대체공휴일'), ('2026-09-24','추석 연휴'), ('2026-09-25','추석'), ('2026-09-26','추석 연휴'),
  ('2026-10-03','개천절'), ('2026-10-05','개천절 대체공휴일'), ('2026-10-09','한글날'), ('2026-12-25','성탄절')
on conflict (day) do nothing;

-- 2027: 고정 양력 공휴일만 우선 등재. 설날·부처님오신날·추석 등 음력 기준일과 대체공휴일 여부는
-- 정부 관보 확정 후 설정 > 공휴일(admin_holiday_add)에서 추가해야 한다 (TODO(operator)).
insert into kr_holidays(day, name) values
  ('2027-01-01','신정'), ('2027-03-01','삼일절'), ('2027-05-05','어린이날'),
  ('2027-06-06','현충일'), ('2027-08-15','광복절'), ('2027-10-03','개천절'),
  ('2027-10-09','한글날'), ('2027-12-25','성탄절')
on conflict (day) do nothing;

-- ---------- 알림 템플릿 표시명 (admin_snapshot 의 sendLog/failures/memberLog 표기용) ----------
insert into notif_template_meta(id, name) values
  ('ORG_RECEIVED', '접수 확인'),
  ('ORG_REJECTED', '반려 안내'),
  ('ORG_BIDDING', '비딩중 진입'),
  ('ORG_REBID', '새 라운드 (조건 변경)'),
  ('ORG_DELIVERED', '견적 도착 (전달됨)'),
  ('ORG_WON', '성사 (호텔 선정·연결)'),
  ('ORG_LOST', '미성사 종료'),
  ('ORG_CANCELLED', '취소 확인'),
  ('ORG_PICK_OTP', '제안 선택 인증번호 (문자)'),
  ('HTL_INVITE', 'Bid invitation'),
  ('HTL_REMINDER', 'Deadline reminder (24h)'),
  ('HTL_QUOTE_RECEIVED', 'Quote received'),
  ('HTL_SELECTED_CONNECT', 'Selected + organizer introduction'),
  ('HTL_NOT_SELECTED', 'Not selected'),
  ('PTN_APPLIED', 'Partner application received'),
  ('PTN_APPROVED', 'Partner approved'),
  ('PTN_REJECTED', 'Partner not approved'),
  ('PTN_REINSTATED', 'Partner reinstated'),
  ('HTL_CONFIRM', 'Confirm quote entered on your behalf'),
  ('CONSOLE_NOTICE', '콘솔 내부 알림 (지역 파트너 · 본사)'),
  ('ACC_EMAIL_CODE', '이메일 인증번호'),
  ('ACC_EMAIL_EXISTS', '이미 가입된 이메일 안내'),
  ('ACC_WELCOME', '가입 완료 안내'),
  ('ACC_LINKED', '이전 요청 연결 안내'),
  ('ACC_PW_RESET', '비밀번호 재설정 링크'),
  ('ACC_PW_CHANGED', '비밀번호 변경 완료'),
  ('ACC_EMAIL_CHANGED', '이메일 변경 완료 (이전 주소)'),
  ('ACC_PHONE_CHANGED', '휴대전화 변경 완료'),
  ('ACC_LOCKED', '계정 잠금 안내'),
  ('ACC_WITHDRAWN', '탈퇴 완료 안내'),
  ('ACC_SMS_OTP', '휴대전화 인증번호 (문자)'),
  ('OPS_ORG_PROGRESS', '진행 상황 회신 (SLA)'),
  ('OPS_ORG_INFO', '정보 보완 요청'),
  ('OPS_ORG_DATE', '일정 확정 확인'),
  ('OPS_ORG_NOQUOTE', '취합중 0건 현황 + 재요청 예정일'),
  ('OPS_ORG_CLOSE_CHECK', '미성사 닫기 전 확인'),
  ('OPS_ORG_FEW_HOTELS', '초대 가능 호텔 2곳 미만 사전 안내'),
  ('OPS_ORG_ANON_INCIDENT', '익명화 누락 고지'),
  ('OPS_HTL_FOLLOWUP', 'Deadline follow-up (no reply)'),
  ('OPS_HTL_QUOTE_CHECK', 'Quote check (blank fields / outliers)'),
  ('OPS_HTL_CANCELLED', 'Request cancelled (during bidding)'),
  ('OPS_PTN_SUSPEND', 'Listing paused + how to reinstate'),
  ('OPS_PTN_DOMAIN_CHECK', 'Affiliation check (personal email)'),
  ('OPS_ACC_LINK', '회원 연결 요청 확인 (휴대전화 일치)'),
  ('OPS_RFP_TRANSFER', '요청 이관 안내 (양쪽 회원)')
on conflict (id) do update set name = excluded.name;
