## B. 호텔 화면 (en/)

호텔 화면은 모두 영어 화면이고 로그인이 없습니다. 이 묶음의 화면은 HTL-01·02·03·04·06입니다. HTL-05(대리 입력 확인)는 다른 작성자가, HTL-07(FAQ·문의)은 A 묶음이 씁니다.

공통 사항을 먼저 적습니다.

- 화면에 보이는 영어 문구는 「」 안에 그대로 옮기고, 설명은 한국어로 씁니다.
- 호텔 화면은 모두 개인 링크(`?t=`)나 공개 주소로 열립니다. 호텔 계정은 없습니다.
- `?state=` 미리보기는 `site.config.json`의 `demo`가 켜져 있을 때만 동작합니다(현재 `true`). 배포 때 끄는 일은 → 6-2.
- 이 묶음에서 새로 만든 미결은 E-40~E-49입니다. 기존 번호(E-1·E-5·E-7·E-10·E-17)와 A 묶음의 E-27 후보는 번호만 인용합니다.

---

### HTL-01 호텔 랜딩 + 등록 폼 `en/index.html` (`#register`) 〔보조〕
**왜 필요한가** 해외 호텔이 서비스를 이해하고 스스로 신청서를 내게 하는 화면입니다. **결정 대기**: 이 폼을 두지 않고 운영자가 호텔을 수동으로 등록하는 방식으로 대체할지 아직 정해지지 않았습니다(⑤).
**누가 · 어떻게 들어오나** 해외 호텔 담당자가 들어옵니다. 허브(HUB-01)에서 호텔 모드를 고르거나, 다른 en 화면 헤더의 「Register」를 눌러 들어옵니다. 앞의 경로는 페이지 이동, 뒤의 경로는 `#register`로 같은 화면 안에서 이동합니다.
**나가는 길**
- 「Register your property」(제출) → 같은 화면의 성공 패널 (인라인 패널)
- 「Open the full sample request page」 → HTL-02 (페이지 이동)
- 약관 요약의 링크 → `terms.html` (페이지 이동)
- 「Copy my details」 → 클립보드 복사, 화면은 그대로 (인라인 패널)
- 데모·메일 앱 방식일 때 제출 → 메일 앱이 열림 (외부 앱, → 6-2)

**데이터**
- 서버 응답: `partner_id`(신청번호, 예: PT-2609-007 형식)와 `review_by`(심사 기한)를 받습니다. 화면에는 `partner_id`만 씁니다.
- 빌드 때 고정: 소개 문구, 약관 요약, FAQ, 「within 5 business days」 안내, 정원 안내문.
- 예시값(미연결): 없음.

**Figma** `HTL-01 · form` · `HTL-01 · form-error` · `HTL-01 · done` · `HTL-01 · done-mailto` (코드에 `data-state`가 없어 Figma용으로 붙인 이름) | **코드 근거** `src/micego-hotel-partner-landing.html`(`validate`), `build2.py` 58~140행(`PTN_SUBMIT_NEW`, `mgRegisterPartner`), `supabase/functions/register_partner/handle.ts`, `assets/mg.js`(Turnstile)

① 화면 상태
| 상태(slug) | 화면 이름 | 언제 들어오나 | 보이는 것 | 할 수 있는 일 |
|---|---|---|---|---|
| form | 등록 폼 | 화면을 열었을 때 | 7개 필수 입력과 선택 입력 1개, 안내문 「No listing fee to join or to receive requests…」 | 입력, 제출, 샘플 보기 |
| form-error | 검증 오류 | 제출을 눌렀는데 클라이언트 검증이 실패했을 때, 또는 서버가 `VALIDATION`을 돌려줬을 때 | 틀린 칸이 빨갛게 바뀌고 칸 아래에 오류 문구가 보임 | 고쳐서 다시 제출 |
| done | 등록 접수됨 | `register_partner`가 성공했을 때 | 「Registration received.」, 5영업일 안내, 신청번호(라벨 없이 번호만) | 「Copy my details」, 「Back to top」 |
| done-mailto | 접수됨(메일 앱 방식) | 데모 설정이거나 API 설정이 없을 때 제출하면 메일 앱을 열고 곧바로 | 위와 같음, 신청번호 없음 | 메일 앱에서 직접 보내야 함 (→ 6-2) |

Turnstile 확인은 별도 화면이 아닙니다. 사이트 키가 있고 API 설정일 때만 제출 직전에 로드하고, 사람 확인이 필요하면 화면 아래 가운데에 작은 위젯이 뜹니다(`appearance: interaction-only`). 키가 없으면 외부 요청이 0건입니다.

② 요소
| 요소 「화면 문구」 | 왜 있나 | 기본 | 비활성 | 진행 중 | 완료 | 오류 | 누르면 (이동 방식 → 결과) |
|---|---|---|---|---|---|---|---|
| 헤더 「Register」 | 폼으로 바로 가기 | 보임 | — | — | — | — | 같은 화면 `#register`로 스크롤 (인라인) |
| 「Register your property」 | 신청 제출 | 보임 | — | 없음(제출 중 비활성 처리 코드 없음, E-49) | 폼이 사라지고 성공 패널 | 칸별 오류 문구, 서버 오류는 하단 토스트 3.2초 (→ 6-5) | 인라인 패널: 검증 → 통과하면 `register_partner` 호출 |
| 「About 1 minute to complete. Fields marked * are required.」 | 소요 시간 안내 | 보임 | — | — | — | — | — |
| 「Approval currently requires capacity for groups of 50 or more.」 | 정원 기준 미리 알림 | 정원 칸 아래 | — | — | — | — | — |
| 「Open the full sample request page」 | 호텔이 받게 될 화면 미리 보기 | 보임 | — | — | — | — | 페이지 이동 → HTL-02 |
| 성공 패널의 「Copy my details」 | 접수 내용을 호텔이 보관 | 보임 | — | — | 버튼 문구가 2초 동안 「Copied」로 바뀜 | 복사에 실패하면 읽기 전용 입력칸이 열림 (추정) | 인라인 패널: 입력한 값을 클립보드에 복사 |
| 성공 패널의 「Back to top」 | 처음으로 | 보임 | — | — | — | — | 같은 화면 `#hero`로 이동 (인라인) |

등록 폼 필드 (`#registerForm`, 서버 `register_partner`)
| 필드 | 필수 | 입력 방식 | 검증 | 오류 문구 |
|---|---|---|---|---|
| `hotelName` 「Hotel / property name」 | 필수 | 한 줄 입력, 예 「Ocean Pearl Resort Da Nang」 | 클라이언트·서버 모두 공백을 뺀 뒤 1자 이상 | 「Please enter the property name.」 |
| `hotelLocation` 「City & country」 | 필수 | 한 줄 입력, 예 「Da Nang, Vietnam」 | 같음 | 「Please enter the city and country.」 |
| `groupCapacity` 「Largest group you can accommodate」 | 필수 | 선택 목록: 「Under 50 pax」「50–99 pax」「100–199 pax」「200–499 pax」「500+ pax」 | 클라이언트는 빈 값 거부. 서버는 비어 있지 않은 문자열이면 통과(목록 값인지 확인 안 함). 서버는 문자열 속 첫 숫자를 정원 숫자(`cap`)로 저장하므로 「Under 50 pax」도 50으로 저장됨 | 「Please select a group size.」 |
| `banquetSpace` 「Banquet / ballroom space」 | 필수 | 칩 라디오: 「Available」「Not available」 | 서버는 두 값과 정확히 같아야 통과 | 「Please select an option.」 |
| `contactName` 「Contact name」 | 필수 | 한 줄 입력 | 1자 이상 | 「Please enter a contact name.」 |
| `contactEmail` 「Contact email」 | 필수 | 이메일 입력 | 클라이언트는 `@`와 `.`이 있는 형태. 서버는 점 뒤가 2자 이상이어야 함(`a@b.c`는 클라이언트만 통과). 서버는 소문자로 바꿔 저장 | 「Please enter a valid email address.」 |
| `contactPhone` 「Contact phone (WhatsApp)」 | 선택 | 전화 입력, 예 「+84 ...」 | 검증 없음 | — |
| `consent` 「I agree that MICEGO may store these details to send matching MICE requests and to contact me about partnership.」 | 필수 | 체크박스 | 서버는 `true`여야 함 | 「Please agree before submitting.」 |
| (숨김) `idem` | 시스템 | 제출마다 만드는 UUID | 같은 값이 다시 오면 기존 신청번호를 돌려줌 | — |
| (숨김) `turnstile_token` | 시스템(키 설정 시) | Turnstile이 발급 | 서버 시크릿이 있으면 필수, 없으면 검사 안 함 | 토스트 「We couldn't complete the bot check. Please reload and try again.」 |

