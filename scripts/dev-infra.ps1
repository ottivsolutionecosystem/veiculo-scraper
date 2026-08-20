# Sobe Postgres 16 e Redis locais sem Docker (binarios em .local/).
# Uso: powershell -File scripts/dev-infra.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Local = Join-Path $Root ".local"
$PgDir = Join-Path $Local "pgsql"
$PgData = Join-Path $Local "pgdata"
$RedisDir = Join-Path $Local "redis"
$LogDir = Join-Path $Local "logs"

$PgUrl = "https://github.com/theseus-rs/postgresql-binaries/releases/download/16.14.0/postgresql-16.14.0-x86_64-pc-windows-msvc.zip"
$RedisUrl = "https://github.com/redis-windows/redis-windows/releases/download/8.10.0/Redis-8.10.0-Windows-x64-msys2.zip"

New-Item -ItemType Directory -Force -Path $Local, $LogDir | Out-Null

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

function Find-File($Dir, $Name) {
  return Get-ChildItem -Path $Dir -Recurse -Filter $Name -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}

function Get-Zip($Url, $DestZip) {
  if (Test-Path $DestZip) {
    Write-Host "ja baixado: $DestZip"
    return
  }
  Write-Host "baixando $Url ..."
  Invoke-WebRequest -Uri $Url -OutFile $DestZip -UseBasicParsing
}

if (-not (Find-File $PgDir "initdb.exe")) {
  $zip = Join-Path $Local "postgres.zip"
  Get-Zip $PgUrl $zip
  Write-Host "extraindo Postgres..."
  if (Test-Path $PgDir) { Remove-Item -Recurse -Force $PgDir }
  Expand-Archive -Path $zip -DestinationPath $PgDir -Force
}

if (-not (Find-File $RedisDir "redis-server.exe")) {
  $zip = Join-Path $Local "redis.zip"
  Get-Zip $RedisUrl $zip
  Write-Host "extraindo Redis..."
  if (Test-Path $RedisDir) { Remove-Item -Recurse -Force $RedisDir }
  Expand-Archive -Path $zip -DestinationPath $RedisDir -Force
}

$InitDb = Find-File $PgDir "initdb.exe"
$PgCtl = Find-File $PgDir "pg_ctl.exe"
$Psql = Find-File $PgDir "psql.exe"
$Createdb = Find-File $PgDir "createdb.exe"
$RedisServer = Find-File $RedisDir "redis-server.exe"

if (-not $InitDb -or -not $PgCtl -or -not $Psql) {
  throw "binarios do Postgres nao encontrados em $PgDir"
}
if (-not $RedisServer) {
  throw "redis-server.exe nao encontrado em $RedisDir"
}

if (-not (Test-Path (Join-Path $PgData "PG_VERSION"))) {
  Write-Host "inicializando cluster Postgres..."
  $pwFile = Join-Path $Local "pgpass.txt"
  Set-Content -Path $pwFile -Value "devpassword" -NoNewline
  & $InitDb -D $PgData -U root --pwfile=$pwFile --auth=scram-sha-256 --locale=C --encoding=UTF8
  if ($LASTEXITCODE -ne 0) { throw "initdb falhou" }
  Add-Content -Path (Join-Path $PgData "postgresql.conf") "`nlisten_addresses = '127.0.0.1'`nport = 5432`n"
  @"
host    all    all    127.0.0.1/32    scram-sha-256
host    all    all    ::1/128         scram-sha-256
"@ | Add-Content -Path (Join-Path $PgData "pg_hba.conf")
}

if (-not (Test-PortOpen 5432)) {
  Write-Host "iniciando Postgres na :5432..."
  $pgLog = Join-Path $LogDir "postgres.log"
  & $PgCtl -D $PgData -l $pgLog start
  if ($LASTEXITCODE -ne 0) { throw "pg_ctl start falhou. log: $pgLog" }
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-PortOpen 5432) { $ready = $true; break }
  }
  if (-not $ready) { throw "Postgres nao abriu a porta 5432" }
} else {
  Write-Host "Postgres ja esta na :5432"
}

$env:PGPASSWORD = "devpassword"
$dbName = (& $Psql -h 127.0.0.1 -U root -d postgres -tAc "SELECT datname FROM pg_database WHERE datname='veiculo_scraper_dev'").Trim()
if ($dbName -ne "veiculo_scraper_dev") {
  Write-Host "criando banco veiculo_scraper_dev..."
  & $Psql -h 127.0.0.1 -U root -d postgres -c "CREATE DATABASE veiculo_scraper_dev OWNER root"
  if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE falhou" }
}

if (-not (Test-PortOpen 6379)) {
  Write-Host "iniciando Redis na :6379..."
  $redisOut = Join-Path $LogDir "redis.out.log"
  $redisErr = Join-Path $LogDir "redis.err.log"
  Start-Process -FilePath $RedisServer -ArgumentList "--port","6379" -WindowStyle Hidden -RedirectStandardOutput $redisOut -RedirectStandardError $redisErr
  $ready = $false
  for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-PortOpen 6379) { $ready = $true; break }
  }
  if (-not $ready) { throw "Redis nao abriu a porta 6379. log: $redisErr" }
} else {
  Write-Host "Redis ja esta na :6379"
}

Write-Host "infra pronta: postgres :5432 / redis :6379"
