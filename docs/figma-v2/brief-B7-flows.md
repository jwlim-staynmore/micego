# B7 · 기능 플로우 — 작업자 브리프 - 클로드

- 대상 Figma 페이지: **`v2 · 02 기능 플로우`**
- 부품(`v2 · 08`): `flow/card` = 화면 ID · 화면 이름 · 상태 칩 · 핵심 버튼 1줄 / `flow/notif-node` = 종 + 템플릿 ID + 채널 점 / `flow/state-node` / `flow/edge-label` = `「버튼」 → [페이지|모달|패널|앱] · 목적지 · 서버 호출 · 알림`
- 선: 흐름①(접수, 연초록 3px) · 흐름②(견적→비교표→선택, 연파랑 3px) · 일반(회색 1px) · 분기(빨강 2px: 취소·반려·조건 변경·잠금·거절) · 다음 단계(회색 점선)
- 프레임: 흐름 하나 = PC 프레임 하나(가로로 길게 1280×n 또는 2560 폭 허용). 이름 `F{n} · flow · {흐름 이름} · PC`. 카드 위 태그 점.
- 근거: 각 브리프(B1~B4) + `ux-flow-spec-v2.md` 4-1·4-2·4-5. 카드 상태 칩은 화면 쪽 문구(요청자 배지 / 콘솔 이름 / 호텔 영어).

---

#### `F1 · flow · 요청자 견적 요청 → 성사 · PC`
- 태그 핵심 · 카드(순서):
  1. HUB-01 모드 선택 홈 · default · 「여행사 모드로 이동 →」
  2. ORG-01 랜딩 + 견적 요청 폼 · guest · 「견적 요청하기」
  3. ORG-01 접수 완료 · done · 「진행 상황 보기」
  4. 🔔 ORG_RECEIVED(메일 + 알림톡)
  5. ORG-02 · 접수됨 · 「이메일로 알려 주세요」
  6. ORG-02 · 요건 확인 중(서버 verifying·open) · 「이 요청 취소하기」
  7. 🔔 ORG_BIDDING
  8. ORG-02 · 호텔 제안 받는 중 · 「변경 내용을 알려 주세요」
  9. ORG-02 · 제안 정리 중 · —
  10. 🔔 ORG_DELIVERED
  11. ORG-02 · 비교표 도착(P0) · 「제안 A 선택」
  12. ORG-02 · 선택 인증(P1, 다음 단계) · 「인증하고 선택하기」
  13. ORG-02 · 선택 완료(P3) · 「선택이 접수되었습니다」(비활성)
  14. 🔔 ORG_WON (+호텔 HTL_SELECTED_CONNECT · HTL_NOT_SELECTED)
  15. ORG-02 · 연결 완료 · —
  - MVP 가지(초록 칩 D-54, 11 아래로): 11b ORG-02 · 메일 회신 선택(M) · 「제안 A 선택」 → 11c 외부 앱 · 메일(동의 문장) → 11d ADM-03 · 비교표 전달됨 · 「성사로 닫기」 → 11e ADM-03 동의 확인 기록 모달 → 14
