# Le execucoes_solicitadas e roda a coleta. Sem RPC: so Postgres.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Collector = Join-Path $Root "services\collector"
$VenvPython = Join-Path $Collector ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
  throw "venv do coletor ausente. Rode: npm run collector:setup"
}

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql://root:devpassword@127.0.0.1:5432/veiculo_scraper_dev"
}
$env:PYTHONUNBUFFERED = "1"

$hasBot = $env:BOT_CONTACT_URL -and $env:BOT_CONTACT_EMAIL
if (-not $hasBot) {
  Write-Host "aviso: BOT_CONTACT_* ausentes — so processa ingestao assistida."
}

Write-Host "coletor em loop (ingestao+pedidos shopcar a cada 15s). Ctrl+C para parar."
Set-Location $Collector
while ($true) {
  & $VenvPython -m captacao_bot.cli ingerir --fonte shopcar
  if ($hasBot) {
    & $VenvPython -m captacao_bot.cli pedidos --fonte shopcar
  }
  Start-Sleep -Seconds 15
}
