/**
 * /loadteam command
 * Usage: /loadteam name:<saved_name>
 * Loads and displays a previously saved team build.
 */

import { SlashCommandBuilder } from 'discord.js';
import { loadTeamBuild } from '../lib/buildStore.js';
import { renderTeamBuild } from './teambuild.js';
import { t } from '../data/i18n.js';

export const data = new SlashCommandBuilder()
  .setName('loadteam')
  .setDescription('Load a saved Guild Wars 1 team build / Charger un build d\'équipe GW1 sauvegardé')
  .addStringOption(opt =>
    opt.setName('name')
       .setDescription('Name of the saved team build')
       .setRequired(true),
  );

export async function execute(interaction) {
  await interaction.deferReply();
  const locale = interaction.locale;
  const name   = interaction.options.getString('name', true).trim();

  const entry = loadTeamBuild(name);
  if (!entry) {
    return interaction.editReply({ content: t(locale, 'teamNotFound', name) });
  }

  // Render with the saved name so it reappears in footer + hidden button
  await renderTeamBuild(interaction, entry.codes, entry.name, locale);
}
