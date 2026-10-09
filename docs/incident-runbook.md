# MICEGO 장애 대응 runbook

*v1.0 · 2026-09-27 · 상태전이표 v1.9 · 배포 런북(supabase/README.md) 기준*

> Edge Function 이름·크론 주기·알림 ID는 supabase/README.md와 docs/state-transitions.html §7을 그대로 씁니다. 이 리포지토리에 없는 벤더 운영 정보(발신 대행사 장애 공지 채널 등)는 확인 필요로 표시했습니다.

## 1. 심각도 정의

*심각도는 발생 직후 최초 대응자가 판단합니다. 애매하면 한 단계 높여서 대응하고, 진행하며 낮춥니다.*

| 등급 | 정의 | 예 | 목표 대응 시간 |
|---|---|---|---|
| [S1] | 핵심 흐름(요청 제출·초대·견적 제출·제안 선택)이 전면 불가하거나 개인정보가 노출됨 | 견적 요청 제출이 전부 실패, 요청자 정보가 다른 회원에게 보임 | 즉시 착수 · 15분 안에 완화 조치 |
| [S2] | 일부 기능이나 특정 요청·특정 채널에서만 지연·오류가 생김 | 특정 통신사에서만 인증번호 문자 지연, 알림톡만 실패하고 이메일은 정상 | 1영업시간 안에 착수 |
| [S3] | 기능은 정상이지만 표시·문구 오류, 사소한 UI 문제 | 비교표 통화 표시 오타, 대시보드 카드 정렬 오류 | 다음 배포 주기에 반영 |

> 기준: **핵심 흐름**은 상태전이표 §3 전이표의 0~12번 전이와 §4 초대 상태, §5-2·5-3의 인증·공유 링크 경로를 말합니다. 이 경로가 막히면 등급을 낮추지 않습니다.

## 2. 최초 대응 15분 절차

*발견자가 누구든 아래 순서로 진행합니다. 순서를 지키는 이유는 "완화"가 "원인 조사"보다 먼저이기 때문입니다 — 원인을 다 알아야 멈출 수 있는 건 아닙니다.*

