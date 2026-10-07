# MICEGO 프로젝트 진행 현황 - 클로드

기준일 2026-09-28(운영자 대리 확정 동의 기록·Turnstile 스팸 방어 반영 후 갱신) · 작성 계정 jwlim@staynmore.com · 이 문서는 세션이 바뀌어도 이어서 작업할 수 있도록 상태를 고정해 둔 것입니다.

## 0-1. 2026-10-07 갱신 — 불일치 3건 수정

- 브랜치 `fix/org-types-currency-share`(커미션 브랜치 위). 마이그레이션 `0018_org_types_currencies.sql`, D-44~D-46.
- 소속 유형 5종(여행사·랜드사·기업(행사 주최)·협회·기관·기타)으로 폼·가입·계정·서버 통일 — 랜드사·기업·협회 요청이 접수 거절되던 문제 해결.
- 호텔 견적 통화 = 정산 지원 통화(THB 등 추가, TWD·HKD 신규, GBP 제외). 지원 밖 통화는 서버·DB에서 거절.
- 진행 상황 화면의 공유 링크 패널은 회원에게만, 비회원에게는 가입·로그인 안내.
- 백엔드 PASS=15.

## 0. 2026-09-29 갱신 — Git 이관·호텔 커미션

- **원본이 GitHub `jwlim-staynmore/micego`(비공개)로 옮겨졌다.** PC 폴더는 09-28 시점 사본. 09-27 동시 편집 사고(K-12) 병합을 마쳤고, 호텔 약관(en/terms) 전문이 요약본에 덮어써지던 문제도 고쳤다.
- **호텔 커미션 도입(D-37~D-43)**: 호텔별 고정 요율을 승인 때 합의(기준: 객실+연회·F&B 순액), 호텔이 링크로 동의해야 초대가 나간다. 지역 파트너는 5~20% 안에서 결정. 초대 시점 요율 스냅샷 → 정산 자동 프리필. 주최 측은 계속 수수료 없음·요율 비공개. 브랜치 `feat/hotel-commission-rate`(0017 마이그레이션, `en/commission.html`, 콘솔 요율 UI). 검증 11종 0 FAILS, 백엔드 PASS=14.
- **오픈 전 추가 할 일**: 기존 승인 호텔에 요율 제안·동의 받기, Partner Terms 5.2~5.7·이용약관 제4조⑤ 법무 검토(검토 쟁점 21곳), 파트너 계약서에 커미션 수금의 세무 성격(대리 수금 vs 파트너 매출) 명시.
- **이 문서 아래 내용(09-28 기준)과 코드가 어긋나는 곳**: Turnstile·운영자 대리 확정 동의 기록(`0010_selection_consent`)은 저장소에 없다 — 되찾으면 `0019`로 넣는다(0018은 아래 불일치 수정이 사용).

## 1. 한눈에 보기

