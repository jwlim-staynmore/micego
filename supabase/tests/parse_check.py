#!/usr/bin/env python3
"""마이그레이션 SQL 파일을 pglast 로 파싱해 구문 오류를 잡는다."""
import sys
import glob
import pglast


def main(migrations_dir: str) -> int:
    files = sorted(glob.glob(migrations_dir.rstrip("/") + "/*.sql"))
    if not files:
        print(f"no .sql files found in {migrations_dir}")
        return 1
    ok = True
    for path in files:
        sql = open(path, encoding="utf-8").read()
        try:
            pglast.parse_sql(sql)
            print(f"  ok: {path}")
        except Exception as e:  # pglast.parser.ParseError et al.
            ok = False
            print(f"  PARSE ERROR: {path}: {e}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "migrations"))
