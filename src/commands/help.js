/**
 * /help command
 * Shows the bot's command reference + quick-start guide.
 */

import { SlashCommandBuilder } from 'discord.js';
import { buildHelpEmbed } from '../lib/helpContent.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show how to use the bot / Afficher l\'aide du bot');

export async function execute(interaction) {
  await interaction.reply({
    embeds:    [buildHelpEmbed(interaction.locale)],
    ephemeral: true,
  });
}
