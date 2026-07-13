#!/bin/bash
set -e

BACKUP_DIR="/var/backups/allinle"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${MYSQL_DATABASE:-allinle}"
DB_USER="${MYSQL_USER:-allinle}"
DB_PASS="${MYSQL_PASSWORD:-allinle_password}"
DB_HOST="${MYSQL_HOST:-127.0.0.1}"
DB_PORT="${MYSQL_PORT:-3306}"

mkdir -p "$BACKUP_DIR"

# Dump database
mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  "$DB_NAME" | gzip > "$BACKUP_DIR/allinle_${TIMESTAMP}.sql.gz"

# Remove old backups
find "$BACKUP_DIR" -name "allinle_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: allinle_${TIMESTAMP}.sql.gz"
