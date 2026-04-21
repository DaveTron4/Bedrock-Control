/**
 * Centralized configuration for Bedrock Control bot
 */

export const CONFIG = {
  // AWS EC2 Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    instanceId: process.env.EC2_INSTANCE_ID,
  },

  // Discord Configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID, // Optional: for dev server
  },

  // RCON Configuration (Minecraft remote console)
  rcon: {
    host: process.env.RCON_HOST || process.env.EC2_HOST || 'localhost',
    port: parseInt(process.env.RCON_PORT || '25575', 10),
    password: process.env.RCON_PASSWORD || '',
    timeout: parseInt(process.env.RCON_TIMEOUT_MS || '5000', 10),
  },

  // Bot Configuration
  bot: {
    prefix: '/',
    version: '1.0.0',
  },
};

// Validate required environment variables
export function validateConfig(): void {
  if (!CONFIG.discord.token) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }
  if (!CONFIG.discord.clientId) {
    throw new Error('DISCORD_CLIENT_ID environment variable is required');
  }
  if (!CONFIG.aws.instanceId) {
    throw new Error('EC2_INSTANCE_ID environment variable is required');
  }
}
