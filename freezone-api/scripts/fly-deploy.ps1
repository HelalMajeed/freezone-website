#Requires -Version 5.1
<#
.SYNOPSIS
  Fly.io: list secrets, optionally set DATABASE_URL, deploy freezone-api, run prisma migrate deploy via SSH.

.DESCRIPTION
  1) flyctl auth whoami (must be logged in: flyctl auth login, or set FLY_API_TOKEN)
  2) flyctl secrets list
  3) If $env:DATABASE_URL is set: flyctl secrets set DATABASE_URL=... (deploy releases secrets)
  4) flyctl deploy (cwd = monorepo root so root fly.toml + Dockerfile SERVICE_PATH apply)
  5) flyctl ssh ... npx prisma migrate deploy

  Environment:
    FLY_APP_NAME   Fly app name (default: freezone-website)
    DATABASE_URL   If set, applied as a Fly secret before deploy
    FLY_API_TOKEN  Optional; non-interactive auth (https://fly.io/docs/flyctl/installing/)

  Usage (PowerShell, from repo root or anywhere):
    $env:DATABASE_URL = "postgresql://..."   # optional if secret already correct
    .\freezone-api\scripts\fly-deploy.ps1
#>
$ErrorActionPreference = "Stop"

function Get-Flyctl {
  $cmd = Get-Command flyctl -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $wingetLink = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\flyctl.exe"
  if (Test-Path $wingetLink) { return $wingetLink }
  $wingetPkg = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "flyctl.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  if ($wingetPkg) { return $wingetPkg }
  throw "flyctl not found. Install: winget install Fly-io.flyctl -e --accept-source-agreements --accept-package-agreements"
}

$flyctl = Get-Flyctl
function Invoke-Fly {
  & $flyctl @args
  if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

$app = if ($env:FLY_APP_NAME) { $env:FLY_APP_NAME } else { "freezone-website" }
# freezone-api/scripts -> monorepo root (parent of freezone-api)
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repoRoot

Write-Host "==> flyctl auth" -ForegroundColor Cyan
Invoke-Fly auth whoami

Write-Host "==> secrets list ($app)" -ForegroundColor Cyan
Invoke-Fly secrets list -a $app

if ($env:DATABASE_URL) {
  Write-Host "==> secrets set DATABASE_URL ($app) [value from env, not printed]" -ForegroundColor Cyan
  Invoke-Fly secrets set ("DATABASE_URL={0}" -f $env:DATABASE_URL) -a $app
} else {
  Write-Host "==> skip secrets set (set DATABASE_URL env to push a new DB URL)" -ForegroundColor Yellow
}

Write-Host "==> deploy ($app) from $repoRoot" -ForegroundColor Cyan
Invoke-Fly deploy -a $app

Write-Host "==> prisma migrate deploy via SSH ($app)" -ForegroundColor Cyan
Invoke-Fly ssh console -a $app -C "cd /app && npx prisma migrate deploy"

if ($env:FLY_RUN_CLASSIFICATION_REPAIR -eq "1") {
  Write-Host "==> classification:repair via SSH ($app) [manual opt-in]" -ForegroundColor Cyan
  Write-Host "    (seed attributes + sync legacy specs — does NOT run prisma db seed)" -ForegroundColor DarkGray
  Invoke-Fly ssh console -a $app -C "sh -lc 'cd /app && npm run classification:repair'"
} else {
  Write-Host "==> skip classification:repair (set FLY_RUN_CLASSIFICATION_REPAIR=1 to run after deploy)" -ForegroundColor Yellow
  Write-Host "    See freezone-api/scripts/README-classification-sync.md" -ForegroundColor DarkGray
}

Write-Host "==> done" -ForegroundColor Green
