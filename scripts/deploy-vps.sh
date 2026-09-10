#!/usr/bin/env bash
#
# Pull the latest code and restart the PM2 self-host deployment.
#
#   cd /var/www/html/LOAN_TEMPLATE
#   bash scripts/deploy-vps.sh
#
# Database migrations in drizzle/ are applied automatically when the server
# boots, so there is no separate migration step. DATA_DIR (default ./data) is
# never touched by this script.
set -euo pipefail

BRANCH="${BRANCH:-arena/01a08aa9-loan-template}"
APP_NAME="${APP_NAME:-loan-app}"
cd "$(dirname "$0")/.."

echo "==> Backing up the data directory"
DATA_DIR="${DATA_DIR:-$PWD/data}"
if [ -d "$DATA_DIR" ]; then
  BACKUP="$PWD/backups/data-$(date +%Y%m%d-%H%M%S).tar.gz"
  mkdir -p "$PWD/backups"
  tar -czf "$BACKUP" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"
  echo "    saved $BACKUP"
else
  echo "    no data directory yet, skipping"
fi

echo "==> Fetching $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Installing dependencies"
npm install

echo "==> Building the Node server bundle"
npm run build:node

echo "==> Restarting PM2 app '$APP_NAME'"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.cjs --update-env
fi
pm2 save

echo
echo "==> Done. Recent logs:"
pm2 logs "$APP_NAME" --lines 15 --nostream || true
echo
echo "Reminder: the face verification video needs"
echo "  * nginx  client_max_body_size 12m;"
echo "  * HTTPS  (browsers block the camera on plain http://)"
