#!/usr/bin/env python
"""Sync stack matrix index static assets into autotests-ai-app backend static.

SSOT: reference-app-copy deploy/matrix.yaml → sync-stack-matrix.py → matrix.json
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
REF_ROOT = APP_ROOT.parents[1] / "reference-home" / "reference-app-copy"
STATIC = APP_ROOT / "backend" / "src" / "main" / "resources" / "static" / "stack"
SHARED = REF_ROOT / "frontend" / "_shared" / "frontend-javascript-app"


def main() -> int:
    if not REF_ROOT.is_dir():
        print(f"Missing reference-app-copy at {REF_ROOT}", file=sys.stderr)
        return 1

    sync = REF_ROOT / "frontend" / "scripts" / "sync-stack-matrix.py"
    subprocess.run([sys.executable, str(sync)], check=True, cwd=REF_ROOT)

    STATIC.mkdir(parents=True, exist_ok=True)
    (STATIC / "js").mkdir(exist_ok=True)
    (STATIC / "css").mkdir(exist_ok=True)

    shutil.copy2(SHARED / "stack" / "matrix.json", STATIC / "matrix.json")

    for name in ("stack-matrix.js", "poll-toggle.js"):
        shutil.copy2(SHARED / "js" / name, STATIC / "js" / name)

    for name in ("stack-page.css", "poll-toggle.css", "badge.css"):
        src = SHARED / "css" / name
        if src.is_file():
            shutil.copy2(src, STATIC / "css" / name)

    print(f"OK: stack static → {STATIC.relative_to(APP_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
