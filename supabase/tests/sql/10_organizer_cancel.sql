-- 0020: 오거나이저 자체 취소(호텔 발송 전까지)  - 클로드
do $$
declare rid uuid; rid2 uuid; rid3 uuid; rid4 uuid; pid uuid; j jsonb; ok boolean; n int;
begin
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band, company, contact_name, region)
    values ('MG-TEST-101','received',1,'cx1@example.com','010-0000-1010','메모', now(), '50–99명','취소테스트','최취소','화성') returning id into rid;
  insert into intervention_alert (rfp_id, kind, severity) values (rid, 'unassigned_stale', 1);

  -- 목록에 없는 사유 / 기타 + 메모 없음
  begin perform private.rfp_organizer_cancel(rid, '그냥', null); raise exception 'bad reason accepted'; exception when others then if sqlerrm not like 'MG:VALIDATION%' then raise; end if; end;
  begin perform private.rfp_organizer_cancel(rid, '기타', '  '); raise exception '기타 without note accepted'; exception when others then if sqlerrm not like 'MG:GUARD_REASON%' then raise; end if; end;

  j := private.rfp_organizer_cancel(rid, '일정 변경', null);
  if j->>'state' <> 'cancelled' or (j->>'already')::boolean then raise exception 'cancel failed: %', j; end if;
  if not exists (select 1 from rfp_history where rfp_id = rid and to_state = 'cancelled' and actor = 'organizer') then raise exception 'history actor should be organizer'; end if;
  select count(*) into n from notification_log where rfp_id = rid and template_id = 'ORG_CANCELLED'; if n <> 1 then raise exception 'ORG_CANCELLED should be 1, got %', n; end if;
  if exists (select 1 from intervention_alert where rfp_id = rid and resolved_at is null) then raise exception 'open alerts should be resolved'; end if;
  j := private.rfp_organizer_cancel(rid, '일정 변경', null);
  if not (j->>'already')::boolean then raise exception 'second call should be idempotent'; end if;

  -- open + 초대 0건은 가능, 초대 1건이면 불가
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band, company, contact_name, region)
    values ('MG-TEST-102','open',1,'cx2@example.com','010-0000-1020','메모', now(), '50–99명','취소테스트','최취소','화성') returning id into rid2;
  j := private.rfp_organizer_cancel(rid2, '행사 취소', null);
  if j->>'state' <> 'cancelled' then raise exception 'open without invitations should cancel'; end if;

  insert into partners(code, state, name, contact_email, contact_phone) values ('PT-TEST-100','approved','취소테스트호텔','c100@example.com','010-10') returning id into pid;
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band, company, contact_name, region)
    values ('MG-TEST-103','open',1,'cx3@example.com','010-0000-1030','메모', now(), '50–99명','취소테스트','최취소','화성') returning id into rid3;
  insert into invitations(rfp_id, partner_id, round, status, token) values (rid3, pid, 1, 'invited', 'tok-cancel-1');
  ok := false;
  begin perform private.rfp_organizer_cancel(rid3, '일정 변경', null); exception when others then if sqlerrm like 'MG:CANCEL_NOT_ALLOWED%' then ok := true; else raise; end if; end;
  if not ok then raise exception 'open with invitation must not cancel'; end if;
  update rfps set state = 'bidding' where id = rid3; -- 픽스처 전용
  ok := false;
  begin perform private.rfp_organizer_cancel(rid3, '일정 변경', null); exception when others then if sqlerrm like 'MG:CANCEL_NOT_ALLOWED%' then ok := true; else raise; end if; end;
  if not ok then raise exception 'bidding must not cancel'; end if;

  -- 위임 건: 담당 파트너에게 콘솔 알림
  insert into rfps(ref, state, round, contact_email, contact_phone, note, consent_at, headcount_band, company, contact_name, region)
    values ('MG-TEST-104','received',1,'cx4@example.com','010-0000-1040','메모', now(), '50–99명','취소테스트','최취소','태국 방콕') returning id into rid4;
  if (select delegation from rfps where id = rid4) <> 'delegated' then raise exception 'fixture should be delegated'; end if;
  perform private.rfp_organizer_cancel(rid4, '기타', '내부 사정');
  if not exists (select 1 from notification_log where template_id = 'CONSOLE_NOTICE' and vars->>'SOURCE_TEMPLATE' = 'PTR_ORG_CANCELLED' and vars->>'NOTICE_TITLE' like '요청자 취소%') then raise exception 'PTR_ORG_CANCELLED notice missing'; end if;
  raise notice 'PASS organizer cancel';
end $$;
