# Start PostgreSQL from a cloned datadir (.pgdata-run), port 5435 - same data as .pgdata when 5433 is stuck.
# Log under %TEMP% avoids permission issues on .pgdata\logfile.
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".."
$pgRoot = Join-Path $root ".pgdata-run"
$bin = "C:\Program Files\PostgreSQL\16\bin"
$lib = "C:\Program Files\PostgreSQL\16\lib"
if (-not (Test-Path (Join-Path $bin "pg_ctl.exe"))) {
  Write-Host "[pg-local-cluster-run] PostgreSQL bin not found at $bin." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $pgRoot)) {
  Write-Host "[pg-local-cluster-run] Missing .pgdata-run - clone freezone-web/.pgdata once (see .env comment)." -ForegroundColor Red
  exit 1
}
$env:PATH = "$bin;$lib;" + $env:PATH
$log = Join-Path $env:TEMP "freezone-pgdata-run.log"
$status = & pg_ctl -D $pgRoot status 2>&1
if ($status -match 'server is running') {
  Write-Host "[pg-local-cluster-run] Already running (.pgdata-run, port 5435)."
  exit 0
}
& pg_ctl -D $pgRoot -l $log start
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "[pg-local-cluster-run] Started - DATABASE_URL should use 127.0.0.1:5435 (log: $log)"
