# B6 · 유저 타입별 랜딩 — 작업자 브리프 - 클로드

- 대상 Figma 페이지: **`v2 · 01 유저 타입별 랜딩`**
- 배치: **열 하나 = 유저 하나**(왼→오 0 허브 · 1 요청자 · 2 호텔 · 3 본사 운영자 · 4 지역 파트너), 열 위에 머리 카드, 열 안은 위→아래 진입 순서, 프레임 사이 굵은 화살표(이동 방식 라벨). 맨 아래 가로로 진입 경로 매트릭스.
- 이 페이지 프레임은 03~06 페이지 프레임의 **랜딩용 사본 + 전체 스크롤 2장**입니다. 사본은 같은 이름·같은 내용(그 브리프 참조), 전체 스크롤 2장만 이 브리프에서 내용을 정의.
- 공통 규약·예시: `brief-B0-cover.md`. 근거: `index.html` · `ko/index.html` · `en/index.html` · `admin/index.html` · `admin/accept.html` · `admin/dashboard.html`

---

## 0. 열 머리 카드

#### `01 · columns · 유저 타입 열 머리 · PC`
- 가로 5칸 카드(각 열 위에 하나씩 떼어 배치해도 됨): ⓪ 허브 「모드 선택 · 404」 ① 요청자 「여행사·랜드사·기업 담당자 · 한국어 · 비회원 개인 링크(회원은 다음 단계)」 ② 호텔 「해외 호텔 · 영어 · 계정 없음, 메일 개인 링크」 ③ 본사 운영자 「매치고 운영자 · 콘솔 계정(Supabase에서 생성)」 ④ 지역 파트너 「티엠타이(Tmthai) 등 · 초대 메일로 계정 생성 · 다음 단계」 · 각 카드에 태그 점과 첫 화면 ID

---

## 1. 열 ⓪ 허브

#### `HUB-01 · default · 모드 선택 홈 · PC` — = B1 같은 이름 프레임(사본)
- 아래 화살표: 「여행사 모드로 이동 →」 → [페이지] 열 ① ORG-01 / 「Enter hotel mode →」 → [페이지] 열 ② HTL-01
#### `HUB-404 · default · 404 안내 · 컴팩트` — = B1 HUB-404 내용(컴팩트 크기 사본) · E-14

---

## 2. 열 ① 요청자

