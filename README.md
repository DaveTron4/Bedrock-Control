# Bedrock Control 🎮☁️

**Bedrock Control** is a professional-grade, event-driven orchestration tool designed to manage Minecraft servers on AWS. It bridges the gap between on-premise hardware (Raspberry Pi) and cloud scalability, ensuring your server is available on-demand while keeping operational costs near zero.

---

## 📖 Project Overview

The "Host Hostage" crisis is over. No more waiting for that one friend to wake up and turn on their PC. **Bedrock Control** allows any authorized Discord member to "wake up" the server. Once the fun is over and the server is empty, the "Janitor" logic automatically backs up the world to S3 and shuts down the instance to save money.

### Why this project exists:
* **Accessibility:** Decentralizes server control to the squad via Discord.
* **Cost Optimization:** Uses a "Pay-as-you-go" model, idling at $0 when not in use.
* **Cybersecurity:** Implements the **Principle of Least Privilege** and **Zero-Trust** identity for on-premise hardware.

---

## 🛠️ Technology Stack

![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Terraform](https://img.shields.io/badge/terraform-%235835CC.svg?style=for-the-badge&logo=terraform&logoColor=white)
![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-C51A4A?style=for-the-badge&logo=Raspberry-Pi&logoColor=white)
![Discord.js](https://img.shields.io/badge/discord.js-%235865F2.svg?style=for-the-badge&logo=discord&logoColor=white)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)

| Technology | Purpose |
| :--- | :--- |
| **AWS EC2 (t4g.small)** | High-performance ARM-based compute for the Minecraft server. |
| **AWS Lambda** | The "Janitor" that checks player counts and manages shutdown logic. |
| **AWS S3 & Glacier** | Reliable world persistence and long-term archival for "broke" students. |
| **IAM Roles Anywhere** | Securely grants temporary AWS credentials to the Raspberry Pi using certificates. |
| **Terraform** | Infrastructure as Code (IaC) to ensure the entire stack is repeatable. |
| **Cloudflare API** | Dynamic DNS (DDNS) to map a custom domain to the server's changing IP. |
| **Docker** | Containerizes the Discord bot for consistent deployment on the Pi. |

---

## 🏗️ Cloud Architecture

The architecture is designed to be **event-driven**. We don't poll; we react.

### The Workflow:
1.  **Trigger:** An Admin issues a `/start` command. The **Raspberry Pi** (authorized via **IAM Roles Anywhere**) tells AWS to boot the EC2.
2.  **Provision:** The EC2 runs a **User Data script** that:
    * Pulls the latest `world.zip` from **S3**.
    * Updates the **Cloudflare DNS** with its new Public IP.
    * Hits a **Discord Webhook** to announce: "Server is Live!"
3.  **Monitor:** **EventBridge** triggers a **Lambda** every 15 minutes. The Lambda uses the **RCON Protocol** to query the server's player count.
4.  **Cleanup:** If `players == 0`, the Lambda saves the game, pushes the update to S3, and stops the instance.

---

## � Implementation Status

### ✅ Completed
- **Discord Bot (TypeScript)**: Modular slash command structure with `/start`, `/stop`, `/status`
- **AWS EC2 Integration**: Start/stop EC2 instances via AWS SDK
- **Dockerized Minecraft Server**: Forge 1.20.1 running in Docker on m7i-flex.large
- **S3 World Persistence**: Automatic backup on shutdown, restore on startup
- **Systemd Service**: Graceful server shutdown with automatic world backup
- **IAM Security**: EC2 instance role with S3 access (no hardcoded keys on instance)

### 🔄 In Progress
- **Lambda Janitor**: Scheduled checks for idle players (15-minute intervals)
- **CloudWatch Monitoring**: Real-time metrics and cost tracking
- **Terraform IaC**: Automated EC2 + S3 + IAM provisioning

### ⏳ TODO
- **Production Bot Deployment**: Deploy bot to Raspberry Pi in Docker
- **IAM Roles Anywhere**: X.509 certificate-based auth for Raspberry Pi
- **Cloudflare DDNS**: Dynamic DNS integration for stable server address
- **RCON Protocol**: Player count monitoring for auto-shutdown logic

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js 18+** and npm
- **Discord Bot Token** (from [Discord Developer Portal](https://discord.com/developers/applications))
- **AWS Credentials** (Access Key ID + Secret Key, or `aws configure`)
- **EC2 Instance ID** (the running Minecraft server)

### 1. Clone & Install

```bash
git clone <repo-url>
cd Bedrock-Control/bot
npm install
```

### 2. Configure Environment

Copy your `.env` file (already in the repo):
```powershell
# bot/.env
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
EC2_INSTANCE_ID=i-xxxxx
AWS_REGION=us-east-1
```

### 3. Configure AWS Credentials

**Option A: AWS CLI (Recommended)**
```bash
aws configure
# Enter Access Key ID, Secret Key, region (us-east-1), output (json)
```

**Option B: Environment Variables**
```powershell
$env:AWS_ACCESS_KEY_ID="your-key"
$env:AWS_SECRET_ACCESS_KEY="your-secret"
```

### 4. Run the Bot

```bash
npm run dev
```

You should see:
```
[✅] Bedrock Control online! Logged in as BotName#0000
[✅] Successfully registered commands 3
```

### 5. Use in Discord

In any Discord channel, type:
- `/start` — Start the Minecraft server
- `/stop` — Stop server & backup world
- `/status` — Check server status

---

## 📁 Project Structure

```
Bedrock-Control/
├── bot/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── start.ts        ← Start EC2 instance
│   │   │   ├── stop.ts         ← Stop EC2 instance
│   │   │   ├── status.ts       ← Check server status
│   │   │   └── register.ts     ← Register all commands
│   │   ├── services/
│   │   │   └── aws-client.ts   ← AWS EC2 operations
│   │   ├── types/
│   │   │   └── index.ts        ← TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── config.ts       ← Config & env vars
│   │   │   └── logger.ts       ← Logging utilities
│   │   └── index.ts            ← Main bot entry
│   ├── .env                    ← Environment variables
│   └── package.json
├── infra/
│   ├── docker/
│   │   ├── Dockerfile         ← Minecraft server image
│   │   └── docker-compose.yml
│   ├── scripts/
│   │   ├── bootstrap-docker.sh      ← One-time EC2 setup
│   │   ├── backup_and_upload.sh     ← World backup to S3
│   │   └── restore_from_s3.sh       ← World restore from S3
│   ├── minecraft-docker.service    ← Systemd unit
│   ├── iam-policy.json             ← EC2 IAM permissions
│   └── DEPLOYMENT.md               ← Full deployment guide
└── README.md
```

---

## 🔧 Architecture Details

### Control Plane (Your PC / Raspberry Pi)
- Discord.js bot runs locally or in Docker
- Uses AWS SDK to call EC2 API
- No long-lived credentials stored (uses `aws configure` or IAM Roles Anywhere)

### Data Plane (AWS)
- **EC2 m7i-flex.large**: Runs Docker container with Forge Minecraft
- **S3 Bucket**: Stores world backups (compresses on shutdown, restores on startup)
- **Systemd Service**: Manages graceful start/stop with automatic backups
- **IAM Role**: Grants EC2 permission to access S3 (least privilege)

### Key Features
- ✅ **Automatic world persistence**: S3 backups on shutdown, restored on boot
- ✅ **Graceful shutdown**: 120-second timeout for Minecraft to save properly
- ✅ **Cost optimized**: ~$0 when idle, ~$0.20/hour when running (m7i-flex.large)
- ✅ **Modular design**: Easy to add commands (`/whitelist`, `/restart`, etc.)

---

## 🛠️ Adding New Commands

1. Create `src/commands/mycommand.ts`:
```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Logger } from '../utils/logger';
import type { SlashCommand } from '../types';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('Description'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply('Response');
  },
};

export default command;
```

2. Add to `src/commands/register.ts`:
```typescript
import myCommand from './mycommand';

export const commands: Record<string, SlashCommand> = {
  start: startCommand,
  stop: stopCommand,
  status: statusCommand,
  mycommand: myCommand,  // ← Add here
};
```

3. Restart bot — command auto-registers!

---

## 📚 Documentation

- **[AWS & Server Setup Guide](AWS_SETUP.md)** — Detailed EC2, S3, IAM configuration
- **[Deployment Guide](infra/DEPLOYMENT.md)** — How to deploy Minecraft server to EC2
- **[Hand-off Document](HANDOFF.md)** — Architecture overview for new team members

---

## 🔐 Security Best Practices

- ✅ **No hardcoded credentials** on EC2 — uses IAM role
- ✅ **Least privilege IAM policy** — EC2 can only access its own S3 bucket
- ✅ **X.509 certificates** (Roles Anywhere) for Raspberry Pi authentication
- ✅ **Ephemeral instances** — EC2 terminates after shutdown, state only in S3
- ✅ **Environment variables** — Sensitive data in `.env`, never committed

---

## 💰 Cost Estimate (Monthly)

| Resource | Hourly | Monthly (8 hrs/day) |
|----------|--------|---------------------|
| m7i-flex.large EC2 | $0.20 | ~$48 |
| S3 storage (~1GB) | — | ~$0.02 |
| Data transfer | — | ~$0.50 |
| **Total** | — | **~$50/month** |

*(Assumes 8 hours/day usage; drops to $0 when stopped)*

---

## 📝 License

MIT

---

> **Questions?** Check the [AWS Setup Guide](AWS_SETUP.md) or [Deployment Guide](infra/DEPLOYMENT.md).