1. **확인 (0~5분)** — 증상을 재현하거나 로그로 확증합니다. `admin/dashboard.html` 발송 실패 카드, 브라우저 콘솔, `supabase functions logs <함수명>`, DB의 `notification_deliveries`·`feedback` 테이블 중 관련된 곳을 봅니다. 이 시점에 [심각도](#sev)를 잠정 판정합니다.
2. **공지 (5~8분)** — S1·S2는 [에스컬레이션 표](#escalation)에 따라 대표·개발 담당에게 바로 알립니다. 요청자·호텔에게 영향이 있다고 판단되면(견적 받는 중 요청이 여러 건 걸려 있는 등) 선제 안내 여부를 이 시점에 정합니다.
3. **완화 (8~15분)** — 근본 원인을 다 몰라도 피해를 멈추는 조치부터 합니다. 예: `NOTIFY_MODE=log`로 되돌리기(오발송), 특정 RPC·Edge Function 프런트 진입점을 안내 문구로 막기, 문제 있는 초대·요청 1건만 콘솔에서 수동 취소. 시나리오별 "완화" 칸을 참고합니다.
4. **기록 시작** — 발견 시각, 증상, 완화 조치를 [사후 기록 템플릿](#postmortem)에 바로 적기 시작합니다. 나중에 재구성하지 않습니다.

> 완화와 근본 조치를 헷갈리지 않습니다. `NOTIFY_MODE=log`로 되돌리는 것은 완화(발송을 멈춤)이지, 원인(왜 오발송이 났는지)을 고친 것이 아닙니다. 완화 후에도 근본 조치 칸의 작업이 남아 있습니다.

## 3. 시나리오별 대응

*발생 빈도·영향 순서가 아니라 사용자 흐름(요청자→호텔→인증→운영자→플랫폼) 순서로 정리했습니다.*

### #1 견적 요청 제출 실패 [S1]

**증상** — `ko/index.html`의 견적 요청 폼(#register)을 제출해도 접수 완료 화면이 안 뜨거나 REF·추적 링크가 안 나옵니다.

**확인** — 브라우저 콘솔에서 `submit_rfp` 호출 응답 확인 → `supabase functions logs submit_rfp` → PostgREST/DB 연결 오류인지, 검증 실패(`GUARD_*` 형태 오류 코드)인지 구분합니다.

**완화** — DB·Function 오류로 전면 실패라면 즉시 폼 위에 "접수 지연 안내 + 대체 연락처(운영 이메일)" 배너를 띄웁니다. 검증 로직 문제로 특정 입력값만 실패한다면 그 항목을 임시로 선택 처리(필수→선택)합니다.

**근본 조치** — Edge Function 배포 상태·환경변수(`SUPABASE_DB_URL` 등) 점검 후 재배포. 검증 로직 버그는 원인 커밋을 되돌리거나 패치 후 `tests/sql/*.sql` 재실행으로 회귀 확인.

**사용자 안내(한)** — "일시적으로 견적 요청 접수가 지연되고 있습니다. 급하신 경우 <운영 이메일>로 요청 내용을 보내 주시면 순서대로 처리해 드리겠습니다."

**User notice (EN)** — "We're experiencing a temporary delay accepting new requests. If urgent, please email <ops email> with your request details and we'll process it manually."

### #2 추적 링크가 안 열림 [S2]

**증상** — 요청자가 받은 `ko/track.html?t=…` 링크를 열면 `invalid`(링크 오류) 화면이 뜨거나 백지입니다.

**확인** — 토큰 형식·만료 여부 확인(`get_track` 응답 코드) → 요청이 실제로 존재하는지 `admin/rfp.html?id=…`로 대조 → 공유 링크(`?s=`)라면 `revoked`/`expired` 상태인지 확인합니다.

**완화** — 토큰 자체가 잘못된 경우 콘솔에서 요청번호로 찾아 링크를 다시 발급해 요청자에게 개별 전달합니다. 대량으로 발생하면 `get_track` Edge Function 로그부터 봅니다.

**근본 조치** — 만료·폐기 로직(공유 링크 30일, 종료 후 만료)이 의도보다 일찍 도는지 `system_tick` 크론 로직 점검. 토큰 발급 로직 버그면 `create_share_link`/발급 경로 점검.

**사용자 안내(한)** — "안내해 드린 링크에 문제가 있어 새 링크를 다시 보내 드렸습니다. 불편을 드려 죄송합니다."

**User notice (EN)** — "There was an issue with your tracking link — we've just sent you a new one. Sorry for the inconvenience."

### #3 호텔 견적 제출 실패 [S1]

**증상** — 초대받은 호텔이 `en/bid.html?t=…`에서 견적을 제출해도 반영이 안 되거나 오류가 뜹니다.

**확인** — `supabase functions logs submit_quote` 확인 → 마감이 이미 지난 초대인지(가드 조건) → 통화·금액 입력값 검증 실패인지 구분합니다.

**완화** — 마감이 임박한 다수 호텔에 영향이 있다면 운영자가 `OPS_HTL_QUOTE_CHECK` 문안으로 이메일 견적 접수를 병행 안내하고 콘솔에서 수기로 입력합니다.

**근본 조치** — 검증 매트릭스(README §5의 `submit_rfp` 검증 매트릭스와 동일 계열) 재확인, 마감 계산(초대별 `deadline`) 로직 점검.

**사용자 안내(한)** — "견적 제출 화면에 일시적인 오류가 있습니다. 첨부하신 내용을 이 메일로 회신해 주시면 저희가 직접 등록해 드리겠습니다."

**User notice (EN)** — "There's a temporary issue with the quote submission form. Please reply to this email with your proposal and we'll enter it on your behalf."

### #4 인증번호 문자 미수신 [S1]

**증상** — `ORG_PICK_OTP`(제안 선택) 또는 `ACC_SMS_OTP`(회원 인증)가 안 옴 — 제안 선택 자체가 막히는 경우라 우선순위가 높습니다.

**확인** — Solapi(CoolSMS) 대시보드에서 발송 상태·잔액·발신번호 상태 확인 → `SMS_VENDOR`·`SOLAPI_API_KEY/SECRET`·`SMS_SENDER` 시크릿 값 확인 → 특정 통신사만인지 전체인지 구분합니다.

**완화** — 전체 장애면 `ALIGO_*` 폴백 벤더가 설정돼 있으면 그쪽으로 즉시 전환(`SMS_VENDOR=aligo`). 폴백이 없으면(README: 설정 안 하면 자동 스킵) 운영자가 전화로 본인 확인 후 콘솔에서 대신 선택 처리 — 이때 인증 기록이 없다는 사실이 요청 상세에 남는다는 점을 상태전이표 §3(전이 #10 콜아웃)대로 처리합니다.

**근본 조치** — Solapi 장애면 벤더 상태 페이지 확인([확인 필요] — 상태 페이지 URL은 계약 시 확보) 후 복구 대기 또는 폴백 벤더 정식 전환. 발신번호 문제면 사전등록 상태부터 재확인.

**사용자 안내(한)** — "인증 문자 발송이 지연되고 있어 확인 뒤 저희가 직접 연결해 드리겠습니다. 잠시만 기다려 주세요."

**User notice (EN)** — "SMS verification is delayed on our side — we'll confirm your selection manually and follow up shortly."

### #5 이메일 미발송 [S1]

**증상** — 특정 알림(예: `ORG_DELIVERED`)이 전혀 안 감. 요청자·호텔 양쪽 다 이메일을 못 받았다는 문의가 들어옵니다.

**확인** — `settings.html#notify` 발송 로그에서 해당 건이 `failed`인지 아예 큐에 없는지 확인 → `RESEND_API_KEY` 유효성, 발신 도메인 SPF/DKIM 인증 상태 확인 → **`NOTIFY_MODE`가 아직 `log`로 남아있지 않은지** 가장 먼저 확인합니다(가장 흔한 원인).

**완화** — `NOTIFY_MODE=log`가 원인이면 [전환 절차](launch-checklist.html#notify-mode)대로 `live`로 전환. Resend 키 문제면 새 키 발급 후 즉시 교체. 발송 자체가 안 되는 동안은 `failed` 건을 목록화해 운영자가 수동 발송합니다.

**근본 조치** — 발신 도메인 인증 만료·변경 여부 점검, Resend 대시보드에서 발송 거부(bounce) 사유 확인.

**사용자 안내(한)** — "안내 메일 발송이 지연되어 이 내용을 대신 안내드립니다: …"

**User notice (EN)** — "Our automated email is delayed — here is the update directly: …"

### #6 알림톡 대체발송(LMS) 폭주 [S2]

**증상** — 요청자 알림이 알림톡 대신 LMS 문자로 대량 전환되어 나갑니다(비용·수신 경험 저하).

**확인** — `settings.html#notify` 발송 로그에서 알림톡 실패율 확인 → Solapi 콘솔에서 카카오톡 채널·템플릿 상태(정지·심사 반려 여부) 확인.

**완화** — 템플릿이 반려·정지된 경우 임시로 해당 알림만 이메일 중심으로 안내하고, LMS 대체발송 자체는 막지 않습니다(사용자에게 정보가 안 가는 것보다 낫습니다).

**근본 조치** — 카카오 비즈니스 콘솔에서 채널·템플릿 재승인 절차 진행. 반복되면 발송 대행사와 원인 확인.

**사용자 안내(한)** — (알림톡→LMS 대체는 사용자에게 별도 안내가 필요한 장애가 아니며, 정보는 정상 도달합니다.)

**User notice (EN)** — (No separate user notice needed — content still arrives via LMS fallback.)

### #7 운영 콘솔 로그인 불가 [S1]

**증상** — 운영자가 `admin/index.html`에서 로그인해도 `dashboard.html`로 못 들어갑니다.

**확인** — 리다이렉트된 `?e=` 코드로 원인을 구분합니다 — `e=role`(권한 없음, `app_metadata.role ≠ operator`) · `e=config`(Supabase 설정 오류) · `e=snapshot`(`admin_snapshot()` RPC 실패, 보통 세션 만료). 세션 만료는 Supabase 기본 액세스 토큰 수명([확인 필요] — 통상 1시간, 프로젝트 설정에 따라 다름) 경과가 흔한 원인입니다.

**완화** — `e=role`이면 해당 계정에 `app_metadata.role=operator`를 즉시 부여(Supabase 대시보드, README §2). `e=snapshot`이면 재로그인 안내. `e=config`면 `assets/config.js`의 `supabase.url/anonKey` 값을 확인합니다.

**근본 조치** — 권한 부여 절차를 온보딩 체크리스트에 포함(운영자 온보딩 문서 참고), 세션 만료가 잦으면 재로그인 안내 문구를 `e=snapshot` 에러 메시지에 보강.

**사용자 안내(한)** — (내부 화면 장애이므로 사용자 대상 공지는 없음. 콘솔 접근 불가로 응대가 늦어질 수 있는 경우에만 개별 안내.)

**User notice (EN)** — (Internal console issue — no external user notice unless response times are affected.)

### #8 SLA 시계 오류 [S2]

**증상** — 대시보드의 SLA 임박 배지가 실제 영업일 기준과 어긋납니다(공휴일인데 임박 표시가 안 뜨거나, 평일인데 과도하게 임박으로 표시).

**확인** — `kr_holiday` 테이블에 해당 연도 공휴일이 입력돼 있는지 확인(`settings.html#holidays` 또는 DB 조회). 비어 있으면 주말만 빼고 계산되어 기한이 짧게 잡힙니다(상태전이표 §8).

**완화** — 누락된 공휴일을 즉시 입력합니다. 이미 짧게 계산되어 SLA 위반으로 잘못 표시된 건이 있으면 개별 확인 후 담당자에게 오표시였음을 안내합니다.

**근본 조치** — 내년도 공휴일을 미리 입력하는 절차를 [오픈 체크리스트 D-7](launch-checklist.html#d7)과 연간 루틴에 고정.

**사용자 안내(한)** — (내부 지표 오류 — 요청자에게 실제 처리 지연이 없었다면 공지하지 않음.)

**User notice (EN)** — (Internal metric issue — no external notice unless it caused an actual processing delay.)

### #9 크론 정지 [S1]

**증상** — 상태 전이가 자동으로 안 넘어가거나(견적 받는 중→견적 정리 중 정체), 알림이 전혀 안 나가거나, 피드백 메일 재시도가 안 됩니다.

**확인** — Supabase 대시보드 `Database → Extensions`에서 `pg_cron`·`pg_net` 활성 여부 확인 → `select * from cron.job`로 6개 작업(알림 발송·`mg-system-tick`·`mgfb-mail-retry`·레이트리밋 정리·데모 정리·익명화)이 등록돼 있는지 확인 → `cron.job_run_details`에서 최근 실행 여부 확인.

**완화** — 꺼진 확장을 다시 켜거나, 등록이 빠진 작업이 있으면 해당 마이그레이션(`0007_cron.sql`, `0009_feedback_cron.sql`)을 재적용합니다. 급하면 `mg-system-tick`이 하던 마감 전이를 콘솔에서 수동으로 처리합니다.

**근본 조치** — 확장이 왜 꺼졌는지(플랜 변경, 수동 조작) 원인 확인 후 재발 방지. 크론 헬스체크를 대시보드 카드로 추가하는 것을 검토(현재는 설정 화면의 "마지막 실행" 예시 값뿐).

**사용자 안내(한)** — (내부 자동화 장애 — 실제 처리 지연이 사용자에게 보이는 시점에만 개별 안내.)

**User notice (EN)** — (Internal automation issue — notify affected users individually only if they experience an actual delay.)

### #10 피드백 스팸 폭주 [S2]

**증상** — `admin/feedback.html`에 의미 없는 대량 접수가 쌓입니다.

**확인** — 접수 Origin 분포 확인(`FEEDBACK_ALLOWED_ORIGINS` 밖에서 오는지) → 레이트리밋 히트 확인(IP당 10분 5건·하루 30건·전체 하루 500건, `feedback_rate_hit`) → 허니팟 필드가 채워진 요청 비율 확인.

**완화** — 현재 시스템은 Origin 허용 목록 + 허니팟 + 레이트리밋만 있고 **CAPTCHA/Turnstile은 구현돼 있지 않습니다**. 급증 시 `FEEDBACK_ALLOWED_ORIGINS`를 임시로 더 좁히거나, `FEEDBACK_DAILY_CAP`·전체 하루 상한을 임시로 낮춰 대응합니다.

**근본 조치** — [확인 필요(열린 이슈)] — 반복된다면 Turnstile 같은 챌린지 도입을 검토합니다. 접수 자체(`FB_OPS_ALERT`)는 상한 초과분을 자동으로 제외하므로(README §8.1) 운영팀 메일함이 폭주하지는 않습니다.

**사용자 안내(한)** — (스팸은 정상 이용자에게 보이는 장애가 아니므로 사용자 공지 없음.)

**User notice (EN)** — (Spam is not user-facing — no external notice needed.)

### #11 토큰 링크 유출 의심 [S1]

**증상** — 추적 링크(`ko/track.html?t=`)나 초대 링크(`en/bid.html?t=`)가 의도치 않은 곳에 공유된 정황이 있습니다.

**확인** — 해당 요청의 접속 이력(가능하면 접근 로그)과 콘솔 "공유 링크" 발급 이력을 확인해 실제 유출인지, 정상적인 공유 링크(`?s=`) 사용인지 구분합니다.

**완화** — 해당 요청·초대의 토큰을 폐기하고 새 토큰으로 재발급합니다(공유 링크는 회원이 "링크 끄기"로, 추적·초대 토큰은 운영자가 콘솔에서 재발급). 새 링크는 원래 수신자에게만 개별 전달합니다.

**근본 조치** — 유출 경로(메일 포워딩, 캡처 공유 등) 파악 후 재발 방지 안내. 반복되면 링크 만료 주기 단축을 검토.

**사용자 안내(한)** — "보안을 위해 요청 확인 링크를 새로 발급해 드렸습니다. 이전 링크는 더 이상 사용할 수 없습니다."

**User notice (EN)** — "For security, we've issued a new link for your request. The previous link no longer works."

### #12 데이터가 잘못된 상태로 전이됨 [S1]

**증상** — 운영자 실수로 잘못된 상태 버튼을 누르거나 잘못된 호텔을 선정 처리했습니다.

**확인** — `admin/rfp.html?id=…` 이력(history) 탭에서 전이 시각·주체·사유를 확인합니다.

**완화** — **상태전이표의 전이표(§3)에 없는 역방향 전이는 콘솔에 버튼 자체가 없습니다.** 종료 상태(반려·성사·미성사·취소)에서 나가는 전이도 없습니다 — 즉 대부분의 실수는 "되돌리기"가 아니라 뒤이은 상태에서 사유를 남기고 다시 처리하는 방식으로 수습합니다(예: 잘못 성사 처리했다면 선정 호텔·요청자 양쪽에 사정을 설명하고 이관·환불 등 사람이 개입).

**근본 조치** — **상태를 SQL로 직접 바꾸는 것은 하지 않습니다**(상태전이표 §3 마지막 문장) — 이력과 알림이 빠지고 원본 사실관계가 사라집니다. 재발 방지를 위해 콘솔의 확인 창(confirm) 문구를 강화하는 방향으로 근본 조치를 잡습니다.

**사용자 안내(한)** — "저희 측 처리 오류로 안내가 잘못 나갔습니다. 바로 잡아 드리겠습니다 — 담당자가 곧 연락드리겠습니다."

**User notice (EN)** — "We made a processing error on our end and are correcting it now — a team member will reach out shortly."

### #13 Supabase 장애(플랫폼 전체) [S1]

**증상** — Supabase 자체 장애로 DB·Auth·Edge Function이 전부 응답하지 않습니다.

**확인** — Supabase 상태 페이지(status.supabase.com)를 확인합니다. 콘솔·공개 페이지 모두 API 오류가 동시다발적으로 뜨는지 확인합니다.

**완화** — **mailto 폴백은 자동으로 살아나지 않습니다** — 현재 프런트엔드는 접수·파트너 신청·견적 제출이 이미 RPC로 교체된 것을 전제로 하며, mailto는 그 이전(사이트맵 §2의 배포 전 임시방편) 코드일 때만 쓰던 경로입니다. 즉 Supabase 장애 중에는 자동 대체 경로가 없고, 안내 배너로 "잠시 후 다시 시도"를 노출하고 운영 메일함으로 유도하는 것을 운영자가 수동으로 켜야 합니다.

**근본 조치** — 장애 복구 후 밀린 큐(알림·피드백 재시도)가 정상 처리되는지 확인. 향후 정적 mailto 폴백을 완전히 없앨지, 최후 수단으로 남겨둘지는 [사이트맵](sitemap.html) 항목 f(RPC 교체)와 함께 결정이 필요합니다.

**사용자 안내(한)** — "외부 서비스 장애로 일시적으로 서비스 이용이 어렵습니다. 급하신 요청은 <운영 이메일>로 보내 주시면 복구 즉시 처리해 드리겠습니다."

**User notice (EN)** — "We're experiencing a third-party outage affecting the service. For urgent requests, please email <ops email> and we'll process it as soon as we're back."

## 4. 에스컬레이션

| 등급 | 1차 연락 | 2차 연락(15분 무응답 시) | 외부 벤더 연락이 필요한 경우 |
|---|---|---|---|
| [S1] | 당일 대응 운영자 + 개발 담당 | 대표 | Supabase(플랫폼 장애) · Solapi(SMS/알림톡 장애) · Resend(이메일 장애) — [확인 필요](각 벤더 지원 창구·SLA는 계약 문서 확인) |
| [S2] | 당일 대응 운영자 | 개발 담당 | 해당 채널 벤더에 지연 문의(급하지 않으면 정규 지원 창구) |
| [S3] | 당일 대응 운영자 | (없음, 다음 배포에 반영) | 해당 없음 |

> "당일 대응 운영자"는 `admin/settings.html#ops`의 운영자 계정 목록 중 그날 근무자입니다. 운영자가 1명뿐인 현재 구조에서는 S1 발생 시 대표에게 바로 공유하는 것을 기본으로 합니다.

## 5. 사후 기록 템플릿

*S1·S2는 종료 후 아래 항목을 채워 남깁니다. 형식보다 "다음에 같은 일이 생기면 더 빨리 알아차릴 방법"을 적는 것이 목적입니다.*

| 항목 | 내용 |
|---|---|
| **발생 시각·발견 경로** | 언제, 무엇을 보고 알았는지(사용자 신고 / 대시보드 / 로그) |
| **심각도** | S1/S2/S3, 대응 중 변경됐다면 그 이유 |
| **영향 범위** | 영향받은 요청·회원·호텔 수(가능한 범위에서), 영향받은 시간 |
| **타임라인** | 확인 → 공지 → 완화 → 복구 각 시각 |
| **완화 조치** | 실제로 무엇을 껐다/켰다/되돌렸는지 |
| **근본 원인** | 알아낸 만큼만. 모르면 "조사 중"으로 남기고 후속 기한을 적음 |
| **재발 방지** | 코드 변경, 체크리스트 추가, 벤더 계약 변경 등 — 담당자와 기한 포함 |
| **사용자 커뮤니케이션** | 실제로 보낸 문구와 대상, 후속 사과·보상이 필요했는지 |

> 이 기록은 `admin/rfp.html` 이력 메모나 `admin/feedback-detail.html` 메모와는 별도입니다 — 개별 건 이력이 아니라 "이번 장애 전체"에 대한 기록이므로, 운영 문서(프로젝트 문서함)에 별도로 남깁니다.

---

**연관 문서** · [상태전이표 v1.9](state-transitions.html) · [오픈 당일 체크리스트](launch-checklist.html) · [운영자 온보딩](operator-onboarding.html) · [알림 라이브러리](notification-library.html) · supabase/README.md
