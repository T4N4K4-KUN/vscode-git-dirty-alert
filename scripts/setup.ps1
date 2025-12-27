# scripts/setup.ps1
$ErrorActionPreference = "Stop"

if (!(Test-Path ".\\.venv\\Scripts\\python.exe")) {
  python -m venv .venv
}

$venvPy = ".\\.venv\\Scripts\\python.exe"

& $venvPy -m pip install --upgrade pip
if (Test-Path "requirements.txt") {
  & $venvPy -m pip install -r requirements.txt
}

Write-Host "[OK] setup completed."
