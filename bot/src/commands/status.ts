import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getStatus } from '../services/aws-client';
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

      const embed = new EmbedBuilder()
        .setTitle('🎮 Bedrock Control Server Status')
        .setColor(status === 'running' ? 0x00ff00 : 0xff0000)
        .addFields(
          { name: 'Instance ID', value: `\`${CONFIG.aws.instanceId}\`` },
          { name: 'Region', value: `\`${CONFIG.aws.region}\`` },
          { name: 'Current Status', value: formatAWSResponse(status || 'unknown'), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Bedrock Control v1.0.0' });

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