#### `ORG-01 · guest-full · 랜딩 전체 스크롤 · PC`
- 태그 핵심 · 배지 `ORG-01 · guest-full · 기본(비회원) 전체` · 스티커 S-ORG01(현재 guest) · 들어오는 때: 허브·검색·직접 주소 `/ko/` · 할 수 있는 일: 읽기, 견적 요청, 로그인
- 블록(위→아래, 섹션 7개 + hero + FAQ 뒤 푸터):
  1. **머리글**: 「MICEGO」 · 앵커 「문제」「동작 방식」「대상」「이용 조건」「자주 묻는 질문」 · 「여행사 | Hotels」 · 「로그인」 · 버튼 「견적 요청」 (**회원가입 링크는 머리글에 없음** — 가입 입구는 접수 완료 패널·로그인 화면)
  2. **hero**: 눈썹 「해외 MICE 호텔 역경매 · 주최 측 수수료 없음」 · h1 「행사 견적 하나 받는 데, 며칠씩 걸리고 계신가요?」 · 「MICEGO는 행사 요건을 한 번만 등록하면 해외 호텔이 먼저 제안하는 MICE 역경매 플랫폼입니다.」 · 「수수료 없이, 영업일 기준 3일 이내에 회신드립니다. 회사명과 예산은 호텔 요청서에 담기지 않으며, 행사 규모에 제한이 없습니다.」 · 버튼 「지금 견적 요청하기」「어떻게 동작하나요」 · 「약 1분 소요 · 직접 입력하는 항목은 3개 · 일정이 확정된 해외 행사만 접수합니다」(E-28) · 「여행 인플루언서 마케팅 플랫폼 MatchGo를 운영해 온 팀이 만드는 서비스입니다」 · 오른쪽 그림 「MY RFP」 카드(행사 유형 · 행사 일정 · 예상 인원 · 희망 지역, 「← 제안 도착」×3) + 「미리 보는 화면 구성 예시입니다」
  3. **01_PROBLEM** h2 「견적 한 번 받는 데, 시간이 너무 많이 듭니다」 · 「행사 담당자들이 공통으로 겪는 세 가지입니다.」 · 카드 3: 「같은 설명을 처음부터 반복합니다」 / 「받은 견적을 나란히 놓기 어렵습니다」 / 「결국 아는 곳에만 다시 묻게 됩니다」(각 본문 첫 문장 + …)
  4. **02_HOW IT WORKS** h2 「MICEGO가 일하는 방식」 · 「복잡한 절차 없이, 네 단계로 진행합니다.」 · 01 「행사 요건을 한 번만 작성」 · 02 「조건에 맞는 해외 호텔에 전달」 · 03 「제안이 역으로 도착」 · 04 「같은 기준으로 비교」 · SLA 상자 「요청을 받은 영업일부터 3영업일 안에 진행 상황과 다음 일정을 회신드립니다. …」
  5. **03_FOR WHOM** h2 「누구를 위한 서비스인가」 · 카드 3: 여행사(「인센티브 단체와 포상 여행을 기획하는 팀」 + 3줄) · 랜드사(「현지 수배와 운영을 책임지는 팀」) · 기업체(「사내 행사·컨퍼런스·시상식을 담당하는 팀」) · 「협회·기관, 에이전시 등 그 외 주최자도 '기타'로 남겨주시면 함께 검토합니다.」
  6. **04_DIFFERENCE** h2 「무엇이 달라지는가」 · 「오른쪽이 MICEGO를 이용했을 때의 방식입니다.」 · 3행 비교(요건 전달 · 견적 비교 · 후보 발굴: 왼쪽 지금 방식 / 오른쪽 MICEGO)
  7. **05_POLICY** h2 「이용 조건」 · 「MICEGO 오거나이저 이용 조건입니다.」(사이트 카피 그대로, 옛 말 칩) · 칩 3: 「0원 · 주최 측이 내는 수수료가 없습니다」 「영업일 3일 · 안에 회신드립니다 (주말·공휴일 제외)」 「제한 없음 · 최소 행사 규모 제한이 없습니다」 · h3 「해외 호텔 전 지역」 · h3 「선정 전까지 회사명 비공개」 · 「접수 조건 · 일정이 확정된 해외 행사만 견적 요청이 가능합니다. …」
  8. **06_REQUEST** `#register` = B1 `ORG-01 · guest · PC`의 폼 영역 그대로(줄여 그려도 됨)
  9. **07_FAQ** h2 「자주 묻는 질문」 · 7문항: 지금 바로 견적을 받을 수 있나요? / 이용 요금은 어떻게 되나요? / 회사 이름이나 예산이 공급자에게 그대로 공개되나요? / 국내 행사도 되나요, 해외만 되나요? / 행사 규모가 작아도 등록할 수 있나요? / 아직 일정이 확정되지 않았는데 요청해도 되나요? / 공급자(호텔)인데 참여하고 싶습니다.(→ 「Hotels → Register」) · 「자주 묻는 질문 더 보기」
  10. **푸터**: 「해외 MICE 호텔 역경매 플랫폼」 · 메일 · 「동작 방식」「서비스 소개」「이용 조건」「자주 묻는 질문」「문의하기」「이용약관」「개인정보처리방침」 · 「Hotels (English) →」「모드 선택 · Choose mode」 · 「해외 호텔 대상 · 주최 측 수수료 없음 · 영업일 3일 이내 회신 · 요건서에 회사명·예산 미포함.」 · © · 「의견 보내기」 · 오른쪽 아래 의견 위젯 런처 「의견 보내기」
