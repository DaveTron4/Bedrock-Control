import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { runRawCommand } from '../services/rcon';
import { Logger } from '../utils/logger';
import type { SlashCommand } from '../types';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('rcon')
    .setDescription('Run a raw RCON command on the Minecraft server (admin only) 🔧')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName('command')
        .setDescription('The Minecraft server command to run (without leading /)')
        .setRequired(true)
        .setMaxLength(256)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const cmd = interaction.options.getString('command', true).trim();

    const blocked = ['stop', 'restart', 'op ', 'deop '];
    if (blocked.some((b) => cmd.toLowerCase().startsWith(b))) {
      await interaction.editReply({
        content: `❌ The command \`${cmd}\` is blocked. Use \`/stop\` for server shutdown.`,
      });
      return;
    }

    try {
      Logger.info(`RCON admin command from ${interaction.user.tag}: ${cmd}`);
      const response = await runRawCommand(cmd);

      const embed = new EmbedBuilder()
        .setTitle('🔧 RCON Response')
        .setColor(0x5865f2)
        .addFields(
          { name: 'Command', value: `\`${cmd}\`` },
          { name: 'Response', value: response.trim() || '_No output_' }
        )
        .setFooter({ text: `Executed by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      Logger.error('RCON command failed', error);
      await interaction.editReply({
        content: `❌ RCON command failed. Is the server running and RCON accessible?\n\`\`\`${error instanceof Error ? error.message : String(error)}\`\`\``,
      });
    }
  },
};

export default command;
