#!/bin/bash

# Configuration
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found in currently directory."
    exit 1
fi

# Load environmental variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo "📡 Starting DIRECT Migration: LOCAL ➔ AIVEN"
echo "------------------------------------------------"

# Local Variables
LOCAL_HOST=${DB_HOST:-"localhost"}
LOCAL_USER=${DB_USER:-"root"}
LOCAL_PASS=${DB_PASSWORD:-""}
LOCAL_NAME=${DB_NAME:-"faculty_scheduling"}
LOCAL_PORT=${DB_PORT:-"3306"}

# Remote Variables
REMOTE_HOST=${REMOTE_DB_HOST}
REMOTE_USER=${REMOTE_DB_USER}
REMOTE_PASS=${REMOTE_DB_PASSWORD}
REMOTE_NAME=${REMOTE_DB_NAME}
REMOTE_PORT=${REMOTE_DB_PORT}

if [ -z "$REMOTE_HOST" ]; then
    echo "❌ REMOTE_DB_HOST not found in .env."
    exit 1
fi

echo "📦 Dumping LOCAL: $LOCAL_NAME ($LOCAL_HOST:$LOCAL_PORT)..."
echo "🚀 Pushing to AIVEN: $REMOTE_NAME ($REMOTE_HOST:$REMOTE_PORT)..."

# The Gold Standard MySQL Pipe Command (Corrected for targeting defaultdb)
# --add-drop-table: ensures existing tables in defaultdb are replaced
# --single-transaction: prevent locking for InnoDB
# --set-gtid-purged=OFF: required for migrations to managed services
mysqldump -h "$LOCAL_HOST" -P "$LOCAL_PORT" -u "$LOCAL_USER" -p"$LOCAL_PASS" \
    "$LOCAL_NAME" \
    --add-drop-table \
    --single-transaction \
    --set-gtid-purged=OFF \
    --no-tablespaces \
    --routines \
    --triggers \
    -c | \
mysql -h "$REMOTE_HOST" -P "$REMOTE_PORT" -u "$REMOTE_USER" -p"$REMOTE_PASS" \
    --database="$REMOTE_NAME" \
    --ssl-mode=REQUIRED

if [ $? -eq 0 ]; then
    echo "------------------------------------------------"
    echo "✅ MIGRATION COMPLETE! Local data successfully ported to Aiven."
else
    echo "------------------------------------------------"
    echo "❌ MIGRATION FAILED. Please check the error above."
fi