- 분기: 앵커 → 페이지 이동(같은 화면 `#…`) / 「지금 견적 요청하기」「견적 요청」 → 페이지 이동(같은 화면 `#register`) / 「로그인」 → 페이지 이동 · ORG-04 / 「견적 요청하기」 → 인라인 패널 · ORG-01 done · `submit_rfp` · ORG_RECEIVED / FAQ 질문 → 인라인 패널 / 「자주 묻는 질문 더 보기」 → 페이지 이동 · ORG-09 faq / 「Hotels → Register」 → 페이지 이동 · HTL-01 `#register` / 「의견 보내기」 → 모달 · CMN-01 / 「서비스 소개」 → 페이지 이동 · ORG-09 about / 「이용약관」「개인정보처리방침」 → 페이지 이동 · ORG-LEGAL
- 출처: 빌드 고정 전부 · 메모: D-32(「수수료 없음·커미션율 비공개」) 기준 카피 · E-39(「공급자」)
- 아래 화살표: [패널] 「견적 요청하기」 → `ORG-01 · done`(열 안 작은 사본) → [메일 ORG_RECEIVED 버튼] → `ORG-02 · received`(작은 사본)

#### `ORG-01 · done · 접수 완료 · 컴팩트` — = B1 ORG-01 done 패널(랜딩 열 사본)
#### `ORG-02 · received · 진행 상황 화면 · 컴팩트` — = B1 ORG-02 received(랜딩 열 사본) · 메모 「요청자 재방문의 기본 입구 = 메일·알림톡의 개인 링크」
#### `ORG-06 · list · 내 견적 요청 · 컴팩트` — 참조 카드(다음 단계): 「회원 재방문 = 「로그인」 → ORG-04 → ORG-06 내 견적 요청」 + B1 ORG-06 list 축소본

---

## 3. 열 ② 호텔

#### `HTL-01 · form-full · 호텔 랜딩 전체 스크롤 · PC`
- 태그 보조 + 보라 칩 G-3 · 배지 `HTL-01 · form-full · 등록 폼 전체` · 스티커 S-HTL01(현재 form) · 들어오는 때: 허브 · `/en/` · 영업 메일
- 블록:
  1. **머리글**: 「MICEGO Partner」 · Why partner · How it works · Sample request · Partner terms · FAQ · 「여행사 | Hotels」 · 「Register」
  2. **hero**: 눈썹 「FOR HOTELS & RESORTS · MICEGO PARTNER NETWORK」 · h1 「Group enquiries from Korean MICE organizers, sent to your inbox.」 · 「MICEGO is a reverse-auction sourcing platform for overseas MICE programs. …」 · 「You decide which requests to quote on. Joining the partner network carries no listing fee.」 · 「Register your property」「See a sample request」 · 「About 1 minute · 7 fields · No listing fee to join」 · 「MICEGO is built by the team behind MatchGo, a travel influencer marketing platform.」 · 그림 「INCOMING REQUEST」 카드(Ref MG-2608-007 · Destination Da Nang, Vietnam · Attendees 150–199 · Organizer ▓▓▓▓▓▓ withheld · Dates Mon – Thu, 3 nights (confirmed)) + 「Illustration of the brief format you receive.」
  3. **01_WHY PARTNER** h2 「Group business, without the cold outreach」 · 「Three things MICE sales teams tell us.」 · 카드 3: 「Enquiries arrive half-formed」 / 「The Korean market is hard to reach」 / 「You quote, then hear nothing」
  4. **02_HOW IT WORKS** h2 「Three steps」 · 「No dashboard to learn, no subscription to manage.」 · 01 「Register your property」 · 02 「Receive matched requests」(「…a quote deadline (usually 3 business days, 18:00 KST).」) · 03 「Submit your quote」 · 상자 「No obligation · Every request is an invitation, not a commitment. … Three unanswered invitations in a row pause your listing until we hear from you.」
  5. **03_SAMPLE REQUEST** `#sample` h2 「This is what a request looks like」 · 「An actual brief format, shown in full. …」 · 요건서 카드 「REF MG-2608-007 · Sample」(Program · Accommodation 표 Twin 60·3 / King 20·3 / Total 80 rooms 240 room-nights · Banquet · Notes) · 「Withheld from suppliers · Organizer company name and budget. …」 · 「Sample brief, shown for format. … (5 business days for groups of 200+).」 · 「Open the full sample request page」
  6. **04_PARTNER TERMS** `#terms` h2 「Partner terms」 · 「What we commit to, and what we ask.」 · 칩 3 「No listing fee · to join or to receive requests」「You choose · which requests to quote on」「Confirmed dates only · no speculative enquiries」 · 「No listing fee. MICEGO earns a commission on confirmed bookings only, at a rate agreed with you when we approve your property.」(**요율 숫자(5~20%)는 화면에 없음**) · h3 4: 「Any destination outside Korea」「Organizer identity withheld」「Groups of 50 or more · ballroom not required」「Every request states its deadline」 · 「What we ask · Quote on the requirements as written, and keep your rates valid through the date you state. …」
  7. **05_REGISTER** `#register` = B2 `HTL-01 · form · PC` 폼 영역
  8. **06_FAQ** h2 「Frequently asked questions」 · 7문항: Does it cost anything to join? / How is MICEGO paid, then? / Am I obliged to quote on every request? / Are the dates real? / Who is the organizer? / Which destinations do you cover? / Will you contact competitors in my city? · 「More questions」
  9. **푸터**(= B2 CB-FOOT-EN + 「How it works」「Partner terms」) · 모바일 하단 고정 「Register your property」
