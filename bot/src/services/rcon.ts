import { Rcon } from 'rcon-client';
import { CONFIG } from '../utils/config';
import { Logger } from '../utils/logger';
import { getPublicIp } from './aws-client';

export interface PlayerInfo {
  count: number;
  max: number;
  names: string[];
}

// Falls back to EC2 public IP when RCON_HOST is not set — IPs change on every restart.
async function resolveHost(): Promise<string> {
  const explicit = process.env.RCON_HOST;
  if (explicit) return explicit;

  const ip = await getPublicIp();
  if (!ip) throw new Error('EC2 instance has no public IP — is it running?');
  return ip;
}

/**
 * Run a single RCON command and return the raw response.
 * Opens a fresh connection each call so the bot has no persistent socket.
 */
async function runCommand(command: string): Promise<string> {
  const host = await resolveHost();
  const rcon = new Rcon({
    host,
    port: CONFIG.rcon.port,
    password: CONFIG.rcon.password,
    timeout: CONFIG.rcon.timeout,
  });

  await rcon.connect();
  try {
    return await rcon.send(command);
  } finally {
    await rcon.end();
  }
}

/**
 * Parse the Minecraft `/list` response into structured player info.
 * Vanilla/Forge response: "There are 2 of a max of 20 players online: Alice, Bob"
 */
function parseListResponse(response: string): PlayerInfo {
  const match = response.match(/There are (\d+) of a max(?: of)? (\d+) players online[:.](.*)/i);
  if (!match) {
    Logger.warn('Unexpected /list response format:', response);
    return { count: 0, max: 0, names: [] };
  }
  const names = match[3].trim() ? match[3].trim().split(',').map((n) => n.trim()) : [];
  return {
    count: parseInt(match[1], 10),
    max: parseInt(match[2], 10),
    names,
  };
}

/**
 * Query the live player count from the Minecraft server via RCON.
 * Throws if the server is unreachable (caller should handle).
 */
export async function getPlayerInfo(): Promise<PlayerInfo> {
  try {
    const response = await runCommand('list');
    Logger.info('RCON /list response:', response);
    return parseListResponse(response);
  } catch (error) {
    Logger.error('RCON query failed', error);
    throw error;
  }
}

/**
 * Send a chat broadcast to all online players.
 */
export async function broadcastMessage(message: string): Promise<void> {
  try {
    await runCommand(`say ${message}`);
    Logger.info('RCON broadcast sent:', message);
  } catch (error) {
    Logger.error('RCON broadcast failed', error);
    throw error;
  }
}

/**
 * Gracefully save the world via RCON before a shutdown.
 */
export async function saveWorld(): Promise<void> {
  try {
    await runCommand('save-all flush');
    Logger.success('RCON save-all flush complete');
  } catch (error) {
    Logger.error('RCON save-all failed', error);
    throw error;
  }
}

export async function runRawCommand(command: string): Promise<string> {
  try {
    const response = await runCommand(command);
    Logger.info(`RCON raw command [${command}]:`, response);
    return response;
  } catch (error) {
    Logger.error('RCON raw command failed', error);
    throw error;
  }
}
