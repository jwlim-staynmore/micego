# CHANGELOG

## [0.10.0-prelaunch] — 2026-09-29 (호텔 커미션)

### 추가
- 호텔별 고정 커미션율(D-37~D-43, 설계서 `docs/hotel-commission-design-v1 - 클로드.md`). 마이그레이션 `0017_hotel_commission.sql`: `partners` 요율·동의·토큰 컬럼, `partner_commission_event`(추가 전용), 초대·정산 요율 스냅샷, 승인 시 요율 필수·범위 가드, 동의 전 호텔 초대 제외(`MG:COMMISSION_NOT_AGREED`), 정산 요율 프리필·편차 플래그.
- Edge Function `partner_commission_accept`(조회·동의), 호텔 동의 페이지 `en/commission.html`(`build_commission.py`, `build_launch.py`가 실행 — `build_confirm.py`도 이제 `build2.py` 한 번으로 생성).
- 알림 `PTN_COMMISSION_TERMS` 신규, `PTN_APPROVED`에 요율·동의 버튼, `HTL_INVITE`·비딩 화면에 합의 요율 한 줄.
- 운영 콘솔: 승인 시 요율 입력, 호텔 상세 커미션 카드(변경 제안·동의 링크 재발송·이력), "요율 합의 필요"·"동의 대기" 배지, 초대 카드에서 미합의 호텔 비활성, 정산 요율 잠금.
- 테스트: `supabase/tests/sql/07_hotel_commission.sql`(9 시나리오), Deno 단위 테스트, `verify_admin_partner.py` 78항목, `verify2`·`verify_api` 요율 노출 검사. 백엔드 PASS=14.

### 문서
- `docs/state-transitions.html` v1.7 → **v1.9**(v1.8은 이 저장소에 없는 작업이라 건너뜀): 5-5 요청 위임 상태(`rfps.delegation`·보류 사유·전이 RPC·읽기/쓰기·HQ override), 4장 대리 입력 상태와 비교표 포함 기준·초대 때 커미션 합의 확인, 5-6 정산 상태(전이·가드·기한·플래그), 5-1 호텔 커미션 합의 상태, 6·7장 화면·알림(PTN_COMMISSION_TERMS·HTL_CONFIRM·PTR_*/HQ_* → CONSOLE_NOTICE) 행, 9장 미결 m~p. 기준은 마이그레이션 0010~0017.
- 문서 버전 표기를 v1.9로 갱신: `build_sitemap.py`(사이트맵 재생성), `docs/launch-checklist`·`incident-runbook`·`operator-onboarding`(.md·.html), `README.md`, `HANDOFF.md`, `admin/settings.html`, `verify_admin_members.py`(기대 버전).

### 검토 반영 (4단계)
- `0017`: `partners`의 동의 토큰·IP 해시·제안 사유 컬럼을 콘솔 직접 조회(PostgREST)에서 차단(테이블 SELECT 회수 후 민감 컬럼 제외 재부여). 정지된 조직의 요율 제안 차단, 재개 알림 1통(요율 없음 PTN_REINSTATED / 새 요율 PTN_COMMISSION_TERMS), 분쟁 해소로 금액을 덮어쓰면 `rate_deviation` 플래그. SQL 테스트 확장(`07_hotel_commission.sql`).
- Partner Terms 5.5 인보이스 주체에 지역 운영 파트너 반영, `REVIEW_NOTES.md`·CLAUDE.md·사이트맵 검토 표시 수를 실제 태그 기준 31곳으로 정정, 호텔 랜딩 파트너 조건에 커미션 안내 한 줄, 여행사 랜딩 제목·배지 등 단독 문구를 "주최 측 수수료 없음"으로.

### 변경
- Partner Terms 5조(5.2~5.7) 커미션 조항, 이용약관 제4조③⑤·제21조⑤, `legal/REVIEW_NOTES.md` 31곳(실제 태그 기준 재집계). 카피 "수수료 없음" → "주최 측 수수료 없음"(푸터·FAQ·통계 라벨), 호텔 FAQ에 커미션 안내.

### 배포 시 주의
- 배포 직후 기존 승인 호텔은 전부 "요율 합의 필요" 상태라 초대되지 않는다. 오픈 전에 `partners where state='approved' and commission_accepted_at is null` 대상에 요율을 제안하고 동의를 받는다.

## [0.9.1-prelaunch] — 2026-09-28 (Git 이관 · K-12 병합 완료)

