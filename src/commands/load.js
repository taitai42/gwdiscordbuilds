/**
 * /load command
 * Usage: /load [name:<saved_name>]
 *
 * With a name: loads and renders the saved build.
 * Without:     shows an ephemeral dropdown of every build visible to the user
 *              in this guild (their privates + guild shared).
 */

import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} from 'discord.js';
import { loadBuild, listBuilds } from '../lib/buildStore.js';
import { renderBuild } from './build.js';
import { t } from '../data/i18n.js';

export const data = new SlashCommandBuilder()
  .setName('load')
  .setDescription('Load a saved Guild Wars 1 build / Charger un build GW1 sauvegardé')
  .setDMPermission(false)
  .addStringOption(opt =>
    opt.setName('name')
       .setDescription('Name of the saved build (omit to pick from a dropdown)')
       .setRequired(false),
  );

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: t(interaction.locale, 'guildOnly'), ephemeral: true });
  }
  const locale = interaction.locale;
  const name   = interaction.options.getString('name')?.trim();

  if (name) {
    await interaction.deferReply();
    const entry = await loadBuild({
      guildId: interaction.guildId,
      userId:  interaction.user.id,
      name,
    });
    if (!entry) return interaction.editReply({ content: t(locale, 'notFound', name) });
    return renderBuild(interaction, entry.code, entry.name, locale, { private: entry.scope === 'private' });
  }

  // No name → show ephemeral picker
  await interaction.deferReply({ ephemeral: true });
  const builds = await listBuilds({ guildId: interaction.guildId, userId: interaction.user.id });
  if (builds.length === 0) return interaction.editReply({ content: t(locale, 'listEmpty') });

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'loadPickTitle'))
    .setColor(0x1a1a2e)
    .setDescription(builds.slice(0, 25).map(b =>
      `• ${b.scope === 'private' ? '🔒' : '👥'} **${truncate(b.name, 60)}**`,
    ).join('\n') + (builds.length > 25 ? `\n\n…and ${builds.length - 25} more (use \`/list\` to see them all)` : ''));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`load_pick:${interaction.user.id}`)
    .setPlaceholder(t(locale, 'listPickBuild'))
    .addOptions(builds.slice(0, 25).map(b => ({
      label:       truncate(b.name, 80),
      value:       b.name.slice(0, 100),
      description: `${b.scope === 'private' ? '🔒 private' : '👥 shared'} · ${truncate(b.code, 60)}`,
    })));

  return interaction.editReply({
    embeds:     [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

function truncate(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
