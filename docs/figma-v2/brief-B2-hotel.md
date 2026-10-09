# B2 · 호텔 화면 — 작업자 브리프 - 클로드

- 대상 Figma 페이지: **`v2 · 04 호텔 화면`**
- 공통 규약·예시 데이터: `brief-B0-cover.md` §1·§2(EX-2). 화면 문구는 **영어 그대로**, 스티커·노트만 한국어.
- 섹션 배치: ① HTL-03(가운데, 가장 크게) → ② HTL-04 · HTL-05 · HTL-06(토큰 화면) → ③ HTL-01 · HTL-02 · HTL-07
- 근거 코드: `en/bid.html` = `build2.py` BID_* · `en/commission.html` = `build_commission.py` · `en/confirm.html` = `build_confirm.py` · `en/unsubscribe.html`(UNSUB_STATES) · `en/index.html` · `en/sample-request.html` · `en/contact.html` · `en/faq.html`
- 스펙: `5b-hotel.md`, `5d-next.md` §3 HTL-05, `5a-requester.md` ORG-09/HTL-07, `figma-update-sheet.md` 2-3

---

## 0. 상태 스티커 세트

| 세트 | 상태 |
|---|---|
| S-HTL01 | form 등록 폼 · form-error 검증 오류 · done 등록 접수됨 · done-mailto 접수됨(메일 앱 방식) |
| S-HTL02 | form 예시 요건서·견적 폼 · done-demo 제출 완료(데모) |
| S-HTL03 (`BID_STATES` 9) | loading 불러오는 중 · open Open for quotes · submitted Quote received · declined Declined · selected Selected · not_selected Not selected · expired Expired · cancelled Cancelled · invalid 링크 오류 |
| S-HTL04 (6 + noscript) | loading · review 동의 대기 · done 동의 완료 · expired 링크 만료 · used 이미 동의함 · invalid 링크 오류 · (noscript 스크립트 꺼짐) |
| S-HTL05 (7) | loading · review Please confirm the quote · done Quote confirmed · disputed Flagged · used Already handled · expired Link expired · invalid Link not valid |
| S-HTL06 (`UNSUB_STATES` 5) | loading · confirm 거부 확인 · done 거부 완료 · already 이미 거부함 · invalid 링크 오류 |
| S-HTL07 (= S-ORG09 영어판) | default · error · rate_limited · failed · sent · mailto |

HTL-03 스티커 맨 아래 서버 판정 순서 한 줄: 「요청 취소됨 → cancelled · 초대 기한 지남/재초대로 대체됨 → expired · 견적 거절 → declined · 성사+선정 → selected · 성사+견적 제출 → not_selected · 견적 제출(호텔 확인된 대리 입력 포함) → submitted · 그 밖(초대됨·열람함·대리 입력 3상태) → open」

---

## 1. 공통 블록

**CB-HDR-EN (토큰 화면 머리글)**: 로고 MICEGO · 토글 「여행사 | Hotels」(Register 버튼 없음).
**CB-FOOT-EN**: 「Partner Network」 · 「Overseas MICE hotel sourcing for Korean organizers.」 · mysteri1984@gmail.com · 「Hotel mode」「FAQ」「Contact」「Privacy」 · 「여행사 (한국어) →」「Choose mode · 모드 선택」 · 「No listing fee · You choose which requests to quote on · Confirmed-date requests only · Organizer identity withheld.」 · © · 「Feedback」(→ CMN-01 영어판)
**CB-BID-TOP (HTL-03, loading·invalid 제외)**: 데모 띠 「DEMO — Example request page. Property, rates and dates are sample data.」 · 상단 바 「MICE QUOTE REQUEST · REF MG-2610-014」 + (open·submitted) 「Deadline Thu 8 Oct 2026, 18:00 KST」 + 상태 배지(Open for quotes / Quote received / Declined / Selected / Not selected / Expired / Cancelled)
**CB-REQ (요건서, open·submitted)**: 패널 「1 Requirements」 — Program(Event type Incentive group travel · Organizer type Travel agency (organizer) · Dates Mon 15 – Thu 18 Mar 2027 · Duration 3 nights, 4 days · Attendees 150–199 attendees · Destination Da Nang, Vietnam) · Accommodation 표(Room type · Rooms · Nights: Twin (2 beds) 60·3 / King 20·3 / Total 80 rooms · 240 room-nights) · Banquet(Ballroom Required · Purpose Gala dinner — one evening · Date Night 3 · Wed 17 Mar 2027 · Seating Banquet round tables, 150–199 pax) · Notes (reviewed by MICEGO) 「"Beachfront or near-beach preferred. Single property to host all rooms and the gala dinner."」 · 마커 예시 값(E-1)
**CB-NEXT (open·submitted 아래)**: 「1 · Quotes checked」 「MICEGO checks rates, currency, taxes and dates with each property.」 / 「2 · Comparison sent」 「The organizer sees proposals side by side, labelled A, B, C. Property names stay hidden.」 / 「3 · Introduction」 「Every property that quoted gets the result by email. If the organizer selects your proposal, you receive their company name and contact details and MICEGO introduces you both.」
**CB-ENDBTN**: 「Contact MICEGO」(→ 페이지 이동 · HTL-07 · 서버 없음) · 「Hotel FAQ」(→ 페이지 이동 · HTL-07 faq)
**CB-SUBQ (submitted·selected·not_selected 「Your submitted quote」)**: Currency USD · Twin / room / night USD 145 · King / room / night USD 165 · Breakfast Included in rate · Taxes & service charge Included in all rates · Availability All 80 rooms available · Ballroom Grand Ballroom, 300 pax banquet — USD 3,500 · Valid until Sun 31 Jan 2027 · 마커 예시 값(방금 낸 값이 아님, E-1)

