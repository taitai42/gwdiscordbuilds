/**
 * /load command
 * Usage: /load name:<saved_name>
 * Loads and displays a previously saved single build.
 */

import { SlashCommandBuilder } from 'discord.js';
import { loadBuild } from '../lib/buildStore.js';
import { renderBuild } from './build.js';
import { t } from '../data/i18n.js';

export const data = new SlashCommandBuilder()
  .setName('load')
  .setDescription('Load a saved Guild Wars 1 build / Charger un build GW1 sauvegardé')
  .addStringOption(opt =>
    opt.setName('name')
       .setDescription('Name of the saved build')
       .setRequired(true),
  );

export async function execute(interaction) {
  await interaction.deferReply();
  const locale = interaction.locale;
  const name   = interaction.options.getString('name', true).trim();

  const entry = loadBuild(name);
  if (!entry) {
    return interaction.editReply({ content: t(locale, 'notFound', name) });
  }

  // Render with the saved name so it reappears in the footer
  await renderBuild(interaction, entry.code, entry.name, locale);
}
