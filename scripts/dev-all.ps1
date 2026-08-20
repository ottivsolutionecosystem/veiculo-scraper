# Sobe infra + API + worker + web. Idempotente: nao duplica o que ja esta no ar.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Test-PortOpen([int]$Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $client.Connect("127.0.0.1", $Port)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Test-WorkerRunning {
  $procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue
  return [bool]($procs | Where-Object { $_.CommandLine -match "worker\.ts" })
}

function Test-CollectorRunning {
  $procs = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue
  return [bool]($procs | Where-Object { $_.CommandLine -match "collector-loop\.ps1" })
}

Write-Host "1/5 infra (Postgres + Redis)..."
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "dev-infra.ps1")
if ($LASTEXITCODE -ne 0) { throw "infra:up falhou" }

if (-not (Test-PortOpen 3001)) {
  Write-Host "2/5 API :3001..."
  Start-Process -FilePath "npm" -ArgumentList "run","dev:api" -WorkingDirectory $Root -WindowStyle Minimized
} else {
  Write-Host "2/5 API ja esta na :3001"
}

if (-not (Test-WorkerRunning)) {
  Write-Host "3/5 worker..."
  Start-Process -FilePath "npm" -ArgumentList "run","dev:worker" -WorkingDirectory $Root -WindowStyle Minimized
} else {
  Write-Host "3/5 worker ja esta rodando"
}

if (-not (Test-PortOpen 3000)) {
  Write-Host "4/5 web :3000..."
  Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory $Root -WindowStyle Minimized
} else {
  Write-Host "4/5 web ja esta na :3000"
}

$venvPy = Join-Path $Root "services\collector\.venv\Scripts\python.exe"
if (Test-Path $venvPy) {
  if (-not $env:BOT_CONTACT_URL -or -not $env:BOT_CONTACT_EMAIL) {
    Write-Host "5/5 coletor pulado (defina BOT_CONTACT_URL e BOT_CONTACT_EMAIL, depois npm run dev:collector)"
  } elseif (-not (Test-CollectorRunning)) {
    Write-Host "5/5 coletor (loop de pedidos)..."
    Start-Process -FilePath "powershell" -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File",(Join-Path $PSScriptRoot "collector-loop.ps1") -WorkingDirectory $Root -WindowStyle Minimized
  } else {
    Write-Host "5/5 coletor ja esta rodando"
  }
} else {
  Write-Host "5/5 coletor pulado (rode npm run collector:setup)"
}

$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  if ((Test-PortOpen 3000) -and (Test-PortOpen 3001)) { $ready = $true; break }
  Start-Sleep -Seconds 1
}
if (-not $ready) { throw "API ou web nao subiram a tempo" }

Write-Host ""
Write-Host "Pronto."
Write-Host "  painel  http://localhost:3000"
Write-Host "  API     http://localhost:3001/health"