---

## 2. 섹션 ① HTL-03 견적 페이지 (`en/bid.html?t=`) — 태그 핵심, 모든 프레임 워터마크 「예시」

#### `HTL-03 · open · 견적 페이지 · PC`
- 배지 `HTL-03 · open · Open for quotes` · 스티커 S-HTL03(현재 open) · 들어오는 때: 초대가 초대됨·열람함(대리 입력 3상태도 여기, E-42) · 할 수 있는 일: 견적 제출, 견적 거절
- 블록(위→아래):
  1. CB-HDR-EN · CB-BID-TOP(배지 Open for quotes)
  2. h1 「MICE quote request — Da Nang, Vietnam」 · 「A Korean organizer has a confirmed-date incentive program. Review the requirements and send your quote before Thu 8 Oct 2026, 18:00 KST. Not a fit? You can decline it at the end of this page.」
  3. 개요 4칸: Issued Mon 5 Oct 2026, 09:00 KST · Quote deadline Thu 8 Oct 2026, 18:00 KST · Reminder email Wed 7 Oct 2026, 18:00 KST · Comparison sent to organizer By Mon 12 Oct 2026
  4. 안내 2줄: 「**Why some details are hidden.** The organizer's company name and budget are withheld. Quote on the requirements as written; everyone receives the same brief.」 · 「**About this link.** It is personal to your property — no login needed. Opening it marks the invitation as viewed, and a reminder is emailed 24 hours before the deadline. It stops accepting quotes when this request closes; …」
  5. CB-REQ
  6. 패널 「2 Submit your quote」: Quote currency *(USD — US Dollar 기본, 12종 THB VND IDR MYR PHP SGD JPY TWD HKD KRW EUR) + 「Quote in whichever currency your property invoices in. …」 · **Guest rooms**: Twin room rate — per room, per night *(USD, e.g. 145) · King room rate *(e.g. 165) · Breakfast *(Included in rate / Not included) · Breakfast supplement (optional) · Taxes & service charge *(Included in all rates / Not included) · Taxes and charges to add *(Not included일 때, e.g. 5% service charge + 8% VAT) · Rooms available for these dates *(All 80 rooms available / Partially available) · Availability notes (optional) · **Banquet — gala dinner**: Ballroom rental fee — total for the evening *(e.g. 3500) · Ballroom name & capacity *(e.g. Grand Ballroom, 300 pax banquet) · F&B minimum — per person (optional) · Included in rental (AV, staging, setup) (optional) · **Terms**: Quote valid until * · Cancellation policy * · Additional proposals (optional) · **Your details**: Hotel / property name * · Contact name * · Contact email * · Contact phone (WhatsApp) (optional) · 동의 체크 「I confirm the rates and terms above are accurate, accept the MICEGO **partner terms**, and agree they may be shared with the organizer under reference MG-2610-014. My property name and contact details are disclosed to the organizer only if they select this proposal. See our **privacy notice**.」 · 「You can revise your quote through this link until the deadline. Your agreed commission: 10% of net booking value.」 · 버튼 「Review & send quote」
  7. 패널 「Can't quote on this one?」 · 「Declining takes a few seconds and helps us match future requests. It never counts against you — only invitations left unanswered do.」 · Reason *(Select a reason · Dates unavailable · Capacity doesn't fit · Other) · Anything we should know? (optional, e.g. Fully booked 15–17 Mar) · 「Review & decline」
  8. CB-NEXT · CB-FOOT-EN