서버가 돌려주는 오류와 화면 반응
| 오류 코드 | 조건 | 화면 |
|---|---|---|
| `RATE_LIMITED` | 같은 IP에서 1시간에 5회 초과. 필드 검증보다 먼저 셈 | 토스트 「Too many attempts. Try again later.」 |
| `VALIDATION` | 위 표의 서버 검증 실패 | 틀린 칸 빨갛게 + 토스트 「Please check the highlighted fields.」 |
| `TURNSTILE_FAILED` | 시크릿이 있는데 토큰이 없거나 검증 실패 | 토스트 (위 문구) |
| `INTERNAL` | 그 밖의 서버 오류 | 토스트 「Temporary error. Please try again.」 |

③ 상태 전환
| 지금 | 누가·무엇을 (조건) | 다음 | 화면에서 바뀌는 것 | 알림 | 서버 호출 |
|---|---|---|---|---|---|
| form | 호텔이 제출, 검증 통과 | done | 폼이 숨고 성공 패널이 열림, 신청번호 표시 | PTN_APPLIED (신청 호텔 담당자 이메일, 즉시) | `register_partner` → `partners` 행을 `pending`으로 만들고 이력에 「신청 접수」 기록, 심사 기한은 5영업일 뒤 |
| form | 같은 이메일·같은 호텔명으로 `pending` 신청이 이미 있음 | done | 기존 신청번호가 그대로 보임 | 없음(새 메일을 보내지 않음) | `register_partner` (새 행을 만들지 않고 기존 값 반환) |
| form | 데모·API 없음 | done-mailto | 메일 앱이 열리고 성공 패널이 보임 | 없음 | 없음 (→ 6-2) |
| (화면 밖) pending | 운영자가 승인(요율 입력 필수) | approved | 이 화면은 그대로 | PTN_APPROVED (요율 동의 링크 포함 → HTL-04) | 운영 콘솔 호텔 화면 |
| (화면 밖) pending | 운영자가 거절(사유 필수) | rejected | 그대로 | PTN_REJECTED | 운영 콘솔 호텔 화면 |
| (화면 밖) suspended | 운영자가 재승인 | approved | 그대로 | PTN_REINSTATED | 운영 콘솔 호텔 화면 |

④ 숨김·보안 — 이 화면에 절대 나오면 안 되는 정보
- 커미션 요율 숫자. 랜딩은 「a rate agreed when we approve your property」까지만 말합니다.
- 요청자 정보와 견적 요청 내용. 이 화면은 초대 전 공개 화면입니다.
- 서버 응답에는 다른 신청자의 정보가 없습니다. 응답은 `partner_id`와 `review_by`뿐입니다.
- IP는 해시로만 저장하며(`source.ip_hash`) 화면에는 나오지 않습니다.

⑤ 미결
- **결정 대기** 운영자 수동 등록으로 대체할지. 대체하면 이 폼, `register_partner`, PTN_APPLIED가 MVP에서 빠지고 랜딩 소개만 남습니다. 승인·요율 입력·HTL-04 흐름은 그대로 필요합니다.
- **결정 대기** 50명 미만 신청을 폼에서 막을지. 지금은 「Under 50 pax」를 고를 수 있고 안내문만 있습니다. 서버는 거르지 않아 심사에서 반려해야 합니다.
- 결함 E-5 신청 뒤 상태를 확인할 화면이 없습니다. 성공 패널은 심사 기한(`review_by`)을 받고도 쓰지 않고 「within 5 business days」 고정 문구만 보여 줍니다. 신청번호도 라벨 없이 번호만 나옵니다.
- 결함 E-49 제출 버튼을 연속으로 누르는 것을 막지 않습니다. 이 화면은 서버가 같은 이메일·호텔명의 `pending` 신청을 합쳐 주지만, 견적 제출(HTL-03)은 그렇지 않습니다.
- (추정) Turnstile은 사이트 키(`site.config.json`의 `turnstile.siteKey`)와 서버 시크릿 `TURNSTILE_SECRET`이 모두 있어야 보호가 됩니다. 사이트 키 빌드를 먼저 배포하고 시크릿을 나중에 넣습니다. 지금 사이트 키는 비어 있습니다.
- 문의 메일 주소가 개인 주소(mysteri1984@gmail.com)로 박혀 있습니다. 공식 메일이 정해지면 `site.config.json`으로 바꿉니다(→ 6-2).

---

### HTL-02 견적 요청 예시 페이지 `en/sample-request.html` 〔보조〕
**왜 필요한가** 호텔이 승인 전에 요건서와 견적 폼이 어떻게 생겼는지 미리 봅니다. 신청을 망설이는 호텔의 이탈을 줄입니다.
**누가 · 어떻게 들어오나** 해외 호텔 담당자가 HTL-01의 「Open the full sample request page」(페이지 이동)로 들어옵니다.
**나가는 길**
- 헤더 「Register」 → HTL-01 `#register` (페이지 이동)
- 하단 「← Back to hotel mode」 → HTL-01 `#sample` (페이지 이동)
- 푸터 「FAQ」「Contact」 → HTL-07 (페이지 이동)

**데이터** 전부 예시값입니다(REF MG-2608-007, 다낭 일정, 날짜는 「Day 1」「Day 4」로 표기, 서버 호출 없음). 
**Figma** `HTL-02 · form` · `HTL-02 · done-demo` | **코드 근거** `build.py` 286행 부근(`sample()`), `build2.py` 337~344행(문구 보정)

① 화면 상태
| 상태(slug) | 화면 이름 | 언제 들어오나 | 보이는 것 | 할 수 있는 일 |
|---|---|---|---|---|
| form | 예시 요건서 + 견적 폼 | 화면을 열었을 때 | 상단 띠 「DEMO — Sample request page for demonstration purposes. Not a live RFP.」, 요건서, 견적 폼 | 폼을 채워 보기 |
| done-demo | 제출 완료(데모) | 검증을 통과한 뒤 「Submit Quote」를 눌렀을 때 | 폼이 「Quote submitted」 카드로 바뀜, 「Reference: MG-2608-007-BID-03」, 「Demo only — no data was transmitted.」 | 없음(새로고침해야 폼으로 돌아감) |

② 요소
| 요소 「화면 문구」 | 왜 있나 | 기본 | 비활성 | 진행 중 | 완료 | 오류 | 누르면 (이동 방식 → 결과) |
|---|---|---|---|---|---|---|---|
| 「Submit Quote」 | 폼 흐름을 끝까지 체험 | 보임 | — | — | 데모 완료 카드 | 칸별 오류 문구 | 인라인 패널: 서버 호출 없이 카드만 바뀜 |
| 통화 선택 「Quote currency」 | 통화별 입력 예시 체험 | 「USD」 | — | — | — | — | 인라인 패널: 입력칸 접두어·예시값이 바뀜 |

③ 상태 전환
| 지금 | 누가·무엇을 (조건) | 다음 | 화면에서 바뀌는 것 | 알림 | 서버 호출 |
|---|---|---|---|---|---|
| form | 호텔이 「Submit Quote」, 검증 통과 | done-demo | 카드 교체 | 없음 | 없음 |

④ 숨김·보안 — 이 화면에 절대 나오면 안 되는 정보
- 실제 견적 요청의 내용, 실제 요청자 정보, 실제 호텔의 요율. 이 화면은 정적 예시입니다.

⑤ 미결
- (추정) 예시 폼과 실제 견적 페이지(HTL-03)가 어긋나 있습니다. 예시 폼에는 「Taxes & service charge」 질문과 합의 커미션 한 줄이 없습니다(`f-tax` 없음). 버튼 문구도 다릅니다(「Submit Quote」 대 「Review & send quote」). REF도 다릅니다(MG-2608-007 대 MG-2610-014).
- 〔다음 단계〕 예시와 실제 견적 페이지가 한 원본을 쓰도록 합칠지는 검증 뒤에 정합니다.

---

