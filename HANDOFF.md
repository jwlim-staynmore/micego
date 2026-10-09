# MICEGO 개발자 핸드오프 v2 - 클로드

기준일 2026-10-06 · 작성 계정 jwlim@staynmore.com · 대상: 코드를 인수해 **배포·유지보수·미결 기능 개발**을 맡는 개발자(D-27, 재작성 없음). 이 문서 하나로 첫 주 안에 로컬 빌드·테스트·배포까지 갈 수 있게 썼다. v1(2026-09-27)은 git 이관·지역 파트너 콘솔·호텔 커미션이 반영되기 전 기준이라 v2로 대체한다.

---

## 0. 먼저 읽을 것

- **원본은 GitHub 비공개 저장소 `jwlim-staynmore/micego`** 다. 저장소 루트 = 예전 PC 폴더의 `micego-site/`. 사업·운영 자료는 `knowledge/`(배포 제외).
- **브랜치 2개**: `main`(2026-09-28 이관 시점) · `feat/hotel-commission-rate`(호텔 커미션, 2026-09-29~). **이 문서와 함께 받는 프론트엔드 zip은 커미션 브랜치 기준**이다. `main` 병합은 대표 승인 대기 — 인수 첫날 병합 여부부터 확인한다.
- ~~저장소에 없는 작업 1건(Turnstile·대리 확정 동의 기록)~~ → 2026-10-07 재구현(K-13 종결): `0019_selection_consent.sql`, `0020_organizer_cancel.sql`, `_shared/turnstile.ts`, Edge `cancel_rfp`. 결정은 D-47~D-50.
- 클로드 Code로 작업할 때의 규칙은 `CLAUDE.md`에 있다(생성물 편집 금지, 브랜치 분리 등). 사람 개발자에게도 그대로 적용된다.

## 1. 서비스 한 장 요약

- **무엇**: 한국 요청자(여행사·랜드사·기업)가 확정 일정의 해외 MICE 행사 요건(RFP)을 등록 → MICEGO가 회사명·예산을 뺀 요청서를 해외 파트너 호텔에 토큰 링크로 보냄 → 호텔이 견적 제출 → 운영자(또는 지역 파트너)가 비교표로 전달 → 요청자가 휴대전화 OTP로 제안 선정 → 선정 호텔에만 신원 공개(성사) → 정산.
- **누가**: 운영 주체 **MatchGo(매치고)** 단독(약관 당사자). STAYNMORE·트래블멤버스는 코드와 고객 대상 문서에 등장하지 않는다. 지역 운영 파트너(첫 후보 태국 Tmthai)가 **같은 운영 콘솔을 직접 쓴다** — 구현 완료(0010~0016).
- **수익**: **호텔이 내는 성사 커미션**. 요율은 호텔별로 승인 때 합의(지역 파트너는 5~20% 안, 범위 밖은 본사), 기준은 객실+연회·F&B 계약 금액의 순액(세금·봉사료 제외). 호텔이 링크로 동의해야 초대가 나간다. 요청자는 수수료 없음·요율 비공개. 파트너 건은 파트너 70 : 매치고 30(D-37~D-43).
- **고객 공개 정책 6종**(랜딩 게시): 주최 측 수수료 없음 / 해외 호텔만 / 영업일 3일 이내 회신 / 회사명·예산 호텔 비공개 / 최소 규모 없음 / 확정 일정만 접수.
- **사용자 4종과 진입점**: 요청자(`ko/`, 회원 선택·비회원 가능) · 호텔(`en/`, 로그인 없음, 토큰 링크 `en/bid.html?t=`·`en/confirm.html?t=`·`en/commission.html?t=`) · 본사 운영자 · 지역 파트너(둘 다 `admin/`, Supabase Auth + `console_user` 테이블, 콘솔에서 이메일 초대).

## 2. 아키텍처

