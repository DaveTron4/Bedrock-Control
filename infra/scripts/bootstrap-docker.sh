#!/bin/bash
set -euo pipefail

# Configuration
S3_BUCKET="bedrock-control-s3-bucket"  # Replace with your actual S3 bucket name
WORLD_KEY="world.tar.gz"
DATA_DIR="/opt/minecraft"
MC_IMAGE="local-forge:latest"
INSTANCE_USER="ubuntu"

echo "[*] Starting Minecraft Docker Bootstrap"

# Update and install dependencies
echo "[*] Installing Docker and AWS CLI..."
apt-get update
apt-get install -y awscli docker.io jq
systemctl enable --now docker

# Create data directory
echo "[*] Creating $DATA_DIR..."
mkdir -p $DATA_DIR
chown $INSTANCE_USER:$INSTANCE_USER $DATA_DIR

# Attempt to download world from S3 (optional; fail gracefully if not present)
echo "[*] Checking for existing world in S3..."
if aws s3 ls s3://$S3_BUCKET/$WORLD_KEY >/dev/null 2>&1; then
  echo "[*] Downloading world from S3..."
  aws s3 cp s3://$S3_BUCKET/$WORLD_KEY /tmp/world.tar.gz
  tar -xzf /tmp/world.tar.gz -C $DATA_DIR
  rm -f /tmp/world.tar.gz
else
  echo "[*] No existing world found in S3; new world will be created."
fi

# Build the Docker image locally (assumes Dockerfile and server files are in $DATA_DIR)
echo "[*] Building Docker image: $MC_IMAGE..."
if [ -f "$DATA_DIR/Dockerfile" ]; then
  docker build -t $MC_IMAGE $DATA_DIR
else
  echo "[!] Warning: Dockerfile not found at $DATA_DIR/Dockerfile"
fi

# Start the container
echo "[*] Starting Minecraft Docker container..."
docker run -d --name mc-server \
  -p 25565:25565 \
  -v $DATA_DIR/world:/data/world \
  -v $DATA_DIR/logs:/data/logs \
  --restart unless-stopped \
  -e JVM_XMX="6G" \
  -e JVM_XMS="1G" \
  $MC_IMAGE

# Create systemd service to manage the container and handle graceful shutdown
echo "[*] Creating systemd service: minecraft-docker.service..."
cat >/etc/systemd/system/minecraft-docker.service <<'SERVICE'
[Unit]
Description=Minecraft Forge Docker Server
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
ExecStart=/usr/bin/docker start -a mc-server
ExecStop=/usr/bin/docker stop -t 120 mc-server
ExecStopPost=/opt/minecraft/backup_and_upload.sh
TimeoutStopSec=150

[Install]
WantedBy=multi-user.target
SERVICE

# Create backup and upload script
echo "[*] Creating backup and upload script..."
cat >/opt/minecraft/backup_and_upload.sh <<'BACKUP'
#!/bin/bash
set -e

DATA_DIR=/opt/minecraft
S3_BUCKET=my-bedrock-control-worlds
TIMESTAMP=$(date +%s)
BACKUP_FILE=/tmp/world-${TIMESTAMP}.tar.gz

echo "[*] Creating world backup..."
tar -C $DATA_DIR -czf $BACKUP_FILE world/ logs/ server.properties ops.json whitelist.json || {
  echo "[!] Backup failed"
  exit 1
}

echo "[*] Uploading to S3..."
aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/world.tar.gz || {
  echo "[!] S3 upload failed"
  exit 1
}

# Keep last 5 backups as timestamped archives (optional)
aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/backups/world-${TIMESTAMP}.tar.gz || true

rm -f $BACKUP_FILE
echo "[*] Backup uploaded successfully"
BACKUP

chmod +x /opt/minecraft/backup_and_upload.sh

# Reload systemd and enable the service
echo "[*] Enabling and starting minecraft-docker.service..."
systemctl daemon-reload
systemctl enable minecraft-docker.service
systemctl start minecraft-docker.service || {
  echo "[!] Service start failed; check logs with: systemctl status minecraft-docker.service"
  exit 1
}

echo "[*] Bootstrap complete! Server should be running."
echo "[*] Check status: systemctl status minecraft-docker.service"
echo "[*] View logs: docker logs mc-server"
