/**
 * /loadteam command
 * Usage: /loadteam [name:<saved_name>]
 *
 * With a name: loads and renders the saved team build.
 * Without:     shows an ephemeral dropdown of every team build visible to the
 *              user in this guild.
 */

import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} from 'discord.js';
import { loadTeamBuild, listTeamBuilds } from '../lib/buildStore.js';
import { renderTeamBuild } from './teambuild.js';
import { t } from '../data/i18n.js';

export const data = new SlashCommandBuilder()
  .setName('loadteam')
  .setDescription('Load a saved Guild Wars 1 team build / Charger un build d\'équipe GW1 sauvegardé')
  .setDMPermission(false)
  .addStringOption(opt =>
    opt.setName('name')
       .setDescription('Name of the saved team build (omit to pick from a dropdown)')
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
    const entry = await loadTeamBuild({
      guildId: interaction.guildId,
      userId:  interaction.user.id,
      name,
    });
    if (!entry) return interaction.editReply({ content: t(locale, 'teamNotFound', name) });
    return renderTeamBuild(interaction, entry.codes, entry.name, locale, { private: entry.scope === 'private' });
  }

  // No name → show ephemeral picker
  await interaction.deferReply({ ephemeral: true });
  const teams = await listTeamBuilds({ guildId: interaction.guildId, userId: interaction.user.id });
  if (teams.length === 0) return interaction.editReply({ content: t(locale, 'listEmpty') });

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'loadTeamPickTitle'))
    .setColor(0x1a1a2e)
    .setDescription(teams.slice(0, 25).map(b =>
      `• ${b.scope === 'private' ? '🔒' : '👥'} **${truncate(b.name, 60)}** — ${b.codes.length} build(s)`,
    ).join('\n') + (teams.length > 25 ? `\n\n…and ${teams.length - 25} more (use \`/list\` to see them all)` : ''));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`loadteam_pick:${interaction.user.id}`)
    .setPlaceholder(t(locale, 'listPickTeam'))
    .addOptions(teams.slice(0, 25).map(b => ({
      label:       truncate(b.name, 80),
      value:       b.name.slice(0, 100),
      description: `${b.scope === 'private' ? '🔒 private' : '👥 shared'} · ${b.codes.length} build(s)`,
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
