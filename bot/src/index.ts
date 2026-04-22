// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import { Client, GatewayIntentBits, Events, Interaction, TextChannel } from 'discord.js';
import { registerCommands, getCommandHandler } from './commands/register';
import { validateConfig, CONFIG } from './utils/config';
import { Logger } from './utils/logger';

// Validate configuration
validateConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

// HTTP Server for Lambda notifications
const app: Express = express();
const HTTP_PORT = parseInt(process.env.BOT_HTTP_PORT || '3000', 10);

app.use(express.json());

/**
 * POST /notify - Lambda sends server notifications
 */
app.post('/notify', async (req: Request, res: Response) => {
  try {
    const { title, description, idleMinutes } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Missing required fields: title, description' });
    }

    const channelId = CONFIG.discord.channelId;
    if (!channelId) {
      Logger.warn('Notification endpoint: DISCORD_CHANNEL_ID not configured');
      return res.status(500).json({ error: 'Channel ID not configured' });
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      Logger.warn(`Notification endpoint: Channel ${channelId} not found or not text-based`);
      return res.status(500).json({ error: 'Channel not accessible' });
    }

    await (channel as TextChannel).send({
      embeds: [{
        title,
        description,
        color: 0xff4444,
        footer: { text: 'Restart with /start' },
        timestamp: new Date().toISOString(),
      }],
    });

    Logger.success(`Notification sent: ${title}`);
    return res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    Logger.error('Notification endpoint error:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', bot: client.isReady() ? 'ready' : 'not ready' });
});

/**
 * Bot ready event - register commands once on startup
 */
let commandsRegistered = false;

client.once(Events.ClientReady, async () => {
  Logger.success(`Bedrock Control online! Logged in as ${client.user?.tag}`);

  // Register commands only once
  if (!commandsRegistered) {
    await registerCommands();
    commandsRegistered = true;
  }
});

/**
 * Handle incoming slash commands
 */
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = getCommandHandler(interaction.commandName);

  if (!command) {
    Logger.warn(`Unknown command: ${interaction.commandName}`);
    await interaction.reply('❌ Unknown command');
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    Logger.error(`Error executing command ${interaction.commandName}`, error);
    await interaction.reply({
      content: '❌ An error occurred while executing this command',
      ephemeral: true,
    });
  }
});

/**
 * Start HTTP server before logging in
 */
app.listen(HTTP_PORT, () => {
  Logger.success(`🌐 HTTP server listening on port ${HTTP_PORT}`);
});

/**
 * Login to Discord
 */
client.login(CONFIG.discord.token);