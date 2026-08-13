#!/usr/bin/env python
"""Sync stack matrix index static assets into autotests-ai-app backend static.

SSOT: autotests-ai-multistack-app deploy/matrix.yaml → sync-stack-matrix.py → matrix.json
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
REF_ROOT = APP_ROOT.parents[1] / "autotests-ai-multistack-home" / "autotests-ai-multistack-app"
STATIC = APP_ROOT / "backend" / "src" / "main" / "resources" / "static" / "stack"
SHARED = REF_ROOT / "frontend" / "_shared" / "frontend-javascript-app"
PAGE_CSS = (
    REF_ROOT
    / "frontend"
    / "typescript"
    / "frontend-typescript-react"
    / "css"
    / "page.css"
)


def copy_plaque_divider(src: Path, dest: Path) -> None:
    """Drop @import tokens.css — stack uses landing tokens + stack-tokens overlay."""
    text = src.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)
    if lines and lines[0].lstrip().startswith("@import"):
        text = "".join(lines[1:])
    dest.write_text(text, encoding="utf-8")


def main() -> int:
    if not REF_ROOT.is_dir():
        print(f"Missing autotests-ai-multistack-app at {REF_ROOT}", file=sys.stderr)
        return 1

    sync = REF_ROOT / "frontend" / "scripts" / "sync-stack-matrix.py"
    subprocess.run([sys.executable, str(sync)], check=True, cwd=REF_ROOT)

    STATIC.mkdir(parents=True, exist_ok=True)
    (STATIC / "js").mkdir(exist_ok=True)
    (STATIC / "css").mkdir(exist_ok=True)
    (STATIC / "templates").mkdir(exist_ok=True)

    shutil.copy2(SHARED / "stack" / "matrix.json", STATIC / "matrix.json")

    for name in ("stack-matrix.js", "poll-toggle.js", "header.js", "theme-icons.js", "dom-utils.js", "header-metrics-wrap.js"):
        shutil.copy2(SHARED / "js" / name, STATIC / "js" / name)

    for name in ("stack-page.css", "poll-toggle.css", "badge.css", "panel.css", "sticky.css", "header.css", "input.css"):
        src = SHARED / "css" / name
        if src.is_file():
            shutil.copy2(src, STATIC / "css" / name)

    plaque_src = SHARED / "css" / "plaque-divider.css"
    if plaque_src.is_file():
        copy_plaque_divider(plaque_src, STATIC / "css" / "plaque-divider.css")

    if PAGE_CSS.is_file():
        shutil.copy2(PAGE_CSS, STATIC / "css" / "page.css")

    header_tpl = SHARED / "templates" / "header.html"
    if header_tpl.is_file():
        shutil.copy2(header_tpl, STATIC / "templates" / "header.html")

    # stack-tokens.css is hand-maintained in repo (landing token patch)

    print(f"OK: stack static → {STATIC.relative_to(APP_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