```
[브라우저]  ko/·en/ 정적 HTML (Plain ES5)          admin/ 콘솔 (Plain ES5)
              │ assets/mg.js                          │ admin/data-adapter.js (MGA)
              │  ├─ MG.mode='api'  → Edge Functions   │  ├─ mode='api'  → PostgREST RPC(admin_*, console_*, settlement_*)
              │  └─ MG.mode='mailto'(설정 없음)        │  └─ mode='mock' → mock-data.js (+partner.js enrich, ?as=partner)
              ▼                                       ▼
[Supabase]  Edge Functions 31개 (Deno) ──SUPABASE_DB_URL 직접접속──▶ Postgres: private.* 함수(상태머신·OTP·enqueue·정산)
            PostgREST /rest/v1/rpc/*  ──사용자 JWT──▶ public.* RPC (RLS·역할 스코프)
            pg_cron: 알림 디스패치(매분) · system_tick(10분) · 피드백 4종 · 개입 스윕
            dispatch_notifications ──▶ Resend(이메일) · Solapi(SMS/알림톡) · Aligo(폴백)
[호스팅]    Vercel (정적, 빌드 없음 — 생성물이 저장소에 커밋돼 있음. vercel.json = 보안 헤더·CSP 정본)
```

핵심 원칙(`SPEC_LAUNCH.md §0`): (1) GoTrue Admin API가 필요한 작업은 Edge Function 경유. (2) 프론트는 빌드 산출물이며 `site.config.json` 하나로 데모↔운영 전환. (3) 회원 생성은 `signup_start`만(`enable_signup=false`). (4) OTP·재설정·확인 토큰처럼 비밀 코드는 원문을 DB에 저장하지 않는다(sha256만).

## 3. 리포지토리 지도와 규모

git 추적 434개 파일. Python 약 17k줄(생성기·검증) · TypeScript 약 6.1k줄(Edge, 생성물 `templates.gen.ts` 제외) · SQL 약 7.3k줄 · JS 약 4k줄(프론트·콘솔). 페이지: 공개 여행사 13 · 호텔 10 · 콘솔 16 · 허브·404. 폴더 구조는 `README.md`·`CLAUDE.md`.

**생성물 vs 원본** — 가장 자주 하는 실수:
- 생성물(손대지 말 것): `ko/*`, `en/*`, `index.html`, `404.html`, `sitemap.xml`, `robots.txt`, `assets/config.js`, `_headers`, `vercel.json`, `emails/*`, `docs/notification-*`, `docs/sitemap.*`, `supabase/functions/_shared/templates.gen.ts`.
- 원본: `build*.py`(`build_legal`·`build_confirm`·`build_commission`·`build_launch`는 `build2.py`가 이어서 실행), `legal_render.py`, `src/*.html`(디자인 원천), **`legal/*.json`(약관·방침 전문)**, `site.config.json`, `assets/mg.js`, `assets/feedback.js`, `admin/*`, `supabase/**`(templates.gen.ts 제외), `docs/state-transitions.html`·`docs/{launch-checklist,incident-runbook,operator-onboarding}.md`.
- 빌드하면 `<meta name="micego-build">` 날짜가 바뀌어 ko/en 전체가 diff에 잡힌다. 기능 변경이 없으면 커밋하지 않는다.

## 4. 스펙·설계 인덱스 — 코드 주석의 `§`가 가리키는 곳

| 파일 | 내용 |
|---|---|
| `SPEC_LAUNCH.md` | DB(§2) · Edge API·오류 카탈로그·뷰모델(§3) · 알림/OTP(§4) · mg.js(§5) · 콘솔 어댑터(§6) · 검증(§8) · 배포·시크릿(§10). 원본 유실 후 코드에서 역추출한 v1.0(D-31) — **다르면 구현이 맞다** |
| `SPEC_ACCOUNTS.md` | 회원제 화면·규칙(A1~A11), 콘솔(B), ACC_* 알림(C) |
| `SPEC_FEEDBACK.md` + `_ADDENDUM.md` | 피드백(VOC) 시스템 설계·구현 확정 |
| `docs/partner-console-impl-v1.md` | 지역 파트너 콘솔(0010~0016) 구현 노트 + 0017 추가분. 설계서 원문은 `knowledge/project-docs/micego-지역파트너-콘솔-기술설계서-v1 - 클로드.md` |
| `docs/hotel-commission-design-v1 - 클로드.md` | 호텔 커미션(0017) 설계 |
| `docs/state-transitions.html` v1.9 | RFP·초대(대리 입력)·파트너·커미션 합의·회원·공유링크·피드백·요청 위임·정산 상태 머신 + 알림 ID(v1.8은 이 저장소에 없는 작업이라 건너뜀) |
| `legal/*.json` + `legal/REVIEW_NOTES.md` | 이용약관·Partner Terms·개인정보처리방침·Privacy Notice 전문과 **법무 검토 표시 36곳** |
| `DECISIONS.md` | 확정 결정 D-1~D-43, 미결 O-1~O-6 |