### HTL-03 견적 페이지 `en/bid.html?t=` 〔MVP 핵심〕
**왜 필요한가** 초대받은 호텔이 로그인 없이 요건서를 읽고 견적을 내거나 거절하고, 결과까지 확인하는 화면입니다. 견적이 이 화면에서 들어와야 비교표와 선택이 돌아갑니다.
**누가 · 어떻게 들어오나** 승인 호텔 담당자가 들어옵니다. 초대 메일(HTL_INVITE), 마감 24시간 전 메일(HTL_REMINDER), 접수 확인(HTL_QUOTE_RECEIVED), 결과 메일(HTL_SELECTED_CONNECT·HTL_NOT_SELECTED)에 같은 개인 링크(`HOTEL_BID_URL`)가 들어 있습니다. 링크를 누르면 페이지 이동으로 열립니다. 로그인은 없고, 링크를 연 것이 곧 인증입니다. 처음 열면 초대 상태가 「초대됨」에서 「열람함」으로 바뀝니다.
**나가는 길**
- 「Contact MICEGO」 → HTL-07 문의 (페이지 이동)
- 「Hotel FAQ」 → HTL-07 FAQ (페이지 이동)
- 동의 문구의 「partner terms」 → `terms.html` (새 탭, 페이지 이동)
- 동의 문구의 「privacy notice」 → `privacy.html` (새 탭, 페이지 이동)
- 「Email us」(잘못된 링크 화면) → 메일 앱 (외부 앱)
- 「Open email draft」(메일 앱 방식일 때) → 메일 앱 (외부 앱, → 6-2)

**데이터**
- 서버 응답(`get_bid`): `ref`, `state`, `can_revise`, `round`, `deadline_at`, `min_valid_until`, `request`(목적지·행사 유형·날짜·박수·인원 구간·객실 수·연회장·`public_memo`·`prev_deadline`·`change_summary`), `hotel`(본인 연락처), `quote`(본인 견적), `proxy`, `commission`, `organizer`(선정됐을 때만).
- 화면에 실제로 채워지는 값: `state`, `ref`(상단 바), `commission`(견적 폼 아래 한 줄), `organizer`(선정 화면의 4칸), 「Revise your quote」를 눌렀을 때의 `quote` 일부.
- 빌드 때 고정(예시값): 제목 「MICE quote request — Da Nang, Vietnam」, 요건서 전체, 마감·발행·알림 일시(「Thu 8 Oct 2026, 18:00 KST」 등), 「All 80 rooms available」, 제출 견적 요약, 동의 문구 속 REF(「MG-2610-014」). 서버가 값을 주는데 화면이 쓰지 않습니다(E-1).

**Figma** `HTL-03 · loading` · `open` · `submitted` · `declined` · `selected` · `not_selected` · `expired` · `cancelled` · `invalid` | **코드 근거** `build2.py` `BID_STATES`(408행), `BID_TOP`·`BID_BODY`·`BID_END`·`BID_JS`(약 850~1027행), `supabase/functions/get_bid/handle.ts`(상태 판정 55~62행), `submit_quote/handle.ts`, `decline_bid/handle.ts`, `src/micego-hotel-bid-page.html`(폼 원본)

① 화면 상태 — 화면 상태는 9개입니다(`BID_STATES`). 서버가 정해 주는 것은 7개이고, `invalid`와 `loading`은 화면이 스스로 만듭니다.
| 상태(slug) | 화면 이름 | 언제 들어오나 | 보이는 것 | 할 수 있는 일 |
|---|---|---|---|---|
| loading | 불러오는 중 | API 설정에서 링크를 열었을 때. `get_bid` 응답이 오면 바뀜 | 「Loading…」 한 줄 | 없음 |
| open | 견적 받는 중 | 초대가 「초대됨」·「열람함」일 때. 대리 입력 중인 초대(「대리 입력·호텔 확인 대기」·「호텔 이의」·「호텔 확인 기한 지남」)도 여기로 옴 | 상단 배지 「Deadline … KST」「Open for quotes」, 요건서, 견적 폼, 거절 카드, 다음 단계 3칸 | 견적 제출, 견적 거절 |
| submitted | 견적 제출함 | 초대가 「견적 제출」·「호텔 확인 완료」이고 아직 결과가 없을 때 | 배지 「Quote received」, 「Your quote is in」, 제출 견적 요약, 요건서, 다음 단계 | 「Revise your quote」 |
| declined | 견적 거절함 | 초대가 「견적 거절」일 때 | 배지 「Declined」, 「You declined this request」 | 문의, FAQ |
| selected | 선정됨 | 견적 요청이 「성사」이고 이 초대의 결과가 「선정」일 때 | 배지 「Selected」, 「Your proposal was selected」, 「Organizer contact」 카드(회사·담당자·이메일·전화), 제출 견적 요약 | 요청자에게 직접 연락(메일 밖) |
| not_selected | 미선정 | 견적 요청이 「성사」이고 이 초대는 견적을 낸 뒤 선정되지 않았을 때 | 배지 「Not selected」, 「Not selected this time」, 제출 견적 요약 | 없음 |
| expired | 기한 지남 | 초대가 「기한 지남」이거나 「재초대로 대체됨」일 때 | 배지 「Expired」, 「This invitation has expired」 | 문의, FAQ |
| cancelled | 취소됨 | 견적 요청이 「취소됨」일 때 | 배지 「Cancelled」, 「This request was cancelled」 | 없음 |
| invalid | 링크 오류 | 주소의 `t`가 4~64자의 영문·숫자·`_`·`-`가 아닐 때(서버 호출 없이), 또는 `get_bid`가 어떤 오류든 돌려줬을 때(E-48) | 「This link can't be opened」 | 「Contact MICEGO」, 「Email us」 |

서버 판정 순서(`get_bid`, 위에서부터 처음 맞는 것): 견적 요청이 「취소됨」 → cancelled / 초대가 「재초대로 대체됨」·「기한 지남」 → expired / 「견적 거절」 → declined / 요청 「성사」+선정 → selected / 요청 「성사」+초대 「견적 제출」·「호텔 확인 완료」 → not_selected / 초대 「견적 제출」·「호텔 확인 완료」 → submitted / 그 밖 전부 → open.
다음 경우는 판정에 없어서 아래 상태로 떨어집니다.
- 요청이 「미성사」·「비교표 전달됨」·「견적 정리 중」일 때 견적을 낸 호텔은 submitted(「Quote received」)로 보입니다. 「미성사」 처리가 호텔에게 전달되지 않습니다(E-27 후보).
- 요청이 「성사」인데 대리 입력 중이던 초대는 open으로 떨어집니다(E-42).
- 마감 시각이 지났어도 초대가 아직 「초대됨」·「열람함」이면 open입니다(E-43).

미리 보기: 데모 설정일 때 `?state=<slug>&t=<아무 토큰>`으로 어느 상태든 볼 수 있습니다. `?state=`가 목록에 없으면 invalid입니다.

