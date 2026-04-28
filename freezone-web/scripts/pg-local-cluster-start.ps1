# Start embedded PostgreSQL (project .pgdata) on port 5433 - use when Docker is unavailable
# and the system PostgreSQL service already uses 5432. Requires PostgreSQL 16+ bin in Program Files.
# Use ASCII-only strings so Windows PowerShell 5.x parses this file reliably.
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".."
$pgRoot = Join-Path $root ".pgdata"
$bin = "C:\Program Files\PostgreSQL\16\bin"
$lib = "C:\Program Files\PostgreSQL\16\lib"
if (-not (Test-Path (Join-Path $bin "pg_ctl.exe"))) {
  Write-Host "[pg-local-cluster] PostgreSQL bin not found at $bin. Install PostgreSQL 16 (winget install PostgreSQL.PostgreSQL.16)." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $pgRoot)) {
  Write-Host "[pg-local-cluster] Missing .pgdata - run first-time setup, or use Docker: npm run db:local" -ForegroundColor Red
  exit 1
}
$env:PATH = "$bin;$lib;" + $env:PATH
$status = & pg_ctl -D $pgRoot status 2>&1
if ($status -match 'server is running') {
  Write-Host "[pg-local-cluster] Already running."
  exit 0
}
& pg_ctl -D $pgRoot -l (Join-Path $pgRoot "logfile") start
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "[pg-local-cluster] Started (port 5433). DATABASE_URL should use localhost:5433"
