-- 0016_console_notice.sql — 콘솔 내부 알림 공통 템플릿(CONSOLE_NOTICE) + 호텔 확인 메일(HTL_CONFIRM) 등록.  - 클로드
-- 지역파트너 콘솔 기술설계서 §12·§13. PTR_*/HQ_* 알림 ID 는 개별 템플릿을 두지 않고 CONSOLE_NOTICE 한 장으로 보낸다
-- (제목·본문은 private.console_notice_text 가 ID 별로 만든다). 템플릿이 아예 없을 때만 예전처럼 이력 메모로 남긴다.
set search_path = public, private;

insert into notif_template_meta (id, name) values
  ('HTL_CONFIRM', 'Confirm quote entered on your behalf'),
  ('CONSOLE_NOTICE', '콘솔 내부 알림 (지역 파트너 · 본사)')
on conflict (id) do update set name = excluded.name;

create or replace function private.console_notice_text(p_template_id text, p_vars jsonb) returns jsonb
language plpgsql immutable as $$
declare v jsonb := coalesce(p_vars, '{}'::jsonb); ref text := coalesce(v->>'RFP_ID', ''); st text := coalesce(v->>'SETTLEMENT_REF', ''); t text; b text; u text;
begin
  u := case when st <> '' then '/admin/settlement.html?ref=' || st when ref <> '' then '/admin/rfp.html?id=' || ref else '/admin/dashboard.html' end;
  case p_template_id
    when 'PTR_ASSIGNED' then t := '새 요청 배정 · ' || ref; b := '담당 지역의 요청 ' || ref || '이(가) 배정되었습니다. 24시간 안에 검증을 시작해 주세요.';
    when 'PTR_UNASSIGNED' then t := '배정 해제 · ' || ref; b := '요청 ' || ref || '의 배정이 해제되었습니다' || coalesce(' (' || (v->>'REASON') || ')', '') || '. 더 이상 이 요청을 처리하지 않습니다.';
    when 'PTR_TAKEN_OVER' then t := '본사 인계 · ' || ref; b := '요청 ' || ref || '을(를) MICEGO 본사가 인계했습니다' || coalesce(' · ' || (v->>'REASON'), '') || '. 콘솔에서는 읽기 전용으로 보입니다.';
    when 'PTR_RELEASED' then t := '위임 복원 · ' || ref; b := '요청 ' || ref || '이(가) 다시 귀 조직에 위임되었습니다. 진행 상황을 확인해 주세요.';
    when 'PTR_HQ_ACTION' then t := '본사 처리 · ' || ref; b := 'MICEGO 본사가 요청 ' || ref || '에 대해 ' || coalesce(v->>'ACTION', '처리') || '을(를) 수행했습니다. 이력을 확인해 주세요.';
    when 'PTR_HOTEL_CONFIRMED' then t := '호텔 확인 완료 · ' || ref; b := coalesce(v->>'HOTEL', '호텔') || '이(가) 대리 입력 견적을 확인했습니다. 비교표에 포함됩니다.';
    when 'PTR_HOTEL_DISPUTED' then t := '호텔 이의 제기 · ' || ref; b := coalesce(v->>'HOTEL', '호텔') || '이(가) 대리 입력 견적에 이의를 제기했습니다' || coalesce(': ' || (v->>'REASON'), '') || '. 견적은 사용되지 않습니다. 호텔과 확인 후 다시 입력하거나 호텔이 직접 제출하도록 안내하세요.';
    when 'PTR_WON' then t := '성사 · 정산 시작 · ' || ref; b := '요청 ' || ref || '이(가) 성사되었습니다. 정산 ' || st || '에 호텔 계약 금액과 커미션을 입력해 주세요.';
    when 'PTR_COMMISSION_APPROVED' then t := '커미션 승인 · ' || st; b := '정산 ' || st || '의 커미션이 확정되었습니다. 행사 종료 후 수금을 기록해 주세요.';
    when 'PTR_COMMISSION_REJECTED' then t := '커미션 반려 · ' || st; b := '정산 ' || st || '의 커미션이 반려되었습니다' || coalesce(': ' || (v->>'REASON'), '') || '. 내용을 고쳐 다시 제출해 주세요.';
    when 'PTR_SETTLEMENT_RESOLVED' then t := '정산 분쟁 해소 · ' || st; b := '정산 ' || st || '의 분쟁이 해소되었습니다' || coalesce(': ' || (v->>'RESOLUTION'), '') || '.';
    when 'PTR_SETTLEMENT_COMPLETED' then t := '정산 완료 · ' || st; b := '정산 ' || st || '이(가) 완료되었습니다. 수고하셨습니다.';
    when 'HQ_RFP_HELD' then t := '본사 보유 · ' || ref; b := '요청 ' || ref || '이(가) 본사 보유 상태입니다 (사유: ' || coalesce(v->>'HOLD_REASON', '-') || '). 파트너를 배정하거나 직접 처리해 주세요.';
    when 'HQ_PARTNER_DECLINED' then t := '파트너 배정 반려 · ' || ref; b := '지역 파트너가 요청 ' || ref || '의 배정을 반려했습니다' || coalesce(': ' || (v->>'REASON'), '') || '. 본사에서 처리해 주세요.';
    when 'HQ_HOTEL_APPROVED_BY_PARTNER' then t := '파트너 호텔 승인 · 사후 검토 필요'; b := coalesce(v->>'PARTNER', '지역 파트너') || '이(가) 호텔 ' || coalesce(v->>'HOTEL', '') || '을(를) 승인했습니다. 호텔 상세에서 사후 검토를 완료해 주세요.'; u := '/admin/partners.html';
    when 'HQ_HOTEL_UNREVIEWED_DELIVERED' then t := '사후 검토 전 호텔 비교표 전달 · ' || ref; b := '요청 ' || ref || '의 비교표에 본사 사후 검토가 끝나지 않은 호텔 ' || coalesce(v->>'COUNT', '?') || '곳이 포함되어 전달되었습니다. 성사 시 커미션 승인 전에 검토가 필요합니다.';
    when 'HQ_PROXY_DISPUTED' then t := '호텔 이의(대리 입력) · ' || ref; b := coalesce(v->>'HOTEL', '호텔') || '이(가) 파트너 대리 입력 견적에 이의를 제기했습니다. 개입 목록을 확인해 주세요.';
    when 'HQ_COMMISSION_SUBMITTED' then t := '커미션 승인 요청 · ' || st; b := '정산 ' || st || '의 커미션이 제출되었습니다. 금액과 근거를 검토하고 승인해 주세요.';
    when 'HQ_REMITTED' then t := '송금 기록 · 입금 확인 요청 · ' || st; b := '정산 ' || st || '에 송금 ' || coalesce(v->>'CURRENCY', '') || ' ' || coalesce(v->>'AMOUNT', '') || '이(가) 기록되었습니다. 입금을 확인해 주세요.';
    when 'HQ_SETTLEMENT_DISPUTE' then t := '정산 분쟁 · ' || st; b := '정산 ' || st || '에 분쟁이 제기되었습니다' || coalesce(': ' || (v->>'REASON'), '') || '.';
    else t := replace(p_template_id, '_', ' ') || coalesce(' · ' || nullif(ref, ''), ''); b := '콘솔에서 자세한 내용을 확인해 주세요.';
  end case;
  return jsonb_build_object('NOTICE_TITLE', t, 'NOTICE_BODY', b, 'CONSOLE_PATH', u);
