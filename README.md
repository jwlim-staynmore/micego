# MICEGO (마이스고) — 해외 MICE 호텔 역경매 플랫폼

한국 여행사·랜드사·기업(오거나이저)이 확정 일정의 해외 행사 요건을 한 번 등록하면, MICEGO가 익명화한 요청서를 해외 파트너 호텔에 보내 견적을 받아 비교표로 돌려주는 서비스. 운영 주체는 MatchGo(매치고). 상세 배경·정책은 `DECISIONS.md`, 개발자 인수 안내는 `HANDOFF.md`.

## 한눈에

| 영역 | 위치 | 기술 |
|---|---|---|
| 공개 사이트 — 여행사(한국어) | `ko/` 13p | 파이썬 생성기가 만드는 정적 HTML, Plain ES5 |
| 공개 사이트 — 호텔(영어) | `en/` 8p | 〃 |
| 모드 선택 허브 | `index.html` | 〃 |
| 운영 콘솔 | `admin/` 11p | 직접 편집하는 HTML/JS(생성기 아님), mock/api 이중 모드 |
| 백엔드 | `supabase/` | Postgres 마이그레이션 9개(테이블 29), Edge Function 28개(Deno), pg_cron, RLS |
| 알림 템플릿 | `emails/` 29 + `docs/notification-templates.json` | 이메일 29·알림톡 9·SMS 2 |
| 문서 | `docs/` | 상태전이표 v1.9, 알림 라이브러리, 사이트맵·오픈 전 점검 v1.3, 오픈 체크리스트·장애 runbook·운영자 온보딩 |
| 설계 스펙 | `SPEC_LAUNCH.md` `SPEC_ACCOUNTS.md` `SPEC_FEEDBACK.md` `SPEC_FEEDBACK_ADDENDUM.md` | 코드 주석이 `§N`으로 인용 |
| 디자인 원천 | `src/` 3 HTML | `build.py`가 CSS·마크업 조각을 여기서 추출 |
| 약관·개인정보 전문 | `legal/` 4 JSON | `build_legal.py`가 ko/en terms·privacy 4페이지로 렌더링. `[법무 검토]` 표시는 `site.config.json.legal.reviewed=true`로 제거 |

상태(2026-09-27): 프론트·콘솔·백엔드 **코드 완료, 배포 전**. 검증 스위트 10개 + 백엔드 테스트 모두 0 FAILS.

## 빠른 시작

```bash
git clone <repo> && cd micego-site
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && python -m playwright install chromium

python3 build2.py          # 공개·회원 페이지, 오픈 자산(404·sitemap.xml·아이콘·헤더), config.js 재생성
python3 build_notify.py    # 알림 라이브러리·이메일 템플릿
python3 build_sitemap.py   # docs/sitemap.html

# 검증 (각각 0 FAILS 이어야 함)
for s in verify2 verify3 verify_acc verify_launch verify_api verify_feedback \
         verify_admin verify_admin_ops verify_admin_members verify_admin_feedback; do python3 $s.py || break; done
npm i -g deno              # 백엔드 3단계에 필요 (없으면 esbuild 구문검사로 대체되어 단위 테스트가 안 돈다)
bash supabase/tests/run.sh # 백엔드: pglast + PostgreSQL 16(root·postgres OS 사용자 필요) + Deno check/test → PASS=12 이어야 함
```

로컬 미리보기는 정적 서버면 충분하다: `python3 -m http.server 8080` → `http://localhost:8080/`.

## 반드시 알아야 할 규칙

