-- 0018: 소속 유형 5종 통일 + 지원 통화(TWD·HKD) + 견적 통화 트리거
do $$
declare
  rid uuid; pid uuid; inv uuid; ok boolean;
begin
  -- 1) 견적 요청 폼의 5개 값은 모두 members에 들어간다
  insert into members(id, state, name, company, org_type, email)
    select gen_random_uuid(), 'pending_email', '테스트', '회사', t, 'org' || n || '@example.com'
      from unnest(array['여행사','랜드사','기업(행사 주최)','협회·기관','기타']) with ordinality as x(t, n);

  -- 옛 값 '기업(인하우스)'는 더 이상 받지 않는다
  ok := false;
  begin
    insert into members(id, state, name, company, org_type, email)
      values (gen_random_uuid(), 'pending_email', '테스트', '회사', '기업(인하우스)', 'old@example.com');
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'old org_type 기업(인하우스) should be rejected'; end if;
  if exists (select 1 from members where org_type = '기업(인하우스)') then
    raise exception 'legacy org_type rows should have been migrated';
  end if;

  -- 2) 지원 통화에 THB·TWD·HKD가 있다
  if not exists (select 1 from settings where key = 'supported_currencies' and value ?& array['THB','TWD','HKD']) then
    raise exception 'supported_currencies should include THB, TWD, HKD';
  end if;

  -- 3) 지원하지 않는 통화(GBP) 견적은 막히고, THB 견적은 들어간다
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band, company, contact_name)
    values ('MG-TEST-080','bidding',1,'cur@example.com','010-0000-0080','메모', now(), '50–99명','테스트','통화')
    returning id into rid;
  insert into partners(code, state, name, contact_email, contact_phone) values ('PT-TEST-080','approved','통화테스트호텔','c@example.com','010-8') returning id into pid;
  insert into invitations(rfp_id, partner_id, round, status, token) values (rid, pid, 1, 'invited', 'tok-cur-1') returning id into inv;

  ok := false;
  begin
    insert into quotes(invitation_id, rfp_id, round, currency, twin_rate, king_rate, breakfast_included, tax_included, availability_all, valid_until, hotel_name, submitted_at)
      values (inv, rid, 1, 'GBP', 100, 150, true, true, true, current_date+30, '통화테스트호텔', now());
  exception when others then
    if sqlerrm = 'MG:VALIDATION' then ok := true; else raise; end if;
  end;
  if not ok then raise exception 'GBP quote should be rejected with MG:VALIDATION'; end if;

  insert into quotes(invitation_id, rfp_id, round, currency, twin_rate, king_rate, breakfast_included, tax_included, availability_all, valid_until, hotel_name, submitted_at)
    values (inv, rid, 1, 'THB', 4800, 5500, true, true, true, current_date+30, '통화테스트호텔', now());

end $$;
