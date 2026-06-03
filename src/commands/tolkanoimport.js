/**
 * /tolkanoimport command
 *
 * Imports a team build from a tolkano.com match page. tolkano shows the 8
 * skills + professions per player but **no attribute allocations**, so the
 * generated template codes have empty attributes. The build images will
 * render with "No attributes set" — that is expected.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { fetchTolkanoMatch } from '../lib/tolkanoImporter.js';
import { tolkanoSessions, tolkanoSessionKey } from '../interactions/interactionHandler.js';
import { PROFESSION_SHORT } from '../lib/templateDecoder.js';
import { t } from '../data/i18n.js';

export const data = new SlashCommandBuilder()
  .setName('tolkanoimport')
  .setDescription('Import a team build from a tolkano.com match / Importer un build d\'équipe depuis tolkano.com')
  .setDMPermission(false)
  .addStringOption(opt =>
    opt.setName('match_id')
       .setDescription('Tolkano match ID (e.g. 1780486579815055 from https://tolkano.com/match/1780486579815055)')
       .setRequired(true),
  )
  .addStringOption(opt =>
    opt.setName('name')
       .setDescription('Save the imported team under this name (used with /loadteam)')
       .setRequired(true),
  )
  .addBooleanOption(opt =>
    opt.setName('private')
       .setDescription('If true, only you can /loadteam this team build in this server')
       .setRequired(false),
  );

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: t(interaction.locale, 'guildOnly'), ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const locale    = interaction.locale;
  const matchId   = interaction.options.getString('match_id', true).trim();
  const name      = interaction.options.getString('name', true).trim();
  const isPrivate = interaction.options.getBoolean('private') ?? false;

  let teams;
  try {
    teams = await fetchTolkanoMatch(matchId);
  } catch (err) {
    return interaction.editReply({
      content: `❌ ${err.message}\n\nMake sure the match ID is correct (the number in the tolkano URL).`,
    });
  }

  // Stash the parse result so the team-pick button doesn't have to refetch.
  const key = tolkanoSessionKey(interaction.guildId, interaction.user.id);
  tolkanoSessions.set(key, { matchId, name, private: isPrivate, teams });

  const embed = new EmbedBuilder()
    .setTitle(`📥 Tolkano import — match ${matchId}`)
    .setColor(0x1a1a2e)
    .setDescription(
      `Pick which team to import as **${name}**` +
      (isPrivate ? ' (🔒 private)' : ' (👥 shared)') +
      '.\n\n*Tolkano does not expose attribute allocations, so the imported builds will render with no attributes set.*',
    )
    .addFields(teams.map((team, i) => ({
      name:  `Team ${i + 1}: ${team.name || '(unnamed)'}`,
      value: team.players.map((p, idx) => {
        const pri = PROFESSION_SHORT[p.primaryIdx]   || '?';
        const sec = PROFESSION_SHORT[p.secondaryIdx] || '?';
        return `**${idx + 1}.** ${pri}/${sec} — ${truncate(p.name, 28)}`;
      }).join('\n') || '*(no players found)*',
    })));

  const buttons = teams.map((team, i) =>
    new ButtonBuilder()
      .setCustomId(`tolk_pick:${interaction.user.id}:${i}`)
      .setLabel(`Import Team ${i + 1}`.slice(0, 80))
      .setStyle(i === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(team.players.length === 0),
  );

  await interaction.editReply({
    embeds:     [embed],
    components: [new ActionRowBuilder().addComponents(buttons)],
  });
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
