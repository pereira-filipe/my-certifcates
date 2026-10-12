#!/bin/sh
# Starts the app as the unprivileged "app" user.
# Hosting volumes (e.g. Fly.io) are mounted owned by root, so the uploads folder is handed to "app" first.
set -eu

UPLOADS="${APP_STORAGE_LOCAL_DIR:-/data/uploads}"
mkdir -p "$UPLOADS"
if [ "$(stat -c %u "$UPLOADS")" != "$(id -u app)" ]; then
  chown -R app:app "$UPLOADS"
fi

exec setpriv --reuid=app --regid=app --init-groups java -jar /app/app.jar "$@"
