/**
 * /load command
 * Usage: /load name:<saved_name>
 * Loads and displays a previously saved single build (scoped to this guild).
 *
 * The user's own private build of the given name takes precedence over a
 * shared build of the same name.
 */

import { SlashCommandBuilder } from 'discord.js';
import { loadBuild } from '../lib/buildStore.js';
import { renderBuild } from './build.js';
import { t } from '../data/i18n.js';

export const data = new SlashCommandBuilder()
  .setName('load')
  .setDescription('Load a saved Guild Wars 1 build / Charger un build GW1 sauvegardé')
  .setDMPermission(false)
  .addStringOption(opt =>
    opt.setName('name')
       .setDescription('Name of the saved build')
       .setRequired(true),
  );

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: t(interaction.locale, 'guildOnly'), ephemeral: true });
  }
  await interaction.deferReply();
  const locale = interaction.locale;
  const name   = interaction.options.getString('name', true).trim();

  const entry = await loadBuild({
    guildId: interaction.guildId,
    userId:  interaction.user.id,
    name,
  });
  if (!entry) {
    return interaction.editReply({ content: t(locale, 'notFound', name) });
  }

  // Re-render with the saved name + same scope so the footer reflects reality
  await renderBuild(interaction, entry.code, entry.name, locale, { private: entry.scope === 'private' });
}
