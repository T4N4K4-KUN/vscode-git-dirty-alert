param(
  [ValidateSet("dump", "devhost", "vsix", "apply")]
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

if ($Mode -eq "vsix") {
  $cmd = Get-Command cmd -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "cmd.exe not found."
  }

  $cmdLine = 'set PATH=C:\\Program Files\\nodejs;%APPDATA%\\npm;%PATH% && vsce package'
  & $cmd.Path /c $cmdLine
  exit $LASTEXITCODE
}

if ($Mode -eq "apply") {
  $cmd = Get-Command cmd -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "cmd.exe not found."
  }

  $code = Get-Command code -ErrorAction SilentlyContinue
  if (-not $code) {
    throw "VSCode CLI 'code' not found in PATH."
  }

  $cmdLine = 'set PATH=C:\\Program Files\\nodejs;%APPDATA%\\npm;%PATH% && vsce package'
  & $cmd.Path /c $cmdLine
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $pkg = Get-Content -Path package.json | ConvertFrom-Json
  $vsix = "vscode-git-dirty-alert-$($pkg.version).vsix"
  if (-not (Test-Path $vsix)) {
    throw "VSIX not found: $vsix"
  }

  & $code.Path --install-extension $vsix --force
  exit $LASTEXITCODE
}

$venvPy = ".\\.venv\\Scripts\\python.exe"
if (Test-Path $venvPy) {
  & $venvPy tools\\dump_repo.py --out repo_dump.txt --include-diff
} else {
  python tools\\dump_repo.py --out repo_dump.txt --include-diff
}
