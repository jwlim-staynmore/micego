# MICEGO 지역 운영 파트너 콘솔 — 기술 설계서 v1 - 클로드

**기준일** 2026-09-27 · **작성 계정** jwlim@staynmore.com · **대상 독자** 구현자(백엔드·콘솔 프론트), 운영 책임자
**전제 문서** 상태전이표 v1.7 · 회원제 설계서 v1 · 피드백 시스템 설계서 v1 · 백엔드 배포 런북 v1 · 지역 운영 파트너 모델 기획안 v1.0
**범위** 지역 운영 파트너(DMC)가 운영 콘솔을 직접 쓰기 위해 필요한 DB·RLS·RPC·Edge Function·콘솔 화면·알림·정산·마이그레이션 전부
**상태** 설계 확정안(구현 전). 전체 코드는 없고, 스키마·RLS·RPC 시그니처·화면 명세·의사코드 수준입니다.

---

## 읽기 전에 — 이름 치환 규칙

실제 마이그레이션 0001~0009를 보지 않고 썼습니다. 아래 이름은 **가정**이며, 구현할 때 실제 이름으로 바꿔야 합니다. 본문에서 이 이름이 나오면 모두 치환 대상입니다.

| 이 문서의 이름 | 뜻 | 근거 |
|---|---|---|
| `rfp` | 견적 요청 | 상태전이표 |
| `rfp.contact_company`, `contact_name`, `contact_email`, `contact_phone` | 오거나이저 신원 스냅샷 컬럼 | 가정 |
| `rfp.destination_country`, `rfp.destination_city` | 목적지 입력값 | 가정(폼 필드) |
| `rfp.event_start`, `rfp.event_end` | 행사 기간 | 가정 |
| `bid_invitation` | 호텔 초대(토큰 보유) | 피드백 설계서 2.11에 등장 |
| `bid_quote` | 호텔 견적(버전 여러 개) | 가정(= bid/quote) |
| `hotel_partner` | 호텔 파트너 레코드 | 가정 |
| `member` | 오거나이저 회원 | 회원제 설계서 |
| `rfp_access_token`, `rfp_share_link` | 추적·공유 토큰 | 피드백 설계서 2.11 |
| `notification_outbox` | 알림 발송 큐(dispatch_notifications가 읽음) | 가정 |
| `audit_log` | 감사 로그 | 가정 |
| `app_setting` | 전역 설정 | 가정 |
| `holiday` | 공휴일(KST SLA 계산용, seed.sql) | 런북 Step 4 |
| `comparison_item` | 비교표에 실린 견적 스냅샷 | 가정 |
| 기존 초대 상태 `invited/opened/submitted/declined/expired/revoked` | 초대 상태 머신 | 가정 |
| 기존 함수 `is_operator()` | 운영자 판정(JWT 기반) | 피드백 설계서 S3 |
| 기존 Edge Function `submit_bid` | 호텔 견적 제출 | 가정(26개 중 하나) |

토큰 컬럼은 피드백 설계서와 같이 `token_sha256 text`(원문 UTF-8 SHA-256 소문자 hex)라고 가정합니다.

---

## 0. 설계하면서 새로 정한 것 (확정 결정 보완)

확정 결정 1~13은 그대로 따릅니다. 아래는 그 결정만으로는 구현이 막히는 부분을 메운 것입니다. 되돌리려면 이 표의 번호를 명시해서 바꾸면 됩니다.

| # | 새로 정한 것 | 근거 |
|---|---|---|
| N1 | **권한의 원천은 DB 테이블 `console_user`** 입니다. `app_metadata.role`·`partner_id`(결정 7)는 그대로 넣되 콘솔 UI 분기와 빠른 사전 차단에만 씁니다. RLS 헬퍼와 RPC는 매번 `console_user`를 조회합니다. | JWT는 최대 1시간 늦게 갱신됩니다. 파트너 계정 정지·조직 이동·권한 회수가 즉시 먹혀야 하고, 조직별 담당자 목록·초대 상태도 테이블이 있어야 보여줄 수 있습니다. app_metadata만으로는 부족합니다. |
| N2 | 기존 `is_operator()`도 `console_user` 조회로 바꿉니다. 기존 운영자는 마이그레이션에서 `auth.users.raw_app_meta_data->>'role'='operator'`로 백필합니다. | 운영자와 파트너를 같은 방식으로 판정해야 규칙이 한 벌로 유지됩니다. |
| N3 | **지역 코드 형식**: `^[A-Z]{2}(-[A-Z0-9]{2,3})?$`. 국가 = ISO 3166-1 alpha-2, 도시 = IATA 도시·공항 3자 코드(예: `VN-DAD`, `TH-HKT`). 예외로 섬 단위가 필요한 곳은 2자(`US-HI`). | 파트너·호텔 담당자 모두 IATA 코드에 익숙하고, 한국어·영어·현지어 표기 차이를 흡수할 수 있습니다. |
| N4 | **RFP 1건 = 지역 1개.** 목적지가 한 나라의 여러 도시면 국가 코드(`VN`)로 올리고, 여러 나라에 걸치면 `hq_held`(사유 `multi_region`)로 둡니다. | 두 파트너가 한 RFP를 나눠 운영하면 책임·정산 귀속이 모호해집니다. 다국가 행사는 드물고 HQ가 직접 운영하는 편이 안전합니다. |
| N5 | 파트너의 RFP **열람 기준은 지역이 아니라 배정(`rfp.partner_id`)** 입니다. 지역은 쓰기 조건에 한 번 더 겁니다. 백업 파트너는 배정되기 전까지 주 파트너의 RFP를 볼 수 없습니다. | 결정 4의 N:M 구조에서 지역 기준으로 열람을 주면 백업 파트너가 경쟁사 건을 보게 됩니다. |
| N6 | **접수 즉시(received) 자동 배정**합니다. RFP INSERT 트리거에서 지역 매핑 → 파트너 배정을 실행합니다. | 결정 2에서 파트너가 "요건 확인"(verifying)부터 운영하므로 접수 직후에 배정돼야 합니다. 트리거로 두면 접수 경로(폼 RPC 교체 전후)와 무관하게 항상 실행됩니다. |
| N7 | 파트너 관리자는 **배정 반려**(`decline`)를 할 수 있습니다. 반려하면 `hq_held` + HQ 알림. 다음 백업으로 자동으로 넘기지 않습니다. | 결정 9의 "자동 인계 없음"과 같은 원칙입니다. 반려 사유를 HQ가 보고 판단합니다. |
| N8 | DB enum 값은 `delegated`, `hq_held`, `taken_over`(하이픈 대신 밑줄). 콘솔 표기는 "파트너 운영 / 본사 보류 / 본사 인계". | Postgres enum과 JS 키에서 하이픈은 따옴표가 필요해 실수가 잦습니다. |
| N9 | **호텔 확인 링크는 별도 토큰**(`confirm_token_sha256`)을 씁니다. URL은 기존과 같은 `bid.html?t=`이고 `get_bid`가 두 컬럼을 모두 조회해 모드를 돌려줍니다. 1회용, 유효기간 72시간, 이메일로만 발송하며 콘솔에는 원문을 절대 보여주지 않습니다. | 기존 비딩 토큰은 초대 시점부터 살아 있고, 호텔이 전달하거나 참조로 넣어 파트너가 볼 수 있었을 가능성이 있습니다. 파트너가 자기 대리 입력을 스스로 확인하는 경로를 막으려면 새로 만든 1회용 토큰을 호텔의 **MICEGO 등록 연락처**로만 보내야 합니다(12장 d·c). |
| N10 | 호텔이 확인 페이지에서 금액을 고쳐 제출하면 그것은 **호텔 직접 제출**(`entered_by='hotel'`)로 새 버전이 되고, 대리 견적은 `superseded`가 됩니다. 금액 없이 "내용이 다르다"만 누르면 `proxy_disputed`. | 결정 5(파트너는 호텔 원본 수정 불가)와 맞물려, 호텔이 만든 숫자만 "호텔 원본"이 됩니다. |
| N11 | **견적 금액 컬럼은 추가 전용(append-only)** 입니다. 운영자를 포함해 누구도 기존 행의 금액을 UPDATE할 수 없고, 수정은 새 버전 INSERT입니다(트리거로 강제). | 결정 5를 역할 체크가 아니라 데이터 구조로 보장합니다. 운영자 계정이 탈취돼도 원본이 남습니다. |
| N12 | 대리 입력에는 **증빙 메모가 필수**(예: "호텔 영업팀 Nok, 10/2 14:10 이메일 회신"), 첨부 파일은 선택입니다. | 호텔이 분쟁을 제기할 때와 HQ 감사 때 근거가 필요합니다. |
| N13 | 대리 입력은 **연락 이메일 인증을 마친 호텔**(`hotel_partner.contact_email_verified_at is not null`)에만 허용합니다. | 파트너가 가짜 호텔을 만들고 자기 이메일을 연락처로 넣어 자기 대리 견적을 확인하는 경로를 막습니다(12장 g). |
| N14 | 오거나이저 신원 컬럼은 **열 단위 SELECT 권한을 회수**하고, 신원은 `rfp_get_identity()` RPC로만 읽습니다. 이 RPC가 열람 로그를 남깁니다. **운영자도 같은 RPC**를 씁니다. | 로그를 화면 코드에만 두면 PostgREST로 컬럼을 직접 조회해 우회할 수 있습니다(12장 i). 운영자 열람도 남겨야 감사 기준이 한 벌이 됩니다. |
| N15 | 파트너 역할은 어떤 테이블에도 **직접 INSERT/UPDATE/DELETE 권한이 없습니다.** 모든 쓰기는 `security definer` RPC 또는 Edge Function을 거칩니다. SELECT만 RLS로 엽니다. | 정책 표가 단순해지고, 가드(상태·위임·지역·잠금)를 한 곳에서 검사할 수 있습니다. |
| N16 | 운영자(HQ)는 `delegated` RFP에서도 모든 상태전이를 할 수 있습니다. 대신 콘솔이 "파트너 담당 건입니다. 인계 없이 직접 처리할까요?" 확인을 받고, 파트너에게 `PTR_HQ_ACTION` 알림, 감사 로그에 `hq_override=true`를 남깁니다. | 오거나이저가 본사에 전화로 취소를 요청하는 등 HQ가 즉시 처리해야 하는 경우가 있습니다. 인계를 강제하면 파트너가 잠겨 오히려 일이 멈춥니다. |
| N17 | 정산 상태 enum은 8개(`pending_commission`, `commission_submitted`, `commission_confirmed`, `collected`, `remitted`, `completed`, `disputed`, `voided`)이고, 콘솔에는 결정 6의 5단계로 묶어 보여줍니다(6장 표). | "커미션 확정" 단계 안에 파트너 입력 → HQ 승인이 있어서 DB에는 둘로 나눠야 가드가 명확합니다. |
| N18 | 금액 반올림: `partner_share = round(commission × pct/100, 통화 소수 자릿수)`, `micego_share = commission − partner_share`. KRW·VND·JPY는 0자리, 나머지 2자리. | 두 몫의 합이 항상 커미션과 정확히 같아야 대사가 맞습니다. 끝전은 MICEGO 몫에 붙습니다. |
| N19 | 배분율은 `partner_org.revenue_share_pct`(기본 70.00)이고, 정산 생성 시 정산 행에 **스냅샷**합니다. | 계약이 바뀌어도 과거 정산이 흔들리지 않습니다. |
| N20 | 인계된 RFP의 파트너 몫은 **기본값 유지(70)** 이고, HQ가 인계 시 0~70 범위에서 `partner_share_override_pct`를 입력할 수 있습니다. 조정 폭의 근거는 파트너 계약서 조항으로 정합니다(11장). | 인계 사유가 파트너 귀책(무응답)인지 HQ 사정인지에 따라 달라서, 시스템은 값을 받을 자리만 두고 기준은 계약으로 넘깁니다. |
| N21 | 정산 기한: **수금 기한 = 행사 종료일 + 30일**(기획안 확정값), **송금 기한 = 수금 완료일 + 14일**(신규 제안값, 계약서에서 확정). 둘 다 `app_setting`으로 바꿀 수 있습니다. | 연체 감지(7장)에 기준일이 필요합니다. |
| N22 | 파트너 알림은 **이메일만**(한국어) 보냅니다. 알림톡·SMS는 보내지 않습니다. | 해외 번호에는 알림톡이 가지 않고, SMS 단가도 높습니다. Tmthai는 한국인 담당자가 있어 한국어로 소통합니다. |
| N23 | 콘솔 계정과 오거나이저 회원 계정은 **같은 이메일로 겸용할 수 없습니다.** 초대 시 이미 회원인 이메일이면 거절합니다. | 한 `auth.users` 행에 회원 세션과 콘솔 권한이 섞이면 회원 페이지에서 콘솔 권한이 딸려 가는 사고가 납니다. |
| N24 | `partner_admin` 계정은 **HQ만** 만들 수 있고, `partner_admin`은 자기 조직의 `partner_member`만 초대합니다. 조직당 활성 계정 상한은 설정값(기본 10). | 파트너 쪽 권한 상승 경로를 없앱니다. |
| N25 | 개입 감지는 **15분 주기 크론**이 `intervention_alert` 테이블을 갱신하고, 대시보드는 이 테이블을 읽습니다. 같은 RFP·같은 사유 알림은 24시간에 한 번만 보냅니다. | 대시보드 쿼리마다 SLA를 다시 계산하면 느리고, 알림 중복을 막을 기록이 없습니다. |
| N26 | **SLA 계산을 SQL 함수로 옮깁니다**(`rfp_sla_due(rfp_id)`). admin.js는 서버 값을 표시만 합니다. 기준은 결정 12대로 KST이고, 파트너 화면에는 현지 시각을 괄호로 병기합니다. | 개입 감지 크론이 서버에서 SLA를 알아야 하고, 계산 로직이 두 벌이면 어긋납니다. |
| N27 | 파트너의 호텔 파트너 열람 범위 = **자기 지역 호텔 전체 + 자기가 소싱한 호텔**. 승인된 호텔의 연락 이메일 변경은 HQ만 할 수 있습니다. | 호텔 레코드는 MICEGO 소유(결정 11)라서 지역 호텔을 함께 쓰는 게 맞고, 연락처는 확인 링크의 수신처라서 파트너가 바꾸면 안 됩니다. |
| N28 | **(2026-09-27 사용자 확정: 검토 게이트 없음)** 파트너가 승인한 호텔은 `approved_via='partner'`로 표시하고, 초대·견적 수집·**비교표 전달까지 HQ 검토 없이 진행**합니다. 통제는 사후로만: ① 파트너 승인 시 HQ에 `HQ_HOTEL_APPROVED_BY_PARTNER` 알림(일일 요약) + 대시보드 "호텔 사후 검토" 위젯 ② 위험 플래그(`free_mail`, `domain_mismatch`, `email_matches_partner`) 호텔은 파트너 승인 불가, HQ만 ③ HQ 미검토 호텔이 **선정되면** `intervention_alert('hotel_unreviewed_won')` + 정산 `hotel_unreviewed` 플래그 → 커미션 승인(S2) 전에 HQ 검토 필수 ④ HQ는 언제든 호텔 승인 취소(결정 11). | 사용자가 파트너 전권(결정 2)의 취지를 우선해 전달 전 대기를 없애기로 함. 가짜 호텔 위험은 ②(위험 플래그)와 ③(정산 단계 차단)으로 낮추고, 잔여 위험은 SOP의 사후 검토 기준으로 관리(12장 g). |
| N29 | 비교표 포함 여부는 **뷰 `v_comparable_quote` + `comparison_item` INSERT 트리거** 두 겹으로 막습니다. | 화면·RPC 어느 경로로 들어와도 확인 전 대리 견적이 비교표에 실리지 않게 합니다. |
| N30 | 파트너가 보는 알림 발송 내역에서는 **오거나이저 수신 주소를 가립니다**(뷰에서 마스킹). | 신원 열람 로그를 거치지 않고 이메일 주소가 보이는 우회로입니다(12장 i). |
| N31 | 월 마감: `settlement_period` 테이블로 월을 닫으면 그 달에 `completed`된 정산은 수정할 수 없고, 이후 조정은 다음 달의 조정 이벤트로 남깁니다. | 결정 6의 "월 마감 조회"를 조회만이 아니라 숫자 고정까지 보장합니다. |

---
## 1. 아키텍처 개요

### 1.1 관계도

```
                         ┌──────────────────────────── MICEGO HQ (operator) ────────────────────────────┐
                         │  전 지역 모니터링 · 개입 · 인계 · 파트너 조직/지역 관리 · 커미션 승인 · 입금 확인  │
                         └──────────────┬──────────────────────────────┬──────────────────────────────┘
                                        │ 관리                          │ 개입(takeover/reassign/hold)
                                        ▼                               ▼
  auth.users ──1:1── console_user ──N:1── partner_org ──1:N── partner_region ──N:1── region ──1:N── region_alias
   (role, partner_id  (role, status,       (status, 70%,       (is_primary,           (VN, VN-DAD,     (다낭, danang,
    = UI 힌트)          partner_id)          dpa_signed_at)       priority)              TH, TH-HKT)      DAD …)
                                               │
                                               │ 배정(partner_id) + 위임 상태(delegation)
                                               ▼
  오거나이저 ──접수──▶ rfp ──(INSERT 트리거: 목적지 → region_code → 파트너 자동 배정)──▶ delegation
                       │     delegated : 파트너가 운영(쓰기)      hq_held : HQ가 운영, 파트너 없음
                       │     taken_over: HQ가 운영, 원래 파트너는 읽기 전용
                       │
                       ├──1:N── bid_invitation ──1:N── bid_quote (entered_by: hotel | partner | operator)
                       │           │  proxy_entered ─(호텔 확인 링크)─▶ hotel_confirmed ─▶ 비교표 포함
                       │           │                              └──▶ proxy_disputed / proxy_expired
                       │           └── hotel_partner (MICEGO 소유, sourced_by 파트너, region_code)
                       │
                       ├──1:N── identity_view_log (신원 열람 — 모든 역할)
                       ├──1:N── rfp_assignment_event (배정·인계 이력)
                       ├──1:N── intervention_alert (개입 필요 신호)
                       │
                       └──won──▶ settlement (1:1) ──1:N── settlement_event, settlement_attachment
                                   partner_share_pct 스냅샷(70) · 호텔 통화 · 송금 통화 · 환율
                                   파트너: 커미션 입력 → HQ 승인 → 파트너 수금 → 파트너 송금 → HQ 입금 확인
```

### 1.2 권한 판정의 흐름

```
요청 ─▶ PostgREST(SELECT) ─▶ RLS 정책 ─▶ 헬퍼(is_operator / my_partner_id / can_read_rfp) ─▶ console_user 조회(DB)
요청 ─▶ RPC(쓰기)        ─▶ private.require_console(roles) ─▶ 대상 행 SELECT … FOR UPDATE ─▶ 가드 ─▶ 변경 + 이벤트 + outbox
요청 ─▶ Edge Function    ─▶ auth.getUser(JWT) ─▶ 사용자 JWT로 RPC 호출(권한 판정은 DB) / 서비스 롤은 Auth Admin·토큰 생성에만
```

원칙은 세 가지입니다.

1. **판정은 DB에서 한 번**: 역할·조직·지역은 모두 `console_user`·`partner_region`에서 읽습니다. JWT 값은 믿지 않습니다.
2. **쓰기는 RPC 안에서 행 잠금 후 가드**: 인계와 상태전이가 동시에 들어와도 한쪽만 성공합니다.
3. **알림은 같은 트랜잭션에서 outbox에 넣고**, 발송은 기존 `dispatch_notifications`가 합니다. 원문 토큰이 필요한 메일(호텔 확인 링크, 계정 초대)만 Edge Function이 직접 보냅니다.

### 1.3 역할별 한 줄 요약

| 역할 | 볼 수 있는 것 | 할 수 있는 것 |
|---|---|---|
| operator (HQ) | 전부 | 전부. 파트너 조직·지역·계정 관리, 배정·인계, 커미션 승인, 입금 확인, 호텔 승인 취소 |
| partner_admin | 자기 조직에 배정된 RFP(인계된 것 포함, 읽기), 자기 지역 호텔, 자기 조직 정산·계정·신원 열람 로그 | 배정된 `delegated` RFP 운영 전부, 대리 입력, 지역 내 호텔 승인, 배정 반려, 정산 입력(커미션·수금·송금), 담당자 초대 |
| partner_member | partner_admin과 같은 RFP·호텔 범위, 자기 조직 정산(읽기) | 배정된 `delegated` RFP 운영, 대리 입력, 호텔 등록 신청(pending 생성) |

partner_member가 못 하는 것: 호텔 승인, 배정 반려, 정산 입력, 계정 초대.

---

## 2. DB 스키마

`private` 스키마(피드백 설계서 2.1에서 만든 비노출 스키마)에 내부 함수를 두고, RLS 정책에서 부르는 헬퍼는 `public`에 둡니다(정책은 호출자 권한으로 함수를 실행하므로 `authenticated`가 EXECUTE할 수 있어야 합니다).

### 2.1 enum

```sql
create type public.console_role          as enum ('operator','partner_admin','partner_member');
create type public.console_user_status   as enum ('invited','active','disabled');
create type public.partner_org_status    as enum ('onboarding','active','suspended','terminated');
create type public.rfp_delegation        as enum ('delegated','hq_held','taken_over');
create type public.quote_entered_by      as enum ('hotel','partner','operator');
create type public.hotel_approved_via    as enum ('hq','partner');
create type public.settlement_status     as enum (
  'pending_commission',    -- 성사: 커미션 입력 대기
  'commission_submitted',  -- 파트너가 커미션 입력, HQ 승인 대기
  'commission_confirmed',  -- HQ 승인 = 커미션 확정
  'collected',             -- 파트너가 호텔에서 수금 완료
  'remitted',              -- 파트너가 MICEGO 몫 송금 완료
  'completed',             -- HQ 입금 확인 = 완료
  'disputed',              -- 분쟁(어느 단계에서든 진입, 해소 시 지정 단계로 복귀)
  'voided'                 -- 무효(성사 후 취소·호텔 계약 불발)
);
create type public.settlement_attachment_kind as enum
  ('hotel_contract','hotel_invoice','collection_proof','remit_proof','other');
create type public.intervention_kind as enum (
  'unassigned_stale',      -- hq_held로 N시간 이상 방치
  'partner_idle',          -- 배정 후 1영업일 동안 파트너 조치 없음
  'sla_breach',            -- SLA 초과
  'partner_inactive',      -- 파트너 조직 정지·종료인데 진행 중 RFP 있음
  'proxy_disputed',        -- 호텔이 대리 견적에 이의
  'organizer_voc',         -- 해당 RFP에 연결된 오거나이저 피드백 접수
  'settlement_overdue',    -- 수금·송금 기한 초과
  'hotel_unreviewed_won'   -- 파트너 승인 호텔이 HQ 검토 없이 선정됨
);
```

**주의:** 기존 초대 상태가 enum이면 값 추가는 별도 마이그레이션 파일에서 합니다(`alter type … add value`는 같은 트랜잭션에서 새 값을 쓸 수 없습니다). 13장 0013 참고.

```sql
-- 0013_invitation_status_values.sql (단독 파일)
alter type public.bid_invitation_status add value if not exists 'proxy_entered';
alter type public.bid_invitation_status add value if not exists 'hotel_confirmed';
alter type public.bid_invitation_status add value if not exists 'proxy_disputed';
alter type public.bid_invitation_status add value if not exists 'proxy_expired';
```

기존 상태가 `text + CHECK`면 CHECK를 교체합니다.

### 2.2 통화 반올림 (생성 컬럼용 IMMUTABLE 함수)

```sql
create function public.ccy_minor(p_ccy char(3)) returns int
  language sql immutable parallel safe as $$
  select case when p_ccy in ('KRW','VND','JPY') then 0 else 2 end $$;

create function public.ccy_round(p_amt numeric, p_ccy char(3)) returns numeric
  language sql immutable parallel safe as $$
  select round(p_amt, public.ccy_minor(p_ccy)) $$;
```

지원 통화는 `app_setting.supported_currencies`(기본 `KRW,USD,THB,VND,IDR,MYR,JPY,EUR`)이고 RPC가 이 목록으로 검증합니다. 함수 안에서 테이블을 조회하면 IMMUTABLE이 깨지므로 자릿수 규칙만 함수에 둡니다.

