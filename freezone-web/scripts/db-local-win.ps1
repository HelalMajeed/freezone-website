# Docker Postgres -> prisma migrate deploy -> prisma db seed (Windows)
# Use ASCII-only messages so PowerShell 5.x parses the file reliably.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$apiDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\freezone-api")).Path

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "[db-local-win] Docker not in PATH. Install Docker Desktop, start it, then retry." -ForegroundColor Yellow
  exit 1
}

Write-Host "[db-local-win] docker compose up -d ..."
docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[db-local-win] Waiting 15s for Postgres to be ready..."
Start-Sleep -Seconds 15

Write-Host "[db-local-win] npm run db:migrate:deploy (freezone-api) ..."
Push-Location $apiDir
try {
  npm run db:migrate:deploy
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "[db-local-win] npm run db:seed (freezone-api) ..."
  npm run db:seed
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