## 5. 백엔드 요약

- **마이그레이션 18개**(0001~0018): 0001 확장·enum → 0002 기본 테이블 → 0003 private 함수(rfp_transition·due·enqueue·pick_and_win·system_tick) → 0004 회원 RPC → 0005 운영자 RPC·알림 메타 → 0006 RLS → 0007 크론 → 0008·0009 피드백 → **0010~0016 지역 파트너 콘솔**(지역·파트너 조직·콘솔 계정·위임·대리 입력·정산·초대 수락·콘솔 알림) → **0017 호텔 커미션**(요율·동의 토큰·이력, 초대/정산 스냅샷, 초대 차단) → **0018 소속 유형 5종·지원 통화(TWD·HKD)·견적 통화 트리거**. `create table` 41개.
- **0017 주의**: `partners` 테이블이 **열 단위 SELECT 권한**으로 바뀌었다. 새 컬럼을 추가하면 같은 마이그레이션에서 `grant select (컬럼) on partners to authenticated`를 넣어야 콘솔에 보인다(동의 토큰 해시·IP 해시는 일부러 제외). `admin_partner_transition`은 인자 시그니처가 바뀌어 drop 후 재생성했다.
- **Edge Function 32개** — RFP/비딩·회원/인증·콘솔·문의/구독·알림·파트너 등록·공유링크·피드백·`partner_invite`·`quote_confirm`·`partner_commission_accept`·`cancel_rfp`. 각 `handle.ts` 첫 주석에 인증·요청·응답 형식. 오류는 `_shared/errors.ts`(`MG:CODE`), 프론트 `mg.js`와 콘솔 `admin.js`가 미러.
- **알림**: 이메일 32종(`emails/`) · 알림톡 9 · SMS 2. 문안은 `build_notify.py`에서 고치고 `sync_templates.py`까지 다시 돌린다. 콘솔 내부 알림 PTR_*/HQ_*는 `CONSOLE_NOTICE` 한 장으로 라우팅.
- **토큰 페이지 3종**: `bid`(견적 제출) · `confirm`(대리 입력 견적 확인) · `commission`(요율 동의). 모두 GET은 조회만, POST로만 소비(메일 보안 스캐너 대비), 원문은 메일에만.
- **테스트**: `supabase/tests/run.sh` — pglast 구문검사 → PostgreSQL 16에 마이그레이션·시드·SQL 테스트 8종 → `admin_snapshot` 키 대조 → Deno check + 단위 테스트(97개). **2026-10-06 PASS=14 FAIL=0.** Deno가 없으면 타입체크·단위 테스트가 안 돈다 — 반드시 설치(`npm i -g deno`). psql이 `postgres` 사용자로 파일을 읽으므로 홈 디렉터리에서 권한 오류가 나면 저장소를 `/tmp`에 복사해 `chmod -R a+rX` 후 실행.

## 6. 프론트·콘솔 요약

- 공개 페이지는 demo 빌드에서 `?state=…`로 모든 상태를 미리 볼 수 있다(track 11상태, bid 8상태, signup 12상태 등 — `docs/sitemap.html`).
- 콘솔 mock 모드: 데모 시계 `2026-10-08 19:30` 고정, 아무 값으로 로그인, `?as=partner`로 지역 파트너 화면. api 모드는 실시간.
- 피드백 위젯 `assets/feedback.js`는 모든 페이지에 주입, Supabase 미설정 시 문의 페이지로 대체.
- 커미션 UI: 승인 시 요율 입력 다이얼로그, 호텔 상세 커미션 카드(변경 제안·동의 링크 재발송·이력), "요율 합의 필요"/"동의 대기" 배지, 초대 카드에서 미합의 호텔 비활성, 정산 요율 잠금. 여행사 쪽 화면·메일·공유 링크에는 요율이 없다(verify2가 검사).

## 7. 외부 서비스·계정 (이관 체크리스트)

