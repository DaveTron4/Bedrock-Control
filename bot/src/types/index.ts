import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

/**
 * Command interface for slash commands
 */
export interface SlashCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * AWS EC2 instance state
 */
export type InstanceState = 'running' | 'stopped' | 'stopping' | 'pending' | 'unknown';

/**
 * Bot response interface
 */
export interface BotResponse {
  success: boolean;
  message: string;
  data?: unknown;
}
