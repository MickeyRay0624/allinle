#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

DB_NAME="${MYSQL_DATABASE:-allinle}"
DB_USER="${MYSQL_USER:-allinle}"
DB_PASS="${MYSQL_PASSWORD:-allinle_password}"
DB_HOST="${MYSQL_HOST:-127.0.0.1}"
DB_PORT="${MYSQL_PORT:-3306}"

echo "Restoring $1 to $DB_NAME..."

gunzip -c "$1" | mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME"

echo "Restore completed."
