/**
 * /tolkanoimport command
 *
 * Imports a team build from a tolkano.com match page. tolkano shows the 8
 * skills + professions per player but **no attribute allocations**, so the
 * generated template codes have empty attributes. The build images will
 * render with "No attributes set" — that is expected.
 *
 * Flow:
 *  1. /tolkanoimport match_id name [private]    → fetch + parse, show team picker
 *  2. Click "Import Team N"                     → show name-each-build screen
 *  3. Click "✏️ #N" to rename any slot via modal
 *  4. Click "✅ Save & Render"                  → save each build + team, public render
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';
import { fetchTolkanoMatch } from '../lib/tolkanoImporter.js';
import {
  tolkanoSessions,
  tolkanoSessionKey,
} from '../interactions/interactionHandler.js';
import { PROFESSION_SHORT, encodeTemplate, decodeTemplate } from '../lib/templateDecoder.js';
import { resolveSkills } from '../lib/skillData.js';
import { renderTeamBuildImage } from '../lib/skillRenderer.js';
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
  tolkanoSessions.set(
    tolkanoSessionKey(interaction.guildId, interaction.user.id),
    { matchId, name, private: isPrivate, teams },
  );

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

// ─────────────────────────────────────────────────────────────────────────────
// Name-each-build screen
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a default save name for an imported tolkano build.
 *  e.g. `MyTeam_1_W-Mo`
 */
export function defaultSlotName(teamSaveName, slotIdx, primaryIdx, secondaryIdx) {
  const pri = PROFESSION_SHORT[primaryIdx]   || 'X';
  const sec = PROFESSION_SHORT[secondaryIdx] || 'X';
  // Discord-safe: trim and avoid characters that look bad in names
  const base = String(teamSaveName).replace(/\s+/g, '_').slice(0, 24);
  return `${base}_${slotIdx + 1}_${pri}-${sec}`.slice(0, 60);
}

/**
 * Build the payload for the ephemeral "name your imported builds" screen.
 * Reads (and lazily fills) `session.slotNames` from the picked team's players.
 *
 * @param {object} session  tolkano session object
 * @param {string} userId
 * @param {string} locale
 */
export async function buildTolkanoNameMessage(session, userId, locale) {
  const team = session.teams[session.teamIdx];
  const players = team.players;

  if (!Array.isArray(session.slotNames) || session.slotNames.length !== players.length) {
    session.slotNames = players.map((p, i) =>
      defaultSlotName(session.name, i, p.primaryIdx, p.secondaryIdx),
    );
  }

  // Render (and cache) the team bar image. The bars themselves don't change
  // between renames — only the names in the embed do — so we only render once.
  if (!session.imageBuffer) {
    const codes = encodePickedTeam(session);
    const builds = codes.map((code, i) => {
      const decoded = decodeTemplate(code);
      const skills  = resolveSkills(decoded.skills);
      return { decoded, skills, code, savedName: session.slotNames[i] ?? null };
    });
    session.imageBuffer = await renderTeamBuildImage(builds);
  }

  const lines = players.map((p, i) => {
    const pri = PROFESSION_SHORT[p.primaryIdx]   || '?';
    const sec = PROFESSION_SHORT[p.secondaryIdx] || '?';
    return t(locale, 'tolkSlotLine', i, `${pri}/${sec}`, truncate(p.name || '(player)', 24), session.slotNames[i]);
  });

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'tolkNameTitle', session.name))
    .setColor(0x1a1a2e)
    .setDescription(
      t(locale, 'tolkNameHelp') +
      '\n\n' + lines.join('\n') +
      `\n\n${session.private ? t(locale, 'privateLabel') : t(locale, 'sharedLabel')}`,
    )
    .setImage('attachment://tolk-preview.png');

  const attachment = new AttachmentBuilder(session.imageBuffer, { name: 'tolk-preview.png' });

  // Rename buttons: up to 8, split across 2 rows of 4.
  const renameButtons = players.map((_, i) =>
    new ButtonBuilder()
      .setCustomId(`tolk_rn:${userId}:${i}`)
      .setLabel(t(locale, 'tolkRenameBtn', i))
      .setStyle(ButtonStyle.Secondary),
  );

  const components = [];
  for (let r = 0; r < renameButtons.length; r += 4) {
    components.push(new ActionRowBuilder().addComponents(renameButtons.slice(r, r + 4)));
  }

  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tolk_rn_team:${userId}`)
        .setLabel(t(locale, 'tolkRenameTeamBtn'))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tolk_save:${userId}`)
        .setLabel(t(locale, 'tolkSaveRenderBtn'))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`tolk_cancel:${userId}`)
        .setLabel(t(locale, 'tolkCancelBtn'))
        .setStyle(ButtonStyle.Danger),
    ),
  );

  return { embeds: [embed], components, files: [attachment], content: '' };
}

/**
 * Encode the picked team's players into template codes (in slot order).
 * @param {object} session
 * @returns {string[]} template codes
 */
export function encodePickedTeam(session) {
  const team = session.teams[session.teamIdx];
  return team.players.map(p => encodeTemplate({
    primaryIdx:   p.primaryIdx,
    secondaryIdx: p.secondaryIdx,
    attributes:   [],
    skills:       p.skills,
  }));
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
