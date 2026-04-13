#!/bin/bash
set -euo pipefail

# Deployment script to pull latest code from repo and apply updates to EC2 instance
# This script updates the Minecraft server infrastructure ONLY
# Discord bot runs separately (on Raspberry Pi or another server)

REPO_DIR="$HOME/Bedrock-Control"
DATA_DIR="/opt/minecraft"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Bedrock Control Infrastructure Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Pull latest code from repository
echo ""
echo "[1] 📥 Pulling latest code from repository..."
cd $REPO_DIR
git pull origin main
echo "✅ Repository updated"

# Step 2: Update symlinks to scripts
echo ""
echo "[2] 🔗 Updating symlinks for backup/restore scripts..."
ln -sf $REPO_DIR/infra/scripts/backup_and_upload.sh $DATA_DIR/backup_and_upload.sh
ln -sf $REPO_DIR/infra/scripts/restore_from_s3.sh $DATA_DIR/restore_from_s3.sh
chmod +x $REPO_DIR/infra/scripts/*.sh
echo "✅ Symlinks updated"

# Step 3: Update systemd service
echo ""
echo "[3] ⚙️ Updating systemd service..."
sudo cp $REPO_DIR/infra/minecraft-docker.service /etc/systemd/system/
sudo systemctl daemon-reload
echo "✅ Systemd service updated"

# Step 4: (Optional) Rebuild Docker image if Dockerfile changed
echo ""
read -p "[4] 🐳 Rebuild Docker image? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Copying Dockerfile to $DATA_DIR..."
  cp $REPO_DIR/infra/docker/Dockerfile $DATA_DIR/Dockerfile
  echo "Building Docker image from $DATA_DIR..."
  docker build -t local-forge:latest $DATA_DIR
  echo "✅ Docker image rebuilt"
else
  echo "⊘ Skipping Docker rebuild"
fi

# Step 5: (Optional) Restart services
echo ""
read -p "[5] 🔄 Restart Minecraft server? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Restarting minecraft-docker service..."
  sudo systemctl restart minecraft-docker
  echo "✅ Service restarted"
  sleep 2
  systemctl status minecraft-docker
else
  echo "⊘ Skipping service restart"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Infrastructure deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Useful commands:"
echo "   - Check latest changes: git log -5 --oneline"
echo "   - View server logs: docker logs -f mc-server"
echo "   - Manually backup now: bash $DATA_DIR/backup_and_upload.sh"
echo "   - Server address: 13.223.23.242:25565"
echo ""
echo "📝 Note: Discord bot runs separately on Raspberry Pi"
echo "   Deploy bot by updating bot/.env and running it there"
echo ""
