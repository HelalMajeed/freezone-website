#!/usr/bin/env bash
# Fly.io: list secrets, optionally set DATABASE_URL, deploy freezone-api, run prisma migrate deploy via SSH.
#
# Env:
#   FLY_APP_NAME   default: freezone-website
#   DATABASE_URL   if set, pushed as Fly secret before deploy
#   FLY_API_TOKEN  optional non-interactive auth
#
# Usage:
#   export DATABASE_URL='postgresql://...'
#   chmod +x scripts/fly-deploy.sh
#   ./scripts/fly-deploy.sh

set -euo pipefail

APP="${FLY_APP_NAME:-freezone-website}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v flyctl >/dev/null 2>&1; then
  echo "Install flyctl: https://fly.io/docs/hands-on/install-flyctl/" >&2
  exit 1
fi

echo "==> flyctl auth"
flyctl auth whoami

echo "==> secrets list ($APP)"
flyctl secrets list -a "$APP"

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "==> secrets set DATABASE_URL ($APP)"
  flyctl secrets set "DATABASE_URL=$DATABASE_URL" -a "$APP"
else
  echo "==> skip secrets set (export DATABASE_URL=... to push a new DB URL)"
fi

echo "==> deploy ($APP) from $ROOT"
flyctl deploy -a "$APP"

echo "==> prisma migrate deploy via SSH ($APP)"
flyctl ssh console -a "$APP" -C "cd /app && npx prisma migrate deploy"

echo "==> done"
