# CLAUDE.md — MICEGO(마이스고)

해외 MICE 호텔 역경매 플랫폼. 한국 여행사·랜드사·기업(오거나이저)이 해외 행사 요건을 한 번 등록하면, 익명화한 요청서를 해외 파트너 호텔에 보내 견적을 받아 비교표로 돌려준다. **운영 주체는 MatchGo(매치고)** — STAYNMORE 프로젝트가 아니다(브랜드·약관 당사자 모두 매치고 단독).

상태(2026-09-28): 프론트·운영 콘솔·백엔드 코드 완료, **배포 전**. 이 저장소가 원본이다(이전 원본은 사용자 PC 폴더 `MICE 역경매 비즈니스/`).

## 먼저 읽을 것

| 문서 | 용도 |
|---|---|
| `HANDOFF.md` | 인수 매뉴얼. 구조·배포·알려진 문제(K-*)·미결(O-*) |
| `DECISIONS.md` | 확정 결정 로그(D-*). 되돌리려면 여기에 새 결정으로 남긴다 |
| `knowledge/project-docs/micego-진행-현황 - 클로드.md` | 영역별 상태·남은 일(다만 아래 "알려진 공백" 참고) |
| `SPEC_LAUNCH.md` · `SPEC_ACCOUNTS.md` · `SPEC_FEEDBACK.md`(+`_ADDENDUM`) | 코드 주석이 `§N`으로 인용하는 설계 스펙 |
| `docs/partner-console-impl-v1.md` | 지역 파트너 콘솔(마이그레이션 0010~0016) 구현 노트 |
| `knowledge/context/decisions-from-claude-memory.md` | 사업·정책 결정의 배경 |

## 스택과 명령

정적 HTML(파이썬 생성기, Plain ES5) + Supabase(Postgres·RLS·Edge Functions(Deno)·pg_cron) + Resend(이메일) + Solapi(SMS·알림톡). Next.js 아님. 호스팅은 Vercel(정적).

```bash
pip install -r requirements.txt        # Claude Code 원격 환경은 --break-system-packages
python3 build2.py                      # ko/·en/·index.html·404·sitemap.xml·assets/config.js + 약관 전문(build_legal.py)
python3 build_notify.py                # emails/·docs/notification-*
python3 build_sitemap.py               # docs/sitemap.{md,html}
python3 supabase/scripts/sync_templates.py   # Edge Function 템플릿(templates.gen.ts) — 배포 직전 필수

# 검증 11종 — 전부 FAILS 0 이어야 한다
for v in verify2 verify3 verify_acc verify_launch verify_api verify_feedback verify_admin verify_admin_ops verify_admin_members verify_admin_feedback verify_admin_partner; do python3 $v.py | tail -1; done

# 백엔드(PostgreSQL 16 + Deno) — PASS=14 FAIL=0
MG_PGBIN=/usr/lib/postgresql/16/bin MG_DENO_BIN=$(which deno) bash supabase/tests/run.sh
```

- Claude Code 원격 환경: Chromium은 설치돼 있으니 `playwright install` 하지 않는다. Deno는 `npm i -g deno`. `run.sh`의 psql이 `postgres` 사용자로 파일을 읽으므로 권한 오류가 나면 저장소를 `/tmp`에 복사해 `chmod -R a+rX` 후 실행.
- 생성기는 스크립트 위치 기준으로 동작한다(`MG_SITE_DIR`로 바꿀 수 있음). 환경별 설정은 `MG_SITE_CONFIG=<파일> python3 build2.py`.
- 생성물 빌드 스탬프(`<meta name="micego-build">`)가 날짜로 바뀌므로, 빌드만 돌리면 ko/en 전체가 diff에 잡힌다. 기능 변경이 없으면 커밋하지 않는다.

## 편집 규칙

