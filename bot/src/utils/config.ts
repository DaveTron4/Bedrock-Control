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
