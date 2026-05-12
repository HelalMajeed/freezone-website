#!/bin/sh
set -e
# Apply migrations before the main process. Fly.io `release_command` replaces CMD
# while ENTRYPOINT still runs; `exec "$@"` runs that command (e.g. `npx prisma migrate deploy`).
npx prisma migrate deploy
if [ "$#" -eq 0 ]; then
  set -- node dist/server.js
fi
exec "$@"
