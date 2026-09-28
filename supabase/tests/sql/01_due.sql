-- private.due() 는 SPEC_LAUNCH.md 의 두 예시와 정확히 일치해야 한다.
do $$
declare v timestamptz;
begin
  v := private.due('2026-10-06 09:00+09'::timestamptz, 3);
  if v <> '2026-10-08 18:00+09'::timestamptz then
    raise exception 'due() example 1 failed: got %', v;
  end if;

  v := private.due('2026-10-07 10:00+09'::timestamptz, 3);
  if v <> '2026-10-12 18:00+09'::timestamptz then
    raise exception 'due() example 2 failed: got %', v;
  end if;

  -- 주말(토) 18시 이후 기산 → 다음 영업일부터 3일
  v := private.due('2026-10-03 20:00+09'::timestamptz, 3);
  -- 10/3(토),10/4(일) weekend, 10/5(월) holiday, 10/6(화) biz#1, 10/7(수) biz#2, 10/8(목) biz#3
  if v <> '2026-10-08 18:00+09'::timestamptz then
    raise exception 'due() weekend-start failed: got %', v;
  end if;

  raise notice 'PASS 01_due';
end $$;
