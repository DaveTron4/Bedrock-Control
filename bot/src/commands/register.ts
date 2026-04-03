import { REST, Routes } from 'discord.js';
import { CONFIG } from '../utils/config';
import { Logger } from '../utils/logger';
import startCommand from './start';
import stopCommand from './stop';
import statusCommand from './status';
import type { SlashCommand } from '../types';

/**
 * All slash commands for the bot
 * Add new commands here to register them
 */
export const commands: Record<string, SlashCommand> = {
  start: startCommand,
  stop: stopCommand,
  status: statusCommand,
};

/**
 * Register all slash commands with Discord
 */
export async function registerCommands(): Promise<void> {
  try {
    const rest = new REST().setToken(CONFIG.discord.token!);

    const commandData = Object.values(commands).map((cmd) => cmd.data.toJSON());

    Logger.info(`Registering ${commandData.length} slash command(s)...`);

    const data = await rest.put(
      Routes.applicationCommands(CONFIG.discord.clientId!),
      { body: commandData }
    );

    Logger.success(`Successfully registered commands`, (data as unknown[]).length);
  } catch (error) {
    Logger.error('Failed to register commands', error);
    throw error;
  }
}

/**
 * Get the handler for a specific command
 */
export function getCommandHandler(commandName: string): SlashCommand | undefined {
  return commands[commandName];
}
