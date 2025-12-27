#!/usr/bin/env bash
set -euo pipefail

venv_py=".venv/bin/python"
if [[ -x "$venv_py" ]]; then
  "$venv_py" tools/dump_repo.py --out out/repo_dump.txt --include-diff
else
  python3 tools/dump_repo.py --out out/repo_dump.txt --include-diff
fi
