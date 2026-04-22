# Bot HTTP Notification Integration

This document explains how the Lambda Janitor function communicates with the Discord Bot to send auto-stop notifications.

## Architecture

```
Lambda (AWS)
    │
    │ POST /notify
    ├─ title, description, idleMinutes
    ▼
Bot HTTP Server (Discord Bot)
    │
    │ Sends embed to Discord
    ▼
Discord Channel
    │
    └─► Shows: "🛑 Server Auto-Stopped" notification
```

## How It Works

### 1. **Bot Exposes HTTP Endpoint**

The Discord Bot runs a simple Express server on port 3000 (configurable) and listens for notifications from Lambda:

```
GET  /health          → Returns { status: 'ok', bot: 'ready'|'not ready' }
POST /notify          → Receives server notifications from Lambda
```

### 2. **Lambda Calls Bot Endpoint**

When idle threshold is reached, Lambda makes an HTTP POST to the bot:

```javascript
// Lambda sends notification
await fetch('http://BOT_IP:3000/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '🛑 Server Auto-Stopped',
    description: 'No players for 20 minutes — auto-stopped to save costs.',
    idleMinutes: 20
  })
});
```

### 3. **Bot Sends Discord Message**

The bot receives the notification and posts an embed to your configured channel:

```
🛑 Server Auto-Stopped
No players for 20 minutes — auto-stopped to save costs.

┌─────────────────────┐
│ Restart with /start │
└─────────────────────┘
```

---

## Setup Instructions

### **Step 1: Update Bot Configuration**

Add these environment variables to `bot/.env`:

```env
DISCORD_CHANNEL_ID=your_notifications_channel_id_here
BOT_HTTP_PORT=3000
```

**How to get DISCORD_CHANNEL_ID:**
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your notifications channel
3. Click "Copy Channel ID"
4. Paste into DISCORD_CHANNEL_ID

### **Step 2: Install Bot Dependencies**

```bash
cd bot
npm install
```

This installs Express and other dependencies.

### **Step 3: Deploy Bot on Raspberry Pi**

The bot needs to run 24/7 to receive Lambda notifications. Deploy it on your Pi or always-on machine:

```bash
# Build TypeScript
npm run build

# Start with systemd or screen
npm start

# Or use systemd service (recommended)
sudo systemctl start bedrock-bot
sudo systemctl enable bedrock-bot
```

### **Step 4: Update Lambda Configuration**

Set this environment variable in AWS Lambda:

```env
BOT_NOTIFY_URL=http://YOUR_PI_IP_OR_DOMAIN:3000/notify
```

**Important:** Replace `YOUR_PI_IP_OR_DOMAIN` with:
- Local IP if Lambda is on same network: `http://192.168.x.x:3000/notify`
- Public domain if accessing from internet: `http://your-domain.com:3000/notify`

### **Step 5: Test the Integration**

**Health Check:**
```bash
curl http://YOUR_PI_IP:3000/health
# Response: { "status": "ok", "bot": "ready" }
```

**Send Test Notification:**
```bash
curl -X POST http://YOUR_PI_IP:3000/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "🧪 Test Notification",
    "description": "This is a test message from Lambda",
    "idleMinutes": 5
  }'
# Response: { "success": true, "message": "Notification sent" }
```

---

## Environment Variables Reference