### 2.3 `region`, `region_alias`

```sql
create table public.region (
  code          text primary key check (code ~ '^[A-Z]{2}(-[A-Z0-9]{2,3})?$'),
  country_code  char(2) not null generated always as (left(code,2)) stored,
  is_country    boolean not null generated always as (length(code) = 2) stored,
  name_ko       text not null,
  name_en       text not null,
  utc_offset_label text,                 -- 표시용 '+07:00'
  active        boolean not null default true,
  sort          smallint not null default 100,
  created_at    timestamptz not null default now()
);
-- 도시 코드는 반드시 국가 행이 먼저 있어야 함
alter table public.region add constraint region_city_parent
  foreign key (country_code) references public.region(code) deferrable initially deferred;
-- (국가 행 자신도 country_code = code 이므로 자기 참조로 성립)

create table public.region_alias (
  alias_norm    text primary key,        -- region_normalize() 결과
  region_code   text not null references public.region(code),
  alias_display text not null,           -- 원래 표기(관리 화면용)
  source        text not null default 'seed' check (source in ('seed','operator')),
  created_by    uuid references auth.users,
  created_at    timestamptz not null default now()
);
create index on public.region_alias (region_code);
```

`region_normalize(text)`: NFC → 소문자 → 공백·하이픈·점·쉼표·괄호 제거 → `'시'`, `'city'`, `'province'` 접미사 제거. `immutable`로 선언합니다.

### 2.4 `partner_org`

```sql
create table public.partner_org (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (code ~ '^[A-Z0-9]{3,12}$'),   -- 'TMTHAI'
  legal_name          text not null,                 -- 계약 법인명
  display_name        text not null,                 -- 콘솔 표기 '티엠타이(Tmthai)'
  public_name         text not null,                 -- 호텔에게 보이는 이름 'MICEGO Thailand · Tmthai'
  country_code        char(2) not null,
  status              public.partner_org_status not null default 'onboarding',
  revenue_share_pct   numeric(5,2) not null default 70.00 check (revenue_share_pct between 0 and 100),
  settlement_currency char(3) not null default 'USD',   -- 기본 송금 통화
  accepting_new       boolean not null default true,    -- 파트너 관리자가 신규 배정 일시 중지
  max_active_rfps     int check (max_active_rfps is null or max_active_rfps > 0),
  max_accounts        int not null default 10,
  contact_name        text, contact_email citext, contact_phone text,
  timezone            text not null default 'Asia/Bangkok',  -- 표시용(현지 시각 병기)
  contract_ref        text,  contract_start date, contract_end date,
  dpa_signed_at       timestamptz,          -- 개인정보 처리위탁 계약(DPA) 체결 시각
  suspended_reason    text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  updated_by uuid references auth.users,
  constraint partner_active_needs_dpa check (status <> 'active' or dpa_signed_at is not null)
);
```

`status='active'`는 DPA 체결 전에는 불가능합니다(11장 체크리스트와 연결).

### 2.5 `partner_region` (N:M)

```sql
create table public.partner_region (
  partner_id   uuid not null references public.partner_org(id) on delete restrict,
  region_code  text not null references public.region(code),
  is_primary   boolean not null default false,
  priority     smallint not null default 100,   -- 백업 순서(작을수록 먼저)
  active       boolean not null default true,
  note         text,
  created_by   uuid references auth.users, created_at timestamptz not null default now(),
  primary key (partner_id, region_code)
);
-- 한 지역 코드에 활성 주 파트너는 하나
create unique index partner_region_one_primary
  on public.partner_region (region_code) where is_primary and active;
create index on public.partner_region (region_code) where active;
```

결정 7의 "파트너 조직 테이블에 region_codes"는 **배열 컬럼 대신 이 테이블**로 구현합니다. 주/백업 구분과 우선순위, 변경 이력이 필요하기 때문입니다. 콘솔에서 편하게 쓰도록 뷰를 둡니다.

```sql
create view public.v_partner_org_regions with (security_invoker = true) as
select po.id as partner_id,
       array_agg(pr.region_code order by pr.region_code) filter (where pr.active)                  as region_codes,
       array_agg(pr.region_code order by pr.region_code) filter (where pr.active and pr.is_primary) as primary_codes
from public.partner_org po left join public.partner_region pr on pr.partner_id = po.id
group by po.id;
```

### 2.6 `console_user` — `auth.users` app_metadata만으로 충분한가?

**판단: 부족합니다. 테이블을 둡니다.** 이유:

| 필요 | app_metadata만 | console_user 테이블 |
|---|---|---|
| 권한 회수 즉시 반영 | JWT 만료(최대 1시간)까지 유효 | 다음 쿼리부터 반영 |
| 조직별 담당자 목록·초대 상태·마지막 접속 | `auth.users`는 PostgREST로 조회 불가, 서비스 롤로 전체 목록을 긁어야 함 | RLS로 바로 조회 |
| 조직당 계정 상한·중복 이메일 검사 | 트랜잭션 안에서 불가 | unique·count로 가능 |
| 감사(누가 초대·정지했는지) | 없음 | 컬럼으로 보관 |

```sql
create table public.console_user (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  role           public.console_role not null,
  partner_id     uuid references public.partner_org(id) on delete restrict,
  status         public.console_user_status not null default 'invited',
  email          citext not null unique,
  display_name   text not null,
  phone          text,
  claims_version int not null default 1,   -- 역할·조직이 바뀔 때마다 +1 → app_metadata에도 기록
  invited_by     uuid references auth.users, invited_at timestamptz not null default now(),
  accepted_at    timestamptz, last_seen_at timestamptz,
  disabled_at    timestamptz, disabled_by uuid references auth.users, disabled_reason text,
  created_at     timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint console_user_partner_scope check ((role = 'operator') = (partner_id is null))
);
create index on public.console_user (partner_id) where status <> 'disabled';
```

app_metadata에는 `{ "role": "partner_admin", "partner_id": "<uuid>", "cv": 3 }`를 넣습니다. `cv`는 `claims_version`입니다. 콘솔은 로드 시 `console_whoami()`를 불러 DB 값과 JWT의 `cv`가 다르면 `refreshSession()`을 합니다(4.6).
### 2.7 `rfp` 컬럼 추가

```sql
alter table public.rfp
  add column region_code     text references public.region(code),
  add column region_source   text check (region_source in ('auto','operator')),
  add column region_input    text,                -- 매핑에 쓴 원문(디버깅·재매핑용)
  add column partner_id      uuid references public.partner_org(id),
  add column delegation      public.rfp_delegation not null default 'hq_held',
  add column hold_reason     text default 'pending' check (hold_reason in
      ('pending','region_unmapped','multi_region','no_partner','partner_ineligible',
       'partner_declined','auto_assign_off','manual','legacy')),
      -- 'pending' = INSERT 직후 자동 배정 트리거가 돌기 전. 기본값이 없으면 hq_held 행의 CHECK에 걸려 접수가 실패함(12장 추가 검증 X3)
  add column delegated_at    timestamptz,
  add column delegated_by    uuid references auth.users,   -- null = 시스템 자동 배정
  add column taken_over_at   timestamptz,
  add column taken_over_by   uuid references auth.users,
  add column takeover_reason text,
  add column partner_share_override_pct numeric(5,2)
      check (partner_share_override_pct is null or partner_share_override_pct between 0 and 100),
  add column row_version     int not null default 1;

alter table public.rfp add constraint rfp_delegation_shape check (
  case delegation
    when 'delegated'  then partner_id is not null and region_code is not null and delegated_at is not null
    when 'taken_over' then partner_id is not null and taken_over_at is not null and taken_over_by is not null
    when 'hq_held'    then partner_id is null and hold_reason is not null
  end);

create index rfp_partner_status_idx    on public.rfp (partner_id, status) where partner_id is not null;
create index rfp_delegation_status_idx on public.rfp (delegation, status);
create index rfp_region_idx            on public.rfp (region_code);
```

`row_version`은 모든 쓰기 RPC가 `+1` 하고, 콘솔이 보낸 `p_expected_version`과 다르면 `stale_version` 오류를 냅니다(동시 편집 방지).

신원 컬럼 열 권한 회수(N14):

```sql
revoke select (contact_company, contact_name, contact_email, contact_phone) on public.rfp from authenticated, anon;
-- 나머지 컬럼은 기존대로 grant select 유지. 기존 콘솔 코드의 select=* 는 명시적 컬럼 목록으로 바꿔야 함(13.4).
```

`member_id`가 rfp에 있으면 그대로 두되(uuid), `member` 테이블은 파트너에게 RLS로 막습니다.

### 2.8 `rfp_assignment_event`

```sql
create table public.rfp_assignment_event (
  id            bigint generated always as identity primary key,
  rfp_id        uuid not null references public.rfp(id) on delete cascade,
  action        text not null check (action in
                  ('auto_assign','auto_hold','assign','reassign','hold','decline',
                   'takeover','release','region_set','hq_override')),
  from_partner  uuid references public.partner_org(id),
  to_partner    uuid references public.partner_org(id),
  from_delegation public.rfp_delegation,
  to_delegation   public.rfp_delegation,
  region_code   text,
  reason        text,
  payload       jsonb not null default '{}',   -- 매핑 근거, override pct 등
  actor         uuid references auth.users,    -- null = 시스템
  actor_role    public.console_role,
  created_at    timestamptz not null default now()
);
create index on public.rfp_assignment_event (rfp_id, created_at);
```

### 2.9 `bid_invitation` 컬럼 추가

```sql
alter table public.bid_invitation
  add column confirm_token_sha256     text unique,
  add column confirm_token_expires_at timestamptz,
  add column confirm_token_used_at    timestamptz,
  add column confirm_sent_at          timestamptz,
  add column confirm_sent_to          citext,          -- 발송 시점의 hotel_partner 연락 이메일 스냅샷
  add column confirm_remind_count     smallint not null default 0,
  add column proxy_quote_id           uuid,            -- 확인 대기 중인 대리 견적(bid_quote.id)
  add column disputed_at              timestamptz,
  add column dispute_reason           text check (dispute_reason is null or length(dispute_reason) <= 1000);

create index on public.bid_invitation (left(confirm_token_sha256, 8));   -- 피드백 연결 조회용(피드백 설계서 2.11과 같은 규칙)
create index on public.bid_invitation (confirm_token_expires_at) where status = 'proxy_entered';
```

### 2.10 `bid_quote` 컬럼 추가

```sql
alter table public.bid_quote
  add column entered_by           public.quote_entered_by not null default 'hotel',
  add column entered_by_user      uuid references auth.users,
  add column entered_by_partner   uuid references public.partner_org(id),
  add column proxy_entered_at     timestamptz,
  add column proxy_evidence_note  text,
  add column proxy_evidence_path  text,          -- storage: quote-evidence/<rfp_id>/<quote_id>/<file>
  add column confirmed_at         timestamptz,
  add column confirmed_via        text check (confirmed_via in ('confirm_link')),
  add column superseded_at        timestamptz,
  add column superseded_by        uuid references public.bid_quote(id);

alter table public.bid_quote add constraint quote_entry_shape check (
  case entered_by
    when 'hotel' then entered_by_user is null and proxy_entered_at is null and confirmed_at is null
    else entered_by_user is not null and proxy_entered_at is not null
         and proxy_evidence_note is not null and length(proxy_evidence_note) between 5 and 1000
  end);
alter table public.bid_quote add constraint quote_partner_has_org
  check (entered_by <> 'partner' or entered_by_partner is not null);
```

**금액 불변 트리거 (N11):**

```
trigger bid_quote_immutable BEFORE UPDATE on bid_quote for each row:
  -- 허용되는 변경: confirmed_at(null→값, 1회), confirmed_via, superseded_at, superseded_by (null→값, 1회)
  if (new.* 에서 위 4개 컬럼을 제외한 모든 컬럼) is distinct from (old.* 에서 같은 컬럼) then
     raise exception 'quote_immutable' using errcode = 'P0001';
  if old.confirmed_at is not null and new.confirmed_at is distinct from old.confirmed_at then raise 'quote_immutable';
  if old.superseded_by is not null and new.superseded_by is distinct from old.superseded_by then raise 'quote_immutable';
trigger bid_quote_no_delete BEFORE DELETE → raise 'quote_immutable'
```

구현 팁: `to_jsonb(new) - array['confirmed_at','confirmed_via','superseded_at','superseded_by']`와 같은 식을 old에도 적용해 비교하면 금액 컬럼 이름을 몰라도 됩니다(컬럼이 늘어도 자동으로 보호).

**비교 가능 견적 뷰 (N29):**

```sql
create view public.v_comparable_quote with (security_invoker = true) as
select q.*
from public.bid_quote q
join public.bid_invitation i on i.id = q.invitation_id
where q.superseded_by is null
  and (q.entered_by = 'hotel' or q.confirmed_at is not null)
  and i.status in ('submitted','hotel_confirmed');     -- 기존 '제출됨' 상태 이름으로 치환
```

`comparison_item` INSERT 트리거는 넣으려는 `quote_id`가 이 뷰 조건을 만족하는지 다시 확인하고, 아니면 `quote_not_comparable` 오류를 냅니다.

### 2.11 `hotel_partner` 컬럼 추가

```sql
alter table public.hotel_partner
  add column region_code              text references public.region(code),
  add column sourced_by_partner       uuid references public.partner_org(id),
  add column approved_via             public.hotel_approved_via,
  add column approved_by              uuid references auth.users,
  add column approved_at              timestamptz,
  add column hq_reviewed_at           timestamptz,
  add column hq_reviewed_by           uuid references auth.users,
  add column contact_email_verified_at timestamptz,
  add column risk_flags               text[] not null default '{}';   -- 'free_mail','domain_mismatch','email_matches_partner' 등
create index on public.hotel_partner (region_code, status);
create index on public.hotel_partner (sourced_by_partner) where sourced_by_partner is not null;
create index on public.hotel_partner (hq_reviewed_at) where approved_via = 'partner' and hq_reviewed_at is null;
```

### 2.12 `settlement`

```sql
create table public.settlement (
  id                 uuid primary key default gen_random_uuid(),
  ref                text not null unique check (ref ~ '^ST-[0-9]{4}-[A-HJ-NP-Z2-9]{4}$'),  -- ST-2610-K7QD
  rfp_id             uuid not null unique references public.rfp(id),
  partner_id         uuid references public.partner_org(id),       -- null = HQ 단독 건(파트너 몫 0)
  hotel_id           uuid not null references public.hotel_partner(id),
  quote_id           uuid not null references public.bid_quote(id), -- 선정된 견적
  status             public.settlement_status not null default 'pending_commission',
  status_before_dispute public.settlement_status,
  won_at             timestamptz not null,
  event_end          date not null,
  collect_due_date   date not null,          -- event_end + setting(collect_due_days=30)
  remit_due_date     date,                   -- collected_at(KST 날짜) + setting(remit_due_days=14)

  -- 커미션 (호텔 통화)
  hotel_currency     char(3) not null,
  contract_amount    numeric(18,2) check (contract_amount > 0),   -- 호텔과 오거나이저 최종 계약 금액
  commission_basis   text check (commission_basis in ('rate','fixed')),
  commission_rate_pct numeric(6,3) check (commission_rate_pct is null or commission_rate_pct between 0 and 50),
  commission_amount  numeric(18,2) check (commission_amount is null or commission_amount >= 0),
  partner_share_pct  numeric(5,2) not null check (partner_share_pct between 0 and 100),

  partner_share_amount numeric(18,2) generated always as
    (public.ccy_round(commission_amount * partner_share_pct / 100, hotel_currency)) stored,
  micego_share_amount  numeric(18,2) generated always as
    (commission_amount - public.ccy_round(commission_amount * partner_share_pct / 100, hotel_currency)) stored,

  -- 수금 (호텔 통화)
  collected_at       timestamptz,
  collected_amount   numeric(18,2),

  -- 송금 (송금 통화)
  remit_currency     char(3),
  fx_rate            numeric(18,8) check (fx_rate is null or fx_rate > 0),  -- 1 hotel_currency = fx_rate remit_currency
  fx_rate_date       date,
  fx_rate_source     text,                    -- '송금 은행 적용 환율' 등 자유 기재
  remit_amount_expected numeric(18,2) generated always as (
    public.ccy_round((commission_amount - public.ccy_round(commission_amount * partner_share_pct / 100, hotel_currency))
                     * fx_rate, remit_currency)) stored,
  remitted_at        timestamptz,
  remit_amount_actual numeric(18,2),
  remit_reference    text,

  -- 입금 확인 (송금 통화)
  received_at        timestamptz,
  received_amount    numeric(18,2),
  received_by        uuid references auth.users,

  commission_submitted_at timestamptz, commission_submitted_by uuid references auth.users,
  commission_approved_at  timestamptz, commission_approved_by  uuid references auth.users,
  commission_reject_reason text,
  dispute_opened_at  timestamptz, dispute_opened_by uuid references auth.users,
  dispute_reason     text, dispute_resolution text,
  voided_at          timestamptz, void_reason text,
  flags              text[] not null default '{}',     -- 'fx_outlier','remit_variance','hotel_unreviewed'
  row_version        int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),

  constraint st_commission_le_contract check (commission_amount is null or contract_amount is null or commission_amount <= contract_amount),
  constraint st_same_ccy_fx check (remit_currency is null or remit_currency <> hotel_currency or fx_rate = 1),
  constraint st_hq_only_share check (partner_id is not null or partner_share_pct = 0),
  constraint st_confirmed_needs_amount check (
    status in ('pending_commission','voided') or (status = 'disputed' and status_before_dispute = 'pending_commission')
    or (commission_amount is not null and contract_amount is not null and commission_basis is not null))
);
create index on public.settlement (partner_id, status);
create index on public.settlement (status, collect_due_date);
create index on public.settlement (received_at);
```

**Postgres 제약:** 생성 컬럼은 다른 생성 컬럼을 참조할 수 없어서 `micego_share_amount`, `remit_amount_expected`는 식을 펼쳐 썼습니다. 식을 바꿀 때 세 곳을 같이 고쳐야 합니다.

### 2.13 `settlement_event`, `settlement_attachment`, `settlement_period`

```sql
create table public.settlement_event (
  id            bigint generated always as identity primary key,
  settlement_id uuid not null references public.settlement(id) on delete cascade,
  action        text not null,               -- 6.3의 action 이름 + 'created','period_adjust'
  from_status   public.settlement_status,
  to_status     public.settlement_status,
  diff          jsonb not null default '{}', -- {"commission_amount":[null,"1250000"], ...}
  note          text,
  actor         uuid references auth.users, actor_role public.console_role,
  created_at    timestamptz not null default now()
);
create index on public.settlement_event (settlement_id, created_at);

create table public.settlement_attachment (
  id            uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlement(id) on delete cascade,
  kind          public.settlement_attachment_kind not null,
  storage_path  text not null unique,        -- settlement-evidence/<settlement_id>/<uuid>-<name>
  file_name     text not null, size_bytes int not null check (size_bytes <= 10485760),
  uploaded_by   uuid not null references auth.users,
  created_at    timestamptz not null default now()
);

create table public.settlement_period (
  period        char(7) primary key check (period ~ '^[0-9]{4}-[0-9]{2}$'),   -- '2026-10' (KST 기준 월)
  closed_at     timestamptz not null default now(),
  closed_by     uuid not null references auth.users,
  note          text
);
```

### 2.14 `identity_view_log`

```sql
create table public.identity_view_log (
  id          bigint generated always as identity primary key,
  rfp_id      uuid not null references public.rfp(id) on delete cascade,
  viewer      uuid not null references auth.users,
  viewer_role public.console_role not null,
  partner_id  uuid references public.partner_org(id),
  fields      text[] not null,        -- {'company','name','email','phone'}
  context     text not null check (context in ('rfp_detail','reveal_phone','export','notification_preview')),
  created_at  timestamptz not null default now()
);
create index on public.identity_view_log (rfp_id, created_at desc);
create index on public.identity_view_log (partner_id, created_at desc);
create index on public.identity_view_log (viewer, created_at desc);
-- 추가 전용: UPDATE/DELETE 트리거로 차단, 권한도 없음. 보관 3년(성사 연결 기록 보관 기간과 동일) 후 크론 삭제.
```

### 2.15 `intervention_alert`

```sql
create table public.intervention_alert (
  id           bigint generated always as identity primary key,
  rfp_id       uuid references public.rfp(id) on delete cascade,
  settlement_id uuid references public.settlement(id) on delete cascade,
  partner_id   uuid references public.partner_org(id),
  kind         public.intervention_kind not null,
  severity     smallint not null check (severity between 1 and 3),  -- 1 긴급 · 2 주의 · 3 참고
  detail       jsonb not null default '{}',
  opened_at    timestamptz not null default now(),
  last_notified_at timestamptz,
  snoozed_until timestamptz,
  resolved_at  timestamptz, resolved_by uuid references auth.users,
  resolution   text check (resolution in ('auto_cleared','taken_over','reassigned','dismissed'))
);
create unique index intervention_open_uniq
  on public.intervention_alert (coalesce(rfp_id, settlement_id), kind) where resolved_at is null;
```

### 2.16 `audit_log` 확장

기존 컬럼은 유지하고 아래를 추가합니다.

```sql
alter table public.audit_log
  add column if not exists actor_role   public.console_role,
  add column if not exists partner_id   uuid,
  add column if not exists rfp_id       uuid,
  add column if not exists entity_type  text,     -- 'rfp','bid_quote','settlement','partner_org','console_user','hotel_partner'
  add column if not exists entity_id    text,
  add column if not exists before       jsonb,
  add column if not exists after        jsonb,
  add column if not exists hq_override  boolean not null default false,
  add column if not exists request_id   text;     -- Edge Function이 넘기는 x-request-id
create index if not exists audit_log_partner_idx on public.audit_log (partner_id, created_at desc);
create index if not exists audit_log_rfp_idx on public.audit_log (rfp_id, created_at desc);
```

모든 쓰기 RPC는 `private.audit(entity_type, entity_id, action, before, after, rfp_id)` 한 함수로 기록합니다. 이 함수가 `actor`, `actor_role`, `partner_id`를 `console_user`에서 채웁니다.

### 2.17 Storage 버킷

| 버킷 | 공개 | 경로 규칙 | 읽기 | 쓰기 |
|---|---|---|---|---|
| `quote-evidence` | 비공개 | `<rfp_id>/<quote_id>/<uuid>-<name>` | `can_read_rfp(rfp_id)` | 업로드는 Edge Function(`quote_proxy_enter`)이 서명 URL 발급 |
| `settlement-evidence` | 비공개 | `<settlement_id>/<uuid>-<name>` | operator, 해당 파트너 | 업로드는 `settlement_action`이 서명 URL 발급 |

storage.objects 정책에서 경로 첫 세그먼트를 uuid로 캐스팅해 헬퍼로 검사합니다. 확장자 허용 목록: pdf, png, jpg, jpeg, eml, msg, xlsx. 10MB 상한.

---
## 3. 지역 매핑과 파트너 배정

### 3.1 국가·도시 코드 표 (seed)

국가 행을 먼저 넣고, 도시는 파트너 분할이 실제로 필요하거나 별칭이 많은 곳만 넣습니다. 도시 행이 없으면 국가 코드로 매핑됩니다.