- 분기: 「Review & send quote」 → 인라인 패널 · HTL-03 submitted · `submit_quote` · HTL_QUOTE_RECEIVED(메일 앱 방식은 인라인 패널 open-mailto) / 「Quote currency」 → 인라인 패널 · 입력칸 접두어·예시값 바뀜 · 서버 없음 / 「Review & decline」 → 인라인 패널 · HTL-03 declined · `decline_bid` · —(메일 앱 방식은 decline-mailto) / 「partner terms」 → 페이지 이동(새 탭) · `terms.html`(영문 약관) / 「privacy notice」 → 페이지 이동(새 탭) · `privacy.html`
- 출처: 서버 `state`·`ref`·`commission`(없으면 커미션 줄 숨김) / 예시 값: 제목·요건서·날짜·「All 80 rooms」·동의 문구 속 REF / 빌드 고정: 폼 문구
- E: E-43(초대별 마감 지나도 폼 남음) · E-10(KST만 표기) · E-46(객실만 요청해도 연회장 칸 필수, 결정 대기) · E-49(연속 클릭 막지 않음) · E-92(새 라운드 뒤 이전 초대가 열린 채 남음, 결정 대기)

#### `HTL-03 · submitted · 견적 페이지 · PC`
- 배지 `HTL-03 · submitted · Quote received` · 들어오는 때: 초대가 견적 제출(호텔 확인된 대리 입력 포함), 결과 없음 · 할 수 있는 일: 「Revise your quote」
- 블록: CB-BID-TOP(Quote received + Deadline) → h1·개요(open과 같음) → 패널 「✓」 h2 「Your quote is in」 · 「MICEGO received your quote for MG-2610-014 on Tue 6 Oct 2026, 15:20 KST.」 · 「You can revise it through this link until Thu 8 Oct 2026, 18:00 KST. Your latest submission replaces the earlier one.」 · 「Revise your quote」 → CB-SUBQ → CB-REQ → CB-NEXT
- 분기: 「Revise your quote」 → 인라인 패널 · HTL-03 open-revise · 서버 없음
- 출처: 서버 `state`·`ref`·`can_revise`(안 읽음) / 예시 값 요약 · E-27(요청이 미성사로 끝나도 이 화면 그대로, 알림 없음) · E-7(마감 뒤에도 Revise 보임)

#### `HTL-03 · declined · 견적 페이지 · PC`
- 배지 Declined · 들어오는 때: 초대가 견적 거절
- 블록: 상단 바(배지만) → 패널 「–」 h2 「You declined this request」 · 「Thanks for letting us know. Declining doesn't count against your listing — only invitations left unanswered do.」 · 「New requests that match your property arrive by email with their own link. If you declined by mistake, contact MICEGO with the reference code from the invitation email.」 · CB-ENDBTN (요건서·폼 없음)

#### `HTL-03 · selected · 견적 페이지 · PC`
- 배지 Selected · 들어오는 때: 요청 성사 + 이 초대 선정 · 할 수 있는 일: 요청자에게 직접 연락(메일 밖)
- 블록: 패널 「✓」 h2 「Your proposal was selected」 · 「The organizer selected your proposal for MG-2610-014 on Wed 14 Oct 2026. MICEGO has emailed an introduction to you and the organizer.」 · 카드 h2 「Organizer contact」: Company 「Hanbit Tour Co., Ltd. (한빛투어)」 · Contact 「Kim Ji-eun」 · Email 「jieun.kim@hanbit-tour.example」 · Phone 「+82 2-000-0000」 · 「Contracting and payment are arranged directly with the organizer.」 → CB-SUBQ → CB-ENDBTN
- 출처: 서버 `organizer`(선정됐을 때만) — **요청자 신원이 보이는 유일한 호텔 프레임**, 값은 예시(워터마크 필수) · 알림 HTL_SELECTED_CONNECT(요청자 참조)

#### `HTL-03 · not_selected · 견적 페이지 · PC`
- 배지 Not selected · 패널 「–」 h2 「Not selected this time」 · 「The organizer chose another proposal for MG-2610-014. Thank you for quoting. Your property name and contact details were not shared with the organizer.」 → CB-SUBQ → CB-ENDBTN · 알림 HTL_NOT_SELECTED

#### `HTL-03 · expired · 견적 페이지 · PC`
- 배지 Expired · 들어오는 때: 초대가 기한 지남 또는 재초대로 대체됨
- 패널 「×」 h2 「This invitation has expired」 · 「It closed on Thu 8 Oct 2026 at 18:00 KST without a quote from your property, so this link no longer accepts or shows quotes.」 · 「An invitation that closes without a quote or a decline counts as unanswered; three in a row pause your listing until we hear from you. New matching requests arrive by email with their own link.」 · CB-ENDBTN
- E-44: 재초대로 대체된 호텔에게 「without a quote from your property」는 틀린 말

#### `HTL-03 · loading · 견적 페이지 · 컴팩트`
- 「Loading…」 한 줄 · 화살표: `get_bid` 응답 → 서버 state 7종 / 실패 → invalid

