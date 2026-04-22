# Bedrock Control 🎮☁️

<div align="center">

![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=flat-square&logo=amazon-aws&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=flat-square&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-%230db7ed.svg?style=flat-square&logo=docker&logoColor=white)
![Minecraft](https://img.shields.io/badge/Minecraft-Forge%201.20.1-%2302A029?style=flat-square&logo=minecraft&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-%235865F2.svg?style=flat-square&logo=discord&logoColor=white)
![S3](https://img.shields.io/badge/S3%20Persistence-Enabled-brightgreen?style=flat-square)
![Elastic IP](https://img.shields.io/badge/Elastic%20IP-13.223.23.242-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)

**On-demand Minecraft orchestration via Discord — pay only when playing**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Deployment](#-deployment) • [Docs](#-documentation)

</div>

---

## 📖 What is Bedrock Control?

**Bedrock Control** is a professional-grade, event-driven orchestration tool that allows any Discord user to instantly spin up a Minecraft server on AWS. When the squad logs off, the server automatically backs up the world to S3 and shuts down—**saving $120+ per month** on always-on infrastructure costs.

### 🎯 The Problem It Solves

- ❌ **"Host Hostage"**: One person's PC hosts the server 24/7, consuming electricity
- ❌ **No automation**: Manual start/stop requires remembering, logging in, managing backups
- ❌ **Cost wastage**: EC2 instances cost ~$150/month running 24/7, even if idle

### ✅ How Bedrock Control Works

1. **Admin types `/start`** in Discord
2. **EC2 instance boots** in ~60 seconds
3. **World is restored** from S3
4. **Players join** at a static Elastic IP
5. **Lambda monitors** player count every 15 minutes
6. **After 20 min idle**: Server auto-saves, backs up to S3, and **stops** (saves $120/month!)

---

## ⚡ Key Features

| Feature | Benefit |
|---------|---------|
| 🎮 **One-Click Server Control** | `/start`, `/stop`, `/status` via Discord |
| 💾 **Automatic World Persistence** | World backed up to S3 on every shutdown |
| 📊 **Idle Detection** | Lambda auto-stops server after 20 minutes with no players |
| 🔐 **Security First** | IAM roles, no hardcoded credentials, Elastic IP |
| 📈 **Cost Optimization** | Pay ~$0.20/hr when running, $0/hr when idle |
| 🚀 **Fast Deployments** | `git push` → `bash deploy.sh` workflow |
| 🔗 **Git-Driven Infrastructure** | Symlinks + deployment scripts for easy updates |
| 🗺️ **Static Address** | Elastic IP (13.223.23.242) never changes |

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Server Hosting** | AWS EC2 m7i-flex.large | 8GB RAM, 2 vCPU, x86_64, $0.20/hr |
| **World Storage** | AWS S3 + IAM Roles | Encrypted backups, no hardcoded credentials |
| **Bot Framework** | Discord.js v14 | Slash commands, real-time status updates |
| **Containerization** | Docker + Forge 1.20.1 | Reproducible server, deterministic builds |
| **Automation** | AWS Lambda + EventBridge | 15-minute idle checks, auto-shutdown |
| **Server Control Plane** | Raspberry Pi (future) | Permanent control point via IAM Roles Anywhere |
| **DNS** | Cloudflare | Custom domain pointing to Elastic IP (optional) |
| **Infrastructure** | Terraform (planned) | IaC for entire stack provisioning |

---

## 📊 Implementation Status

### ✅ Completed (Production-Ready)

- ✅ **Discord Bot** (TypeScript)
  - `/start` with live polling → ✅ confirmation
  - `/stop` with backup confirmation
  - `/status` with real-time EC2 state
  - Auto-registration via Discord REST API

- ✅ **Minecraft Server Infrastructure**
  - Forge 1.20.1 in Docker on m7i-flex.large
  - S3 world persistence (automatic backup/restore)
  - Systemd graceful shutdown + ExecStopPost hook
  - Elastic IP (static address: 13.223.23.242)
  - IAM role-based S3 access (no hardcoded keys)

- ✅ **Deployment Pipeline**
  - Git-based workflow (`bootstrap.sh` + `deploy.sh`)
  - Symlinked scripts auto-update from repo
  - One-command deployment

- ✅ **Documentation**
  - README with architecture overview
  - AWS_SETUP.md with complete walkthrough
  - DEPLOYMENT.md with git workflow

### 🟡 In Progress

- 🟡 **Lambda Janitor** (TypeScript)
  - ✅ RCON player count checking
  - ✅ EC2 idle tagging system
  - ✅ 20-minute idle threshold
  - ✅ Auto-shutdown on idle
  - ✅ Discord webhook notifications
  - ⏳ EventBridge trigger setup (manual)
  - ⏳ IAM policy for Lambda

### ⏳ Not Started

- ⏳ **Raspberry Pi Deployment**: Bot runs on Pi for 24/7 control plane
- ⏳ **IAM Roles Anywhere**: Certificate-based auth for Pi (no long-lived keys)
- ⏳ **Terraform IaC**: One `terraform apply` to deploy entire stack
- ⏳ **Cloudflare DDNS** (optional): Friendly domain for Elastic IP

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Node.js 18+** (for bot development)
- **Git** for cloning repo
- **AWS Account** with EC2, S3, Lambda, IAM access
- **Discord Server** with admin permissions
- **Discord Bot Token** (from [Developer Portal](https://discord.com/developers/applications))
- **AWS Credentials** configured (`aws configure`)

### 1. Clone Repository

```bash
git clone https://github.com/DaveTron4/Bedrock-Control.git
cd Bedrock-Control
```

### 2. Configure Bot Credentials

```bash
cd bot
cp .env.example .env
# Edit .env:
# DISCORD_TOKEN=your-token-here
# DISCORD_CLIENT_ID=your-client-id
# DISCORD_GUILD_ID=your-server-id
# EC2_INSTANCE_ID=i-xxxxxxxxx
# AWS_REGION=us-east-1
```

### 3. Configure AWS

```bash
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Format (json)
```

### 4. Install & Run Bot

```bash
npm install
npm run dev
```

Expected output:
```
✅ Bedrock Control online! Logged in as BotName#0000
✅ Successfully registered commands 3
```

### 5. Test Commands in Discord

```
/start    → ⏳ Server Starting... → ✅ Server Started! (polls every 5 sec)
/stop     → ⏹️ Server Stopping... → ✅ Server Stopped! + Backup Confirmed
/status   → Shows: 🟢 Running, 🔴 Stopped, 🟡 Pending
```

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Discord Server                                                │
│  ├─ Player types: /start                                       │
│  └─ Player types: /stop                                        │
│         │                                                      │
└─────────┼──────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────────┐
│ Raspberry Pi (Future: Permanent Control Plane)                 │
│ ├─ Discord.js Bot (always-on, $5/yr electricity)               │
│ ├─ IAM Roles Anywhere (X.509 cert auth to AWS)                 │
│ └─ Zero long-lived credentials on hardware                     │
└────────────────────────────────────────────────────────────────┘
          │
          ├─ (AWS SDK EC2: StartInstances)
          │
          ▼
┌────────────────────────────────────────────────────────────────┐
│ AWS Account (us-east-1)                                        │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ EC2: m7i-flex.large (13.223.23.242 - Elastic IP)       │    │
│  ├─ Minecraft Forge 1.20.1 in Docker                      │    │
│  ├─ Systemd service (graceful shutdown + S3 backup)       │    │
│  └─ IAM instance role (S3 GetObject/PutObject)            │    │
│  └────────────────────────────────────────────────────────┘    │
│         │ (Backup on stop)                                     │
│         ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ S3: bedrock-control-s3-bucket                          │    │
│  ├─ world.tar.gz (latest world backup)                    │    │
│  ├─ backups/world-{timestamp}.tar.gz (30-day history)     │    │
│  └─ AES256 encryption enabled                             │    │
│  └────────────────────────────────────────────────────────┘    │
│         │                                                      │
│         └─ (Restore on start)                                  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Lambda: Janitor (triggered every 15 min)               │    │
│  ├─ RCON query to EC2: "How many players?"                │    │
│  ├─ Tag EC2 with idle timestamp                           │    │
│  ├─ If idle > 20 min → StopInstances + Discord webhook    │    │
│  └─ Clears idle tag if players online                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Bedrock-Control/
├── bot/                                    # Discord Bot (TypeScript)
│   ├── src/
│   │   ├── commands/
│   │   │   ├── start.ts                  # /start (with live polling)
│   │   │   ├── stop.ts                   # /stop (with live polling)
│   │   │   ├── status.ts                 # /status
│   │   │   └── register.ts               # Auto-register all commands
│   │   ├── services/
│   │   │   └── aws-client.ts             # EC2 control via AWS SDK
│   │   ├── utils/
│   │   │   ├── config.ts                 # .env validation
│   │   │   ├── logger.ts                 # Formatted logging
│   │   │   └── types.ts                  # TypeScript interfaces
│   │   └── index.ts                      # Bot entry point
│   ├── .env                              # Config (git-ignored)
│   ├── .gitignore                        # Prevent credential leaks
│   └── package.json
│
├── lambda/
│   └── janitor/                          # Auto-shutdown Lambda (TypeScript)
│       ├── src/
│       │   └── index.ts                  # Main handler
│       ├── dist/                         # Compiled & zipped for AWS
│       └── package.json
│
├── infra/
│   ├── scripts/
│   │   ├── bootstrap-docker.sh           # One-time EC2 setup
│   │   ├── deploy.sh                     # Git → deployment (repeatable)
│   │   ├── backup_and_upload.sh          # S3 backup + compress
│   │   └── restore_from_s3.sh            # S3 restore + extract
│   ├── docker/
│   │   ├── Dockerfile                    # Forge 1.20.1 image
│   │   └── docker-compose.yml            # Optional multi-service
│   ├── minecraft-docker.service          # Systemd unit file
│   ├── iam-policy.json                   # IAM role policy
│   ├── DEPLOYMENT.md                     # Detailed deployment guide
│   └── AWS_SETUP.md                      # AWS-specific setup
│
├── README.md                             # This file
├── .git/                                 # Version control
├── .gitignore                            # Ignore secrets + artifacts
└── package-lock.json
```

---

## 🔄 Development Workflow

### Local Changes → EC2 Deployment

```bash
# 1. Local: Make code changes
vim bot/src/commands/start.ts

# 2. Local: Test (if possible)
npm run dev

# 3. Local: Commit & push
git add .
git commit -m "Improve start command polling"
git push origin main

# 4. EC2: One-command deployment
ssh ubuntu@13.223.23.242
bash ~/Bedrock-Control/infra/deploy.sh
# Choose: Rebuild Docker? Restart services?
```

### Benefits

- ✅ No manual copying
- ✅ Full git history
- ✅ Easy rollback: `git revert`
- ✅ Version-controlled infrastructure

---

## 📚 Documentation

- **[AWS_SETUP.md](AWS_SETUP.md)** — Complete AWS setup: S3, IAM, EC2, Elastic IP
- **[infra/DEPLOYMENT.md](infra/DEPLOYMENT.md)** — Deployment guide + git workflow troubleshooting
- **[LAMBDA_JANITOR.md](LAMBDA_JANITOR.md)** (see below) — Lambda setup & environment variables

---

## 💰 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| **EC2 m7i-flex.large** | $0.20/hr | Only when running |
| **S3 Storage** | ~$1-3/mo | 10-30 backups @ 50MB each |
| **Lambda Invocations** | <$1/mo | 4 invocations/hr × 730 hrs/mo |
| **Data Transfer** | ~$0.50/mo | <1GB world backup/restore |
| **Elastic IP** | $0/mo | Free while associated |
| **Discord Bot** | $0 | Free |
| **TOTAL** | ~$25-50/mo | (vs $150+ for always-on) |

---

## 🔐 Security

- ✅ **No hardcoded credentials** in source code
- ✅ **IAM instance roles** (EC2 to S3, no access keys)
- ✅ **S3 encryption** (AES256)
- ✅ **Elastic IP** (static address, no DNS guessing)
- ✅ **.gitignore** prevents .env leaks
- ⏳ **IAM Roles Anywhere** (future) for Pi certificate-based auth

---

## 🚨 Troubleshooting

### Bot won't connect

```bash
# Check Discord token
echo $DISCORD_TOKEN

# Check config loading
npm run dev 2>&1 | grep -i error
```

### EC2 won't start

```bash
# Check instance exists
aws ec2 describe-instances --instance-ids i-xxxxx

# Check IAM permissions
aws sts get-caller-identity
```

### World not restoring

```bash
# Check S3 bucket
aws s3 ls s3://bedrock-control-s3-bucket/

# Check IAM role on instance
aws ec2 describe-instances --instance-ids i-xxxxx | grep Arn
```

---

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/something-cool`)
3. Commit changes with clear messages
4. Push and create a Pull Request

---

## 📄 License

MIT License — See LICENSE file for details

---

## 🎯 Roadmap

- [ ] Terraform IaC for entire stack
- [ ] Raspberry Pi deployment guide
- [ ] IAM Roles Anywhere certificate setup
- [ ] CloudWatch metrics & alarms
- [ ] Cloudflare DDNS integration
- [ ] Web UI dashboard (optional)
- [ ] Multi-server support

---

<div align="center">

**Made with ❤️ by the Bedrock Control team**

[Issues](https://github.com/DaveTron4/Bedrock-Control/issues) • [Discussions](https://github.com/DaveTron4/Bedrock-Control/discussions) • [Discord Support](https://discord.gg/your-server)

</div>
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