② 요소
| 요소 「화면 문구」 | 왜 있나 | 기본 | 비활성 | 진행 중 | 완료 | 오류 | 누르면 (이동 방식 → 결과) |
|---|---|---|---|---|---|---|---|
| 상단 바 「MICE QUOTE REQUEST · REF {REF}」 | 어느 견적 요청인지 알림 | open·submitted·declined·selected·not_selected·expired·cancelled에서 보임 | — | — | — | — | — (표시만) |
| 상태 배지 | 지금 상태를 한눈에 | 위 ①의 배지 문구 | — | — | — | — | — |
| 마감 배지 「Deadline Thu 8 Oct 2026, 18:00 KST」 | 견적 마감 알림 | open·submitted에서 보임 | — | — | — | — | — |
| 제목 「MICE quote request — Da Nang, Vietnam」와 설명 | 요청 개요 | open·submitted에서 보임 | — | — | — | — | — |
| 개요 4칸 「Issued」「Quote deadline」「Reminder email」「Comparison sent to organizer」 | 일정 한눈에 | open·submitted에서 보임 | — | — | — | — | — |
| 안내 「Why some details are hidden.」 | 신원이 빠진 이유 설명 (→ 6-1) | open·submitted에서 보임 | — | — | — | — | — |
| 안내 「About this link.」 | 개인 링크·열람 기록·전달 금지 안내 | open·submitted에서 보임 | — | — | — | — | — |
| 「1 Requirements」 요건서 | 호텔이 견적을 맞출 기준 | 읽기 전용 | — | — | — | — | — |
| 「Quote currency」 | 견적 통화 선택 | open에서 「USD」 | — | — | — | 칸이 빨갛게 바뀜(전용 문구 없음, 서버가 지원하지 않는 통화를 거절했을 때) | 인라인 패널: 입력칸 접두어와 예시값이 선택한 통화로 바뀜 |
| 견적 폼 (아래 필드 표) | 견적 입력 | open에서 보임 | — | 서버 호출 중 표시 없음(E-49) | 토스트 「Quote submitted.」 2.2초, submitted로 바뀜 | 칸별 오류 문구 + 토스트 (→ 6-5) | — |
| 「Your agreed commission: 10% of net booking value.」 | 합의한 커미션을 견적 때 다시 알림 | `commission`이 있을 때만 폼 아래 문구에 붙음 | — | — | — | `commission`이 없으면 숨김 | — |
| 「Review & send quote」 | 견적 제출 | open에서 보임 | — | 없음 | submitted로 바뀜 | 첫 오류 칸으로 부드럽게 스크롤 + 포커스 | API 설정: 검증 후 `submit_quote` 호출. 메일 앱 방식: 검증 후 「Send your quote — two steps」 패널이 폼을 대신함 (인라인 패널) |
| 「Copy quote details」 | 메일 앱이 긴 글을 자를 때를 대비한 복사본 (메일 앱 방식만) | 보임 | — | — | 「Copied」 | 「Select the text below and copy it manually」 | 인라인 패널: 견적 내용을 클립보드에 복사 |
| 「Open email draft」 | 메일 앱 방식의 제출 | 보임 | — | — | — | — | 외부 앱: 운영 수신함 주소로 쓴 메일 초안이 열림 (→ 6-2) |
| 「Edit quote」 | 폼으로 돌아가기 (메일 앱 방식만) | 보임 | — | — | — | — | 인라인 패널: 보내기 패널을 닫고 폼을 다시 엶 |
| 「Revise your quote」 | 마감 전에 견적 고치기 | submitted에서 보임(마감 뒤에도 그대로 보임, E-7) | — | — | — | — | 인라인 패널: open 화면으로 바뀌고 폼에 이전 값 일부가 채워짐(서버 호출 없음, E-40) |
| 「Your submitted quote」 | 낸 견적 확인 | submitted·selected·not_selected에서 보임 | — | — | — | — | — (예시값, E-1) |
| 거절 카드 「Can't quote on this one?」 | 못 내는 견적을 빨리 접을 수 있게 | open에서만 보임 | — | — | — | — | — |
| 「Reason」 선택 | 거절 사유 | 「Select a reason」 | — | — | — | 「Please choose a reason.」 | — |
| 「Anything we should know?」 | 거절 보충 설명 | 빈 칸, 선택 입력 | — | — | — | — | — |
| 「Review & decline」 | 견적 거절 제출 | open에서 보임 | — | 표시 없음(E-49) | declined로 바뀜 | 토스트 | API 설정: 사유 검증 후 `decline_bid` 호출. 메일 앱 방식: 거절 메일 패널이 폼을 대신함 (인라인 패널) |
| 거절 메일 패널 「Send your decline」의 「Open email draft」「Copy text」「Back」「I've sent it」 | 메일 앱 방식의 거절 (→ 6-2) | 보임 | — | — | 「I've sent it」을 누르면 declined 화면으로 바뀜(서버 확인 없음) | — | 각각 외부 앱 / 복사 / 폼 복귀 / 화면 상태만 변경 |
| 다음 단계 3칸 「1 · Quotes checked」「2 · Comparison sent」「3 · Introduction」 | 이후 흐름 안내 | open·submitted에서 보임 | — | — | — | — | — |
| 종료 패널 제목 「You declined this request」「This invitation has expired」「This request was cancelled」「Not selected this time」「Your proposal was selected」 | 결과 안내 | 해당 상태에서 보임 | — | — | — | — | — |
| 「Organizer contact」 카드 (「Company」「Contact」「Email」「Phone」) | 선정된 호텔만 요청자에게 연락 | selected에서만 서버 값으로 채워짐 | — | — | — | — | — |
| 「Contact MICEGO」「Hotel FAQ」 | 종료 화면의 출구 | declined·expired·cancelled·not_selected·selected에서 보임 | — | — | — | — | 페이지 이동 → HTL-07 |
| 「Contact MICEGO」「Email us」 | 잘못된 링크의 출구 | invalid에서 보임 | — | — | — | — | 페이지 이동 → HTL-07 / 외부 앱 (메일 초안 제목 「[MICEGO] Request link not opening」) |

견적 폼 필드 — 클라이언트는 `BID_JS`의 `validate()`, 서버는 `submit_quote`입니다. 숫자 입력칸은 모두 `min="0"`이지만 `novalidate` 폼이라 브라우저가 막지 않습니다.
| 필드 | 필수 | 입력 방식 | 클라이언트 검증 | 서버 검증 | 오류 문구 |
|---|---|---|---|---|---|
| `currency` 「Quote currency」 | 필수 | 선택 목록 12종: USD, THB, VND, IDR, MYR, PHP, SGD, JPY, TWD, HKD, KRW, EUR (D-45). 기본 USD | 없음(목록에서만 고름) | 영문 대문자 3자이고 `settings.supported_currencies`에 있어야 함(설정이 없으면 형식만 봄). 지원하지 않는 통화는 DB의 저장 검사(0018)도 막음 | 전용 문구 없음. 토스트 「Please check the highlighted fields.」 |
| `twinRate` 「Twin room rate — per room, per night」 | 필수 | 숫자 입력(통화 접두어), 예 「e.g. 145」 | 비어 있지 않고, 숫자이며, 0 이상 | 숫자이고 0 이상 | 「Enter a rate of 0 or more.」 |
| `kingRate` 「King room rate — per room, per night」 | 필수 | 숫자 입력 | 같음 | 같음 | 「Enter a rate of 0 or more.」 |
| `breakfast` 「Breakfast」 | 필수 | 칩 라디오 「Included in rate」「Not included」 | 하나 선택 | `included`·`not_included` 중 하나 | 「Please select an option.」 |
| `breakfastSupplement` 「Breakfast supplement — per person, per night」 | 선택 | 숫자 입력. 「Not included」를 고르면 나타남 | 없음. 칸이 숨겨져도 이미 쓴 값은 그대로 전송됨 | 숫자가 아니면 빈 값으로 처리하고, 음수도 막지 않음 | — |
| `tax` 「Taxes & service charge」 | 필수 | 칩 라디오 「Included in all rates」「Not included」 | 하나 선택 | `included`·`not_included` 중 하나 | 「Please select an option.」 |
| `taxNote` 「Taxes and charges to add」 | 「Not included」일 때만 필수 | 한 줄 입력, 예 「e.g. 5% service charge + 8% VAT」 | 공백을 뺀 뒤 3자 이상 | 같음 | 「Please state the percentages.」 |
| `availability` 「Rooms available for these dates」 | 필수 | 칩 라디오 「All 80 rooms available」「Partially available」(「80」은 고정 문구, E-1) | 하나 선택 | `all`·`partial` 중 하나 | 「Please select an option.」 |
| `availabilityNotes` 「Availability notes」 | 선택 | 여러 줄 입력. 「Partially available」를 고르면 나타남 | 없음 | 없음(길이 제한 없음) | — |
| `ballroomFee` 「Ballroom rental fee — total for the evening」 | 필수 | 숫자 입력 | 비어 있지 않고 0 이상 | 숫자이고 0 이상 | 「Enter a fee of 0 or more.」 |
| `ballroomName` 「Ballroom name & capacity」 | 필수 | 한 줄 입력, 예 「e.g. Grand Ballroom, 300 pax banquet」 | 1자 이상 | 1자 이상 | 「Please enter the ballroom name and capacity.」 |
| `fnbMinimum` 「F&B minimum — per person」 | 선택 | 숫자 입력 | 없음 | 숫자가 아니면 빈 값, 음수도 막지 않음 | — |
| `ballroomIncludes` 「Included in rental (AV, staging, setup)」 | 선택 | 여러 줄 입력 | 없음 | 없음 | — |
| `validUntil` 「Quote valid until」 | 필수 | 날짜 선택. `min`은 `2026-10-12`로 고정 | 비어 있지 않고 `2026-10-12` 이상(고정값, E-41) | `YYYY-MM-DD` 형식이고, 견적 마감에서 2영업일 뒤(`min_valid_until`) 이상. 마감 정보가 없으면 형식만 봄 | 「Please keep the quote valid at least until Mon 12 Oct 2026.」(고정 문구) |
| `cancellation` 「Cancellation policy」 | 필수 | 여러 줄 입력 | 공백을 뺀 뒤 5자 이상 | 같음 | 「Please describe your cancellation policy.」 |
| `additionalProposals` 「Additional proposals」 | 선택 | 여러 줄 입력 | 없음 | 없음 | — |
| `hotelName` 「Hotel / property name」 | 필수 | 한 줄 입력(승인 때 등록한 호텔명이 자동으로 채워지지 않음) | 1자 이상 | 1자 이상 | 「Please enter the property name.」 |
| `contactName` 「Contact name」 | 필수 | 한 줄 입력 | 1자 이상 | 1자 이상 | 「Please enter a contact name.」 |
| `contactEmail` 「Contact email」 | 필수 | 이메일 입력 | `@`와 `.`이 있는 형태 | 점 뒤 2자 이상. 소문자로 바꿔 저장 | 「Please enter a valid email address.」 |
| `contactPhone` 「Contact phone (WhatsApp)」 | 선택 | 전화 입력 | 없음 | 없음 | — |
| `consent` 동의 문구 | 필수 | 체크박스. 문구는 「I confirm the rates and terms above are accurate, accept the MICEGO partner terms, and agree they may be shared with the organizer under reference MG-2610-014. My property name and contact details are disclosed to the organizer only if they select this proposal.」(REF는 고정값, E-1) | 체크됨 | `true` | 「Please confirm before submitting.」 |

