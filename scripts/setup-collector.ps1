# Cria .venv do coletor e instala requirements.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Collector = Join-Path $Root "services\collector"
$VenvPython = Join-Path $Collector ".venv\Scripts\python.exe"

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

if (-not (Test-Path $VenvPython)) {
  $py = Get-RealPython
  if (-not $py) { throw "Python nao encontrado. Rode scripts/setup-python.ps1 primeiro." }
  Write-Host "criando venv com $py ..."
  & $py -m venv (Join-Path $Collector ".venv")
}

Write-Host "instalando requirements..."
& $VenvPython -m pip install --upgrade pip
& $VenvPython -m pip install -r (Join-Path $Collector "requirements.txt")
Write-Host "rodando testes offline..."
Push-Location $Collector
try {
  & $VenvPython -m pytest -q
  if ($LASTEXITCODE -ne 0) { throw "pytest falhou" }
} finally {
  Pop-Location
}
Write-Host "coletor pronto"
