import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getStatus } from '../services/aws-client';
import { getPlayerInfo } from '../services/rcon';
import { Logger, formatAWSResponse } from '../utils/logger';
import { CONFIG } from '../utils/config';
import type { SlashCommand } from '../types';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check the Minecraft server status 📊'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();

      const status = await getStatus();
      const isRunning = status === 'running';

      const embed = new EmbedBuilder()
        .setTitle('🎮 Bedrock Control Server Status')
        .setColor(isRunning ? 0x00ff00 : 0xff0000)
        .addFields(
          { name: 'Instance ID', value: `\`${CONFIG.aws.instanceId}\`` },
          { name: 'Region', value: `\`${CONFIG.aws.region}\`` },
          { name: 'EC2 State', value: formatAWSResponse(status || 'unknown'), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Bedrock Control v1.0.0' });

      // Only attempt RCON when instance is running
      if (isRunning) {
        try {
          const players = await getPlayerInfo();
          const playerList = players.names.length > 0 ? players.names.join(', ') : '_No one online_';
          embed.addFields(
            { name: 'Players Online', value: `${players.count} / ${players.max}`, inline: true },
            { name: 'Who\'s Playing', value: playerList }
          );
        } catch {
          // RCON may not be ready right after EC2 boot — degrade gracefully
          embed.addFields({ name: 'Players Online', value: '_RCON unavailable (server may still be starting)_' });
        }
      }

      await interaction.editReply({ embeds: [embed] });
      Logger.success('Status command executed by', interaction.user.tag);
    } catch (error) {
      Logger.error('Status command failed', error);
      await interaction.editReply({
        content: `❌ Failed to fetch server status. Check bot logs for details.`,
      });
    }
  },
};

export default command;