1. **`ko/`·`en/`·`index.html`·`404.html`·`assets/config.js`·`emails/`·`docs/sitemap.*`·`docs/notification-*`는 생성물** — 손으로 고치지 말고 `build*.py`·`src/`를 고친 뒤 재생성.
2. **약관·개인정보처리방침 원문은 `legal/*.json`뿐**. HTML이 아니라 JSON(또는 `site.config.json`의 `operator`·`legal`·`sms` 블록)을 고친다. 검토 쟁점 31곳은 `legal/REVIEW_NOTES.md`(본문 표시는 한국어 `[법무 검토]`, 영어 `[legal review]`).
3. **운영 콘솔 `admin/*.html`·`admin/*.js`는 직접 편집**(생성기 아님). mock/api 이중 모드 — `?as=partner`로 파트너 화면 시연.
4. `site.config.json`이 도메인·공식 메일·사업자 정보·Supabase 키·GA4를 채우는 **유일한 설정 파일**. 실제 키·시크릿은 커밋하지 않는다(시크릿은 `supabase secrets`, 예시는 `.env.example`).
5. `partners` 테이블은 0017부터 **열 단위 SELECT 권한**이다 — 새 컬럼을 추가하면 같은 마이그레이션에서 `grant select (새컬럼) on partners to authenticated`를 넣어야 콘솔에서 보인다(요율 토큰·IP 해시 컬럼은 일부러 제외). 마이그레이션은 번호 순서(`supabase/migrations/00NN_*.sql`). 이미 적용된 파일은 고치지 말고 새 번호로 추가. enum 값 추가는 단독 파일.
6. RFP 상태는 전이 RPC로만 바꾼다. SQL로 직접 상태를 바꾸는 코드·절차를 만들지 않는다(이력·알림 누락).
7. 오거나이저 신원(회사명·담당자·연락처·예산)은 선정 전 호텔에 절대 노출되지 않는다. 호텔 화면·메일·요건서에 새 필드를 넣을 때 확인.
8. JS 미실행 환경에서도 핵심 콘텐츠가 보여야 한다(진입 애니메이션은 `js-anim` 부모 클래스 + 세이프티넷).
9. 한국어 카피는 번역투 없이 자연스럽게. 사이트 가격 카피는 "수수료 없음·커미션율 비공개"(D-32) — 무료·무커미션을 약속하는 문구 금지.
10. 기능을 바꾸면 `CHANGELOG.md`, 결정이 생기면 `DECISIONS.md`, 상태가 바뀌면 `knowledge/project-docs/micego-진행-현황 - 클로드.md`를 함께 갱신한다.

## 알려진 공백 (2026-09-28 이관 시점)

- **Turnstile 스팸 방어 + 운영자 대리 확정 동의 기록 작업이 이 저장소에 없다.** 프로젝트 문서(진행 현황·오픈 체크리스트·장애 런북·운영자 온보딩 v1.1)는 `supabase/migrations/0010_selection_consent.sql`, `_shared/turnstile.ts`, 상태전이표 v1.8(이 저장소의 `docs/state-transitions.html`은 v1.9로 v1.8을 건너뜀), 사이트맵 v1.4, 백엔드 테스트 PASS=14(당시 기준)를 전제로 쓰였지만, 해당 코드는 PC 폴더에 저장되지 않은 채 다른 세션에만 남아 있었다. 되찾으면 **`0010`·`0017`이 이미 쓰였으므로 `0018_selection_consent.sql`로 번호를 바꿔(0017은 호텔 커미션)** 넣고 테스트를 다시 돌린다. 그 전까지 `docs/*.md`(v1.0)와 `knowledge/project-docs/`의 v1.1 문서는 버전이 어긋난다.
- 법무 검토 31곳, 사업자 정보·도메인·공식 메일, Supabase 리전, 비회원 요청 30일 파기 작업(system_tick) — `HANDOFF.md`·진행 현황 §3~§5.

## 저장소 구조

```
/                     옛 micego-site/ (사이트·콘솔·백엔드·빌드·검증 스크립트)
├─ admin/ ko/ en/ assets/ emails/ docs/ legal/ src/ supabase/ og/ tests/
├─ build*.py verify*.py site.config.json SPEC_*.md HANDOFF.md DECISIONS.md CHANGELOG.md
└─ knowledge/         배포 제외(.vercelignore) — 사업·운영 자료
   ├─ project-docs/   claude.ai 프로젝트 문서 13종 사본(2026-09-28)
   ├─ artifacts/      발행 아티팩트 사본(사업 기획안 v1.2, 파트너 모델·제안서·Tmthai 안내서, 운영 SOP v2, 사이트 목업)
   ├─ context/        클로드 메모리에 있던 결정 모음
   ├─ pc-folder-notes/ PC 폴더 루트의 md(폴더 안내·배포 런북 v1.1 등)
   └─ archive/        초기 시안(빌드 원천 아님)·기획 문서(docx·html)·09-27 핸드오프 패치 원본
```

## 작업 방식(사용자 선호)

- 프로젝트성 요청은 기획(Fable 모델 에이전트, 불가 시 Opus) → 설계·검증(Opus 에이전트) → 구현(기본 모델) 순서로 진행. 기존 산출물의 작은 수정은 바로 구현.
- 놓친 unknown unknowns를 먼저 짚고, 애매하면 한 번에 한 질문씩 — 아키텍처를 바꾸는 질문부터.
- 클로드가 만드는 문서·산출물 제목 끝에는 ` - 클로드`.
- 동시 작업은 브랜치로 분리한다(09-27 동시 편집 사고 K-12 재발 방지, D-36).