| code | name_ko | name_en | 별칭 예시(alias_display) |
|---|---|---|---|
| `TH` | 태국 | Thailand | 태국, 타이, thailand |
| `TH-BKK` | 방콕 | Bangkok | 방콕, bangkok, krungthep, BKK |
| `TH-UTP` | 파타야 | Pattaya | 파타야, pattaya, 촌부리, U-Tapao |
| `TH-HKT` | 푸껫 | Phuket | 푸켓, 푸껫, phuket, HKT |
| `TH-KBV` | 끄라비 | Krabi | 끄라비, 크라비, krabi |
| `TH-USM` | 코사무이 | Koh Samui | 사무이, 코사무이, samui |
| `TH-CNX` | 치앙마이 | Chiang Mai | 치앙마이, chiangmai |
| `VN` | 베트남 | Vietnam | 베트남, vietnam, viet nam |
| `VN-DAD` | 다낭 | Da Nang | 다낭, danang, 호이안, hoian, DAD |
| `VN-CXR` | 나트랑·깜라인 | Nha Trang / Cam Ranh | 나트랑, 냐짱, nhatrang, 깜라인, 캄란, camranh |
| `VN-PQC` | 푸꾸옥 | Phu Quoc | 푸꾸옥, 푸쿠옥, phuquoc |
| `VN-SGN` | 호찌민 | Ho Chi Minh City | 호치민, 호찌민, 사이공, hcmc, saigon |
| `VN-HAN` | 하노이 | Hanoi | 하노이, hanoi, 하롱베이, halong |
| `ID` | 인도네시아 | Indonesia | 인도네시아, indonesia |
| `ID-DPS` | 발리 | Bali | 발리, bali, 누사두아, 우붓, 스미냑, denpasar |
| `MY` | 말레이시아 | Malaysia | 말레이시아 |
| `MY-BKI` | 코타키나발루 | Kota Kinabalu | 코타키나발루, 코키, kk, kotakinabalu |
| `MY-KUL` | 쿠알라룸푸르 | Kuala Lumpur | 쿠알라룸푸르, kl |
| `PH` | 필리핀 | Philippines | 필리핀 |
| `PH-CEB` | 세부 | Cebu | 세부, cebu, 막탄 |
| `SG` | 싱가포르 | Singapore | 싱가포르, 싱가폴, singapore |
| `JP` | 일본 | Japan | 일본, japan |
| `TW` | 대만 | Taiwan | 대만, 타이완, taiwan |
| `HK` | 홍콩 | Hong Kong | 홍콩 |
| `MO` | 마카오 | Macau | 마카오 |
| `GU` | 괌 | Guam | 괌, guam |
| `MP` | 사이판 | Saipan (N. Mariana Is.) | 사이판, saipan |
| `US` | 미국 | United States | 미국 |
| `US-HI` | 하와이 | Hawaii | 하와이, 호놀룰루, 와이키키, 마우이, hawaii, honolulu |

별칭은 운영자가 콘솔(파트너 조직 관리 > 지역 탭)에서 추가할 수 있습니다(`source='operator'`).

### 3.2 목적지 입력값 → region_code

```
function region_resolve(p_country text, p_city text) returns (code text, confidence text, reason text)
  -- p_country: 폼의 국가 선택값(ISO2 또는 한국어 표기), p_city: 도시 자유 입력(쉼표·슬래시·'및'으로 여러 개 가능)

  country := null
  if p_country ~ '^[A-Za-z]{2}$' and exists region(code=upper(p_country)) then country := upper(p_country)
  elsif p_country is not null then
      a := region_alias[region_normalize(p_country)]
      if a is not null then country := left(a.region_code, 2)

  tokens := split(p_city, '[,/·]|\s및\s|\sand\s|&')  → trim → 빈 값 제거
  hits := []
  for t in tokens:
      a := region_alias[region_normalize(t)]
      if a is null: a := region_alias[region_normalize(regexp_replace(t, '(시|섬|island|city)$', ''))]
      if a is not null: hits += a.region_code

  -- 국가와 도시가 충돌하면 도시 쪽을 신뢰하되 confidence를 낮춤
  countries := distinct(left(h,2) for h in hits) ∪ {country if country not null}

  if countries is empty            → return (null, 'none',   'region_unmapped')
  if count(countries) > 1          → return (null, 'none',   'multi_region')
  c := the one country
  cities := distinct(h for h in hits where length(h) > 2)
  if count(cities) = 1             → return (cities[0], hits covers all tokens ? 'high' : 'medium', 'city')
  if count(cities) > 1             → return (c, 'medium', 'multi_city_same_country')
  -- 도시 없음(토큰이 비었거나 모두 미매핑)
  if tokens not empty and hits empty → return (c, 'low', 'city_unmapped_country_only')
  return (c, 'high', 'country')
```

`confidence='low'`일 때도 국가 코드로 배정은 진행하되, 배정 이벤트 `payload`에 `{"confidence":"low","unmapped":["..."]}`를 남기고 HQ 대시보드 "지역 확인 필요"에 올립니다(배정은 막지 않음 — 국가 파트너가 받아도 문제없음).

### 3.3 커버리지 규칙

```sql
-- 파트너 지역 코드 pr이 RFP 지역 코드 rc를 덮는가
create function public.region_covers(p_partner_code text, p_rfp_code text) returns boolean
  language sql immutable parallel safe as $$
  select p_rfp_code = p_partner_code
      or (length(p_partner_code) = 2 and left(p_rfp_code, 2) = p_partner_code) $$;
```

도시 코드 파트너(`VN-DAD`)는 국가 코드 RFP(`VN`)를 덮지 **않습니다**. 여러 도시에 걸친 베트남 행사는 국가 파트너가 있어야 받습니다.

### 3.4 자동 배정 알고리즘

```
function private.rfp_auto_assign(p_rfp_id uuid)          -- rfp AFTER INSERT 트리거에서 호출
  r := select * from rfp where id = p_rfp_id for update
  (code, conf, why) := region_resolve(r.destination_country, r.destination_city)
  -- 킬 스위치: app_setting.partner_auto_assign_enabled = false면 지역만 기록하고 hold(r, 'auto_assign_off')
  update rfp set region_code = code, region_source = 'auto', region_input = concat_ws(' / ', r.destination_country, r.destination_city)

  if code is null:
     hold(r, why)      -- 'region_unmapped' | 'multi_region'
     return

  candidates :=
     select pr.*, po.*
     from partner_region pr join partner_org po on po.id = pr.partner_id
     where pr.active and region_covers(pr.region_code, code)
     order by length(pr.region_code) desc,    -- 더 구체적인 지역 먼저 (VN-DAD > VN)
              pr.is_primary desc,             -- 주 파트너 먼저
              pr.priority asc, po.code asc    -- 백업 순서, 동률은 코드순(결정적)

  for c in candidates:
     if eligible(c): assign(r, c.partner_id, actor = null, action = 'auto_assign'); return
     else: skipped += {partner: c.code, why: ineligible_reason(c)}

  hold(r, candidates empty ? 'no_partner' : 'partner_ineligible', payload = {skipped})

function eligible(c):
  c.status = 'active'
   and c.accepting_new
   and (c.max_active_rfps is null
        or (select count(*) from rfp where partner_id = c.id and delegation = 'delegated'
            and status not in ('won','lost','cancelled','rejected')) < c.max_active_rfps)
   and exists (select 1 from console_user where partner_id = c.id and role = 'partner_admin' and status = 'active')

function assign(r, partner_id, actor, action):
  update rfp set partner_id = partner_id, delegation = 'delegated', hold_reason = null,
                 delegated_at = now(), delegated_by = actor, row_version = row_version + 1
  insert rfp_assignment_event(action, to_partner = partner_id, to_delegation = 'delegated', region_code, payload)
  outbox: PTR_ASSIGNED → 해당 파트너의 active partner_admin + partner_member 전원
  audit

function hold(r, reason, payload):
  update rfp set partner_id = null, delegation = 'hq_held', hold_reason = reason, row_version + 1
  insert rfp_assignment_event(action = 'auto_hold' 또는 'hold', to_delegation = 'hq_held', reason)
  outbox: HQ_RFP_HELD → 운영자 공용 주소
```

주 파트너가 정지(`suspended`)되거나 `accepting_new=false`면 자동으로 백업으로 넘어갑니다. 이것은 **신규 접수**에만 적용되고, 이미 배정된 RFP를 옮기지는 않습니다(옮기는 것은 HQ 수동 재배정).

**트리거 구성:** `rfp` AFTER INSERT FOR EACH ROW → `private.rfp_auto_assign(new.id)`. 트리거 안에서 실패하면 접수 자체가 실패하므로, 함수 본문 전체를 `begin … exception when others then hold(r,'manual', {'error': sqlerrm}) end`로 감쌉니다. 접수는 어떤 경우에도 성공해야 합니다.

### 3.5 재배정·보류·지역 변경 RPC

모두 `security definer`, `set search_path = public, pg_temp`, 반환형 `public.rfp`(갱신된 행 — 신원 컬럼은 null로 채워 반환).

```sql
public.rfp_set_region(p_rfp_id uuid, p_region_code text, p_reason text, p_expected_version int,
                      p_reassign boolean default true) returns public.rfp
  -- operator만. region_code 변경 → p_reassign이면 3.4 후보 선정으로 재배정(현재 파트너가 새 지역도 덮으면 유지)

public.rfp_assign(p_rfp_id uuid, p_partner_id uuid, p_reason text, p_expected_version int) returns public.rfp
  -- operator만. hq_held → delegated 또는 delegated(A) → delegated(B).
  -- 가드: 대상 파트너가 region_covers(어떤 활성 partner_region, rfp.region_code), status='active'
  --       (accepting_new·max_active_rfps는 경고만 — 반환 payload에 warnings)
  -- A → B 재배정 시: A의 미확인 대리 견적(proxy_entered)은 그대로 두고(호텔 확인은 유효), 이벤트 action='reassign'
  -- 알림: PTR_ASSIGNED(B), PTR_UNASSIGNED(A)

public.rfp_hold(p_rfp_id uuid, p_reason text, p_expected_version int) returns public.rfp
  -- operator만. delegated → hq_held(hold_reason='manual'). 파트너는 즉시 열람 불가(배정 해제이므로).
  -- 인계(taken_over)와의 차이: hold는 파트너를 떼어내고 열람도 끊음, takeover는 읽기 전용으로 남김.

public.rfp_decline_assignment(p_rfp_id uuid, p_reason text, p_expected_version int) returns void
  -- partner_admin만, 자기 조직 배정 + delegated + status in ('received','verifying')일 때만.
  -- → hq_held(hold_reason='partner_declined'), 이벤트 action='decline', HQ_PARTNER_DECLINED
  -- 초대를 이미 보낸(bidding 이후) RFP는 반려 불가 — HQ에 인계 요청(콘솔의 "본사 인계 요청" 버튼 → HQ_TAKEOVER_REQUESTED 알림만)
```

공통 가드 순서(모든 RFP 쓰기 RPC):

```
1. me := private.require_console(allowed_roles)          -- console_user.status='active' 아니면 'forbidden'
2. r  := select … from rfp where id = p_rfp_id for update   -- 없으면 'not_found'(파트너에게는 권한 없음도 not_found)
3. if r.row_version <> p_expected_version → 'stale_version'
4. 역할별 쓰기 가드(4.4의 private.assert_rfp_write)
5. 상태 가드(상태전이표 v1.8)
6. 변경 → row_version+1 → 이벤트 → outbox → audit
```

**잠금 규칙(12장 e):** 초대·견적·정산처럼 자식 테이블을 쓰는 RPC도 **먼저 부모 `rfp` 행을 `FOR UPDATE`로 잠그고** 위 3~4번을 거칩니다. 잠금 순서는 항상 `rfp → bid_invitation → bid_quote → settlement`입니다(데드락 방지).

---

## 4. RLS 설계

### 4.1 헬퍼 함수

모두 `language sql stable security definer set search_path = public, pg_temp`. `security definer`인 이유는 `console_user`·`partner_region` 자체에 RLS가 걸려 있어 정책 안에서 재귀가 생기기 때문입니다.

```sql
-- 내 콘솔 계정(활성일 때만)
create function public.console_me() returns public.console_user
  as $$ select * from public.console_user where user_id = auth.uid() and status = 'active' $$;

create function public.is_operator() returns boolean          -- 기존 함수 교체
  as $$ select exists (select 1 from public.console_user
                       where user_id = auth.uid() and status = 'active' and role = 'operator') $$;

create function public.is_partner() returns boolean
  as $$ select exists (select 1 from public.console_user cu join public.partner_org po on po.id = cu.partner_id
                       where cu.user_id = auth.uid() and cu.status = 'active'
                         and cu.role in ('partner_admin','partner_member')
                         and po.status in ('active','suspended')) $$;
  -- suspended 조직도 로그인·열람은 가능(진행 건 읽기·정산 입력), 쓰기는 assert에서 막음

create function public.is_partner_admin() returns boolean
  as $$ select public.is_partner() and (select role from public.console_me()) = 'partner_admin' $$;

create function public.my_partner_id() returns uuid
  as $$ select cu.partner_id from public.console_user cu
        join public.partner_org po on po.id = cu.partner_id
        where cu.user_id = auth.uid() and cu.status = 'active'
          and po.status in ('active','suspended') $$;
  -- onboarding·terminated 조직은 null → 모든 파트너 정책이 0행(12장 추가 검증 X1)

create function public.my_regions() returns text[]
  as $$ select coalesce(array_agg(pr.region_code), '{}') from public.partner_region pr
        where pr.partner_id = public.my_partner_id() and pr.active $$;

create function public.region_is_mine(p_code text) returns boolean
  as $$ select p_code is not null and exists (select 1 from unnest(public.my_regions()) r
                                              where public.region_covers(r, p_code)) $$;

create function public.can_read_rfp(p_rfp_id uuid) returns boolean
  as $$ select public.is_operator()
            or exists (select 1 from public.rfp r
                       where r.id = p_rfp_id and r.partner_id is not null
                         and r.partner_id = public.my_partner_id()
                         and r.delegation in ('delegated','taken_over')) $$;
```

쓰기 판정(RPC 전용, 정책에서는 쓰지 않음):

```
function private.assert_rfp_write(r rfp, me console_user) returns boolean  -- true면 hq_override
  if me.role = 'operator':
     return r.delegation = 'delegated'           -- 파트너 건에 HQ가 직접 손대면 override 표시(N16)
  -- 파트너
  if r.partner_id is distinct from me.partner_id  → raise 'not_found'
  if r.delegation = 'taken_over'                  → raise 'rfp_taken_over'   (읽기 전용)
  if r.delegation <> 'delegated'                  → raise 'not_found'
  if not region_is_mine(r.region_code)            → raise 'region_revoked'   (지역이 빠진 뒤 남은 건)
  if (select status from partner_org where id = me.partner_id) <> 'active' → raise 'partner_suspended'
  return false
```

**"파트너는 자기 지역 + delegated 상태 RFP만 쓰기, taken-over는 읽기만"** 규칙은 위 함수 한 곳에만 있습니다. RLS SELECT는 `can_read_rfp`(배정 기준), 쓰기는 `assert_rfp_write`(배정 + 위임 + 지역 + 조직 상태)로 두 층입니다.

### 4.2 GRANT 기본값

```sql
-- 신규 테이블 전부: authenticated는 SELECT만, anon은 아무것도 없음
revoke all on public.partner_org, public.partner_region, public.console_user, public.region, public.region_alias,
  public.rfp_assignment_event, public.settlement, public.settlement_event, public.settlement_attachment,
  public.settlement_period, public.identity_view_log, public.intervention_alert from anon, authenticated;
grant select on (위 테이블 전부) to authenticated;

-- 기존 테이블: 파트너 쓰기 경로 제거
revoke insert, update, delete on public.rfp, public.bid_invitation, public.bid_quote, public.hotel_partner from authenticated;
-- 기존 콘솔이 운영자 권한으로 이 테이블에 직접 UPDATE하고 있었다면(예: 메모·내부 태그),
-- 해당 컬럼만 grant update(col) + 정책 'operator_update'로 되살린다(13.4 점검 목록).

-- 신규 함수: 기본 EXECUTE 회수 후 필요한 것만
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_operator(), public.is_partner(), public.is_partner_admin(), public.my_partner_id(),
  public.my_regions(), public.region_is_mine(text), public.can_read_rfp(uuid), public.console_me(),
  public.region_covers(text,text), public.ccy_round(numeric,char), public.ccy_minor(char) to authenticated;
grant execute on function (6~7장·3.5의 RPC 전부) to authenticated;   -- 각 RPC가 스스로 역할을 검사
```

주의: `revoke execute on all functions … from public`은 기존 함수에도 걸립니다. 기존 anon용 RPC(있다면)를 마이그레이션에서 다시 grant해야 합니다. 13.4에 점검 항목으로 넣었습니다.
### 4.3 테이블별 정책

표기: ✅ 허용 · 🔎 조건부 · ⛔ 없음(권한 자체 없음). 쓰기(I/U/D)는 N15에 따라 **파트너는 전부 ⛔**, RPC가 대신합니다. 운영자의 직접 쓰기는 기존 콘솔 호환을 위해 필요한 테이블만 ✅로 남깁니다.

| 테이블 | operator SELECT | partner_admin SELECT | partner_member SELECT | operator I/U/D | 파트너 I/U/D |
|---|---|---|---|---|---|
| `rfp` (신원 4열 제외) | ✅ | 🔎 `can_read_rfp(id)` | 🔎 같음 | 기존 정책 유지(U만) | ⛔ |
| `bid_invitation` | ✅ | 🔎 `can_read_rfp(rfp_id)` | 🔎 같음 | 기존 유지 | ⛔ |
| `bid_quote` | ✅ | 🔎 `can_read_rfp(rfp_id)` | 🔎 같음 | ⛔ (불변, RPC만) | ⛔ |
| `comparison_item` | ✅ | 🔎 `can_read_rfp(rfp_id)` | 🔎 같음 | 기존 유지 | ⛔ |
| `rfp_assignment_event` | ✅ | 🔎 `can_read_rfp(rfp_id)` | 🔎 같음 | ⛔ | ⛔ |
| 기존 RFP 이벤트/타임라인 테이블 | ✅ | 🔎 `can_read_rfp(rfp_id)` | 🔎 같음 | 기존 유지 | ⛔ |
| `rfp_access_token`, `rfp_share_link` | ✅ | ⛔ | ⛔ | 기존 유지 | ⛔ |
| `hotel_partner` | ✅ | 🔎 `region_is_mine(region_code) or sourced_by_partner = my_partner_id()` | 🔎 같음 | 기존 유지 | ⛔ |
| `member` 및 회원 관련 전부(`member_*`, OTP) | ✅ | ⛔ | ⛔ | 기존 유지 | ⛔ |
| `app_setting` | ✅ | ⛔ (필요한 값은 `console_settings()` RPC) | ⛔ | ✅ | ⛔ |
| `holiday` | ✅ | ✅ | ✅ | ✅ | ⛔ |
| `feedback*` | ✅ | ⛔ | ⛔ | 기존 유지 | ⛔ |
| `notification_outbox` | ✅ | ⛔ (`rfp_notifications()` RPC만) | ⛔ (같음) | 기존 유지 | ⛔ |
| `partner_org` | ✅ | 🔎 `id = my_partner_id()` | 🔎 같음 | ⛔ (RPC) | ⛔ |
| `partner_region` | ✅ | 🔎 `partner_id = my_partner_id()` | 🔎 같음 | ⛔ | ⛔ |
| `console_user` | ✅ | 🔎 `partner_id = my_partner_id()` | 🔎 `user_id = auth.uid()` | ⛔ | ⛔ |
| `region`, `region_alias` | ✅ | ✅ | ✅ | ⛔ (RPC) | ⛔ |
| `settlement` | ✅ | 🔎 `partner_id = my_partner_id()` | 🔎 같음 | ⛔ | ⛔ |
| `settlement_event`, `settlement_attachment` | ✅ | 🔎 소속 정산이 내 조직 | 🔎 같음 | ⛔ | ⛔ |
| `settlement_period` | ✅ | ✅ | ✅ | ⛔ | ⛔ |
| `identity_view_log` | ✅ | 🔎 `partner_id = my_partner_id()` | ⛔ | ⛔ | ⛔ |
| `intervention_alert` | ✅ | 🔎 `partner_id = my_partner_id() and kind in ('partner_idle','sla_breach','proxy_disputed','settlement_overdue')` | 🔎 같음 | ⛔ | ⛔ |
| `audit_log` | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |

정책 예시:

```sql
alter table public.rfp enable row level security;
drop policy if exists "operator_all" on public.rfp;          -- 기존 정책 이름으로 치환
create policy rfp_select on public.rfp for select to authenticated
  using (public.is_operator() or public.can_read_rfp(id));
create policy rfp_operator_update on public.rfp for update to authenticated
  using (public.is_operator()) with check (public.is_operator());
-- 파트너는 UPDATE 권한 자체가 없으므로(4.2) 정책이 있어도 쓰기 불가
```

`can_read_rfp(id)`를 정책에서 쓰면 행마다 rfp를 다시 조회하게 됩니다. 성능을 위해 rfp 정책만은 인라인으로 씁니다.

```sql
using (public.is_operator()
       or (partner_id = public.my_partner_id() and delegation in ('delegated','taken_over')))
```

`my_partner_id()`는 `stable`이라 문장당 한 번만 평가됩니다. 자식 테이블(`bid_invitation` 등)은 `rfp_id in (select id from rfp)`처럼 쓰면 rfp 정책이 연쇄 적용되므로 그 형태를 권장합니다.

```sql
create policy inv_select on public.bid_invitation for select to authenticated
  using (public.is_operator() or rfp_id in (select id from public.rfp));   -- rfp RLS가 걸러 줌
```

**뷰는 전부 `security_invoker = true`** 로 만듭니다(PG15+). 기본값(definer)으로 만들면 뷰 소유자 권한으로 실행돼 RLS를 건너뜁니다. 기존 뷰도 13.4에서 전수 점검합니다.

### 4.4 신원(오거나이저) 열람

```sql
public.rfp_get_identity(p_rfp_id uuid, p_context text default 'rfp_detail')
  returns table (company text, contact_name text, email text, phone text, member_id uuid, disclosed_at timestamptz)
  language plpgsql security definer volatile
```

```
me := require_console(any role)
if not can_read_rfp(p_rfp_id) → 'not_found'
r := rfp row
-- 결정 10: 파트너에게는 배정 시점부터 노출. delegated·taken_over 모두 가능(인계 뒤에도 읽기 전용으로 열람 가능)
insert identity_view_log(rfp_id, viewer = me.user_id, viewer_role = me.role, partner_id = me.partner_id,
                         fields = {'company','name','email','phone'}, context = p_context)
return r.contact_company, r.contact_name, r.contact_email, r.contact_phone, r.member_id
```

- 전화번호는 `p_context='reveal_phone'`일 때만 원문, 그 외에는 `010-****-5678` 형태로 마스킹해서 돌려줍니다. 전화번호 원문 열람을 별도 로그로 남기기 위해서입니다.
- 같은 사람이 같은 RFP를 10분 안에 다시 열면 로그를 새로 쓰지 않고 마지막 행을 둡니다(로그 폭주 방지). 대신 `reveal_phone`·`export`는 매번 남깁니다.
- 한 파트너 계정이 24시간 안에 30건 넘게 열람하면 `HQ_IDENTITY_ANOMALY` 알림(크론).

### 4.5 파트너용 알림 발송 내역 (N30)

`notification_outbox`에는 파트너 SELECT 정책을 **두지 않습니다.** `security_invoker` 뷰로 가리려면 뷰 실행자(파트너)가 원본 테이블을 읽을 수 있어야 하고, 그러면 파트너가 원본을 직접 조회해 수신 주소를 볼 수 있기 때문입니다. 대신 RPC 하나만 엽니다.

```sql
public.rfp_notifications(p_rfp_id uuid)
  returns table (id uuid, template_id text, channel text, status text, audience text,
                 recipient_label text, created_at timestamptz, sent_at timestamptz)
  language plpgsql security definer stable
```

```
if not can_read_rfp(p_rfp_id) → 'not_found'
return select …,
  case when is_operator() then recipient
       when audience = 'organizer' then '오거나이저(주소 비공개)'
       else recipient end
from notification_outbox where rfp_id = p_rfp_id order by created_at desc
```

운영자 콘솔도 RFP 상세의 발송 내역은 이 RPC로 통일합니다(운영자에게는 원문 반환).

### 4.6 JWT 갱신 지연(최대 1시간) 대응

| 상황 | 대응 |
|---|---|
| 계정 정지 | `console_user.status='disabled'` → 다음 쿼리부터 모든 헬퍼가 false. 추가로 Edge Function이 `auth.admin.signOut(user_id, 'global')`로 리프레시 토큰 폐기 |
| 역할 변경(member→admin), 조직 이동 | DB 값이 즉시 적용. `claims_version+1`과 app_metadata 갱신. 콘솔은 `console_whoami()`의 `cv`와 JWT의 `cv`가 다르면 `supabase.auth.refreshSession()` 후 NAV를 다시 그림 |
| 파트너 조직 정지 | `is_partner()`는 유지(열람), `assert_rfp_write`가 `partner_suspended`로 쓰기 차단 |
| 지역 제거 | `my_regions()`가 즉시 반영. 진행 중 RFP는 `region_revoked`로 쓰기 차단 → HQ가 재배정/인계. 제거 RPC는 진행 중 건이 있으면 경고를 돌려주고 `p_force`가 있어야 진행 |
| 콘솔 화면 캐시 | admin.js가 모든 API 오류 코드 `forbidden`, `not_found`, `rfp_taken_over`, `region_revoked`, `partner_suspended`를 받으면 `console_whoami()`를 다시 불러 NAV·권한 상태를 갱신 |

