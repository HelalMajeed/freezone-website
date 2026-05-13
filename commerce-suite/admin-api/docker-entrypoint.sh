#!/bin/sh
set -e
npx prisma migrate deploy
if [ "$#" -eq 0 ]; then
  set -- node dist/main.js
fi
exec "$@"
