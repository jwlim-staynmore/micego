# MICEGO 프로젝트 진행 현황 - 클로드

기준일 2026-09-27(지역 파트너 콘솔 구현 반영 후 갱신) · 작성 계정 jwlim@staynmore.com · 이 문서는 세션이 바뀌어도 이어서 작업할 수 있도록 상태를 고정해 둔 것입니다.

## 1. 한눈에 보기

| 영역 | 상태 | 위치 |
|---|---|---|
| 공개 사이트(여행사 ko 13p · 호텔 en 6p · 허브) | 완료 · 테스트 통과 | micego-site/ko, en, index.html |
| 회원제(가입·이메일/휴대전화 인증·로그인·재설정·내 요청·계정·탈퇴·공유 링크·선정 OTP) | 완료(데모 모드) · API 연동 코드 완료 | ko/signup·login·reset·my·account·withdraw, track |
| 운영 콘솔(대시보드·견적·파트너·회원·피드백·설정) | 완료(mock) · API 어댑터 완료 | admin/ |
| **지역 파트너 콘솔(역할별 스코프·자동 배정·위임/인계·대리 입력+호텔 확인·정산·조직/계정 초대·오거나이저 고지)** | **코드 완료(mock 42 · 백엔드 16 시나리오 통과) · 배포 전** | admin/partner.js, settlements·settlement·partner-orgs·my-org·accept.html, en/confirm.html, supabase/migrations/0010~0016, functions/partner_invite·quote_confirm |
| 알림 라이브러리(이메일 31·알림톡 9·SMS 2) | 완료 | docs/notification-library.html, emails/ |
| 상태전이표 v1.7 | 완료(파트너 상태·대리 입력 반영은 다음 갱신) | docs/state-transitions.html |
| 사이트맵·오픈 전 점검 v1.3 | 완료 | docs/sitemap.html |
| 백엔드(Supabase 마이그레이션 16·Edge Function 30·발송 어댑터·테스트) | 코드 완료 · **배포 전** | supabase/ |
| 오픈 자산(404·sitemap.xml·아이콘·unsubscribe·보안 헤더·GA4 자리·site.config.json·prod 빌드) | 완료 | 루트, en/ |
| 피드백(VOC) 시스템 | 코드 완료(위젯·Edge Function·DB·콘솔) · **배포 전** · SOP 문서 완료 | assets/feedback.js, supabase/functions/feedback-*, admin/feedback*.html |
| 이용약관·파트너 약관·개인정보처리방침(한·영) 전문 초안 | 초안 완료 · 법무 검토 전 — JSON 원본을 네 페이지에 렌더링 | legal/*.json, legal_render.py, build_legal.py → ko/terms, en/terms, ko/privacy, en/privacy |
| prod 빌드 예시 데이터 제거 | 완료 — 16개 예시 문자열이 prod에서 하드 FAIL로 검사됨 | build2/build_acc/build_acc2/build_launch, verify_launch |
| 운영 준비 문서 3종 | 완료(확인 필요 항목 있음) | docs/launch-checklist · incident-runbook · operator-onboarding (.html/.md) |

테스트: verify2 · verify3 · verify_acc · verify_admin · verify_admin_ops · verify_admin_members · verify_admin_feedback · verify_admin_partner · verify_launch · verify_api · verify_feedback · supabase/tests/run.sh — 모두 0 FAILS (2026-09-27 기준).

## 2. 확정된 결정 (되돌리려면 명시적으로)

- 스택: 정적 HTML(파이썬 생성기) + Supabase(브라우저 직결 + Edge Functions). Next.js 아님.
- 회원은 여행사·기업 담당자만. 호텔은 토큰 링크, 비회원 견적 요청 유지.
- 요청은 개인 소유 + 요청별 보기 전용 공유 링크. 담당자 변경은 운영자 이관.
- 제안 선정은 등록 휴대전화 OTP 필수(회원·비회원 공통). 공유 링크로는 선정 불가.
- 인증번호 문자는 알림톡이 아닌 일반 SMS(Solapi 기본, Aligo 스텁). 이메일은 Resend.
- 이메일 OTP는 자체 테이블(열거 방지·한도 집행). 비밀번호 재설정은 Supabase Auth 링크.
- 데모 페르소나: 김지은 과장 · 한빛투어 · jieun.kim@hanbit-tour.example (prod 빌드에서는 전부 제거됨).
- 피드백 시스템: 답변은 메일함에서 직접 회신, 콘솔은 상태·메모만. 스크린샷 미지원. contact.html 통합. 위젯은 CORS 단순 요청으로 Edge Function만 호출.
- 약관·방침의 원본은 `legal/*.json` 하나뿐. HTML은 손대지 않고 JSON 또는 site.config.json(operator·legal·sms 블록)을 고친 뒤 `python3 build2.py`. 계약 당사자·개인정보처리자는 MatchGo 단독. 호텔 파트너에게는 영문 Partner Terms(20조) 별도 적용. 선정 시 호텔 제공은 "선정 화면 고지 + OTP 확정"을 동의 절차로 구성(제7조 ④).
- 문의 폼 동의 문구는 "접수 후 12개월 익명화"로 통일(피드백 테이블 규칙과 일치). track.html 선정 화면에 국외 이전 고지·privacy.html#s8 링크 추가.
- **지역 운영 파트너(Tmthai 등, 70:30)는 같은 콘솔을 쓴다.** 요청이 파트너에게 맡겨지면 오거나이저에게 파트너 이름을 고지한다(메일·진행 화면). 파트너가 담당 지역 RFP를 접수부터 성사까지 끝까지 운영(B). 호텔 견적 대리 입력 허용 + 호텔 1회용 확인 링크(72h)로 확정해야 비교표에 실림(A). 비교표 전달 전 본사 호텔 검토 게이트 없음, 사후 통제(성사 시 커미션 승인 전 본사 사후 검토 필수)(B). 지역–파트너 N:M(주+백업), 파트너는 호텔 원본 금액 수정 불가, 정산=호텔통화+송금통화+수동 환율, SLA KST, 콘솔 한국어, 계정은 이메일 초대. PTR/HQ 내부 알림은 CONSOLE_NOTICE 공통 템플릿(이메일만).

## 3. 법무 검토·운영 결정 대기 (legal/REVIEW_NOTES.md 요약)

검토 표시 18곳: 이용약관 7 · Partner Terms 5 · 개인정보처리방침 4 · Privacy Notice 2. 페이지에는 노란 "법무 검토" 표시로 보이며, `site.config.json`의 `legal.reviewed`를 true로 바꾸면 사라집니다. `legal.effectiveDate`를 채우면 "초안" 배지가 사라지고 시행일이 표기됩니다.

운영이 정해야 하는 것(코드가 뒤따름):
1. **비회원 요청 정보 보관 기간** — 초안은 "요청 종료 후 30일"(공유 링크 만료와 동일). 백엔드에 rfps·notification_log 파기 작업이 아직 없어 결정 후 `system_tick`에 파기(또는 연락처 null 처리) 추가 필요.
2. **운영자 대리 확정(operator_override)** — OTP 없이 운영자가 선정 처리하는 경로가 코드에 있어 약관 제7조 ⑧에 드러냄. 쓸 것이면 동의 확인 방법·기록(selections에 확인 방법·일시) 추가, 안 쓸 것이면 ⑧ 삭제 + 백엔드 경로 제거.
3. **Supabase 리전** — 개인정보보호법 §28-8 ②는 이전 국가 특정을 요구. 리전 확정 후 방침 제8조 표에 국가명 기재(서울 리전이면 "지원 접근"만 남음).
4. **호텔 커미션 고지 수준**(제4조 ⑤)과 **Partner Terms 책임 한도(USD 1,000)·비우회 12개월** — 사업 조건 확정 후 조정.
5. GA4를 켜면(analytics.ga4) 방침의 쿠키 문장이 자동으로 GA4 고지로 바뀝니다(legal_render.COOKIE_GA4). 문구 자체는 법무 검토 표시 포함.
6. **지역 파트너 고지·개인정보** — 결정(2026-09-27): 오거나이저에게 고지한다(접수 확인·비딩 시작 메일 블록 + 진행 상황 화면). 방침 제6·7·8조, 약관 제4조 ⑥, Partner Terms 2·8.9·15.5, Privacy Notice §4에 반영(모두 법무 검토 표시, REVIEW_NOTES §5). 남은 것: 파트너 DPA 체결, 파트너 국가 목록 확정(§28-8 ② 국가 특정), legal 빌드 재실행으로 HTML 반영.
7. **파트너 정산 통화·환율 출처 규칙** — 현재 자유 입력 + 출처 메모. 기존 진행 중 RFP를 파트너에게 일괄 위임할지(현재 신규 접수분만 자동 배정).

## 4. 사용자가 해야 하는 일 (코드 밖)

1. 도메인·공식 메일 확정 → site.config.json의 domain·officialEmail·privacyEmail.
2. 사업자 정보 → site.config.json의 operator 블록(상호·대표자·사업자등록번호·주소·전화·개인정보 보호책임자). 비어 있으면 약관·방침에 "(확인 후 기재)"로 표시됨.
3. Supabase 프로젝트 생성·배포 → supabase/README.md 순서(link → db push → functions deploy → secrets → cron). 완료 후 supabase.url·anonKey 입력. 지역 파트너 콘솔 추가 순서는 `micego-지역파트너-콘솔-구현-노트-v1` §3.
4. Resend 도메인 인증, Solapi 가입·발신번호 사전등록·카카오 채널·알림톡 템플릿 9종 검수. sms.vendorName에 수탁사명 기재.
5. 법무 검토(legal/REVIEW_NOTES.md 18곳 + §3의 결정) → legal.reviewed=true, legal.effectiveDate 기재.
6. 카카오 인앱·삼성 인터넷·iOS Safari 실기기 검수.
7. 운영 문서의 "확인 필요" 항목: SSL 인증서 발급·자동 갱신 방식, Supabase PITR 플랜, 알림톡 템플릿 검수 소요 기간, Supabase Auth 세션 만료 시간, 벤더 상태 페이지 URL. 스팸 방어는 Origin 허용 목록·허니팟·속도 제한뿐(Turnstile 없음).
8. Tmthai 계약·DPA 서명 → 콘솔에서 지역 파트너 등록(TMTHAI · TH 주 담당) → 관리자 계정 초대 → 활성화. Supabase Auth 리다이렉트 허용 목록에 `/admin/accept.html` 추가.

## 5. 다음 작업 (우선순위 순)

1. **§3의 운영 결정** — 특히 1(비회원 30일 파기 작업)·2(operator_override)·6(파트너 신원 열람 고지)은 코드·약관이 뒤따름.
2. **Supabase 배포 + 피드백 + 지역 파트너 콘솔 배포** — 0001~0016 마이그레이션, Edge Function 30개, FEEDBACK_* 환경변수, Resend 도메인 인증, ops_email 설정. 스테이징에서 IP 헤더 구성 확인(F-2).
3. Supabase 키가 들어오면 API 모드 빌드 + 실제 연결 테스트 → docs/launch-checklist.md D-7 항목부터. verify_api.py에 파트너 시나리오(초대 수락·대리 입력·호텔 확인·정산) 추가.
4. docs/state-transitions(초대 상태 4종·위임·정산 상태기계)·supabase/README.md·운영자 온보딩에 지역 파트너 절차 반영.
5. track·bid 설명문의 예시 날짜(2026-10-06~20) 문장 재작성(prod 검사 대상은 아님).
6. 결정 대기: 첨부파일, 호텔 마감 현지 시간 병기, 제출 후 요청 수정, 운영자 계정 발급 방식(→ 콘솔 초대로 통일 가능: partner_invite는 role=operator 초대도 지원).

## 6. 파일 위치

- PC: `C:\Users\82107\Claude\Projects\MICE 역경매 비즈니스\micego-site\` (전체 소스) + `micego-site.zip` (지역 파트너 콘솔 반영 전 스냅샷)
- 약관·방침 원본: `micego-site/legal/` (terms_ko.json · partner_terms_en.json · privacy_ko.json · privacy_en.json · REVIEW_NOTES.md)
- 운영 문서: `micego-site/docs/launch-checklist.md` · `incident-runbook.md` · `operator-onboarding.md` (.html 동일 내용) · `docs/partner-console-impl-v1.md`(구현 노트)
- 빌드: `python3 build2.py` → 공개·회원·약관 페이지·오픈 자산 재생성 / `python3 build_notify.py` → 알림 라이브러리(+ `supabase/scripts/sync_templates.py`) / `python3 build_confirm.py` → en/confirm.html / `python3 build_sitemap.py` → 점검 문서
- 환경별 빌드: `MG_SITE_CONFIG=<파일> python3 build2.py` (verify_launch.py 참고)
- 프로젝트 문서(클로드): 회원제 설계서 v1 · 사이트맵-오픈전 점검 v1(→ v1.3 내용) · 피드백 시스템 설계서 v1 · VOC SOP·CX v1 · 백엔드 배포 런북 v1 · 지역파트너 콘솔 기술설계서 v1 · 지역파트너 콘솔 구현 노트 v1 · 약관·방침 법무 검토 메모 v1 · 오픈 체크리스트 v1 · 장애 대응 런북 v1 · 운영자 온보딩 v1 · 이 문서

## 개선 이력
- 2026-09-27 · jwlim@staynmore.com(클로드) · 지역 파트너 콘솔 구현 반영(표·결정·대기 항목·다음 작업·파일 위치 갱신).
- 2026-09-27 · jwlim@staynmore.com(클로드) · 오거나이저 고지 결정(고지) 반영 — §2 결정·§3-6 갱신.