#### `HTL-03 · open-error · 견적 페이지 · 컴팩트`
- 칸 아래 문구(전부): Twin·King 「Enter a rate of 0 or more.」 · Breakfast·Taxes·Availability 「Please select an option.」 · Taxes to add 「Please state the percentages.」 · Ballroom fee 「Enter a fee of 0 or more.」 · Ballroom name 「Please enter the ballroom name and capacity.」 · Valid until 「Please keep the quote valid at least until Mon 12 Oct 2026.」 · Cancellation 「Please describe your cancellation policy.」 · Hotel name 「Please enter the property name.」 · Contact name 「Please enter a contact name.」 · Email 「Please enter a valid email address.」 · 동의 「Please confirm before submitting.」 → 첫 오류 칸으로 스크롤+포커스
- 서버 토스트 5종 나란히: TOKEN_INVALID 「This link is not valid.」 · STATE_CONFLICT 「The request has changed. Please reload.」 · DEADLINE_PASSED 「The quote deadline has passed.」 · RATE_LIMITED 「Too many attempts. Try again later.」 · VALIDATION 「Please check the highlighted fields.」
- E-41: 유효기한 최소일 `2026-10-12` 고정 · 메모: 필드 명세는 이 프레임 옆 표(아래 §2-1)

#### `HTL-03 · open-revise · 견적 페이지 · 컴팩트`
- 「Revise your quote」 뒤 폼: 보충·세금 설명·객실 메모 칸은 이전 값, 라디오 3개는 고정값(Included in rate / Included in all rates / All 80 rooms available) · 「Review & send quote」 → 인라인 패널 · submitted · `submit_quote`(수정 +1) · HTL_QUOTE_RECEIVED 매번 · E-40

#### `HTL-03 · open-mailto · 견적 페이지 · 컴팩트`
- 패널 h2 「Send your quote — two steps」 · ①「Copy the quote details — a safety copy in case your email app shortens long text.」 ②「Open the email draft and press send. MICEGO replies to confirm receipt.」 · 「Copy quote details」「Open email draft」「Edit quote」 · 「Subject: …」 · 「No email app on this device? Paste the copied details into an email to mysteri1984@gmail.com with the subject above.」
- 분기: Copy → 인라인 패널 · 「Copied」(실패 「Select the text below and copy it manually」) / 「Open email draft」 → 외부 앱 · 메일 / 「Edit quote」 → 인라인 패널 · open · 들어오는 때: 데모·API 설정 없음

#### `HTL-03 · decline-mailto · 견적 페이지 · 컴팩트`
- 패널 h2 「Send your decline」 · ①「Open the email draft and press send, or copy the text into an email to mysteri1984@gmail.com.」 ②「Then confirm below.」 · 「Open email draft」「Copy text」「Back」「I've sent it」
- 분기: 「Open email draft」 → 외부 앱 / 「Copy text」 → 인라인 패널 / 「Back」 → 인라인 패널 · open / 「I've sent it」 → 인라인 패널 · declined(서버 확인 없음) · 오류 「Please choose a reason.」

#### `HTL-03 · cancelled · 견적 페이지 · 컴팩트`
- 배지 Cancelled · 패널 「×」 h2 「This request was cancelled」 · 「The organizer cancelled this request, so MICEGO is no longer collecting quotes for it. Nothing more is needed from you — thank you for your time.」 · CB-ENDBTN · E-45: 취소돼도 호텔에 자동 알림 없음(링크를 다시 열어야 앎)

#### `HTL-03 · invalid · 견적 페이지 · 컴팩트`
- 패널 「!」 h2 「This link can't be opened」 · 「The link may be incomplete, or it may no longer be active. Open it again from the original email, or contact MICEGO with the reference code from that email.」 · 「Contact MICEGO」 「Email us」(→ 외부 앱 · 제목 「[MICEGO] Request link not opening」) · 들어오는 때: 토큰 형식 오류(서버 호출 없이) 또는 `get_bid` 오류 전부 · E-48

#### `HTL-03 · open · 견적 페이지 · 모바일`
#### `HTL-03 · submitted · 견적 페이지 · 모바일`
#### `HTL-03 · selected · 견적 페이지 · 모바일`
- (모바일 공통) 개요 4칸 → 2×2, 요건서 표 가로 스크롤 없이 3열 유지, 폼 1열, 버튼 전폭

