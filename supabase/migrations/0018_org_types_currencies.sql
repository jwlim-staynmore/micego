-- 0018_org_types_currencies.sql
-- 코드 점검에서 찾은 불일치 2건을 서버 쪽에서 맞춘다(2026-10-07).
--  1) 소속 유형: 견적 요청 폼은 5개(여행사·랜드사·기업(행사 주최)·협회·기관·기타)를 보내는데
--     members 체크 제약과 Edge Function 검증은 3개('여행사','기업(인하우스)','기타')만 받아
--     랜드사·기업·협회 요청이 접수 단계에서 거절됐다. 5개로 통일하고, 기존 '기업(인하우스)'는
--     '기업(행사 주최)'로 옮긴다(가입·계정 설정 화면도 같은 목록으로 바뀜).
--  2) 통화: 서비스 국가 중 대만·홍콩(마카오) 통화가 정산 지원 통화에 없어 견적은 받아도
--     정산 입력에서 막혔다. TWD·HKD를 추가한다. THB는 0010부터 있었고, 호텔 견적 폼 선택지에만 빠져 있었다.
-- 선정 동의 기록(옛 0010_selection_consent)을 되찾으면 0019로 넣는다.

-- 1) 소속 유형 ----------------------------------------------------------------
update members set org_type = '기업(행사 주최)' where org_type = '기업(인하우스)';
update rfps    set org_type = '기업(행사 주최)' where org_type = '기업(인하우스)';

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.members'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%org_type%'
  loop
    execute format('alter table members drop constraint %I', c);
  end loop;
end $$;

alter table members add constraint members_org_type_check
  check (org_type in ('여행사','랜드사','기업(행사 주최)','협회·기관','기타'));

-- 2) 지원 통화 ----------------------------------------------------------------
-- 운영 중 값이 바뀌었을 수 있으므로 덮어쓰지 않고 빠진 코드만 뒤에 붙인다.
update settings s
   set value = s.value || coalesce((
         select jsonb_agg(c order by ord)
           from unnest(array['TWD','HKD']) with ordinality as t(c, ord)
          where not (s.value ? c)), '[]'::jsonb)
 where s.key = 'supported_currencies';

-- 3) 견적 통화 검사 -----------------------------------------------------------
-- 호텔 직접 제출(submit_quote)과 지역 파트너 대리 입력(partner_quote_proxy_enter)이 모두 quotes에 쓰므로
-- 테이블 트리거 하나로 막는다. 정산 지원 통화가 아닌 견적은 비교표까지 갔다가 정산에서 멈추기 때문이다.
create or replace function private.quote_currency_check() returns trigger
language plpgsql set search_path = public, private as $$
declare sup jsonb;
begin
  if tg_op = 'UPDATE' and new.currency is not distinct from old.currency then return new; end if;
  select value into sup from settings where key = 'supported_currencies';
  if new.currency is not null and sup is not null and not (sup ? new.currency) then
    raise exception using errcode = 'P0001', message = 'MG:VALIDATION';
  end if;
  return new;
end $$;

drop trigger if exists quotes_currency_check on quotes;
create trigger quotes_currency_check before insert or update of currency on quotes
  for each row execute function private.quote_currency_check();
