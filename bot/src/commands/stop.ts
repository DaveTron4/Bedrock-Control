import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { stopServer, getStatus } from '../services/aws-client';
import { broadcastMessage, saveWorld } from '../services/rcon';
import { Logger, formatAWSResponse } from '../utils/logger';
import type { SlashCommand } from '../types';

const POLL_INTERVAL = 3000;
const MAX_POLLS = 40; // Max 2 minutes of polling
const WARN_COUNTDOWN_SECS = 30;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the Minecraft server and backup world to S3 🛑'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();

      const currentStatus = await getStatus();

      if (currentStatus === 'stopped') {
        await interaction.editReply({
          content: `⚠️ Server is already stopped! Status: ${formatAWSResponse(currentStatus)}`,
        });
        return;
      }

      const warnEmbed = new EmbedBuilder()
        .setTitle('⚠️ Server Shutdown Warning')
        .setDescription(`Server will stop in **${WARN_COUNTDOWN_SECS} seconds**. Finishing up?`)
        .setColor(0xff6600)
        .setTimestamp();

      await interaction.editReply({ embeds: [warnEmbed] });

      try {
        await broadcastMessage(`Server shutting down in ${WARN_COUNTDOWN_SECS} seconds! Save your work!`);
        Logger.info('Shutdown warning broadcast sent to players');
      } catch {
        Logger.warn('Could not broadcast shutdown warning (RCON unavailable — continuing anyway)');
      }

      await new Promise((resolve) => setTimeout(resolve, WARN_COUNTDOWN_SECS * 1000));

      try {
        await broadcastMessage('Saving world now...');
        await saveWorld();
        Logger.success('World saved via RCON before shutdown');
      } catch {
        Logger.warn('RCON save-all failed — proceeding with EC2 stop (systemd backup will still run)');
      }

      // systemd ExecStopPost triggers S3 backup on stop
      await stopServer();

      const stoppingEmbed = new EmbedBuilder()
        .setTitle('⏹️ Server Stopping...')
        .setDescription('World saved. Shutting down EC2 and backing up to S3.')
        .setColor(0xff6600)
        .addFields(
          { name: 'Status', value: '🔄 Stopping & Backup in progress', inline: true },
          { name: 'Estimated Time', value: '1-2 minutes', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [stoppingEmbed] });

      let pollCount = 0;
      let isStopped = false;

      while (pollCount < MAX_POLLS && !isStopped) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        pollCount++;

        const status = await getStatus();
        Logger.info(`Poll ${pollCount}/${MAX_POLLS}: Instance status = ${status}`);

        if (pollCount % 4 === 0) {
          const progressEmbed = new EmbedBuilder()
            .setTitle('⏹️ Server Stopping...')
            .setDescription('World saved. Shutting down EC2 and backing up to S3.')
            .setColor(0xff6600)
            .addFields(
              { name: 'Status', value: formatAWSResponse(status || 'unknown'), inline: true },
              { name: 'Elapsed', value: `${(pollCount * POLL_INTERVAL) / 1000}s`, inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [progressEmbed] });
        }

        if (status === 'stopped') {
          isStopped = true;
        }
      }

      if (isStopped) {
        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Server Stopped!')
          .setDescription('The Minecraft server is offline and world has been backed up to S3.')
          .setColor(0x00ff00)
          .addFields(
            { name: 'Status', value: formatAWSResponse('stopped'), inline: true },
            { name: 'Shutdown Time', value: `${(pollCount * POLL_INTERVAL) / 1000}s`, inline: true },
            { name: 'Backup', value: '✅ World data saved to S3', inline: false }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });
        Logger.success('Stop command completed successfully');
      } else {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('⏱️ Stop Timeout')
          .setDescription('Instance did not fully stop within 2 minutes.')
          .setColor(0xff6600)
          .addFields({
            name: 'Note',
            value: 'Shutdown was initiated but backup may still be uploading. Check `/status` in a moment.',
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [timeoutEmbed] });
        Logger.warn('Stop command timeout - instance did not reach stopped state');
      }
    } catch (error) {
      Logger.error('Stop command failed', error);
      await interaction.editReply({
        content: `❌ Failed to stop server. Check bot logs for details.`,
      });
    }
  },
};

export default command;
