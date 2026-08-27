#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="${ALLINLE_ROOT:-/opt/allinle}"
DEPLOY_USER="${ALLINLE_USER:-${SUDO_USER:-$USER}}"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=()
else
  SUDO=(sudo)
fi

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  echo "Deployment user does not exist: $DEPLOY_USER" >&2
  exit 1
fi

echo "Installing ALLINLE host dependencies..."
"${SUDO[@]}" apt-get update
"${SUDO[@]}" apt-get install -y \
  ca-certificates \
  curl \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  default-mysql-client

NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
fi

if [ "$NODE_MAJOR" -lt 22 ] || [ $((NODE_MAJOR % 2)) -ne 0 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | "${SUDO[@]}" bash -
  "${SUDO[@]}" apt-get install -y nodejs
fi

if ! command -v pnpm >/dev/null 2>&1; then
  "${SUDO[@]}" npm install -g pnpm@11
fi

if ! command -v pm2 >/dev/null 2>&1; then
  "${SUDO[@]}" npm install -g pm2
fi

DEPLOY_GROUP="$(id -gn "$DEPLOY_USER")"
"${SUDO[@]}" install -d -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" \
  "$PROJECT_ROOT" \
  "$PROJECT_ROOT/logs" \
  "$PROJECT_ROOT/backups"

echo "Host setup complete."
echo "Project directory: $PROJECT_ROOT"
echo "Deployment user: $DEPLOY_USER"
echo "Next: clone the repository and follow the production deployment section in README.md."
echo "Install Docker Engine with the Compose plugin only when running MySQL and Redis locally."
