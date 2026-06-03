/**
 * /list command
 *
 * Lists builds + team builds saved in this guild and lets users load any of
 * them via a select menu. Both menus include the caller's own private saves
 * AND the guild's shared saves; clicking renders publicly via followUp.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { listBuilds, listTeamBuilds } from '../lib/buildStore.js';
import { t } from '../data/i18n.js';

export const data = new SlashCommandBuilder()
  .setName('list')
  .setDescription('List saved Guild Wars 1 builds in this server / Lister les builds GW1 sauvegardés')
  .setDMPermission(false)
  .addBooleanOption(opt =>
    opt.setName('mine_only')
       .setDescription('Show only your private builds (default: false, shows shared + your private)')
       .setRequired(false),
  );

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: t(interaction.locale, 'guildOnly'), ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const locale   = interaction.locale;
  const mineOnly = interaction.options.getBoolean('mine_only') ?? false;

  const [builds, teams] = await Promise.all([
    listBuilds({ guildId: interaction.guildId, userId: interaction.user.id }),
    listTeamBuilds({ guildId: interaction.guildId, userId: interaction.user.id }),
  ]);

  const filteredBuilds = mineOnly ? builds.filter(b => b.scope === 'private') : builds;
  const filteredTeams  = mineOnly ? teams.filter(b => b.scope === 'private')  : teams;

  if (filteredBuilds.length === 0 && filteredTeams.length === 0) {
    return interaction.editReply({ content: t(locale, 'listEmpty') });
  }

  await interaction.editReply(buildListMessage(filteredBuilds, filteredTeams, interaction.user.id, locale));
}

/**
 * Build the embed + components for the list view.
 * Exported so the load/loadteam select menus can re-render after an action.
 *
 * @param {Array} builds  list of single builds visible to the user
 * @param {Array} teams   list of team builds visible to the user
 * @param {string} userId
 * @param {string} locale
 */
export function buildListMessage(builds, teams, userId, locale) {
  const lines = [];
  if (builds.length) {
    lines.push(`**${t(locale, 'listBuildsHeader')}** (${builds.length})`);
    lines.push(formatList(builds, 'code'));
    lines.push('');
  }
  if (teams.length) {
    lines.push(`**${t(locale, 'listTeamsHeader')}** (${teams.length})`);
    lines.push(formatList(teams, 'codes'));
  }

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'listTitle'))
    .setColor(0x1a1a2e)
    .setDescription(lines.join('\n').slice(0, 4000) || '—')
    .setFooter({ text: t(locale, 'listFooter') });

  const components = [];

  if (builds.length) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`load_pick:${userId}`)
      .setPlaceholder(t(locale, 'listPickBuild'))
      .addOptions(builds.slice(0, 25).map(b => ({
        label:       truncate(b.name, 80),
        value:       b.name.slice(0, 100),
        description: `${b.scope === 'private' ? '🔒 private' : '👥 shared'} · ${truncate(b.code, 60)}`,
      })));
    components.push(new ActionRowBuilder().addComponents(menu));
  }
  if (teams.length) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`loadteam_pick:${userId}`)
      .setPlaceholder(t(locale, 'listPickTeam'))
      .addOptions(teams.slice(0, 25).map(b => ({
        label:       truncate(b.name, 80),
        value:       b.name.slice(0, 100),
        description: `${b.scope === 'private' ? '🔒 private' : '👥 shared'} · ${b.codes.length} build(s)`,
      })));
    components.push(new ActionRowBuilder().addComponents(menu));
  }

  components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`list_refresh:${userId}`)
      .setLabel(t(locale, 'listRefresh'))
      .setStyle(ButtonStyle.Secondary),
  ));

  return { embeds: [embed], components, content: '' };
}

function formatList(items, codeKey) {
  return items.slice(0, 30).map((b) => {
    const scope = b.scope === 'private' ? '🔒' : '👥';
    const tail  = codeKey === 'codes'
      ? `${b[codeKey].length} build(s)`
      : `\`${truncate(b[codeKey], 24)}\``;
    return `• ${scope} **${truncate(b.name, 60)}** — ${tail}`;
  }).join('\n') + (items.length > 30 ? `\n…and ${items.length - 30} more` : '');
}

function truncate(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
