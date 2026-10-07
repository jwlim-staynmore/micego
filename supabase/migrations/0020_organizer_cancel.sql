-- 0020_organizer_cancel.sql
-- 오거나이저가 진행 상황 페이지에서 요청을 직접 취소한다(2026-10-07, D-47).
-- 허용 범위: 호텔에 아무것도 보내기 전까지.
--   · received·verifying 는 언제나 가능
--   · open 은 현재 차수 초대가 0건일 때만(admin_invite 는 open 상태에서도 초대와 동시에 HTL_INVITE 를 보낸다)
--   · bidding 이후는 지금처럼 문의 → 운영자 취소
-- 상태 변경은 rfp_transition 으로만(이력·ORG_CANCELLED 알림 자동). 비회원 토큰 소유자 = 요청자.

create or replace function private.rfp_organizer_cancel(p_rfp_id uuid, p_reason text, p_note text) returns jsonb
language plpgsql as $$
declare r rfps%rowtype; n_inv int;
begin
  select * into r from rfps where id = p_rfp_id for update;
  if r.id is null then raise exception using errcode = 'P0001', message = 'MG:TOKEN_INVALID'; end if;

  -- 같은 요청을 두 번 눌러도 에러가 아니라 같은 결과
  if r.state = 'cancelled' and exists (select 1 from rfp_history where rfp_id = r.id and to_state = 'cancelled' and actor = 'organizer') then
    return jsonb_build_object('state', 'cancelled', 'already', true);
  end if;

  if p_reason is null or p_reason not in ('일정 변경','다른 경로로 예약','행사 취소','기타') then
    raise exception using errcode = 'P0001', message = 'MG:VALIDATION';
  end if;

  select count(*) into n_inv from private.current_invitations(r.id, r.round);
  if not (r.state in ('received','verifying') or (r.state = 'open' and n_inv = 0)) then
    raise exception using errcode = 'P0001', message = 'MG:CANCEL_NOT_ALLOWED';
  end if;

  r := private.rfp_transition(r.id, 'cancelled', 'organizer', null, p_reason, nullif(trim(coalesce(p_note, '')), ''), null);
  update rfps set row_version = row_version + 1 where id = r.id;

  -- 개입 알림 정리(unassigned_stale 은 hq_held 건이면 스윕이 지우지 않는다)
  update intervention_alert set resolved_at = now(), resolution = 'auto_cleared'
   where rfp_id = r.id and resolved_at is null and kind in ('unassigned_stale','partner_idle','sla_breach');

  if r.partner_org_id is not null and r.delegation = 'delegated' then
    perform private.notify_partner(r.partner_org_id, 'PTR_ORG_CANCELLED', 'PTR_ORG_CANCELLED:' || r.id, r.id,
      jsonb_build_object('RFP_ID', r.ref, 'REASON', p_reason));
  end if;

  return jsonb_build_object('state', 'cancelled', 'already', false);
end $$;

-- ---------- 콘솔 알림 문구 +2 (PTR_ORG_CANCELLED, HQ_PROXY_CONSENT_RECORDED[0019]) ----------
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
    when 'PTR_HOTEL_TERMS_ACCEPTED' then t := '호텔 커미션 동의 · ' || coalesce(v->>'HOTEL', ''); b := coalesce(v->>'HOTEL', '호텔') || '이(가) 커미션 ' || coalesce(v->>'RATE', '?') || '%에 동의했습니다. 이제 견적 초대를 보낼 수 있습니다.'; u := '/admin/partners.html';
    when 'HQ_HOTEL_TERMS_ACCEPTED' then t := '호텔 커미션 동의 · ' || coalesce(v->>'HOTEL', ''); b := coalesce(v->>'HOTEL', '호텔') || '이(가) 커미션 ' || coalesce(v->>'RATE', '?') || '%에 동의했습니다.'; u := '/admin/partners.html';
    when 'HQ_COMMISSION_RATE_DEVIATION' then t := '합의 요율과 다른 커미션 제출 · ' || st; b := '정산 ' || st || '의 커미션이 호텔 합의 요율과 다르게 제출되었습니다. 사유를 확인하고 승인해 주세요.';
    when 'PTR_ORG_CANCELLED' then t := '요청자 취소 · ' || ref; b := '요청자가 호텔 발송 전에 요청 ' || ref || '을(를) 직접 취소했습니다' || coalesce(' (사유: ' || (v->>'REASON') || ')', '') || '. 더 처리할 일은 없습니다.';
    when 'HQ_PROXY_CONSENT_RECORDED' then t := '파트너 대리 확정 · ' || ref; b := coalesce(v->>'PARTNER', '지역 파트너') || ' 관리자가 요청 ' || ref || '을(를) 요청자 대신 성사로 닫았습니다(동의 확인: ' || coalesce(v->>'METHOD', '-') || '). 요청 상세에서 동의 기록을 확인해 주세요.';
    else t := replace(p_template_id, '_', ' ') || coalesce(' · ' || nullif(ref, ''), ''); b := '콘솔에서 자세한 내용을 확인해 주세요.';
  end case;
  return jsonb_build_object('NOTICE_TITLE', t, 'NOTICE_BODY', b, 'CONSOLE_PATH', u);
end $$;

grant execute on all functions in schema private to service_role;
