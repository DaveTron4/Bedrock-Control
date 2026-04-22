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

**Bedrock Control** is a professional-grade, event-driven orchestration tool that allows Discord users to instantly spin up a Minecraft server on AWS. When idle, the server automatically backs up to S3 and shuts down—**saving $120+ per month** on infrastructure costs.

### 🎯 The Problem

- ❌ **Host Hostage**: One person's PC hosts the server 24/7
- ❌ **Manual management**: No automation for start/stop/backups
- ❌ **Expensive**: EC2 instances cost ~$150/month running 24/7, even if idle

### ✅ The Solution

1. Player types `/start` in Discord
2. EC2 instance boots in ~60 seconds & restores world from S3
3. Players join at static Elastic IP (13.223.23.242)
4. Lambda monitors player count every 15 minutes
5. After 20 min idle → auto-shutdown & backup (~$112/month savings!)

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

## 🛠️ Tech Stack

| Component | Tech | Purpose |
|-----------|------|---------|
| **Server** | AWS EC2 m7i-flex.large | $0.20/hr when running |
| **Bot** | Discord.js v14 + TypeScript | Slash commands & real-time status |
| **Container** | Docker + Forge 1.20.1 | Reproducible Minecraft server |
| **Storage** | AWS S3 + IAM Roles | Encrypted world backups |
| **Automation** | AWS Lambda + EventBridge | 15-min idle checks & auto-shutdown |
| **Network** | Elastic IP | Static address (13.223.23.242) |
| **Future** | Terraform, IAM Roles Anywhere, Raspberry Pi | IaC & permanent control plane |

---

## 📊 Status

### ✅ Complete
- Discord bot with `/start`, `/stop`, `/status` (live polling)
- EC2 Minecraft server (Forge 1.20.1 in Docker)
- S3 world persistence (auto-backup/restore)
- Elastic IP + IAM security
- Git deployment pipeline (`deploy.sh`)
- Complete documentation (README, AWS_SETUP, DEPLOYMENT)

### 🟡 In Progress
- Lambda Janitor (code ✅, EventBridge setup ⏳)

