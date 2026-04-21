import { EC2Client, StartInstancesCommand, StopInstancesCommand, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { CONFIG } from '../utils/config';
import { Logger } from '../utils/logger';

const ec2Client = new EC2Client({ region: CONFIG.aws.region });

/**
 * Validate that instance ID is configured
 */
function getInstanceId(): string {
  if (!CONFIG.aws.instanceId) {
    throw new Error('EC2_INSTANCE_ID is not configured. Please set EC2_INSTANCE_ID in .env');
  }
  return CONFIG.aws.instanceId;
}

/**
 * Start EC2 instance (Minecraft server)
 */
export async function startServer(): Promise<void> {
  try {
    const instanceId = getInstanceId();
    const command = new StartInstancesCommand({ InstanceIds: [instanceId] });
    const response = await ec2Client.send(command);
    Logger.success('Server starting...', response);
  } catch (error) {
    Logger.error('Failed to start server', error);
    throw error;
  }
}

/**
 * Stop EC2 instance (Minecraft server)
 * Triggers systemd backup script automatically
 */
export async function stopServer(): Promise<void> {
  try {
    const instanceId = getInstanceId();
    const command = new StopInstancesCommand({ InstanceIds: [instanceId] });
    const response = await ec2Client.send(command);
    Logger.success('Server stopping (backup will run automatically)...', response);
  } catch (error) {
    Logger.error('Failed to stop server', error);
    throw error;
  }
}

/**
 * Get EC2 instance status
 */
export async function getStatus(): Promise<string | undefined> {
  try {
    const instanceId = getInstanceId();
    const command = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
    const response = await ec2Client.send(command);
    const state = response.Reservations?.[0]?.Instances?.[0]?.State?.Name;
    Logger.info(`Instance state: ${state}`);
    return state;
  } catch (error) {
    Logger.error('Failed to get server status', error);
    throw error;
  }
}

/**
 * Get EC2 instance public IP address.
 */
export async function getPublicIp(): Promise<string | undefined> {
  try {
    const instanceId = getInstanceId();
    const command = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
    const response = await ec2Client.send(command);
    const ip = response.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress;
    Logger.info(`Instance public IP: ${ip ?? 'none'}`);
    return ip;
  } catch (error) {
    Logger.error('Failed to get instance public IP', error);
    throw error;
  }
}