### 2-1. HTL-03 견적 폼 명세 (open-error 옆 표, 프레임 아님)
| 필드 | 필수 | 입력 | 오류 문구 |
|---|---|---|---|
| currency | 필수 | 선택 12종(기본 USD) | (토스트 VALIDATION) |
| twinRate · kingRate | 필수 | 숫자 | Enter a rate of 0 or more. |
| breakfast | 필수 | 칩 2 | Please select an option. |
| breakfastSupplement | 선택(Not included일 때 표시) | 숫자 | — |
| tax | 필수 | 칩 2 | Please select an option. |
| taxNote | Not included일 때 | 한 줄 | Please state the percentages. |
| availability | 필수 | 칩 2 | Please select an option. |
| availabilityNotes | 선택(Partially일 때) | 여러 줄 | — |
| ballroomFee · ballroomName | 필수 | 숫자 / 한 줄 | Enter a fee of 0 or more. / Please enter the ballroom name and capacity. |
| fnbMinimum · ballroomIncludes · additionalProposals · contactPhone | 선택 | — | — |
| validUntil | 필수(최소 2026-10-12 고정) | 날짜 | Please keep the quote valid at least until Mon 12 Oct 2026. |
| cancellation | 필수(5자↑) | 여러 줄 | Please describe your cancellation policy. |
| hotelName · contactName · contactEmail | 필수 | — | Please enter the property name. / Please enter a contact name. / Please enter a valid email address. |
| consent | 필수 | 체크 | Please confirm before submitting. |
| dreason(거절) | 필수 | 선택 3 | Please choose a reason. |

---

## 3. 섹션 ② 토큰 화면 HTL-04 · HTL-05 · HTL-06

### HTL-04 커미션 요율 동의 `en/commission.html?t=` — 태그 **결정 대기(G-2)**, 링크 168시간·1회용

#### `HTL-04 · review · 커미션 요율 동의 · PC`
- 배지 `HTL-04 · review · 동의 대기` · 스티커 S-HTL04(현재 review) · 들어오는 때: `partner_commission_accept(lookup)` 결과 `pending` · 할 수 있는 일: 체크 후 동의
- 블록: CB-HDR-EN · 「Partner terms PT-2026-10」 · h1 「Accept the commission terms for your property」 · 「MICEGO earns a commission on confirmed bookings only. Please review the rate set for your property. We can’t send you request invitations until you accept.」 · 표: Property 「your property」 · Commission 「10% of net booking value」 · Net booking value 「Total contract value for guest rooms and for banquet, meeting and food & beverage services, excluding taxes and service charges」 · Applies to 「Bookings that result from a selection of your quote on an invitation sent to you while this rate is in effect」 · Invoice 「Issued after the event; payable within 30 days of the invoice date」 · Link valid until 「—」 · 「The full wording is in **Article 5 of the Partner Terms**. Your rate is confidential between you and MICEGO and is never shown to organizers. …」 · 체크 「I am authorised to accept these terms for your property, and I accept the commission above under Article 5 of the MICEGO Partner Terms.」 · 「Accept commission terms」(체크 전 비활성) · 「Questions about the rate? Contact MICEGO」 · 「Opening this page does not accept anything. Acceptance is recorded, with the time and the version of the terms, only when you press the button.」 · CB-FOOT-EN
- 분기: 체크 → 인라인 패널 · 버튼 켜짐 · 서버 없음 / 「Accept commission terms」 → 인라인 패널 · HTL-04 done · `partner_commission_accept(accept)` · (호텔 확인 메일 없음; 콘솔 HQ_HOTEL_TERMS_ACCEPTED/PTR_HOTEL_TERMS_ACCEPTED) / 「Article 5 of the Partner Terms」 → 페이지 이동(새 탭) · `terms.html#art5` / 「Contact MICEGO」 → 페이지 이동 · HTL-07
- 출처: 서버 `hotel`·`ratePct`·`basis`·`termsVersion`·`expiresAt`·`status` / 예시 값 「10%」「PT-2026-10」「your property」 · E-10(Link valid until UTC 표기) · E-17(이의·거절 경로가 Contact 메일뿐) · 보라 칩 G-2

#### `HTL-04 · done · 커미션 요율 동의 · PC`
- 「✓」 h2 「Commission terms accepted」 · 「Thank you. Your property has accepted a commission of 10% of net booking value under the MICEGO Partner Terms (PT-2026-10). We can now invite you to quote when a request matches your destination and capacity.」 · 메모: 호텔에 동의 확인 메일 없음(결정 대기)

