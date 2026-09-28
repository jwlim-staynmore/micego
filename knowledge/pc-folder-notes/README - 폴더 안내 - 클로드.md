# MICE 역경매 비즈니스 — 프로젝트 폴더 안내 - 클로드

기준일 2026-09-27(개발자 핸드오프 패키지 반영). 이 폴더가 MICEGO(마이스고) 작업의 **원본 저장소**입니다. 클로드는 작업이 끝날 때마다 바뀐 파일을 이 폴더에 바로 씁니다.

## 지금 쓰는 것 (최신)

| 항목 | 위치 | 설명 |
|---|---|---|
| 사이트 전체 소스 | `micego-site/` | 공개 페이지(ko·en), 회원 페이지, 운영 콘솔(admin), 백엔드(supabase), 알림 템플릿(emails), 문서(docs), 디자인 원천(src), 설계 스펙(SPEC_*.md), 빌드·검증 스크립트. 288개 파일 |
| **개발자 핸드오프** | `micego-site/HANDOFF.md` | 개발자가 첫 번째로 읽는 문서. README.md · DECISIONS.md · CHANGELOG.md · .env.example 과 세트 |
| 사이트 압축본 | `micego-site.zip` | `micego-site/`와 같은 내용. 개발자에게 통째로 전달할 때 사용 |
| 진행 현황 | `micego-진행-현황 - 클로드.md` | 영역별 상태, 09-27 발견·조치, 남은 일. 새 세션은 이 문서부터 읽습니다 |
| 오픈 전 점검 | `micego-sitemap-launch-gaps - 클로드.md` (= `micego-site/docs/sitemap.md`) | 사이트맵과 미구현 항목, 진행 배지 |
| 배포 런북 v1.1 | `micego-백엔드-배포-런북-v1.1 - 클로드.md` | Supabase 배포 Step 1~12 (프로젝트 문서와 동일) |

`micego-site/` 안에서 자주 여는 파일:
- `HANDOFF.md` 인수 매뉴얼 · `README.md` 빌드·규칙 · `DECISIONS.md` 확정 결정 로그(D-27~D-34, 미결 O-1~O-7)
- `SPEC_LAUNCH.md` 백엔드·API·검증 스펙 · `SPEC_ACCOUNTS.md` 회원제 · `SPEC_FEEDBACK.md`+`_ADDENDUM.md` 피드백 시스템
- `docs/sitemap.html` 사이트맵·오픈 전 점검(브라우저용) · `docs/state-transitions.html` 상태전이표 v1.7 · `docs/notification-library.html` 알림 문안 라이브러리
- `site.config.json` 도메인·공식 메일·사업자 정보·Supabase 키·GA4 — 오픈 전에 채우는 유일한 설정 파일
- `supabase/README.md` 백엔드 배포 순서(런북과 동일 절차)

## 참고용 — `_archive/` (이전 산출물, 수정하지 않음)

| 위치 | 설명 |
|---|---|
| `_archive/초기시안/` | 초기 단일 페이지 시안 3종과 초대 메일 초안, 화면 목업. **빌드 원천이 아닙니다** — 빌드는 `micego-site/src/`의 사본을 씁니다. 이 폴더의 랜딩 2종에는 미채택 가격 카피(이용료 0원·10% 커미션)가 남아 있습니다(D-32) |
| `_archive/기획문서/` | 사업 기획서·90일 운영 로드맵(한·베), 오거나이저 RFP SOP(docx, v1 — 현행 SOP는 v2.1 Claude Doc), Naboo 벤치마킹 검토(docx) |
| `_archive/Claude outputs (앱 자동 사본)/` | 앱이 자동으로 남긴 사본. 루트의 같은 파일이 최신 |

## 다시 만들기·검사하기 (`micego-site/` 안에서)

```
pip install -r requirements.txt && python -m playwright install chromium && npm i -g deno
python3 build2.py        # 공개·회원 페이지, 오픈 자산, 위젯 주입까지 전부 재생성
python3 build_notify.py  # 알림 라이브러리·이메일 템플릿
python3 build_sitemap.py # 점검 문서
python3 supabase/scripts/sync_templates.py   # Edge Function 템플릿(배포 직전 필수)
python3 verify2.py && python3 verify3.py && python3 verify_acc.py && python3 verify_launch.py \
  && python3 verify_api.py && python3 verify_feedback.py \
  && python3 verify_admin.py && python3 verify_admin_ops.py && python3 verify_admin_members.py && python3 verify_admin_feedback.py
bash supabase/tests/run.sh   # 백엔드(PostgreSQL 16 + Deno 필요) → PASS=12
```
페이지는 손으로 고치지 말고 `build*.py`(또는 `src/`)를 고친 뒤 다시 생성합니다. 운영 콘솔(`admin/*.html`, `admin/*.js`)은 직접 편집합니다. 어느 경로에 복사해도 빌드가 됩니다(09-27부터).

## 클로드 프로젝트 문서(클로드 앱 안)
개발자 핸드오프 v1 · 회원제 설계서 v1 · 사이트맵-오픈전 점검 v1 · 피드백 시스템 설계서 v1 · VOC SOP·CX v1 · 백엔드 배포 런북 v1.1 · 진행 현황. 이 폴더의 md 파일과 내용이 같으며, 두 곳 모두 클로드가 함께 갱신합니다.