`submit_quote`가 필드 검증보다 먼저 보는 조건 (실패하면 토스트, → 6-5)
| 오류 코드 | 조건 | 토스트 문구 |
|---|---|---|
| `TOKEN_INVALID` | 링크가 없는 값 | 「This link is not valid.」 |
| `STATE_CONFLICT` | 초대가 「초대됨」·「열람함」·「견적 제출」·대리 입력 4종이 아님, 또는 견적 요청이 「초대 준비」·「견적 받는 중」·「견적 정리 중」이 아님(비교표 전달 뒤에는 수정 불가) | 「The request has changed. Please reload.」 |
| `DEADLINE_PASSED` | 초대별 견적 마감(없으면 견적 요청의 마감)이 지남 | 「The quote deadline has passed.」 |
| `RATE_LIMITED` | 같은 링크에서 1시간에 30회 초과 (→ 6-4) | 「Too many attempts. Try again later.」 |
| `VALIDATION` | 위 필드 표의 서버 검증 실패 | 틀린 칸 빨갛게 + 「Please check the highlighted fields.」 |

거절 폼 필드 (`decline_bid`)
| 필드 | 필수 | 입력 방식 | 검증 | 오류 문구 |
|---|---|---|---|---|
| `dreason` 「Reason」 | 필수 | 선택 목록 「Dates unavailable」「Capacity doesn't fit」「Other」 | 클라이언트: 선택함. 서버: 세 값 중 하나(아니면 `VALIDATION`, 칸 이름 `reason`) | 「Please choose a reason.」 |
| `dnote` 「Anything we should know?」 | 선택 | 여러 줄 입력, 예 「e.g. Fully booked 15–17 Mar」 | 없음(길이 제한 없음) | — |

서버 조건: 초대가 「초대됨」·「열람함」일 때만 거절됩니다(아니면 `STATE_CONFLICT`). 견적 마감 뒤에는 `DEADLINE_PASSED`입니다. 같은 링크에서 1시간에 10회를 넘으면 `RATE_LIMITED`입니다. 이미 견적을 낸 호텔은 거절할 수 없습니다.

③ 상태 전환
| 지금 | 누가·무엇을 (조건) | 다음 | 화면에서 바뀌는 것 | 알림 | 서버 호출 |
|---|---|---|---|---|---|
| (초대 전) | 운영자가 콘솔에서 「초대 보내기」(초대 준비·견적 받는 중 어느 쪽이든) 또는 「재초대」를 누름. 「견적 받기 시작」 전이 자체는 호텔 메일을 보내지 않음 | open | 호텔에 새 개인 링크가 생김 | HTL_INVITE (호텔 담당자 이메일, 즉시. 마감·합의 요율 한 줄·수신 거부 링크 포함. 라운드 2 이상이면 변경 요약·이전 마감 포함) | 운영 콘솔 초대 (요율 합의가 안 된 호텔은 초대에서 빠지고 모두 빠지면 `COMMISSION_NOT_AGREED`) |
| (처음 열기) | 호텔이 링크를 엶 | loading → open | 초대 상태가 「열람함」으로 바뀜 | 없음 | `get_bid` (조회와 함께 열람 시각 기록, 1분에 60회·이 IP에서 틀린 링크는 10분에 20회까지 → 6-4) |
| loading | 응답이 옴 | 응답의 `state` (7종) | 해당 상태 화면 | 없음 | `get_bid` |
| loading | 링크 형식 오류, `TOKEN_INVALID`, 그 밖의 모든 오류 | invalid | 「This link can't be opened」 | 없음 | `get_bid` (E-48) |
| open | 마감 24시간 전, 아직 견적도 거절도 없음 | open (변화 없음) | 화면은 그대로 | HTL_REMINDER (호텔 담당자 이메일, 초대당 1회, 자동. 10분마다 도는 시스템 작업이 큐에 넣고 1분마다 도는 발송 작업이 보냄) | 시스템 작업 (수신 거부한 호텔에게도 감, E-47) |
| open | 호텔이 「Review & send quote」, 검증 통과, 마감 전 | submitted | 토스트 「Quote submitted.」, 맨 위로 스크롤, 「Your quote is in」 화면. 요약은 방금 낸 값이 아니라 예시값(E-1) | HTL_QUOTE_RECEIVED (호텔 담당자 이메일, 즉시. 수정할 때마다 다시 감) | `submit_quote` → `quotes`에 저장, `quote_revisions`에 사본, 초대를 「견적 제출」로, 견적 요청 이력에 「{호텔명} 제안 제출 (rev.1)」 |
| submitted | 호텔이 「Revise your quote」 | open (화면에서만) | 폼이 다시 열리고 일부 값이 채워짐(E-40) | 없음 | 없음 |
| open (수정) | 호텔이 다시 제출, 마감 전, 견적 요청이 비교표 전달 전 | submitted | 위와 같음. 이전 견적을 덮어쓰고 수정 횟수가 1 오름 | HTL_QUOTE_RECEIVED (수정마다 별도 발송) | `submit_quote` (이력 「제안 수정 (rev.N)」) |
| open | 호텔이 「Review & decline」, 사유 선택, 마감 전 | declined | 「You declined this request」 | 없음 | `decline_bid` → 초대를 「견적 거절」로, 사유·메모 저장, 견적 요청 이력에 「제안 거절 · 사유」 |
| open | 초대별 견적 마감이 지나고 이 라운드의 남은 초대가 모두 마감·응답 완료 | expired | 「This invitation has expired」 | 없음 | 10분마다 도는 시스템 작업(`system_tick`)이 요청을 「견적 정리 중」으로 바꾸면서 「초대됨」·「열람함」 초대를 「기한 지남」으로 바꿈 |
| open · submitted · expired | 운영자가 이 호텔을 「재초대」해 이 초대가 「재초대로 대체됨」이 됨(조건 변경 뒤 새 라운드로 다시 부를 때 포함) | expired | 「This invitation has expired」(문구가 상황과 어긋남, E-44) | 새 링크로 HTL_INVITE | `admin_reinvite`. 「조건 변경 → 새 라운드」만으로는 이전 라운드 초대가 바뀌지 않음 → E-92 |
| submitted | 요청자가 선택하거나 운영자가 대리 확정, 이 호텔이 선정됨 | selected | 「Your proposal was selected」, 「Organizer contact」 카드가 채워짐 | HTL_SELECTED_CONNECT (선정 호텔 담당자에게, 요청자가 참조로 받음, 즉시. 연결 메일에 요청자 회사·담당자·연락처가 들어감) | 요청 「성사」 전이 (`finalize_won`), 이후 `get_bid`가 `organizer`를 돌려줌 |
| submitted | 위와 같으나 다른 호텔이 선정됨 | not_selected | 「Not selected this time」 | HTL_NOT_SELECTED (견적을 낸 나머지 호텔 담당자에게, 즉시. 요청자 정보 없음) | 위와 같음 |
| open · submitted | 운영자의 「요청 취소」(요청자 자체 취소는 초대가 0건일 때만 되므로 호텔 화면에는 해당 없음) | cancelled | 「This request was cancelled」 | 호텔에게 가는 자동 알림 없음 (운영자가 수동 안내, E-45) | 취소 전이. 이력에 「OPS_HTL_CANCELLED 안내는 자동 발송되지 않습니다」가 남음 |
| submitted | 운영자가 「미성사로 닫기」 | submitted (변화 없음) | 계속 「Quote received」 | 호텔에게 가는 알림 없음 | 미성사 전이 (E-27 후보) |