### 병합
- `_handoff_patch_2026-09-27/APPLY.md` 절차 완료. 약관 전문 렌더링 훅 복원: `build2.py`가 `build_legal.py`를 다시 실행(→ ko/en terms·privacy 전문), `site.config.json`에 `legal` 블록, `build_sitemap.py` v1.3(페이지 41). 재생성한 `docs/sitemap.md`가 PC 폴더의 `micego-sitemap-launch-gaps - 클로드.md`와 날짜 외 동일.
- `build_notify.py`·`build_legal.py`의 `/tmp/site` 하드코딩 제거(`MG_SITE_DIR` 또는 스크립트 위치). 이제 `build_legal.py` 단독 실행은 불가(`build2.py`가 exec).
- `verify2.py`·`verify_acc.py` 기대치를 약관 전문 렌더링 기준으로(패치본), `.vercelignore`에 `legal/`·`knowledge/`.

### 수정
- `verify_admin_members.py`: 파트너 콘솔이 추가한 메뉴(정산·지역 파트너) 때문에 실패하던 NAV 순서 검사를 상대 순서 검사로 완화.
- `supabase/functions/get_track/handle.ts`: `RfpRow`에 `partner_org_id`·`delegation`을 선언해 `as Record` 캐스팅 3곳 제거(deno check TS2352).
- `supabase/functions/_tests/mock_deps.ts`: `AuthAdminClient.inviteUserByEmail` mock 추가(deno check TS2322). → `supabase/tests/run.sh` PASS=13 FAIL=0.

- `build_launch.py`: `legal/partner_terms_en.json`이 있으면 `en/terms.html`을 요약 초안으로 덮어쓰지 않음(K-12 때 유실된 가드). 이 때문에 Partner Terms 전문이 렌더링되지 않고, 요약본의 "MICEGO charges no commission to either side"(D-32·REVIEW_NOTES §2-7 위반)가 노출되고 있었음. `verify_launch.py`는 `[legal review]` 표시도 검토 표시로 인정.

### 이관
- 저장소 루트 = 옛 `micego-site/`. 사업·운영 문서는 `knowledge/`(클로드 프로젝트 문서 13종, 발행 아티팩트, PC 폴더 노트, 초기 시안·기획 문서 아카이브). `CLAUDE.md` 추가.

## [0.9.0-prelaunch] — 2026-09-27 (개발자 핸드오프 스냅샷)

### 추가
- `SPEC_LAUNCH.md`, `SPEC_FEEDBACK_ADDENDUM.md` — 유실된 설계 스펙을 구현 기준으로 역추출(v1.0). `SPEC_ACCOUNTS.md`, `SPEC_FEEDBACK.md` — 기존 설계서 동일본 배치.
- `README.md`, `HANDOFF.md`, `DECISIONS.md`, `requirements.txt`, `.gitignore`, `.env.example`, 이 파일.
- `src/` — 디자인 원천 프로토타입 3종(빌드 입력). 이전에는 세션 임시 경로에서 읽었음.

### 변경
- `build.py`·`build2.py`·`build_acc.py`·`build_launch.py`·`build_notify.py` 5종 + `verify_*.py` 7종: `/tmp/site` 하드코딩 제거 → 스크립트 위치 기준(`MG_SITE_DIR`).
- `verify_launch.py`: 기준선 기본값을 현재 사이트로, robots 검사를 '포함 여부'로.
- `ko/index.html`·`en/index.html`: 문제/방식 카드의 모바일 그리드 자동배치 수정(명시적 grid-row). 카피 변경 없음.
- `supabase/README.md`: 마이그레이션 0001..0009, 함수 28개, 템플릿 실측치로 정정. **`app.settings.feedback_cron_secret` GUC 등록 절차 추가**(누락돼 있었음).
- `supabase/functions/_shared/templates.gen.ts`: `sync_templates.py`로 재생성(43→45 템플릿, FB_OPS_ALERT·FB_ACK 포함).
- `.vercelignore` 신설 — 소스·백엔드·스펙·시드가 정적 배포에 실리지 않도록.

### 병합(다른 세션 작업, 같은 날)
- `legal/` 약관·개인정보 전문 JSON 4종 + `REVIEW_NOTES.md`, `build_legal.py`, `legal_render.py` → ko/en terms·privacy 전문 렌더링. `site.config.json`에 `legal` 블록.
- `docs/launch-checklist`·`incident-runbook`·`operator-onboarding`(md+html). 사이트맵 v1.3.
- 동시 편집으로 덮어써졌던 `build2.py` 훅·`build_sitemap.py`·`site.config.json` 변경을 복원(K-12). `verify2`·`verify_acc` 기대치 2건을 전문 렌더링에 맞게 갱신.

### 상태
- 프론트·콘솔·백엔드 코드 완료, 배포 전. 검증 10종 0 FAILS, 백엔드 테스트 PASS=12(Deno 단위 테스트 91개 포함).