| 영역 | 상태 | 위치 |
|---|---|---|
| 공개 사이트(여행사 ko 13p · 호텔 en 6p · 허브) | 완료 · 테스트 통과 | micego-site/ko, en, index.html |
| 회원제(가입·이메일/휴대전화 인증·로그인·재설정·내 요청·계정·탈퇴·공유 링크·선정 OTP) | 완료(데모 모드) · API 연동 코드 완료 | ko/signup·login·reset·my·account·withdraw, track |
| 운영 콘솔(대시보드·견적·파트너·회원·피드백·설정) | 완료(mock) · API 어댑터 완료 | admin/ |
| 알림 라이브러리(이메일 29·알림톡 9·SMS 2) | 완료 | docs/notification-library.html, emails/ |
| 상태전이표 v1.8 | 완료 | docs/state-transitions.html |
| 사이트맵·오픈 전 점검 v1.4 | 완료 | docs/sitemap.html |
| 백엔드(Supabase 마이그레이션 10·Edge Function 28·발송 어댑터·테스트) | 코드 완료 · **배포 전** | supabase/ |
| 오픈 자산(404·sitemap.xml·아이콘·unsubscribe·보안 헤더·GA4 자리·site.config.json·prod 빌드) | 완료 | 루트, en/ |
| 피드백(VOC) 시스템 | 코드 완료(위젯·Edge Function·DB·콘솔) · **배포 전** · SOP 문서 완료 | assets/feedback.js, supabase/functions/feedback-*, admin/feedback*.html |
| **이용약관·파트너 약관·개인정보처리방침(한·영) 전문 초안** | **초안 완료 · 법무 검토 전** — JSON 원본을 네 페이지에 렌더링 | legal/*.json, legal_render.py, build_legal.py → ko/terms, en/terms, ko/privacy, en/privacy |
| **prod 빌드 예시 데이터 제거** | 완료 — 16개 예시 문자열이 prod에서 하드 FAIL로 검사됨 | build2/build_acc/build_acc2/build_launch, verify_launch |
| **운영 준비 문서 3종** | 완료 v1.1(확인 필요 항목은 §4 표) | docs/launch-checklist · incident-runbook · operator-onboarding (.html/.md) |
| **운영자 대리 확정 동의 기록** | 코드 완료 · **배포 전**(0010 + admin.js 동시 배포) | supabase/migrations/0010_selection_consent.sql, admin/admin.js·rfp.html |
| **스팸 방어(Cloudflare Turnstile)** | 코드 완료 · 기본 꺼짐(siteKey·TURNSTILE_SECRET 비어 있음) | assets/mg.js·feedback.js, supabase/functions/_shared/turnstile.ts, 5개 Edge Function |

테스트: verify2 · verify3 · verify_acc · verify_admin · verify_admin_ops · verify_admin_members · verify_admin_feedback · verify_launch · verify_api · verify_feedback · supabase/tests/run.sh — 모두 0 FAILS (2026-09-28 기준, supabase 테스트 PASS=14).

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
- 운영자 대리 확정(operator_override) **유지**. 성사 처리 시 요청자의 선정 의사·정보 제공 동의를 확인한 방법(이메일 회신·전화 통화·문자 회신·기타)·확인 일시·근거를 selections에 필수 기록(GUARD_CONSENT). OTP 경로는 consent_method='otp'. 근거 메모는 3년 연결 기록과 함께 파기.
- 스팸 방어는 Origin 허용 목록·허니팟·속도 제한 위에 Cloudflare Turnstile을 추가. site.config.json의 turnstile.siteKey가 비어 있으면 HTML·JS 동작이 이전과 동일(네트워크 요청 0). 서버는 TURNSTILE_SECRET이 있을 때만 토큰을 요구하며, 장애 시 시크릿만 비우면 즉시 우회.

## 3. 법무 검토·운영 결정 대기 (legal/REVIEW_NOTES.md 요약)

검토 표시 18곳: 이용약관 7 · Partner Terms 5 · 개인정보처리방침 4 · Privacy Notice 2. 페이지에는 노란 "법무 검토" 표시로 보이며, `site.config.json`의 `legal.reviewed`를 true로 바꾸면 사라집니다. `legal.effectiveDate`를 채우면 "초안" 배지가 사라지고 시행일이 표기됩니다.

운영이 정해야 하는 것(코드가 뒤따름):
1. **비회원 요청 정보 보관 기간** — 초안은 "요청 종료 후 30일"(공유 링크 만료와 동일). 백엔드에 rfps·notification_log 파기 작업이 아직 없어 결정 후 `system_tick`에 파기(또는 연락처 null 처리) 추가 필요.
2. ~~운영자 대리 확정(operator_override)~~ — **결정 완료(유지)**, 동의 기록 구현 완료. 약관 제7조 ⑧은 법무 검토만 남음.
3. **Supabase 리전** — 개인정보보호법 §28-8 ②는 이전 국가 특정을 요구. 리전 확정 후 방침 제8조 표에 국가명 기재(서울 리전이면 "지원 접근"만 남음).
4. **호텔 커미션 고지 수준**(제4조 ⑤)과 **Partner Terms 책임 한도(USD 1,000)·비우회 12개월** — 사업 조건 확정 후 조정.
5. GA4를 켜면(analytics.ga4) 방침의 쿠키 문장이 자동으로 GA4 고지로 바뀝니다(legal_render.COOKIE_GA4). 문구 자체는 법무 검토 표시 포함.

## 4. 사용자가 해야 하는 일 (코드 밖)

1. 도메인·공식 메일 확정 → site.config.json의 domain·officialEmail·privacyEmail.
2. 사업자 정보 → site.config.json의 operator 블록(상호·대표자·사업자등록번호·주소·전화·개인정보 보호책임자). 비어 있으면 약관·방침에 "(확인 후 기재)"로 표시됨.
3. Supabase 프로젝트 생성·배포 → supabase/README.md 순서(link → db push → functions deploy → secrets → cron). 완료 후 supabase.url·anonKey 입력.
4. Resend 도메인 인증, Solapi 가입·발신번호 사전등록·카카오 채널·알림톡 템플릿 9종 검수. sms.vendorName에 수탁사명 기재.
5. 법무 검토(legal/REVIEW_NOTES.md 18곳 + §3의 결정) → legal.reviewed=true, legal.effectiveDate 기재.
6. 카카오 인앱·삼성 인터넷·iOS Safari 실기기 검수.
7. Turnstile을 켜려면: Cloudflare 대시보드에서 위젯 생성(Managed, 허용 호스트에 운영·스테이징 도메인) → site.config.json turnstile.siteKey 입력·재빌드·배포 → 배포가 퍼진 뒤 `supabase secrets set TURNSTILE_SECRET=…`. 끌 때는 반대 순서(시크릿 먼저). supabase/README.md §9.
8. 운영 문서의 "확인 필요" 항목 — 아래 표의 권장값을 확인해 문서에 채워 주십시오.

| 항목 | 문서 위치 | 권장·기본값 | 확인 방법 |
|---|---|---|---|
| SSL 인증서 발급·자동 갱신 | 오픈 체크리스트 D-1 #8 | vercel.json이 있으므로 Vercel 호스팅 기준: 도메인을 연결하면 인증서가 자동 발급·갱신됩니다. 별도 작업 없음 | Vercel 프로젝트 → Domains에서 인증서 상태 확인 |
| Supabase PITR | 오픈 체크리스트 D-1 #9 | Pro 플랜 이상에서 유료 애드온으로 켭니다. 오픈 초기에는 일일 백업(기본)으로 시작해도 되지만, 성사 기록이 쌓이기 시작하면 PITR 권장 | 대시보드 Database → Backups |
| 알림톡 템플릿 심사 소요 | 오픈 체크리스트 D-7 #5 | 벤더·시점에 따라 달라 여기서 단정하지 않습니다. 오픈 2주 전 신청을 권장 | Solapi 콘솔 심사 상태 |
| Supabase Auth 세션 만료 | 운영자 온보딩·runbook | 기본 access token 1시간, refresh token으로 자동 연장(로그인 상태 유지 선택 시 localStorage) | 대시보드 Authentication → Settings → JWT expiry |
| 벤더 상태 페이지 | 장애 runbook 에스컬레이션 표 | Supabase: status.supabase.com. Resend·Solapi는 각 공식 사이트의 상태 페이지 링크를 확인해 기입 | 각 벤더 사이트 |
| Cloudflare(Turnstile) 장애 | 장애 runbook #14 | 시크릿 해제로 즉시 우회 가능하므로 별도 이중화 불필요 | — |

## 5. 다음 작업 (우선순위 순)

1. **§3의 운영 결정** — 남은 것: 1(비회원 30일 파기 작업 — 백엔드 system_tick 추가), 3(Supabase 리전), 4(호텔 커미션·Partner Terms 한도).
2. **Supabase 배포 + 피드백 시스템 배포** — 0001~0010 마이그레이션, Edge Function 28개, FEEDBACK_* 환경변수, Resend 도메인 인증. 스테이징에서 IP 헤더 구성 확인(F-2). 0010과 admin/admin.js·rfp.html은 같은 날 함께 배포(한쪽만 올리면 성사 처리가 막힘). Turnstile은 스테이징에서 테스트 키로 위젯(의견 보내기 포함) 실제 렌더 확인 후 운영 키 적용.
3. Supabase 키가 들어오면 API 모드 빌드 + 실제 연결 테스트 → docs/launch-checklist.md D-7 항목부터.
4. track·bid 설명문의 예시 날짜(2026-10-06~20) 문장 재작성(prod 검사 대상은 아님).
5. 결정 대기: 첨부파일, 호텔 마감 현지 시간 병기, 제출 후 요청 수정, 운영자 계정 발급 방식, 지역 운영 파트너 콘솔 접근.

## 6. 파일 위치

- PC: `C:\Users\82107\Claude\Projects\MICE 역경매 비즈니스\micego-site\` (전체 소스) + `micego-site.zip` (동일 내용 압축)
- 약관·방침 원본: `micego-site/legal/` (terms_ko.json · partner_terms_en.json · privacy_ko.json · privacy_en.json · REVIEW_NOTES.md)
- 운영 문서: `micego-site/docs/launch-checklist.md` · `incident-runbook.md` · `operator-onboarding.md` (.html 동일 내용)
- 빌드: `python3 build2.py` → 공개·회원·약관 페이지·오픈 자산 재생성 / `python3 build_notify.py` → 알림 라이브러리 / `python3 build_sitemap.py` → 점검 문서
- 환경별 빌드: `MG_SITE_CONFIG=<파일> python3 build2.py` (verify_launch.py 참고)
- 프로젝트 문서(클로드): 회원제 설계서 v1 · 사이트맵-오픈전 점검 v1(→ v1.4 내용) · 피드백 시스템 설계서 v1 · VOC SOP·CX v1 · 백엔드 배포 런북 v1 · 약관·방침 법무 검토 메모 v1 · 오픈 체크리스트 v1 · 장애 대응 런북 v1 · 운영자 온보딩 v1 · 이 문서