④ 숨김·보안 — 이 화면에 절대 나오면 안 되는 정보 (→ 6-1)
- 선정되기 전에는 요청자의 회사명·담당자·이메일·전화·예산이 어디에도 나오면 안 됩니다. `get_bid`는 `organizer`를 `selected`일 때만 돌려주고, 화면은 그 값을 선정 화면 4칸에만 채웁니다. 요건서 응답(`request`)에는 신원 필드가 없습니다.
- `request.public_memo`(「Notes (reviewed by MICEGO)」)는 운영자가 검토한 메모입니다. 신원이 섞이지 않았는지 요건서를 만들 때 확인합니다.
- 다른 호텔의 견적, 호텔 수, 호텔명, 제안 A·B·C 이름표, 비교표는 이 화면에 없습니다. `quote`는 본인 초대의 견적 1건뿐입니다.
- 합의 요율(`commission`)은 이 호텔 본인 것만 이 화면에 오고, 요청자 화면에는 없습니다.
- 개인 링크 원문은 메일에만 있습니다. 화면은 「Please don't forward it」이라고 안내합니다. 링크가 새면 누구나 그 호텔로 견적을 내거나 거절할 수 있습니다(로그인 없음).
- 선정 화면용 예시 요청자(「Hanbit Tour Co., Ltd.」 등)가 숨겨진 상태로 HTML에 들어 있습니다. 실제 값이 아닌 예시값이며, 실제 값은 선정됐을 때만 `organizer` 응답으로 채워집니다. 종료 상태(selected·not_selected·declined·expired·cancelled·invalid)에서는 다른 상태의 블록을 화면 로드 때 지웁니다.
- 선정 시 호텔의 이름과 견적 속 연락처가 요청자에게 공개된다는 것은 동의 문구에 적혀 있습니다. 미선정 호텔은 공개되지 않습니다.

⑤ 미결
- 결함 E-1 api 설정에서도 요건서·마감 일시·개요 4칸·제출 견적 요약·「All 80 rooms」·동의 문구 속 REF·`request.prev_deadline`·`change_summary`(라운드 2 이상)·`hotel`(본인 연락처 자동 채움)을 서버 값으로 채우지 않습니다. 호텔이 실제로 보는 것은 예시 요청(다낭, MG-2610-014)입니다. MVP 전에 반드시 고칩니다.
- 결함 E-7 `can_revise`(마감 전인지)를 응답으로 받고도 쓰지 않습니다(`build2.py`에 `can_revise` 없음). 마감 뒤에도 「Revise your quote」가 보이고, 제출하면 `DEADLINE_PASSED` 토스트가 나옵니다.
- 결함 E-10 마감이 KST로만 표기됩니다. 호텔 현지 시각을 함께 보여 줘야 합니다.
- 결함 E-27 후보 「미성사」 처리된 견적 요청에서 견적을 낸 호텔이 계속 「Quote received」를 봅니다. `get_bid`에 `lost` 분기가 없고 호텔용 알림 템플릿도 없습니다. 지금 코드에서 K-5가 고친 것은 취소뿐입니다.
- 결함 E-40 「Revise your quote」를 누르면 `breakfast`·`tax`·`availability` 라디오가 저장된 견적이 아니라 고정값(「Included in rate」「Included in all rates」「All 80 rooms available」)으로 채워집니다. 조식 보충 요금·세금 설명·객실 메모 칸은 저장 값으로 채워지는데, 그 칸을 여닫는 라디오가 고정값이라 칸이 숨거나 비어 보입니다. 호텔이 모르고 제출하면 조식·세금·객실 조건이 바뀝니다.
- 결함 E-41 `validUntil`의 최소 날짜(`2026-10-12`)와 오류 문구가 코드에 박혀 있습니다. 응답의 `min_valid_until`(견적 마감 + 2영업일)을 쓰지 않아서, 실제 최소일이 더 늦으면 서버가 거절하는데 오류 문구는 틀린 날짜를 말하고, 더 이르면 정상 날짜를 클라이언트가 막습니다.
- 결함 E-42 대리 입력이 걸린 초대(`proxy_entered`·`proxy_disputed`·`proxy_expired`)를 호텔이 열면 빈 견적 폼(open)이 나옵니다. 응답에 `proxy`와 `quote`가 있어도 화면은 지역 파트너가 대신 넣은 견적이 있다고 알려 주지 않습니다. 이때 「Review & decline」을 누르면 `STATE_CONFLICT`가 납니다. 요청이 「성사」로 닫힌 뒤에도 같은 호텔은 open으로 보입니다(HTL-05 참조).
- 결함 E-43 초대별 마감이 지났는데 같은 라운드의 다른 초대 마감이 남아 있으면 이 호텔은 open 폼을 계속 봅니다. 제출해야 `DEADLINE_PASSED`를 알게 됩니다. `can_revise`로 폼을 막고 「expired」를 보여 줘야 합니다.
- 결함 E-44 「재초대로 대체됨」 초대도 expired로 보이며 문구가 「closed … without a quote from your property」입니다. 견적을 낸 호텔이나 새 링크를 받은 호텔에게는 틀린 말입니다. 새 링크로 안내해야 합니다. 마감 일시(「Thu 8 Oct 2026 at 18:00 KST」)도 고정값입니다.
- 결함 E-45 요청이 취소돼도 초대한 호텔에게 자동 알림이 없습니다(`OPS_HTL_CANCELLED`는 운영자가 직접 안내하는 용도). 호텔은 링크를 다시 열어야 취소를 압니다.
- 결함 E-46 요건서가 객실만 요청해도 `ballroomFee`·`ballroomName`이 필수입니다. 약관은 연회장이 필요 없는 요청이 있다고 말합니다. 호텔은 연회장 없음을 「0」과 임의 문구로 적어야 합니다. 요건서의 연회장 사용 여부(`ballroom.use`)로 칸을 선택 입력으로 바꿀지는 **결정 대기**입니다.
- 결함 E-48 `get_bid` 실패는 네트워크 오류나 429(요청 과다)도 모두 「This link can't be opened」로 보입니다. 다시 시도하라는 안내가 없습니다. HTL-04·HTL-06도 같습니다.
- 결함 E-49 「Review & send quote」와 「Review & decline」을 누른 뒤 버튼을 잠그지 않습니다. 연속으로 누르면 견적이 수정 2회로 저장되고 HTL_QUOTE_RECEIVED가 두 번 갑니다(수정 번호가 키에 들어 있음).
- 결함 E-92 (2026-10-09 독립 검증에서 추가) 「조건 변경 → 새 라운드」는 라운드만 올리고 이전 라운드 초대를 그대로 둡니다. 운영자가 재초대하지 않은 호텔은 이전 화면(견적을 냈으면 submitted 「Quote received」)을 계속 봅니다. 이전 초대의 마감이 아직 남아 있으면(전원 응답으로 일찍 견적 정리 중이 된 경우) 호텔이 이전 라운드 견적을 고쳐 낼 수 있고, 그 견적은 새 비교표에 실리지 않습니다. 새 라운드로 넘길 때 이전 라운드 초대를 닫을지(또는 호텔에 안내할지) **결정 대기**.
- (추정) 통화 목록은 빌드 때 고정된 12종입니다. 서버의 지원 통화는 설정값이라 운영 중 바뀌면 호텔이 고를 수 있는 통화를 서버가 거절할 수 있습니다.
- (추정) JS가 꺼진 브라우저에서는 `data-state`가 없어 CSS가 open 블록만 보여 줍니다. 그러면 예시 요건서와 메일 앱 방식 폼이 나옵니다(브라우저에서 확인하지 않음, → 6-2).
- 결정 대기 요율 합의 조건을 MVP에 둘지(HTL-04). 빼면 이 화면의 「Your agreed commission」 한 줄은 `commission`이 `null`이라 보이지 않게 됩니다.

---

### HTL-04 커미션 요율 동의 `en/commission.html?t=` 〔결정 대기: 요율 합의 조건을 MVP에 둘지〕
**왜 필요한가** 승인된 호텔이 자기 호텔의 커미션 요율에 클릭으로 동의하는 화면입니다. 동의하기 전에는 초대를 보낼 수 없습니다.
**누가 · 어떻게 들어오나** 승인된 호텔 담당자가 들어옵니다. 승인 메일(PTN_APPROVED)이나 요율 변경·재발송 메일(PTN_COMMISSION_TERMS)의 `COMMISSION_URL`을 눌러 페이지 이동으로 엽니다. 링크는 1회용이고 168시간 동안 유효합니다(`commission_accept_hours`). 링크를 열기만 해서는 동의가 기록되지 않습니다. 동의는 버튼으로만 기록됩니다(메일 보안 스캐너 대비).
**나가는 길**
- 「Article 5 of the Partner Terms」 → `terms.html#art5` (새 탭, 페이지 이동)
- 「Questions about the rate? Contact MICEGO」 → HTL-07 문의 (페이지 이동)
- 「Contact MICEGO」(잘못됨·만료·이미 처리된 화면) → HTL-07 문의 (페이지 이동)

**데이터**
- 서버 응답(`partner_commission_accept` 조회): `hotel`, `ratePct`, `basis`, `termsVersion`, `expiresAt`, `status`(`pending`·`used`·`expired`·`stale`).
- 동의 응답: `hotel`, `ratePct`.
- 빌드 때 고정: 문구 전체, 「Invoice」 항목(「Issued after the event; payable within 30 days of the invoice date」), 「Applies to」 항목, 예시값 「10%」·「PT-2026-10」·「your property」.

