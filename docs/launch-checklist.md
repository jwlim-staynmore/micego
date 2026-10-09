# MICEGO 오픈 당일 체크리스트

*v1.0 · 2026-09-27 · 상태전이표 v1.9 · 배포 런북(supabase/README.md) · 사이트맵 점검 v1.2 기준*

> 상태전이표(state-transitions.html), 사이트맵·미구현 항목(sitemap.html), Supabase 배포 런북(supabase/README.md), 운영 콘솔 화면(admin/*.html·admin.js)을 근거로 정리했습니다. 이 리포지토리에 근거가 없어 확정하지 못한 값(SSL 발급사, PITR 요금제 지원 여부 등)은 확인 필요로 표시했습니다.

## 1. 한눈에 보기

*이 체크리스트는 오픈 전 7일부터 오픈 뒤 첫 주까지, 데모(mock) 데이터로 만들어진 지금의 프런트엔드를 실제 Supabase 백엔드로 전환하는 과정을 단계별로 확인합니다. 근거는 [상태전이표 v1.9](state-transitions.html), [사이트맵·오픈 전 점검](sitemap.html), `supabase/README.md`, 운영 콘솔(`admin/*.html`) 코드입니다.*

| 단계 | 핵심 질문 | 항목 수 |
|---|---|---|
| **D-7** | 백엔드·발신 채널 준비가 끝났는가 | 8 |
| **D-1** | 실제 도메인·실제 값으로 다시 빌드했는가 | 10 |
| **D-day 오전** | 사람이 직접 눌러서 한 바퀴가 도는가 | 6 |
| **오픈 직후 1시간** | 자동으로 도는 것들이 실제로 돌고 있는가 | 4 |
| **D+1** | 밤사이 쌓인 것들이 정상 처리됐는가 | 4 |
| **첫 주** | 주간 루틴과 지표가 실데이터 기준으로 도는가 | 5 |

각 항목은 **확인 내용 · 담당 · 확인 방법(정확한 화면·명령·URL) · 통과 기준** 네 칸으로 되어 있습니다. 통과하지 못한 항목이 있으면 [오픈 중단 기준](#stop-criteria)을 먼저 보세요.

## 2. D-7 · 오픈 7일 전

*벤더 심사(알림톡·발신번호)와 법무 검토처럼 시간이 걸리는 항목을 먼저 신청합니다. 이 단계가 늦어지면 오픈일이 밀립니다.*

| # | 확인 내용 | 담당 | 확인 방법 | 통과 기준 |
|---|---|---|---|---|
| 1 | **site.config.json 값 확인** | 대표·운영 | `site.config.json`을 열어 `domain·officialEmail·privacyEmail·operator.*(상호·대표자·사업자등록번호·주소·개인정보책임자)·analytics.ga4·siteVerification·supabase·sms·prod·demo` 값을 하나씩 확인합니다. | 필수 항목에 빈 문자열이 없습니다. 리포지토리 기본값은 전부 빈칸이고 `prod:false, demo:true`이므로, 이번 주 안에 실값을 채워 넣는 것이 목표입니다. |
| 2 | Supabase 프로젝트·마이그레이션 적용 | 개발 | `supabase link --project-ref …` 후 `supabase db push`로 `migrations/0001~0009`를 적용하고, `psql "$SUPABASE_DB_URL"`로 `private.*`·`public.*` 스키마가 생성됐는지 확인합니다. | 마이그레이션 9개가 오류 없이 적용되고, `seed.sql`(공휴일·설정값·알림 템플릿 메타)까지 반영됩니다. |
| 3 | Supabase secrets 전체 등록 | 개발 | `supabase secrets list`로 README §3·§8.1 표의 변수(`SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY, SUPABASE_DB_URL, SITE_BASE_URL, SITE_ORIGINS, SUPPORT_EMAIL/OPS_INBOX/FROM_ADDRESS, RESEND_API_KEY, SMS_VENDOR, SOLAPI_*, OTP_PEPPER, IP_HASH_SALT, CRON_SECRET, FEEDBACK_*` 등)이 모두 있는지 대조합니다. | 표의 필수 변수가 전부 등록되어 있습니다. `NOTIFY_MODE`는 이 시점에는 아직 `log`로 둡니다. `ALIGO_*`는 폴백 벤더를 안 쓰면 비워도 됩니다. |
| 4 | kr_holiday 내년까지 입력 | 운영 | DB에서 `select * from kr_holiday where date >= '내년-01-01'` 또는 콘솔 설정 > 영업일·공휴일 탭에서 확인합니다. | 내년 한 해 공휴일이 모두 입력돼 있습니다. 비어 있으면 SLA·심사 기한이 실제보다 짧게 계산됩니다(상태전이표 §8). |
| 5 | 알림톡 템플릿 심사 신청 | 운영 | Solapi(카카오 비즈니스) 콘솔에서 `docs/notification-templates.json`의 알림톡 9종(`micego_*` 코드)을 심사 신청합니다. | 최소 `ORG_RECEIVED·ORG_BIDDING·ORG_DELIVERED·ORG_WON·ORG_LOST` 등 요청자용 알림톡이 심사 접수 상태입니다. [확인 필요] — 심사 소요 기간은 벤더·시점에 따라 다르므로 여유를 두고 신청합니다. |
| 6 | SMS 발신번호 사전등록 | 운영 | Solapi 콘솔에서 `SMS_SENDER`로 쓸 발신번호 등록 상태를 확인합니다. | 발신번호 등록이 완료됩니다. 이 번호로 `ORG_PICK_OTP`(제안 선택 인증)와 `ACC_SMS_OTP`(회원 휴대전화 인증)가 나갑니다 — 둘 다 알림톡을 쓰지 않고 SMS 전용입니다. |
| 7 | 이용약관 전문·개인정보처리방침 법무 검토 | 대표·법무 | `ko/terms.html, ko/privacy.html, en/terms.html, en/privacy.html`에서 `TODO(legal)` 표시를 검색합니다. | 10개 조항 요약 초안이 전문으로 교체되고, 개인정보처리방침의 TODO(legal) 5건(제3자 제공·국외 이전 고지, 보관 기간, SMS 수탁사, 개정일 등)이 확정됩니다. |
| 8 | 임시 흔적 제거 대상 확인 | 개발·운영 | 코드 전체에서 `mysteri1984@gmail.com`, `micego.example`, 예시 데이터(REF `MG-2610-014`, "김지은 과장" 등)를 검색합니다. | 검색 결과가 남아 있는 위치를 전부 목록화합니다(실제 제거는 D-1에 재빌드로 반영). 사이트맵 §2 "데모 흔적 제거" 표와 대조합니다. |

## 3. D-1 · 오픈 하루 전

*이 시점부터는 실제 도메인·실제 값 기준으로 다시 빌드합니다. D-7에서 신청만 해둔 항목(알림톡 심사 등)의 결과를 여기서 확정합니다.*

| # | 확인 내용 | 담당 | 확인 방법 | 통과 기준 |
|---|---|---|---|---|
| 1 | site.config.json 최종값 반영 후 재빌드 | 개발 | `site.config.json`에 `prod:true, demo:false`와 D-7에서 채운 실값을 넣고 빌드 파이프라인(`build2.py` → 말미에 `build_launch.py` 실행)을 다시 돌립니다. **MVP로 오픈하면 `pick.otpEnabled:false`도 함께 넣습니다**(D-54, 요청자 선택을 메일 회신으로). | `site_config.py`의 `prod:true but …` 검사가 통과하고(필수값 누락 없음), 공개 페이지에서 DEMO 띠와 `?state=` 미리보기 스위처가 사라집니다. |
| 2 | sitemap.xml · robots.txt · canonical 확인 | 개발 | `sitemap.xml`에 공개 페이지 15개만 있는지, `robots.txt`의 `Disallow: /admin/ /docs/ /emails/`와 `Sitemap:` 줄, 각 페이지 `<link rel=canonical>`가 실제 도메인 절대 URL인지 확인합니다. | 토큰 링크(`track.html?t=`, `bid.html?t=`)와 회원·admin 페이지가 sitemap에 없고, canonical·hreflang의 `TODO(domain)` 주석이 모두 실제 도메인으로 풀립니다. |
| 3 | Supabase secrets 최종 재확인 | 개발 | `supabase secrets list`로 D-7 값을 다시 확인하고, 특히 `SITE_BASE_URL`·`SITE_ORIGINS`·`FEEDBACK_ALLOWED_ORIGINS`가 실제 운영 도메인인지 봅니다. | 임시·스테이징 도메인이 `FEEDBACK_ALLOWED_ORIGINS`가 아니라 `FEEDBACK_STAGING_ORIGINS` 쪽에만 들어 있습니다(운영 Origin에 남아 있으면 실제 피드백이 `is_demo`로 잘못 분류됩니다). |
| 4 | NOTIFY_MODE 전환 리허설 | 개발 | 스테이징 프로젝트에서 `supabase secrets set NOTIFY_MODE=live` 후 테스트 알림 1건을 실제로 발송해 봅니다. 절차는 [8장](#notify-mode) 참고. | `notification_deliveries.status`가 `skipped`가 아니라 `sent`로 남습니다. 문제가 있으면 즉시 `log`로 되돌리는 절차까지 리허설합니다. |
| 5 | 카카오 인앱 브라우저 실기기 검증 | QA | 안드로이드·iOS 카카오톡 안에서 `ko/track.html?t=…`, `en/bid.html?t=…` 링크를 열어 봅니다(알림톡 링크가 실제로 열리는 대표 환경). | 인앱 브라우저에서 레이아웃이 깨지지 않고, 제안 선택·견적 제출 폼이 정상 동작합니다. 외부 브라우저로 열어야만 되는 기능이 있다면 안내 문구가 보입니다. |
| 6 | 메일 도달 테스트(수신함 확인) | QA | 네이버·카카오(다음)·Gmail 각 1계정으로 `ORG_RECEIVED` 등 테스트 메일을 받아 확인합니다. | 세 서비스 모두 **스팸함이 아닌 받은편지함**에 도착합니다. 스팸 처리되면 Resend 발신 도메인의 SPF/DKIM 인증부터 다시 확인합니다. |
| 7 | 알림톡 템플릿 승인 상태 최종 확인 | 운영 | Solapi 콘솔에서 D-7에 신청한 `micego_*` 알림톡 템플릿의 심사 결과를 확인합니다. | 요청자용 알림톡(`ORG_*`)이 전부 승인 완료 상태입니다. 승인이 안 됐다면 LMS 문자 대체로만 나간다는 점을 [오픈 중단 기준](#stop-criteria)과 함께 검토합니다. |
| 8 | 도메인 SSL 확인 | 개발 | `https://실제도메인`으로 접속해 인증서 발급자·유효기간을 확인하고, `http://`로 접속했을 때 `https://`로 리다이렉트되는지 확인합니다. | 유효한 인증서이고 자동 갱신이 걸려 있습니다. [확인 필요] — 인증서 발급·자동 갱신 방식은 호스팅사 설정에 따라 다릅니다. |
| 9 | 백업(PITR) 켜짐 확인 | 개발 | Supabase 대시보드 `Database → Backups`에서 Point-in-Time Recovery 활성 여부를 확인합니다. | 운영 프로젝트에 PITR이 켜져 있습니다. [확인 필요] — Supabase 요금제에 따라 PITR 지원 여부와 보관 기간이 다르므로 대시보드에서 직접 확인해야 합니다. |
| 10 | 404 페이지 확인 | QA | 존재하지 않는 경로(예: `/아무거나`)로 접속해 봅니다. | 호스팅 기본 화면이 아니라 `404.html`(한/영 병기)이 나타납니다. 토큰 링크 오류 화면(`invalid`)과는 다른 화면임을 확인합니다. |

## 4. D-day 오전 · 오픈 당일

*사람이 직접 화면을 눌러서 처음부터 끝까지 한 바퀴 도는 것을 확인하는 단계입니다. 자동화된 검사로는 잡지 못하는 문제가 여기서 나옵니다.*

| # | 확인 내용 | 담당 | 확인 방법 | 통과 기준 |
|---|---|---|---|---|
| 1 | 첫 운영자 로그인 | 대표·운영 | `admin/index.html`에서 Supabase Auth에 만들어 둔 실제 운영자 이메일·비밀번호로 로그인합니다(사전에 `app_metadata.role = "operator"`가 부여돼 있어야 합니다). | DEMO 리본과 "DEMO · 실제 인증은 없습니다" 안내가 사라지고 `dashboard.html`로 정상 진입합니다. 권한이 없는 계정이면 `index.html?e=role`로 돌아가며 "운영자 권한이 있는 계정으로 로그인해 주세요"가 뜹니다 — 이 메시지가 보이면 통과가 아닙니다. |
| 2 | 대시보드 SLA 시계가 실제 시각인지 확인 | 운영 | `dashboard.html` 상단 "기준 시각 … KST"가 지금 시각과 맞는지 확인합니다. | 데모 고정 시각(`2026-10-08 19:30`)이 아니라 실제 현재 시각이 표시됩니다. mock 모드가 아니라 `MGA.mode === 'api'`로 동작 중이라는 뜻입니다. |
| 3 | 견적 요청 한 바퀴(테스트 데이터) | 운영·개발 | `ko/index.html`에서 테스트 요청을 접수 → `ko/track.html` 추적 링크 수신 확인 → `admin/rfp.html`에서 요건 확인 중→초대 준비→견적 받는 중 전이하며 승인 파트너 1곳 초대 → `en/bid.html`에서 견적 제출 → 콘솔에서 견적 정리 중→비교표 전달됨 → 추적 페이지에서 제안 선택 + 인증번호 입력 → 비교표 전달됨→성사 전이까지 실제로 눌러 봅니다. | 상태전이표 v1.9의 전이 순서와 어긋나지 않고, 각 단계 알림(`ORG_RECEIVED · ORG_BIDDING · HTL_INVITE · HTL_QUOTE_RECEIVED · ORG_DELIVERED · ORG_PICK_OTP · HTL_SELECTED_CONNECT · ORG_WON`)이 실제로 발송됩니다. |
| 4 | 회원가입 한 바퀴 | 운영 | `ko/signup.html`에서 테스트 계정으로 기본 정보 → 이메일 인증번호 → 휴대전화 인증번호까지 진행합니다. | `active` 상태에 도달하고 `ACC_WELCOME`을 수신하며, `admin/members.html`에 새 회원으로 표시됩니다. |
| 5 | 피드백 위젯 한 바퀴 | 운영 | 아무 공개 페이지 우하단 "의견 보내기" 버튼으로 테스트 피드백을 제출합니다. | `FB-YYMMDD-XXXX` 접수번호가 발급되고, 운영팀이 `FB_OPS_ALERT`을 수신하며, `admin/feedback.html`에 **신규** 상태로 보입니다. |
| 6 | 검색엔진 등록 | 운영 | 네이버 서치어드바이저·구글 서치콘솔에 `site.config.json`의 `siteVerification` 값으로 소유 확인 후 `sitemap.xml`을 제출합니다. | 두 콘솔 모두 소유 확인이 완료되고 sitemap이 정상 접수됩니다. |

## 5. 오픈 직후 1시간

*사람이 누른 한 바퀴가 문제없더라도, 시스템이 알아서 도는 부분(크론·알림 재시도)은 따로 확인해야 합니다.*

| # | 확인 내용 | 담당 | 확인 방법 | 통과 기준 |
|---|---|---|---|---|
| 1 | 실시간 발송 로그 확인 | 운영 | `admin/settings.html#notify` 발송 로그와 `admin/dashboard.html`의 "발송 실패" 카드를 봅니다. | 발송 실패가 0건이거나, 있다면 즉시 원인(주소 오타 등)이 파악되는 개별 건 정도입니다. |
| 2 | pg_cron 동작 확인 | 개발 | Supabase 대시보드 `Database → Cron Jobs`(또는 `select * from cron.job_run_details order by start_time desc`)에서 6개 작업 — 알림 발송(매분) · `mg-system-tick`(10분) · `mgfb-mail-retry`(10분) · 레이트리밋 정리(매시) · 데모 정리(매일) · 익명화(매월) — 의 최근 실행 시각을 확인합니다. | 6개 작업 모두 각자 주기 안에 최근 정상 실행 기록이 있습니다. |
| 3 | 실사용 접수 1건을 실제로 진행 | 운영 | 가짜 테스트가 아니라 첫 실사용 접수 건을 `admin/rfps.html`에서 찾아 요건 확인 중까지 넘겨 봅니다. | SLA 기산(요건 확인 중 전이 시각)이 실제 접수 시각을 기준으로 정확히 걸립니다. |
| 4 | 오류 로그 확인 | 개발 | 브라우저 콘솔과 `supabase functions logs <함수명>`(`submit_rfp, get_track, get_bid, submit_quote, login` 등)을 확인합니다. | 반복되는 500 오류나 인증 오류가 없습니다. |

## 6. D+1

*오픈 첫날 밤사이 쌓인 것들 — SLA, 발송 실패, 피드백 — 을 아침에 정리합니다.*

| # | 확인 내용 | 담당 | 확인 방법 | 통과 기준 |
|---|---|---|---|---|
| 1 | SLA 임박 목록 재확인 | 운영 | `dashboard.html`의 "SLA·초대 기한 초과/임박" 카드를 확인합니다. | D-day에 접수된 건이 제때 요건 확인 중으로 넘어갔고, 방치된 건이 없습니다. |
| 2 | 발송 실패·재시도 확인 | 운영 | `settings.html#notify` 발송 로그에서 `failed` 건을 확인합니다(자동 재시도는 1/5/30/120/360분 백오프로 5회까지, 이후 `failed`로 표시). | 실패 건이 전부 "직접 보냄" 처리되었거나 재발송으로 해소됩니다. |
| 3 | 신규 피드백 트리아지 | 운영 | `admin/feedback.html`에서 D-day에 들어온 신규 건을 우선순위(P1~P4)와 하위 코드로 분류합니다(VOC SOP: 일일 트리아지 영업일 10:00·16:00, 신규→분류 1영업일). | 신규 건이 1영업일 안에 전부 분류됩니다. P1은 접수 후 4영업시간 안에 착수합니다. |
| 4 | 도메인·SSL·404·검색엔진 재점검 | 운영 | D-1/D-day 항목(SSL 유효기간, 404 페이지, 서치콘솔 등록)을 다시 한번 확인합니다. | 전날 확인한 상태 그대로 이상이 없습니다. |

## 7. 첫 주

*일회성 점검에서 벗어나 정규 운영 루틴([운영자 온보딩](operator-onboarding.html) 문서 참고)으로 넘어가는 단계입니다.*

| # | 확인 내용 | 담당 | 확인 방법 | 통과 기준 |
|---|---|---|---|---|
| 1 | 주간 정리(VOC 월요일 11:00) | 운영 | `admin/feedback.html` 주간 정리 프리셋으로 `on_hold`·미분류 건을 정리합니다(VOC SOP 기준). | 보류 건에 사유 메모가 남아 있고, 오래 방치된 신규 건이 없습니다. |
| 2 | 파트너 심사 지연 재확인 | 운영 | `dashboard.html`의 "파트너 심사 지연" 카드를 확인합니다. | 신청·심사중 상태에서 5영업일을 넘긴 건이 없습니다. |
| 3 | 알림톡 대체발송(LMS) 비율 확인 | 운영 | `settings.html#notify` 발송 로그에서 요청자 알림톡이 실패해 LMS 문자로 대체된 비율을 봅니다. | 특정 통신사·기기에서 알림톡이 반복적으로 실패하지 않습니다. 반복된다면 카카오 알림톡 프로필·발신 설정을 재점검합니다. |
| 4 | 지표 카드가 실데이터로 갱신되는지 확인 | 대표 | `dashboard.html`의 "지난달 지표 · 예시 데이터" 카드가 실접수 기준으로 바뀌었는지 확인합니다. | "예시 데이터" 표시가 사라지고 실제 접수·성사 건수로 계산됩니다. |
| 5 | 카카오 인앱·메일 도달 재검증 | QA | 첫 주 실사용자 문의·피드백 중에 링크가 안 열리거나 메일을 못 받았다는 제보가 있는지 `admin/feedback.html`에서 확인합니다. | 전달 관련 제보가 없거나, 있다면 원인이 파악되어 조치됩니다. |

## 8. NOTIFY_MODE 전환과 되돌리기

*`NOTIFY_MODE`는 `log` 또는 `live` 두 값입니다. `log`는 실제 HTTP 발송 없이 `notification_deliveries.status = 'skipped'`로만 기록하고, `live`는 실제로 이메일·알림톡·SMS를 내보냅니다(supabase/README.md §3).*

### 시작값과 전환 시점

- 개발·검증 기간에는 계속 `log`로 둡니다. 이 상태에서는 상태전이 자체는 정상 동작하고 알림만 실제로 나가지 않습니다.
- **D-1**: 스테이징 프로젝트에서 먼저 `live`로 전환해 리허설합니다.
- **D-day 오픈 직전**: 운영 프로젝트를 `live`로 전환합니다.

### 전환 절차

1. `supabase secrets set NOTIFY_MODE=live --project-ref <project-ref>`를 실행합니다. Edge Function을 다시 배포할 필요는 없고, 다음 `dispatch_notifications` 호출(매분 크론)부터 바로 반영됩니다.
2. 테스트 알림 1건(예: 테스트 계정으로 `ORG_RECEIVED` 유도)을 발송해 실제로 도착하는지, `settings.html#notify` 발송 로그에 "발송됨"으로 남는지 확인합니다.
3. `MG_DEMO_OTP=1`은 QA 전용이며 `NOTIFY_MODE=live`에서는 코드가 강제로 무시하므로(README §3), 운영 전환 시 별도로 끌 필요는 없습니다 — 다만 QA 시크릿이 운영 프로젝트에 남아 있지 않은지 한 번은 확인합니다.

### 되돌리기(오발송·대량 실패 시)

1. `supabase secrets set NOTIFY_MODE=log --project-ref <project-ref>`로 즉시 원복합니다. 이후 알림은 다시 `skipped`로만 기록되고 실제 발송은 멈춥니다.
2. 원복하기 전에 이미 `pending`으로 쌓인 큐가 있는지 확인합니다 — `log`로 돌아가도 큐 자체는 지워지지 않으므로, `live`로 다시 전환하는 순간 밀린 알림이 한꺼번에 나갈 수 있습니다.
3. 원인을 파악한 뒤 재전환하거나, 문제가 된 개별 건만 운영자가 `settings.html#notify` 발송 로그에서 "직접 보냄"으로 표시하고 나머지는 `log`로 유지합니다.

> 발송 실패는 1/5/30/120/360분 백오프로 최대 5회 자동 재시도된 뒤 `failed`로 남아 대시보드 "발송 실패" 카드와 콘솔 `failed` 필터에 노출됩니다. `failed` 건은 운영자가 직접 발송하고 화면에서 체크 표시합니다.

## 9. 오픈 중단 기준

*아래 중 하나라도 해당하면 오픈을 미룹니다. 부분적으로 열고 나중에 고치는 방식은 개인정보·법적 리스크가 있는 항목(약관·방침·사업자 정보)에는 적용하지 않습니다.*

> **오픈 중단**
>
> - **핵심 흐름 중 하나라도 안 됨** — 견적 요청 제출(`submit_rfp`) → 토큰 조회(`get_track`/`get_bid`) → 견적 제출·거절(`submit_quote`/`decline_bid`) → 제안 선택 인증(`pick_send_otp`/`pick_verify`) 중 하나라도 [D-day 오전 한 바퀴](#dday-am)에서 실패
> - **제안 선택 자체가 막힘** — SMS 발신번호 미등록으로 `ORG_PICK_OTP`가 전혀 가지 않음(성사 전이가 원천적으로 불가능해짐)
> - **Supabase 연결 실패 또는 마이그레이션 미적용** — 콘솔 로그인이 `e=config`·`e=snapshot`으로 반복 실패
> - **도메인 SSL 미비** — 인증서 오류로 브라우저 경고가 뜸(카카오 인앱 브라우저에서는 그대로 접속이 막히는 경우가 있음)
> - **이용약관 전문·개인정보처리방침 미확정** — `TODO(legal)`이 남아 있는 상태로는 오픈하지 않습니다
> - **사업자 정보 미기재** — 상호·대표자·사업자등록번호·주소·개인정보 보호책임자가 푸터·약관·방침에 비어 있음
> - **임시 메일 주소·예시 데이터가 화면에 남아 있음** — `mysteri1984@gmail.com`, REF 예시값, 고정 날짜 등이 재빌드 후에도 보임
> - **`site.config.json`이 `prod:false` 또는 `demo:true`인 채로 배포됨** — DEMO 띠·상태 미리보기 스위처가 실사용자에게 노출됨

> 경미한 항목(이메일 열람용 웹 버전, 파트너 신청 상태 확인 페이지 등 사이트맵 §2의 "C 오픈 직후" 항목)은 오픈을 막지 않고 첫 주 안에 처리합니다.

---

**연관 문서** · [상태전이표 v1.9](state-transitions.html) · [사이트맵 · 오픈 전 점검 v1.2](sitemap.html) · [알림 라이브러리](notification-library.html) · [장애 대응 runbook](incident-runbook.html) · [운영자 온보딩](operator-onboarding.html) · supabase/README.md