end $$;

create or replace function private.enqueue_if_template(p_template_id text, p_idem_key text, p_target jsonb, p_vars jsonb default '{}'::jsonb, p_rfp_id uuid default null) returns bigint
language plpgsql as $$
declare nt jsonb;
begin
  if exists (select 1 from notif_template_meta where id = p_template_id) then
    return private.enqueue(p_template_id, p_idem_key, p_target, p_vars, now());
  end if;
  -- PTR_* / HQ_* 는 공통 콘솔 알림 템플릿으로 보낸다
  if (p_template_id like 'PTR\_%' or p_template_id like 'HQ\_%') and exists (select 1 from notif_template_meta where id = 'CONSOLE_NOTICE') and coalesce(p_target->>'to_email','') <> '' then
    nt := private.console_notice_text(p_template_id, p_vars);
    return private.enqueue('CONSOLE_NOTICE', p_idem_key, p_target, coalesce(p_vars, '{}'::jsonb) || nt || jsonb_build_object('SOURCE_TEMPLATE', p_template_id), now());
  end if;
  if p_rfp_id is not null then
    insert into rfp_history(rfp_id, at, actor, actor_label, memo) values (p_rfp_id, now(), 'system', '시스템', p_template_id || ' 알림 예정(템플릿 미등록 · 수동 안내 필요)');
  end if;
  return null;
end $$;
