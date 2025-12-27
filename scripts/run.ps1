param(
  [ValidateSet("dump", "devhost")]
  [string]$Mode = "dump"
)

# scripts/run.ps1
$ErrorActionPreference = "Stop"

if ($Mode -eq "devhost") {
  $code = Get-Command code -ErrorAction SilentlyContinue
  if (-not $code) {
    throw "VSCode CLI 'code' not found in PATH."
  }

  $repoPath = (Get-Location).Path
  $folderUri = "file:///" + ($repoPath -replace "\\", "/")
  & $code.Path --new-window --extensionDevelopmentPath $repoPath --folder-uri $folderUri
  exit $LASTEXITCODE
}

$venvPy = ".\\.venv\\Scripts\\python.exe"
if (Test-Path $venvPy) {
  & $venvPy tools\\dump_repo.py --out repo_dump.txt --include-diff
} else {
  python tools\\dump_repo.py --out repo_dump.txt --include-diff
}