**Figma** `HTL-04 · loading` · `review` · `done` · `expired` · `used` · `invalid` · `noscript` | **코드 근거** `build_commission.py`, `supabase/functions/partner_commission_accept/handle.ts`, `supabase/migrations/0017_hotel_commission.sql`(`partner_commission_lookup`, `partner_commission_apply`)

① 화면 상태 — 6개이고, 스크립트가 꺼진 경우의 안내가 하나 더 있습니다.
| 상태(slug) | 화면 이름 | 언제 들어오나 | 보이는 것 | 할 수 있는 일 |
|---|---|---|---|---|
| loading | 불러오는 중 | API 설정에서 링크를 열었을 때 | 「Loading…」 | 없음 |
| review | 동의 대기 | 조회 결과가 `pending`일 때 | 「Accept the commission terms for {호텔명}」, 요율 표, 체크박스, 「Accept commission terms」 | 체크하고 동의 |
| done | 동의 완료 | 동의 버튼이 성공했을 때 | 「Commission terms accepted」, 호텔명·요율·약관 버전 | 없음 |
| expired | 링크 만료 | 조회 결과가 `expired`이거나 동의 때 `TOKEN_EXPIRED`일 때 | 「This link has expired」 | 「Contact MICEGO」 |
| used | 이미 동의함 | 조회 결과가 `used`이거나 동의 때 `TOKEN_USED`일 때 | 「Already accepted」 | 「Contact MICEGO」 |
| invalid | 링크 오류 | 주소의 `t`가 16~64자의 영문·숫자·`_`·`-`가 아닐 때, 조회 결과가 `stale` 등 위 셋이 아닐 때, 조회 실패(E-48), 동의 때 `TOKEN_INVALID`·`STATE_CONFLICT`일 때 | 「This link is not valid」 | 「Contact MICEGO」 |
| (noscript) | 스크립트 꺼짐 | 브라우저가 JS를 쓰지 않을 때 | 「JavaScript is needed on this page」, 아직 아무것도 동의되지 않았다는 안내 | 「Contact MICEGO」, 메일 답장 (→ 6-2) |

미리 보기: 데모 설정일 때 `?state=review|done|used|expired|invalid`로 볼 수 있습니다. 데모에서는 동의 버튼이 화면만 done으로 바꿉니다.

② 요소
| 요소 「화면 문구」 | 왜 있나 | 기본 | 비활성 | 진행 중 | 완료 | 오류 | 누르면 (이동 방식 → 결과) |
|---|---|---|---|---|---|---|---|
| 「Partner terms PT-2026-10」 | 동의하는 약관 버전 확인 | 서버 값 | — | — | — | — | — |
| 요율 표 「Property」「Commission」「Net booking value」「Applies to」「Invoice」「Link valid until」 | 무엇에 동의하는지 | 서버 값(`Commission`은 「10% of net booking value」 형식) | — | — | — | — | — |
| 「Article 5 of the Partner Terms」 | 약관 전문 확인 | 보임 | — | — | — | — | 페이지 이동 (새 탭) → `terms.html#art5` |
| 체크박스 「I am authorised to accept these terms for {호텔명}, and I accept the commission above under Article 5 of the MICEGO Partner Terms.」 | 권한과 동의 의사 확인 | 해제 | — | — | 체크 | — | 체크하면 동의 버튼이 켜짐 |
| 「Accept commission terms」 | 동의 기록 | 체크 전에는 비활성 | 체크 전, 호출 중 | 호출 중 비활성 | done으로 바뀜 | 토스트 후 체크가 남아 있으면 다시 켜짐 (→ 6-5) | 인라인 패널: `partner_commission_accept`(`accept`) 호출 |
| 「Questions about the rate? Contact MICEGO」 | 이의·문의의 유일한 출구 | 보임 | — | — | — | — | 페이지 이동 → HTL-07 (거절 버튼은 없음, E-17) |
| 안내 「Opening this page does not accept anything…」 | 열기만 해서는 동의 안 됨을 알림 | 보임 | — | — | — | — | — |

③ 상태 전환
| 지금 | 누가·무엇을 (조건) | 다음 | 화면에서 바뀌는 것 | 알림 | 서버 호출 |
|---|---|---|---|---|---|
| (화면 밖) | 운영자나 지역 파트너가 호텔을 승인하며 요율을 입력, 또는 요율 변경을 제안, 또는 링크를 재발송(최대 5회) | review 가능 | 새 링크 발급, 이전 링크는 못 씀 | PTN_APPROVED 또는 PTN_COMMISSION_TERMS (호텔 담당자 이메일, 즉시) | 운영 콘솔 호텔 화면 |
| loading | 호텔이 링크를 엶 | review · used · expired · invalid | 조회 결과의 `status`대로 | 없음 | `partner_commission_accept`(`lookup`) — 토큰을 소비하지 않음. 10분에 60회까지(→ 6-4), 틀린 링크는 10분에 20회까지 |
| review | 호텔이 체크하고 동의 | done | 「Commission terms accepted」 | 호텔에게는 없음. 콘솔로: 요율을 정한 쪽이 지역 파트너면 PTR_HOTEL_TERMS_ACCEPTED, 본사면 HQ_HOTEL_TERMS_ACCEPTED | `partner_commission_accept`(`accept`) → 호텔에 요율·동의 시각·약관 버전·IP 해시 기록, 대기 요율을 확정 요율로 바꿈, 호텔 이력에 「커미션 N% 동의」, 요율 이력에 동의 기록 |
| review | 동의 직전에 링크가 만료됨 | expired | 「This link has expired」 | 없음 | `TOKEN_EXPIRED` |
| review | 다른 탭 등에서 이미 동의됨 | used | 「Already accepted」 | 없음 | `TOKEN_USED` |
| review | 호텔 상태가 「승인」·「중지」가 아니게 됨 | invalid | 「This link is not valid」 | 없음 | `STATE_CONFLICT` |
| (화면 밖) done 이후 | 동의한 호텔을 운영자가 초대 | 호텔에 HTL_INVITE | — | HTL_INVITE | 초대 때 그 시점의 요율이 초대에 복사됨(합의 요율 스냅샷) |

④ 숨김·보안 — 이 화면에 절대 나오면 안 되는 정보
- 다른 호텔의 요율, 요청자 정보. 요율은 호텔과 매치고 사이의 기밀입니다(약관 5.6). 요청자 화면에는 요율이 없습니다(D-37).
- 링크 원문과 해시. 서버는 해시만 저장하고, 원문은 메일 변수로만 나갑니다.
- 호텔 이름과 요율은 이 링크를 가진 사람에게 보입니다. 링크는 1회용이며 168시간 안에 만료됩니다. 포워딩하면 받은 사람이 동의할 수 있습니다(권한 확인은 체크박스 문구뿐).

⑤ 미결
- **결정 대기** 요율 합의 조건을 MVP에 둘지. 지금 코드는 합의하지 않은 호텔을 초대에서 거릅니다(`admin_invite`가 `COMMISSION_NOT_AGREED`). 초대와 정산에 합의 요율이 복사됩니다(`invitations.commission_rate_pct`, `settlements.agreed_rate_pct`). 조건을 빼면 이 세 곳을 함께 정리해야 합니다.
- **결정 대기** 조건을 둔다면 호텔에게 동의 확인 메일을 보낼지. 지금은 동의 영수증 템플릿이 없어서 호텔 손에 남는 증빙이 없습니다.
- 결함 E-17 요율 이의·거절 경로가 「Contact MICEGO」 메일뿐입니다. 거절 버튼이 없습니다.
- 결함 E-10 「Link valid until」이 UTC로 표시됩니다(`toUTCString`). 초가 0이 아니면 「GMT」 표기가 그대로 나옵니다. 다른 호텔 화면은 KST를 씁니다.
- 결함 E-48 조회 실패가 모두 「This link is not valid」로 보입니다.
- (추정) `basis` 값이 기본(`rooms_fnb_net`)이 아니면 정해진 문장이 아니라 코드 이름이 그대로 표에 들어갑니다. 지금 DB 제약은 기본값만 허용하므로 일어나지 않습니다.

---

### HTL-06 수신 거부 `en/unsubscribe.html?t=` 〔보조〕
**왜 필요한가** 초대 메일을 더 받고 싶지 않은 호텔이 스스로 끊는 화면입니다. 메일 푸터의 수신 거부 링크가 가리킵니다.
**누가 · 어떻게 들어오나** 승인 호텔 담당자가 초대 메일(HTL_INVITE)이나 마감 알림 메일(HTL_REMINDER) 푸터의 수신 거부 링크(`UNSUBSCRIBE_URL`)를 눌러 페이지 이동으로 엽니다. 메일 앱의 「Unsubscribe」 단추(`List-Unsubscribe` 헤더)도 같은 주소를 가리키며, 한 번 눌러 바로 끊어지지는 않고 이 화면이 열립니다.
**나가는 길**
- 「Keep receiving」 → 호텔 랜딩 `index.html` (페이지 이동)
- 「Contact MICEGO」(잘못된 링크 화면) → HTL-07 문의 (페이지 이동)