| 서비스 | 용도 | 계정 소유 | 상태 |
|---|---|---|---|
| GitHub `jwlim-staynmore/micego` | 원본 저장소 | jwlim → 개발자 초대 | **생성 완료**(비공개) |
| Vercel | 정적 호스팅 | jwlim → 팀 초대 | 미연결. Framework Other · Build 없음 · Output `./` |
| Supabase | DB·Auth·Edge·cron | jwlim → 개발자 초대 | **미생성**. 리전 결정 필요(방침 제8조 국외 이전 기재) |
| 도메인 | 사이트·메일 | jwlim | **미확정** — `site.config.json.domain` 빈칸 |
| Resend | 이메일 | jwlim | 미가입. SPF/DKIM/DMARC |
| Solapi | SMS·알림톡 | jwlim | 미가입. 발신번호 사전등록·카카오 채널·알림톡 9종 심사(리드타임 가장 김 — 먼저 착수) |
| 선택 방식 스위치 | `site.config.json` `pick.otpEnabled` — 본 기획 true(휴대전화 인증 선택), **MVP 배포 false**(메일 회신 선택 + 운영자 대리 확정) | jwlim | 코드 완료(D-54). MVP는 문자 인증용 발신번호 없이 시작 가능. 알림톡은 그대로 Solapi 필요 |
| Cloudflare Turnstile | 스팸 방어(견적 요청·호텔 등록·가입) | jwlim | 코드 완료(D-50). 사이트 키·시크릿 발급 필요 — 키 빌드 배포 후 `TURNSTILE_SECRET` 설정 |
| GA4 / 서치콘솔 | 분석·인증 | jwlim | 자리만 |
| 임시 접수 메일 | mysteri1984@gmail.com | jwlim 개인 | 공개 페이지 다수에 노출 — 전부 `site.config.json.officialEmail/privacyEmail`에서 주입되므로 값 교체·재빌드로 일괄 해결 |

## 8. 설정·시크릿

- 프론트: `site.config.json` 한 파일 — domain / officialEmail / privacyEmail / operator(사업자 정보) / legal{effectiveDate, reviewed} / analytics.ga4 / siteVerification / supabase{url, anonKey, functionsUrl} / sms.vendorName / prod / demo. 현재 **전부 빈칸·demo:true**.
- 백엔드: `.env.example`의 키 목록(`SUPABASE_*`는 런타임 자동 주입). DB GUC 2개를 시크릿과 같은 값으로 등록해야 크론이 인증된다: `app.settings.cron_secret`=`CRON_SECRET`, `app.settings.feedback_cron_secret`=`FEEDBACK_CRON_SECRET`. `FEEDBACK_IP_PEPPER`는 `IP_HASH_SALT`와 다른 값. `NOTIFY_MODE=log`로 시작.
- DB settings(콘솔 설정 탭/`settings` 테이블): `commission_rate_range`(기본 [5,20]), `commission_terms_version`, `commission_accept_hours`(168), `proxy_confirm_hours`(72), `collect_due_days`(30), `remit_due_days`(14), `ops_email` 등.
- 첫 운영자 계정은 Supabase 대시보드에서 만들고 `app_metadata.role="operator"`(`is_operator()`가 console_user 행이 없는 기존 운영자 JWT도 인정). 이후 운영자·파트너 계정은 콘솔에서 초대(D-30).

## 9. 배포 순서

1. **백엔드**: `supabase/README.md` §2~§4(= 프로젝트 문서 '백엔드 배포 런북 v1.1' Step 1~12) — link → 확장 → `db push`(0001~0020) → seed → GUC 2종 → `sync_templates.py` → functions deploy(32) → secrets → 운영자 계정 → 벤더. 0010~0016 추가 절차는 `docs/partner-console-impl-v1.md` §3(초대 메일 리다이렉트 허용 목록에 `/admin/accept.html` 등).
2. **정적 사이트**: `site.config.json`을 복사해 `site.config.prod.json`(domain·메일·사업자·supabase 키·`prod:true`·`demo:false`) → `MG_SITE_CONFIG=site.config.prod.json python3 build2.py` → 산출물이 같은 폴더에 덮어써지므로 배포용 브랜치에서 빌드·커밋 → Vercel이 그 브랜치를 배포. `.vercelignore`가 `supabase/`·`src/`·`legal/`·`knowledge/`·`*.py`·`*.md`를 제외한다.
3. **커미션 오픈 전 필수**: 배포 직후 기존 승인 호텔은 전부 "요율 합의 필요"라 초대되지 않는다. `partners where state='approved' and commission_accepted_at is null` 대상에 콘솔에서 요율을 제안하고 동의를 받는다.
4. 롤백: DB는 down 마이그레이션 없음 → PITR, Edge·정적 사이트는 이전 커밋 재배포.

