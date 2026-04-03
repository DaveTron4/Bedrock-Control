# AWS & Server Setup Guide 🔧

Complete guide to set up EC2, S3, IAM, and the Minecraft server with world persistence.

---

## Table of Contents

1. [AWS Prerequisites](#aws-prerequisites)
2. [S3 Bucket Setup](#s3-bucket-setup)
3. [IAM Role & Instance Profile](#iam-role--instance-profile)
4. [EC2 Instance Setup](#ec2-instance-setup)
5. [Minecraft Server Deployment](#minecraft-server-deployment)
6. [World Persistence Testing](#world-persistence-testing)
7. [Troubleshooting](#troubleshooting)

---

## AWS Prerequisites

### Create AWS Account
1. Go to https://aws.amazon.com/
2. Click **Create an AWS Account**
3. Follow the sign-up wizard (you'll need a credit card for billing)

### Get AWS Credentials (for Bot)
1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Click your account name (top right) → **Security credentials**
3. Under "Access Keys", click **Create access key**
4. Select "Command Line Interface (CLI)" → tick "I understand" → **Create access key**
5. Copy and save:
   - **Access Key ID** (starts with `AKIA`)
   - **Secret Access Key** (long string, won't be shown again)

### Configure Credentials Locally
```bash
aws configure
# Enter credentials and region (us-east-1)
```

Verify it works:
```bash
aws sts get-caller-identity
```

---

## S3 Bucket Setup

### Create Bucket

```bash
aws s3api create-bucket \
  --bucket bedrock-control-s3-bucket \
  --region us-east-1
```

Or via AWS Console:
1. Go to [S3 Dashboard](https://console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Name: `bedrock-control-s3-bucket` (must be globally unique)
4. Region: `us-east-1`
5. Block public access: ✅ (leave all checked)
6. Click **Create bucket**

### Enable Encryption

```bash
aws s3api put-bucket-encryption \
  --bucket bedrock-control-s3-bucket \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

### Create Backups Folder

```bash
aws s3api put-object --bucket bedrock-control-s3-bucket --key backups/
```

---

## IAM Role & Instance Profile

### Create IAM Role

```bash
aws iam create-role \
  --role-name MinecraftServerRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ec2.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'
```

### Attach S3 Policy

```bash
aws iam put-role-policy \
  --role-name MinecraftServerRole \
  --policy-name MinecraftS3Access \
  --policy-document '{
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
          "arn:aws:s3:::bedrock-control-s3-bucket",
          "arn:aws:s3:::bedrock-control-s3-bucket/*"
        ]
      }
    ]
  }'
```

### Create Instance Profile

```bash
aws iam create-instance-profile \
  --instance-profile-name MinecraftServerProfile

aws iam add-role-to-instance-profile \
  --instance-profile-name MinecraftServerProfile \
  --role-name MinecraftServerRole
```

---

## EC2 Instance Setup

### Launch EC2 Instance

**Via AWS Console (Easiest):**

1. Go to [EC2 Dashboard](https://console.aws.amazon.com/ec2/)
2. Click **Launch Instance**
3. **Name**: `minecraft-forge-server`
4. **AMI**: Ubuntu 22.04 LTS (x86_64)
5. **Instance Type**: `m7i-flex.large`
6. **Key Pair**: Create or select an existing one (for SSH access)
7. **Network Settings**:
   - VPC: default
   - Public IP: ✅ Enable
   - Security Group: Create new
     - Allow SSH (TCP 22) from your IP
     - Allow Minecraft (TCP 25565) from anywhere
8. **Storage**: 100 GB gp3 (adjust as needed)
9. **Advanced Details**:
   - **IAM instance profile**: `MinecraftServerProfile`
10. Click **Launch instance**

### Get Instance ID & IP

```bash
# List instances
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].{ID:InstanceId,IP:PublicIpAddress,Type:InstanceType}'
```

Save the **Instance ID** (format: `i-xxxxx`) for later.

---

## Minecraft Server Deployment

### SSH into Instance

```bash
ssh -i your-key.pem ubuntu@<PUBLIC_IP>
```

### Install Docker

```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
# Exit and reconnect SSH for group changes
exit
```

### Copy Server Files

From your local machine:
```bash
scp -i your-key.pem -r infra/docker/* ubuntu@<PUBLIC_IP>:/opt/minecraft/
scp -i your-key.pem infra/scripts/*.sh ubuntu@<PUBLIC_IP>:/opt/minecraft/
ssh -i your-key.pem ubuntu@<PUBLIC_IP>
sudo chmod +x /opt/minecraft/*.sh
```

### Build Docker Image

```bash
cd /opt/minecraft
docker build -t local-forge:latest .
```

### Upload Initial World to S3

```bash
cd /opt/minecraft
tar -czf /tmp/world-backup.tar.gz world/
aws s3 cp /tmp/world-backup.tar.gz s3://bedrock-control-s3-bucket/world.tar.gz
rm /tmp/world-backup.tar.gz

# Verify upload
aws s3 ls s3://bedrock-control-s3-bucket/
```

### Create systemd Service

```bash
sudo tee /etc/systemd/system/minecraft-docker.service > /dev/null <<'EOF'
[Unit]
Description=Minecraft Forge Docker Server
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=on-failure
ExecStart=/usr/bin/docker start -a mc-server
ExecStop=/usr/bin/docker stop -t 120 mc-server
ExecStopPost=/opt/minecraft/backup_and_upload.sh
TimeoutStopSec=150

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable minecraft-docker.service
```

### Start Server

```bash
# Restore world from S3 (if exists)
/opt/minecraft/restore_from_s3.sh

# Start container
docker run -d --name mc-server \
  -p 25565:25565 \
  -v /opt/minecraft/world:/data/world \
  --restart unless-stopped \
  local-forge:latest

# Start systemd service
sudo systemctl start minecraft-docker.service

# Check status and logs
sudo systemctl status minecraft-docker.service
docker logs -f mc-server
```

---

## World Persistence Testing

### Test Backup

```bash
# Play on server for a bit, then stop (triggers backup)
sudo systemctl stop minecraft-docker.service

# Check S3 for backup
aws s3 ls s3://bedrock-control-s3-bucket/

# You should see world.tar.gz with updated timestamp
```

### Test Restore

```bash
# Start server again (restores from S3)
sudo systemctl start minecraft-docker.service

# Check logs
docker logs -f mc-server

# You should see "World restored successfully"
```

### Connect from Minecraft

```
Server Address: <PUBLIC_IP>:25565
```

If you built structures before the stop, they should still be there!

---

## Troubleshooting

### Server Won't Start

```bash
# Check service status
sudo systemctl status minecraft-docker.service

# Check Docker logs
docker logs mc-server

# Check systemd errors
sudo journalctl -u minecraft-docker.service -n 50
```

### Can't Connect from Minecraft

```bash
# Verify port 25565 is open
sudo lsof -i :25565

# Check security group allows traffic
aws ec2 describe-security-groups \
  --query 'SecurityGroups[].IpPermissions[].FromPort'
```

### Backup Failed

```bash
# Check S3 access
aws s3 ls s3://bedrock-control-s3-bucket/

# Check IAM role attached
aws ec2 describe-instances \
  --instance-ids i-xxxxx \
  --query 'Reservations[].Instances[].IamInstanceProfile'
```

### World Lost After Restart

```bash
# Check if backup exists in S3
aws s3 ls s3://bedrock-control-s3-bucket/

# If exists, manually restore
aws s3 cp s3://bedrock-control-s3-bucket/world.tar.gz /tmp/
tar -xzf /tmp/world.tar.gz -C /opt/minecraft/
rm /tmp/world.tar.gz
sudo systemctl restart minecraft-docker.service
```

---

## Cost & Cleanup

### Estimate Monthly Cost

- **m7i-flex.large**: ~$0.20/hour
  - 8 hours/day = ~$48/month
  - 24 hours/day = ~$144/month
  - Stopped (idle) = $0

- **S3 storage**: ~$0.02/month (1GB)
- **Data transfer**: ~$0 (first 100 GB free, then ~$0.09/GB)

### Stop/Terminate When Done

**To pause (save money):**
```bash
aws ec2 stop-instances --instance-ids i-xxxxx
```

**To delete permanently:**
```bash
aws ec2 terminate-instances --instance-ids i-xxxxx
```

---

## Next Steps

- **Bot Integration**: Update bot's EC2 instance ID in `.env`
- **Scaling**: Switch to `m7i-flex.xlarge` or larger for more players/mods
- **Monitoring**: Set up CloudWatch alarms for CPU/memory/costs
- **Automation**: Implement Lambda Janitor for auto-shutdown on idle

---

## Support

For detailed deployment steps, see [infra/DEPLOYMENT.md](infra/DEPLOYMENT.md).

For bot setup, see [README.md](README.md).
