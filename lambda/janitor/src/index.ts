import {
  EC2Client,
  DescribeInstancesCommand,
  StopInstancesCommand,
  CreateTagsCommand,
  DeleteTagsCommand,
} from '@aws-sdk/client-ec2';
import { Rcon } from 'rcon-client';

const IDLE_THRESHOLD_MS = parseInt(process.env.IDLE_THRESHOLD_MINUTES || '20', 10) * 60 * 1000;
const IDLE_TAG_KEY = 'mc:idle-since';

const INSTANCE_ID = process.env.EC2_INSTANCE_ID!;
const REGION = process.env.REGION || 'us-east-1';
const RCON_HOST = process.env.RCON_HOST; // optional — falls back to public IP
const RCON_PORT = parseInt(process.env.RCON_PORT || '25575', 10);
const RCON_PASSWORD = process.env.RCON_PASSWORD!;

const ec2 = new EC2Client({ region: REGION });

interface InstanceInfo {
  state: string;
  publicIp?: string;
  idleSince?: string;
}

async function getInstanceInfo(): Promise<InstanceInfo> {
  const res = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
  const instance = res.Reservations?.[0]?.Instances?.[0];
  return {
    state: instance?.State?.Name ?? 'unknown',
    publicIp: instance?.PublicIpAddress,
    idleSince: instance?.Tags?.find((t) => t.Key === IDLE_TAG_KEY)?.Value,
  };
}

async function setIdleTag(timestampMs: number): Promise<void> {
  await ec2.send(new CreateTagsCommand({
    Resources: [INSTANCE_ID],
    Tags: [{ Key: IDLE_TAG_KEY, Value: String(timestampMs) }],
  }));
}

async function clearIdleTag(): Promise<void> {
  await ec2.send(new DeleteTagsCommand({
    Resources: [INSTANCE_ID],
    Tags: [{ Key: IDLE_TAG_KEY }],
  }));
}

async function getPlayerCount(host: string): Promise<number> {
  const rcon = new Rcon({ host, port: RCON_PORT, password: RCON_PASSWORD, timeout: 5000 });
  await rcon.connect();
  try {
    const response = await rcon.send('list');
    const match = response.match(/There are (\d+) of a max/i);
    return match ? parseInt(match[1], 10) : 0;
  } finally {
    await rcon.end();
  }
}

export async function handler(): Promise<void> {
  console.log('Janitor running — checking server idle state');

  const { state, publicIp, idleSince } = await getInstanceInfo();

  if (state !== 'running') {
    console.log(`Instance is ${state} — nothing to do`);
    return;
  }

  const host = RCON_HOST || publicIp;
  if (!host) {
    console.error('No RCON host available — instance running but has no public IP');
    return;
  }

  let playerCount: number;
  try {
    playerCount = await getPlayerCount(host);
    console.log(`Players online: ${playerCount}`);
  } catch (err) {
    // Server may still be booting — don't penalize it
    console.warn('RCON unreachable (server may be starting):', (err as Error).message);
    return;
  }

  const now = Date.now();

  if (playerCount > 0) {
    if (idleSince) {
      await clearIdleTag();
      console.log('Players online — idle timer cleared');
    } else {
      console.log('Players online — no idle timer to clear');
    }
    return;
  }

  if (!idleSince) {
    await setIdleTag(now);
    console.log('No players — idle timer started');
    return;
  }

  const idleMs = now - parseInt(idleSince, 10);
  const idleMinutes = Math.round(idleMs / 60000);
  console.log(`Server has been idle for ${idleMinutes} minutes (threshold: ${IDLE_THRESHOLD_MS / 60000} min)`);

  if (idleMs < IDLE_THRESHOLD_MS) {
    console.log('Under idle threshold — waiting');
    return;
  }

  console.log(`Idle threshold reached — stopping instance ${INSTANCE_ID}`);

  // Notify via bot HTTP endpoint
  const botNotifyUrl = process.env.BOT_NOTIFY_URL;
  if (botNotifyUrl) {
    try {
      await fetch(botNotifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🛑 Server Auto-Stopped',
          description: `No players for **${idleMinutes} minutes** — auto-stopped to save costs.`,
          idleMinutes,
        }),
      });
      console.log('Bot notification sent');
    } catch (err) {
      console.warn('Bot notification failed:', (err as Error).message);
    }
  }

  await ec2.send(new StopInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
  await clearIdleTag();
  console.log('EC2 stop initiated — idle tag cleared');
}
