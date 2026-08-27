#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${ALLINLE_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
ENV_FILE="${ALLINLE_ENV_FILE:-$PROJECT_ROOT/.env}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_NAME="${MYSQL_DATABASE:-allinle}"
DB_USER="${MYSQL_USER:-allinle}"
DB_PASS="${MYSQL_PASSWORD:?MYSQL_PASSWORD must be set}"
DB_HOST="${MYSQL_HOST:-127.0.0.1}"
DB_PORT="${MYSQL_PORT:-3306}"
OUTPUT_FILE="$BACKUP_DIR/allinle_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

MYSQL_PWD="$DB_PASS" mysqldump \
  -h"$DB_HOST" \
  -P"$DB_PORT" \
  -u"$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  "$DB_NAME" | gzip > "$OUTPUT_FILE"

find "$BACKUP_DIR" -type f -name "allinle_*.sql.gz" -mtime "+$RETENTION_DAYS" -delete

echo "Backup completed: $OUTPUT_FILE"
