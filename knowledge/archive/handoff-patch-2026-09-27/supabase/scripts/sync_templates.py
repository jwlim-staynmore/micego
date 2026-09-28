#!/usr/bin/env python3
"""docs/notification-templates.json + emails/*.html 를 읽어
functions/_shared/templates.gen.ts 를 만든다.

사용:
  python3 supabase/scripts/sync_templates.py [repo_root]

repo_root 기본값은 이 스크립트의 두 단계 위 디렉터리 (즉 micego-site/ 루트),
docs/notification-templates.json 과 emails/*.html 을 그 아래에서 찾는다.
"""
import json
import sys
import os


def main(root: str) -> int:
    tpl_path = os.path.join(root, "docs", "notification-templates.json")
    emails_dir = os.path.join(root, "emails")
    out_path = os.path.join(root, "supabase", "functions", "_shared", "templates.gen.ts")

    with open(tpl_path, encoding="utf-8") as f:
        data = json.load(f)

    templates = data["templates"]
    email_html = {}
    for t in templates:
        email = t.get("email")
        if email and email.get("file"):
            fname = os.path.basename(email["file"])
            fpath = os.path.join(emails_dir, fname)
            if os.path.exists(fpath):
                with open(fpath, encoding="utf-8") as ef:
                    email_html[t["id"]] = ef.read()

    lines = []
    lines.append("// 이 파일은 생성됩니다. supabase/scripts/sync_templates.py 로 다시 만드세요.")
    lines.append("// source: docs/notification-templates.json v" + str(data.get("version")) + " + emails/*.html")
    lines.append("")
    lines.append("export interface TemplateVar { key: string; kr_name: string; description: string; sample: string; maxLen?: number; }")
    lines.append("export interface TemplateDef {")
    lines.append("  id: string; name: string; recipient: string; mode: string; language: string;")
    lines.append("  channels: { email: boolean; alimtalk: boolean; lms: boolean; sms: boolean };")
    lines.append("  email?: { subject: string; subject_round2?: string; preheader?: string; cc?: string; optional_blocks: string[] };")
    lines.append("  alimtalk?: { code: string; body: string; buttons: { name: string; url: string }[]; fallback_title: string; fallback_body: string };")
    lines.append("  sms?: { body: string; limit_bytes: number };")
    lines.append("  variables: TemplateVar[];")
    lines.append("}")
    lines.append("")

    lines.append("export const TEMPLATES: Record<string, TemplateDef> = " + json.dumps(
        {
            t["id"]: {
                "id": t["id"],
                "name": t["name"],
                "recipient": t["recipient"],
                "mode": t["mode"],
                "language": t.get("language", "ko"),
                "channels": t["channels"],
                **({"email": {
                    "subject": t["email"]["subject"],
                    **({"subject_round2": t["email"]["subject_round2"]} if t["email"].get("subject_round2") else {}),
                    "preheader": t["email"].get("preheader", ""),
                    "cc": t["email"].get("cc", ""),
                    "optional_blocks": t["email"].get("optional_blocks", []),
                }} if t.get("email") else {}),
                **({"alimtalk": {
                    "code": t["alimtalk"]["code"],
                    "body": t["alimtalk"]["body"],
                    "buttons": [{"name": b["name"], "url": b["url"]} for b in t["alimtalk"].get("buttons", [])],
                    "fallback_title": t["alimtalk"]["fallback_title"],
                    "fallback_body": t["alimtalk"]["fallback_body"],
                }} if t.get("alimtalk") else {}),
                **({"sms": {
                    "body": t["sms"]["body"],
                    "limit_bytes": t["sms"].get("limit_bytes", 90),
                }} if t.get("sms") else {}),
                "variables": [
                    {"key": v["key"], "kr_name": v["kr_name"], "description": v["description"], "sample": v["sample"], **({"maxLen": v["maxLen"]} if "maxLen" in v else {})}
                    for v in t.get("variables", [])
                ],
            }
            for t in templates
        },
        ensure_ascii=False, indent=2,
    ) + ";")
    lines.append("")
    lines.append("export const EMAIL_HTML: Record<string, string> = " + json.dumps(email_html, ensure_ascii=False) + ";")
    lines.append("")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"wrote {out_path} ({len(templates)} templates, {len(email_html)} email bodies)")
    return 0


if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    sys.exit(main(root))
