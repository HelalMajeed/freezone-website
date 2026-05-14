#!/bin/sh
set -e
# Apply migrations before the main process. Fly.io `release_command` replaces CMD
# while ENTRYPOINT still runs; `exec "$@"` runs that command (e.g. `npx prisma migrate deploy`).
npx prisma migrate deploy

# Copy baked uploads into the writable tree. On Fly, `public/uploads` is a persistent volume:
# first boot seeds from the image; later boots keep volume files; new files are never overwritten.
if [ -d /app/public/uploads.default ]; then
  mkdir -p /app/public/uploads
  for f in /app/public/uploads.default/*; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    if [ ! -e "/app/public/uploads/$base" ]; then
      cp -a "$f" "/app/public/uploads/$base"
    fi
  done
fi

if [ "$#" -eq 0 ]; then
  set -- node dist/server.js
fi
exec "$@"
