#!/usr/bin/env bash
set -euo pipefail

SERVER="${SERVER:-root@123.56.247.129}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[remote-setup] uploading and running setup-ecs-nginx.sh on ${SERVER}"
ssh "${SERVER}" 'bash -s' < "${SCRIPT_DIR}/setup-ecs-nginx.sh"

echo "[remote-setup] done"