#### `HTL-04 · loading · 커미션 요율 동의 · 컴팩트` — 「Loading…」 · 화살표 lookup → review/used/expired/invalid
#### `HTL-04 · expired · 커미션 요율 동의 · 컴팩트`
- 「–」 h2 「This link has expired」 · 「Commission terms links are single-use and valid for a limited time. Nothing was accepted. Reply to the original email, or contact MICEGO, and we will send you a new link.」 · 「Contact MICEGO」
#### `HTL-04 · used · 커미션 요율 동의 · 컴팩트`
- 「–」 h2 「Already accepted」 · 「These commission terms have already been accepted with this link. No further action is needed. If you need a change, contact MICEGO.」
#### `HTL-04 · invalid · 커미션 요율 동의 · 컴팩트`
- 「!」 h2 「This link is not valid」 · 「Part of the address is missing, or this link is no longer active — for example because a newer link was sent to you. Please use the most recent email, or contact MICEGO.」 · 들어오는 때: 토큰 16~64자 아님, `stale`, TOKEN_INVALID·STATE_CONFLICT · E-48
#### `HTL-04 · noscript · 커미션 요율 동의 · 컴팩트`
- h1 「JavaScript is needed on this page」 · 「This page shows your commission terms and records your acceptance, which requires JavaScript. Please turn it on and reload the page. Nothing has been accepted yet. If you cannot use JavaScript, reply to the email that contained this link and we will confirm the terms with you another way.」 · 「Contact MICEGO」

### HTL-05 대리 입력 확인 `en/confirm.html?t=` — 태그 **다음 단계**, 링크 72시간

#### `HTL-05 · review · 대리 입력 확인 · PC`
- 배지 `HTL-05 · review · Please confirm the quote` · 스티커 S-HTL05(현재 review) · 들어오는 때: `quote_confirm(lookup)` = pending(초대가 `proxy_entered`) · 할 수 있는 일: 확인, 이의
- 블록: 「Request MG-2610-014 · Round 1」 · h1 「Please confirm the quote entered for your property」 · 「MICEGO Thailand entered the following quote on your behalf after speaking with your sales team. It will only be shown to the organizer after you confirm it. If anything is wrong, flag it and we will not use it.」 · 표: Currency THB · Twin room (per night) 4,500 · King room (per night) 5,200 · Breakfast Included · Tax & service Included · Availability All requested dates · Ballroom — · Valid until 2027-01-31 · Cancellation Free cancellation up to 30 days before arrival · Additional proposals — · 「Link valid until —. Confirming is binding in the same way as submitting the quote yourself. Need to change something? Flag it below, then submit a corrected quote from your invitation link.」 · 「Confirm this quote」「Something is wrong」
- 분기: 「Confirm this quote」 → 인라인 패널 · done · `quote_confirm(confirm)`(요청이 open·bidding·collecting일 때만) · PTR_HOTEL_CONFIRMED / 「Something is wrong」 → 인라인 패널 · 사유 칸 펼침(HTL-05 disputed 프레임 위쪽 상태)
- 출처: 서버 lookup / 예시 값 · 메모: 확인하면 초대가 바로 `submitted`(hotel_confirmed 아님)

#### `HTL-05 · disputed · 대리 입력 확인 · PC`
- 위 단계(펼친 모습): 「What should be corrected? (optional)」 칸(e.g. Twin rate should be 4,200 net; breakfast not included) + 「Flag and do not use this quote」「Back」 → 결과: 「✓」 h2 「Flagged — this quote will not be used」 · 「We have noted your correction and the quote entered on your behalf has been withdrawn. To quote, open your original invitation and submit it yourself before the deadline.」 · 「Submit my own quote」
- 분기: 「Flag and do not use this quote」 → 인라인 패널 · disputed · `quote_confirm(dispute)` · PTR_HOTEL_DISPUTED · HQ_PROXY_DISPUTED(개입 「호텔 이의(대리 입력)」) / 「Back」 → 인라인 패널 · review / 「Submit my own quote」 → 페이지 이동 · HTL-03 · E-80(① optional인데 서버는 3자 미만 거부 ② stale이면 Already handled)

#### `HTL-05 · loading · 대리 입력 확인 · 컴팩트` — 「Loading…」
#### `HTL-05 · done · 대리 입력 확인 · 컴팩트` — 「✓」 h2 「Quote confirmed」 · 「Thank you. Your quote is now part of the comparison for request MG-2610-014. You will receive the selection result by email once the organizer decides.」
#### `HTL-05 · used · 대리 입력 확인 · 컴팩트` — 「–」 h2 「Already handled」 · 「This quote has already been confirmed or flagged. No further action is needed.」 · E-80
#### `HTL-05 · expired · 대리 입력 확인 · 컴팩트` — 「–」 h2 「This confirmation link has expired」 · 「Confirmation links are valid for 72 hours. The quote entered on your behalf was not included in the comparison. …」 · 「Contact MICEGO」
#### `HTL-05 · invalid · 대리 입력 확인 · 컴팩트` — 「!」 h2 「This link is not valid」 · 「Part of the address is missing, or this link is no longer active. Please use the link from the original email, or contact MICEGO.」

### HTL-06 수신 거부 `en/unsubscribe.html?t=` — 태그 보조

