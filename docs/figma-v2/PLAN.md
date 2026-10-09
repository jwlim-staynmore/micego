# MICEGO Figma v2 빌드 플랜 — 유저 타입별 랜딩 · 전체 기능 플로우 · 페이지 UX (풀 버전) - 클로드

작성 2026-10-09 · 기획: Fable 에이전트 · 대상 파일 `1zo93NzgNoMv8eMkHX9t2I` · v1 페이지(00~06)는 그대로 두고 새 페이지는 모두 `v2 · ` 접두어.

- 기준 문서: `docs/ux-flow-spec-v2.md`(3장 용어·4장 전이·부록 A), `docs/ux-spec-v2/5a~5d`, `docs/ux-spec-v2/figma-update-sheet.md`(프레임 이름·배지·스티커·노트·출처 표식 규약, 상태 세트 S-*)
- 범위: **풀 버전**. 〔다음 단계〕 화면(회원제·공유 링크·HTL-05·ADM-06~13·PTR-*)도 상태별 프레임으로 그림. MVP 태그 칩은 유지하되 프레임을 회색 톤으로 죽이지 않음
- 그리는 기준: "현재 코드가 하는 동작". 결함은 E-스티커로만 표기
- 이미지 업로드 불가 → 전부 편집 가능한 레이어(샘플 ORG-02 3장 스타일: 1280 PC, Noto Sans KR, 틸 `#128C7E`, 네이비 `#0F1B2D` 요청 표시줄)

## 1. v2 페이지 구성

| 페이지 | 담는 것 |
|---|---|
| `v2 · 00 표지 · 범례 · IA` | 표지, 범례(ID 체계 · 태그 4색 · 이동 방식 4종 · 데이터 출처 3종 · 권한 칩 · 알림 칩), 서비스 한 줄 + 두 흐름 띠, 결정 대기 카드(G-1 결정됨 D-54), 유저 타입별 IA 트리 4개, 터치포인트 매트릭스, 화면 목록, 댓글 Q&A 규약 |
| `v2 · 01 유저 타입별 랜딩` | 허브 + 4 유저 첫 화면(전체 스크롤) + 진입 경로 매트릭스 |
| `v2 · 02 기능 플로우` | 끝에서 끝 흐름 F1~F13 + 한 건 스윔레인 |
| `v2 · 03 요청자 화면` | HUB·CMN·ORG-01·02·02s·03~09·LEGAL |
| `v2 · 04 호텔 화면` | HTL-01~07 |
| `v2 · 05 운영 콘솔(본사)` | ADM-COM·00·00b·01~13 |
| `v2 · 06 지역 파트너 콘솔` | PTR-00~08 차이점 중심 + 권한 매트릭스 참고표 |
| `v2 · 07 상태 전이도` | 견적 요청 · 초대 · 호텔 심사 · 요율 합의 · 선택 인증 세부 · 위임 · 정산 8상태 · 회원 6상태 |
| `v2 · 08 컴포넌트 · 주석 규격` | 주석 컴포넌트 원본, 예시 데이터 카드 |

## 2. 유저 타입별 랜딩 (`v2 · 01`) — 열 하나 = 유저 하나

| 열 | 유저 | 랜딩 프레임 | 반드시 보여야 하는 것 |
|---|---|---|---|
| 0 | 허브 | HUB-01 default (+404) | 두 모드 카드(여행사 → ko/, Hotels → en/), 최근 방문, 푸터 |
| 1 | 요청자 | ORG-01 guest 전체 스크롤 | 헤더(로그인·회원가입), h1, 섹션 7개, #register 폼, FAQ, 의견 위젯. 회원 재방문 = ORG-06 list 참조 카드 |
| 2 | 호텔 | HTL-01 form 전체 스크롤 | h1, Three steps, 샘플 요청(HTL-02), Partner terms(5~20%), Register 폼, FAQ. 하단에 "토큰 링크 3개" 카드: HTL_INVITE→HTL-03, HTL_CONFIRM→HTL-05(72h), PTN_APPROVED→HTL-04(168h) |
| 3 | 본사 운영자 | ADM-00 → ADM-01 | 로그인 폼(계정 만들기 없음, ?e= 오류 줄) / 대시보드: 사이드 메뉴 8, 할 일 카드 7, 개입 필요 표, 회원 카드, 지표, 발송 실패 |
| 4 | 지역 파트너 | PTR-00 수락 → ADM-00 → PTR-01 | 비밀번호 설정·동의 / 메뉴 5, 조직 요약 카드(담당 지역·진행 요청·본사 인계·정산 처리·배분 70:30), 개입 표(5종), 정지 시 읽기 전용 상자 |

아래 공통: 진입 경로 매트릭스(행 4 유저 × 열 직접 주소/메일 버튼/알림톡·문자/토큰 링크/콘솔 로그인).

## 3. 기능 플로우 (`v2 · 02`) — 노드 = 플로우 카드(화면 ID·이름·상태 칩·핵심 버튼), 선 라벨 「버튼」 → [이동 방식] · 목적지 · 서버 호출 · 알림

