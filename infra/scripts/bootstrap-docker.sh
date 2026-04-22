#!/bin/bash
set -euo pipefail

# Configuration
REPO_DIR="$HOME/Bedrock-Control"
GIT_REPO="https://github.com/DaveTron4/Bedrock-Control.git"
S3_BUCKET="bedrock-control-s3-bucket"
WORLD_KEY="world.tar.gz"
DATA_DIR="/opt/minecraft"
MC_IMAGE="local-forge:latest"
INSTANCE_USER="ubuntu"

echo "[*] Starting Minecraft Docker Bootstrap"

# Update and install dependencies
echo "[*] Installing Docker, AWS CLI, and Git..."
apt-get update
apt-get install -y awscli docker.io jq git
systemctl enable --now docker

# Clone repo if it doesn't exist
if [ ! -d "$REPO_DIR" ]; then
  echo "[*] Cloning repository..."
  git clone $GIT_REPO $REPO_DIR
  chown -R $INSTANCE_USER:$INSTANCE_USER $REPO_DIR
else
  echo "[*] Repository already exists at $REPO_DIR"
fi

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

# Build the Docker image locally (from /opt/minecraft where server files are)
echo "[*] Building Docker image: $MC_IMAGE..."
echo "[*] Copying Dockerfile to $DATA_DIR..."
cp $REPO_DIR/infra/docker/Dockerfile $DATA_DIR/Dockerfile

if [ -f "$DATA_DIR/Dockerfile" ]; then
  echo "[*] Building from $DATA_DIR (where server files are located)..."
  docker build -t $MC_IMAGE $DATA_DIR
else
  echo "[!] Error: Dockerfile not found"
  exit 1
fi

# Start the container (remove old one if it exists)
echo "[*] Starting Minecraft Docker container..."
if docker ps -a --format '{{.Names}}' | grep -q '^mc-server$'; then
  echo "[*] Found existing mc-server container, stopping and removing..."
  docker stop mc-server 2>/dev/null || true
  docker rm mc-server 2>/dev/null || true
fi

docker run -d --name mc-server \
  -p 25565:25565 \
  -v $DATA_DIR/world:/data/world \
  -v $DATA_DIR/logs:/data/logs \
  --restart unless-stopped \
  -e JVM_XMX="6G" \
  -e JVM_XMS="1G" \
  $MC_IMAGE

# Create systemd service (symlinked from repo)
echo "[*] Setting up systemd service..."
sudo cp $REPO_DIR/infra/minecraft-docker.service /etc/systemd/system/
sudo systemctl daemon-reload

# Create symlinks for scripts (so updates from git are automatic)
echo "[*] Creating symlinks to repo scripts..."
ln -sf $REPO_DIR/infra/scripts/backup_and_upload.sh $DATA_DIR/backup_and_upload.sh
ln -sf $REPO_DIR/infra/scripts/restore_from_s3.sh $DATA_DIR/restore_from_s3.sh
chmod +x $REPO_DIR/infra/scripts/*.sh

# Enable and start the service
echo "[*] Enabling minecraft-docker service..."
sudo systemctl enable minecraft-docker.service
sudo systemctl start minecraft-docker.service || {
  echo "[!] Service start failed; check logs with: systemctl status minecraft-docker.service"
  exit 1
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Bootstrap complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Repository at: $REPO_DIR"
echo "📍 Minecraft data at: $DATA_DIR"
echo ""
echo "📝 Next steps:"
echo "   - Check status: systemctl status minecraft-docker.service"
echo "   - View logs: docker logs -f mc-server"
echo "   - To update: cd $REPO_DIR && bash infra/deploy.sh"
echo ""
echo "🎮 Players can join at: 13.223.23.242:25565"
echo ""
