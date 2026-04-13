# Minecraft Forge Server Deployment Guide

This guide explains how to deploy the Dockerized Minecraft Forge server to an EC2 instance with S3 world persistence.

## Prerequisites

- AWS account with EC2 and S3 access
- An EC2 instance running Ubuntu 22.04 LTS (m7i-flex.large or similar)
- SSH access to the instance
- IAM instance role with S3 and optional SSM permissions
- **Elastic IP allocated and associated to your instance** (static IP: `13.223.23.242`)

## Quick Start

### 1. Create S3 Bucket (AWS CLI or Console)

```bash
# Replace BUCKET_NAME with your desired bucket name
aws s3api create-bucket \
  --bucket my-bedrock-control-worlds \
  --region us-east-1

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket my-bedrock-control-worlds \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'

# Create backup folder
aws s3api put-object --bucket my-bedrock-control-worlds --key backups/
```

### 2. Attach IAM Role to EC2 Instance

Create an IAM policy and attach it to your instance role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-bedrock-control-worlds",
        "arn:aws:s3:::my-bedrock-control-worlds/*"
      ]
    }
  ]
}
```

Apply via:
```bash
aws iam create-policy \
  --policy-name MinecraftServerS3Access \
  --policy-document file://policy.json

aws iam attach-role-policy \
  --role-name <your-instance-role> \
  --policy-arn arn:aws:iam::<account-id>:policy/MinecraftServerS3Access
```

### 3. Deploy to EC2

#### Option A: Manual Bootstrap (Quick)

SSH into your instance and run:

```bash
# Download the bootstrap script
curl -O https://raw.githubusercontent.com/your-repo/infra/scripts/bootstrap-docker.sh
chmod +x bootstrap-docker.sh

# Edit S3_BUCKET and other vars
nano bootstrap-docker.sh