- 분기: 앵커 → 페이지 이동(같은 화면) / 「Register your property」 → 페이지 이동(같은 화면 `#register`), 폼 제출 → 인라인 패널 · HTL-01 done · `register_partner` · PTN_APPLIED / 「See a sample request」 → 페이지 이동(같은 화면 `#sample`) / 「Open the full sample request page」 → 페이지 이동 · HTL-02 / 「More questions」 → 페이지 이동 · HTL-07 faq / 「Feedback」 → 모달 · CMN-01(영어)
- 출처: 빌드 고정

#### `01 · htl-tokens · 호텔 토큰 링크 카드 · 컴팩트`
- 카드 4장(메일 → 개인 링크 → 화면): ① HTL_INVITE · HTL_REMINDER · HTL_QUOTE_RECEIVED · HTL_SELECTED_CONNECT · HTL_NOT_SELECTED → `en/bid.html?t=` → **HTL-03** 견적 페이지(초대 마감까지, 결과 후 결과 화면) ② HTL_CONFIRM → `en/confirm.html?t=` → **HTL-05** 대리 입력 확인 · **72시간** · 다음 단계 ③ PTN_APPROVED · PTN_COMMISSION_TERMS → `en/commission.html?t=` → **HTL-04** 요율 동의 · **168시간** · 1회용 · 결정 대기 G-2 ④ 모든 초대 메일 푸터 → `en/unsubscribe.html?t=` → **HTL-06** 수신 거부
- 각 카드 아래 「링크를 열기만 해서는 동의·확인·거부가 되지 않음(버튼 POST만)」 · 토큰 형식 16~64자(HTL-04·05), 4~64자(HTL-03·06)

---

## 4. 열 ③ 본사 운영자

#### `ADM-00 · default · 콘솔 로그인 · PC` — = B3 같은 이름 프레임(사본) · 강조 메모: 계정 만들기 없음, `?e=` 오류 줄 위치
- 아래 화살표: [페이지] 「로그인」 성공 → ADM-01
#### `ADM-01 · default · 대시보드 · PC` — = B3 같은 이름 프레임(사본) · 강조 메모: 사이드 메뉴 8 · 할 일 카드 7 · 개입 필요 표 · 회원 카드 · 지표 · 발송 실패 · 상태 분포 · 최근 이력