`console_whoami()` 반환: `{ user_id, role, partner_id, partner_code, partner_display_name, partner_status, regions[], cv, display_name, email }`. 콘솔 로드 시 가장 먼저 호출하고, 결과가 없으면(비활성·미등록) 로그인 화면으로 보냅니다.

### 4.7 기타 차단 규칙

- `member`, 회원 OTP, `rfp_access_token`, `rfp_share_link`, `feedback*`, `app_setting`, `audit_log`: 파트너 정책 없음 = 0행.
- PostgREST 임베드(`select=*,member(*)`)도 임베드 대상 테이블의 RLS가 적용되므로 null로 옵니다.
- `console_settings()` RPC가 파트너에게 필요한 설정만 돌려줍니다: SLA 시간, 영업시간, 공휴일 기준, `collect_due_days`, `remit_due_days`, `supported_currencies`, `proxy_confirm_hours`.

---

## 5. 상태전이 변경 (상태전이표 v1.7 → v1.8)

### 5.1 초대 상태 머신

기존(가정): `invited → opened → submitted | declined | expired`, `revoked`는 어디서나.

추가 상태:

| 상태 | 뜻 | 비교표 포함 |
|---|---|---|
| `proxy_entered` | 파트너·운영자가 대리 입력, 호텔 확인 대기 | ❌ |
| `hotel_confirmed` | 호텔이 확인 링크로 확인 | ✅ |
| `proxy_disputed` | 호텔이 "내용이 다르다"고 응답 | ❌ |
| `proxy_expired` | 확인 기한(72시간) 경과 | ❌ |

전이표:

| # | from | to | 주체 | 트리거 | 가드 | 부수 효과 |
|---|---|---|---|---|---|---|
| P1 | `invited`, `opened`, `expired`, `declined`, `proxy_expired`, `proxy_disputed` | `proxy_entered` | partner, operator | `quote_proxy_enter` | RFP `bidding`·`rebid`·`collecting`; 쓰기 권한(4.1); 호텔 `approved` + `contact_email_verified_at` 존재(N13); 해당 초대에 호텔 직접 제출 견적 없음(`submitted`면 불가) | 새 `bid_quote`(entered_by=partner/operator), 확인 토큰 발급, `HTL_CONFIRM` 발송 |
| P2 | `proxy_entered` | `hotel_confirmed` | hotel | `quote_confirm`(confirm) | 토큰 유효·미사용·미만료, `proxy_quote_id` 일치 | `bid_quote.confirmed_at`, 토큰 소모, `PTR_PROXY_CONFIRMED` |
| P3 | `proxy_entered` | `submitted` | hotel | `submit_bid`(확인 토큰 또는 기존 비딩 토큰으로 금액 수정 제출) | 기존 제출 가드 | 새 `bid_quote`(entered_by=hotel), 대리 견적 `superseded_by` 설정, 확인 토큰 폐기, `PTR_PROXY_REVISED` |
| P4 | `proxy_entered` | `proxy_disputed` | hotel | `quote_confirm`(dispute) | 토큰 유효 | 사유 저장, 토큰 소모, `PTR_PROXY_DISPUTED` + `HQ_PROXY_DISPUTED`, intervention `proxy_disputed` |
| P5 | `proxy_entered` | `proxy_expired` | system | 크론(15분) | `confirm_token_expires_at < now()` | 토큰 무효, `PTR_PROXY_EXPIRED` |
| P6 | `proxy_entered` | `proxy_entered` (재발송) | partner, operator | `quote_proxy_enter`(action=`resend`) | 재발송 3회 이하 | 새 토큰(이전 토큰 무효), 기한 72시간 재설정 |
| P7 | `hotel_confirmed` | `submitted` | hotel | `submit_bid` | RFP가 아직 `bidding/rebid/collecting` | 호텔이 나중에 직접 고쳐 제출하면 호텔 원본이 우선 |
| P8 | `proxy_*`, `hotel_confirmed` | `revoked` | operator, partner | 기존 초대 취소 | 기존 가드 | 확인 토큰 폐기 |
| P9 | `hotel_confirmed` | `proxy_entered` | partner, operator | `quote_proxy_enter` | **불가** — 확인된 견적을 바꾸려면 호텔이 직접 제출(P7)해야 함 | — |

`rebid`(재요청) 라운드: 기존처럼 초대가 새 라운드로 열리면 대리 입력도 새 라운드 견적으로 P1부터 다시 탑니다.

### 5.2 비교표 포함 조건

```
comparable(q) :=
    q.superseded_by is null
and (q.entered_by = 'hotel'                         -- 호텔 직접 제출
     or q.confirmed_at is not null)                 -- 대리 입력 + 호텔 확인
and invitation.status in ('submitted','hotel_confirmed')
```

- 비교표 생성·전달 RPC(`collecting → delivered`)는 `v_comparable_quote`에서만 견적을 가져옵니다.
- `comparison_item` INSERT 트리거가 같은 조건을 다시 검사합니다(N29).
- 전달할 견적에 `approved_via='partner' and hq_reviewed_at is null`인 호텔이 있어도 **전달을 막지 않습니다**(N28 확정). 대신 전달 RPC가 해당 호텔 목록을 `HQ_HOTEL_UNREVIEWED_DELIVERED`(일일 요약 아님, 건별)로 HQ에 알리고, 콘솔은 파트너에게 "본사 검토 전 호텔 N곳이 포함됩니다"를 안내만 합니다.
- 전달 시점에 `proxy_entered` 초대가 남아 있으면 콘솔이 "호텔 확인 대기 N건은 비교표에서 빠집니다"라고 경고하고 확인을 받습니다(막지는 않음 — 오거나이저 SLA가 우선).
- **SOP v2.1의 "취합중 견적 0건 → 미성사 종료 허용"**에서 0건 계산도 `v_comparable_quote` 기준입니다. 확인 대기 대리 견적은 0건으로 셉니다.

### 5.3 호텔 확인 링크 — 토큰 재사용 vs 별도 토큰

| 기준 | 기존 비딩 토큰 재사용 | 별도 확인 토큰(채택) |
|---|---|---|
| 파트너가 원문을 알 가능성 | 있음 — 호텔이 비딩 메일을 파트너에게 전달했거나, 파트너가 호텔 대신 링크를 열어 본 경우 | 없음 — 대리 입력 시점에 새로 만들어 호텔 등록 연락처로만 발송 |
| 유효기간 | 초대 마감 + 결과 표시까지 길다 | 72시간, 1회용 |
| 분리 가능성 | 확인만 무효화할 수 없음 | 확인 토큰만 폐기·재발송 가능 |
| 구현 비용 | 낮음 | 컬럼 4개, get_bid 조회 1곳 추가 |

**결정: 별도 토큰(N9).** 단, URL은 `bid.html?t=`로 같게 두어 호텔 입장에서는 같은 페이지입니다.

확인 토큰 규칙:

- 원문: `gen_random_bytes(32)` → base64url(43자). 원문은 Edge Function 메모리와 메일 본문에만 존재합니다.
- 저장: `confirm_token_sha256`(소문자 hex). 기존 토큰과 같은 방식이라 피드백 연결 조회(`feedback_resolve_rfp`)도 이 컬럼을 추가로 보면 됩니다(13.4).
- 수신처: `hotel_partner.contact_email`(발송 시점 값을 `confirm_sent_to`에 스냅샷). 파트너가 요청 화면에서 다른 주소를 입력할 수 없습니다.
- 사용: `quote_confirm`의 confirm/dispute 또는 `submit_bid` 성공 시 `confirm_token_used_at` 설정. 이후 같은 토큰으로 들어오면 결과 화면(`confirmed`/`disputed`/`revised`)만 보여줍니다.
- 만료: 발급 + `proxy_confirm_hours`(기본 72). 24시간 전에 1회 자동 리마인드(`HTL_CONFIRM_REMIND`).

### 5.4 bid.html 확인 상태 추가

`get_bid` 응답의 `mode`로 분기합니다. 호텔 페이지는 영어입니다.

| 상태 키 | 조건 | 화면 |
|---|---|---|
| `confirm` | 확인 토큰, `proxy_entered`, 유효 | 상단 배너 "{public_name} entered this quote on your behalf based on your reply on {date}. Please check it and confirm." · 견적 요약(객실·회의실·F&B·총액·통화·유효기간·조건) · 증빙 메모 · 버튼 3개: **Confirm this quote** / **Edit and submit** (기존 비딩 폼을 대리 견적 값으로 채워 열기) / **This is not correct** (사유 입력 필수 10~1000자) · 마감 "Please respond by {deadline, 호텔 현지 시각 + KST}" |
| `confirmed` | `hotel_confirmed` | "Thank you. Your quote is confirmed and will be included in the comparison." + 확인 시각 |
| `disputed` | `proxy_disputed` | "We've let the regional team know. They'll contact you shortly." + 보낸 사유 |
| `revised` | 대리 견적이 호텔 제출로 대체됨 | "You submitted an updated quote. It replaces the one entered on your behalf." |
| `confirm_expired` | 기한 경과 | "This confirmation link has expired. Please reply to the regional team or use your original quote link." |
| `confirm_revoked` | 재발송·초대 취소로 무효 | "This link is no longer valid. A newer link may have been sent to {masked email}." |

기존 비딩 토큰으로 들어왔는데 초대가 `proxy_entered`면: 기존 `bidding` 화면 위에 "A quote was entered on your behalf and is waiting for your confirmation. We sent a confirmation link to {m***@hotel.com}. You can also submit your own quote below — it will replace the one entered on your behalf." 배너를 띄우고 폼은 그대로 제출 가능(P3). **비딩 토큰으로는 "확인" 버튼을 보여주지 않습니다**(확인은 확인 토큰으로만).

JS 미실행 환경: 기존 원칙대로 `<noscript>` 안내 + 확인은 form POST로도 동작하도록 `quote_confirm`이 `application/x-www-form-urlencoded`도 받고 결과 페이지로 303 리다이렉트합니다(기존 bid 페이지가 JS 필수라면 이 항목은 동일 수준으로 맞춤).

### 5.5 호텔이 수정을 요청하면

두 갈래로 나눕니다.

1. **호텔이 숫자를 안다** → "Edit and submit"(P3). 폼이 대리 견적 값으로 채워져 열리고, 호텔이 고쳐 제출하면 호텔 원본이 됩니다. 파트너는 결과만 알림으로 받습니다. 이 경로가 기본입니다.
2. **호텔이 숫자 없이 "틀렸다"고만 한다** → `proxy_disputed`(P4). 파트너가 호텔과 다시 연락해 새로 대리 입력(P1, 새 버전·새 토큰)하거나, 호텔에게 직접 제출을 요청합니다. 대리 입력은 같은 초대에서 **최대 3회**까지(3회를 넘기면 HQ만 가능) — 파트너가 확인을 받을 때까지 금액을 바꿔 가며 반복 발송하는 것을 막습니다.

### 5.6 상태전이표 v1.8에 반영할 RFP 쪽 변경

RFP 상태 자체(received → … → won|lost|cancelled)는 바뀌지 않습니다. 달라지는 것은 **전이 주체 열**입니다.

| 전이 | v1.7 주체 | v1.8 주체 |
|---|---|---|
| received → verifying → bidding / rejected | operator | 배정 파트너(delegated) 또는 operator(hq_held·taken_over·override) |
| bidding → collecting, rebid, collecting → delivered | operator | 같음 |
| delivered → won | 오거나이저(OTP 선정) | 같음 + **won 트리거에서 정산 생성**(6.1) |
| → cancelled | operator | 파트너도 가능(오거나이저 요청 근거 메모 필수) |
| 모든 전이 | — | `delegation='taken_over'`면 파트너 불가(`rfp_taken_over`) |
| 호텔 초대(기존 초대 RPC) | operator | 파트너도 가능. 가드 추가: 호텔 `status='approved'`, `region_is_mine(hotel.region_code)`, `region_covers(rfp.region_code, hotel.region_code)` — 즉 RFP 지역 안의 호텔만. 지역 밖 호텔이 필요하면 HQ가 초대(12장 h) |
| collecting → delivered | operator | 가드 없음(N28 확정). HQ 미검토 파트너 승인 호텔 포함 시 `HQ_HOTEL_UNREVIEWED_DELIVERED` 알림만 |

기존 전이 RPC(예: `rfp_transition(p_rfp_id, p_to, p_note)` — 실제 이름으로 치환)의 권한 검사 `if not is_operator()`를 `private.assert_rfp_write(r, me)`로 바꾸고, 반환된 `hq_override`를 audit에 기록합니다.

---
## 6. 정산 상태 머신

### 6.1 생성

RFP가 `won`이 되는 트랜잭션 안에서 생성합니다(선정 RPC 또는 `rfp` AFTER UPDATE 트리거 `when (old.status <> 'won' and new.status = 'won')`). 트리거 방식을 권장합니다 — 선정 경로가 OTP RPC 하나라도, 운영자 수동 전이가 추가될 수 있기 때문입니다.

```
function private.settlement_create_for_rfp(p_rfp_id)
  r := rfp; q := 선정된 bid_quote(선정 RPC가 rfp.selected_quote_id 등에 기록 — 실제 컬럼명 치환); h := hotel_partner
  if exists settlement where rfp_id = r.id → return (멱등)
  pct := case when r.partner_id is null then 0
              else coalesce(r.partner_share_override_pct, partner_org.revenue_share_pct) end
  insert settlement(
     ref = 'ST-' || to_char(now() at time zone 'Asia/Seoul','YYMM') || '-' || rand4(),
     rfp_id, partner_id = r.partner_id, hotel_id = h.id, quote_id = q.id,
     status = 'pending_commission', won_at = now(), event_end = r.event_end,
     collect_due_date = r.event_end + setting('collect_due_days', 30),
     hotel_currency = q.currency, contract_amount = null, partner_share_pct = pct,
     flags = case when h.approved_via = 'partner' and h.hq_reviewed_at is null then {'hotel_unreviewed'} else {} end)
  insert settlement_event('created', to_status = 'pending_commission')
  outbox: PTR_SETTLEMENT_CREATED(파트너 관리자). 본사에는 HQ_DAILY_DIGEST의 "신규 성사" 항목으로만 알림
  if 'hotel_unreviewed' in flags → intervention_alert('hotel_unreviewed_won')
```

`partner_id`는 **won 시점의 rfp.partner_id**입니다. `taken_over` 상태로 won이 되어도 원래 파트너가 정산 주체로 남고(파트너 몫은 override로 조정), `hq_held`로 끝난 건은 `partner_id=null`, 몫 0%, HQ가 모든 단계를 직접 처리합니다.

### 6.2 상태와 콘솔 표기(결정 6의 5단계)

| 콘솔 단계 | DB 상태 | 다음 행동 주체 | 설명 |
|---|---|---|---|
| ① 성사 | `pending_commission` | 파트너 관리자 | 호텔 최종 계약 금액·커미션 입력 대기 |
| ② 커미션 확정 | `commission_submitted` | HQ | 입력값 승인 대기(단계 표시줄에서 ②의 반쯤 채운 상태) |
| ② 커미션 확정 | `commission_confirmed` | 파트너 관리자 | 확정. 호텔에서 수금 진행 |
| ③ 수금 완료 | `collected` | 파트너 관리자 | MICEGO 몫 송금 진행 |
| ④ 송금 완료 | `remitted` | HQ | 입금 확인 대기 |
| ⑤ 입금 확인/완료 | `completed` | — | 종료 |
| 분쟁 | `disputed` | HQ | 단계 표시줄 위에 빨간 배지, 이전 단계 유지 표시 |
| 무효 | `voided` | — | 회색 |

### 6.3 전이표

| # | action | from | to | 주체 | 입력(payload) | 가드 |
|---|---|---|---|---|---|---|
| S1 | `submit_commission` | `pending_commission` | `commission_submitted` | partner_admin (HQ 단독 건은 operator) | `contract_amount`, `hotel_currency`(견적 통화와 다르면 사유 필수), `commission_basis`, `commission_rate_pct` 또는 `commission_amount`, 첨부 `hotel_contract`·`hotel_invoice` 중 1개 이상 | basis=rate면 `commission_amount = ccy_round(contract × rate/100)`를 서버가 계산(클라이언트 값 무시). basis=fixed면 rate는 null, `commission_amount ≤ contract_amount × 0.5`. `contract_amount`가 선정 견적 총액의 70% 미만이면 플래그 `contract_below_quote`(사유 필수) |
| S2 | `approve_commission` | `commission_submitted` | `commission_confirmed` | operator | `note`(선택) | 제출자 ≠ 승인자(HQ 단독 건 제외). `hotel_unreviewed` 플래그가 있으면 **거부** — 호텔 HQ 검토(`hq_reviewed_at` 기록) 먼저. 전달 단계에 게이트가 없으므로 이 단계가 가짜 호텔에 대한 마지막 시스템 통제점입니다(N28). 요율이 `app_setting.commission_rate_range`(기본 5~20%) 밖이면 사유 입력 필수 |
| S3 | `reject_commission` | `commission_submitted` | `pending_commission` | operator | `reason` 필수 | — |
| S4 | `record_collection` | `commission_confirmed` | `collected` | partner_admin (HQ 단독 건은 operator) | `collected_at`(날짜), `collected_amount`(호텔 통화), 첨부 `collection_proof` | `collected_amount`가 `commission_amount`와 다르면 사유 필수 + 플래그 `collection_variance`. `remit_due_date = collected_at::date + remit_due_days` 설정 |
| S5 | `record_remittance` | `collected` | `remitted` | partner_admin | `remit_currency`, `fx_rate`, `fx_rate_date`, `fx_rate_source`, `remitted_at`, `remit_amount_actual`, `remit_reference`, 첨부 `remit_proof` | HQ 단독 건은 이 단계 없음. 같은 통화면 fx=1. fx 이상치 검사(6.5) → 플래그. `abs(actual − expected) / expected > 0.5%`면 사유 필수 + 플래그 `remit_variance` |
| S6 | `confirm_receipt` | `remitted` | `completed` | operator | `received_at`, `received_amount` | 입금액과 `remit_amount_actual` 차이가 은행 수수료 허용치(`app_setting.remit_fee_tolerance`, 기본 송금 통화 기준 50 USD 상당) 넘으면 `completed` 대신 `open_dispute`를 유도(콘솔 경고) |
| S6b | `confirm_receipt` | `collected` | `completed` | operator | 같음 | **HQ 단독 건(`partner_id is null`)만** — MICEGO가 호텔에서 직접 수금 |
| S7 | `open_dispute` | `pending_commission`~`remitted` | `disputed` | operator, partner_admin | `reason` 필수 | `status_before_dispute` 저장, intervention `settlement_overdue`와 별도로 HQ 알림 |
| S8 | `resolve_dispute` | `disputed` | 지정 상태(`status_before_dispute` 이하 아무 단계) 또는 `voided` | operator | `resolution` 필수, `target_status`, 수정 필드(아래) | 수정 가능한 필드는 target 단계보다 뒤 단계의 필드만 초기화 가능. 예: target=`pending_commission`이면 커미션·수금·송금 값 전부 null로 되돌리고 이력은 이벤트에 남김 |
| S9 | `void` | `pending_commission`, `commission_submitted`, `commission_confirmed` | `voided` | operator | `reason` 필수 | 수금 이후는 void 불가 → 분쟁으로 처리 |
| S10 | `set_share_override` | `pending_commission`, `commission_submitted` | (변화 없음) | operator | `partner_share_pct`, `reason` | 인계 조정(7.4). 확정 이후 변경은 분쟁 경유 |

모든 전이는 `settlement_period`로 닫힌 달의 `completed` 정산에는 적용할 수 없습니다(N31). 닫힌 달 정산에 오류가 있으면 새 달에 `period_adjust` 이벤트와 조정 금액을 기록합니다(조정 전용 행은 v1에서 만들지 않고 이벤트 + 월 마감 뷰의 `adjustments` 열로 처리).

### 6.4 RPC 시그니처

```sql
public.settlement_advance(
  p_settlement_id    uuid,
  p_action           text,     -- 6.3의 action
  p_payload          jsonb,    -- 입력값. 알 수 없는 키가 있으면 'unknown_field' 오류
  p_expected_version int
) returns public.settlement
  language plpgsql security definer volatile set search_path = public, pg_temp
```

```
me := require_console(any)
s  := select * from settlement where id = p_settlement_id for update       -- 없거나 권한 없으면 'not_found'
if me.role <> 'operator' and s.partner_id is distinct from me.partner_id → 'not_found'
if s.row_version <> p_expected_version → 'stale_version'
rule := TRANSITIONS[p_action]                                             -- 6.3 표를 코드 상수로
if s.status not in rule.from → 'invalid_transition'
if me.role not in rule.roles(s) → 'forbidden'                              -- HQ 단독 건 분기 포함
if period_closed(s) and s.status = 'completed' → 'period_closed'
if me.role = 'partner_admin' and partner_org.status not in ('active','suspended') → 'partner_inactive'
   -- 정지된 파트너도 진행 중 정산 입력은 가능(돈은 받아야 하므로)
validate(p_payload, rule.fields)                                          -- 타입·범위·통화 목록
apply: 허용 필드만 UPDATE (서버 계산 필드는 payload에서 무시)
   S1: if basis='rate' then commission_amount := ccy_round(contract_amount * rate / 100, hotel_currency)
flags 재계산(6.5)
status := rule.to (S8은 payload.target_status)
row_version += 1, updated_at = now()
insert settlement_event(action, from, to, diff = 변경 전후 jsonb, note, actor, actor_role)
outbox(6.7), audit
return s
```

첨부는 `settlement_action` Edge Function이 먼저 서명 업로드 URL을 발급하고, 업로드가 끝난 `storage_path`를 `p_payload.attachments[]`로 넘기면 RPC가 `settlement_attachment`에 INSERT합니다. RPC는 경로 첫 세그먼트가 `p_settlement_id`인지, `storage.objects`에 실제로 있는지 확인합니다.

### 6.5 금액 계산 정리

| 항목 | 식 | 통화 | 입력/계산 |
|---|---|---|---|
| `contract_amount` | 호텔–오거나이저 최종 계약 금액 | 호텔 | 파트너 입력 |
| `commission_amount` | basis=rate: `ccy_round(contract × rate/100)` · basis=fixed: 입력값 | 호텔 | 서버 계산 또는 입력 |
| `partner_share_amount` | `ccy_round(commission × pct/100)` | 호텔 | 생성 컬럼 |
| `micego_share_amount` | `commission − partner_share` | 호텔 | 생성 컬럼 |
| `fx_rate` | 1 호텔 통화 = x 송금 통화 | — | 파트너 입력(결정 6) |
| `remit_amount_expected` | `ccy_round(micego_share × fx_rate, remit_ccy)` | 송금 | 생성 컬럼 |
| `remit_amount_actual` | 실제 송금액 | 송금 | 파트너 입력 |
| `received_amount` | MICEGO 계좌 입금액 | 송금 | HQ 입력 |
| 차이 | `received − remit_amount_expected` | 송금 | 뷰에서 계산 |

예시 — 방콕 행사, 호텔 THB 계약:

```
contract 2,400,000.00 THB · rate 10% → commission 240,000.00 THB
partner 70% → 168,000.00 THB · MICEGO 72,000.00 THB
remit USD · fx 0.02985 (1 THB = 0.02985 USD) → expected 2,149.20 USD
actual 2,149.20 · received 2,124.20 (은행 수수료 25) → 허용치 이내 → completed
```

**fx 이상치 검사(플래그 `fx_outlier`):** 같은 통화쌍의 최근 90일 `completed` 정산 fx 중앙값 대비 ±5%를 벗어나면 플래그. 이력이 없으면 검사하지 않고, HQ 입금 확인 화면에 "비교할 환율 이력 없음"을 표시합니다. 외부 환율 API는 v1에서 쓰지 않습니다.

