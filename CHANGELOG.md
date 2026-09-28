# CHANGELOG

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

### 상태
- 프론트·콘솔·백엔드 코드 완료, 배포 전. 검증 10종 0 FAILS, 백엔드 테스트 PASS=12(Deno 단위 테스트 91개 포함).