### ⏳ Future
- Raspberry Pi control plane
- IAM Roles Anywhere (certificates)
- Terraform IaC
- Cloudflare DDNS

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** & **Git**
- **AWS Account** (EC2, S3, Lambda, IAM)
- **Discord Bot Token** ([Developer Portal](https://discord.com/developers/applications))
- **AWS Credentials** (`aws configure`)

### Setup

```bash
# Clone & navigate
git clone https://github.com/DaveTron4/Bedrock-Control.git
cd Bedrock-Control/bot

# Configure
cp .env.example .env
# Edit: DISCORD_TOKEN, DISCORD_CLIENT_ID, EC2_INSTANCE_ID, AWS_REGION

# Run
npm install && npm run dev
```

Expected: `✅ Bedrock Control online! ✅ Successfully registered commands 3`

### Test in Discord
```
/start    → ⏳ Starting... → ✅ Started! (polls every 5 sec)
/stop     → ⏹️ Stopping... → ✅ Stopped + Backed up to S3
/status   → 🟢 Running | 🔴 Stopped | 🟡 Pending
```

**For detailed setup:** See [AWS_SETUP.md](AWS_SETUP.md) & [DEPLOYMENT.md](infra/DEPLOYMENT.md)

---

## 🔧 RCON Commands (Admin Only)

Use `/rcon command: <command>` in Discord to execute server commands. **Admin-only feature** (blocks dangerous commands).

### 👥 Player Management

| Command | Purpose |
|---------|---------|
| `/rcon command: list` | Show online players & count |
| `/rcon command: whitelist add PlayerName` | Add to whitelist |
| `/rcon command: whitelist remove PlayerName` | Remove from whitelist |
| `/rcon command: whitelist list` | Show whitelisted players |
| `/rcon command: ban PlayerName` | Ban a player |
| `/rcon command: pardon PlayerName` | Unban a player |
| `/rcon command: op PlayerName` | Give operator (admin) |
| `/rcon command: deop PlayerName` | Remove operator |

### 🌍 World Management

| Command | Purpose |
|---------|---------|
| `/rcon command: save-all` | Manually save world |
| `/rcon command: save-all flush` | Force save immediately |
| `/rcon command: setblock ~ ~1 ~ bedrock` | Place block at coords |
| `/rcon command: difficulty peaceful` | Change difficulty |
| `/rcon command: seed` | Get world seed |
| `/rcon command: time set 0` | Set time to sunrise |
| `/rcon command: weather rain` | Change weather |

### 📢 Communication

| Command | Purpose |
|---------|---------|
| `/rcon command: say Server maintenance in 5 min` | Broadcast message to all |
| `/rcon command: tell PlayerName Hello!` | Send private message |
| `/rcon command: me is rebooting...` | Action message |

### 🔍 Monitoring

| Command | Purpose |
|---------|---------|
| `/rcon command: list` | Player count & names |
| `/rcon command: perf` | Performance metrics |
| `/rcon command: gamerule` | View game rules |
| `/rcon command: gamerule keepInventory true` | Keep items on death |

### ⚠️ Blocked Commands

These commands are **forbidden** via RCON (use `/start` and `/stop` instead):
- `stop` — Use `/stop` Discord command
- `restart` — Restart via `/stop` + `/start`
- `op` — Security risk via remote
- `deop` — Security risk via remote

---

## 🏗️ Architecture

```
Discord Server
  └─ Player: /start
        │
        ▼
  Control Plane (Bot)
  └─ AWS SDK: StartInstances
        │
        ▼
  EC2 (13.223.23.242:25565)
  ├─ Forge 1.20.1 in Docker
  └─ S3: Auto-backup on stop
        │
        ▼
  Lambda (every 15 min)
  ├─ RCON: "How many players?"
  ├─ If idle 20+ min:
  │  ├─ StopInstances
  │  └─ Discord: "Auto-stopped"
  └─ If players online:
     └─ Clear idle timer
```

---

## 📁 Structure

```
Bedrock-Control/
├── bot/                   # Discord Bot (TypeScript)
│   ├── src/commands/      # /start, /stop, /status, register
│   ├── src/services/      # aws-client.ts (EC2 control)
│   ├── src/utils/         # config, logger, types
│   └── .env               # Config (git-ignored)
│
├── lambda/janitor/        # Auto-shutdown Lambda (TypeScript)
│   └── src/index.ts       # RCON player check + idle tagging
│
├── infra/
│   ├── scripts/           # bootstrap.sh, deploy.sh, backup*.sh
│   ├── docker/            # Dockerfile (Forge 1.20.1)
│   ├── minecraft-docker.service  # Systemd unit
│   └── AWS_SETUP.md, DEPLOYMENT.md
│
├── README.md, LAMBDA_JANITOR.md
└── .gitignore            # Prevent credential leaks
```

---

## 🔄 Deployment Workflow

```bash
git push origin main              # Local: commit & push
ssh ubuntu@13.223.23.242
bash ~/Bedrock-Control/infra/deploy.sh  # EC2: one-command deploy
```

**See [DEPLOYMENT.md](infra/DEPLOYMENT.md) for detailed git workflow & troubleshooting**

---

## 📚 Docs

- **[AWS_SETUP.md](AWS_SETUP.md)** — S3, IAM, EC2, Elastic IP setup
- **[DEPLOYMENT.md](infra/DEPLOYMENT.md)** — Git workflow & troubleshooting
- **[LAMBDA_JANITOR.md](LAMBDA_JANITOR.md)** — Auto-shutdown Lambda guide

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

## 🎯 Roadmap

- [ ] Terraform IaC (one-click deploy)
- [ ] Raspberry Pi deployment guide
- [ ] IAM Roles Anywhere certificates
- [ ] CloudWatch metrics & alarms
- [ ] Multi-server support
- [ ] Web dashboard (optional)

---

<div align="center">

**Made with ❤️ by the Bedrock Control team**

[Issues](https://github.com/DaveTron4/Bedrock-Control/issues) • [Discussions](https://github.com/DaveTron4/Bedrock-Control/discussions) • [Discord Support](https://discord.gg/your-server)

</div>

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