#### `HTL-06 · confirm · 수신 거부 · PC`
- 배지 `HTL-06 · confirm · 거부 확인` · 스티커 S-HTL06(현재 confirm) · 들어오는 때: `unsubscribe(check)` = 아직 거부 전
- 블록: h1 「Stop invitation emails?」 · 「Stop MICEGO invitation emails for Ocean Pearl Resort Da Nang?」 · 「Selection results for quotes you already submitted will still be sent.」 · 「Unsubscribe」「Keep receiving」
- 분기: 「Unsubscribe」 → 인라인 패널 · done · `unsubscribe(confirm)`(열기만 해서는 거부 안 됨) / 「Keep receiving」 → 페이지 이동 · HTL-01(`index.html`) · 서버 없음
- 출처: 서버 `state`·`property` / 예시 값 호텔명
#### `HTL-06 · loading · 수신 거부 · 컴팩트` — 「Loading…」
#### `HTL-06 · done · 수신 거부 · 컴팩트` — 「✓」 h2 「You’re unsubscribed」 · 「You will no longer receive MICEGO invitation emails for this property. Selection results for quotes you already submitted will still be sent.」 · E-47(되돌릴 방법 없음, HTL_REMINDER는 거부 뒤에도 감)
#### `HTL-06 · already · 수신 거부 · 컴팩트` — 「–」 h2 「Already unsubscribed」 · 「This property is already unsubscribed from MICEGO invitation emails.」
#### `HTL-06 · invalid · 수신 거부 · 컴팩트` — 「!」 h2 「This link is not valid」 · 「Part of the address is missing, or this link is no longer active. Please use the link from the original email.」 · 「Contact MICEGO」 · E-48

---

## 4. 섹션 ③ HTL-01 · HTL-02 · HTL-07 (태그 보조)

전체 스크롤 랜딩은 B6. 여기 HTL-01 PC는 **머리글 + `#register` + 푸터**.

#### `HTL-01 · form · 호텔 랜딩 + 등록 폼 · PC`
- 태그 보조 + 보라 칩 G-3 · 배지 `HTL-01 · form · 등록 폼` · 스티커 S-HTL01(현재 form)
- 블록: 머리글(「MICEGO Partner」 · Why partner · How it works · Sample request · Partner terms · FAQ · 「여행사 | Hotels」 · 「Register」) · 눈썹 「05_REGISTER」 h2 「Register your property」 · 「Seven fields. A MICEGO partnerships manager reviews every registration and replies by email.」 · 「About 1 minute to complete. Fields marked * are required.」 · Hotel / property name *(e.g. Ocean Pearl Resort Da Nang) · City & country *(e.g. Da Nang, Vietnam) · Largest group you can accommodate *(Select · Under 50 pax · 50–99 pax · 100–199 pax · 200–499 pax · 500+ pax) + 「Approval currently requires capacity for groups of 50 or more.」 · Banquet / ballroom space *(Available / Not available) · Contact name *(e.g. Nguyen Van A) · Contact email *(name@hotel.com) · Contact phone (WhatsApp) (optional)(+84 ...) · 동의 「I agree that MICEGO may store these details to send matching MICE requests and to contact me about partnership. See our privacy notice.」 · 「Register your property」 · 「No listing fee to join or to receive requests. MICEGO earns a commission on confirmed bookings only, at a rate agreed when we approve your property. Your details are used only to send matching requests and to contact you about partnership.」
- 분기: 「Register your property」 → 인라인 패널 · HTL-01 done · `register_partner`(+Turnstile) · PTN_APPLIED / 머리글 「Register」 → 페이지 이동(같은 화면 `#register`) / 「privacy notice」 → 페이지 이동 · `privacy.html`
- 출처: 빌드 고정 · 서버(제출 전 없음)

#### `HTL-01 · done · 호텔 랜딩 + 등록 폼 · PC`
- 「Registration received.」 · 「A MICEGO partnerships manager will review your property and reply by email within 5 business days.」 · 「If your destination and capacity match a live request, you'll receive the brief directly — with a stated deadline, and no obligation to quote.」 · 「Questions in the meantime: mysteri1984@gmail.com」 · 신청번호(라벨 없이) · 「Copy my details」「Back to top」
- 분기: 「Copy my details」 → 인라인 패널 · 2초 「Copied」 / 「Back to top」 → 페이지 이동(같은 화면 `#hero`) · 출처: 서버 `partner_id` · E-5(신청 뒤 상태 화면 없음, `review_by` 안 씀)

