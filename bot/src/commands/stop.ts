import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { stopServer, getStatus } from '../services/aws-client';
import { Logger, formatAWSResponse } from '../utils/logger';
import type { SlashCommand } from '../types';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the Minecraft server and backup world to S3 🛑'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();

      // Check current status first
      const currentStatus = await getStatus();

      if (currentStatus === 'stopped') {
        await interaction.editReply({
          content: `⚠️ Server is already stopped! Status: ${formatAWSResponse(currentStatus)}`,
        });
        return;
      }

      // Stop the server (backup runs automatically)
      await stopServer();

      await interaction.editReply({
        content: `⏹️ Server stopping...\n🔄 World is being backed up to S3 automatically\n\nNew status: ${formatAWSResponse('stopping')}`,
      });

      Logger.success('Stop command executed by', interaction.user.tag);
    } catch (error) {
      Logger.error('Stop command failed', error);
      await interaction.editReply({
        content: `❌ Failed to stop server. Check bot logs for details.`,
      });
    }
  },
};

export default command;