**오픈 전 대표(jwlim) 몫**: 도메인·공식 메일, 사업자 정보, **법무 검토 36곳**(`legal/REVIEW_NOTES.md`) 확정 후 `legal.reviewed=true`·`effectiveDate`, `TODO(legal)` 2곳(ko/index·ko/withdraw), Supabase 리전, 파트너 계약서(커미션 수금의 세무 성격 — 대리 수금 vs 파트너 매출), Solapi/Resend 심사, 실기기 QA(카카오 인앱·삼성 인터넷·iOS Safari).

## 10. 검증 방법

`CLAUDE.md`의 명령 그대로: 빌드 4종 후 `verify_*.py` 11종 + `run.sh`.

| 스크립트 | 대상 |
|---|---|
| verify2 | 공개 페이지·track, 여행사 쪽 요율 비노출 |
| verify3 | bid·이메일 |
| verify_acc | 회원 페이지 |
| verify_launch | 빌드 3구성(데모 바이트 동일성 · 스텁 staging · prod 데모 흔적 제거·헤더·sitemap) |
| verify_api | supabase-stub로 API 모드 플로우(get_bid 커미션, 동의 fixture 포함) |
| verify_feedback | 위젯·3빌드 |
| verify_admin · _ops · _members · _feedback | 콘솔(본사) |
| verify_admin_partner | 파트너 콘솔·정산·커미션 UI·commission.html (78항목) |

공통 기준: 360/768/1280에서 콘솔 오류 0, h1 1개, 가로 오버플로 없음. **2026-10-07 긴급 보완 브랜치에서 전부 0 FAILS, run.sh PASS=17.** 빌드 재현성: 4종 빌드 후 diff는 빌드 날짜 스탬프뿐.

## 11. 알려진 결함·기술부채 (우선순위순)

| # | 내용 | 조치 제안 |
|---|---|---|
| K-1 | **`admin/`·`docs/`·`emails/`가 정적 파일로 공개 배포됨.** robots 차단과 콘솔 로그인만 있고 파일 자체는 누구나 받을 수 있음(mock-data.js 포함) | Vercel Password Protection 또는 admin 별도 프로젝트(O-1). 오픈 차단급 |
| ~~K-13~~ | ~~Turnstile·대리 확정 동의 기록 코드 미수록~~ | **종결 2026-10-07**: 0019·0020·turnstile.ts로 재구현 |
| K-14 | 원문 토큰(`CONFIRM_TOKEN`·`COMMISSION_TOKEN`)이 `notification_log.vars`에 남음(운영자만 조회 가능) | 발송 성공 후 vars에서 제거 |
| K-2 | SQL `GUARD_*`(GUARD_REASON은 2026-10-07 카탈로그에 이미 있음 — 나머지)·`INVALID_TRANSITION`·`FORBIDDEN_FIELD`가 Edge 경로에서 `INTERNAL(500)`로 뭉개짐(콘솔 RPC 경로는 보존) | `errors.ts` 카탈로그 추가 + `fromSqlError` 매핑 |
| K-3 | 클라이언트 이메일 정규식(`build2.py` EMAIL_RE)과 서버 `validate.ts` 불일치 가능 | 통일 |
| K-4 | `OTP_PEPPER`·`IP_HASH_SALT` 미설정 시 빈 문자열로 조용히 동작 | 기동 시 필수 env 검증 |
| K-5 | `get_bid`: 종료된 요청에서 미제출 호텔의 라벨이 "open"으로 보임 | 종료 상태 우선 판정 |
| K-7 | 공휴일 시드(`kr_holidays`)가 2026년까지만 | 매년 추가 |
| K-8 | 다중 통화 견적 비교 기준 미정(O-6) | — |
| K-9 | 콘솔 mock 예시 데이터가 prod 빌드 검사에 NOTE로 남음 | api 모드 전환 후 제거 |
| K-15 | 커미션: 취소·인원 감소 시 커미션 재계산 상태 없음(분쟁 경유만), 여행사 자체 커미션(이중 커미션) 필드 없음 | v1.1 후보(설계서 §D 제외 범위) |