- 선:
| 시작 → 끝 | 라벨 | 선 |
|---|---|---|
| 1 → 2 | 「여행사 모드로 이동 →」 → [페이지] · ORG-01 · 서버 없음 · — | 일반 |
| 2 → 3 | 「견적 요청하기」 → [패널] · ORG-01 done · `submit_rfp`(+Turnstile) · ORG_RECEIVED | 흐름① |
| 3 → 5 | 「진행 상황 보기」 → [페이지] · ORG-02(`track_url`) · `get_track` · — | 흐름① |
| 4 → 5 | 메일·알림톡 「진행 상황 보기」 → [페이지] · ORG-02 `?t=` · `get_track` | 흐름① |
| 5 → 6 | (운영자 #1 「요건 확인 시작」) · 상태만 바뀜, 알림 없음 | 흐름① |
| 6 → 7 → 8 | (운영자 #3 「초대 준비로」 → #4 「견적 받기 시작」) · ORG_BIDDING | 흐름② |
| 8 → 9 | (시스템 #5 10분 cron 또는 운영자) · — | 흐름② |
| 9 → 10 → 11 | (운영자 #6 「비교표 전달」) · ORG_DELIVERED | 흐름② |
| 11 → 12 | 「제안 A 선택」 → [패널] · P1 · `pick_send_otp` · ORG_PICK_OTP(문자) | 흐름②(다음 단계 점선) |
| 12 → 13 | 「인증하고 선택하기」 → [패널] · P3 · `pick_verify` → `pick_and_win`(#10) · ORG_WON | 흐름② |
| 13 → 15 | 새로고침 → [페이지] · ORG-02 won(E-32: 자동 갱신 없음) | 일반 |
| 11 → 11b | 빌드 스위치 `pick.otpEnabled=false` | 흐름② |
| 11b → 11c | 「제안 A 선택」 → [앱] · 메일 초안 · 서버 없음 · — | 흐름② |
| 11c → 11d | 운영자가 메일 확인 → ADM-03 「선정」 표시(`admin_mark_selection`) | 흐름② |
| 11d → 11e → 14 | 「성사로 닫기」 → [모달] · 동의 확인 기록(이메일 회신) · `admin_transition('won', p_consent)` · ORG_WON·HTL_SELECTED_CONNECT·HTL_NOT_SELECTED | 흐름② |

#### `F2 · flow · 요청자 분기 · PC`
- 태그 핵심 · 중심 카드 ORG-02(세로 상태 칩 12개) + 가지 7개:
| 가지 | 카드 / 선 라벨 | 선 |
|---|---|---|
| ① 자체 취소(#12b) | ORG-02 접수됨·요건 확인 중(초대 0건) → 「이 요청 취소하기」 → [패널] · received-cancel → 「취소 확정」 → [패널] · ORG-02 취소됨 · `cancel_rfp` · ORG_CANCELLED(+위임 건 PTR_ORG_CANCELLED) | 분기(점선 다른 색) |
| ② 운영자 취소(#12) | 견적 받는 중~비교표 도착 → (운영자 「요청 취소」, 사유 2) → 취소됨 · ORG_CANCELLED · 호텔 자동 알림 없음(E-45, OPS_HTL_CANCELLED 수동) | 분기 |
| ③ 반려(#2) | 요건 확인 중 → (운영자 「반려」, 사유 4) → 진행 불가 · ORG_REJECTED → 「새로 요청하기」 → [페이지] · ORG-01 `#register` | 분기 |
| ④ 조건 변경(#7·#9) | 요청자 「변경 내용을 알려 주세요」 → [패널] · `request_change`(상태 안 바뀜, 운영자 이력) → 운영자 「조건 변경 → 새 라운드」 → 새 조건으로 재요청 · ORG_REBID | 분기 |
| ⑤ 미성사(#8·#11) | 비교표 도착 → (운영자 「미성사로 닫기」, 사유 3) → 종료 · ORG_LOST / 제안 정리 중(제출 0건·라운드 2↑) → 종료 → 「새로 요청하기」 → ORG-01 | 분기 |
| ⑥ 선택 잠금 | P1 → 5회 오답 → P2 잠금(10분, OTP_LOCKED) → 「다른 제안 보기」 → P0 | 분기(다음 단계) |
| ⑦ 질문 | 비교표 도착 → 「MICEGO에 질문 보내기」 → [패널] · `ask_question`(요청당 하루 10회 합산) → 운영자 메일 답변(E-13 기록 안 남음) | 일반 |
| ⑧ 링크 오류 | 불러오는 중 → 조회 실패·형식 오류 → 링크를 열 수 없음(E-30) → 「문의하기」 → [페이지] · ORG-09 / 「이메일 보내기」 → [앱] | 분기 |

#### `F3 · flow · 회원가입 → 내 요청 → 공유 링크 · PC`
- 태그 다음 단계(전부 점선) · 카드: ORG-01 done → ORG-03 form → email_sent → phone_entry → phone_sent → done → ORG-06 list → list-share → ORG-02s delivered → ORG-02s invalid / ORG-06 link_pending → ADM-07 modal-link-approve → ORG-06 linked
| 시작 → 끝 | 라벨 |
|---|---|
| ORG-01 done → ORG-03 form | 「이 이메일로 가입하기」 → [페이지] · `signup.html?email=` · 서버 없음 |
| form → email_sent | 「인증 메일 받기」 → [패널] · `signup_start`(+Turnstile) · ACC_EMAIL_CODE |
| email_sent → phone_entry | 「인증하기」 → [패널] · `verify_email` |
| phone_entry → phone_sent | 「인증번호 받기」 → [패널] · `send_phone_otp` · ACC_SMS_OTP(문자) |
| phone_sent → done | 「인증하기」 → [패널] · `verify_phone_otp` → `login` · ACC_WELCOME (+ACC_LINKED 자동 연결) |
| done → ORG-06 list | 「내 견적 요청 보기」 → [페이지] · `my_profile`·`my_rfps` |
| list → list-share | 「공유 링크」 → [패널] → 「링크 만들기」 · `create_share_link` |
| list-share → ORG-02s | 동료가 링크 열기 → [페이지] · `track.html?s=` · `get_track({share})` |
| ORG-02s → invalid | 「링크 끄기」(`revoke_share_link`) / 새 링크 / 종료 30일 / 탈퇴 → invalid(E-79) |
| list → link_pending → ADM-07 | 「연결 요청」 → [패널] · `link_request` → 운영자 「승인」 → [모달] · `admin_link_decide` · ACC_LINKED → ORG-06 linked |

#### `F4 · flow · 로그인 · 재설정 · 계정 · 탈퇴 · PC`
- 태그 다음 단계 · 카드: ORG-04 default · error · cooldown · locked / ORG-05 request · sent · form · done · expired / ORG-07 default · reauth · email_step · phone_step · saved · pw_done / ORG-08 default · confirm · blocked · done
| 시작 → 끝 | 라벨 |
|---|---|
| ORG-04 → ORG-06 | 「로그인」 → [페이지] · `next`(기본 my.html) · `login` |
| ORG-04 → error / cooldown / locked | 실패 1~4회 LOGIN_FAILED / 5회 15분 LOGIN_COOLDOWN / 1시간 10회 ACCOUNT_LOCKED · ACC_LOCKED |
| cooldown·locked → ORG-05 request | 「비밀번호 재설정」 → [페이지] |
| request → sent | 「재설정 메일 받기」 → [패널] · `password_reset_request` · ACC_PW_RESET |
| sent → form | 메일 링크 → [앱→페이지] · `reset.html?k=`(30분·1회) |
| form → done | 「비밀번호 바꾸기」 → [패널] · `password_reset_complete` · ACC_PW_CHANGED(잠김 해제, 모든 기기 로그아웃) |
| form → expired | 만료·재사용 → 「재설정 메일 다시 받기」 → request |
| ORG-06 → ORG-07 | 「계정 설정」 → [페이지] |
| default → reauth → email_step → saved | 「이메일 변경」 → [패널](10분 지나면 비밀번호 재확인, REAUTH_REQUIRED) → 「인증하고 변경하기」 · ACC_EMAIL_CODE → ACC_EMAIL_CHANGED(이전 주소) |
| default → phone_step → saved | 「휴대전화 변경」 → ACC_SMS_OTP → ACC_PHONE_CHANGED |
| default → pw_done | 「비밀번호 바꾸기」 → [패널] · ACC_PW_CHANGED(E-76·E-77) |
| ORG-07 → ORG-08 default → confirm | 「회원 탈퇴」 → [페이지] → 「탈퇴하기」 → [패널] · 서버 없음 |
| confirm → done / blocked | 「탈퇴를 확정합니다」 → [패널] · `withdraw` · ACC_WITHDRAWN / WITHDRAW_BLOCKED(E-78) |

#### `F5 · flow · 호텔 등록 → 심사 → 요율 합의 · PC`
- 태그 보조(요율 구간 결정 대기 G-2) · 카드: HTL-01 form → HTL-01 done → 🔔 PTN_APPLIED → ADM-04 pending → ADM-05 pending → ADM-05 reviewing → ADM-05 modal-approve → 🔔 PTN_APPROVED → HTL-04 review → HTL-04 done → ADM-05 approved-agreed → ADM-03 open(초대 후보 체크 가능) / 가지: ADM-05 rejected · ADM-05 suspended · ADM-05 approved-expired · HTL-04 used · invalid
| 시작 → 끝 | 라벨 | 선 |
|---|---|---|
| HTL-01 form → done | 「Register your property」 → [패널] · `register_partner`(+Turnstile) · PTN_APPLIED | 일반 |
| (메일 없음) → ADM-04 | 운영자 대시보드 「파트너 심사 지연」 또는 메뉴 「호텔 파트너」 → [페이지] · `?filter=delayed` | 일반 |
| ADM-04 → ADM-05 pending | 호텔 이름 → [페이지] · `partner.html?id=` | 일반 |
| pending → reviewing | 「심사중(으)로」 → [패널] · `admin_partner_transition('reviewing')` | 일반 |
| reviewing → modal-approve → approved | 「승인」 → [모달] · 요율 10% · `admin_partner_transition('approved', …)` · PTN_APPROVED(168시간 링크) | 흐름② 준비 |
| PTN_APPROVED → HTL-04 review | 메일 버튼 → [앱→페이지] · `commission.html?t=` · `partner_commission_accept(lookup)` | 일반 |
| review → done | 「Accept commission terms」 → [패널] · `partner_commission_accept(accept)` · HQ_HOTEL_TERMS_ACCEPTED | 일반 |
| done → ADM-05 approved-agreed → ADM-03 open | 합의 완료 → 초대 후보 체크 가능(COMMISSION_NOT_AGREED 해제) | 흐름② |
| pending·reviewing → rejected | 「거절」 → [모달] · 사유 5 · PTN_REJECTED | 분기 |
| approved → suspended → approved | 「중지」 → [모달] 사유 3(안내 수동 OPS_PTN_SUSPEND) / 「재승인」 → [모달] 답신 내용 · PTN_REINSTATED | 분기 |
| review → (168시간) → approved-expired → review | 만료 → 「동의 링크 다시 보내기」 → [모달] · `partner_commission_resend`(최대 5회) · PTN_COMMISSION_TERMS | 분기 |
| HTL-04 → used / invalid | 이미 동의 / 토큰 오류·새 링크로 대체(E-48) | 분기 |

#### `F6 · flow · 호텔 초대 → 견적 → 결과 · PC`
- 태그 핵심 · 카드: ADM-03 open → 🔔 HTL_INVITE → HTL-03 open → HTL-03 submitted → HTL-03 open-revise → submitted → (요청 #10) → HTL-03 selected / not_selected · 가지: declined · expired · cancelled · HTL-06 confirm
| 시작 → 끝 | 라벨 | 선 |
|---|---|---|
| ADM-03 open → HTL_INVITE | 「초대 보내기」 → [패널] · `admin_invite` · HTL_INVITE(초대 준비에서도 즉시, E-55) | 흐름② |
| HTL_INVITE → HTL-03 open | 메일 버튼 → [앱→페이지] · `bid.html?t=` · `get_bid`(첫 열람 → 열람함) | 흐름② |
| open → submitted | 「Review & send quote」 → [패널] · `submit_quote` · HTL_QUOTE_RECEIVED | 흐름② |
| submitted → open-revise → submitted | 「Revise your quote」 → [패널] · 서버 없음 → 다시 `submit_quote`(수정 +1) · HTL_QUOTE_RECEIVED(E-7·E-40) | 일반 |
| (마감 24시간 전) | 시스템 · HTL_REMINDER(수신 거부 뒤에도 감, E-47) | 일반 |
| submitted → selected | 요청 성사 + 이 호텔 선정(#10) · HTL_SELECTED_CONNECT(요청자 참조, Organizer contact 공개) | 흐름② |
| submitted → not_selected | 요청 성사 + 다른 호텔 선정 · HTL_NOT_SELECTED | 흐름② |
| open → declined | 「Review & decline」 → [패널] · `decline_bid` · — | 분기 |
| open → expired | 마감 경과(#5 cron) / 운영자 「재초대」로 대체(문구 E-44) | 분기 |
| open·submitted → cancelled | 요청자 자체 취소·운영자 취소 · 호텔 알림 없음(E-45) | 분기 |
| submitted → submitted | 요청 미성사(#8·#11)여도 화면 그대로 「Quote received」(E-27) | 분기 점선 |
| HTL_INVITE → HTL-06 confirm → done | 메일 푸터 → [페이지] · `unsubscribe(check)` → 「Unsubscribe」 → [패널] · `unsubscribe(confirm)` | 다음 단계 아님(보조) |

#### `F7 · flow · 대리 입력 확인 · PC`
- 태그 다음 단계 · 카드: PTR-03 bidding → PTR-03 modal-proxy-enter → 🔔 HTL_CONFIRM → HTL-05 review → HTL-05 done → ADM-03/PTR-03 초대 행 「견적 제출 · 대리 입력 · 호텔 확인」 / 가지: HTL-05 disputed → HTL-03 open · HTL-05 expired · HTL-05 used
| 시작 → 끝 | 라벨 |
|---|---|
| PTR-03 → 모달 | 「대리 입력」 → [모달] · 통화·요금·조식·세금·볼룸·유효기한·취소·증빙 메모 |
| 모달 → HTL_CONFIRM | 「저장하고 호텔 확인 요청」 · `partner_quote_proxy_enter` · HTL_CONFIRM(72시간, 1회용) · 초대 → 대리 입력·호텔 확인 대기 |
| HTL_CONFIRM → HTL-05 review | 메일 버튼 → [앱→페이지] · `confirm.html?t=` · `quote_confirm(lookup)` |
| review → done | 「Confirm this quote」 → [패널] · `quote_confirm(confirm)` · PTR_HOTEL_CONFIRMED · 초대 → 견적 제출(비교표에 실림) |
| review → disputed | 「Something is wrong」 → [패널] → 「Flag and do not use this quote」 · `quote_confirm(dispute)` · PTR_HOTEL_DISPUTED · HQ_PROXY_DISPUTED(개입 「호텔 이의(대리 입력)」) |
| disputed → HTL-03 open | 「Submit my own quote」 → [페이지] · 원래 초대 링크 |
| review → expired | 72시간 경과 · 초대 → 호텔 확인 기한 지남 → 파트너 「재발송」(`partner_quote_proxy_resend`, 3회) 또는 「대리 입력」 |
| review → used | 견적 정리 중 전환 뒤 stale → 「Already handled」(호텔은 제외 사실 모름, E-80) |

#### `F8 · flow · 운영자 접수 → 비교표 · PC`
- 태그 핵심 · 카드: ADM-00 default → ADM-01 default(카드 「새 접수」) → ADM-02 filtered(new) → ADM-03 received → verifying → (익명화 검토 카드) → open → (마감·초대 카드) → bidding → (팔로업·재초대) → collecting → collecting-usd → delivered
| 시작 → 끝 | 라벨 | 선 |
|---|---|---|
| ADM-00 → ADM-01 | 「로그인」 → [페이지] · Auth `signInWithPassword` + `admin_snapshot()` | 흐름① |
| ADM-01 → ADM-02 | 카드 「새 접수」 → [페이지] · `rfps.html?filter=new` | 흐름① |
| ADM-02 → ADM-03 | 카드 → [페이지] · `rfp.html?id=MG-2610-014` | 흐름① |
| received → verifying | 「요건 확인 시작」 → [패널] · `admin_transition('verifying')` · —(SLA 기산) | 흐름① |
| verifying → (익명화) | 「공개 메모 저장」 「익명화 검토 완료 표시」 → [패널] · `admin_rfp_update` | 흐름① |
| verifying → open | 「초대 준비로」 → [패널] · `admin_transition('open')` (GUARD_ANON) | 흐름② |
| open → (초대) | 「마감 저장」 → [패널] · `admin_rfp_update({deadline})` / 「초대 보내기」 → [패널] · `admin_invite` · HTL_INVITE | 흐름② |
| open → bidding | 「견적 받기 시작」 → [패널 / 2곳 미만 모달] · `admin_transition('bidding')` · ORG_BIDDING | 흐름② |
| bidding → (팔로업·재초대) | 「팔로업 메일」 → [앱] · OPS_HTL_FOLLOWUP / 「재초대」 → [패널] · `admin_reinvite` · HTL_INVITE | 일반 |
| bidding → collecting | 시스템 10분 cron 또는 「견적 정리 시작」 → [패널] · `admin_transition('collecting')` | 흐름② |
| collecting → collecting-usd | USD 참고·기준일 입력 → [패널] · `admin_quote_update`(500ms) | 흐름② |
| collecting-usd → delivered | 「비교표 전달」 → [패널] · `admin_transition('delivered')` · ORG_DELIVERED | 흐름② |

#### `F9 · flow · 성사 · 종료 · 정산 개시 · PC`
- 태그 핵심 · 카드: ADM-03 delivered → (분기 4) → won · lost · cancelled · bidding(R2) → ADM-11 list(정산 생성)
| 시작 → 끝 | 라벨 | 선 |
|---|---|---|
| delivered → won (요청자 인증) | ORG-02 P1 `pick_verify` → `pick_and_win` · ORG_WON·HTL_SELECTED_CONNECT·HTL_NOT_SELECTED (다음 단계) | 흐름② 점선 |
| delivered → won (대리 확정) | 「선정」 → [패널] · `admin_mark_selection` → 「성사로 닫기」 → [모달] modal-consent · `admin_transition('won', p_consent)` · 같은 알림 (+파트너 관리자면 HQ_PROXY_CONSENT_RECORDED) | 흐름② |
| won → ADM-11 | 시스템 · 정산 1건 생성(커미션 입력 대기, 수금 기한 = 행사 종료+30일) · PTR_WON | 흐름② |
| delivered → lost | 「미성사로 닫기」 → [모달] modal-lost · ORG_LOST (확인 메일 OPS_ORG_CLOSE_CHECK 수동) | 분기 |
| delivered → cancelled | 「요청 취소」 → [모달] modal-cancel · ORG_CANCELLED | 분기 |
| delivered → bidding | 「조건 변경 → 새 라운드」 → [모달] modal-rebid · ORG_REBID(라운드 +1) | 분기 |

#### `F10 · flow · 호텔 심사 · 회원 · 피드백 · PC`
- 태그 핵심(호텔) · 다음 단계(회원·피드백) · 띠 3줄:
  1. 호텔 심사: ADM-01 「파트너 심사 지연」 → [페이지] ADM-04 filtered(delayed) → [페이지] ADM-05 pending → [모달] 승인/거절 → PTN_APPROVED/PTN_REJECTED (→ F5)
  2. 회원: ADM-01 「연결 요청 대기 1건」 → [페이지] ADM-06 filter-link → [페이지] ADM-07 active → [모달] 연결 승인 · `admin_link_decide` · ACC_LINKED / 「잠긴 계정」 → ADM-06 `?state=locked` → ADM-07 locked → [모달] 잠금 해제 · `admin_member_action` / 정지·이관·탈퇴 모달(안내 수동 OPS_RFP_TRANSFER, E-84·E-91)
  3. 피드백: CMN-01 「보내기」 → `feedback-submit` · FB_ACK(이메일 남긴 경우) · FB_OPS_ALERT → 메뉴 「피드백」 배지 → [페이지] ADM-08 list → [페이지] ADM-09 new → [패널] 분류(P·하위 코드·담당) → 「분류 완료」 → triaged → 「처리 시작」 → in_progress → [모달] 「완료」(결과 6) → done / 「보류」 / 「다시 열기」 · 회신은 [앱] 메일(`Re: [MICEGO 피드백] …`)

#### `F11 · flow · 정산 · PC`
- 태그 다음 단계 · 카드(상태 칩 = 정산 8): ADM-03 won → ADM-11 list → PTR-07 pending_commission → ADM-12 commission_submitted → commission_confirmed → collected → remitted → completed / 가지 disputed · voided · 기한 초과 개입
| 시작 → 끝 | 라벨 |
|---|---|
| won → pending_commission | 시스템 생성 · 합의 요율 스냅샷(없으면 플래그) · 배분 파트너 70 : MICEGO 30(본사 단독 0:100) |
| pending → submitted | 파트너 관리자(본사 단독 건은 운영자) 「커미션 입력」 → [모달] · `settlement_action(submit_commission)` · 계약 순액 × 5~20% · HQ_COMMISSION_SUBMITTED |
| submitted → confirmed | 운영자 「커미션 승인」 → [모달] · 입력자와 다른 사람, 호텔 사후 검토 완료(E-87) · PTR_COMMISSION_APPROVED |
| submitted → pending | 운영자 「반려」 → [모달] 사유 · PTR_COMMISSION_REJECTED |
| confirmed → collected | 「수금 기록」 → [모달] · 수금 기한 = 행사 종료 + 30일 · 송금 기한 = 수금 + 14일 |
| collected → remitted | 「송금 기록」 → [모달] · 환율·참조번호 · HQ_REMITTED |
| remitted → completed | 운영자 「입금 확인 · 완료」 → [모달] · PTR_SETTLEMENT_COMPLETED |
| (진행 중) → disputed → (복귀) | 「분쟁 제기」(운영자·관리자) · HQ_SETTLEMENT_DISPUTE → 운영자 「분쟁 해소」 · PTR_SETTLEMENT_RESOLVED |
| (진행 중) → voided | 운영자 「무효 처리」 |
| 기한 초과 | 시스템 · 개입 「정산 기한 초과」 + 목록 빨간 「초과」 |

#### `F12 · flow · 지역 파트너 · PC`
- 태그 다음 단계 · 카드: ADM-13 list → modal-org-edit(등록, 온보딩) → modal-org-region → modal-org-status(활성화) → modal-org-invite → 초대 메일 → PTR-00 → PTR-01 → (자동 배정) → PTR-02 → PTR-03 received/verifying → 요청자 정보 보기 → PTR-03 bidding(대리 입력 → F7) → PTR-03 delivered(관리자 성사) → PTR-06/07(→ F11) / 가지: 배정 반려 · 본사 인계 · 조직 정지 · 담당자 금지 버튼
| 시작 → 끝 | 라벨 |
|---|---|
| ADM-13 → 등록 | 「지역 파트너 등록」 → [모달] · `partner_org_upsert` · 온보딩 |
| 등록 → 지역 | 「지역 설정」 → [모달] · `partner_region_set`(주 담당 1곳) |
| 지역 → 활성화 | 「활성화」 → [모달 확인] · `partner_org_upsert` · 담당 지역 새 요청 자동 배정 시작 |
| 활성화 → 초대 | 「계정 초대」 → [모달] · `partner_invite` · Supabase 초대 메일 |
| 초대 메일 → PTR-00 | 메일 링크 → [앱→페이지] · `accept.html` → 「비밀번호 저장하고 시작」 · `console_accept()` |
| PTR-00 → PTR-01 | [페이지] · `dashboard.html` |
| (요청 접수) → PTR-02 | 시스템 자동 배정 · 위임 PTR_ASSIGNED / 실패 → 본사 보유(이유 9) → 운영자 「파트너 배정」 |
| PTR-02 → PTR-03 | 카드 → [페이지] |
| PTR-03 가림 → 열람 | 「요청자 정보 보기」 → [패널] · `rfp_get_identity`(열람 기록) |
| PTR-03 → 처리 | 상태 전이(운영자와 같은 버튼) · 대리 입력(F7) |
| PTR-03 delivered → won | 파트너 관리자 「성사로 닫기」 → [모달] 동의 기록 · HQ_PROXY_CONSENT_RECORDED · PTR_WON |
| 가지: 배정 반려 | 관리자 「배정 반려(본사 처리 요청)」 → [모달] · `rfp_decline_assignment` · HQ_PARTNER_DECLINED → 본사 보유 |
| 가지: 본사 인계 | 운영자 「본사 인계」 → [모달] · PTR_TAKEN_OVER → 파트너 읽기 전용(안내 없음, E-89) |
| 가지: 조직 정지 | 운영자 「정지」 → 계정 읽기 전용(PARTNER_SUSPENDED), 위임 건 개입 「파트너 조직 정지」, PTR-08만 안내 |
| 가지: 담당자 금지 | 담당자 「반려」「요청 취소」 → 서버 FORBIDDEN / 「성사로 닫기」 → 토스트(E-57·E-88) |

#### `F13 · flow · 알림 지도 · PC`
- 태그 핵심 · 표 프레임(전이 × 템플릿 × 받는 사람 × 채널 × 여는 화면):
| 전이 / 행동 | 템플릿 | 받는 사람 | 채널 | 여는 화면 |
|---|---|---|---|---|
| #0 접수 | ORG_RECEIVED | 요청자 | 메일 + 알림톡(LMS) | ORG-02 |
| #2 반려 | ORG_REJECTED | 요청자 | 메일 + 알림톡 | ORG-02 rejected |
| #4 견적 받기 시작 | ORG_BIDDING | 요청자 | 〃 | ORG-02 bidding |
| 「초대 보내기」·「재초대」 | HTL_INVITE | 호텔 | 메일 | HTL-03 open |
| 마감 24시간 전 | HTL_REMINDER | 호텔 | 메일 | HTL-03 |
| 견적 제출·수정 | HTL_QUOTE_RECEIVED | 호텔 | 메일 | HTL-03 submitted |
| #6 비교표 전달 | ORG_DELIVERED | 요청자 | 메일 + 알림톡 | ORG-02 delivered |
| 「제안 X 선택」 | ORG_PICK_OTP | 요청자 휴대전화 | 문자 | (링크 없음) |
| #7·#9 조건 변경 | ORG_REBID | 요청자 | 메일 + 알림톡 | ORG-02 rebid |
| #10 성사 | ORG_WON · HTL_SELECTED_CONNECT · HTL_NOT_SELECTED (+PTR_WON, 파트너 관리자 대리 확정 HQ_PROXY_CONSENT_RECORDED) | 요청자 · 선정 호텔(요청자 참조) · 나머지 제출 호텔 | 메일(+알림톡) | ORG-02 won · HTL-03 selected/not_selected |
| #8·#11 미성사 | ORG_LOST | 요청자 | 메일 + 알림톡 | ORG-02 lost |
| #12·#12b 취소 | ORG_CANCELLED (+PTR_ORG_CANCELLED) | 요청자(+파트너) | 메일 + 알림톡 | ORG-02 cancelled |
| 호텔 등록 / 승인 / 요율 제안 / 거절 / 재승인 | PTN_APPLIED / PTN_APPROVED / PTN_COMMISSION_TERMS / PTN_REJECTED / PTN_REINSTATED | 호텔 신청자 | 메일 | HTL-04(승인·요율) |
| 대리 입력 저장 | HTL_CONFIRM | 호텔 | 메일 | HTL-05 |
| 위임·정산·호텔 확인 등 | CONSOLE_NOTICE(PTR_* 14 · HQ_* 11) | 파트너 / 본사 | 콘솔 + 메일 | PTR-01 / ADM-01 |
| 회원 | ACC_* 11 | 회원 | 메일(문자: ACC_SMS_OTP) | ORG-03~08 |
| 의견 | FB_ACK · FB_OPS_ALERT | 보낸 사람 / 운영 | 메일 | — |
| 수동 | OPS_* 14 | 각자 | 운영자 직접 메일 | — |
- 아래 E 줄: E-45(취소 호텔 알림 없음) · E-47(리마인더가 수신 거부 뒤에도) · E-27(미성사 호텔 알림 없음)

#### `SW · flow · 한 건 스윔레인 MG-2610-014 · PC`
- 태그 핵심 · 레인 6(위→아래): 요청자 · 지역 파트너 · 본사 운영자 · 호텔 A(Ocean Pearl) · 호텔 B·C(Lotus Bay · Sunrise Garden) + 호텔 D·E(Marble Coast · Hoi An) 묶음 · 시스템·알림
- 시간 축(진행 상황 화면 날짜): 09-30(수) → 10-02(금) → 10-05(월) → 10-07(수) → 10-08(목) → 10-12(월) → 10-14(수)
| 시점 | 레인 · 사건 (카드 / 알림) |
|---|---|
| 09-30 14:20 | 요청자: ORG-01 「견적 요청하기」 → 시스템: ORG_RECEIVED → 요청자: ORG-02 접수됨 |
| 09-30 | 지역 파트너: 「해당 없음 — 다낭(VN-DAD)을 맡는 활성 파트너 없음 → 본사 보유(파트너 없음)」(점선 메모: 위임 건이었다면 PTR_ASSIGNED → PTR-03에서 같은 일을 함) |
| 09-30 | 본사: ADM-03 「요건 확인 시작」(SLA 기산) |
| 10-02 | 본사: 익명화 검토 완료 → 「초대 준비로」 · 요청자 화면은 계속 「요건 확인 중」(E-34) |
| 10-05 09:00 | 본사: 마감 10-08 18:00 저장 → 「초대 보내기」 5곳 → 시스템: HTL_INVITE ×5 → 「견적 받기 시작」 → ORG_BIDDING → 요청자: ORG-02 호텔 제안 받는 중 |
| 10-05~ | 호텔 A~E: HTL-03 open(열람함) |
| 10-06 15:20 | 호텔 A: 「Review & send quote」 → HTL_QUOTE_RECEIVED → HTL-03 submitted |
| 10-07 | 시스템: HTL_REMINDER(미제출 호텔) · 호텔 B: 제출 10:05 · 호텔 E: 「Review & decline」(Dates unavailable) |
| 10-08 09:40 | 호텔 C: 제출 |
| 10-08 18:00 | 시스템: 마감 cron → 호텔 D 기한 지남(HTL-03 expired) → 견적 정리 중 → 요청자: 제안 정리 중 |
| 10-09 | (한글날, 영업일 아님) |
| 10-12 | 본사: USD 참고 입력(A 145 · B 126 · C 123, 기준일 10-12) → 「비교표 전달」 → ORG_DELIVERED → 요청자: 비교표 도착 |
| 10-13~14 | 요청자: 「제안 A 선택」 → (본 기획) ORG_PICK_OTP → 인증 → `pick_and_win` / (MVP) 메일 회신 → 본사 「선정」 + 「성사로 닫기」(동의 기록) |
| 10-14 | 시스템: ORG_WON(요청자) · HTL_SELECTED_CONNECT(호텔 A, 요청자 참조) · HTL_NOT_SELECTED(호텔 B·C) · 정산 생성 → 요청자 연결 완료 · 호텔 A Selected · 호텔 B·C Not selected · 호텔 D Expired · 호텔 E Declined |
| 이후 | 본사(본사 단독 건): ADM-12 커미션 입력 → … → 완료(F11) |
- 레인 끝 메모: 「요청자 신원이 호텔에 가는 시점은 10-14 성사 한 번뿐(호텔 A만)」

---

## 프레임 수 (이 브리프)
- PC 14 (F1~F13 + SW) · 컴팩트 0 · 모바일 0 · 모달 0
