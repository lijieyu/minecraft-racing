#!/usr/bin/env bash
set -euo pipefail

APP_HOST="${APP_HOST:-game.haerth.org}"
BASE_PATH="${BASE_PATH:-/mc-racing/}"
LISTEN_PORT="${LISTEN_PORT:-8088}"
REMOTE_ROOT="${REMOTE_ROOT:-/var/www/minecraft-racing}"
NGINX_CONF="/etc/nginx/conf.d/minecraft-racing.conf"

normalize_base_path() {
  local path="$1"
  if [[ -z "$path" || "$path" == "/" ]]; then
    echo "/"
    return
  fi

  [[ "$path" != /* ]] && path="/$path"
  [[ "$path" != */ ]] && path="$path/"
  echo "$path"
}

BASE_PATH="$(normalize_base_path "$BASE_PATH")"
BASE_PATH_NO_SLASH="${BASE_PATH%/}"

ensure_nginx() {
  if command -v nginx >/dev/null 2>&1; then
    return
  fi

  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y nginx
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y nginx
  elif command -v yum >/dev/null 2>&1; then
    yum install -y nginx
  else
    echo "[setup] cannot install nginx automatically: no apt/dnf/yum found" >&2
    exit 1
  fi
}

ensure_nginx
mkdir -p "${REMOTE_ROOT}/releases"

cat > "${NGINX_CONF}" <<CONF
server {
    listen 127.0.0.1:${LISTEN_PORT};
    server_name ${APP_HOST};

    port_in_redirect off;
    absolute_redirect off;

    location = ${BASE_PATH_NO_SLASH} {
        return 301 ${BASE_PATH};
    }

    location ${BASE_PATH} {
        alias ${REMOTE_ROOT}/current/;
        index index.html;
        try_files \$uri \$uri/ ${BASE_PATH}index.html;

        add_header X-Content-Type-Options nosniff always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;
    }

    location / {
        return 404;
    }
}
CONF

nginx -t
if command -v systemctl >/dev/null 2>&1; then
  systemctl enable nginx
  systemctl restart nginx
else
  service nginx restart
fi

echo "[setup] nginx configured"
echo "[setup] local health check: curl -I http://127.0.0.1:${LISTEN_PORT}${BASE_PATH}"