**데이터** 서버 응답 `state`(`confirm`·`already`·`done`)와 `property`(호텔명). 문구는 빌드 때 고정이며 호텔명은 서버 값(데모 기본값은 「Ocean Pearl Resort Da Nang」).
**Figma** `HTL-06 · loading` · `confirm` · `done` · `already` · `invalid` | **코드 근거** `build_launch.py` 155~201행(`UNSUB_BODY`, `UNSUB_JS`), `supabase/functions/unsubscribe/handle.ts`

① 화면 상태 — 5개입니다(`UNSUB_STATES`).
| 상태(slug) | 화면 이름 | 언제 들어오나 | 보이는 것 | 할 수 있는 일 |
|---|---|---|---|---|
| loading | 불러오는 중 | API 설정에서 링크를 열었을 때 | 「Loading…」 | 없음 |
| confirm | 거부 확인 | 조회 결과가 아직 거부 전일 때 | 「Stop invitation emails?」, 호텔명, 「Selection results for quotes you already submitted will still be sent.」 | 「Unsubscribe」, 「Keep receiving」 |
| done | 거부 완료 | 「Unsubscribe」가 성공했을 때 | 「You're unsubscribed」 | 없음 |
| already | 이미 거부함 | 이미 거부된 호텔이 링크를 열었을 때 | 「Already unsubscribed」 | 없음 |
| invalid | 링크 오류 | 주소의 `t`가 4~64자의 영문·숫자·`_`·`-`가 아닐 때, 조회가 어떤 오류든 돌려줬을 때(E-48) | 「This link is not valid」 | 「Contact MICEGO」 |

② 요소
| 요소 「화면 문구」 | 왜 있나 | 기본 | 비활성 | 진행 중 | 완료 | 오류 | 누르면 (이동 방식 → 결과) |
|---|---|---|---|---|---|---|---|
| 「Unsubscribe」 | 수신 거부 확정 | confirm에서 보임 | 호출 중 | 호출 중 비활성 | done으로 바뀜 | 토스트 후 다시 켜짐 (→ 6-5) | 인라인 패널: `unsubscribe`(`confirm`) 호출. 링크를 열기만 해서는 거부되지 않음 |
| 「Keep receiving」 | 마음 바꾸기 | confirm에서 보임 | — | — | — | — | 페이지 이동 → 호텔 랜딩 (서버 호출 없음) |
| 「Contact MICEGO」 | 잘못된 링크의 출구 | invalid에서 보임 | — | — | — | — | 페이지 이동 → HTL-07 |

③ 상태 전환
| 지금 | 누가·무엇을 (조건) | 다음 | 화면에서 바뀌는 것 | 알림 | 서버 호출 |
|---|---|---|---|---|---|
| loading | 호텔이 링크를 엶 | confirm 또는 already | 호텔명 표시 | 없음 | `unsubscribe`(`check`). 이 IP에서 10분에 20회까지 (→ 6-4) |
| loading | 링크가 없는 값, 형식 오류, 그 밖의 오류 | invalid | 「This link is not valid」 | 없음 | `unsubscribe`(`check`) → `TOKEN_INVALID` |
| confirm | 호텔이 「Unsubscribe」 | done | 「You're unsubscribed」 | 없음 | `unsubscribe`(`confirm`) → 호텔에 거부 시각 기록, 호텔 이력에 「초대 메일 수신 거부」. 이후 초대 대상에서 빠짐 |
| confirm | 같은 호텔이 다른 탭에서 이미 거부함 | already | 「Already unsubscribed」 | 없음 | `unsubscribe`(`confirm`) |

④ 숨김·보안 — 이 화면에 절대 나오면 안 되는 정보
- 호텔명 외의 호텔 정보(연락처, 요율, 견적), 요청자 정보. 응답은 `state`와 호텔명뿐입니다.
- 링크는 호텔 등록 때 만든 고정 토큰(`u_`로 시작)이라 같은 호텔의 모든 초대 메일에 같은 주소가 들어갑니다. 링크를 가진 사람은 누구나 그 호텔의 수신을 끊을 수 있습니다.

⑤ 미결
- 결함 E-47 수신 거부를 되돌릴 방법이 화면과 콘솔에 없습니다. 약관 16.1은 「contact us」라고만 말합니다. 콘솔 화면(`admin/*.js`)에 거부 표시와 해제가 없습니다. 이미 초대된 건의 HTL_REMINDER는 거부한 호텔에게도 갑니다(발송 조건에 거부 여부가 없음). 거부해도 이미 보낸 초대로 견적을 낼 수 있습니다.
- 결함 E-48 조회 실패가 모두 「This link is not valid」로 보입니다.
- (추정) 「Keep receiving」은 서버를 부르지 않고 랜딩으로 보냅니다. 호텔이 이를 거부 철회로 오해할 수 있습니다.

---

### B 묶음 작성 메모

**새로 만든 E-번호 (E-40~E-49, 10개 모두 사용. E-92는 독립 검증에서 추가)**
| 번호 | 화면 | 요약 |
|---|---|---|
| E-40 | HTL-03 | 「Revise your quote」가 조식·세금·객실 라디오를 저장값이 아니라 고정값으로 채움 |
| E-41 | HTL-03 | `validUntil` 최소일·오류 문구가 `2026-10-12`로 고정, `min_valid_until` 미사용 |
| E-42 | HTL-03 | 대리 입력 중인 초대(및 요청이 닫힌 뒤의 대리 입력 초대)가 빈 폼(open)으로 보임, 거절은 `STATE_CONFLICT` |
| E-43 | HTL-03 | 초대별 마감이 지나도 open 폼이 남음(`can_revise` 미사용) |
| E-44 | HTL-03 | 재초대로 대체된 초대가 「without a quote from your property」라는 틀린 expired 문구로 보임 |
| E-45 | HTL-03 | 요청 취소 때 호텔에게 가는 자동 알림 없음 |
| E-46 | HTL-03 | 객실만 요청해도 연회장 칸이 필수 (선택 입력 전환은 결정 대기) |
| E-47 | HTL-06 | 수신 거부 되돌릴 방법 없음, HTL_REMINDER는 거부 후에도 발송 |
| E-48 | HTL-03·04·06 | 조회 실패가 모두 invalid로 보여 재시도 안내가 없음 |
| E-49 | HTL-01·03 | 제출·거절 버튼 중복 클릭 방지 없음(견적은 수정 2회·메일 2통) |

**인용만 한 기존·타 묶음 번호**: E-1(HTL-03 서버 값 미연결, 이번 코드 읽기로 요건서·동의 문구 REF·`prev_deadline`·`change_summary`까지 범위가 넓다는 점을 확인), E-5, E-7, E-10, E-17, E-27 후보(A 묶음 번호 범위, 「미성사」 때 호텔 화면, 이번에 만들지 않고 인용만 함).

**결정 대기로 둔 것**: HTL-01 운영자 수동 등록 대체 여부, HTL-01 50명 미만 신청을 폼에서 막을지, HTL-03 연회장 칸을 선택 입력으로 바꿀지(E-46 안), HTL-04 요율 합의 조건의 MVP 포함 여부와 동의 확인 메일.

**모순·확인 필요**
- BRIEF 2장은 「미성사」 때 호텔 화면을 「Quote received (결함 E-27 후보)」로 적었고 코드와 맞습니다. 다만 HANDOFF의 K-5(「종료된 요청에서 미제출 호텔의 라벨이 open」)는 취소만 고쳤고 「미성사」·대리 입력 초대는 아직 같은 문제가 남아 있습니다(E-42·E-27 후보).
- v1이 HTL-03 요건서를 「서버 값 미연결(E-1)」로만 적은 것과 달리, 코드에는 `hotel`·`request.prev_deadline`·`request.change_summary`·`proxy` 응답이 있는데 화면이 쓰지 않습니다. E-1의 범위를 이에 맞춰 넓혀야 합니다.
- v1 HTL-01 설명은 파일을 `en/index.html`로 적고, BRIEF의 원본은 `src/micego-hotel-partner-landing.html`입니다. 이 문서는 생성물 `en/index.html`을 화면 주소로, 원본을 코드 근거로 구분했습니다.
- v1은 HTL-04 만료 시간을 168시간으로 적었고 코드(`commission_accept_hours` 기본 168)와 맞습니다. 다만 값은 설정이므로 콘솔 설정에서 바뀔 수 있습니다.