---

## 5. 열 ④ 지역 파트너 (다음 단계)

#### `PTR-00 · form · 콘솔 초대 수락 · PC` — = B3 `ADM-00b · form` 내용(사본, 「new@tmthai.example 계정의 비밀번호를 정합니다.」) · 들어오는 때: 운영자/파트너 관리자 「계정 초대」 → Supabase 초대 메일
- 아래 화살표: [페이지] 「비밀번호 저장하고 시작」 → PTR-01(다음 로그인부터는 열 ③ ADM-00을 거침, 화살표만 열 ③ 프레임으로)
#### `PTR-01 · default · 지역 파트너 대시보드 · PC` — = B4 같은 이름 프레임(사본) · 강조 메모: 메뉴 5 · 조직 요약 카드(담당 지역 · 진행 중 요청 · 본사 인계 · 정산 처리 필요 · 배분 70:30) · 개입 표(파트너에게 보이는 **4종**, 「처리 완료」 없음) · 정지 상자 **없음**(PTR-08에만, E-89)

---

## 6. 진입 경로 매트릭스

#### `01 · entry-matrix · 진입 경로 매트릭스 · PC`
행 4 유저 × 열 5 진입 방식. 칸 = 화면 ID + 주소/템플릿.
| 유저 | 직접 주소 | 메일 버튼 | 알림톡·문자 | 토큰 링크 | 콘솔 로그인 |
|---|---|---|---|---|---|
| 요청자 | `/` HUB-01 · `/ko/` ORG-01 · `ko/contact.html` ORG-09 · (회원) `ko/login.html` ORG-04 | ORG_* 8종 「진행 상황 보기」 → ORG-02 · ACC_PW_RESET → ORG-05 · ACC_* 안내 → ORG-06 | 알림톡 ORG_* → ORG-02(실패 시 LMS) · 문자 ORG_PICK_OTP(링크 없음, ORG-02 칸에 입력, MVP 꺼짐) · ACC_SMS_OTP | `ko/track.html?t=` ORG-02 · `?s=` ORG-02s(동료) · `ko/reset.html?k=` ORG-05(30분) | — |
| 호텔 | `/en/` HTL-01 · `en/sample-request.html` HTL-02 · `en/contact.html` HTL-07 | HTL_* 5종 → HTL-03 · PTN_APPROVED/PTN_COMMISSION_TERMS → HTL-04 · HTL_CONFIRM → HTL-05 · 푸터 → HTL-06 · PTN_APPLIED/REJECTED/REINSTATED(링크 없음) | — | `en/bid.html?t=` · `en/commission.html?t=`(168h) · `en/confirm.html?t=`(72h) · `en/unsubscribe.html?t=` | — |
| 본사 운영자 | `/admin/` ADM-00 | Supabase 초대 메일 → ADM-00b · FB_OPS_ALERT · CONSOLE_NOTICE(HQ_*) → 콘솔 | — | `admin/accept.html#access_token=…` ADM-00b | ADM-00 → ADM-01(역할 operator) |
| 지역 파트너 | `/admin/` ADM-00 | 초대 메일 → PTR-00 · CONSOLE_NOTICE(PTR_*) → 콘솔 | — | `admin/accept.html#…` PTR-00(72시간 표기, 추정) | ADM-00 → PTR-01(역할 partner_admin / partner_member) |
- 칸 색: 핵심 경로(요청자 메일·알림톡 → ORG-02, 호텔 메일 → HTL-03, 운영자 로그인) 굵은 테두리 · 다음 단계 칸 회색 칩

---

## 7. 프레임 수 (이 브리프)
- PC 9 (columns · HUB-01 · ORG-01 guest-full · HTL-01 form-full · ADM-00 · ADM-01 · PTR-00 · PTR-01 · entry-matrix) · 컴팩트 5 (HUB-404 · ORG-01 done · ORG-02 received · ORG-06 list · htl-tokens) · 모바일 0 · 모달 0 (합 14)
