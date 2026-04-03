#!/bin/bash
set -e

S3_BUCKET="bedrock-control-s3-bucket"
WORLD_ZIP="/tmp/world.tar.gz"
WORLD_DIR="/opt/minecraft/world"

echo "[*] Checking for world backup in S3..."

if aws s3 ls s3://$S3_BUCKET/world.tar.gz >/dev/null 2>&1; then
  echo "[*] Found world backup. Downloading..."
  aws s3 cp s3://$S3_BUCKET/world.tar.gz $WORLD_ZIP
  
  if [ -d "$WORLD_DIR" ]; then
    echo "[*] Backing up local world..."
    tar -czf /tmp/world-local-backup-$(date +%s).tar.gz -C /opt/minecraft world/ 2>/dev/null || true
  fi
  
  echo "[*] Extracting world..."
  tar -xzf $WORLD_ZIP -C /opt/minecraft/
  rm -f $WORLD_ZIP
  echo "[*] World restored successfully"
else
  echo "[*] No world backup found in S3. Starting with fresh world."
fi
