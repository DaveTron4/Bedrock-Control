// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, Events, Interaction } from 'discord.js';
import { registerCommands, getCommandHandler } from './commands/register';
import { validateConfig, CONFIG } from './utils/config';
import { Logger } from './utils/logger';

// Validate configuration
validateConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
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
 * Login to Discord
 */
client.login(CONFIG.discord.token);