# Run as root
sudo bash bootstrap-docker.sh
```

#### Option B: Use as EC2 User-Data (For New Instances)

When launching a new EC2 instance, add the following under **User Data**:

```bash
#!/bin/bash
curl -O https://raw.githubusercontent.com/your-repo/infra/scripts/bootstrap-docker.sh
chmod +x bootstrap-docker.sh
S3_BUCKET="my-bedrock-control-worlds" bash bootstrap-docker.sh
```

### 4. Copy Server Files to Instance

SSH into the instance and copy your Minecraft server files:

```bash
# From your local machine (using Elastic IP: 13.223.23.242)
scp -r infra/docker/* ubuntu@13.223.23.242:/opt/minecraft/
scp -r /path/to/your/server/files/* ubuntu@13.223.23.242:/opt/minecraft/
```

Or if already on the instance:

```bash
# Copy Dockerfile and scripts
cp infra/docker/Dockerfile /opt/minecraft/
cp infra/scripts/backup_and_upload.sh /opt/minecraft/

# Ensure permissions
chmod +x /opt/minecraft/backup_and_upload.sh
```

### 5. Build and Run the Container

```bash
# SSH to instance using Elastic IP
ssh ubuntu@13.223.23.242

# Build the image
cd /opt/minecraft
docker build -t local-forge:latest .

# Run the container
docker run -d --name mc-server \
  -p 25565:25565 \
  -v /opt/minecraft/world:/data/world \
  -v /opt/minecraft/logs:/data/logs \
  --restart unless-stopped \
  -e JVM_XMX="6G" \
  -e JVM_XMS="1G" \
  local-forge:latest

# Verify it's running
docker ps
docker logs -f mc-server

# Players can now join at: 13.223.23.242:25565
```

### 6. (Optional) Use Docker Compose

If you prefer docker-compose:

```bash
cd /opt/minecraft
docker-compose -f /path/to/docker-compose.yml up -d

# View logs
docker-compose logs -f minecraft
```

### 7. Test Server Connection

- Open Minecraft and add a new server: `<INSTANCE_IP>:25565`
- Join and verify gameplay works
- Create something permanent (chest, house, etc.) to test persistence

### 8. Test Backup and Upload

```bash
# SSH to instance
ssh ubuntu@INSTANCE_IP

# Manually trigger backup
sudo /opt/minecraft/backup_and_upload.sh

# Verify in S3
aws s3 ls s3://my-bedrock-control-worlds/

# Check systemd service
sudo systemctl status minecraft-docker.service
```

### 9. Monitor and Maintain

```bash
# Check service status
sudo systemctl status minecraft-docker.service

# View server logs
docker logs mc-server

# Stop container (triggers backup)
docker stop mc-server

# Start container
docker start mc-server

# Restart service
sudo systemctl restart minecraft-docker.service
```

## Graceful Shutdown and World Persistence

The systemd service is configured to:

1. **On Stop**: Send a `docker stop` with a 120-second timeout (allows `save-all` in Forge)
2. **After Stop** (`ExecStopPost`): Run `backup_and_upload.sh` to compress and upload world to S3

This ensures world data is always synced to S3 before the instance is terminated.

## Restore World from S3

To restore a world on a new instance:

```bash
# SSH to new instance
ssh ubuntu@NEW_INSTANCE_IP

# Download and extract world
mkdir -p /opt/minecraft
aws s3 cp s3://my-bedrock-control-worlds/world.tar.gz /tmp/
tar -xzf /tmp/world.tar.gz -C /opt/minecraft/
```

## Lambda Janitor Integration (Optional)

To automatically shutdown idle servers, configure a Lambda function to:

1. Query server player count via RCON every 15 minutes
2. If players == 0 for > 30 minutes, save world and terminate EC2

(See bot Lambda code for implementation details.)

## Troubleshooting

**Container won't start:**
```bash
docker logs mc-server
# Check if port 25565 is in use: sudo lsof -i :25565
```

**Backup fails:**
```bash
# Check IAM role
aws sts get-caller-identity
# Check S3 bucket access
aws s3 ls s3://my-bedrock-control-worlds/
```

**Server is slow:**
- Increase JVM memory: `docker stop mc-server`, then `-e JVM_XMX="8G"` in docker run
- Check instance CPU/memory: `top`, `free -h`

**World data lost:**
- Check S3 recent backups: `aws s3 ls s3://my-bedrock-control-worlds/backups/`
- Restore from timestamped backup (see above)

## Next Steps

- Integrate with Bedrock Control Discord bot for remote start/stop commands
- Set up Lambda for automated idle shutdown
- Configure Cloudflare DDNS for stable server address
- Add CloudWatch monitoring and alarms

---

## 🔄 Repository & Deployment Workflow

Once your repository is cloned on EC2, updates are automatic via symlinks and the `deploy.sh` script.

### Initial Setup (One-Time)

```bash
# Clone repo on EC2 (bootstrap does this)
git clone https://github.com/your-username/Bedrock-Control.git ~/Bedrock-Control

# Symlinks are created automatically
ls -la /opt/minecraft/backup_and_upload.sh
# → /home/ubuntu/Bedrock-Control/infra/scripts/backup_and_upload.sh
```

### Deployment Workflow (Repeatable)

**Step 1: Make changes locally**
```bash
# Edit files on your local machine
vim bot/src/commands/stop.ts
```

**Step 2: Commit and push**
```bash
git add bot/src/commands/stop.ts
git commit -m "Improve stop command response"
git push origin main
```

**Step 3: Deploy to EC2 with one command**
```bash
ssh ubuntu@13.223.23.242
bash ~/Bedrock-Control/infra/deploy.sh
```

The deploy script will:
- ✅ Pull latest code from `main` branch
- ✅ Update symlinks to scripts
- ✅ Refresh systemd service files
- ✅ Install npm dependencies
- ⚠️ Ask if you want to rebuild Docker image
- ⚠️ Ask if you want to restart services

### Benefits

| Traditional | With Git Symlinks |
|-------------|-------------------|
| Copy-paste files manually | `bash deploy.sh` |
| Easy to make mistakes | No manual file copying |
| Hard to track changes | Full git history |
| Risky rollbacks | `git revert` to undo |
| Inconsistent versions | Single source of truth |

### Example: Update Bot Response Times

```bash
# Local: Improve bot polling interval
vim bot/src/commands/start.ts
# Change POLL_INTERVAL from 5000 to 3000 ms

# Local: Commit and push
git add bot/src/commands/start.ts
git commit -m "Faster bot status updates"
git push origin main

# EC2: One command to deploy
ssh ubuntu@13.223.23.242 "bash ~/Bedrock-Control/infra/deploy.sh"

# Done! Bot now polls twice as fast
```

### Troubleshooting Deployments

**Symlinks not working after git pull:**
```bash
# Recreate symlinks manually
ln -sf ~/Bedrock-Control/infra/scripts/*.sh /opt/minecraft/
```

**Changes not taking effect:**
```bash
# Restart services
sudo systemctl restart minecraft-docker
# Or for bot (if systemd service exists):
# sudo systemctl restart bot
```

**Check what changed:**
```bash
cd ~/Bedrock-Control
git log -5 --oneline   # Last 5 commits
git diff HEAD~1        # Changes since last deployment
```

---

**Questions or issues?** Check the main README and architecture docs in the project root.
