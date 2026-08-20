# Le execucoes_solicitadas e roda a coleta. Sem RPC: so Postgres.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Collector = Join-Path $Root "services\collector"
$VenvPython = Join-Path $Collector ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
  throw "venv do coletor ausente. Rode: npm run collector:setup"
}

if (-not $env:BOT_CONTACT_URL -or -not $env:BOT_CONTACT_EMAIL) {
  throw "Defina BOT_CONTACT_URL e BOT_CONTACT_EMAIL (identificacao do bot no User-Agent). Ex.: `$env:BOT_CONTACT_URL='https://seudominio.com.br/bot'"
}

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql://root:devpassword@127.0.0.1:5432/veiculo_scraper_dev"
}
$env:PYTHONUNBUFFERED = "1"

Write-Host "coletor em loop (pedidos shopcar a cada 15s). Ctrl+C para parar."
Set-Location $Collector
while ($true) {
  & $VenvPython -m captacao_bot.cli pedidos --fonte shopcar
  Start-Sleep -Seconds 15
}
