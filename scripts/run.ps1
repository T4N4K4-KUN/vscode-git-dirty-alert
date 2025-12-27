# scripts/run.ps1
$ErrorActionPreference = "Stop"

$venvPy = ".\\.venv\\Scripts\\python.exe"
if (Test-Path $venvPy) {
  & $venvPy tools\\dump_repo.py --out repo_dump.txt --include-diff
} else {
  python tools\\dump_repo.py --out repo_dump.txt --include-diff
}
