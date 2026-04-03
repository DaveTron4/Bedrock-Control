import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { startServer, getStatus } from '../services/aws-client';
import { Logger, formatAWSResponse } from '../utils/logger';
import type { SlashCommand } from '../types';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start the Minecraft server 🎮'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      
      // Check current status first
      const currentStatus = await getStatus();
      
      if (currentStatus === 'running') {
        await interaction.editReply({
          content: `⚠️ Server is already running! Status: ${formatAWSResponse(currentStatus)}`,
        });
        return;
      }

      // Start the server
      await startServer();
      
      await interaction.editReply({
        content: `🚀 Server starting... Please wait 1-2 minutes for the Minecraft server to boot.\n\nNew status: ${formatAWSResponse('pending')}`,
      });

      Logger.success('Start command executed by', interaction.user.tag);
    } catch (error) {
      Logger.error('Start command failed', error);
      await interaction.editReply({
        content: `❌ Failed to start server. Check bot logs for details.`,
      });
    }
  },
};

export default command;