### 6.6 분쟁 처리

- **진입:** 파트너 관리자 또는 HQ가 사유와 함께 `open_dispute`. 흔한 사례: 호텔이 커미션 지급 거부, 오거나이저 인원 감소로 계약 금액 변경, 송금액 불일치.
- **분쟁 중:** 어떤 필드도 수정 불가. 코멘트는 `settlement_event(action='comment')`로만(RPC `settlement_comment(p_id, p_note)`, 양측 가능).
- **해소:** HQ만. `target_status`로 되돌릴 단계를 고르고, 그 뒤 단계 필드는 초기화됩니다. 금액을 줄여야 하면 `pending_commission`으로 되돌려 파트너가 다시 입력 → HQ 재승인. 받을 수 없게 되면 `voided`(수금 전) 또는 `completed` + 0원 처리(수금 후 일부 반환 등 — 사유 필수).
- **기한:** 분쟁 14일 이상 미해소면 `settlement_overdue` 개입 알림.

### 6.7 정산 알림

| 전이 | 알림 |
|---|---|
| 생성 | `PTR_SETTLEMENT_CREATED` |
| S1 | `HQ_COMMISSION_SUBMITTED` |
| S2 / S3 | `PTR_COMMISSION_APPROVED` / `PTR_COMMISSION_REJECTED` |
| S4 | (알림 없음 — 대시보드 반영) |
| S5 | `HQ_REMITTED` |
| S6 | `PTR_REMIT_RECEIVED` |
| S7 / S8 | `HQ_SETTLEMENT_DISPUTE` + `PTR_SETTLEMENT_DISPUTE` / `PTR_SETTLEMENT_RESOLVED` |
| 기한 초과(크론) | `PTR_SETTLEMENT_OVERDUE` + intervention |

### 6.8 월 마감 조회 뷰

```sql
create view public.v_settlement_monthly with (security_invoker = true) as
select to_char(received_at at time zone 'Asia/Seoul', 'YYYY-MM') as period,
       partner_id, hotel_currency, remit_currency,
       count(*)                          as settlements,
       sum(commission_amount)            as commission_total,       -- 호텔 통화
       sum(partner_share_amount)         as partner_share_total,
       sum(micego_share_amount)          as micego_share_total,
       sum(remit_amount_expected)        as remit_expected_total,   -- 송금 통화
       sum(remit_amount_actual)          as remit_actual_total,
       sum(received_amount)              as received_total,
       sum(received_amount - remit_amount_expected) as variance_total,
       bool_or(period_closed)            as closed
from public.settlement s
left join lateral (select exists(select 1 from public.settlement_period p
                   where p.period = to_char(s.received_at at time zone 'Asia/Seoul','YYYY-MM')) as period_closed) pc on true
where s.status = 'completed'
group by 1,2,3,4;

create view public.v_settlement_aging with (security_invoker = true) as
select s.*,
       case when s.status in ('pending_commission','commission_submitted','commission_confirmed')
                 and current_date > s.collect_due_date then 'collect_overdue'
            when s.status = 'collected' and current_date > s.remit_due_date then 'remit_overdue'
            when s.status = 'remitted' and now() - s.remitted_at > interval '7 days' then 'receipt_pending'
            else null end as overdue_kind,
       (current_date - s.collect_due_date) as days_past_collect_due
from public.settlement s
where s.status not in ('completed','voided');
```

통화가 섞여 있으므로 **합계는 통화별 행**으로 나옵니다(원화 환산 합계는 만들지 않음 — 적용 환율이 건마다 달라서 의미가 없습니다). 월 마감 RPC:

```sql
public.settlement_close_period(p_period char(7), p_note text) returns public.settlement_period
  -- operator만. 해당 월 received_at 기준 completed 건 중 disputed 전환 대기 등 미결이 없는지 확인 후 INSERT.
public.settlement_reopen_period(p_period char(7), p_reason text) returns void
  -- operator만. 사유 audit 필수.
```

---

## 7. 인계(takeover)

### 7.1 개입 조건 감지

크론 `mgpt-intervention-scan`(`*/15 * * * *`)이 `private.intervention_scan()`을 실행합니다. 이 함수는 아래 조건을 계산해 `intervention_alert`를 열거나(없으면 INSERT) 닫습니다(조건이 사라지면 `resolved_at=now(), resolution='auto_cleared'`).

| kind | 조건 | 심각도 | 알림 대상 |
|---|---|---|---|
| `unassigned_stale` | `delegation='hq_held'` and status in (received, verifying) and 접수 후 **2영업시간** 경과 | 1 | HQ |
| `partner_idle` | `delegated` and 배정 후 **1영업일** 동안 파트너 행동 없음(파트너 actor의 rfp 이벤트·초대 발송·상태전이 0건) | 2 | HQ + 파트너 |
| `sla_breach` | `now() > rfp_sla_due(rfp_id)` and 다음 단계로 안 넘어감 | 1 | HQ + 파트너 |
| (경고만) SLA 임박 | 기존 SOP v2.1 정의(다음 영업일 18:00 이내 또는 24h) | — | 파트너만(`PTR_SLA_WARN`), alert 행은 만들지 않음 |
| `partner_inactive` | 파트너 조직 `suspended`/`terminated` and 진행 중 `delegated` RFP 존재 | 1 | HQ |
| `proxy_disputed` | 초대가 `proxy_disputed`이고 24시간 안에 재입력·재초대 없음 | 2 | HQ + 파트너 |
| `organizer_voc` | `feedback_resolve_rfp` 결과가 `verified`인 피드백이 `delegated` RFP에 접수됨 | 2 | HQ |
| `settlement_overdue` | `v_settlement_aging.overdue_kind is not null` 또는 분쟁 14일 초과 | 2 | HQ + 파트너 |
| `hotel_unreviewed_won` | 정산 플래그 `hotel_unreviewed` | 2 | HQ |

- 영업시간·영업일은 `rfp_sla_due`와 같은 KST 달력(`holiday` 테이블)을 씁니다.
- 알림은 alert가 처음 열릴 때 한 번, 이후 열려 있으면 24시간마다 한 번(`last_notified_at`). `snoozed_until`이 지나기 전에는 보내지 않습니다.
- 대시보드는 `intervention_alert where resolved_at is null`만 읽습니다(계산하지 않음).

`rfp_sla_due(p_rfp_id) returns timestamptz`: admin.js의 SLA 계산(상태별 목표 시간, 영업시간, 공휴일)을 그대로 SQL로 옮깁니다. 옮긴 뒤 admin.js는 `rfp.sla_due_at`(목록 조회 시 RPC `rfp_list`가 함께 계산해 반환)만 표시합니다. 이관 검증은 기존 mock 데이터의 SLA 표시값과 SQL 결과를 비교하는 테스트로 합니다(13.5).

### 7.2 HQ 알림

- `HQ_INTERVENTION`(이메일, 운영자 공용 주소 `app_setting.ops_email`): 제목 `[MICEGO 개입 필요] {사유} · {REF} · {파트너}`. 본문에 RFP 상세 링크와 [인계] 버튼(콘솔 딥링크 `rfp.html?ref=…&action=takeover`).
- 매일 KST 09:00 `HQ_DAILY_DIGEST`: 열린 alert 목록, hq_held 목록, 정산 기한 초과 목록.

### 7.3 takeover RPC

```sql
public.rfp_takeover(
  p_rfp_id uuid,
  p_reason text,                          -- 필수, 5~500자
  p_share_override_pct numeric default null,   -- null이면 조정 없음(N20)
  p_expected_version int
) returns public.rfp
```

```
me := require_console(['operator'])
r := rfp for update; version check
if r.delegation <> 'delegated' → 'invalid_delegation'
if r.status in ('lost','cancelled','rejected') → 'rfp_closed'      -- won은 허용(정산 분쟁 대응)
update rfp set delegation = 'taken_over', taken_over_at = now(), taken_over_by = me.user_id,
               takeover_reason = p_reason,
               partner_share_override_pct = coalesce(p_share_override_pct, partner_share_override_pct),
               row_version += 1
-- 진행 중인 파트너 작업 처리
  - proxy_entered 초대: 그대로 둔다(호텔 확인은 유효). 이후 재발송은 HQ만.
  - 파트너가 예약한 발송(있다면): 유지
if settlement exists and status in ('pending_commission','commission_submitted') and p_share_override_pct is not null:
     settlement_advance(…, 'set_share_override', {partner_share_pct: p_share_override_pct})
insert rfp_assignment_event('takeover', from_delegation 'delegated', to 'taken_over', reason, payload {override_pct})
resolve open intervention_alert for rfp (resolution = 'taken_over')
outbox: PTR_TAKEN_OVER(파트너 전원, 사유 포함)
audit
```

인계 후 파트너 화면: RFP 상세 상단에 회색 배너 "본사가 {일시}에 이 요청을 인계했습니다 · 사유: {reason} · 이제 읽기 전용입니다." 모든 버튼 비활성. 신원 열람은 가능(로그 남음). 정산 화면은 그대로(정산 입력 권한은 유지 — 인계는 운영 권한을 가져가는 것이지 정산 주체를 바꾸지 않음. 정산 주체도 바꿔야 하면 HQ가 정산을 `set_share_override` 0% + 분쟁 해소로 HQ 단독 처리).

### 7.4 정산 몫 조정 필드

- `rfp.partner_share_override_pct`: 인계 시 입력. won 전이면 정산 생성 시 이 값이 스냅샷됩니다.
- 이미 정산이 있으면 S10(`set_share_override`)으로 반영, `commission_confirmed` 이후면 분쟁 경유.
- 콘솔 인계 다이얼로그에 "파트너 몫 조정" 입력(기본 빈 값 = 계약 기본 70%)과 안내 "조정 기준은 파트너 계약서 제X조를 따릅니다"를 둡니다.

### 7.5 되돌리기(release)

```sql
public.rfp_release(p_rfp_id uuid, p_reason text, p_expected_version int,
                   p_partner_id uuid default null)    -- null이면 원래 파트너
  returns public.rfp
```

```
operator만. r.delegation = 'taken_over' 가드.
target := coalesce(p_partner_id, r.partner_id); 대상이 region을 덮고 active인지 확인
update rfp set delegation = 'delegated', partner_id = target, delegated_at = now(), delegated_by = me,
               taken_over_at = null, taken_over_by = null, takeover_reason = null, row_version += 1
-- partner_share_override_pct는 유지(명시적으로 지우려면 p_reason에 적고 별도 rfp_set_share_override 호출)
event 'release'(payload에 이전 taken_over_at/by 보존), PTR_RELEASED, audit
```

`hq_held` → `delegated`는 `rfp_assign`이고, `taken_over` → `hq_held`(파트너 완전 분리)는 `rfp_hold`로 가능합니다(`rfp_hold`는 `delegated`, `taken_over` 둘 다 받음).

### 7.6 위임 상태 전이 요약

```
            auto_assign / assign                 takeover
 hq_held ───────────────────────▶ delegated ───────────────▶ taken_over
    ▲  ◀─────────────────────────   │   ▲  ◀───────────────────  │
    │   hold / decline(파트너)       │   │        release          │
    │                                │   └── reassign(A→B)         │
    └────────────────────────────────┴──────── hold ◀─────────────┘
```

---
## 8. Edge Function 변경

### 8.1 공통

**`_shared/authz.ts`** (신규):

```ts
type Role = 'operator' | 'partner_admin' | 'partner_member';
interface ConsoleCtx { userId: string; role: Role; partnerId: string | null; partnerStatus: string | null;
                       userClient: SupabaseClient; /* 사용자 JWT로 만든 클라이언트 */ requestId: string; }

async function requireConsole(req: Request, roles: Role[]): Promise<ConsoleCtx>
  // 1) Authorization: Bearer <jwt> 없으면 401 'unauthenticated'
  // 2) service client로 auth.getUser(jwt) → 실패 401
  // 3) service client로 console_user 조회(user_id, status='active') → 없으면 403 'forbidden'
  //    (JWT app_metadata는 보지 않음 — N1)
  // 4) role ∉ roles → 403 'forbidden'
  // 5) partner면 partner_org.status 조회해 ctx에 포함(쓰기 함수는 'active' 요구)
  // 6) userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
```

권한 체크 순서(모든 콘솔 함수 공통): **CORS preflight → 메서드 → requireConsole(역할) → 입력 스키마 검증 → 대상 리소스 조회 & 범위 확인(RPC가 수행) → 실행 → 감사.** 대상 리소스의 범위 확인은 가능하면 `userClient.rpc(...)`로 DB에 맡겨 RLS·가드를 한 벌로 유지합니다. 서비스 롤 클라이언트는 Auth Admin API, 원문 토큰 생성, Storage 서명 URL, 메일 발송에만 씁니다.

오류 응답 형식(기존과 동일하다고 가정): `{ ok: false, code: 'forbidden' | 'not_found' | 'stale_version' | 'invalid_transition' | 'rfp_taken_over' | 'region_revoked' | 'partner_suspended' | 'validation', message: '한국어 한 문장(원인 + 다음 행동)' }`. RPC가 던진 `P0001` 예외 메시지를 코드로 그대로 매핑합니다.

### 8.2 신규 함수

#### `partner_invite` (verify_jwt=true)

| 항목 | 내용 |
|---|---|
| 역할 | operator: 모든 역할 초대 · partner_admin: 자기 조직 `partner_member`만 |
| 요청 | `{ action: 'invite' \| 'resend' \| 'revoke', email?, display_name?, role?, partner_id?, user_id?, reason? }` |
| 응답 | `{ ok: true, user_id, status: 'invited' \| 'disabled', invited_at }` |

```
invite:
  ctx := requireConsole(['operator','partner_admin'])
  if ctx.role = partner_admin: role must = partner_member, partner_id := ctx.partnerId (요청값 무시)
  if role = operator: partner_id must be null
  partner_org.status in ('onboarding','active') (operator 초대 제외)
  count(active+invited in org) < max_accounts
  email 정규화(소문자·trim) → console_user 중복이면 'already_exists'
  auth user 존재 여부 조회(admin.listUsers 필터 또는 member 테이블 email) → 회원이면 'email_in_use_by_member'(N23)
  { data } := admin.inviteUserByEmail(email, { redirectTo: `${CONSOLE_URL}/accept.html`, data: { display_name } })
  admin.updateUserById(data.user.id, { app_metadata: { role, partner_id, cv: 1 } })
  insert console_user(status 'invited', invited_by = ctx.userId)   -- 서비스 롤
  audit('console_user','invite')
resend:  같은 권한 범위, status='invited'인 행만. inviteUserByEmail 재호출(이미 가입 확인된 사용자면 generateLink('magiclink')로 대체)
revoke:  status → 'disabled', app_metadata → { role: null, partner_id: null, cv: cv+1 }, admin.signOut(user_id,'global')
         partner_admin은 자기 조직 partner_member만, 자기 자신은 불가. 조직의 마지막 active partner_admin은 operator만 정지 가능
```

Supabase 초대 메일 템플릿(Auth > Email Templates > Invite)은 한국어로 바꾸고 "MICEGO 운영 콘솔 초대" 문구를 씁니다. 운영자 계정도 같은 흐름(결정 8).

**수락 흐름 (`admin/accept.html`):** 초대 링크 → Supabase가 세션을 만든 상태로 도착 → 비밀번호 설정 폼(회원제와 같은 규칙) → `auth.updateUser({ password })` → RPC `console_accept_invite()`(status invited→active, accepted_at) → 대시보드. 링크 만료(기본 24시간) 시 "초대 링크가 만료됐습니다. 초대한 분께 다시 보내 달라고 요청해 주세요."

#### `partner_org_admin` (verify_jwt=true)

| action | 역할 | 입력 | 동작 |
|---|---|---|---|
| `create_org` | operator | code, legal_name, display_name, public_name, country_code, revenue_share_pct, settlement_currency, contact_* , contract_* | INSERT(status onboarding) |
| `update_org` | operator | 위 필드 일부 + `expected_updated_at` | UPDATE |
| `update_org_contact` | partner_admin(자기 조직) | contact_name/email/phone, accepting_new, timezone | 지정 필드만 |
| `set_status` | operator | status, reason, dpa_signed_at(active 전환 시) | active 전환은 DPA 필수, suspended/terminated 전환 시 진행 중 RFP 수를 응답에 포함하고 intervention `partner_inactive` 즉시 스캔 |
| `set_region` | operator | region_code, is_primary, priority, active, force | 주 파트너 교체는 한 트랜잭션에서 기존 primary false → 새 primary true. 비활성화 시 진행 중 `delegated` RFP가 있으면 `force` 없이는 `region_in_use` 오류 + 건수 |
| `change_member_role` | operator | user_id, role(partner_admin↔partner_member) | cv+1, app_metadata 갱신 |
| `move_member` | operator | user_id, to_partner_id, role | 담당자가 다른 파트너 조직으로 옮길 때의 **유일한 공식 경로**입니다(같은 이메일은 `auth.users`·`console_user` 모두 하나라서 "정지 후 재초대"가 불가능). 한 트랜잭션에서 partner_id·role 변경 + cv+1 → app_metadata 갱신 → `auth.admin.signOut(user_id,'global')` → audit. 과거 `identity_view_log`·이벤트의 partner_id는 옛 조직 그대로 남습니다(12장 b) |
| `add_alias` / `remove_alias` | operator | alias, region_code | region_alias 관리 |

모든 action은 SQL RPC(`partner_org_upsert`, `partner_region_set`, `partner_org_set_status` 등, operator 가드 포함)를 `userClient`로 호출하고, app_metadata 갱신·signOut만 서비스 롤로 합니다.

#### `rfp_assign` (verify_jwt=true)

| 항목 | 내용 |
|---|---|
| 요청 | `{ action: 'assign' \| 'reassign' \| 'hold' \| 'takeover' \| 'release' \| 'decline' \| 'set_region' \| 'request_takeover', rfp_id, partner_id?, region_code?, reason, share_override_pct?, expected_version }` |
| 역할 | decline·request_takeover: partner_admin / 나머지: operator |
| 응답 | `{ ok: true, rfp: { id, ref, region_code, partner_id, delegation, row_version, … }, warnings: string[] }` |

```
ctx := requireConsole(roles(action))
switch action → userClient.rpc('rfp_assign' | 'rfp_hold' | 'rfp_takeover' | 'rfp_release' | 'rfp_decline_assignment' | 'rfp_set_region', …)
request_takeover: RPC 없이 outbox에 HQ_TAKEOVER_REQUESTED만 INSERT(rpc 'rfp_request_takeover' — 파트너 쓰기 가드 통과 필요)
성공 후: dispatch_notifications를 즉시 1회 호출(fetch, await 안 함 — 크론이 백업)
```

#### `quote_proxy_enter` (verify_jwt=true)

| 항목 | 내용 |
|---|---|
| 역할 | partner_admin, partner_member, operator |
| 요청 | `{ action: 'prepare_upload' \| 'enter' \| 'resend' \| 'remind'(크론 전용, `x-internal-secret` 인증, 10.3), invitation_id, expected_rfp_version, quote?: <기존 submit_bid와 같은 견적 스키마>, evidence_note?, evidence_path? }` |
| 응답 | prepare_upload: `{ upload_url, path }` · enter/resend: `{ ok, invitation: { id, status, confirm_sent_to_masked, confirm_expires_at }, quote_id }` |

```
ctx := requireConsole([...])
prepare_upload: userClient.rpc('can_read_rfp', rfp_of(invitation)) 확인 → storage.createSignedUploadUrl('quote-evidence/<rfp>/<new uuid>/<name>')
enter:
  raw := base64url(randomBytes(32)); hash := sha256hex(raw)
  result := userClient.rpc('quote_proxy_enter_tx', {
      p_invitation_id, p_quote jsonb, p_evidence_note, p_evidence_path, p_confirm_token_sha256: hash,
      p_expected_rfp_version })
    -- RPC 안: assert_rfp_write, 초대 상태 가드(P1), 호텔 approved·이메일 인증(N13), 대리 입력 횟수 ≤3(파트너),
    --        견적 스키마 검증(submit_bid와 같은 SQL 검증 함수 재사용), bid_quote INSERT(entered_by, entered_by_user,
    --        entered_by_partner, proxy_*), 이전 proxy 견적 superseded, invitation UPDATE(status proxy_entered,
    --        proxy_quote_id, confirm_token_*, confirm_sent_to = hotel.contact_email), rfp_event, audit
    -- 반환: { hotel_email, hotel_name, public_name, rfp_ref, quote_summary, expires_at }
  sendEmail(HTL_CONFIRM, to = result.hotel_email, link = `${SITE}/en/bid.html?t=${raw}`)   -- Resend, Idempotency-Key = invitation_id + hash8
  if 발송 실패: RPC 'quote_proxy_mark_send_failed' → 콘솔에 "호텔 확인 메일 발송 실패, 다시 보내기" 표시(토큰은 유효)
  raw는 응답에 절대 포함하지 않음
resend: 새 raw/hash로 'quote_proxy_resend_tx'(P6) → 발송
```

#### `quote_confirm` (verify_jwt=false)

| 항목 | 내용 |
|---|---|
| 요청 | JSON `{ t, action: 'confirm' \| 'dispute', reason?, quote_id }` 또는 form POST 같은 필드 |
| 응답 | `{ ok: true, state: 'confirmed' \| 'disputed' }` · 오류 `{ ok:false, code: 'invalid_token' \| 'expired' \| 'used' \| 'stale_quote' \| 'rate_limited' }` |

```
1. CORS(허용 목록 echo, credentials 없음) · 메서드 POST
2. t 형식 검증(^[A-Za-z0-9_-]{43}$) → 아니면 invalid_token (DB 조회 전)
3. IP HMAC 기반 레이트리밋: 10회/10분(피드백과 같은 레이트 테이블 재사용)
4. hash := sha256hex(t)
5. service client로 rpc('quote_confirm_tx', { p_hash: hash, p_action, p_reason, p_quote_id })
     -- select invitation where confirm_token_sha256 = hash for update
     -- 없음 → invalid_token / used_at not null → used / expires_at < now() → expired
     -- proxy_quote_id <> p_quote_id → stale_quote (그 사이 재발송된 경우)
     -- rfp.status not in (bidding, rebid, collecting) → 'closed' (확인해도 비교표에 못 들어감을 안내)
     -- confirm: bid_quote.confirmed_at = now(), confirmed_via = 'confirm_link'; invitation.status = hotel_confirmed
     -- dispute: reason 10~1000자; invitation.status = proxy_disputed, disputed_at, dispute_reason
     -- confirm_token_used_at = now(); rfp_event(actor = 'hotel'); outbox(PTR_*, HQ_*); audit(actor null, entity 'bid_invitation')
6. 응답. form POST면 303 → /en/bid.html?t=<t>&done=1 (페이지는 get_bid로 결과 상태 표시)
```

`quote_confirm_tx`는 `service_role`만 EXECUTE합니다(`revoke execute … from authenticated, anon`).

#### `settlement_action` (verify_jwt=true)

| 항목 | 내용 |
|---|---|
| 요청 | `{ action: 'prepare_upload', settlement_id, file_name, kind }` 또는 `{ action: <6.3 action>, settlement_id, payload, expected_version }` 또는 `{ action: 'download', attachment_id }` |
| 응답 | prepare_upload: `{ upload_url, path }` · 전이: `{ ok, settlement }` · download: `{ url }`(60초 서명 URL) |

```
ctx := requireConsole(['operator','partner_admin','partner_member'])
partner_member는 'download'만 허용
prepare_upload: userClient로 settlement SELECT(RLS로 범위 확인) → 확장자·크기 검사 → createSignedUploadUrl
전이: userClient.rpc('settlement_advance', {...}) → 성공 시 dispatch 트리거
download: settlement_attachment SELECT(RLS) → createSignedUrl(60)
```

### 8.3 기존 함수 변경

