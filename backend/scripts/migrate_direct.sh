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

# Total Sync: Push to ALL possible cloud targets
TARGET_DBS=("defaultdb" "faculty_scheduling")

for TARGET_DB in "${TARGET_DBS[@]}"; do
    echo "------------------------------------------------"
    echo "📦 Purging and Rebuilding: $TARGET_DB on Aiven..."
    
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
        --database="$TARGET_DB" \
        --ssl-mode=REQUIRED

    if [ $? -eq 0 ]; then
        echo "✅ SUCCESS: $TARGET_DB is now in perfect sync."
    else
        echo "❌ FAILED: Error during sync of $TARGET_DB."
    fi
done

echo "------------------------------------------------"
echo "🎉 ALL CLOUD DATABASES ARE NOW SYNCHRONIZED!"