| # | 흐름 | 노드 순서 |
|---|---|---|
| F1 | 요청자 · 견적 요청 → 성사 | HUB-01 → ORG-01 guest → submit_rfp → ORG-01 done → ORG_RECEIVED → ORG-02 received → verifying → ORG_BIDDING → bidding → collecting → ORG_DELIVERED → delivered P0 → 「제안 A 선택」 pick_send_otp → P1 → pick_verify → P3 → ORG_WON → won |
| F2 | 요청자 · 분기 | 취소(12b) / 반려 / 조건 변경 → rebid / 미성사 / P2 잠금 / 질문·조건 변경 / invalid |
| F3 | 회원가입 → 내 요청 → 공유 링크 | ORG-01 done → ORG-03 form → email_sent → phone_entry → phone_sent → done → ORG-06 list → create_share_link → ORG-02s → 만료 invalid / link_pending → ADM-07 승인 → ACC_LINKED |
| F4 | 로그인 · 재설정 · 계정 · 탈퇴 | ORG-04 → error/cooldown/locked → ORG-05 request→sent→form→done / ORG-07 reauth→saved / ORG-08 confirm→done·blocked |
| F5 | 호텔 등록 → 심사 → 요율 합의 | HTL-01 → register_partner → PTN_APPLIED → ADM-05 pending → reviewing → 승인+요율 → PTN_APPROVED → HTL-04 review → partner_commission_accept → done → 초대 가능 / 거절 / 중지·재승인 / 만료 재발송 |
| F6 | 호텔 초대 → 견적 → 결과 | ADM-03 초대 → HTL_INVITE → HTL-03 open → submit_quote → submitted → 수정 → selected / not_selected ; declined / expired / cancelled(E-45) / lost(E-27) / HTL-06 |
| F7 | 대리 입력 확인 | PTR-03 대리 입력 → HTL_CONFIRM(72h) → HTL-05 review → confirm → done / dispute → disputed → HTL-03 / 만료 → used(E-80) |
| F8 | 운영자 접수 → 비교표 | ADM-00 → ADM-01 → ADM-02 → ADM-03 received → verifying → 익명화 검토 → open → 마감·초대 → bidding → 팔로업·재초대 → cron → collecting → USD → delivered |
| F9 | 성사 · 종료 · 정산 개시 | delivered → OTP 성사 또는 「성사로 닫기」 동의 모달 → won(정산 자동 생성) / 미성사 / 취소 / 새 라운드 |
| F10 | 호텔 심사 · 회원 · 피드백 | ADM-04→05 ; ADM-06→07 조치 ; ADM-08→09 |
| F11 | 정산 | won → pending_commission → 커미션 입력 → commission_submitted → 승인/반려 → commission_confirmed → 수금(+30d) → collected → 송금(14d) → remitted → 완료 ; 분쟁 / 무효 / 기한 초과. 70/30, 호텔 커미션 5~20% |
| F12 | 지역 파트너 | ADM-13 등록 → 지역 설정 → 활성화 → 계정 초대 → PTR-00 → PTR-01 → 자동 배정(delegated / hq_held 9사유) → PTR-02 → PTR-03 정보 열람 → 처리·대리 입력 → 대리 확정(HQ 알림) → 정산 ; 배정 반려 / 본사 인계 / 조직 정지 / 담당자 금지 버튼 |
| F13 | 알림 지도 | 전이 × 알림 템플릿 × 여는 화면 |
| SW | 한 건 스윔레인 MG-2610-014 | 레인: 요청자 / 지역 파트너 / 본사 / 호텔 A·B·C / 시스템·알림 |

## 4. 화면 인벤토리 — PC(1280 전면) · 컴팩트(640, 바뀌는 영역만) · 모바일(360) · 모달(560)

### 4-1. 요청자 (`v2 · 03`)
| 화면 | PC | 컴팩트 | 모바일 |
|---|---|---|---|
| HUB-01 / 404 | default, 404 | recent | default |
| CMN-02 | invalid | loading, preview | |
| CMN-01 | open | closed, submitting, done, error | |
| ORG-01 | guest(폼 영역), error, done | member, sending, server_error, done_mailto | guest, done |
| ORG-02 | received, verifying, bidding, rebid, collecting, delivered(P0), won, lost | loading, rejected, cancelled, invalid | received, bidding, delivered, delivered-p1, won |
| ORG-02 세부 | received-cancel, delivered-p1, delivered-p3 | received-change, p1-error, p2, p3b, MVP 메일 회신 선택 | |
| ORG-02s | delivered(공유 배너) | received, invalid | |
| ORG-03 | form, email_sent, phone_sent, done | email_wrong, email_expired, email_capped, phone_entry, phone_wrong, phone_locked, phone_capped, phone_taken | |
| ORG-04 | default | error, cooldown, locked, pending, suspended | |
| ORG-05 | request, form | loading, sent, done, expired | |
| ORG-06 | list, list+공유 패널 | loading, need_login, empty, linked, link_pending | |
| ORG-07 | default | loading, reauth, email_step, phone_step, saved, pw_done | |
| ORG-08 | default | loading, confirm, blocked, done | |
| ORG-09 | default, faq | error, rate_limited, failed, sent, mailto, about | |
| ORG-LEGAL | terms | privacy, draft-marker | |

