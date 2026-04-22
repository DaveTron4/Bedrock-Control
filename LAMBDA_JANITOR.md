# Lambda Janitor 🧹

The **Lambda Janitor** is a serverless function that monitors your Minecraft server and automatically shuts it down when idle, saving ~$120+ per month on AWS costs.

---

## 🎯 What Does It Do?

The Lambda runs **every 15 minutes** and performs these checks:

```
1. Query EC2 instance state
   └─ If not running → Exit (nothing to do)

2. Query player count via RCON
   └─ If unreachable → Exit (server still booting)

3. Check idle status
   ├─ IF players > 0:
   │  └─ Clear any idle timer
   │
   └─ IF players == 0:
      ├─ Start/continue idle timer (20 minutes)
      └─ If idle > 20 min:
         ├─ Stop EC2 instance
         ├─ Send Discord notification
         └─ Clear idle timer
```

**Result:** Server auto-stops after 20 minutes with 0 players, saving costs.

---

## 🔧 How It Works (Deep Dive)

### 1. **Idle Tracking via EC2 Tags**

Instead of storing state in a database, the Lambda uses **EC2 instance tags** to track idle time:

```typescript
const IDLE_TAG_KEY = 'mc:idle-since';  // Tag name

// When first player leaves:
{
  Key: 'mc:idle-since',
  Value: '1713091200000'  // Timestamp when idle started
}

// When players return:
// Tag is deleted
```

**Why tags?**
- ✅ No database needed (serverless!)
- ✅ Survives Lambda restarts
- ✅ Zero cost
- ✅ Easy to view in EC2 console

---

### 2. **RCON Protocol for Player Queries**

The Lambda connects to the Minecraft server via **RCON** (Remote Console) on port 25575:

```typescript
const rcon = new Rcon({
  host: '13.223.23.242',     // EC2 public IP
  port: 25575,               // RCON default port
  password: 'your-rcon-pwd', // Set in server.properties
  timeout: 5000              // 5-second timeout
});

// Send command
const response = await rcon.send('list');

// Parse response
// Output: "There are 2 of a max of 20 players online"
// → Extract: 2 players
```

---

### 3. **20-Minute Idle Threshold**

```typescript
const IDLE_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes

const now = Date.now();
const idleSince = parseInt(tags['mc:idle-since'], 10);
const idleMs = now - idleSince;

if (idleMs > IDLE_THRESHOLD_MS) {
  // Stop the server
  await ec2.send(new StopInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
}
```

---

### 4. **Discord Notifications**

When the server auto-stops, the Lambda sends an embedded message to Discord:

```typescript
await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    embeds: [{
      title: '🛑 Server Auto-Stopped',
      description: 'No players for **20 minutes** — server shut down to save costs.',
      color: 0xff4444,
      footer: { text: 'Start it again with /start' },
      timestamp: new Date().toISOString(),
    }],
  }),
});
```

---

## 🔐 Environment Variables Required

### Mandatory

| Variable | Value | Example |
|----------|-------|---------|
| `EC2_INSTANCE_ID` | Your EC2 instance ID | `i-0b03ef7858b235c49` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `RCON_PASSWORD` | Minecraft RCON password | `your-secure-password` |

### Optional

| Variable | Value | Default |
|----------|-------|---------|
| `RCON_HOST` | RCON server hostname | Uses EC2 public IP |
| `RCON_PORT` | RCON port | `25575` |
| `DISCORD_WEBHOOK_URL` | Discord webhook for notifications | (notifications disabled) |

---

## 🔐 How to Get/Set Env Variables

### 1. **EC2_INSTANCE_ID** (Mandatory)

```bash
# Get from EC2 console or CLI
aws ec2 describe-instances --filters "Name=tag:Name,Values=minecraft-server" --query 'Reservations[0].Instances[0].InstanceId'

# Output: i-0b03ef7858b235c49
```

### 2. **RCON_PASSWORD** (Mandatory)

Set in your Minecraft `server.properties`:

```properties
# /opt/minecraft/server.properties
enable-rcon=true
rcon.port=25575
rcon.password=your-super-secure-password-here
```

**Important:** This file must be in the Docker image or volume-mounted.

### 3. **DISCORD_WEBHOOK_URL** (Optional but recommended)

Create a webhook in your Discord server:

1. Go to **Server Settings** → **Integrations** → **Webhooks**
2. Click **New Webhook**
3. Name it "Bedrock Janitor"
4. Copy the **Webhook URL**
5. It will look like: `https://discordapp.com/api/webhooks/1234567890/AbCdEfGhIjKl-XyZ...`

---

## 📦 Deployment to AWS Lambda

### Option 1: AWS Console (Manual)

```bash
# Build the Lambda locally
cd lambda/janitor
npm run package
# Creates: janitor.zip

# 1. Go to AWS Lambda Console
# 2. Create new function → Author from scratch
# 3. Name: "bedrock-janitor"
# 4. Runtime: Node.js 22.x
# 5. Upload janitor.zip
# 6. Set timeout: 60 seconds
# 7. Add environment variables (see above)
# 8. Attach IAM role with EC2 + S3 permissions
```

### Option 2: AWS CLI

```bash
npm run package

# Create function
aws lambda create-function \
  --function-name bedrock-janitor \
  --runtime nodejs22.x \
  --handler dist/index.handler \
  --zip-file fileb://janitor.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-bedrock-role \
  --timeout 60 \
  --environment Variables="{EC2_INSTANCE_ID=i-xxxxx,AWS_REGION=us-east-1,RCON_PASSWORD=pwd}"

# Update function
aws lambda update-function-code \
  --function-name bedrock-janitor \
  --zip-file fileb://janitor.zip

# Update environment variables
aws lambda update-function-configuration \
  --function-name bedrock-janitor \
  --environment "Variables={EC2_INSTANCE_ID=i-xxxxx,AWS_REGION=us-east-1,RCON_PASSWORD=pwd,DISCORD_WEBHOOK_URL=https://...}"
```