#### `HTL-01 · form-error · 호텔 랜딩 + 등록 폼 · 컴팩트`
- 칸 아래 7개: 「Please enter the property name.」 「Please enter the city and country.」 「Please select a group size.」 「Please select an option.」 「Please enter a contact name.」 「Please enter a valid email address.」 「Please agree before submitting.」 · 서버 토스트 4: 「Too many attempts. Try again later.」 「Please check the highlighted fields.」 「We couldn't complete the bot check. Please reload and try again.」 「Temporary error. Please try again.」 · E-49

#### `HTL-01 · done-mailto · 호텔 랜딩 + 등록 폼 · 컴팩트`
- 신청번호 없음, 자동 외부 앱 · 메일 열림, 「Copy my details」

#### `HTL-01 · form · 호텔 랜딩 + 등록 폼 · 모바일`
- 폼 1열 · 하단 고정 「Register your property」

#### `HTL-02 · form · 견적 요청 예시 · PC`
- 배지 `HTL-02 · form · 예시 요건서 + 견적 폼` · 스티커 S-HTL02(현재 form) · 워터마크
- 블록: 머리글(「Register」) · 띠 「DEMO — Sample request page for demonstration purposes. Not a live RFP.」 · 「MICE QUOTE REQUEST · REF MG-2608-007 · New Request · Deadline: Day 4, 18:00 KST」 · h1 「New MICE quote request」 · 「An organizer has submitted a confirmed-date incentive program in Da Nang, Vietnam. …」 · 개요 Issued 「Day 1 · 09:00 KST」 · Quote deadline 「Day 4 · 18:00 KST (3 business days after the invitation)」 · Organizer response due 「Day 5」 · 요건서(날짜 「Mon – Thu, 3 nights」, Night 3 (Wed)) · 견적 폼(Taxes 질문·커미션 줄 없음) · 버튼 「Submit Quote」
- 분기: 「Submit Quote」 → 인라인 패널 · HTL-02 done-demo · 서버 없음 / Quote currency → 인라인 / 「Register」 → 페이지 이동 · HTL-01 / 「← Back to hotel mode」 → 페이지 이동 · HTL-01 `#sample` / FAQ·Contact → HTL-07
- 메모: 실제 견적 페이지와 다름(Taxes 질문·합의 커미션 줄 없음, 버튼 「Submit Quote」)

#### `HTL-02 · done-demo · 견적 요청 예시 · 컴팩트`
- 카드 「Quote submitted」 · 「Reference: MG-2608-007-BID-03」 · 「Demo only — no data was transmitted.」(새로고침해야 폼으로)

#### `HTL-07 · default · Contact MICEGO · PC`
- 스티커 S-HTL07(현재 default) · h1 「Contact MICEGO」 · 「Questions about a request, your partner registration or anything else — send us a note and we'll reply by email.」 · 상자 「Want to join the partner network? **Register your property**. Asking about a live request? Include its reference code (e.g. MG-2610-014).」 · Topic *(A live request or quote · Partner registration · Business partnership · Other) · Your name * · Email * · Property / company (optional) · Reference code (optional)(e.g. MG-2610-014) · Message * · 동의 「I agree that MICEGO may use my name, email and message to reply to this enquiry. See our privacy notice.」 · 「Review & send」
- 분기: 「Register your property」 → 페이지 이동 · HTL-01 `#register` / 「Review & send」 → 인라인 패널 · HTL-07 sent · `feedback-submit`(source=contact) + `contact` · FB_ACK
- 오류: 「Please choose a topic.」 「Please enter your name.」 「Please enter a valid email address.」 「Please write at least 10 characters.」 「Please confirm before sending.」 · E-38

#### `HTL-07 · sent · Contact MICEGO · 컴팩트`
- h2 「Message received」 · 「Reference: **FB-…**」 · 「We'll send a confirmation email shortly, and reply to the same address.」

#### `HTL-07 · variants · Contact MICEGO 오류 변형 · 컴팩트`
- 한 프레임에 4칸: error(칸 오류 5개) · rate_limited 토스트 「Too many messages just now. Please try again shortly.」 · failed 토스트(영문) · mailto 패널 「Send your message — two steps」(「Copy message」「Open email draft」「Edit」)

#### `HTL-07 · faq · Hotel FAQ · 컴팩트`
- h1 「Hotel partner FAQ」 · 4그룹 14문항: Partner approval(Who can join? · Can my listing be paused?) · The request link(How do I receive a request? · Do I need an account or a login? · When is the deadline? · Can I decline a request?) · Quoting(Can I revise my quote? · Which currency should I quote in? · What if I can't offer every room? · Should rates include taxes and service charge?) · After you submit(What does the organizer see? · How will I know if I was selected? · What are the commercial terms? · Who do I ask about a request?) · 질문 → 인라인 패널 · 답변 펼침

---

## 5. 프레임 수 (이 브리프)
- PC 17 · 컴팩트 32 · 모바일 4 · 모달 0 (합 53)