1. **`ko/`·`en/`·`index.html`·`404.html`·`assets/config.js`는 생성물이다.** 약관·개인정보 4페이지는 `legal/*.json`에서 나온다. 손으로 고치면 다음 빌드에서 덮어써진다. `build*.py`(또는 `src/`의 원천 프로토타입)를 고치고 재빌드한다. `admin/`은 반대로 직접 편집한다.
2. **모드 전환은 설정 파일 하나로 한다.** `site.config.json`의 `supabase.url`이 비어 있으면 프론트는 `mailto`/`mock` 모드(백엔드 없이 동작), 채워지면 `api` 모드. `prod:true`면 DEMO 띠·상태 스위처·예시 데이터가 제거된다. 환경별 설정은 `MG_SITE_CONFIG=<파일> python3 build2.py`.
3. **빌드 스크립트는 자기 파일이 있는 폴더를 기준으로 다른 스크립트와 `src/`를 찾는다**(`MG_SITE_DIR`로 바꿀 수 있음). 산출물과 `site.config.json` 읽기는 현재 작업 폴더 기준이므로, 빌드·검증은 항상 `micego-site/` 안에서 실행한다.
4. **비밀 값은 `.env.example`의 키 목록만 커밋한다.** 실제 값은 `supabase secrets set`으로만 올린다.
5. **핵심 콘텐츠를 JS로만 보이게 만들지 않는다**(프로그레시브 인핸스먼트). 스크롤 애니메이션은 `html.js-anim` 하위에서만 초기 숨김.
6. 상태 머신을 바꾸면 `docs/state-transitions.html`, `supabase/migrations/0003_private_fns.sql`, `admin/admin.js`, `supabase/tests/sql/02_transitions.sql` 네 곳을 함께 바꾼다.

## 배포

`supabase/README.md` §2~§4 와 프로젝트 문서 **'micego-백엔드-배포-런북 v1.1'**(Step 1~12)을 따른다. DB GUC는 `cron_secret`과 `feedback_cron_secret` **2개**다. 정적 사이트는 Vercel(`vercel.json`이 보안 헤더 정본, `.vercelignore`가 소스·백엔드·스펙을 제외). 배포 직후 `NOTIFY_MODE=log`로 시작해 검증 후 `live`로 전환한다. 상세는 `HANDOFF.md` §9.

## 폴더 구조

```
micego-site/
├─ build.py            공통 조각(헤더·푸터·CSS)과 랜딩 2종 — src/ 프로토타입에서 추출
├─ build2.py           진입점. site_config → build → 앱 페이지(track/bid) → build_acc → build_launch 순서로 exec
├─ build_acc.py/_acc2  회원 페이지(signup/login/reset/my/account/withdraw/terms)
├─ build_legal.py      legal/*.json → ko/en terms·privacy (legal_render.py 사용)
├─ build_launch.py     오픈 자산(404, sitemap.xml, robots, 아이콘, _headers/vercel.json, config.js, prod 정리)
├─ build_notify.py     emails/*.html, docs/notification-*.json/csv, notification-library.html
├─ build_sitemap.py    docs/sitemap.html·sitemap.md
├─ site_config.py      site.config.json 로더(CFG/BASE/MAIL/API/DEMO/PROD)
├─ verify*.py          Playwright 검증 10종 (스크린샷은 shots*/ — gitignore)
├─ assets/             config.js(생성) · mg.js(API 클라이언트) · feedback.js(VOC 위젯)
├─ admin/              운영 콘솔. data-adapter.js가 mock-data.js 또는 Supabase 선택
├─ supabase/           migrations/ functions/ scripts/ tests/ seed*.sql config.toml README.md
├─ docs/  emails/  og/  src/  legal/  tests/fixtures/
└─ SPEC_*.md  DECISIONS.md  HANDOFF.md  CHANGELOG.md
```

## 관련 문서(클로드 프로젝트)

진행 현황 · 백엔드 배포 런북 v1 · 회원제 설계서 v1(=SPEC_ACCOUNTS) · 피드백 시스템 설계서 v1(=SPEC_FEEDBACK) · VOC SOP·CX v1 · 사이트맵·오픈 전 점검 v1 · **개발자 핸드오프 v1(=HANDOFF.md)**.