### **Bot (.env)**

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DISCORD_TOKEN` | ✅ | — | Bot authentication token |
| `DISCORD_CLIENT_ID` | ✅ | — | Bot application ID |
| `DISCORD_GUILD_ID` | ❌ | — | Dev server for slash commands |
| `DISCORD_CHANNEL_ID` | ✅ | — | Channel for notifications |
| `BOT_HTTP_PORT` | ❌ | 3000 | HTTP server port |
| `EC2_INSTANCE_ID` | ✅ | — | AWS EC2 instance ID |
| `AWS_REGION` | ❌ | us-east-1 | AWS region |

### **Lambda (AWS Console)**

| Variable | Required | Purpose |
|----------|----------|---------|
| `EC2_INSTANCE_ID` | ✅ | Instance to auto-stop |
| `AWS_REGION` | ✅ | AWS region |
| `RCON_PASSWORD` | ✅ | Minecraft RCON password |
| `BOT_NOTIFY_URL` | ✅ | Bot HTTP endpoint |
| `RCON_HOST` | ❌ | RCON hostname (defaults to public IP) |
| `RCON_PORT` | ❌ | RCON port (default 25575) |
| `IDLE_THRESHOLD_MINUTES` | ❌ | Minutes idle before stop (default 20) |

---

## Network Considerations

### **Same Local Network (Recommended)**

If Lambda runs on local machine or can reach Pi via local IP:

```env
BOT_NOTIFY_URL=http://192.168.1.50:3000/notify
```

✅ Fast, no internet latency  
✅ Works offline  
❌ Only for local Lambda testing

### **Internet Access (Production AWS Lambda)**

If Lambda runs on AWS and needs to reach your Pi:

**Option A: Public IP + Firewall**
```env
BOT_NOTIFY_URL=http://YOUR_PUBLIC_IP:3000/notify
```

❌ Exposes bot to internet  
❌ IP changes with ISP

**Option B: Domain + Dynamic DNS**
```env
BOT_NOTIFY_URL=http://your-domain.com:3000/notify
```

✅ More stable than IP  
Setup: Use Cloudflare DDNS or similar

**Option C: VPN/Tailscale**
```env
BOT_NOTIFY_URL=http://pi-tailscale-ip:3000/notify
```

✅ Secure tunnel through internet  
✅ No port forwarding needed  
Setup: Install Tailscale on Pi and Lambda VPC

---

## Troubleshooting

### **Lambda gets "Connection refused"**

**Causes:**
- Bot not running
- Wrong IP/port
- Firewall blocking port 3000

**Fix:**
```bash
# Check bot is running
curl http://YOUR_PI_IP:3000/health

# Check logs on Pi
tail -f /var/log/bedrock-bot.log

# Verify firewall allows 3000
sudo ufw allow 3000
```

### **Notification sent but message doesn't appear in Discord**

**Causes:**
- Wrong channel ID
- Bot missing permissions
- Bot not connected to Discord

**Fix:**
```bash
# Verify channel ID
# In Discord, right-click channel → Copy Channel ID

# Check bot permissions in Discord Server Settings
# Bot needs: Send Messages, Embed Links, Read Message History

# Check bot status
curl http://YOUR_PI_IP:3000/health | grep bot
# Should show: "bot": "ready"
```

### **Port 3000 already in use**

**Fix:**
```env
# Use different port
BOT_HTTP_PORT=3001
```

Then update Lambda:
```env
BOT_NOTIFY_URL=http://YOUR_PI_IP:3001/notify
```

### **Lambda logs show "notification timeout"**

Likely network issue. Increase timeout in Lambda function or check network latency:

```bash
ping YOUR_PI_IP
# Should be < 100ms for local network
```

---

## Systemd Service (Optional)

Create `/etc/systemd/system/bedrock-bot.service`:

```ini
[Unit]
Description=Bedrock Control Discord Bot
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Bedrock-Control/bot
EnvironmentFile=/home/pi/Bedrock-Control/bot/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable it:
```bash
sudo systemctl enable bedrock-bot
sudo systemctl start bedrock-bot
sudo systemctl status bedrock-bot
```

---

## Architecture Benefits

✅ **Centralized Messaging** — All server notifications from one bot  
✅ **No Direct AWS Auth** — Lambda just calls HTTP endpoint  
✅ **Graceful Fallback** — If notification fails, server still stops  
✅ **Extensible** — Easy to add more Lambda notification types later  
✅ **No Hardcoded Secrets** — Lambda doesn't need Discord token  

---

## Testing Locally

Test without AWS by running bot locally and calling endpoint:

```bash
# Terminal 1: Start bot
cd bot && npm run dev

# Terminal 2: Send test notification
curl -X POST http://localhost:3000/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "🧪 Local Test",
    "description": "Testing bot notification",
    "idleMinutes": 15
  }'
```

Watch Discord channel — message should appear within 1-2 seconds.
