#!/usr/bin/env bash
# One-command deploy for the self-hosted (PM2 + SQLite) setup.
#
#   bash scripts/deploy.sh
#
# Pulls the latest code, rebuilds the Node output and restarts PM2.
# Your data (DATA_DIR) is never touched.
set -euo pipefail

BRANCH="${BRANCH:-arena/01a0856a-loan-template}"
APP_NAME="${APP_NAME:-loan-app}"

cd "$(dirname "$0")/.."
echo "==> Repository: $(pwd)"

# npm install rewrites package-lock.json on some setups; drop that noise so the
# pull never aborts with "local changes would be overwritten".
if ! git diff --quiet -- package-lock.json 2>/dev/null; then
  echo "==> Discarding local package-lock.json changes"
  git checkout -- package-lock.json
fi

echo "==> Pulling $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH" 2>/dev/null || true
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies"
npm install --no-audit --no-fund

echo "==> Building"
npm run build:node

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  echo "==> Restarting PM2 process '$APP_NAME'"
  pm2 restart "$APP_NAME" --update-env
else
  echo "==> Starting PM2 process '$APP_NAME'"
  pm2 start ecosystem.config.cjs
fi

pm2 save
echo
echo "==> Done. Live on port ${PORT:-8080}."
pm2 status "$APP_NAME"