| 함수 | 변경 |
|---|---|
| `get_bid` | 토큰을 `token_sha256` → 없으면 `confirm_token_sha256` 순서로 조회. 응답에 `mode: 'bid' \| 'confirm'`, `invitation_status`(proxy 상태 포함), `proxy_quote`(요약·entered_by 표시명=`partner_org.public_name` 또는 'MICEGO'·증빙 메모·entered_at), `confirm_expires_at`, `confirm_sent_to_masked`, `revised`(대체 여부) 추가. 파트너 사용자 식별자·내부 메모는 절대 넣지 않음 |
| `submit_bid` | 확인 토큰으로도 제출 가능(P3). 제출 시 초대가 `proxy_entered`/`hotel_confirmed`면 기존 proxy 견적 `superseded_by` 설정 + 확인 토큰 폐기 + `PTR_PROXY_REVISED` |
| `decline_bid` | 초대가 `proxy_entered`면 거절 허용(호텔 의사 우선), proxy 견적 superseded, 확인 토큰 폐기 |
| `admin_member_action` | 권한 검사 `requireConsole(['operator'])`로 교체(파트너 차단) |
| `create_share_link`, `pick_send_otp`, `pick_verify`, `get_track`, `login`(회원) | 변경 없음. 단 `pick_verify`의 won 전이는 트리거로 정산 생성(6.1) |
| 콘솔 로그인 경로 | 로그인 직후 `console_whoami()`가 null이면 즉시 signOut + "콘솔 권한이 없는 계정입니다." |
| 운영자 권한을 쓰던 나머지 admin용 함수 전부 | `requireConsole(['operator'])` 또는 역할표(9장)에 맞게. 기존 `app_metadata.role === 'operator'` 비교 코드를 전부 제거(검색어: `app_metadata`, `'operator'`) |
| `dispatch_notifications` | 신규 템플릿 ID 등록, `audience='partner'` 수신자 해석(조직 활성 계정 전원 또는 partner_admin만 — 템플릿 메타의 `partner_roles`), `audience='hq'`는 `app_setting.ops_email` |
| `feedback_resolve_rfp`(SQL) | bid 토큰 후보 조회에 `confirm_token_sha256` 8자 매칭 추가 |

---

## 9. 콘솔 화면 변경

### 9.1 공통 셸 (admin.js)

**세션 부트스트랩:**

```
boot():
  session := supabase.auth.getSession()        (mock 모드: MOCK.session)
  if !session → login.html
  me := rpc('console_whoami')                  (mock: MOCK.consoleUsers[?as=…])
  if !me → signOut → login.html?e=no_console
  if jwt.app_metadata.cv !== me.cv → refreshSession() (1회, 실패해도 계속 — 판정은 DB)
  window.MG_ME = me
  renderNav(me.role)
  guardPage(PAGE_ROLES[currentPage], me.role)   → 허용 안 되면 index.html?e=forbidden (토스트 "이 화면을 볼 권한이 없습니다.")
  상단 바: 역할 배지(본사 / 파트너 관리자 / 파트너 담당자) + 조직명 + 담당 지역 칩
  파트너 조직 suspended면 상단 노란 띠 "조직이 일시 정지 상태입니다. 진행 중 요청은 읽기만 가능하고, 정산 입력은 계속할 수 있습니다."
```

**API 오류 공통 처리:** `rfp_taken_over`, `region_revoked`, `partner_suspended`, `forbidden` → `console_whoami()` 재호출 + 현재 화면 다시 그리기 + 토스트(코드별 한국어 문장). `stale_version` → "다른 사용자가 먼저 변경했습니다. 새로 불러온 내용을 확인해 주세요." + 자동 새로고침.

**NAV:**

| 메뉴 | 파일 | operator | partner_admin | partner_member |
|---|---|---|---|---|
| 대시보드 | `index.html` | ✅ HQ 뷰 | ✅ 파트너 뷰 | ✅ 파트너 뷰 |
| 견적 관리 | `rfps.html`, `rfp.html` | ✅ | ✅ | ✅ |
| 호텔 파트너 | `partners.html`, `partner.html` | ✅ | ✅ | ✅(승인 버튼 없음) |
| 정산 | `settlements.html`, `settlement.html` (신규) | ✅ | ✅ | ✅(읽기) |
| 지역 파트너 | `orgs.html`, `org.html` (신규) | ✅ | — | — |
| 내 조직 | `my-org.html` (신규) | — | ✅ | ✅(읽기, 담당자 목록만) |
| 회원 | `members.html`, `member.html` | ✅ | — | — |
| 피드백 | `feedback*.html` | ✅ | — | — |
| 설정 | `settings.html` | ✅ | — | — |

`PAGE_ROLES`는 위 표를 그대로 상수로 둡니다. NAV에서 숨기는 것은 편의이고, 실제 차단은 RLS(0행)와 `guardPage`입니다.

**데모(mock) 역할 전환:** 기존 데모 띠에 "보기: 본사 · 파트너 관리자(Tmthai) · 파트너 담당자(Tmthai)" 링크를 추가하고 `?as=operator|partner_admin|partner_member`를 sessionStorage `mg_demo_as`에 저장합니다(try/catch). 기존 `?state=` 미리보기와 함께 씁니다.

### 9.2 대시보드 (`index.html`)

**HQ 뷰**

| 위젯 | 데이터 | 동작 |
|---|---|---|
| 개입 필요 | `intervention_alert` 열린 행, 심각도순 → 오래된 순 | 행 클릭 → RFP 상세. 행 우측 [인계] [재배정] [24시간 미루기](snooze) [해제](dismissed, 사유 필수) |
| 본사 보류(미배정) | `rfp where delegation='hq_held' and status in (received, verifying)` + hold_reason 칩 | [파트너 배정] 버튼 → 배정 패널 모달 |
| 지역 확인 필요 | 배정 이벤트 payload `confidence='low'` 최근 7일 | [지역 수정] |
| 지역별 현황 | 지역 × (진행 중·SLA 임박·SLA 초과·이번 달 성사) 매트릭스, 파트너명 | 셀 클릭 → rfps 필터 |
| 파트너 성과(30일) | 파트너별 배정 수, 평균 첫 조치 시간, SLA 준수율, 성사율, 반려 수 | — |
| 정산 대기 | `commission_submitted`(승인 대기), `remitted`(입금 확인 대기), 기한 초과 | [승인하러 가기] |
| 호텔 사후 검토 | `hotel_partner where approved_via='partner' and hq_reviewed_at is null` | [검토] |
| 기존 위젯 | 그대로 유지(전체 기준) | — |

**파트너 뷰**

| 위젯 | 데이터 |
|---|---|
| 오늘 할 일 | 내 조직 RFP 중 다음 행동이 파트너인 것(상태별 SOP 기준) + SLA 남은 시간(KST, 괄호에 현지 시각) |
| 확인 대기 대리 견적 | `proxy_entered` 초대 목록, 만료까지 남은 시간, [다시 보내기] |
| 호텔 이의 | `proxy_disputed` |
| 본사 알림 | 파트너에게 보이는 intervention(4.3 조건) — "본사가 이 건을 주시하고 있습니다" 톤 |
| 인계된 요청 | 최근 30일 `taken_over` 목록(읽기 전용 배지) |
| 정산 | 내 조직 정산 단계별 건수, 기한 임박·초과 |
| 신규 배정 일시 중지 스위치 | partner_admin만, `accepting_new` 토글(확인 대화상자) |

### 9.3 견적 관리 목록 (`rfps.html`)

- **필터 추가:** 지역(칩, 국가 → 도시 2단), 파트너(HQ만), 위임 상태(파트너 운영 / 본사 보류 / 본사 인계), "개입 필요만" 토글(HQ).
- **컬럼 추가:** 지역(코드 + 한국어명), 담당(파트너 display_name 또는 "본사"), 위임 배지. 파트너 뷰에서는 담당 컬럼 숨김.
- 파트너 목록에 `taken_over` 행은 회색 + "읽기 전용".
- 목록 조회는 RPC `rfp_list(p_filters jsonb, p_page int)`로 바꿉니다(`sla_due_at` 계산 포함, 신원 컬럼 없음). PostgREST 직접 조회를 유지해도 되지만 SLA 서버 계산(N26) 때문에 RPC가 낫습니다.

### 9.4 견적 상세 (`rfp.html`)

기존 구성 위에 패널을 추가합니다.

**(1) 배정 패널** — 요약 카드 바로 아래

| 요소 | operator | partner |
|---|---|---|
| 지역: `VN-DAD 다낭` · 출처(자동/본사 지정) · 원문 입력 | 보기 + [지역 수정] | 보기 |
| 담당: 파트너명 · 배정 시각 · 배정 방식(자동/본사) | 보기 + [재배정] [보류] [인계] 또는 [되돌리기] | 보기 |
| 위임 배지 | ✅ | ✅ |
| 배정 이력(접힘) | `rfp_assignment_event` 타임라인 | 같음 |
| [배정 반려] | — | partner_admin, received/verifying일 때 |
| [본사 인계 요청] | — | partner_admin, 그 외 단계 |

[인계] 다이얼로그: 사유(필수) · 파트너 몫 조정(선택, 0~70, 빈 값=조정 없음) · 안내문 "인계하면 파트너는 이 요청을 읽기만 할 수 있습니다. 진행 중인 호텔 확인 요청은 그대로 유효합니다." · [인계하기].

**(2) 오거나이저 정보 카드** — 기존 카드 교체

- 처음에는 가려진 상태: "회사명·담당자·연락처는 열람 기록이 남습니다. [정보 보기]". 클릭 → `rfp_get_identity('rfp_detail')` → 회사·이름·이메일 표시, 전화는 마스킹 + [전화번호 보기](→ `reveal_phone`).
- 카드 하단 "열람 기록" 링크 → 이 RFP의 `identity_view_log` 목록(HQ: 전체, partner_admin: 자기 조직 행, partner_member: 링크 없음).
- 결정 10 설명 문구: "이 요청이 배정된 시점부터 파트너가 열람할 수 있습니다. 호텔에는 선정 후에 전달됩니다."

**(3) 초대·견적 패널** — 기존 호텔별 행에 추가

- 상태 배지에 `대리 입력 · 확인 대기(47시간 남음)`, `호텔 확인 완료`, `호텔 이의`, `확인 만료` 추가. 견적 행에 "입력: 호텔 직접 / 파트너 대리(담당자명) / 본사 대리".
- 행 메뉴 [대리 입력] (P1 가능 상태일 때): 모달 = 기존 호텔 비딩 폼과 같은 필드(공통 컴포넌트) + 증빙 메모(필수) + 증빙 파일(선택) + 안내 "저장하면 호텔 등록 연락처 {m***@hotel.com}로 확인 요청이 발송됩니다. 호텔이 확인해야 비교표에 실립니다." 호텔 이메일 미인증이면 버튼 비활성 + 툴팁 "호텔 연락 이메일 인증이 끝나야 대리 입력을 할 수 있습니다."
- [확인 요청 다시 보내기] (P6), 남은 횟수 표시.
- 호텔 원본 견적 행에는 편집 버튼이 없습니다(결정 5). 대리 견적도 편집 대신 "새로 입력"(새 버전).
- **비딩 링크 복사 버튼:** 파트너 역할에서는 숨깁니다(원문 토큰은 어차피 저장돼 있지 않지만, 재발급+복사 기능이 있다면 파트너는 "호텔에 다시 보내기"만).

**(4) 비교표 전달 버튼** — 전달 전 확인 대화상자에 "호텔 확인 대기 중인 대리 견적 N건은 비교표에 포함되지 않습니다." 목록 표시.

**(5) 인계 배너** — 7.3 문구. 파트너 화면에서 모든 입력·버튼 `disabled` + 툴팁.

**(6) HQ 직접 조치 확인** — operator가 `delegated` RFP에서 상태전이 버튼을 누르면 "{파트너명}이 운영 중인 요청입니다. 인계하지 않고 직접 처리할까요? 파트너에게 알림이 갑니다." [직접 처리] [먼저 인계].

**(7) 발송 내역** — `rfp_notifications()`로 교체(파트너에게 오거나이저 주소 비공개).

### 9.5 호텔 파트너 (`partners.html`, `partner.html`)

- 목록 필터: 지역(파트너는 자기 지역만 선택지), 출처(`sourced_by`: 본사 / 파트너명 / 호텔 직접 신청), 승인 경로(본사 승인 / 파트너 승인 · 본사 미검토 / 파트너 승인 · 본사 검토 완료).
- 목록 컬럼: 지역, 출처, 승인 경로 배지, 이메일 인증 여부, 위험 플래그 아이콘(`free_mail`, `domain_mismatch`, `email_matches_partner`).
- 상세 — 심사 패널:
  - partner_admin: `pending` + 자기 지역 호텔에 [승인] [반려]. 위험 플래그가 있으면 승인 버튼 대신 "본사 승인 필요" 안내(RPC도 거부).
  - operator: 기존 승인·반려·정지 + 파트너 승인 건에 [검토 완료] [승인 취소](→ `suspended` 또는 `rejected`, 사유 필수, 해당 호텔의 진행 중 초대 목록 경고).
  - [호텔 등록](파트너 전원): 지역 필수(자기 지역만), 연락 이메일 입력 → `pending` 생성 + 호텔에 이메일 인증 메일(`HTL_EMAIL_VERIFY`). `sourced_by_partner = 내 조직`.
  - 연락 이메일 변경: `pending`은 등록 파트너, `approved`는 HQ만(N27). 변경되면 `contact_email_verified_at = null`로 재인증.

RPC:

```sql
public.hotel_partner_register(p_payload jsonb) returns public.hotel_partner       -- 파트너·운영자
public.hotel_partner_review(p_hotel_id uuid, p_decision text, p_reason text, p_expected_updated_at timestamptz)
  returns public.hotel_partner
  -- p_decision: 'approve' | 'reject' | 'suspend' | 'hq_review_ok' | 'hq_revoke'
  -- partner_admin: approve/reject만, 가드: 자기 지역, status='pending', 이메일 인증 완료, risk_flags 비어 있음
  -- operator: 전부
public.hotel_partner_update_contact(p_hotel_id uuid, p_email citext, p_name text, p_phone text) returns public.hotel_partner
```

위험 플래그 계산(`hotel_partner_register`·연락처 변경 시):
- `free_mail`: 이메일 도메인이 무료 메일 목록(gmail, yahoo, hotmail, outlook, naver, daum 등 — `app_setting.free_mail_domains`)
- `domain_mismatch`: 호텔 웹사이트 도메인과 이메일 도메인이 다름(웹사이트 미입력 포함)
- `email_matches_partner`: 이메일 도메인이 어느 `partner_org.contact_email` 도메인 또는 `console_user.email` 도메인과 같음

### 9.6 정산 (신규 `settlements.html`, `settlement.html`)

**목록**
- 탭: 진행 중 / 기한 초과 / 분쟁 / 완료 / 전체.
- 필터: 파트너(HQ), 기간(성사월·완료월), 통화.
- 컬럼: 정산번호, RFP REF, 호텔, 파트너(HQ), 단계 표시줄(①~⑤), 커미션(호텔 통화), MICEGO 몫, 송금 예정액(송금 통화), 다음 행동 주체, 기한(D-n / D+n 빨강), 플래그.
- 상단 요약: 통화별 합계(완료·진행 중).
- HQ 전용 [월 마감] 탭: `v_settlement_monthly` 표(월 × 파트너 × 통화), [이 달 마감] / [마감 취소], CSV 내보내기(클라이언트에서 생성).

**상세**
- 헤더: 정산번호, 상태 표시줄, 플래그 배지, 기한.
- 카드 1 "성사 정보": RFP REF(링크), 호텔, 선정 견적 요약, 성사일, 행사 종료일, 위임 상태, 배분율(스냅샷, 조정됐으면 "인계 조정 70%→35%").
- 카드 2 "커미션": 입력 폼(`pending_commission`, partner_admin) — 계약 금액 · 통화 · 방식(요율/정액) · 요율 → 커미션 자동 계산 표시 · 파트너 몫 / MICEGO 몫 실시간 미리보기(서버와 같은 반올림 규칙을 JS에 구현, 저장 후 서버 값으로 덮어씀) · 첨부. HQ에게는 [승인] [반려].
- 카드 3 "수금": 수금일·수금액·증빙.
- 카드 4 "송금": 송금 통화·환율·환율 기준일·출처·송금일·송금액·참조번호·증빙 + "송금 예정액 2,149.20 USD" 계산 표시 + fx 이상치 경고.
- 카드 5 "입금 확인"(HQ): 입금일·입금액 + 차이 표시.
- 이벤트 타임라인(`settlement_event`) + 코멘트 입력.
- [분쟁 열기] (HQ·partner_admin), [분쟁 해소] (HQ: 되돌릴 단계 선택 + 해소 내용), [무효 처리] (HQ).

### 9.7 지역 파트너 관리 (신규 `orgs.html`, `org.html` — HQ 전용)

- 목록: 코드, 이름, 상태 배지, 담당 지역(주/백업 칩), 활성 계정 수, 진행 중 RFP 수, 이번 달 성사, 배분율, DPA 체결일.
- 상세 탭:
  1. **기본 정보**: 조직 필드 편집, 상태 변경(active 전환 시 DPA 체결일 입력 필수), 배분율.
  2. **담당 지역**: 지역 추가(코드 선택, 주/백업, 우선순위), 비활성화(진행 중 건수 경고), 주 파트너 교체. 같은 지역의 다른 파트너도 함께 보여 줌.
  3. **계정**: `console_user` 목록(이름·이메일·역할·상태·초대일·마지막 접속) + [초대] [다시 보내기] [역할 변경] [정지].
  4. **성과·로그**: 배정·반려·인계 이력, 신원 열람 로그(조직 전체), 감사 로그 요약.
- 운영자 계정 관리도 이 화면 상단의 "본사 계정" 탭에서(같은 초대 흐름, 결정 8).
- 지역 별칭 관리: `orgs.html`의 [지역 코드] 탭 — region 목록과 별칭 추가/삭제, "매핑 테스트" 입력창(`region_resolve` 결과 미리보기 RPC `region_resolve_preview(p_country, p_city)`).

### 9.8 내 조직 (신규 `my-org.html` — 파트너)

- partner_admin: 조직 연락처 편집(`update_org_contact`), 신규 배정 일시 중지 토글, 담당 지역 보기(수정 불가 — "지역 변경은 본사에 요청해 주세요"), 담당자 목록 + [담당자 초대](partner_member만) + [정지], 조직의 신원 열람 로그.
- partner_member: 조직 정보·담당 지역·담당자 목록 읽기만, 자기 계정(이름·전화) 수정.

### 9.9 mock 데이터 요구 (`mock-data.js`)

| 키 | 건수 | 내용 |
|---|---|---|
| `MOCK.consoleUsers` | 5 | 본사 운영자 2(김도윤 매니저, 이서연), Tmthai partner_admin 1(박정우 팀장, 한국인 담당), Tmthai partner_member 1(Nok S.), 초대 대기 1 |
| `MOCK.partnerOrgs` | 3 | `TMTHAI` 티엠타이(Tmthai) · 태국 · active · 70% · DPA 체결 / `DNLINK` 다낭링크(가상) · VN-DAD · onboarding(DPA 없음) / `BALIDMC` 발리디엠씨(가상) · ID-DPS · suspended |
| `MOCK.partnerRegions` | 6 | TMTHAI: TH(주), TH-HKT(주) · DNLINK: VN-DAD(주, 비활성) · BALIDMC: ID-DPS(주) · TMTHAI: VN(백업, 우선순위 200 — 백업 예시) |
| `MOCK.regions`, `MOCK.regionAliases` | 3.1 표 전체 | — |
| `MOCK.rfps` 확장 | 기존 + 필드 | 각 RFP에 `region_code`, `partner_id`, `delegation`, `hold_reason`, `row_version`. 최소 구성: TMTHAI delegated 4건(verifying·bidding·collecting·won), taken_over 1건(bidding, 사유 "무응답 2영업일"), hq_held 3건(region_unmapped "유럽 미정", multi_region "다낭+방콕", partner_ineligible "발리 — 파트너 정지"), VN-DAD delegated 0건 |
| `MOCK.invitations`·`MOCK.quotes` 확장 | — | MG-2610-021(TMTHAI, collecting)에 호텔 5곳: 직접 제출 2, `proxy_entered` 1(47시간 남음), `hotel_confirmed` 1(파트너 대리), `proxy_disputed` 1(사유 "Room rate excludes breakfast — please check") |
| `MOCK.identityLog` | 8 | 파트너 열람 5, reveal_phone 1, 운영자 2 |
| `MOCK.assignmentEvents` | RFP별 | auto_assign, decline, assign, takeover, release 예시 |
| `MOCK.interventions` | 6 | 8개 kind 중 unassigned_stale, partner_idle, sla_breach, proxy_disputed, settlement_overdue, hotel_unreviewed_won |
| `MOCK.settlements` | 9 | 상태별 1건씩(8) + HQ 단독 건 1(partner null, `collected`). 통화: THB→USD 3, VND→USD 1, KRW→KRW 1(fx=1), 인계 조정 35% 1, fx_outlier 플래그 1, remit_variance 1 |
| `MOCK.settlementEvents` | 정산별 | 단계 이력 |
| `MOCK.settlementMonthly` | 2개월 | 2026-09(마감), 2026-10(미마감) |
| `MOCK.hotels` 확장 | — | region_code, sourced_by, approved_via, 이메일 인증, risk_flags 예시(파트너 승인·본사 미검토 2, free_mail 1) |
| `MOCK.session` | — | `?as=`에 따른 whoami 결과 3종 |

data-adapter.js는 mock 모드에서 **RLS를 흉내 내는 필터**를 적용합니다: `as=partner_*`면 `rfps`를 `partner_id === me.partner_id && delegation in (delegated, taken_over)`로, 회원·피드백·설정 조회는 빈 배열 + `forbidden`. 이렇게 해야 verify 스크립트가 파트너 화면을 mock으로 검증할 수 있습니다.

---
## 10. 알림 추가

알림 ID는 기존 라이브러리 체계(대문자 스네이크, 수신자 접두어)를 따른다고 가정합니다. 파트너·본사 알림은 이메일(한국어), 호텔 알림은 이메일(영어)입니다.

### 10.1 파트너 `PTR_*` (한국어 이메일)

| ID | 트리거 시점 | 수신 | 핵심 문구(제목) |
|---|---|---|---|
| `PTR_INVITE` | `partner_invite` invite | 초대 대상 | (Supabase Auth 초대 템플릿) MICEGO 운영 콘솔에 초대되었습니다 |
| `PTR_ASSIGNED` | 자동/수동 배정 | 조직 활성 계정 전원 | [새 요청 배정] {REF} · {지역} · {행사월} · 요건 확인 기한 {SLA} |
| `PTR_UNASSIGNED` | 재배정·보류로 배정 해제 | 조직 전원 | [배정 해제] {REF} — 본사가 담당을 변경했습니다 |
| `PTR_SLA_WARN` | SLA 임박(크론) | 조직 전원 | [기한 임박] {REF} {단계} — {남은 시간} 남음 |
| `PTR_PROXY_CONFIRMED` | P2 | 대리 입력자 + partner_admin | [호텔 확인 완료] {호텔} 견적이 비교표에 포함됩니다 |
| `PTR_PROXY_REVISED` | P3 | 같음 | [호텔 수정 제출] {호텔}이 견적을 직접 수정해 제출했습니다 |
| `PTR_PROXY_DISPUTED` | P4 | 같음 | [호텔 이의] {호텔} — "{사유 앞 60자}" |
| `PTR_PROXY_EXPIRED` | P5 | 같음 | [확인 만료] {호텔} 대리 견적 확인 기한이 지났습니다 |
| `PTR_PROXY_SEND_FAILED` | 확인 메일 발송 실패 | 대리 입력자 | [발송 실패] {호텔} 확인 요청 메일이 발송되지 않았습니다 |
| `PTR_HQ_ACTION` | N16 HQ 직접 조치 | 조직 전원 | [본사 조치] {REF} — 본사가 {동작}을 처리했습니다 |
| `PTR_TAKEN_OVER` | takeover | 조직 전원 | [본사 인계] {REF} — 이제 읽기 전용입니다 · 사유 {reason} |
| `PTR_RELEASED` | release | 대상 조직 전원 | [운영 재위임] {REF} — 다시 운영할 수 있습니다 |
| `PTR_HOTEL_REVOKED` | HQ가 파트너 승인 호텔 취소 | partner_admin | [호텔 승인 취소] {호텔} — 사유 {reason} |
| `PTR_SETTLEMENT_CREATED` | won | partner_admin | [성사] {REF} {호텔} — 커미션을 입력해 주세요 |
| `PTR_COMMISSION_APPROVED` | S2 | partner_admin | [커미션 확정] {정산번호} {금액} — 수금 기한 {date} |
| `PTR_COMMISSION_REJECTED` | S3 | partner_admin | [커미션 반려] {정산번호} — 사유 {reason} |
| `PTR_REMIT_RECEIVED` | S6 | partner_admin | [입금 확인] {정산번호} {금액} 정산이 완료되었습니다 |
| `PTR_SETTLEMENT_DISPUTE` | S7 | partner_admin | [정산 분쟁] {정산번호} |
| `PTR_SETTLEMENT_RESOLVED` | S8 | partner_admin | [분쟁 해소] {정산번호} — {단계}로 되돌렸습니다 |
| `PTR_SETTLEMENT_OVERDUE` | 크론(기한 초과, 이후 7일마다) | partner_admin | [정산 기한 초과] {정산번호} {수금/송금} D+{n} |
| `PTR_DAILY_DIGEST` | 매일 KST 09:00(파트너 현지 07:00 태국) | 조직 전원(수신 설정 가능) | 오늘 할 일 {n}건 · 확인 대기 {n} · 기한 임박 {n} |

