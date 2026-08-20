# Instala Python 3.12 no perfil do usuario, se ainda nao houver um python de verdade.
$ErrorActionPreference = "Stop"

function Get-RealPython {
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
    "$env:ProgramFiles\Python312\python.exe",
    "$env:ProgramFiles\Python313\python.exe"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  $cmd = Get-Command python -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source -notmatch "WindowsApps") { return $cmd.Source }
  return $null
}

$existing = Get-RealPython
if ($existing) {
  Write-Host "python ja instalado: $existing"
  & $existing --version
  exit 0
}

Write-Host "instalando Python 3.12 (winget, escopo usuario)..."
winget install --id Python.Python.3.12 -e --scope user --accept-package-agreements --accept-source-agreements --disable-interactivity
if ($LASTEXITCODE -ne 0) {
  Write-Host "winget falhou, baixando instalador oficial..."
  $tmp = Join-Path $env:TEMP "python-3.12.10-amd64.exe"
  Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe" -OutFile $tmp -UseBasicParsing
  & $tmp /quiet InstallAllUsers=0 PrependPath=1 Include_test=0 SimpleInstall=1
}

$py = Get-RealPython
if (-not $py) { throw "Python instalou mas nao achei o python.exe. Abra um terminal novo e rode de novo." }
Write-Host "python ok: $py"
& $py --version