### 4-2. 호텔 (`v2 · 04`)
| 화면 | PC | 컴팩트 | 모바일 |
|---|---|---|---|
| HTL-01 | form, done | form-error, done-mailto | form |
| HTL-02 | form | done-demo | |
| HTL-03 | open, submitted, declined, selected, not_selected, expired | loading, open-error, open-revise, open-mailto, decline-mailto, cancelled, invalid | open, submitted, selected |
| HTL-04 | review, done | loading, expired, used, invalid, noscript | |
| HTL-05 | review, disputed | loading, done, used, expired, invalid | |
| HTL-06 | confirm | loading, done, already, invalid | |
| HTL-07 | default | sent, variants, faq | |

### 4-3. 본사 운영 콘솔 (`v2 · 05`)
| 화면 | PC | 컴팩트 | 모달 |
|---|---|---|---|
| ADM-COM | shell | toast 3, mock-ribbon, 모달 틀 | |
| ADM-00 | default | error, signing-in, login-failed, returned, demo | |
| ADM-00b | 설정 | 확인 중, 링크 무효 | |
| ADM-01 | default | zero | |
| ADM-02 | kanban, list | filtered, empty | |
| ADM-03 | received, verifying, open, bidding, collecting, delivered, won, lost, rejected, cancelled | collecting-usd, collecting-zero, notfound, 소유·공유·선택 인증 카드 3변형, 위임 카드 3변형 | reject, lost, cancel, rebid, consent, consent-error, few-hotels, deadline |
| ADM-04 | pending | approved, suspended, filtered, empty | |
| ADM-05 | pending, approved-agreed, approved-pending | reviewing, approved-none, approved-expired, suspended, rejected | approve, reject, suspend, reinstate, rate |
| ADM-06 | list | 상태 필터 6, empty | |
| ADM-07 | active, locked+연결 요청 | pending_email, suspended, withdrawn, notfound | unlock, suspend, transfer, withdraw, link |
| ADM-08 | list | 경고 칩, empty | |
| ADM-09 | new, in_progress | triaged, on_hold, done, notfound | close, hold, done |
| ADM-10 | holidays | rules, notify, ops, system, prereq | |
| ADM-11 | list | 내 차례 필터, empty | |
| ADM-12 | pending_commission, commission_submitted, remitted | commission_confirmed, collected, completed, disputed, voided | commission, approve/reject, collect, remit, complete, dispute/void |
| ADM-13 | list, detail | onboarding, suspended, terminated, empty | register, region, invite, user-action |

### 4-4. 지역 파트너 (`v2 · 06`)
| 화면 | PC | 컴팩트 | 모달 |
|---|---|---|---|
| PTR-00 | (ADM-00b 참조) | DEMO 띠 | |
| PTR-01 | default | 조직 정지 상자 | |
| PTR-02 | list | | |
| PTR-03 | verifying(마스킹+정보 보기), bidding(대리 입력), taken_over | received(배정 반려), delivered(관리자 성사), 담당자 뷰 | proxy-enter, proxy-edit/resend, decline |
| PTR-04 | list | | register-hotel |
| PTR-05 | approved | 위험 표시 호텔 | |
| PTR-06/07 | list, pending_commission, collected→송금 | 담당자 조회, 분쟁 | |
| PTR-08 | active | 못 찾음, 정지, 종료, 담당자 뷰 | |
| PTR-REF | 권한 매트릭스 + 위임 3상태 + 보유 이유 9 + 개입 8 | | |

## 5. 주석 표준 (샘플 ORG-02 규약 + 권한 칩·알림 칩)
ID 배지(왼쪽 위 바깥) · 태그 칩(핵심 #1F9D55 / 보조 #E0A800 / 다음 단계 #8A8F98 / 결정 대기 #7C5CDB) · 상태 스티커(오른쪽, 세트 전체, 현재 진하게, 들어오는 때·할 수 있는 일) · 분기 노트(노랑, 점선, 「버튼」 → 이동 방식 · 목적지 · 서버 호출 · 알림) · 데이터 출처(서버 #2F6FDE / 빌드 고정 #4A4F57 / 예시 값 #E8710A) · 권한 칩(콘솔) · 알림 칩 · E-스티커 · 「예시」 워터마크 · 근거 줄(ref/spec).

## 6. 빌드 순서
B0 `v2 · 08` + `v2 · 00` → B1 요청자 · B2 호텔 · B3 본사 콘솔 · B4 지역 파트너 · B5 전이도 · B6 랜딩 · B7 플로우 (병렬) → B8 교차 점검.

## 7. 미결과 기본값
U1 코드 그대로 + E-스티커 · U2 태그 4색 유지(회색 처리 안 함) · U3 지역 파트너 별도 페이지 · U4 모바일 12장만 · U5 OTP·요율 합의·호텔 등록 모두 그림, MVP 메일 회신은 컴팩트 1장.