### 10.2 본사 `HQ_*` (한국어 이메일, `app_setting.ops_email`)

| ID | 트리거 |
|---|---|
| `HQ_RFP_HELD` | 자동 보류(region_unmapped, multi_region, no_partner, partner_ineligible) |
| `HQ_PARTNER_DECLINED` | 파트너 배정 반려 |
| `HQ_TAKEOVER_REQUESTED` | 파트너의 본사 인계 요청 |
| `HQ_INTERVENTION` | intervention_alert 열림(심각도 1은 즉시, 2는 즉시, 24시간 재알림) |
| `HQ_PROXY_DISPUTED` | P4 |
| `HQ_HOTEL_APPROVED_BY_PARTNER` | 파트너가 호텔 승인(일일 요약에 묶음) |
| `HQ_HOTEL_UNREVIEWED_DELIVERED` | HQ 미검토 파트너 승인 호텔 견적이 비교표로 전달됨(N28) — 건별 즉시, 사후 검토 요청 |
| `HQ_COMMISSION_SUBMITTED` | S1 |
| `HQ_REMITTED` | S5 |
| `HQ_SETTLEMENT_DISPUTE` | S7 |
| `HQ_IDENTITY_ANOMALY` | 한 계정 24시간 신원 열람 30건 초과 |
| `HQ_PARTNER_ACCOUNT_CHANGE` | 파트너 관리자가 담당자 초대·정지(일일 요약) |
| `HQ_DAILY_DIGEST` | 매일 KST 09:00 |

### 10.3 호텔 (영어 이메일)

| ID | 트리거 | 제목 | 핵심 |
|---|---|---|---|
| `HTL_CONFIRM` | P1, P6 | Please confirm your quote for {event month} · {REF} | 누가 대신 입력했는지(`public_name`), 요약, [Review and confirm] 버튼(확인 토큰 링크), 기한(호텔 현지 + KST) |
| `HTL_CONFIRM_REMIND` | 만료 24시간 전(크론, 1회) | Reminder: your quote confirmation expires in 24 hours | 새 링크(원문 토큰을 저장하지 않으므로 새 토큰을 발급하고 이전 토큰은 폐기). 기한은 연장하지 않고, P6 재발송 횟수에도 넣지 않음 |
| `HTL_EMAIL_VERIFY` | 파트너가 호텔 등록 / 연락처 변경 | Verify your contact email for MICEGO | 이메일 인증 링크(별도 1회용 토큰, 7일) |

`HTL_CONFIRM_REMIND` 구현 주의: 원문 토큰을 저장하지 않으므로 크론이 리마인드를 보내려면 **Edge Function(`quote_proxy_enter`의 내부 action `remind`, 크론 시크릿 인증)** 이 새 토큰을 만들고 이전 토큰을 폐기한 뒤 보냅니다. `confirm_token_expires_at`은 원래 값을 유지합니다.

템플릿 메타(seed): `id`, `audience`(partner|hq|hotel), `partner_roles`(['partner_admin'] 또는 ['partner_admin','partner_member']), `lang`, `subject_tpl`, `html_path`(emails/ 아래), `dedupe_key_tpl`. 알림 라이브러리(`build_notify.py`) 문서에 "파트너·본사" 섹션을 추가하고 이메일 총계를 29 → 29 + 21(PTR) + 13(HQ) + 3(HTL) = **66**로 갱신합니다. 이 중 `PTR_INVITE`는 Supabase Auth 초대 템플릿이라 라이브러리에는 문안과 설정 위치만 싣습니다. 알림톡·SMS는 늘지 않습니다.

---

## 11. 법무·개인정보 체크리스트

법률 판단이 아니라 **확인할 항목 목록**입니다. 각 항목은 `TODO(legal)`로 표시하고 법무 검토 후 확정합니다.

| # | 항목 | 내용 | 반영 위치 |
|---|---|---|---|
| L1 | 처리 구조 판단 | 파트너가 MICEGO의 지시에 따라 MICEGO의 서비스 목적으로만 오거나이저 정보를 처리하면 **처리위탁**(개인정보보호법 제26조), 파트너 자신의 목적(자체 영업 등)으로도 쓰면 **제3자 제공**(제17조, 별도 동의 필요)입니다. 설계는 위탁 구조를 전제로 하며(목적 외 이용 금지·열람 로그·감사권), 계약서도 위탁으로 맞춰야 합니다. | 파트너 계약서 |
| L2 | 위탁 공개 | 개인정보처리방침의 "처리위탁" 항목에 수탁자(파트너 법인명)·위탁 업무(해당 지역 견적 요청의 요건 확인, 호텔 견적 수집, 선정 연결, 정산)를 공개. 파트너가 늘 때마다 갱신. | `ko/privacy`(처리방침), site.config.json의 수탁사 목록 |
| L3 | 국외 이전 | 태국 등 해외 파트너가 한국 서버의 정보를 열람하는 것도 국외 이전입니다(제28조의8). 처리방침에 이전받는 자, 이전 국가, 이전 항목(회사명·담당자 이름·이메일·휴대전화·요청 내용), 이전 시기·방법(배정 시점, 운영 콘솔 열람), 목적, 보유 기간, 거부 방법과 그 효과를 공개. 계약 이행에 필요한 위탁·보관으로 처리방침에 공개하는 방식이 가능한지, 별도 동의가 필요한지 확인. | 처리방침, RFP 폼 고지 |
| L4 | RFP 폼 동의·고지 문구 | 현재 폼의 개인정보 수집 동의 옆에 추가(안): "요청하신 목적지를 담당하는 MICEGO 지역 운영 파트너(예: 태국 — Tmthai)가 요건 확인과 호텔 견적 수집을 위해 회사명·담당자 정보·요청 내용을 열람합니다. 파트너는 해외 소재일 수 있습니다. [자세히 보기]" 동의가 필요하다는 결론이면 필수 체크박스로 분리. | `ko/index.html` 폼, 회원 가입 약관 요약(terms.html) |
| L5 | 호텔 신원 공개 시점 불변 | 호텔에는 기존대로 선정 시점에만 공개(결정 10). 대리 입력·확인 메일에도 오거나이저 정보가 들어가지 않는지 템플릿 검수. | HTL_CONFIRM 템플릿 |
| L6 | 파트너 계약 — 데이터 조항 | ① 목적 외 이용·제3자 제공 금지 ② 오거나이저 직접 영업·우회 거래 금지(비우회 조항) ③ 재위탁 금지(사전 서면 동의 시 예외) ④ 접근 계정 개인별 발급·공유 금지, 퇴사자 즉시 정지 요청 의무 ⑤ 안전성 확보 조치(비밀번호·단말 보안) ⑥ 유출 인지 시 24시간 내 통지 ⑦ 계약 종료 시 파기·반환 및 확인서 ⑧ MICEGO의 열람 로그 점검·감사권 ⑨ 현지법(태국 PDPA 등) 준수 책임 ⑩ 손해배상·면책 | 파트너 계약서(DPA 별첨) — `partner_org.dpa_signed_at` 입력 전제 |
| L7 | 파트너 계약 — 운영·정산 조항 | 배분율 70:30, 수금 기한(행사 종료 + 30일), 송금 기한(수금 + 14일 — N21 제안값), 환율 적용 기준(송금일 은행 적용 환율, 증빙 제출), 은행 수수료 부담 주체, 인계 시 몫 조정 기준(N20), 분쟁 해결 절차, 대리 입력 시 증빙 보관 의무, 호텔 승인 위임 범위와 본사 취소권(결정 11) | 파트너 계약서 |
| L8 | 호텔 대리 입력 근거 | 호텔이 이메일·전화로 알려 준 견적을 파트너가 입력하고 호텔이 확인하는 구조를 호텔 파트너 약관(Partner Terms)에 명시: "Quotes may be entered on your behalf by a MICEGO regional partner based on your communication; they are only shared with the organizer after you confirm them." | en 호텔 파트너 약관 |
| L9 | 열람 로그 보관 | 신원 열람 로그 3년 보관(성사 연결 기록과 동일) — 처리방침 "접속 기록" 항목과 맞춤. 로그에는 IP를 넣지 않음(현 설계). 법정 접속 기록 보관 의무(안전성 확보조치 기준)의 대상이 되는지 확인. | identity_view_log 크론 |
| L10 | 정산 증빙의 개인정보 | 호텔 계약서·인보이스에 오거나이저 담당자 정보가 들어 있을 수 있음 → 비공개 버킷, 5년 보관(세무 증빙 기준 확인), 이후 삭제 크론. | settlement-evidence 버킷 |
| L11 | 탈퇴·파기와 파트너 | 회원 탈퇴 시 진행 중 RFP가 파트너에게 배정돼 있으면(탈퇴 차단 상태가 아니라면) 파트너 열람 권한도 종료되는지 — 탈퇴 처리에서 신원 컬럼 파기가 이미 되므로 `rfp_get_identity`가 빈 값을 반환함을 테스트로 확인. | 13.5 테스트 |

---
## 12. 자체 검증

요청된 9개(a~i)와 설계 중 추가로 찾은 문제(X1~X10)입니다. "반영"은 이 문서 본문에 이미 고쳐 넣었다는 뜻이고, "잔여 위험"은 v1에서 완전히 막지 못해 운영·계약으로 보완하는 부분입니다.

### (a) 파트너가 region_codes를 바꿔 타 지역을 보는 경로

- **경로 점검:** ① `partner_region`에 직접 INSERT/UPDATE → 권한 없음(4.2) ② `partner_org_admin`의 `set_region` → operator 전용 ③ `update_org_contact` → 허용 필드 목록에 지역 없음 ④ `console_user.partner_id`를 바꿔 다른 조직으로 이동 → operator 전용 `move_member` ⑤ JWT `app_metadata.partner_id` 위조 → 서명 때문에 불가, 그리고 판정에 쓰지 않음(N1) ⑥ 호텔 등록 시 타 지역 region_code 입력 → `hotel_partner_register`가 `region_is_mine` 검사 ⑦ RFP의 region_code 변경 → `rfp_set_region` operator 전용.
- **추가로 확인한 점:** 지역을 늘려도 **RFP 열람은 배정 기준**(N5)이라 타 파트너에게 배정된 RFP는 보이지 않습니다. 지역이 영향을 주는 건 호텔 목록 범위뿐입니다.
- **영향:** 없음(차단됨). **수정:** 테스트 T-RLS-03~05 추가. **반영:** ✅

### (b) partner_member가 다른 파트너로 이동할 때의 JWT

- **문제:** JWT의 `app_metadata.partner_id`는 최대 1시간 옛 값입니다. JWT 기반 판정이었다면 옛 조직 데이터를 1시간 동안 볼 수 있습니다.
- **발견한 설계 결함:** 처음 초안은 "정지 후 새 조직에서 재초대"를 기본으로 했는데, `console_user.email` unique와 `auth.users` 이메일 유일성 때문에 **같은 이메일로는 재초대가 불가능**했습니다.
- **수정:** `move_member`를 유일한 공식 경로로 바꿈(8.2). DB 판정이라 이동 즉시 옛 조직 데이터 0행, `cv+1`로 콘솔이 세션 갱신, `signOut global`로 리프레시 토큰 폐기. 이미 받은 60초짜리 Storage 서명 URL은 만료까지 유효 — 허용 범위로 판단.
- **반영:** ✅(8.2 표, 4.6)

### (c) 확인 전 대리 견적을 파트너가 비교표에 넣는 경로

- **경로 점검:** ① 비교표 생성 RPC → `v_comparable_quote`만 사용 ② `comparison_item` 직접 INSERT → 파트너 권한 없음, 운영자 직접 INSERT도 트리거가 재검증(N29) ③ 대리 견적을 "호텔 직접 제출"로 위장 → `entered_by`는 RPC가 역할에서 결정, 클라이언트 값 무시 ④ 파트너가 자기 대리 견적을 스스로 확인 → 확인 토큰 원문은 호텔 등록 연락처로만 발송, 콘솔·응답에 없음(N9), 연락처는 인증된 이메일이어야 함(N13), 승인 호텔 연락처 변경은 HQ만(N27).
- **잔여 위험:** 호텔이 원래 비딩 링크(기존 토큰)를 파트너에게 전달한 경우, 파트너가 그 링크로 `submit_bid`를 하면 **호텔 직접 제출로 기록**됩니다. 이것은 파트너 도입 전에도 있던 "링크를 가진 사람 = 호텔" 가정의 한계입니다.
- **보완:** ① `submit_bid` 성공 시 호텔 등록 연락처로 접수 확인 메일(기존 호텔 접수 메일이 있으면 그대로, 없으면 추가) — 호텔이 모르는 제출을 알아챌 수 있게 ② 같은 초대에서 파트너 대리 입력 이력이 있고 24시간 안에 동일 금액의 "호텔 직접 제출"이 들어오면 플래그 `possible_proxy_as_hotel` + HQ 일일 요약.
- **반영:** ✅(보완 ②는 13.3 0013에 포함)

### (d) 확인 토큰 재사용·만료

- **점검:** 1회용(`confirm_token_used_at`), 72시간, 재발송·리마인드 시 새 토큰 + 이전 토큰 폐기, `quote_id` 불일치 시 `stale_quote`, 레이트리밋 10회/10분, 해시 인덱스 조회.
- **발견 1 — 메일 보안 스캐너:** 기업 메일 보안 장비가 링크를 미리 열어 봅니다. GET으로 토큰을 소모하면 호텔이 누르기 전에 "사용됨"이 됩니다. → **확인·이의는 POST에서만 소모**, GET(`get_bid`)은 조회만. 반영 ✅(8.2 quote_confirm)
- **발견 2 — Referer 누출:** `bid.html?t=` URL이 외부 리소스·GA4로 Referer에 실려 나갈 수 있습니다. → confirm 모드도 기존 토큰 페이지와 같이 `<meta name="referrer" content="no-referrer">`, GA4 비활성, noindex. 반영 ✅(14장 build 항목)
- **발견 3 — 리마인드가 원래 링크를 죽임:** 원문을 저장하지 않으므로 리마인드는 새 토큰입니다. 호텔이 첫 메일을 누르면 `confirm_revoked` 화면에서 "더 최근 링크를 {마스킹 이메일}로 보냈습니다"를 안내. 반영 ✅(5.4)
- **반영:** ✅

### (e) 인계 도중 파트너가 상태 전이

- **점검:** 모든 RFP 쓰기 RPC가 `rfp ... for update` 후 `delegation`을 검사하고, 인계 RPC도 같은 행을 잠급니다. 둘 중 나중 트랜잭션은 앞 트랜잭션 커밋 후 새 값을 보고 `rfp_taken_over` 또는 `stale_version`으로 실패합니다.
- **발견한 설계 결함:** 초대·견적 수준 RPC(대리 입력, 초대 재발송 등)는 초대 행만 잠그면 인계와 끼어들 수 있습니다.
- **수정:** **규칙 — 자식 테이블을 쓰는 모든 RPC는 먼저 부모 `rfp` 행을 `FOR UPDATE`로 잠근다.** 잠금 순서 `rfp → bid_invitation → bid_quote → settlement`로 고정(데드락 방지). Edge Function에서 RPC 커밋 뒤에 나가는 메일(확인 요청)은 인계 직전 커밋분이면 그대로 발송 — 호텔 확인은 인계 후에도 유효하므로 문제없음.
- **반영:** ✅(3.5 공통 가드 순서 2번에 포함, 13.5 동시성 테스트 T-CON-01)

### (f) 정산 금액 위조

- **점검:** ① 파트너 몫·MICEGO 몫·송금 예정액은 생성 컬럼 — 파트너가 입력 불가 ② 요율 방식이면 커미션도 서버 계산 ③ `partner_share_pct`는 스냅샷, 파트너 변경 경로 없음 ④ 커미션은 HQ 승인 필수, 제출자≠승인자 ⑤ 증빙 첨부 필수 ⑥ fx 이상치·송금 차이 플래그 ⑦ 입금 확인은 HQ만 ⑧ 모든 변경은 `settlement_event.diff`에 남음.
- **남는 핵심 위험:** 파트너가 **계약 금액 자체를 낮게** 입력(증빙도 맞춰 제출)하면 MICEGO 몫이 줄어듭니다. 시스템은 호텔–오거나이저 실제 계약을 볼 수 없습니다.
- **보완:** ① 계약 금액이 선정 견적 총액의 70% 미만이면 플래그 `contract_below_quote` + 사유 필수(6.3 S1) ② 분기별 표본 감사(HQ가 호텔에 직접 인보이스 확인) — 계약서 L7에 감사권 ③ v1.1 후보: 호텔에게 커미션 금액 확인 메일(`HTL_COMMISSION_CONFIRM`, 확인 토큰과 같은 구조)을 보내 호텔이 직접 확인.
- **반영:** ✅(①), 운영·계약(②), 다음 버전(③)

### (g) 호텔 승인 위임 남용 — 파트너가 가짜 호텔 등록 후 자기 견적

- **시나리오:** 파트너가 자기가 통제하는 도메인으로 그럴듯한 호텔을 등록 → 이메일 인증도 스스로 통과 → 지역 내 승인 → 대리 입력 → 스스로 확인 → 비교표에 실려 오거나이저가 선정.
- **1차 설계의 구멍:** 초안(N28 초판)은 HQ 미검토 호텔을 **커미션 승인 단계**에서만 막았습니다. 그때는 이미 오거나이저가 가짜 호텔을 보고 선정해 신원까지 넘어간 뒤입니다.
- **수정(사용자 확정 반영):** ① 전달 게이트는 두지 않음. 대신 전달 시 HQ에 건별 알림(`HQ_HOTEL_UNREVIEWED_DELIVERED`), 선정 시 `hotel_unreviewed_won` 개입 알림, 커미션 승인 전 HQ 검토 필수 ② 위험 플래그(`free_mail`, `domain_mismatch`, `email_matches_partner`)가 있으면 파트너 승인 불가, HQ만 ③ 대리 입력은 이메일 인증 호텔만(N13) ④ 대리 입력 증빙 메모 필수 ⑤ HQ 대시보드 "호텔 사후 검토" 위젯.
- **잔여 위험(확대됨):** 전달 게이트가 없으므로 가짜 호텔이 오거나이저에게 노출될 수 있고, 선정까지 가면 신원이 넘어갑니다. 완화: 전달 알림을 받은 HQ가 **오거나이저 선정 전**(SLA상 보통 수일)에 사후 검토를 마치는 것을 SOP 일일 트리아지 항목으로 고정, 검토 기준(웹사이트 존재, 지도·OTA 등록 확인, 대표 번호 통화)을 SOP에 넣습니다. 위험 플래그 호텔은 애초에 파트너 승인이 불가합니다.
- **반영:** ✅(N28 확정판, 5.2, 5.6, 9.5) — 게이트 없음은 사용자 결정

### (h) RFP가 두 지역에 걸칠 때

- **점검:** 매핑에서 여러 나라 → `hq_held(multi_region)`, 한 나라 여러 도시 → 국가 코드로 올려 국가 파트너 배정(N4, 3.2).
- **발견한 설계 결함:** 파트너가 초대할 수 있는 호텔 범위가 정의되지 않아, 배정된 파트너가 **자기 다른 지역**(예: TH-HKT RFP에 TH-BKK 호텔 — 이건 괜찮지만, 백업으로 가진 VN 호텔)을 초대할 수 있었습니다.
- **수정:** 초대 가드에 `region_is_mine(hotel.region_code) and region_covers(rfp.region_code, hotel.region_code)` 추가 — RFP 지역 안의 호텔만(5.6). 지역 밖 호텔은 HQ가 초대.
- **중간에 지역이 바뀌는 경우:** `rfp_set_region(p_reassign=true)`로 새 파트너에게 재배정되면, 이전 파트너가 보낸 초대·대리 견적은 유효하게 남고 정산은 won 시점 파트너에게 귀속. 분배가 필요하면 HQ가 `partner_share_override_pct`로 조정(v1은 두 파트너 분할 정산 없음).
- **반영:** ✅

### (i) 신원 열람 로그 우회

- **경로 점검과 조치:**

| 우회 경로 | 조치 | 반영 |
|---|---|---|
| PostgREST로 `rfp.contact_*` 직접 SELECT | 열 권한 회수(N14) → 권한 오류 | ✅ |
| `select=*` | 같은 이유로 오류(누출 없음). 콘솔 코드는 명시 컬럼으로 교체 | ✅(13.4) |
| `member` 임베드 | member RLS 0행 | ✅ |
| 알림 발송 내역의 수신 주소 | `rfp_notifications()` 마스킹(N30) | ✅ |
| 피드백의 회신 이메일 | feedback 파트너 0행 | ✅ |
| 공유·추적 토큰 테이블 | 파트너 0행 | ✅ |
| **Realtime 구독 페이로드** | Postgres Changes는 행 전체를 보낼 수 있고, 열 권한 적용 여부를 확신할 수 없음 → `rfp`를 realtime publication에서 빼거나 PG15 publication 열 목록으로 신원 컬럼 제외 | ✅(0017) |
| 감사 로그 before/after에 행 전체가 들어감 | audit_log 파트너 0행 | ✅ |
| 운영자가 RFP 타임라인 메모에 전화번호를 적음 | 파트너가 읽을 수 있음 → 운영 가이드("메모에 연락처 금지") + 메모 저장 시 이메일·전화 패턴 경고 | 운영 |
| 오거나이저에게 가는 메일에 파트너를 CC | dispatch에서 organizer 템플릿에 CC/BCC 금지 검사 | ✅(13.5 T-NOTI-02) |
| 여러 계정으로 나눠 대량 열람 | 계정별 30건/24시간 이상 알림, 조직 합계는 일일 요약 | ✅ |

### 추가로 찾은 문제

| # | 문제 | 영향 | 수정 | 반영 |
|---|---|---|---|---|
| X1 | `my_partner_id()`가 조직 상태를 보지 않아 **terminated 조직 계정이 계속 RFP를 읽음**(`is_partner()`만 조직 상태를 봤음) | 계약 종료 파트너의 데이터 접근 | `my_partner_id()`에 `po.status in ('active','suspended')` 조건. 조직 terminated 전환 시 소속 계정 전부 `disabled` + signOut | ✅(4.1, 8.2 set_status) |
| X2 | 뷰가 기본(definer) 권한이면 RLS 우회 | 파트너가 전체 데이터 조회 | 모든 뷰 `security_invoker = true`, 기존 뷰 전수 점검 | ✅(4.3, 0017) |
| X3 | `rfp` INSERT 시 `delegation` 기본값 `hq_held` + `hold_reason` null → **CHECK 위반으로 접수 자체 실패** | 오픈 즉시 모든 견적 요청 실패 | `hold_reason default 'pending'` | ✅(2.7) |
| X4 | 자동 배정 트리거가 예외를 던지면 접수 실패 | 같음 | 트리거 본문 예외 처리 → hold('manual') | ✅(3.4) |
| X5 | `revoke execute on all functions … from public`이 기존 anon RPC(선정 OTP 등)를 끊음 | 공개 사이트 기능 중단 | 0017에서 기존 anon 함수 목록을 다시 grant, verify_api에 스모크 추가 | ✅(13.4) |
| X6 | 생성 컬럼이 다른 생성 컬럼을 참조 → 마이그레이션 오류 | 0015 적용 실패 | 식을 펼쳐 씀 | ✅(2.12) |
| X7 | `alter type … add value`를 같은 트랜잭션에서 사용 → 오류 | 0013 적용 실패 | 값 추가만 별도 파일(0012) | ✅(13.1) |
| X8 | 자동 배정을 끌 방법이 없음(파트너 사고 시) | 문제 파트너에게 계속 배정 | `app_setting.partner_auto_assign_enabled` 킬 스위치 + 조직 `accepting_new` | ✅(3.4) |
| X9 | SLA가 KST라 태국 파트너가 기한을 1~2시간 착각 | SLA 초과 | 파트너 화면·메일에 "KST {시각}(방콕 {시각})" 병기 | ✅(N26, 9.2) |
| X10 | partner_admin이 자기 조직의 마지막 관리자를 정지 | 조직 운영 불가 | 마지막 active partner_admin은 operator만 정지 | ✅(8.2 revoke) |

