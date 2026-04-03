import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { startServer, getStatus } from '../services/aws-client';
import { Logger, formatAWSResponse } from '../utils/logger';
import type { SlashCommand } from '../types';

const POLL_INTERVAL = 5000; // Check every 5 seconds
const MAX_POLLS = 36; // Max 3 minutes of polling

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

      // Show loading message
      const loadingEmbed = new EmbedBuilder()
        .setTitle('🚀 Server Starting...')
        .setDescription('Booting EC2 instance and starting Minecraft server')
        .setColor(0xffaa00)
        .addFields(
          { name: 'Status', value: '⏳ Pending...', inline: true },
          { name: 'Estimated Time', value: '1-2 minutes', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [loadingEmbed] });

      // Poll for instance to start
      let pollCount = 0;
      let isRunning = false;

      while (pollCount < MAX_POLLS && !isRunning) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        pollCount++;

        const status = await getStatus();
        Logger.info(`Poll ${pollCount}/${MAX_POLLS}: Instance status = ${status}`);

        // Update message every 3 polls (15 seconds)
        if (pollCount % 3 === 0) {
          const progressEmbed = new EmbedBuilder()
            .setTitle('🚀 Server Starting...')
            .setDescription('Booting EC2 instance and starting Minecraft')
            .setColor(0xffaa00)
            .addFields(
              { name: 'Status', value: formatAWSResponse(status || 'unknown'), inline: true },
              { name: 'Elapsed', value: `${(pollCount * POLL_INTERVAL) / 1000}s`, inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [progressEmbed] });
        }

        if (status === 'running') {
          isRunning = true;
        }
      }

      // Final response
      if (isRunning) {
        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Server Started!')
          .setDescription('The Minecraft server is now online and ready for players')
          .setColor(0x00ff00)
          .addFields(
            { name: 'Status', value: formatAWSResponse('running'), inline: true },
            { name: 'Time to Boot', value: `${(pollCount * POLL_INTERVAL) / 1000}s`, inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });
        Logger.success('Start command completed successfully');
      } else {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('⏱️ Start Timeout')
          .setDescription('Instance did not reach running state within 3 minutes')
          .setColor(0xff6600)
          .addFields({
            name: 'Next Steps',
            value: 'Try `/status` to check current state or contact admin if issue persists',
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [timeoutEmbed] });
        Logger.warn('Start command timeout - instance did not reach running state');
      }
    } catch (error) {
      Logger.error('Start command failed', error);
      await interaction.editReply({
        content: `❌ Failed to start server. Check bot logs for details.`,
      });
    }
  },
};

export default command;
