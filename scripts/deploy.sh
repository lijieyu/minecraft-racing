#!/usr/bin/env bash
set -euo pipefail

SERVER="${SERVER:-root@123.56.247.129}"
BASE_PATH="${BASE_PATH:-/mc-racing/}"
REMOTE_ROOT="${REMOTE_ROOT:-/var/www/minecraft-racing}"
RELEASE_TAG="${RELEASE_TAG:-$(date +%Y%m%d%H%M%S)}"
REMOTE_RELEASE_DIR="${REMOTE_ROOT}/releases/${RELEASE_TAG}"

if ! command -v rsync >/dev/null 2>&1; then
  echo "[deploy] rsync is required. Please install rsync first." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[deploy] npm is required. Please install Node.js/NPM first." >&2
  exit 1
fi

echo "[deploy] building app with base path: ${BASE_PATH}"
npm install --no-fund --no-audit
VITE_BASE_PATH="${BASE_PATH}" npm run build

echo "[deploy] preparing release directory on ${SERVER}"
ssh "${SERVER}" "mkdir -p '${REMOTE_ROOT}/releases' '${REMOTE_ROOT}/current' '${REMOTE_RELEASE_DIR}'"

echo "[deploy] uploading dist/ to ${SERVER}:${REMOTE_RELEASE_DIR}"
rsync -az --delete dist/ "${SERVER}:${REMOTE_RELEASE_DIR}/"

echo "[deploy] switching current release"
ssh "${SERVER}" "ln -sfn '${REMOTE_RELEASE_DIR}' '${REMOTE_ROOT}/current'"

echo "[deploy] reload nginx"
ssh "${SERVER}" "if command -v systemctl >/dev/null 2>&1; then systemctl reload nginx; else service nginx reload; fi"

echo "[deploy] done"
echo "[deploy] verify URL: https://game.haerth.org${BASE_PATH}"