v1의 K-11(git 없음)·K-12(동시 편집 사고)는 git 이관으로 해소, K-6(의도적 스펙 이탈)·K-10(아카이브 프로토타입 카피)은 문서화로 종결.

## 12. 미결 결정 (개발자와 함께)

`DECISIONS.md` O-1~O-6. 아키텍처 영향 순: **O-1**(admin 접근 제한 — 배포 방식) · **O-2**(첨부파일 Storage) · O-6(다중 통화 비교) · O-3(호텔 마감 현지시간 병기) · O-4(제출 후 요청 수정 범위). O-5(지역 파트너 RLS)는 0010~0016으로 구현됐고, O-7(커미션율)은 D-37~D-43으로 종결됐다.

## 13. 첫 주 권장 순서

1. 저장소 접근 받기 → **커미션 브랜치 `main` 병합 여부 확인** → 클론 → 빌드 4종 후 diff가 날짜 스탬프뿐인지 확인.
2. 검증 11종 + `run.sh` 로컬 실행(Deno·PostgreSQL 16 필요).
3. Vercel 프리뷰 연결(데모 상태 — 외부 공유 금지, K-1 때문에 Password Protection 권장).
4. Supabase 프로젝트 생성 → 배포 순서 1(`NOTIFY_MODE=log`) → `site.config.json`에 키 → api 빌드 → `verify_launch` (c).
5. K-1 해결 방식 결정·구현. Turnstile 사이트 키·시크릿 발급(D-50 순서).
6. Solapi 알림톡 템플릿 심사 제출(리드타임 김).
7. 기존 승인 호텔 요율 제안·동의(§9-3) 리허설.

## 14. 연락·문서

- 의사결정: jwlim@staynmore.com. 정책·카피 변경은 `DECISIONS.md`에 먼저 기록.
- 운영 문서: `docs/launch-checklist.md`(오픈 당일) · `incident-runbook.md`(장애 대응) · `operator-onboarding.md`(운영자 온보딩). v1.1판과 VOC SOP·CX는 `knowledge/project-docs/`.
- 사업 자료(`knowledge/artifacts/`): 사업 기획안 v1.2 · 지역 파트너 모델·제안서 · Tmthai 안내서 · 운영 SOP v2 · 사이트 목업. 결정 배경은 `knowledge/context/decisions-from-claude-memory.md`.
- 데모 미리보기(비공개, 커미션 브랜치·mock): https://claude.ai/artifact/MUzdy7K223wEVVf7Dj7fwv

## 이력

| 날짜 | 작업자 | 변경 |
|---|---|---|
| 2026-10-07 | jwlim(클로드 작성) | v2.1: 불일치 3건 수정(소속 유형 5종 통일·견적 통화=정산 지원 통화·공유 링크 회원 한정), `0018_org_types_currencies`, run.sh PASS=15, 선정 동의 작업 번호 0019로 |
| 2026-10-07 | jwlim(클로드 작성) | v2.2: 긴급 보완 3건(자체 취소 0020·대리 확정 동의 기록 0019·Turnstile) 반영, K-13 종결, Edge 32·PASS=17·법무 표시 36 |
| 2026-10-06 | jwlim(클로드 작성) | v2: git 이관·지역 파트너 콘솔(0010~0016)·호텔 커미션(0017) 반영, 수치 실측 갱신(마이그레이션 17·Edge 31·이메일 32·verify 11·PASS=14·법무 표시 31), 알려진 공백(Turnstile·동의 기록) 명시, K-13~K-15 추가, O-5·O-7 종결, Vercel·커미션 오픈 절차 추가 |
| 2026-09-28 | jwlim(클로드 작성) | K-12 병합 완료 메모 추가(git 이관) |
| 2026-09-27 | jwlim(클로드 작성) | v1 최초 작성 + 독립 검증 반영 |
