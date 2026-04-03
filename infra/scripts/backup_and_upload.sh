#!/bin/bash
set -e

DATA_DIR=/opt/minecraft
S3_BUCKET="bedrock-control-s3-bucket"
TIMESTAMP=$(date +%s)
BACKUP_FILE=/tmp/world-${TIMESTAMP}.tar.gz

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Creating world backup..."

# Backup world, logs, and config files
tar -C $DATA_DIR -czf $BACKUP_FILE \
  world/ \
  logs/ \
  server.properties \
  ops.json \
  whitelist.json \
  banned-players.json \
  banned-ips.json \
  2>/dev/null || {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup creation failed"
  exit 1
}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploading to S3 (s3://$S3_BUCKET/world.tar.gz)..."

# Upload as main backup (overwrites previous)
aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/world.tar.gz || {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: S3 upload failed"
  exit 1
}

# Also keep timestamped archive for retention/history
aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/backups/world-${TIMESTAMP}.tar.gz 2>/dev/null || true

rm -f $BACKUP_FILE
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete and uploaded to S3."