---

## ⏰ Trigger via EventBridge (15-Minute Polling)

### Option 1: AWS Console

1. Go to **EventBridge** → **Rules**
2. Create new rule: "bedrock-janitor-schedule"
3. Rule type: **Schedule**
4. Pattern: `rate(15 minutes)`
5. Target: Lambda function → `bedrock-janitor`
6. Create rule

### Option 2: AWS CLI

```bash
# Create EventBridge rule
aws events put-rule \
  --name bedrock-janitor-schedule \
  --schedule-expression "rate(15 minutes)"

# Add Lambda as target
aws events put-targets \
  --rule bedrock-janitor-schedule \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:ACCOUNT_ID:function:bedrock-janitor"

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission \
  --function-name bedrock-janitor \
  --statement-id AllowEventBridgeInvoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:ACCOUNT_ID:rule/bedrock-janitor-schedule
```

---

## 🔑 IAM Policy for Lambda

The Lambda needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:StopInstances",
        "ec2:CreateTags",
        "ec2:DeleteTags"
      ],
      "Resource": "arn:aws:ec2:us-east-1:ACCOUNT_ID:instance/i-0b03ef7858b235c49"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:ACCOUNT_ID:log-group:/aws/lambda/bedrock-janitor:*"
    }
  ]
}
```

---

## 🧪 Testing Locally

### Test 1: Simulate player online

```bash
# Manually set idle tag to 1 hour ago
aws ec2 create-tags \
  --resources i-0b03ef7858b235c49 \
  --tags Key=mc:idle-since,Value=$(($(date +%s000) - 3600000))

# Run Lambda
npm run build && node dist/index.js

# Expected: "Under idle threshold — waiting"
```

### Test 2: Simulate idle > 20 min

```bash
# Set idle tag to 25 minutes ago
aws ec2 create-tags \
  --resources i-0b03ef7858b235c49 \
  --tags Key=mc:idle-since,Value=$(($(date +%s000) - 1500000))

# Run Lambda
npm run build && node dist/index.js

# Expected: "Idle threshold reached — stopping instance i-xxxxx"
```

### Test 3: Check RCON connection

```bash
# Verify RCON is enabled on server
docker exec mc-server cat /data/server.properties | grep rcon

# Expected output:
# enable-rcon=true
# rcon.port=25575
# rcon.password=your-password
```

---

## 📊 Logs & Monitoring

### View Lambda Logs

```bash
# Real-time logs
aws logs tail /aws/lambda/bedrock-janitor --follow

# Last 100 lines
aws logs tail /aws/lambda/bedrock-janitor --max-items 100
```

### Example Log Output (Player online)

```
START RequestId: abc123
Janitor running — checking server idle state
Instance state: running
Players online: 3
Players online — no idle timer to clear
END RequestId: abc123
```

### Example Log Output (Idle → Stop)

```
START RequestId: def456
Janitor running — checking server idle state
Instance state: running
Players online: 0
No players — idle timer started
(15 min later...)
START RequestId: ghi789
Server has been idle for 21 minutes (threshold: 20 min)
Idle threshold reached — stopping instance i-xxxxx
Discord notification sent
EC2 stop initiated — idle tag cleared
END RequestId: ghi789
```

---

## 🐛 Troubleshooting

### Lambda fails with "RCON unreachable"

**Cause:** Server is starting or RCON is disabled

**Fix:**
```bash
# Check RCON is enabled
docker exec mc-server cat /data/server.properties | grep rcon

# Should have:
# enable-rcon=true
# rcon.port=25575
# rcon.password=not-empty
```

### Lambda can't connect to EC2

**Cause:** Security group blocks port 25575

**Fix:**
```bash
# Add inbound rule for RCON
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 25575 \
  --cidr 0.0.0.0/0
```

### EC2 tag not updating

**Cause:** Lambda doesn't have `ec2:CreateTags` permission

**Fix:**
```bash
# Check IAM role has proper policy
aws iam get-role-policy \
  --role-name lambda-bedrock-role \
  --policy-name bedrock-lambda-policy
```

### Discord webhook not sending

**Cause:** Webhook URL is invalid or network error

**Fix:**
```bash
# Test webhook manually
curl -X POST \
  -H 'Content-type: application/json' \
  --data '{"text":"Test"}' \
  https://discordapp.com/api/webhooks/YOUR_WEBHOOK_URL
```

---

## 💾 Cost Savings Calculation

| Factor | Impact |
|--------|--------|
| EC2 m7i-flex.large running 24/7 | $150/month |
| Server actually used: 4 hrs/day | ~6/24 = 25% |
| Without Janitor (no idle shutdown) | $150/month |
| With Janitor (20 min auto-stop) | $150 × 0.25 = **$37.50/month** |
| **Monthly Savings** | **$112.50** |
| **Yearly Savings** | **$1,350** |

Plus: Lambda costs <$1/month, so net savings ≈ **$112/month** 🎉

---

## 📝 Next Steps

- [ ] Build Lambda: `npm run build`
- [ ] Package Lambda: `npm run package`
- [ ] Create Lambda function in AWS
- [ ] Set environment variables
- [ ] Attach IAM policy
- [ ] Create EventBridge rule (15-minute schedule)
- [ ] Test with manual invocation
- [ ] Monitor logs for 24+ hours
- [ ] Verify EC2 auto-stops after 20 min idle

---

**Questions?** Check the main README or AWS Lambda documentation.