---

## 13. 마이그레이션 계획

### 13.1 파일 목록

| 파일 | 내용 |
|---|---|
| `0010_partner_core.sql` | enum(console_role, console_user_status, partner_org_status, rfp_delegation, quote_entered_by, hotel_approved_via), `ccy_minor`/`ccy_round`, `region`·`region_alias`(+3.1 seed), `region_normalize`/`region_resolve`/`region_covers`, `partner_org`, `partner_region`, `console_user`, **기존 운영자 백필**, 헬퍼 함수(is_operator 교체 포함), `console_whoami`, `console_accept_invite`, `console_settings`, `private.require_console`, `private.audit` |
| `0011_rfp_delegation.sql` | rfp 컬럼·CHECK·인덱스, **기존 RFP 백필**, `rfp_assignment_event`, `rfp_sla_due`, `private.rfp_auto_assign` + AFTER INSERT 트리거, `rfp_set_region`/`rfp_assign`/`rfp_hold`/`rfp_decline_assignment`/`rfp_request_takeover`/`rfp_takeover`/`rfp_release`, `rfp_list`, 기존 전이 RPC의 권한 검사를 `assert_rfp_write`로 교체, `app_setting` 키 추가(partner_auto_assign_enabled=false로 시작, collect_due_days=30, remit_due_days=14, proxy_confirm_hours=72, commission_rate_range, remit_fee_tolerance, free_mail_domains, supported_currencies, ops_email) |
| `0012_invitation_status_values.sql` | `alter type … add value` 4개만(단독 파일) |
| `0013_quote_proxy.sql` | bid_invitation·bid_quote 컬럼, 불변 트리거, `v_comparable_quote`, `comparison_item` 검증 트리거, 전달 RPC 가드(N28), `quote_proxy_enter_tx`/`quote_proxy_resend_tx`/`quote_proxy_mark_send_failed`/`quote_confirm_tx`, 기존 초대 RPC 가드(5.6), `submit_bid`/`decline_bid` SQL 쪽 변경, `possible_proxy_as_hotel` 플래그, hotel_partner 컬럼 + **호텔 백필** + `hotel_partner_register`/`review`/`update_contact`, `feedback_resolve_rfp` 확인 토큰 매칭 |
| `0014_identity_audit.sql` | `identity_view_log`(+추가 전용 트리거), audit_log 확장, `rfp_get_identity`, `rfp_notifications` |
| `0015_settlement.sql` | 정산 enum·테이블·생성 컬럼, won 트리거, `settlement_advance`, `settlement_comment`, `settlement_close_period`/`reopen_period`, `v_settlement_monthly`, `v_settlement_aging`, Storage 버킷 `quote-evidence`·`settlement-evidence` + 정책 |
| `0016_intervention.sql` | intervention enum·테이블, `private.intervention_scan`, `intervention_snooze`/`intervention_dismiss` RPC |
| `0017_rls_partner.sql` | GRANT/REVOKE 정리(4.2), 모든 정책 재작성(4.3), 기존 anon 함수 재grant(X5), 기존 뷰 `security_invoker` 전환(X2), realtime publication에서 rfp 신원 컬럼 제외(i) |
| `0018_partner_cron.sql` | `mgpt-intervention-scan`(*/15), `mgpt-proxy-expire`(*/15), `mgpt-confirm-remind`(매시 5분, Edge 호출), `mgpt-daily-digest`(`0 0 * * *` = KST 09:00), `mgpt-identity-anomaly`(매시 20분), `mgpt-identity-purge`(매월 3일 KST 03:30, 3년 경과), `mgpt-evidence-purge`(매월, 5년 경과) — 기존 0007/0009처럼 pg_cron 없으면 조용히 스킵 |
| `0019_notification_templates_partner.sql` | 템플릿 메타 37건(PTR 21·HQ 13·HTL 3) |
| `0020_identity_column_revoke.sql` | `revoke select (contact_*) on rfp` — **콘솔 배포 뒤에 적용**(13.3 Phase 2) |

### 13.2 기존 데이터 마이그레이션

```sql
-- 운영자 백필(0010)
insert into public.console_user (user_id, role, status, email, display_name, accepted_at, invited_at)
select u.id, 'operator', 'active', u.email,
       coalesce(u.raw_user_meta_data->>'name', split_part(u.email,'@',1)), now(), u.created_at
from auth.users u
where u.raw_app_meta_data->>'role' = 'operator'
on conflict (user_id) do nothing;
-- 이메일 없는 운영자 계정이 있으면 마이그레이션을 실패시켜 수동 처리(raise exception)

-- 기존 RFP(0011): 전부 본사 보류, 지역만 채움
alter table public.rfp disable trigger user;          -- 백필 중 updated_at·이벤트 트리거 방지(자동 배정 트리거는 INSERT용이라 무관)
update public.rfp r set
  region_code   = (public.region_resolve(r.destination_country, r.destination_city)).code,
  region_source = 'auto',
  region_input  = concat_ws(' / ', r.destination_country, r.destination_city),
  delegation    = 'hq_held',
  hold_reason   = 'legacy';
alter table public.rfp enable trigger user;
-- CHECK(rfp_delegation_shape)는 백필 뒤 validate: alter table … add constraint … not valid; → validate constraint

-- 기존 견적: entered_by 기본값 'hotel'로 자동 충족. 추가 조치 없음.

-- 기존 호텔(0013)
update public.hotel_partner h set
  region_code = (public.region_resolve(h.country, h.city)).code,        -- 실제 컬럼명 치환
  approved_via = case when h.status = 'approved' then 'hq' end,
  approved_at  = coalesce(h.approved_at, h.updated_at),                  -- 기존 컬럼이 있으면 그대로
  hq_reviewed_at = case when h.status = 'approved' then coalesce(h.approved_at, h.updated_at) end,
  contact_email_verified_at = case when h.status = 'approved' and h.contact_email is not null
                                   then coalesce(h.approved_at, h.updated_at) end;
-- region_code가 null로 남은 호텔 목록을 마이그레이션 NOTICE로 출력 → 운영자가 콘솔에서 지정
```

기존 운영 중 RFP는 모두 `hq_held(legacy)`라서 파트너에게 보이지 않습니다. 파트너에게 넘기고 싶은 진행 건은 HQ가 하나씩 `rfp_assign`합니다(대량 배정 기능은 만들지 않음 — 오픈 전이라 건수가 적음).

### 13.3 롤아웃 순서

| Phase | 내용 | 확인 |
|---|---|---|
| 0. 준비 | DB 백업(`pg_dump`), 기존 콘솔 코드에서 `rfp` `select=*`·직접 UPDATE·`app_metadata.role` 사용처 목록화(13.4) | 목록 완료 |
| 1. DB + RLS | 0010 → 0019 적용(0020 제외). `partner_auto_assign_enabled=false`, 파트너 조직 0개 상태 | 운영자로 기존 콘솔 전체 스모크(목록·상세·전이·회원·피드백·설정), 공개 사이트 접수·트래킹·선정 OTP·호텔 비딩 스모크, `supabase/tests/run.sh` 0 FAILS |
| 2. 함수 + 화면 | Edge Function 6개 신규 배포, 기존 함수 수정분 배포, 콘솔(역할 NAV·신규 화면), bid.html 확인 상태 빌드 배포 → **그 다음 0020 적용** | verify_* 전부 0 FAILS, 운영자 콘솔에서 신원 카드가 RPC로 열리고 로그가 쌓이는지 |
| 3. 파트너 온보딩 | Tmthai 조직 생성(onboarding) → 지역 TH 등록(주) → 파트너 계약·DPA 체결일 입력 → active → partner_admin 초대 → 수락 확인. `accepting_new=false`로 두고 HQ가 첫 2~3건을 수동 배정(섀도 운영) | 파트너 계정으로 타 지역 RFP·회원·설정·피드백 0행 확인(수동 점검표), 대리 입력 → 호텔 확인 실메일 1회 |
| 4. 자동 배정 켜기 | `accepting_new=true`, `partner_auto_assign_enabled=true` | 첫 1주 매일 HQ 일일 요약 검토 |
| 롤백 | 킬 스위치 off → 파트너 조직 `suspended`(쓰기 즉시 차단, 열람 유지) → 필요 시 계정 disabled. 스키마 롤백은 하지 않음(추가 컬럼·테이블은 운영자 흐름에 영향 없음) | — |

### 13.4 기존 코드 점검 목록(Phase 0)

1. `admin/*.js`, `data-adapter.js`에서 `from('rfp').select('*')` 또는 `select=*` → 명시 컬럼 + 신원은 `rfp_get_identity`.
2. 콘솔의 테이블 직접 쓰기(`.update(`, `.insert(`, `.delete(`) → 파트너가 쓰는 경로면 RPC로, 운영자 전용이면 해당 컬럼 grant + operator 정책 유지.
3. `app_metadata` / `'operator'` 문자열 비교 → `console_whoami()` 결과 사용.
4. anon이 EXECUTE하는 기존 함수 목록(`pick_*`, 접수 RPC 등) → 0017에서 재grant.
5. 기존 뷰 목록 → `security_invoker` 전환.
6. realtime publication에 포함된 테이블 목록.
7. 기존 초대 상태 값의 실제 이름(`submitted` 등)과 이 문서의 가정 이름 대응표 작성.

### 13.5 verify 테스트 추가 항목

**SQL(`supabase/tests/`, 역할별 JWT를 `set local request.jwt.claims`로 흉내):**

| ID | 검증 |
|---|---|
| T-RLS-01 | partner_admin(TMTHAI)이 `rfp` 조회 시 자기 조직 delegated·taken_over만, hq_held·타 조직 0행 |
| T-RLS-02 | 백업 파트너(VN 백업)는 주 파트너 RFP 0행 |
| T-RLS-03 | 파트너 `partner_region` INSERT/UPDATE → 권한 오류 |
| T-RLS-04 | 파트너 `member`, `feedback`, `app_setting`, `audit_log`, `rfp_access_token`, `rfp_share_link`, `notification_outbox` → 0행 또는 권한 오류 |
| T-RLS-05 | 파트너 `hotel_partner` → 자기 지역 + 자기 소싱만 |
| T-RLS-06 | 파트너 `rfp` `select contact_email` → 권한 오류(0020 이후) |
| T-RLS-07 | 파트너 `settlement` → 자기 조직만, 타 조직 0행 |
| T-RLS-08 | 조직 terminated → 모든 파트너 정책 0행(X1) |
| T-RLS-09 | `console_user.status='disabled'` 직후 같은 JWT로 0행(JWT 지연 무관) |
| T-RLS-10 | 모든 public 뷰가 `security_invoker`(pg_class.reloptions 검사) |
| T-ASN-01 | 목적지 "다낭" → VN-DAD, 파트너 없음 → hq_held(no_partner) |
| T-ASN-02 | "방콕" → TH-BKK → TH 주 파트너(TMTHAI) 배정 |
| T-ASN-03 | "다낭, 방콕" → hq_held(multi_region) |
| T-ASN-04 | "호이안, 다낭" → VN-DAD(high) / "다낭, 나트랑" → VN(medium) |
| T-ASN-05 | 주 파트너 suspended → 백업 배정, 백업도 없으면 partner_ineligible |
| T-ASN-06 | 킬 스위치 off → auto_assign_off |
| T-ASN-07 | 자동 배정 함수 내부 오류 강제 → 접수 성공 + hold(manual)(X4) |
| T-ASN-08 | rfp INSERT 기본값만으로 CHECK 통과(X3) |
| T-WR-01 | 파트너가 taken_over RFP 전이 → `rfp_taken_over` |
| T-WR-02 | 파트너 지역 제거 후 → `region_revoked` |
| T-WR-03 | operator가 delegated RFP 전이 → 성공 + audit `hq_override=true` + PTR_HQ_ACTION outbox |
| T-WR-04 | `p_expected_version` 불일치 → `stale_version` |
| T-CON-01 | 두 세션: 파트너 대리 입력 트랜잭션 진행 중 takeover → 한쪽만 성공, 대리 입력이 나중이면 `rfp_taken_over` |
| T-PRX-01 | 대리 입력 → 비교 가능 뷰에 없음 → 확인 후 있음 |
| T-PRX-02 | `comparison_item`에 미확인 대리 견적 직접 INSERT(운영자) → `quote_not_comparable` |
| T-PRX-03 | `bid_quote` 금액 UPDATE(운영자 포함) → `quote_immutable` |
| T-PRX-04 | 확인 토큰 2회 사용 → 두 번째 `used`, 만료 → `expired`, 재발송 후 옛 토큰 → `invalid_token`(폐기) |
| T-PRX-05 | 호텔 미인증 이메일 → 대리 입력 거부 |
| T-PRX-06 | 파트너 대리 입력 4회째 → 거부 |
| T-PRX-07 | 확인 토큰으로 `submit_bid` → entered_by=hotel, 대리 견적 superseded |
| T-PRX-08 | HQ 미검토 파트너 승인 호텔 포함 전달 → 전달 성공 + `HQ_HOTEL_UNREVIEWED_DELIVERED` 알림 1건 |
| T-PRX-09 | 타 지역 호텔 초대 → 거부(h) |
| T-HTL-01 | 파트너 승인: 위험 플래그 호텔 거부, 타 지역 거부, member 역할 거부 |
| T-ID-01 | `rfp_get_identity` 호출마다 로그(10분 내 재열람은 1건), `reveal_phone`은 매번 |
| T-ID-02 | `rfp_notifications`가 파트너에게 오거나이저 주소 마스킹 |
| T-ID-03 | 탈퇴 회원 RFP의 `rfp_get_identity` → 빈 값(L11) |
| T-ST-01 | won 전이 → 정산 1건 생성, 두 번 전이해도 1건(멱등) |
| T-ST-02 | 70% 반올림: THB 240,000.00 → 168,000.00 / 72,000.00, VND 12,345,679 → 8,641,975 / 3,703,704 (합 일치) |
| T-ST-03 | 요율 방식에서 클라이언트 commission_amount 무시 |
| T-ST-04 | 제출자=승인자 → 거부, hotel_unreviewed → 승인 거부 |
| T-ST-05 | HQ 단독 건 collected → completed 허용, 파트너 건은 거부 |
| T-ST-06 | 마감 월의 completed 정산 변경 → `period_closed` |
| T-ST-07 | 같은 통화 fx≠1 → CHECK 위반 |
| T-INT-01 | 스캔 2회 실행해도 alert 1행, 조건 해소 시 auto_cleared |
| T-NOTI-01 | 신규 템플릿 37건 메타 존재, audience·lang 정합 |
| T-NOTI-02 | organizer audience 템플릿에 CC/BCC 없음 |
| T-API-01 | 기존 anon 함수(접수·트래킹·선정 OTP·비딩) 권한 유지(X5) |

**Python(정적·mock):**

| 스크립트 | 검증 |
|---|---|
| `verify_admin_partner.py`(신규) | 역할 3종 × 페이지 전체: NAV 항목 표(9.1)와 일치, 금지 페이지 guardPage 리다이렉트, 파트너 mock에서 회원·피드백·설정 데이터 0건, 신규 페이지 5개 존재·상태 전환(`?state=`) 동작, 파트너 화면에 "비딩 링크 복사" 없음, 인계 RFP에서 모든 입력 disabled, 신원 카드 기본 가림, 정산 단계 표시줄 8상태 렌더링 |
| `verify_admin.py`·`verify_admin_ops.py` | 운영자 기존 기대값 유지 + 배정 패널·인계 버튼 존재 |
| `verify2.py`(hotel en 페이지) | bid.html 확인 상태 6종(confirm, confirmed, disputed, revised, confirm_expired, confirm_revoked) 렌더링, `no-referrer`·noindex·GA4 비활성 |
| `verify_api.py` | `get_bid` 응답 스키마에 `mode`, `proxy_quote`; 파트너 식별자·원문 토큰 미포함 |
| `verify_launch.py` | 알림 라이브러리 총계 66, 신규 이메일 파일 존재, 템플릿 ID 목록과 seed 일치 |

---

## 14. 구현 파일 목록

### 14.1 DB (`supabase/migrations/`)

| 파일 | 책임 |
|---|---|
| `0010_partner_core.sql` | 지역·파트너 조직·콘솔 계정 모델과 권한 헬퍼의 기반, 운영자 백필 |
| `0011_rfp_delegation.sql` | RFP 위임 상태·자동 배정·배정/인계 RPC·서버 SLA 계산 |
| `0012_invitation_status_values.sql` | 초대 상태 enum 값 4개 추가(단독 트랜잭션) |
| `0013_quote_proxy.sql` | 대리 입력·호텔 확인·견적 불변·비교 가능 판정·호텔 지역/승인 위임 |
| `0014_identity_audit.sql` | 신원 열람 RPC와 로그, 감사 로그 확장, 파트너용 발송 내역 RPC |
| `0015_settlement.sql` | 정산 테이블·상태 머신 RPC·월 마감·증빙 버킷 |
| `0016_intervention.sql` | 개입 필요 감지와 알림 중복 방지 |
| `0017_rls_partner.sql` | 권한·RLS 정책 전면 재작성, 뷰·realtime 보안 정리 |
| `0018_partner_cron.sql` | 파트너 관련 주기 작업 등록 |
| `0019_notification_templates_partner.sql` | 신규 알림 37종 메타 seed |
| `0020_identity_column_revoke.sql` | 오거나이저 신원 열 권한 회수(콘솔 배포 후) |
| `seed.sql`(수정) | region·alias seed 참조, 신규 app_setting 기본값 |
| `seed_demo.sql`(수정) | Tmthai 등 데모 조직·계정·정산 데이터(9.9와 같은 내용) |

### 14.2 Edge Functions (`supabase/functions/`)

| 파일 | 책임 |
|---|---|
| `_shared/authz.ts`(신규) | JWT 검증 → console_user 조회 → 역할 확인 → 사용자 JWT 클라이언트 생성 |
| `_shared/tokens.ts`(신규 또는 기존 확장) | 32바이트 base64url 토큰 생성, SHA-256 hex, 형식 검증 |
| `_shared/errors.ts`(기존 확장) | RPC 예외 코드 → 한국어 메시지·HTTP 상태 매핑(신규 코드 8개) |
| `partner_invite/index.ts` | 콘솔 계정 초대·재발송·정지(운영자·파트너 공통) |
| `partner_org_admin/index.ts` | 파트너 조직·지역·계정 역할·이동·별칭 관리 |
| `rfp_assign/index.ts` | 배정·재배정·보류·인계·되돌리기·반려·인계 요청·지역 수정 |
| `quote_proxy_enter/index.ts` | 증빙 업로드 URL, 대리 입력, 확인 메일 발송·재발송·리마인드(크론) |
| `quote_confirm/index.ts` | 호텔 확인·이의(verify_jwt=false, 토큰 검증, 레이트리밋) |
| `settlement_action/index.ts` | 정산 전이, 증빙 업로드·다운로드 서명 URL |
| `get_bid/index.ts`(수정) | 확인 토큰 조회, 확인 모드·대리 견적 요약 반환 |
| `submit_bid/index.ts`(수정) | 확인 토큰 제출 허용, 대리 견적 대체, 접수 확인 메일 |
| `decline_bid/index.ts`(수정) | 대리 입력 상태에서 거절 처리 |
| `admin_member_action/index.ts`(수정) | operator 전용 권한 검사로 교체 |
| 그 밖의 admin용 함수(수정) | `app_metadata` 비교 제거, `requireConsole` 사용 |
| `dispatch_notifications/index.ts`(수정) | partner·hq audience 수신자 해석, 신규 템플릿 렌더링, organizer CC 금지 |
| `supabase/config.toml`(수정) | `quote_confirm` verify_jwt=false, 나머지 신규 함수 true |

### 14.3 콘솔 (`admin/`)

| 파일 | 책임 |
|---|---|
| `admin.js`(수정) | whoami 부트스트랩, 역할별 NAV·페이지 가드, 공통 오류 처리, 데모 역할 전환, SLA 표시를 서버 값으로 |
| `data-adapter.js`(수정) | 신규 RPC·Edge 호출, mock 모드 RLS 흉내 필터 |
| `mock-data.js`(수정) | 9.9 mock 데이터 |
| `index.html`(수정) | HQ/파트너 대시보드 위젯 |
| `rfps.html`(수정) | 지역·파트너·위임 필터와 컬럼 |
| `rfp.html`(수정) | 배정 패널, 인계·되돌리기, 신원 카드·열람 로그, 대리 입력 모달, HQ 직접 조치 확인, 발송 내역 RPC |
| `partners.html`, `partner.html`(수정) | 지역·출처·승인 경로, 파트너 승인, HQ 사후 검토·취소, 호텔 등록 |
| `settlements.html`(신규) | 정산 목록·요약·월 마감 탭 |
| `settlement.html`(신규) | 정산 상세·단계별 입력·분쟁 |
| `orgs.html`(신규) | 지역 파트너 조직 목록, 지역 코드·별칭 관리, 본사 계정 탭 |
| `org.html`(신규) | 조직 상세(기본·지역·계정·성과/로그) |
| `my-org.html`(신규) | 파트너용 내 조직·담당자 |
| `accept.html`(신규) | 초대 수락·비밀번호 설정 |
| `login.html`(수정) | 콘솔 권한 없는 계정 차단 문구 |
| `admin.css`(수정) | 위임 배지, 단계 표시줄, 읽기 전용 배너, 역할 배지 |

### 14.4 공개 사이트·문서·테스트

| 파일 | 책임 |
|---|---|
| `build.py`/`build2.py`의 bid 페이지 생성부(수정) | bid.html 확인 상태 6종, no-referrer·noindex·GA4 비활성 유지 |
| `ko/index.html` 폼 고지(수정, 생성기) | 지역 파트너 열람 고지(L4, TODO(legal)) |
| `ko/terms.html`·처리방침·`en` 호텔 약관(수정) | 위탁·국외 이전·대리 입력 조항(L2·L3·L8) |
| `emails/ptr_*.html`, `emails/hq_*.html`, `emails/htl_confirm*.html`, `emails/htl_email_verify.html`(신규) | 신규 이메일 36종 본문(PTR_INVITE는 Supabase 템플릿) |
| `build_notify.py`(수정) | 알림 라이브러리에 파트너·본사 섹션, 총계 66 |
| `docs/state-transitions.html`(수정, v1.8) | 초대 proxy 상태·위임 상태·정산 상태 머신·주체 열 변경 |
| `build_sitemap.py`(수정) | 신규 콘솔 페이지 5개, 오픈 전 점검에 파트너 항목 |
| `supabase/tests/partner_*.sql`(신규) | 13.5 SQL 테스트 |
| `verify_admin_partner.py`(신규) | 역할별 콘솔 정적·mock 검증 |
| `verify2.py`, `verify_api.py`, `verify_launch.py`, `verify_admin*.py`(수정) | 13.5 추가 항목 |
| `supabase/README.md`(수정) | 신규 마이그레이션·함수·환경변수(`CONSOLE_URL`)·크론·롤아웃 Phase |

---

*이 설계서의 N1~N31은 확정 결정 1~13 위에 새로 정한 것입니다. N28은 2026-09-27 사용자가 "전달 전 HQ 검토 게이트 없음"으로 확정했습니다. N9(별도 확인 토큰), N16(HQ 직접 조치 허용), N20(인계 시 몫 조정), N21(송금 기한 14일)은 설계 기본값으로 진행하며 파트너 계약서 확정 시 값을 조정합니다.*
