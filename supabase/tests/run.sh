#!/usr/bin/env bash
# MICEGO backend test runner. See supabase/README.md for prerequisites.
# Usage: supabase/tests/run.sh
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPA="$(cd "$HERE/.." && pwd)"
SCRATCH="${MG_SCRATCH:-/tmp/mg_test_scratch}"
PGBIN="${MG_PGBIN:-/usr/lib/postgresql/16/bin}"
PGPORT="${MG_PGPORT:-54329}"
PGDATA_DIR="${MG_PGDATA:-/tmp/mgpg_ci/data}"
PGRUN_DIR="${MG_PGRUN:-/tmp/mgpg_ci/run}"
DENO_BIN="${MG_DENO_BIN:-$SCRATCH/deno}"
PYTHON_BIN="${MG_PYTHON:-python3}"

FAIL=0
PASS=0
SKIP=0
step() { echo; echo "== $1 =="; }
ok()   { PASS=$((PASS+1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL+1)); echo "  FAIL: $1"; }
skip() { SKIP=$((SKIP+1)); echo "  SKIP: $1"; }

mkdir -p "$SCRATCH"

# ---------- 1) pglast: 모든 마이그레이션 구문 파싱 ----------
step "1) pglast parse (migrations/*.sql)"
if "$PYTHON_BIN" -c "import pglast" 2>/dev/null; then
  if "$PYTHON_BIN" "$HERE/parse_check.py" "$SUPA/migrations" ; then
    ok "pglast parse"
  else
    fail "pglast parse"
  fi
else
  skip "pglast not installed (pip install pglast)"
fi

# ---------- 2) 실제 PostgreSQL 16: 스키마 적용 + SQL DO-block 테스트 ----------
step "2) PostgreSQL 16 apply + SQL tests"
if [ -x "$PGBIN/initdb" ]; then
  mkdir -p "$(dirname "$PGDATA_DIR")" "$PGRUN_DIR"
  chown -R postgres:postgres "$(dirname "$PGDATA_DIR")" "$PGRUN_DIR" 2>/dev/null || true
  if [ ! -d "$PGDATA_DIR" ]; then
    runuser -u postgres -- "$PGBIN/initdb" -D "$PGDATA_DIR" -E UTF8 --no-locale >/tmp/mg_initdb.log 2>&1
  fi
  runuser -u postgres -- "$PGBIN/pg_ctl" -D "$PGDATA_DIR" -o "-p $PGPORT -k $PGRUN_DIR" -l /tmp/mg_pg.log start >/tmp/mg_pgctl.log 2>&1
  sleep 1
  PSQL="runuser -u postgres -- $PGBIN/psql -h $PGRUN_DIR -p $PGPORT -v ON_ERROR_STOP=1"

  $PSQL -d postgres -c "drop database if exists mgci;" >/tmp/mg_apply.log 2>&1
  $PSQL -d postgres -c "create database mgci;" >>/tmp/mg_apply.log 2>&1
  $PSQL -d mgci -f "$SUPA/tests/00_supabase_shim.sql" >>/tmp/mg_apply.log 2>&1

  APPLY_OK=1
  for f in "$SUPA"/migrations/*.sql; do
    $PSQL -d mgci -f "$f" >>/tmp/mg_apply.log 2>&1 || APPLY_OK=0
  done
  if grep -qi "^psql:.*ERROR" /tmp/mg_apply.log; then APPLY_OK=0; fi

  if [ "$APPLY_OK" = "1" ]; then
    ok "migrations apply cleanly"
    $PSQL -d mgci -f "$SUPA/seed.sql" >>/tmp/mg_apply.log 2>&1 && ok "seed.sql applies" || fail "seed.sql apply"
    $PSQL -d mgci -f "$SUPA/seed_demo.sql" >>/tmp/mg_apply.log 2>&1 && ok "seed_demo.sql applies" || fail "seed_demo.sql apply"

    for t in "$SUPA"/tests/sql/*.sql; do
      name="$(basename "$t")"
      out="$($PSQL -d mgci -f "$t" 2>&1)"
      echo "$out" > "/tmp/mg_test_$name.log"
      if echo "$out" | grep -qi "^psql:.*ERROR"; then
        fail "$name"
        echo "$out" | sed -n '1,40p'
      else
        ok "$name"
      fi
    done

    # admin_snapshot() top-level keys check (operator JWT claim 설정 후 단일 문장으로 호출: SET 명령의
    # 명령태그 텍스트가 -t 출력에 섞이는 것을 피한다)
    keys_out="$($PSQL -d mgci -tAc "
      with cfg as (select set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"app_metadata\":{\"role\":\"operator\"}}', true) as _),
           snap as (select admin_snapshot() as j from cfg)
      select string_agg(k, ',' order by k) from snap, jsonb_object_keys(snap.j) k;
    " 2>&1)"
    expect_keys="failures,holidays,inaccMarks,interventions,invArchive,linkRequests,me,memberAudit,memberLog,members,metrics,partnerOrgs,partners,rfps,sendLog,settlements,shareLinks,tick"
    got_keys="$(echo "$keys_out" | tr -d ' \n')"
    if [ "$got_keys" = "$expect_keys" ]; then
      ok "admin_snapshot() top-level keys match MOCK_DATA"
    else
      fail "admin_snapshot() keys mismatch: got [$got_keys] want [$expect_keys]"
    fi
  else
    fail "migrations did not apply cleanly (see /tmp/mg_apply.log)"
    tail -60 /tmp/mg_apply.log
  fi

  runuser -u postgres -- "$PGBIN/pg_ctl" -D "$PGDATA_DIR" stop >/tmp/mg_pgctl_stop.log 2>&1
else
  skip "PostgreSQL 16 binaries not found at $PGBIN"
fi

# ---------- 3) Deno: check + test ----------
step "3) Deno check/test (functions)"
if [ -x "$DENO_BIN" ] || command -v deno >/dev/null 2>&1; then
  DENO="${DENO_BIN}"
  command -v deno >/dev/null 2>&1 && [ ! -x "$DENO_BIN" ] && DENO="deno"
  if "$DENO" check "$SUPA"/functions/**/*.ts >/tmp/mg_deno_check.log 2>&1; then
    ok "deno check"
  else
    fail "deno check"
    tail -60 /tmp/mg_deno_check.log
  fi
  if "$DENO" test --allow-env --allow-read "$SUPA/functions/_tests/" >/tmp/mg_deno_test.log 2>&1; then
    ok "deno test"
  else
    fail "deno test"
    tail -120 /tmp/mg_deno_test.log
  fi
else
  echo "  Deno not found; falling back to esbuild syntax gate"
  if command -v npx >/dev/null 2>&1; then
    ESBUILD_OK=1
    for f in "$SUPA"/functions/*/index.ts "$SUPA"/functions/_shared/*.ts "$SUPA"/functions/_shared/notify/*.ts; do
      [ -f "$f" ] || continue
      npx -y esbuild "$f" --log-level=error --bundle=false --outfile=/dev/null >/tmp/mg_esbuild.log 2>&1 || { ESBUILD_OK=0; cat /tmp/mg_esbuild.log; }
    done
    if [ "$ESBUILD_OK" = "1" ]; then ok "esbuild syntax gate"; else fail "esbuild syntax gate"; fi
  else
    skip "neither deno nor npx available"
  fi
fi

echo
echo "===================================="
echo " PASS=$PASS FAIL=$FAIL SKIP=$SKIP"
echo "===================================="
[ "$FAIL" -eq 0 ]
