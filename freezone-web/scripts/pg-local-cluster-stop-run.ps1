# Stop PostgreSQL from .pgdata-run (port 5435)
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".."
$pgRoot = Join-Path $root ".pgdata-run"
$bin = "C:\Program Files\PostgreSQL\16\bin"
$lib = "C:\Program Files\PostgreSQL\16\lib"
if (-not (Test-Path (Join-Path $bin "pg_ctl.exe"))) { exit 1 }
$env:PATH = "$bin;$lib;" + $env:PATH
& pg_ctl -D $pgRoot stop
exit $LASTEXITCODE
