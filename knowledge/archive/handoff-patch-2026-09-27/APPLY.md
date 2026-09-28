# _handoff_patch_2026-09-27 — 적용 안내

이 폴더는 개발자 핸드오프 세션이 만든 변경분만 담은 **패치**다. `micego-site/`에 그대로 덮어쓰지 말고 아래 순서로 적용한다. 배경: 같은 날 두 클로드 세션이 같은 폴더에 동시에 쓰다가 이쪽 복사가 상대(지역 파트너 콘솔·약관 전문 세션)의 기존 파일 수정을 되돌려 버렸다(HANDOFF.md §0, K-12).

## 1. 먼저 — 파트너 콘솔 세션의 산출물을 다시 쓴다
그 세션(채팅)에 "micego-site 산출물 전체를 PC 폴더에 다시 써 달라"고 요청한다. 그 세션의 작업 사본이 정본이다. 다시 쓴 뒤 `docs/partner-console-impl-v1.md` §1의 파일 목록이 모두 최신인지, `admin/admin.js`에 `isPartner`, `supabase/functions/_shared/deps.ts`에 `inviteUserByEmail`이 있는지 확인한다.

## 2. 그 위에 이 패치를 얹는다 (파일 단위, 충돌 없음)
아래 파일은 상대 세션이 건드리지 않은 것이라 그대로 복사해도 된다.

| 대상 | 내용 |
|---|---|
| `SPEC_LAUNCH.md` `SPEC_ACCOUNTS.md` `SPEC_FEEDBACK.md` `SPEC_FEEDBACK_ADDENDUM.md` | 유실 스펙 복원(코드 인용 전부 해소). 주의: `SPEC_LAUNCH.md`는 10:24 스냅샷 기준이라 0010~0016·`partner_invite`·`quote_confirm`은 아직 §2·§3에 없음 — 파트너 콘솔 구현 노트를 §11로 붙일 것 |
| `HANDOFF.md` `README.md` `DECISIONS.md` `CHANGELOG.md` | 인수 매뉴얼·결정 로그 |
| `.gitignore` `.vercelignore` `.env.example` `requirements.txt` | 리포지토리 위생. `.env.example`에 파트너 콘솔이 추가한 env가 있으면 보충 |
| `src/` (3 HTML) | `build.py`의 디자인 원천. **필수** — 없으면 빌드가 죽는다 |
| `build.py` | 원천 경로를 `src/`로(이전: 세션 임시 업로드 경로). 상대 세션이 build.py를 고쳤다면 이 파일 대신 그쪽 build.py의 2~4행만 이 파일처럼 바꿀 것 |
| `build_legal.py` | `/tmp/site` → `_SITE_DIR` 2곳만 다름. 상대 세션 버전에 같은 2줄 수정을 적용해도 됨 |
| `verify2.py` `verify_acc.py` | 약관 전문 렌더링에 맞춘 기대치 2건 + 경로 |
| `verify_admin*.py` `verify_api.py` `verify_feedback.py` | `/tmp/site` 하드코딩 제거. 상대 세션이 이 파일들을 고쳤다면(예: `verify_admin.py`) 그쪽 버전에 아래 §3 규칙을 적용 |
| `supabase/README.md` | `feedback_cron_secret` GUC 절차 추가, 수치 정정 — 파트너 콘솔 세션도 README를 고쳤을 수 있으니 diff 후 병합 |
| `supabase/scripts/sync_templates.py` | docstring 1줄 |

## 3. 충돌 가능 파일 — 손으로 병합 (`_pathfix_reference/`는 참고용, 복사 금지)
`build2.py` `build_acc.py` `build_launch.py` `build_notify.py` `build_sitemap.py` `verify_launch.py` `site.config.json`은 상대 세션이 크게 고쳤다(prod 예시데이터 제거, legal 훅, 파트너 콘솔). **상대 세션 버전을 기준으로** 아래 규칙만 적용한다:

- `/tmp/site/…` 경로 → `_os_.path.join(_SITE_DIR, '…')`. 파일 상단에
  ```python
  import os as _os_
  _SITE_DIR = _os_.environ.get('MG_SITE_DIR') or _os_.path.dirname(_os_.path.abspath(__file__))
  ```
  (exec 되는 하위 스크립트는 `try: _SITE_DIR / except NameError:` 가드로 감싼다 — `_pathfix_reference/build_acc.py` 상단 참고)
- `verify_launch.py`: `SITE`·`BASELINE` 기본값을 스크립트 위치로, robots 검사는 "Disallow 두 줄 포함 여부"로(`_pathfix_reference/verify_launch.py` 9~10행, 274~277행 참고)
- `site.config.json`: `legal` 블록이 있는지 확인(상대 세션이 넣었음)

## 4. 재생성·검증
```
python3 build2.py && python3 build_notify.py && python3 build_sitemap.py && python3 supabase/scripts/sync_templates.py
python3 verify2.py; python3 verify3.py; python3 verify_acc.py; python3 verify_launch.py; python3 verify_api.py; python3 verify_feedback.py
python3 verify_admin.py; python3 verify_admin_ops.py; python3 verify_admin_members.py; python3 verify_admin_feedback.py; python3 verify_admin_partner.py
bash supabase/tests/run.sh      # Deno 설치 상태에서 PASS=13(06_partner_console 포함) FAIL=0
```
`_generated_reference/ko/index.html`·`en/index.html`은 이 패치 시점의 산출물(모바일 그리드 수정·사이트 카피 유지). 재빌드 결과에 `.problem .card .problem-icon{grid-column:1;grid-row:1/3` 가 있으면 그리드 수정이 살아 있는 것.

## 5. 끝나면
- `git init` → 첫 커밋 `v0.9.0-prelaunch` → 이후에는 세션이 둘이어도 브랜치로 분리(D-36).
- 이 폴더는 `_archive/`로 이동.
