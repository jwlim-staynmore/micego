# MICEGO UI/UX 플로우 스펙 v1 - 클로드

> Figma: [MICEGO UI·UX 플로우 기획 v1 - 클로드](https://www.figma.com/design/1zo93NzgNoMv8eMkHX9t2I) — 00 개요·IA / 01 사용자 플로우 / 02 주요 화면·노트·개선 (Starter 요금제라 페이지 3개). 검증 단계에서 추가된 개선 항목 E-21·E-22·E-23·E-25는 Figma 개선 보드에 있음.

기준: 저장소 `/home/claude/micego` 현재 구현(커미션 브랜치 기준, 2026-10-07). 코드로 확인한 내용이 기본이며, 코드에서 직접 확인하지 못한 것은 **(추정)** 표시. 파일은 수정하지 않았음.

주요 근거 파일: `build2.py`(ko/track·en/bid·공개 페이지), `build_acc.py`·`build_acc2.py`(회원 6페이지), `build_commission.py`·`build_confirm.py`·`build_launch.py`(commission·confirm·unsubscribe·404), `admin/admin.js`·`partner.js`·`rfp.html` 등 콘솔 16종, `docs/state-transitions.html` v1.9, `SPEC_LAUNCH.md §3`, `SPEC_ACCOUNTS.md`, `docs/notification-templates.json`.

> **먼저 알아둘 핵심 발견 1건(E-1, high)**: api 모드에서 `ko/track.html`·`en/bid.html`은 서버 응답으로 **상태(data-state)·REF·커미션 한 줄·선정 호텔 연락처·파트너 고지만** 바꾼다. 요청 내용(일정·목적지·객실), 마감일, 진행 단계 날짜, **비교표의 제안 A·B·C 내용**, 제출 견적 요약은 모두 빌드 시점의 예시 데이터(MG-2610-014·다낭·Ocean Pearl)가 그대로 남는다. `build_launch.py`·`verify_launch.py`에 "WP3 data-mg pass 전까지 예시 데이터가 남는다(NOTE, hard-fail 아님)"고 명시돼 있음. 반면 `ko/my.html`·`ko/account.html`은 `my_rfps`/`my_profile`로 실데이터를 그린다. Figma에서는 "서버 데이터로 채워지는 영역"을 별도 레이어로 표시해 두는 것을 권함.

---

## A. 화면 인벤토리

### A-0. 공통·허브

| ID | 파일 | 화면 | 목적 | 진입 | 이탈 |
|---|---|---|---|---|---|
| HUB-01 | `index.html` | 모드 선택 홈 | 여행사(ko) / Hotels(en) 두 카드로 언어·역할 분기 | 직접 URL, 각 페이지 푸터 "모드 선택" | `ko/index.html`, `en/index.html`, 푸터에 ko/en contact·privacy |
| HUB-404 | `404.html` | 404(한/영 병기) | 없는 주소 안내. 토큰 페이지의 invalid와 구분 | 호스팅 404 | `/`, `/ko/`, `/en/` |
| CMN-01 | `assets/feedback.js` (모든 페이지 우하단) | 의견 보내기 위젯 | 유형·내용·회신 이메일 입력, 페이지·상태·REF·브라우저·최근 오류 자동 첨부 → `feedback-submit` | 우하단 고정 버튼 | 접수번호 FB-YYMMDD-XXXX 표시 · Supabase 미설정 시 contact.html 링크로 대체. 상태 closed/open/submitting/done/error |
| CMN-02 | (패턴) | 토큰 페이지 공통 상태 | `loading`(api 모드 초기) → 서버 상태 / `invalid` | — | — |

### A-1. 오거나이저(ko/)

| ID | 파일 | 화면 | 목적 | 진입 | 이탈 |
|---|---|---|---|---|---|
| ORG-01 | `ko/index.html` | 여행사 랜딩 + 견적 요청 폼 `#register` | 서비스 소개(hero·problem·how·who·difference·policy·faq) + 비회원/회원 공통 접수 | HUB-01, 헤더 CTA "견적 요청", 모든 ko 페이지 헤더, ORG-06 "새 견적 요청", 결과 화면 NEWREQ 버튼 | 제출 성공 패널(ORG-01b), `login.html?next=index.html%23register`, `signup.html?email=` |
| ORG-01a | `ko/index.html` (로그인 상태 변형) | 회원 자동 입력 폼 | 담당자 정보 prefill, 이메일·휴대전화 readonly | 로그인 세션 있을 때 | `account.html`(변경 링크), 로그아웃 |
| ORG-01b | `ko/index.html` 성공 패널 `#rfpDone` | 접수 완료 | REF·"진행 상황 보기" 링크·가입 CTA | 폼 제출 성공 | ORG-02(`track.html?t=`), ORG-03 |
| ORG-02 | `ko/track.html?t=` | 견적 진행 상황(요청자 전용) | 상태별 안내·요건 요약·진행 단계·비교표·제안 선택(OTP)·조건 변경/질문·공유 링크 | 메일/알림톡 ORG_* 버튼(`TRACK_URL`), ORG-01b, ORG-06 "열기" | ORG-01(새 요청), contact, terms#art7, privacy#s8, my.html(회원) |
| ORG-02s | `ko/track.html?s=` | 보기 전용 공유 보기 | 동료가 진행·비교표만 열람 | 공유 링크 | — (선택·변경·공유 UI 전부 제거) |
| ORG-03 | `ko/signup.html` | 회원가입(3단계 스테퍼) | 기본 정보 → 이메일 인증 → 휴대전화 인증 → 완료 | 헤더 "로그인"→가입, ORG-01b CTA(`?email=`), ORG-04 "회원가입", track 비회원 공유 안내 | ORG-06, ORG-01#register |
| ORG-04 | `ko/login.html` | 로그인 | 이메일·비밀번호·로그인 유지, `?next=` 복귀 | ko 헤더 "로그인", 회원 페이지 need_login, ORG-01 "이미 회원이신가요?" | `?next` 또는 `my.html`, ORG-05, ORG-03, `index.html#register`(비회원으로 요청) |
| ORG-05 | `ko/reset.html` | 비밀번호 재설정 | 요청 → 메일 → `?k=` 새 비밀번호 | ORG-04, ACC_LOCKED/ACC_PW_RESET 메일 | ORG-04 |
| ORG-06 | `ko/my.html` | 내 견적 요청 | 진행 중/종료/전체 목록, 열기, 공유 링크, 비회원 요청 연결 | 헤더 "내 견적 요청", ACC_WELCOME·ACC_LINKED `MY_URL`, ORG-03 완료 | ORG-02, ORG-01#register, ORG-07, 로그아웃→login |
| ORG-07 | `ko/account.html` | 계정 설정 | 담당자 정보, 이메일/휴대전화 변경(재인증+OTP), 비밀번호, 알림 수신, 로그인 기기 | ORG-06, ORG-01a "계정 설정에서 변경" | ORG-08 |
| ORG-08 | `ko/withdraw.html` | 회원 탈퇴 | 안내·차단·확인·완료 | ORG-07 | 홈 |
| ORG-09 | `ko/about.html`, `ko/faq.html`, `ko/contact.html` | 공개 정보 3종 | 소개·FAQ(회원 그룹 포함)·문의 폼(`contact` Edge) | 헤더 nav, 푸터, 상태 패널의 "문의하기" | — |
| ORG-LEGAL | `ko/terms.html`, `ko/privacy.html` | 약관·방침 전문(legal/*.json 렌더) | 가입 동의·선택 단계 제7조·파트너 고지 제8조 링크 대상 | 푸터, 동의 문구, track `terms.html#art7`, `privacy.html#s8` | — |

### A-2. 호텔(en/) — 로그인 없음

| ID | 파일 | 화면 | 목적 | 진입 | 이탈 |
|---|---|---|---|---|---|
| HTL-01 | `en/index.html` | Partner landing + Register `#register` | why·how·sample·terms(#terms)·faq + 파트너 등록 폼(`register_partner`) | HUB-01, en 헤더 CTA "Register" | 성공 패널(PTN_APPLIED 안내), `sample-request.html`, `terms.html` |
| HTL-02 | `en/sample-request.html` | Sample request | 호텔이 받게 될 요건서·견적 폼 예시(정적) | HTL-01 #sample | HTL-01#register |
| HTL-03 | `en/bid.html?t=` | Request & quote(초대 전용) | 요건서 열람·견적 제출/수정·거절·결과 확인 | HTL_INVITE·HTL_REMINDER·HTL_QUOTE_RECEIVED·HTL_SELECTED_CONNECT·HTL_NOT_SELECTED 메일 `BID_URL` | contact, faq, `index.html#terms`, privacy |
| HTL-04 | `en/commission.html?t=` | Accept commission terms | 합의 요율·산정 기준 확인 후 클릭 동의(POST) | PTN_APPROVED·PTN_COMMISSION_TERMS 메일 `COMMISSION_URL` | contact, `terms.html#art5` |
| HTL-05 | `en/confirm.html?t=` | Confirm proxy-entered quote | 파트너 대리 입력 견적 확인/이의(POST) | HTL_CONFIRM 메일 `CONFIRM_URL` | contact |
| HTL-06 | `en/unsubscribe.html?t=` | Unsubscribe | 초대 메일 수신 거부 확인 | HTL_INVITE·HTL_REMINDER 푸터 `UNSUBSCRIBE_URL` | `index.html`(Keep receiving) |
| HTL-07 | `en/faq.html`, `en/contact.html` | Hotel FAQ · Contact | FAQ, 문의 폼 | 헤더, 상태 패널 BTNS | — |
| HTL-LEGAL | `en/terms.html`(Partner Terms 20조), `en/privacy.html` | 약관·Privacy notice | 등록 동의·bid 동의·commission `#art5` 링크 대상 | 푸터, 동의 문구 | — |

### A-3. 본사 운영자(admin/) — Supabase Auth, `app_metadata.role=operator`

| ID | 파일 | 화면 | 목적 | 진입 | 이탈 |
|---|---|---|---|---|---|
| ADM-00 | `admin/index.html` | 콘솔 로그인 | 이메일·비밀번호(mock: 값만 있으면 통과). `?e=role/config/snapshot` 오류 문구 | 직접 URL, 세션 없음 리다이렉트 | ADM-01 |
| ADM-00b | `admin/accept.html` | 콘솔 초대 수락 | Supabase invite 링크(`#access_token…type=invite`) → 비밀번호 설정 + 정보 이용 동의 → `console_accept` | Supabase 초대 메일(파트너 조직 계정 초대) | ADM-01 / PTR-01(`dashboard.html?as=partner` mock) · expired 패널 |
| ADM-01 | `admin/dashboard.html` | 대시보드 | 오늘 할 일 7카드(SLA 초과/임박·새 접수·마감 24h 제출 0·취합중·파트너 심사 지연·발송 실패) · 개입 필요 위젯 · 상태 분포 · 회원 계정 카드 · 최근 이력 · 지난달 지표 | 로그인 후, 사이드 nav | `rfps.html?filter=…`, `partners.html?filter=delayed`, `#failures` |
| ADM-02 | `admin/rfps.html` | 견적 요청 목록 | 칸반(≥1024)/목록 토글, 상태·SLA·위임·지역·검색 필터, 위임 칩 | nav, ADM-01 필터 링크 | ADM-03 |
| ADM-03 | `admin/rfp.html?id=` | 견적 요청 상세 | 상태 전이(좌측 aside) + 카드: 지역 파트너·위임 / 요청 내용 / 오거나이저 정보 / 소유·공유·선택 인증 / 익명화 검토 / 마감·초대 / 초대 현황(라운드) / 비교표 / 이전 라운드 / 이력 | ADM-02, 대시보드 링크, 정산 상세 REF | ADM-07(소유자), ADM-05(호텔) |
| ADM-04 | `admin/partners.html` | 호텔 파트너 목록 | 상태 칩·심사 지연/중지 검토 필터·커미션 배지·"호텔 등록"(파트너용) | nav | ADM-05 |
| ADM-05 | `admin/partner.html?id=` | 호텔 파트너 상세 | 신청 내용·심사 체크리스트·상태 바꾸기(+요율 다이얼로그)·커미션 요율 카드·지역/등록 경로·응답 통계·초대 이력·이력 | ADM-04, ADM-03 초대 표 | — |
| ADM-06 | `admin/members.html` | 회원 목록 | 검색(이메일/휴대전화/회사)·상태 칩·요청 수·마지막 로그인 | nav(배지=연결 요청 대기) | ADM-07 |
| ADM-07 | `admin/member.html?id=` | 회원 상세 | 회원 정보·요청 목록·공유 링크·연결 요청 승인/거절·계정 조치·감사 로그 | ADM-06, ADM-03 소유자 링크 | ADM-03 |
| ADM-08 | `admin/feedback.html` | 피드백 목록 | 상태 칩·우선순위·유형·경고 배지(분류 지연 등)·주간 정리 프리셋 | nav(배지=new 건수) | ADM-09 |
| ADM-09 | `admin/feedback-detail.html?id=` | 피드백 상세 | 분류(CAT/P1~P4/하위코드)·담당(나에게 배정)·상태 전이·메모·컨텍스트·메일 재발송 | ADM-08 | ADM-03(요청 연결 시) |
| ADM-10 | `admin/settings.html` | 설정 6탭 | 영업일·공휴일(추가/삭제) / 기본 규칙(읽기) / 알림 템플릿(목록·재발송) / 운영자 계정(읽기, Supabase 안내) / 시스템 상태(app_config·시크릿·cron) / 전제 조건 체크리스트 | nav | docs/* |
| ADM-11 | `admin/settlements.html` | 정산 목록 | 상태·지역 파트너·검색 필터, "처리 필요" 뷰 | nav(배지=처리 필요 건수) | ADM-12 |
| ADM-12 | `admin/settlement.html?ref=` | 정산 상세 | 건 정보·금액(호텔 통화)·처리 버튼(settlement_action)·증빙 링크·이력 | ADM-11, 성사 RFP | ADM-03 |
| ADM-13 | `admin/partner-orgs.html` / `?code=` | 지역 파트너 조직 목록·상세 | 조직 등록·정보 수정·지역 설정·활성화/정지/종료·계정 초대·계정 역할/비활성 | nav(운영자만) | ADM-03(조직의 최근 요청) |

### A-4. 지역 파트너(partner_admin / partner_member) — 같은 admin/, `?as=partner` mock

| ID | 파일 | 차이 요약 |
|---|---|---|
| PTR-00 | `admin/accept.html` | 초대 수락(ADM-00b와 동일 화면) |
| PTR-01 | `admin/dashboard.html` | `partnerSummary`(조직명·담당 지역·진행 중 요청·본사 인계·정산 처리 필요·배분율 70:30) + 개입 위젯(처리 완료 버튼 없음). 회원 카드·할 일 카드 없음(추정: `isPartner` 분기만 확인) |
| PTR-02 | `admin/rfps.html` | 자기 조직 위임·인계 건만(서버 스코프). 위임 칩 미표시 |
| PTR-03 | `admin/rfp.html` | 오거나이저 카드가 **마스킹 + "오거나이저 정보 보기" 버튼**(열람 기록), "소유·공유·선택 인증" 카드 없음, "추적 링크 복사" 없음, 위임 카드에 "배정 반려" 버튼(관리자·received/verifying만), 초대 표에 대리 입력 셀, 인계 건은 읽기 전용(서버 RFP_TAKEN_OVER) |
| PTR-04 | `admin/partners.html` | "호텔 등록" 버튼(파트너용) |
| PTR-05 | `admin/partner.html` | 심사중·승인(요율 5~20% 내)만, 위험 표시 호텔은 승인 불가 콜아웃, 커미션 카드(담당자는 조회만) |
| PTR-06/07 | `settlements.html` / `settlement.html` | 자기 조직 건, 액션: 커미션 입력·수금 기록·송금 기록·분쟁 제기(관리자만) |
| PTR-08 | `admin/my-org.html` | 내 조직 정보·계정 목록(관리자: 계정 초대·비활성·역할 변경)·운영 규칙 요약 |
| nav | — | 대시보드·견적 관리·호텔 파트너·정산·내 조직. 회원·지역 파트너·피드백·설정은 본사 전용 |

### A-5. 터치포인트(알림 템플릿 → 이동 화면)

| ID | 채널 | 수신 | 트리거 | 버튼이 여는 화면 |
|---|---|---|---|---|
| ORG_RECEIVED | 알림톡+이메일(LMS 폴백) | 오거나이저 | 접수 | ORG-02 (위임 건이면 REGIONAL_PARTNER 블록) |
| ORG_REJECTED / ORG_BIDDING / ORG_REBID / ORG_DELIVERED / ORG_WON / ORG_LOST / ORG_CANCELLED | 알림톡+이메일 | 오거나이저 | 전이 #2/#4/#7·9/#6/#10/#8·11/#12 | ORG-02 |
| ORG_PICK_OTP | SMS 전용 | 오거나이저 등록 휴대전화 | 제안 선택 | (ORG-02 PICK 단계에 입력) |
| HTL_INVITE | 이메일 | 초대 호텔 | 초대·재초대 (+합의 요율 한 줄, UNSUBSCRIBE_URL) | HTL-03 |
| HTL_REMINDER | 이메일 | 미응답 호텔 | 마감 24h 전 | HTL-03 |
| HTL_QUOTE_RECEIVED | 이메일 | 제출 호텔 | 견적 제출·수정 | HTL-03(submitted) |
| HTL_SELECTED_CONNECT | 이메일(오거나이저 참조) | 선정 호텔 | 성사 | HTL-03(selected) |
| HTL_NOT_SELECTED | 이메일 | 미선정 제출 호텔 | 성사 | HTL-03(not_selected) |
| HTL_CONFIRM | 이메일(72h) | 대리 입력 대상 호텔 | 대리 입력·재발송 | HTL-05 |
| PTN_APPLIED | 이메일 | 신청 호텔 | 등록 | (없음 — 상태 페이지 없음, E-5) |
| PTN_APPROVED | 이메일(+동의 링크) | 호텔 | 승인 | HTL-04 |
| PTN_COMMISSION_TERMS | 이메일(168h) | 호텔 | 요율 변경 제안·재발송 | HTL-04 |
| PTN_REJECTED / PTN_REINSTATED | 이메일 | 호텔 | 거절 / 재승인 | — |
| ACC_EMAIL_CODE / ACC_SMS_OTP | 이메일 / SMS | 회원 | 가입·변경 인증 | ORG-03 / ORG-07 입력 |
| ACC_EMAIL_EXISTS | 이메일 | 기존 회원 | 중복 가입 시도 | ORG-04 / ORG-05 |
| ACC_WELCOME / ACC_LINKED | 알림톡+이메일 / 이메일 | 회원 | active 전환 / 연결 | ORG-06 |
| ACC_PW_RESET | 이메일(30분·1회) | 회원 | 재설정 요청 | ORG-05 `?k=` |
| ACC_PW_CHANGED / ACC_EMAIL_CHANGED / ACC_PHONE_CHANGED / ACC_LOCKED / ACC_WITHDRAWN | 이메일 | 회원 | 보안 이벤트 | ORG-05(LOCKED) 외 없음 |
| FB_ACK / FB_OPS_ALERT | 이메일 | 접수자 / 운영팀 | 피드백 접수 | — / ADM-09 |
| CONSOLE_NOTICE (PTR_ASSIGNED·UNASSIGNED·TAKEN_OVER·RELEASED·HQ_ACTION·WON·COMMISSION_*·SETTLEMENT_*, HQ_RFP_HELD·PARTNER_DECLINED·PROXY_DISPUTED·HOTEL_UNREVIEWED_DELIVERED·REMITTED·SETTLEMENT_DISPUTE…) | 이메일 한 장 | 파트너 조직 전원 / 본사 ops_email | 위임·대리 입력·정산 이벤트 | ADM/PTR-03, -12 (`CONSOLE_URL`) |
| Supabase invite 메일 | 이메일(72h) | 콘솔 계정 | 계정 초대 | ADM-00b |
| OPS_* 14종 | 운영자 수동 문안 | 오거나이저/호텔/회원 | 콘솔 안내 | — |

---

## B. 역할별 사용자 플로우

### B-1. 오거나이저

**F-ORG-1 요청 → 추적 → 비교 → 선택(OTP) → 성사**
1. HUB-01 → ORG-01. 로그인 여부 분기: 비회원은 "이미 회원이신가요? 로그인" 한 줄, 회원은 ORG-01a(prefill, 이메일·휴대전화 readonly).
2. 폼 검증(클라이언트 = 서버 `validate.ts` 동일 규칙). 실패 → 첫 오류 필드로 스크롤·포커스.
3. 제출: api 모드 `submit_rfp`(idem 키) → ORG-01b(REF·"진행 상황 보기"·비회원이면 "이 이메일로 가입하기" CTA). mailto 모드(백엔드 없음)는 메일 초안 열기 + 복사 폴백. 오류: VALIDATION→필드 표시, RATE_LIMITED(IP 5회/10분·이메일 20회/일)→토스트.
4. ORG_RECEIVED(알림톡→LMS 폴백 + 이메일) → ORG-02 `received`. 위임 건이면 메일 콜아웃 + 화면 `.rp-note`.
5. 운영자 전이에 따라 ORG-02 상태 변화: `verifying`(open도 verifying으로 표시) → `bidding`(ORG_BIDDING) → `collecting` → `delivered`(ORG_DELIVERED). 분기: `rejected`(ORG_REJECTED, 사유 칩, NEWREQ 버튼) / `rebid`(라운드≥2, ORG_REBID) / `cancelled`(ORG_CANCELLED).
6. `delivered`: 비교표(카드/표 토글, 정렬 USD참고·도착순) + "MICEGO에 질문 보내기"(ask_question) + 조건 변경(request_change) + PICK 카드.
7. 선택: "제안 X 선택" → 공개 범위 고지(제7조) → `pick_send_otp` → 마스킹 번호 안내·6자리 입력·3:00 타이머·60s 재발송 → `pick_verify`.
   - 분기: OTP_WRONG(남은 시도 안내) / OTP_LOCKED(5회 → 10분 잠금 패널 + 카운트다운, "다른 제안 보기") / OTP_EXPIRED·OTP_VOID → 재발송 / STATE_CONFLICT(상태 바뀜 → 새로고침 안내) / FORBIDDEN_SHARE(공유 링크에선 버튼 자체 없음).
   - 성공: 자동확정 모드 → `won`(ORG_WON, HTL_SELECTED_CONNECT, HTL_NOT_SELECTED 동시 발송) / 운영자 확인 모드 → "운영자 확인을 기다리는 중입니다"(delivered 유지, pending).
8. `won`: 선정 호텔명 공개, 연결 메일 안내, 비교표에 "선정" 태그·호텔명. 종료 상태 `lost`(사유 칩) 도 가능.
9. JS 꺼짐: PICK 버튼은 mailto 링크(서버가 OTP 강제, noscript 안내).

**F-ORG-2 가입 / 로그인 / 계정 / 내 목록 / 공유**
1. ORG-03 step1(이메일·비밀번호 규칙 체크리스트·이름·소속 유형 5종·회사·동의 4종) → `signup_start` → `email_sent`(10:00, 재발송 60s, 10회/일). 이미 회원이어도 화면은 동일(ACC_EMAIL_EXISTS만 발송).
   - `verify_email` 오류: OTP_WRONG(남은 N회) → 5회 `email_wrong`(무효) / OTP_EXPIRED `email_expired` / OTP_CAP `email_capped`.
2. `phone_entry` → `send_phone_otp` → `phone_sent`(3:00, 60s, 5회/일) → `verify_phone_otp`. 분기 `phone_wrong`/`phone_locked`(10분)/`phone_capped`/`phone_taken`(인증 성공 후에만 노출, 문의 링크).
3. `done`: 연결된 이전 요청 N건 안내 → ORG-06 또는 ORG-01#register. ACC_WELCOME(+ACC_LINKED).
4. ORG-04 로그인: `login` → `?next` 또는 my.html. 분기 `error`(LOGIN_FAILED) / `cooldown`(5회→15분) / `locked`(10회/1h, ACC_LOCKED → ORG-05) / `pending`(가입 미완 → signup 이어가기) / `suspended`(문의).
5. ORG-05: request → sent(항상 동일 응답) → 메일 `?k=` → `verifyRecovery` 성공 form / 실패 expired → done(모든 기기 로그아웃, 잠금 해제).
6. ORG-06: `my_profile`+`my_rfps`. 분기 `list`/`empty`/`linked`(최근 30일 연결)/`link_pending`(휴대전화 일치 후보 → `link_request` → 운영자 승인 대기)/`need_login`. 행 액션 "열기"→ORG-02, "공유 링크"(create_share_link: 요청당 1개, 재생성 시 이전 폐기, revoke, 종료+30일 만료).
7. ORG-07: 프로필 저장(재인증 없음) / 이메일·휴대전화 변경(마지막 로그인 10분 초과 → `reauth` 비밀번호 → 코드 입력 `email_step`/`phone_step`) / 비밀번호 변경(현재+새, 다른 세션 종료) / 마케팅 토글 / 기기 목록·"다른 기기 모두 로그아웃" / 탈퇴 링크.
8. ORG-08: default(안내·보관 고지·사유 칩·비밀번호·확인 체크) → `withdraw` → done. `blocked`: bidding/rebid/collecting/delivered 요청 목록 표시(WITHDRAW_BLOCKED). received/verifying/open은 자동 취소(ORG_CANCELLED 미발송).
9. ORG-02s(공유): `?s=` → 배너 "보기 전용", `.owner-only` 제거, 서버가 선택·변경 거부.

**F-ORG-3 취소** — 화면 버튼 없음. 조건 변경/문의 폼(`request_change`/`ask_question`, api 모드 인라인 textarea, mailto 모드는 메일) 또는 contact로 요청 → 운영자가 콘솔 "취소"(사유 '오거나이저 요청') → ORG_CANCELLED → ORG-02 `cancelled`.

### B-2. 호텔

**F-HTL-1 등록 → 승인 → 커미션 동의 → 초대 → 비딩 → 결과**
1. HUB-01 → HTL-01#register(hotelName·location·groupCapacity·banquetSpace·contactName·contactEmail·consent) → `register_partner` → 성공 패널(review_by 5영업일 안내) → PTN_APPLIED. **이후 신청 상태 확인 화면 없음**.
2. 콘솔 승인(요율 입력 필수) → PTN_APPROVED(동의 링크) → HTL-04 `loading`→`review`(Property·Commission n%·Net booking value·Applies to·Invoice·Link valid until) → 체크박스 "authorised to accept" → "Accept commission terms"(POST accept) → `done`. 분기: `invalid`/`expired`(168h)/`used`. 거절 버튼 없음(문의 메일만). 재발송(PTN_COMMISSION_TERMS, 최대 5회)·요율 변경 제안도 같은 화면.
3. 동의 전엔 초대 불가(콘솔에서 체크박스 비활성). 동의 후 운영자 초대 → HTL_INVITE(마감·합의 요율 한 줄·UNSUBSCRIBE_URL) → HTL-03 `open`(첫 열람 시 invited→viewed).
4. 견적 폼(currency 지원 통화·twin/king·breakfast(+supplement)·tax(+note)·availability(+notes)·ballroom fee/name/fnb/includes·validUntil(≥마감+2영업일)·cancellation·additionalProposals·hotelName·contactName·contactEmail·phone·consent) → `submit_quote` → `submitted`(HTL_QUOTE_RECEIVED). "Revise your quote" → 폼 재오픈(서버 값 prefill) → 재제출(revision+1). 분기: DEADLINE_PASSED 토스트, VALIDATION 필드 표시.
5. 거절: 페이지 하단 "Can't quote?" → reason(Dates unavailable/Capacity doesn't fit/Other)+note → `decline_bid` → `declined`.
6. 마감 경과·미응답 → `expired`(3회 연속 시 중지 안내). 24h 전 HTL_REMINDER.
7. 결과: `selected`(Organizer contact 카드: Company·Contact·Email·Phone — 이 시점에만 노출) / `not_selected`(정보 없음). 둘 다 "Your submitted quote" 요약, 폼 없음. 요청 취소 → `cancelled`. 토큰 오류 → `invalid`.

**F-HTL-2 대리 입력 확인(proxy)** — HTL_CONFIRM → HTL-05 `review`(파트너가 입력한 견적 요약·입력 주체·72h) → "Confirm this quote"(→`done`, 초대 submitted) 또는 "Something is wrong" → 사유(3자+) → `disputed`(proxy_disputed, PTR_HOTEL_DISPUTED·HQ_PROXY_DISPUTED). 분기 `expired`(72h)/`used`/`invalid`. 호텔이 HTL-03으로 직접 제출하면 대리 견적 대체.

**F-HTL-3 수신 거부** — 메일 푸터 → HTL-06 `check` → `confirm`(Unsubscribe / Keep receiving→index) → `done` / `already` / `invalid`. 제출한 견적의 결과 메일은 계속 발송.

### B-3. 본사 운영자

**F-HQ-1 RFP 운영(상태 머신)**: ADM-01 할 일 카드 → ADM-02(필터) → ADM-03.
- `received` → [검증중(으)로](SLA 기산) → `verifying`: 익명화 카드(원문 메모 vs 공개 메모, 금지어 하이라이트) → "익명화 검토 완료 표시"(가드) → [오픈(으)로] / [반려됨(으)로](사유 4종, 기타는 메모) / [취소].
- `open`: 마감·초대 카드(datetime, 기본 3영업일·200명↑ 5영업일; 초대 후 변경 시 확인창) → 승인 파트너 체크(수용 부족·볼룸 없음·요율 합의 필요 배지, 미합의는 disabled) → "초대 보내기"(admin_invite; COMMISSION_NOT_AGREED) → [비딩중(으)로](가드: 마감+초대≥1, 2곳 미만 확인창) → ORG_BIDDING·HTL_INVITE.
- `bidding`: 초대 현황(라운드) 표 — 상태 칩, 팔로업 필요 배지(마감 24h·제출 0), 재초대 버튼(마감 다름), 대리 입력 셀, 부정확 플래그. 시스템 cron → `collecting`(수동 가능).
- `collecting`: 비교표(A/B/C 도착순, 통화 2종↑이면 USD 참고·기준일 입력 필수, op 메모) → [전달됨(으)로] / [조건 변경 → 새 라운드](변경 내용 입력, 라운드+1, 마감 초기화) / [미성사(으)로](제출 0·라운드≥2만).
- `delivered`: 초대 표에 선정/미선정 토글(admin_mark_selection) → [성사(으)로](확인창: 자동 발송 3종 안내) / [미성사] / [새 라운드]. 소유·공유·선택 인증 카드에 OTP 완료 시각 또는 "인증 기록 없음"(운영자 대리 확정 — 동의 기록 기능 K-13 미수록).
- 종료 상태: 버튼 없음. 이력 메모만 추가 가능.

**F-HQ-2 호텔 파트너 심사**: ADM-04(심사 지연 배지) → ADM-05: 체크리스트(실재 URL·도메인/소속 메모·수용 규모·해외·50명↑·연락처) → [승인] → 커미션 요율 다이얼로그(기본 범위 5~20, 범위 밖은 사유 필수·hq_override) → PTN_APPROVED. [거절](사유 5종) / [심사중] / [중지](사유 3종, 메일 수동) / [재승인](답신 메모; 합의 요율 없으면 요율 다이얼로그). 커미션 카드: 요율 변경 제안·동의 링크 다시 보내기(≤5회)·이력 표. 파트너 승인 호텔은 "본사 사후 검토 대기" → [사후 검토 완료].

**F-HQ-3 정산**: 성사 시 자동 생성(ST-) → ADM-11(처리 필요 뷰) → ADM-12: 커미션 입력(본사 단독 건) → 승인/반려(제출자≠승인자, hotel_unreviewed 가드) → 수금 기록 → 송금 기록 → 입금 확인·완료 / 분쟁 제기·해소 / 무효. 증빙은 링크 추가만.

**F-HQ-4 지역 파트너 조직**: ADM-13 등록 → 정보 수정·지역 설정(주/백업·우선순위) → 계정 초대(partner_invite → Supabase 메일 → ADM-00b) → 활성화. RFP 위임: ADM-03 위임 카드 [파트너 배정/재배정]·[본사 보유로]·[본사 인계](사유·몫 %)·[파트너에게 되돌리기]·[지역 변경].

**F-HQ-5 회원**: ADM-06 → ADM-07: 연결 요청 승인/거절(ACC_LINKED), 조치(잠금 해제·정지/해제·인증 메일 재발송·세션 종료·요청 이관(이메일 지정)·탈퇴 처리(본인 확인 체크, 진행 요청 있으면 차단)). 모두 사유 필수.

**F-HQ-6 피드백**: ADM-08 → ADM-09: new→triaged(우선순위+하위코드) → in_progress(담당) → on_hold(메모) → done(결과 6종) → 재오픈. 답변은 메일함.

**F-HQ-7 설정**: 공휴일 추가/삭제, 알림 템플릿 재발송, 시스템 상태 확인. 운영자 계정 탭은 읽기 전용 안내.

### B-4. 지역 파트너
1. 초대 메일 → PTR-00 비밀번호+동의 → PTR-01.
2. PTR-02/03: 자동 배정된 위임 건 처리(received~delivered 전이, 요청 수정, 초대·재초대, 선정 표시 모두 가능. 파트너 담당자는 반려·취소 불가). 오거나이저 정보는 [오거나이저 정보 보기](rfp_get_identity, 10분 1회 기록) → 마스킹 해제, [번호 전체 보기] 매번 기록.
3. 배정 반려: received/verifying에서 관리자만 → hq_held(partner_declined).
4. 대리 입력: 초대 행 [대리 입력] → 다이얼로그(통화·트윈·킹·조식·세금·볼룸명·대관료·유효기한·취소 규정·증빙 메모 5자+) → HTL_CONFIRM → "호텔 확인 대기 · 재발송(≤3회) · 수정". 이의 시 경고 셀.
5. 호텔 발굴: PTR-04 [호텔 등록] → PTR-05 심사중·승인(요율 5~20%). 위험 표시 호텔은 본사만.
6. 정산: PTR-06/07 커미션 입력(합의 요율 잠김, 다르게 입력 체크 시 메모 필수) → 본사 승인 대기 → 수금 기록 → 송금 기록 → 완료 대기. 분쟁 제기 가능.
7. 본사 인계 후: PTR-03 읽기 전용(버튼 서버 거부 RFP_TAKEN_OVER), 추적 화면의 파트너 고지는 사라짐. **파트너가 본사 인계를 요청하는 UI 없음**.
8. PTR-08 내 조직: 계정 초대·비활성·역할 변경(관리자), 규칙 요약.

---

## C. 화면별 동작 노트

### HUB-01 `index.html`
- 정적. 두 mode-card(ko 여행사·랜드사·기업 / en Hotels & resorts). 푸터에 ko/en contact·privacy. JS 불필요.

### HUB-404 `404.html`
- 한/영 병기, `/`·`/ko/`·`/en/` 링크. 토큰 페이지 오류는 각 페이지 invalid로 처리됨을 안내. (카피 오타: "바낀거나", "누라 주세요" — E-14)

### ORG-01 `ko/index.html`
- 섹션: hero → problem → how → who → difference → policy(6종) → register → faq.
- 폼 필드(`#f-*`): orgType(칩 5종: 여행사·랜드사·기업(행사 주최)·협회·기관·기타), company, name, email, phone(RE_PHONE_KR, 힌트 "진행 알림과 제안 선택 확인(인증번호)에 사용"), eventType, startDate(오늘 이상), endDate(≥start), headcount(5밴드), region, twinRooms/kingRooms(≥0), ballroomUse(사용/미사용) → ballroomPurpose(디너/Full Day/Half Day/기타), note, consent(약관·방침 링크).
- 검증: 클라이언트 즉시 + 서버 동일. 오류 메시지 필드 아래 `.field-msg`.
- 제출 버튼: api 모드 `submit_rfp` → 성공 패널(`#rfpDone` REF + "진행 상황 보기" 버튼 + 비회원 가입 CTA `signup.html?email=`). mailto 모드: 메일 초안 + "제출 내용 복사".
- 회원 변형(ORG-01a): `accMemberChip` "OO님으로 요청합니다 · 회사" + 로그아웃, company/name 프리필(수정 가능), email/phone readonly + "계정 설정에서 변경". 개인정보 동의는 요청별로 여전히 필수.
- 로딩: 버튼 비활성(추정 — 별도 스피너 없음). 오류: `MG.show` → 필드/토스트.

### ORG-02 `ko/track.html`
- data-state: `received, verifying, rejected, bidding, rebid, collecting, delivered, won, lost, cancelled, invalid, loading`. api 모드 기본 `loading` → `get_track`.
- 공통 구성: 데모 띠(demo 빌드만) → req-bar(REF + 상태 배지: 접수됨/요건 확인 중/진행 불가/호텔 제안 받는 중/새 조건으로 재요청/제안 정리 중/비교표 도착/연결 완료/종료/취소됨) → (위임 시 `.rp-note`) → h1 → META(행사 일정·목적지·인원·객실·연회·접수·제안 마감·비교표 전달; rebid엔 "새 제안 마감") → 진행 단계 6칸(접수→요건 확인→호텔 요청→제안 정리→비교표 전달→종료) → 상태 패널 → [delivered/won] 비교표 섹션 → [delivered] 질문 패널 + PICK → [bidding~won] 공유 패널 → 링크 안내.
- 상태 패널 카피: received "요청을 받았습니다"(3영업일 안내, 변경은 메일) / verifying "요건을 확인하고 있습니다" / rejected "이번 요청은 진행하지 않습니다"(사유 칩, 새로 요청·문의) / bidding "호텔에 요청을 보냈습니다"(마감·비교표 예정) / rebid "바뀐 조건으로 다시 요청했습니다" / collecting "받은 제안을 정리하고 있습니다" / delivered "비교표가 도착했습니다" / won "선정 호텔과 연결해 드렸습니다"(호텔명·연결 메일·수수료 없음) / lost "성사 없이 종료"(사유 칩) / cancelled "요청이 취소됐습니다" / invalid "링크를 열 수 없습니다"(문의·이메일).
- 비교표: 툴바(정렬 USD참고 낮은 순↔도착 순 / 카드↔표), FX 노트(기준일·환율), 표(호텔 개요·객실·연회·조건 그룹, 추정 합계, MICEGO 검토 메모), 카드 뷰(모바일 기본), 각주. won에서 선정 제안 하이라이트·호텔명.
- PICK 카드(owner-only): 제안 목록(유효기한) → 선택 확인 단계(공개 범위 anon-note, 마스킹 번호, 6자리 `code-input`, 3:00 타이머, "1:00 후 재발송", 인증하고 선택하기/다른 제안 보기) → 잠금 패널(10:00 카운트다운) → 완료 패널("선택이 접수되었습니다" 또는 "운영자 확인을 기다리는 중입니다"). 아래 "선택하시면 이렇게 진행됩니다" 3단계 + 변경 안내.
- 질문·변경: api 모드는 링크 클릭 시 인라인 textarea(보내기/취소) → `ask_question`/`request_change`(10회/일/RFP 합산) → "보냈습니다". mailto 모드는 메일 초안.
- 공유 패널: 회원 본인만 `share_ui`(링크 만들기/복사/새 링크/끄기, 1개 유지, 종료+30일 만료). 비회원은 `#shareSignup` 가입/로그인 안내(D-46). 회원이면 "← 내 견적 요청" 링크 표시.
- 공유 보기(ORG-02s): `html[data-view=share]`, 상단 배너, `.owner-only` 전부 제거.
- 숨김 규칙: 커미션 요율·호텔명(선정 전)·호텔 연락처 전부 없음(verify2 검사).
- **api 모드 미하이드레이션**: META·진행 날짜·비교표 내용·PICK 제안 목록·won 호텔명은 예시값(E-1).

### ORG-03 `ko/signup.html`
- 상태 12종: `form, email_sent, email_wrong, email_expired, email_capped, phone_entry, phone_sent, phone_wrong, phone_locked, phone_capped, phone_taken, done`. 스테퍼 3단계 상단(현재 단계 amber, 완료 teal).
- Step1 검증: 비밀번호(10자+2종 / 12자+ 종류 무관 / 이메일 로컬파트 포함 금지, 실시간 체크리스트, 보기 토글), 이름 2자+, 회사 1자+, 소속 유형 칩, 동의(전체 동의, 필수 3·선택 1(채널 칩), 사전 체크 없음). `?email=` 프리필.
- Step2: "…로 인증번호 6자리를 보냈습니다", 10:00, 재발송 60s(0:42 후 재발송), "이메일 주소 수정", 스팸함 안내. 5회 오답 → 무효.
- Step3: 휴대전화 입력 → 인증번호 받기 → 3:00, 60s, 5회/일, 5회 오답 → 10분 잠금. 노트 "진행 알림과 제안 선택 확인에 쓰는 번호".
- Done: "가입을 마쳤습니다" + 연결 요청 N건 + [내 견적 요청 보기][새 견적 요청하기]. 자동 로그인(`MG.auth.signIn`).
- 열거 방지: 기존 이메일도 step2로 진행. phone_taken은 OTP 성공 뒤에만.

### ORG-04 `ko/login.html`
- 상태: `default, error, cooldown, locked, pending, suspended`. 필드 이메일·비밀번호(토글)·로그인 상태 유지(localStorage vs sessionStorage). 링크: 비밀번호 찾기·회원가입·"비회원으로 요청하기". `?next=` 동일 사이트 상대 경로만.

### ORG-05 `ko/reset.html`
- 상태 `request, sent, form, done, expired, loading`. sent 문구는 계정 유무 무관 동일. `?k=` → recovery 세션 검증 → form(규칙 체크리스트) → `password_reset_complete` → done(모든 기기 로그아웃).

### ORG-06 `ko/my.html`
- 상태 `list, empty, linked, link_pending, need_login, loading`. 인사(이름·회사), CTA 새 견적 요청, 세그먼트 진행 중/종료/전체, 행(REF·행사명·목적지·일정·상태 배지·다음 일정·needs_action 강조·"비회원 접수" 태그) + 액션 열기/공유 링크(인라인 패널: 설명·만들기·URL·복사·새 링크·끄기). 로그아웃 버튼. empty에 "같은 이메일로 가입하면 자동 연결" 안내. link_pending → [연결 요청] → "운영팀 확인 후 연결(영업일 1일)".

### ORG-07 `ko/account.html`
- 상태 `default, reauth, email_step, phone_step, saved, pw_done, loading`. 섹션: 담당자 정보(저장 즉시, 고지 "이미 보낸 요청서에는 반영 안 됨") / 이메일 변경 / 휴대전화 변경 / 비밀번호 변경 / 알림 수신(진행 알림 끌 수 없음, 마케팅 이메일·문자 토글+동의 일시) / 로그인 기기(현재 표시, 다른 기기 모두 로그아웃) / 회원 탈퇴 링크. 민감 변경은 10분 경과 시 비밀번호 재입력(REAUTH_REQUIRED).

### ORG-08 `ko/withdraw.html`
- 상태 `default, blocked, confirm, done, loading`. 안내(즉시 파기·링크 중지·재가입 시 미연결), 보관 고지(3년, TODO legal), 사유 칩(선택), 비밀번호, 확인 체크, 빨간 버튼. blocked는 차단 요청 목록+링크.

### ORG-09 / HTL-07 contact
- 폼(lang·topic·name·email·org·ref?·message·consent) → `contact` → "문의를 보냈습니다"(피드백 위젯과 통합, 접수번호). RATE_LIMITED 토스트.

### HTL-01 `en/index.html`
- 섹션 hero·why·how(3 steps)·sample·terms(요약 카드, 커미션 D-37 반영)·register·faq. 폼 `hotelName, hotelLocation, groupCapacity(밴드), banquetSpace, contactName, contactEmail, consent`(+phone 선택, 추정). 제출 → `register_partner` → 성공 패널("5 business days" review_by) / mailto 폴백. 가격 카피: "No listing fee"(호텔 커미션은 terms 섹션에).

### HTL-03 `en/bid.html`
- data-state 9종: `open, submitted, selected, not_selected, declined, expired, cancelled, invalid, loading`. api 모드 `get_bid`(state derivation: cancelled > reinvited/expired→expired > declined > won&selected > won&submitted→not_selected > submitted > open).
- 공통 req-bar: REF + 배지(Deadline … KST / Open for quotes / Quote received / Declined / Selected / Not selected / Expired / Cancelled).
- open/submitted: h1 "MICE quote request — {destination}", lead, meta(Issued·Quote deadline·Reminder email·Comparison sent by), anon-note("회사명·예산 비공개"), link-note(개인 링크·열람 기록·전달 금지), **1 Requirements**(요건서), **2 Submit your quote** 폼(통화 select+통화별 placeholder·환산 노트, 조건부 필드 toggle: breakfast Not included→supplement, tax Not included→note, availability Partially→notes; validUntil min = 마감+2영업일; 동의 문구에 partner terms·privacy 링크; `#cmNote` "Your agreed commission: n% of net booking value."), next-steps 3단계, Decline 카드.
- submitted: "Your quote is in"(제출 시각, 수정 가능 기한) + [Revise your quote] + "Your submitted quote" 요약. **`can_revise`를 쓰지 않아 마감 뒤에도 버튼 노출 → 제출 시 DEADLINE_PASSED 토스트**(E-7).
- selected: "Your proposal was selected" + Organizer contact(Company/Contact/Email/Phone — `data-mg`로 서버 값 주입, 유일하게 하이드레이션됨) + 견적 요약.
- not_selected: "Not selected this time… details were not shared". declined/expired/cancelled: muted 패널 + [Contact MICEGO][Hotel FAQ]. invalid: [Contact][Email us].
- 폼 검증: twin/king ≥0, breakfast·tax·availability 라디오 필수, taxNote 3자+, ballroomFee·ballroomName, validUntil, cancellation 5자+, hotelName, contactName, contactEmail, consent. 오류 → 첫 필드 스크롤.
- 거절 폼: reason select(3) 필수, note 선택 → `decline_bid`.
- 숨김: 오거나이저 회사·예산·연락처(selected 전), 다른 호텔 견적, 비교표.
- **api 모드 미하이드레이션**: 요건서·마감·meta·제출 견적 요약은 예시값(E-1).

### HTL-04 `en/commission.html`
- 상태 `loading, review, done, expired, used, invalid` (+noscript 패널 "JavaScript is needed"). review: Partner terms 버전·h1 "Accept the commission terms for {hotel}"·kv(Property / Commission n% of net booking value / Net booking value 정의 / Applies to / Invoice 30일 / Link valid until)·Article 5 링크·confidential 고지·체크박스 → 버튼 활성 → `partner_commission_accept(accept)`. GET은 lookup만(토큰 미소비). 오류 TOKEN_EXPIRED/TOKEN_USED → 해당 상태, 그 외 토스트. 거절 버튼 없음.

### HTL-05 `en/confirm.html`
- 상태 `loading, review, done, disputed, expired, used, invalid`. review: 입력된 견적 요약(data-mg)·입력 주체·72h → [Confirm this quote] / [Something is wrong] → 사유 textarea(3자+) → dispute. 버튼에서만 토큰 소비.

### HTL-06 `en/unsubscribe.html`
- 상태 `loading, confirm, done, already, invalid`. "Stop invitation emails for {property}?" + 결과 메일은 계속 발송 고지 → [Unsubscribe][Keep receiving→index].

### ADM-00 `admin/index.html`
- 이메일·비밀번호, 빈값 검증, `?e=` 오류 문구(role/config/snapshot). api 모드: Supabase signIn → role 확인(operator/partner_*) 실패 시 signOut + `?e=role`. mock: 값만 있으면 통과. 비밀번호 찾기 링크 없음(E-12).

### ADM-00b/PTR-00 `admin/accept.html`
- Supabase invite 해시 → 세션 → "{email} 계정의 비밀번호를 정합니다" → 비밀번호(10자+, 영문+숫자)·확인·동의 체크 → `updateUser` + `console_accept` → dashboard. 해시 error → "초대 링크가 유효하지 않습니다"(만료 72h·사용됨).

### ADM-01 `admin/dashboard.html`
- 운영자: 개입 필요 위젯(종류: 미배정 방치·파트너 미착수·SLA 초과·조직 정지·…; 심각도 배지; [처리 완료]) → 오늘 할 일 7카드(건수·행동 문구·필터 링크) → 진행 중 상태 분포 → 회원 계정 카드(연결 요청 대기·잠긴 계정) → 최근 이력 → 지난달 지표(예시). 사이드 nav 배지: 대시보드(개입)·호텔 파트너(심사 지연)·회원(연결 대기)·피드백(new)·정산(처리 필요).
- mock 모드 상단 리본 "DEMO · 예시 데이터 · 초기화". 데모 시계 2026-10-08 19:30.

### ADM-02 `admin/rfps.html`
- 뷰: 칸반(≥1024 기본, 파이프라인 6열 + 종료) / 목록. 필터: 상태 select, SLA·초대 기한, 위임(본사만), 지역(본사만), 검색, 빠른 필터 칩(`?filter=`) + 해제 ×. 행 배지: 상태·SLA 레벨(red/amber)·라운드·위임 칩(본사 보유+사유/파트너 위임/본사 인계).

### ADM-03 `admin/rfp.html`
- 헤더: crumb, REF(mono), 상태 칩, 라운드 배지, SLA/초대 기한 배지(ok/amber/red), [추적 링크 복사](본사만), [목록으로].
- 좌측 aside "상태 전이": 현재 상태 힌트(HINTS) + 허용 전이 버튼(ALLOWED; 전진 fwd / 반려·취소 danger) + 가드 안내문(A.guard). bidding엔 자동 전환 안내. 종료 상태엔 "바꿀 수 있는 항목이 없습니다".
- 카드 순서: 지역 파트너·위임(지역·위임·보류 사유·신원 열람 수·최근 배정 이력 3건·버튼) → 요청 내용 → 오거나이저 정보(배지 "호텔에 보이지 않음"; 본사: 회사·담당자·이메일·전화·예산·원문 메모) → 소유·공유·선택 인증(본사만; 소유자 회원 링크/비회원, 공유 링크 상태·열람 수·만료, 선택 인증 완료 시각·마스킹 번호 / "인증 기록 없음"(운영자 대리 확정)) → 익명화 검토(verifying/open만; 원문 메모 하이라이트 vs 공개 메모 textarea·미리보기·플래그 요약, [공개 메모 저장][익명화 검토 완료 표시/취소]) → 마감·초대(open/bidding; datetime-local·[마감 저장], 승인 파트너 체크리스트(수용 부족·볼룸 없음·요율 배지, 미합의 disabled), 경고 "총 n곳(권장 3–5)", [초대 보내기]) → 초대 현황·라운드 n(표: 호텔·상태 칩·마감·열람/제출 시각·액션: 팔로업 메일 링크·재초대·선정/미선정 토글(delivered)·대리 입력 셀·부정확 플래그; won엔 연결 메일 콜아웃) → 비교표(제출 0 콜아웃(라운드≥2면 미성사 안내), 다중 통화 노트+USD 참고/기준일 입력(500ms 디바운스 저장), 표 A/B/C, op 메모) → 이전 라운드 견적 → 이력(시각·주체·상태·메모 + 메모 추가).
- 다이얼로그: 반려/미성사/취소 사유(라디오+기타 메모; 비딩중 취소엔 OPS_HTL_CANCELLED 안내), 새 라운드 변경 내용, 성사 확인(자동 발송 3종 설명), 2곳 미만 확인, 마감 변경 확인, 배정/지역/인계/보류/반려(파트너), 대리 입력.
- RPC: admin_transition, admin_rfp_update(deadline·publicMemo·anonReviewed), admin_invite, admin_reinvite, admin_mark_selection, admin_quote_update, admin_invitation_flag, admin_add_note, rfp_assign/hold/set_region/takeover/release/decline_assignment, rfp_get_identity, partner_quote_proxy_enter/resend. 오류: CM_ERR 매핑(COMMISSION_*), 그 외 "처리하지 못했습니다" 토스트.
- 파트너 차이(PTR-03): 위 A-4 참조. 인계 건·종료 건은 전이 버튼 없음(인계는 서버 거부·버튼 상태는 코드상 동일 — 추정: 전이 버튼이 그대로 보이고 서버가 RFP_TAKEN_OVER로 거부).

### ADM-04/05 호텔 파트너
- 목록: 상태 칩(신청·심사중·승인·거절·중지), 심사 기한(남은 n영업일/오늘 마감/지연), 필터 delayed·flag(중지 검토), 커미션 배지, 파트너 등록 배지, 사후 검토 대기, 위험 표시.
- 상세: 신청 내용 / 심사 체크리스트(실재 URL+체크, 도메인 일치 or 소속 메모, 수용 일치, 해외, 50명↑, 연락처) / 상태 바꾸기(PALLOWED: pending→reviewing·approved·rejected, reviewing→approved·rejected, approved→suspended, suspended→approved(재승인)) / 커미션 요율 카드(합의 요율·기준·동의 시각·약관, 대기 중 요율·링크 발송/만료/횟수, [요율 변경 제안][동의 링크 다시 보내기], 이력 표) / 지역·등록 경로(사후 검토·위험 표시, [지역 변경][사후 검토 완료]) / 응답 통계 / 초대 이력 / 이력.
- 승인 다이얼로그: 요율 number(0.5~50 step .5), 산정 기준 고정, 범위 힌트, 운영자만 범위 밖 사유 textarea.

### ADM-06/07 회원
- 목록 검색·상태 칩(이메일 인증 대기·휴대전화 인증 대기·정상·잠김·이용 정지·탈퇴)·요청 수·마지막 로그인. 상세: 회원 정보·인증 시각·요청 목록→rfp·공유 링크·연결 요청(승인/거절, 사유)·계정 조치(잠금 해제·정지/해제·인증 메일 재발송(pending_email)·모든 세션 종료·요청 이관(to_email, active 회원만)·탈퇴 처리(본인 요청 확인 체크, MBLOCK 상태 있으면 차단))·감사 로그. pending_*은 72h 파기 예정 안내.

### ADM-08/09 피드백
- 목록: 상태 칩(new/triaged/in_progress/on_hold/done + 건수), 우선순위·유형(SYS/OPS/ETC) 필터, 경고(분류 지연·착수 지연), [주간 정리] 프리셋, 검색. 상세: REF 복사, 본문(회신 이메일·동의), 분류(CAT 버튼·P1~P4·하위 코드), 담당([나에게 배정]), 상태 바꾸기(가드 미충족 버튼 disabled + 안내), 메모(추가만), 컨텍스트(페이지·상태·REF→rfp 링크·브라우저·오류), 기록(이벤트), 메일 상태·[알림 다시 보내기]. done 시 결과 6종 선택.

### ADM-10 설정
- 탭 6: 영업일·공휴일(표 + 추가 폼 + 삭제) / 기본 규칙(읽기: SLA·마감·초대 수·중지 기준·회원 인증 규칙) / 알림(템플릿 표·OPS 수동 문안·발송 로그 재발송) / 운영자 계정(읽기 표 + "Supabase에서 추가" 안내 — D-30 초대 UI 미구현, E-11) / 시스템 상태(app_config·시크릿 5개·cron) / 전제 조건 체크리스트.

### ADM-11/12 정산
- 목록: 상태·지역 파트너(본사만)·검색, "처리 필요" 뷰(역할별 다름). 상세: 건 정보(REF·RFP·호텔·파트너·배분율·기한·플래그 배지 hotel_unreviewed/no_agreed_rate/rate_deviation/contract_below_quote/collection_variance/remit_variance) / 금액(호텔 통화: 계약·커미션·파트너 몫·MICEGO 몫·수금·송금·입금) / 처리 버튼(settlementActions 역할·상태별) / 증빙(링크 추가, 종류) / 이력(events).
- 다이얼로그: 커미션 입력(합의 요율 잠김 + "다르게 입력" 체크 → 메모 필수), 수금(일·금액·메모), 송금(통화·환율·일·금액·참조·출처), 입금 확인(금액·메모), 분쟁 해소(복귀 상태·조정 금액·내용), 반려/분쟁/무효 사유.

### ADM-13 / PTR-08 조직
- 목록(조직명·코드·상태 onboarding/active/suspended/terminated·지역·계정 수·진행 건) → 상세: 조직 정보(표시명·법인명·국가·연락처·계약/DPA 서명일·배분율·accepting_new·max_active·maxAccounts·담당 지역 배지 주/백업/비활성) + 버튼(정보 수정·지역 설정·활성화·정지·종료) / 계정 카드(이름·이메일·역할·상태 invited/active/disabled·활동; 비활성·복구·관리자로·담당자로; [계정 초대] 상한 체크) / 최근 요청 10건. my-org는 운영자 버튼 없이 계정 관리 + 운영 규칙 요약.

### CMN-01 피드백 위젯
- 런처 버튼 → 패널(유형·내용 20~2000자·회신 이메일+동의·허니팟) → submitting → done(접수번호 FB-) / error. 하루 5건/10분, 30건/일. demo 빌드는 is_demo. Supabase 없으면 contact 링크 버튼으로 대체.

---

## D. 공통 규칙

1. **신원 마스킹**: 호텔(en/)에는 선정 전 회사명·담당자·연락처·예산 절대 노출 없음(`get_bid.organizer`는 state==selected만). 지역 파트너 콘솔은 회사명 첫 글자(한**)+빈 연락처, `rfp_get_identity`로만 열람·기록. 오거나이저(ko/)에는 선정 전 호텔명 없음(A/B/C), 커미션 요율은 어디에도 없음(verify2). 공유 링크엔 선택·변경 UI 없음 + 서버 FORBIDDEN_SHARE.
2. **JS-off**: `js-anim` 부모 클래스 + 세이프티넷으로 콘텐츠 표시. track/bid는 기본 상태(delivered/open) 패널이 CSS로 보임, PICK 버튼은 mailto 폴백. commission/confirm은 noscript 패널로 JS 필요 안내. 콘솔은 JS 필수.
3. **모드**: `site.config.json.supabase.url` 유무로 `MG.mode = api | mailto`(공개) / `MGA.mode = api | mock`(콘솔). demo 빌드는 `?state=` 미리보기(DEMO 띠·상태 스위처), prod 빌드는 `<!--demo:start/end-->` 제거·`?state=` 무시. 콘솔 mock은 sessionStorage에 상태 저장, `?as=partner|operator`로 역할 전환, 데모 시계 고정.
4. **모바일**: 360/768/1280 검증. 비교표는 ≤768 카드 뷰 기본, 표는 가로 스크롤 영역. 콘솔은 사이드바 → 상단 `details` 메뉴, 칸반은 ≥1024만, 표는 `.tbl-wrap` 스크롤·파트너 목록 카드화. 폼 입력 44px 터치 타깃, OTP `inputmode=numeric autocomplete=one-time-code`.
5. **알림 타이밍**: 자동 알림은 1분 cron 디스패치, 상태 전이 10분 cron(마감 처리·proxy_expire·개입 스윕). 알림톡 실패 → LMS 폴백, 이메일 병행. OTP는 SMS만.
6. **SLA·타이머**: 검증중 전이가 SLA 기산, 3영업일 18:00 KST(공휴일 제외), 임박=다음 영업일 18:00 이내 또는 24h. 오픈 이후 같은 기한을 "초대 기한"으로 표시. 호텔 마감 기본 3영업일(200명↑ 5), 리마인더 24h 전. 파트너 심사 5영업일. 커미션 동의 링크 168h, 확인 링크 72h, 재설정 30분, 이메일 OTP 10분, SMS OTP 3분, 재발송 60s, 잠금 10분, 로그인 쿨다운 15분, 공유 링크 종료+30일, 수금 기한 행사 종료+30일, 송금 기한 수금+14일, 미완료 가입 72h 파기.
7. **사용자에게 보이는 한도**: 접수 IP 5회/10분·이메일 20회/일, 변경·질문 10회/일/RFP, 이메일 코드 10회/일, SMS 5회/일, OTP 오답 5회, 로그인 5회→15분·10회/1h→잠금, 커미션 링크 재발송 5회, 확인 링크 재발송 3회, 피드백 5건/10분·30건/일, FB_ACK 3건/일, get_track 60회/분(초과 시 RATE_LIMITED 토스트).
8. **오류 표현**: `_shared/errors.ts` 카탈로그(ko/en) 미러 → 필드 오류는 `.field-msg`, 그 외 토스트. SQL 가드 오류가 Edge 경로에서 INTERNAL로 뭉개지는 결함(K-2).

---

## E. 개선 노트

| # | 화면 | 심각도 | 내용 |
|---|---|---|---|
| E-1 | ORG-02, HTL-03 | **high** | api 모드에서 요청 내용·마감·진행 날짜·비교표 제안·제출 견적 요약이 예시 데이터로 남음(상태·REF만 서버값). 서버 뷰모델(`event`, `dates`, `proposals[]`, `request`, `quote`)을 `data-mg`로 바인딩하는 작업이 필요. Figma에선 데이터 바인딩 레이어를 명시 |
| E-2 | ORG-02 | high | **오거나이저 취소 버튼 없음**. 변경 요청 폼이나 문의로 우회 → 운영자 수동 취소. received~verifying 한정 자가 취소(OTP 또는 확인) 제안 |
| E-3 | ORG-02, ADM-03 | high | 운영자 대리 확정(이메일 선택 확인 후 성사) 시 동의 기록(consent_method·근거) UI·DB 미수록(K-13). 콘솔엔 "인증 기록 없음"만 표시 |
| E-4 | ORG-01, HTL-01, contact, CMN-01 | high | Turnstile 스팸 방어 미수록(IP·허니팟·레이트리밋만). 폼 하단 위젯 자리 예약 필요 |
| E-5 | HTL-01 → (없음) | med | 호텔 신청 상태 확인 화면 없음. PTN_APPLIED 뒤 결과 메일까지 깜깜. 토큰 링크 상태 페이지(`en/application.html?t=`) 제안 |
| E-6 | PTR-03 | med | 파트너가 본사 인계·도움을 요청하는 버튼 없음(배정 반려는 received/verifying 관리자만). 진행 중 어느 단계든 "본사 개입 요청" 액션 제안 |
| E-7 | HTL-03 | med | submitted 상태에서 `can_revise`(마감 전 여부)를 무시해 마감 뒤에도 "Revise your quote" 노출 → 제출 시 DEADLINE_PASSED. 종료 요청의 미제출 호텔이 open으로 보이는 K-5와 함께 상태 판정 보강 |
| E-8 | ADM-12 | med | 정산 증빙이 링크 입력만(파일 업로드 없음, O-2). 외부 드라이브 의존·권한 관리 부담 |
| E-9 | ORG-02 | med | `open` 상태가 추적 화면에 `verifying`으로 보여 "요건 확인 중"이 길게 유지됨. 오픈 시 "호텔 선정 중" 등 중간 단계 카피 제안 |
| E-10 | HTL-03 | med | 마감이 KST만 표기(O-3). 호텔 현지 시각 병기 필요 |
| E-11 | ADM-10 | med | 운영자 계정 초대 UI 없음(D-30 미완). 설정 탭은 "Supabase에서 추가" 안내만. 조직 계정 초대(ADM-13)와 패턴 통일 제안 |
| E-12 | ADM-00 | med | 콘솔 로그인에 비밀번호 재설정 링크 없음(Supabase recovery 미노출). 잠금 시 복구 경로 없음 |
| E-13 | ORG-02 | low | 변경 요청·질문이 api 모드에서 인라인 textarea(인라인 스타일)로만 처리되고 보낸 이력이 화면에 남지 않음. 메시지 스레드 표시 제안 |
| E-14 | HUB-404 | low | 한글 오타("바낀거나"→"바뀌었거나", "누라 주세요"→"눌러 주세요") |
| E-15 | ORG-01b | low | 제출 성공 패널에서 "진행 상황 보기" 링크가 `#rfpDone` 안에 작게 들어감 → 주 CTA로 승격 |
| E-16 | ORG-06 | low | 공유 링크 패널이 행마다 인라인 토글 → 모바일에서 길어짐. 바텀시트형 제안 |
| E-17 | HTL-04 | low | 요율 이의·거절 경로가 "Contact MICEGO" 메일만. 간단한 "요율 협의 요청" 폼 제안 |
| E-18 | PTR-03 | low | 인계된 건에서 전이 버튼이 그대로 보이고 서버 거부로만 막힘(추정). 읽기 전용 시 버튼 비활성·배너 필요 |
| E-19 | ADM-03 | low | 카드 10개 세로 나열로 길이가 길다. 상태별 관련 카드 접힘/탭 제안 |
| E-20 | 전체 ko/ | low | 공유 링크·비회원 공유 안내가 track·my 두 곳에 분산, 문구 통일 필요(D-46 반영 확인) |

---

## F. Figma 페이지 구성(10배치)

| 배치 | 페이지 | 프레임 |
|---|---|---|
| 1 | `00 Cover · Flow Map` | 역할 4종 전체 플로우 맵(F-ORG-1~3, F-HTL-1~3, F-HQ-1~7, F-PTR), 상태 머신 다이어그램 3종(RFP·초대·정산), 터치포인트 매트릭스(A-5) |
| 2 | `01 Organizer · Landing & Request` | HUB-01, ORG-01(비회원/회원 변형, 모바일·PC), 폼 검증 상태, ORG-01b 성공, mailto 폴백 패널 |
| 3 | `02 Organizer · Track` | ORG-02 11상태 × PC/모바일, 비교표 카드/표, PICK 4단계(목록·OTP·잠금·완료/대기), 질문·변경 인라인, 공유 패널(회원/비회원), ORG-02s 공유 보기 |
| 4 | `03 Organizer · Account` | ORG-03 12상태, ORG-04 6, ORG-05 6, ORG-06 6(+공유 패널), ORG-07 7(+섹션), ORG-08 5 |
| 5 | `04 Hotel · Landing & Token pages` | HTL-01(+등록 폼·성공), HTL-02, HTL-03 9상태(open 폼 조건부 필드·decline 패널 포함), HTL-04 6, HTL-05 7, HTL-06 5 |
| 6 | `05 Console · Shell & Dashboard` | ADM-00, ADM-00b(정상/만료), 콘솔 셸(사이드바·모바일 메뉴·역할별 nav·배지·DEMO 리본), ADM-01 운영자/PTR-01 파트너, 토스트·다이얼로그 컴포넌트 |
| 7 | `06 Console · RFP` | ADM-02 칸반/목록/필터, ADM-03 상태별 7변형(received·verifying·open·bidding·collecting·delivered·won) + 카드 컴포넌트 10종 + 다이얼로그 8종, PTR-03 변형(마스킹·열람·대리 입력·배정 반려) |
| 8 | `07 Console · Hotels & Orgs` | ADM-04 목록, ADM-05 상태 5변형 + 커미션 카드 3상태(합의 필요·동의 대기·완료) + 요율 다이얼로그, ADM-13 목록/상세 + 계정 초대, PTR-04/05/08 |
| 9 | `08 Console · Settlements, Members, Feedback` | ADM-11, ADM-12 상태 8변형 + 다이얼로그 7종, PTR-06/07, ADM-06/07(조치 다이얼로그), ADM-08/09(상태 전이 가드) |
| 10 | `09 Settings · Emails · Common` | ADM-10 6탭, 이메일 템플릿 와이어 대표 8종(ORG_RECEIVED·ORG_DELIVERED·ORG_WON·HTL_INVITE·HTL_SELECTED_CONNECT·PTN_APPROVED·HTL_CONFIRM·CONSOLE_NOTICE), 알림톡 2종, SMS 2종, CMN-01 위젯 5상태, HUB-404, 개선 노트 E-1~E-20 스티커 보드 |

---

## 개선 이력
- 2026-10-07 · jwlim@staynmore.com(클로드 작성) · v1 최초 작성 — 현재 구현 기준 화면 인벤토리·플로우·동작 노트·개선 노트·Figma 구성.
