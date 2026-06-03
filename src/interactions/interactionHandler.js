/**
 * Interaction handler router
 *
 * Handles:
 *  • skill_info:* select menus  →  show skill detail embed (ephemeral)
 *  • copy_template:<code>       →  ephemeral reply with raw template code
 *  • replace:<index>:<code>     →  prompt user for new template code via modal
 *  • replace_modal:<index>      →  re-render team build with replaced slot
 *  • tb_*                       →  interactive /teambuilder flow
 */

import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { decodeTemplate } from '../lib/templateDecoder.js';
import { resolveSkills } from '../lib/skillData.js';
import { buildSkillInfoEmbed } from '../lib/uiHelpers.js';
import { t } from '../data/i18n.js';
import { renderTeamBuild } from '../commands/teambuild.js';
import { renderBuild } from '../commands/build.js';
import { tbSessions, buildTeambuilderMessage } from '../commands/teambuilder.js';
import {
  buildTolkanoNameMessage,
  encodePickedTeam,
  defaultSlotName,
} from '../commands/tolkanoimport.js';
import { saveBuild, loadBuild, saveTeamBuild } from '../lib/buildStore.js';
import { SessionStore } from '../lib/sessionStore.js';

// Used by future flows that want to attach state to a team-build message.
// Currently unused but kept exported for backward compatibility.
const teamSessions = new SessionStore();
export function saveSession(key, builds) { teamSessions.set(key, builds); }
export function getSession(key)          { return teamSessions.get(key); }

// /tolkanoimport: stash the parsed teams between the slash command and the
// "Import Team N" button click, keyed by guild+user.
export const tolkanoSessions = new SessionStore();
export const tolkanoSessionKey = (guildId, userId) => `${guildId}:${userId}:tolkano`;

const tbKey = (guildId, userId) => `${guildId}:${userId}`;

export async function handleInteraction(interaction) {
  if      (interaction.isStringSelectMenu()) await handleSelectMenu(interaction);
  else if (interaction.isButton())           await handleButton(interaction);
  else if (interaction.isModalSubmit())      await handleModal(interaction);
}

// ── Select menus ─────────────────────────────────────────────────────────────

async function handleSelectMenu(interaction) {
  const { customId, values } = interaction;
  const locale = interaction.locale;

  // ── Teambuilder slot select ────────────────────────────────────────────────
  if (customId.startsWith('tb_slot:')) {
    const parts   = customId.split(':');
    const userId  = parts[1];
    const slotIdx = parseInt(parts[2], 10);
    const value   = values[0];

    if (interaction.user.id !== userId)
      return interaction.reply({ content: t(locale, 'notYourBuilder'), ephemeral: true });
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });

    const key = tbKey(interaction.guildId, userId);
    const session = tbSessions.get(key);
    if (!session)
      return interaction.reply({ content: t(locale, 'sessionExpired'), ephemeral: true });

    if (value === 'tb_custom') {
      const modal = new ModalBuilder()
        .setCustomId(`tb_modal_custom:${userId}:${slotIdx}`)
        .setTitle(`Add Build — Slot ${slotIdx + 1}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('build_code').setLabel('Template Code')
            .setStyle(TextInputStyle.Short).setPlaceholder('e.g. OwUTMoqhWxrDWYDgUgsYA').setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('build_name').setLabel('Save as (name)')
            .setStyle(TextInputStyle.Short).setPlaceholder('e.g. My Warrior').setRequired(true),
        ),
      );
      return interaction.showModal(modal);
    }

    if (value === 'tb_clear') {
      session.slots[slotIdx] = null;
    } else {
      const entry = await loadBuild({ guildId: interaction.guildId, userId, name: value });
      if (entry) session.slots[slotIdx] = { name: entry.name, code: entry.code };
    }
    tbSessions.set(key, session);
    await interaction.deferUpdate();
    return interaction.editReply(await buildTeambuilderMessage(interaction.guildId, userId, locale));
  }

  // ── Skill info select ──────────────────────────────────────────────────────
  if (customId.startsWith('skill_info:')) {
    const slotIndex = parseInt(values[0], 10);

    const templateCode = interaction.message.embeds[0]?.footer?.text
      ?.replace(/^Template\s*:\s*/i, '')
      ?.replace(/\s*·\s*💾.*/u, '')
      ?.trim();

    if (!templateCode) {
      return interaction.reply({ content: t(locale, 'noTemplateCode'), ephemeral: true });
    }

    const decoded = decodeTemplate(templateCode);
    const skills  = resolveSkills(decoded.skills);
    const embed   = buildSkillInfoEmbed(skills[slotIndex], slotIndex, locale);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

// ── Buttons ───────────────────────────────────────────────────────────────────

async function handleButton(interaction) {
  const { customId } = interaction;
  const locale = interaction.locale;

  // ── Teambuilder buttons ───────────────────────────────────────────────────
  if (customId.startsWith('tb_name:') || customId.startsWith('tb_page:') || customId.startsWith('tb_render:')) {
    const [prefix, userId] = customId.split(':');

    if (interaction.user.id !== userId)
      return interaction.reply({ content: t(locale, 'notYourBuilder'), ephemeral: true });
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });

    const key = tbKey(interaction.guildId, userId);
    const session = tbSessions.get(key);
    if (!session)
      return interaction.reply({ content: t(locale, 'sessionExpired'), ephemeral: true });

    if (prefix === 'tb_name') {
      const modal = new ModalBuilder()
        .setCustomId(`tb_modal_name:${userId}`)
        .setTitle('Set Team Name');
      const input = new TextInputBuilder()
        .setCustomId('team_name').setLabel('Team name')
        .setStyle(TextInputStyle.Short).setPlaceholder('e.g. Balanced Team').setRequired(true);
      if (session.name) input.setValue(session.name);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (prefix === 'tb_page') {
      session.page = session.page === 0 ? 1 : 0;
      tbSessions.set(key, session);
      await interaction.deferUpdate();
      return interaction.editReply(await buildTeambuilderMessage(interaction.guildId, userId, locale));
    }

    if (prefix === 'tb_render') {
      const codes = session.slots.filter(Boolean).map(s => s.code);
      if (codes.length === 0)
        return interaction.reply({ content: t(locale, 'pickAtLeastOne'), ephemeral: true });
      await interaction.deferUpdate();
      await renderTeamBuild(interaction, codes, session.name, locale);
      tbSessions.delete(key);
      return;
    }
  }

  // ── /tolkanoimport: "Import Team N" button → name-each-build screen ───────
  if (customId.startsWith('tolk_pick:')) {
    const [, userId, teamIdxRaw] = customId.split(':');
    const teamIdx = parseInt(teamIdxRaw, 10);

    if (interaction.user.id !== userId)
      return interaction.reply({ content: t(locale, 'notYourBuilder'), ephemeral: true });
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });

    const sKey = tolkanoSessionKey(interaction.guildId, userId);
    const session = tolkanoSessions.get(sKey);
    if (!session)
      return interaction.reply({ content: t(locale, 'sessionExpired'), ephemeral: true });

    const team = session.teams[teamIdx];
    if (!team) return interaction.reply({ content: '❌ Team not found.', ephemeral: true });

    session.teamIdx   = teamIdx;
    session.slotNames = team.players.map((p, i) =>
      defaultSlotName(session.name, i, p.primaryIdx, p.secondaryIdx),
    );
    tolkanoSessions.set(sKey, session);

    await interaction.update(buildTolkanoNameMessage(session, userId, locale));
    return;
  }

  // ── /tolkanoimport: rename a single slot (open modal) ─────────────────────
  if (customId.startsWith('tolk_rn:')) {
    const [, userId, slotIdxRaw] = customId.split(':');
    const slotIdx = parseInt(slotIdxRaw, 10);

    if (interaction.user.id !== userId)
      return interaction.reply({ content: t(locale, 'notYourBuilder'), ephemeral: true });
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });

    const session = tolkanoSessions.get(tolkanoSessionKey(interaction.guildId, userId));
    if (!session || session.teamIdx == null)
      return interaction.reply({ content: t(locale, 'sessionExpired'), ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId(`tolk_rn_modal:${userId}:${slotIdx}`)
      .setTitle(t(locale, 'tolkRenameModal', slotIdx));
    const input = new TextInputBuilder()
      .setCustomId('slot_name')
      .setLabel(t(locale, 'saveAsInputLabel'))
      .setStyle(TextInputStyle.Short)
      .setMaxLength(80)
      .setRequired(true)
      .setValue(session.slotNames[slotIdx] ?? '');
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ── /tolkanoimport: rename the team (open modal) ──────────────────────────
  if (customId.startsWith('tolk_rn_team:')) {
    const userId = customId.split(':')[1];
    if (interaction.user.id !== userId)
      return interaction.reply({ content: t(locale, 'notYourBuilder'), ephemeral: true });
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });

    const session = tolkanoSessions.get(tolkanoSessionKey(interaction.guildId, userId));
    if (!session || session.teamIdx == null)
      return interaction.reply({ content: t(locale, 'sessionExpired'), ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId(`tolk_rn_team_modal:${userId}`)
      .setTitle(t(locale, 'tolkRenameTeamModal'));
    const input = new TextInputBuilder()
      .setCustomId('team_name')
      .setLabel(t(locale, 'saveAsInputLabel'))
      .setStyle(TextInputStyle.Short)
      .setMaxLength(80)
      .setRequired(true)
      .setValue(session.name);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ── /tolkanoimport: cancel ────────────────────────────────────────────────
  if (customId.startsWith('tolk_cancel:')) {
    const userId = customId.split(':')[1];
    if (interaction.user.id !== userId)
      return interaction.reply({ content: t(locale, 'notYourBuilder'), ephemeral: true });
    tolkanoSessions.delete(tolkanoSessionKey(interaction.guildId, userId));
    return interaction.update({ content: t(locale, 'tolkCanceled'), embeds: [], components: [] });
  }

  // ── /tolkanoimport: save & render publicly ────────────────────────────────
  if (customId.startsWith('tolk_save:')) {
    const userId = customId.split(':')[1];
    if (interaction.user.id !== userId)
      return interaction.reply({ content: t(locale, 'notYourBuilder'), ephemeral: true });
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });

    const sKey = tolkanoSessionKey(interaction.guildId, userId);
    const session = tolkanoSessions.get(sKey);
    if (!session || session.teamIdx == null)
      return interaction.reply({ content: t(locale, 'sessionExpired'), ephemeral: true });

    const codes = encodePickedTeam(session);

    // Save each player's build individually (with their chosen name)
    for (let i = 0; i < codes.length; i++) {
      const name = session.slotNames[i]?.trim();
      if (!name) continue;
      try {
        await saveBuild({
          guildId: interaction.guildId,
          userId,
          name,
          code:    codes[i],
          private: !!session.private,
        });
      } catch (err) {
        // Continue saving the others even if one collides; report later in summary.
        console.error('[tolkano] saveBuild failed:', name, err.message);
      }
    }

    // Save the team build under the team name
    try {
      await saveTeamBuild({
        guildId: interaction.guildId,
        userId,
        name:    session.name,
        codes,
        private: !!session.private,
      });
    } catch (err) {
      console.error('[tolkano] saveTeamBuild failed:', err.message);
    }

    // Ack ephemerally, then post public render.
    await interaction.update({
      content:    t(locale, 'tolkSavedHeader', session.name),
      embeds:     [],
      components: [],
    });
    await renderTeamBuild(interaction, codes, session.name, locale, {
      private:   !!session.private,
      responder: (payload) => interaction.followUp({ ...payload, ephemeral: false }),
    });
    tolkanoSessions.delete(sKey);
    return;
  }

  // ── Single-build "💾 Save as…" button → modal ─────────────────────────────
  if (customId.startsWith('build_save:')) {
    const code = customId.slice('build_save:'.length);
    const modal = new ModalBuilder()
      .setCustomId(`build_save_modal:${code}`)
      .setTitle(t(locale, 'saveAsModalTitle'));
    const input = new TextInputBuilder()
      .setCustomId('build_name')
      .setLabel(t(locale, 'saveAsInputLabel'))
      .setStyle(TextInputStyle.Short)
      .setMaxLength(80)
      .setPlaceholder(t(locale, 'saveAsInputHint'))
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ── Copy template button ──────────────────────────────────────────────────
  if (customId.startsWith('copy_template:')) {
    // formats: `copy_template:<code>` or `copy_template:<index>:<code>`
    const rest = customId.slice('copy_template:'.length);
    const idx  = rest.indexOf(':');
    const code = idx >= 0 ? rest.slice(idx + 1) : rest;
    return interaction.reply({
      content:   t(locale, 'copyContent', code),
      ephemeral: true,
    });
  }

  if (customId.startsWith('replace:')) {
    const parts     = customId.split(':');
    const slotIndex = parseInt(parts[1], 10);

    const modal = new ModalBuilder()
      .setCustomId(`replace_modal:${slotIndex}`)
      .setTitle(t(locale, 'replaceModalTitle', slotIndex));

    const input = new TextInputBuilder()
      .setCustomId('new_code')
      .setLabel(t(locale, 'replaceInputLabel'))
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(t(locale, 'replaceInputHint'))
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }
}

// ── Modals ────────────────────────────────────────────────────────────────────

async function handleModal(interaction) {
  const { customId } = interaction;
  const locale = interaction.locale;

  // ── /tolkanoimport: rename a single slot ──────────────────────────────────
  if (customId.startsWith('tolk_rn_modal:')) {
    const [, userId, slotIdxRaw] = customId.split(':');
    const slotIdx = parseInt(slotIdxRaw, 10);
    if (interaction.user.id !== userId)
      return interaction.reply({ content: t(locale, 'notYourBuilder'), ephemeral: true });
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });

    const sKey = tolkanoSessionKey(interaction.guildId, userId);
    const session = tolkanoSessions.get(sKey);
    if (!session || session.teamIdx == null)
      return interaction.reply({ content: t(locale, 'sessionExpired'), ephemeral: true });

    const newName = interaction.fields.getTextInputValue('slot_name').trim();
    if (newName) session.slotNames[slotIdx] = newName;
    tolkanoSessions.set(sKey, session);

    await interaction.deferUpdate();
    return interaction.editReply(buildTolkanoNameMessage(session, userId, locale));
  }

  // ── /tolkanoimport: rename the team ───────────────────────────────────────
  if (customId.startsWith('tolk_rn_team_modal:')) {
    const userId = customId.split(':')[1];
    if (interaction.user.id !== userId)
      return interaction.reply({ content: t(locale, 'notYourBuilder'), ephemeral: true });
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });

    const sKey = tolkanoSessionKey(interaction.guildId, userId);
    const session = tolkanoSessions.get(sKey);
    if (!session || session.teamIdx == null)
      return interaction.reply({ content: t(locale, 'sessionExpired'), ephemeral: true });

    const newName = interaction.fields.getTextInputValue('team_name').trim();
    if (newName) session.name = newName;
    tolkanoSessions.set(sKey, session);

    await interaction.deferUpdate();
    return interaction.editReply(buildTolkanoNameMessage(session, userId, locale));
  }

  // ── Single-build "💾 Save as…" modal submit ───────────────────────────────
  if (customId.startsWith('build_save_modal:')) {
    const code = customId.slice('build_save_modal:'.length);
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });

    const name = interaction.fields.getTextInputValue('build_name').trim();
    if (!name)
      return interaction.reply({ content: '❌ Name cannot be empty.', ephemeral: true });

    try { decodeTemplate(code); } catch (err) {
      return interaction.reply({ content: t(locale, 'invalidCode', err.message), ephemeral: true });
    }

    try {
      await saveBuild({
        guildId: interaction.guildId,
        userId:  interaction.user.id,
        name,
        code,
        private: false, // default to shared from button flow; users can pass `private:true` on the slash command for explicit private save
      });
    } catch (err) {
      return interaction.reply({ content: `❌ Save failed: ${err.message}`, ephemeral: true });
    }

    // Re-render the parent message with the new save name in the footer.
    await interaction.deferUpdate();
    return renderBuild(interaction, code, name, locale, { private: false });
  }

  // ── Teambuilder: set team name ─────────────────────────────────────────────
  if (customId.startsWith('tb_modal_name:')) {
    const userId  = customId.slice('tb_modal_name:'.length);
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });
    const key = tbKey(interaction.guildId, userId);
    const session = tbSessions.get(key);
    if (!session)
      return interaction.reply({ content: t(locale, 'sessionExpired'), ephemeral: true });
    session.name = interaction.fields.getTextInputValue('team_name').trim();
    tbSessions.set(key, session);
    await interaction.deferUpdate();
    return interaction.editReply(await buildTeambuilderMessage(interaction.guildId, userId, locale));
  }

  // ── Teambuilder: enter custom build ───────────────────────────────────────
  if (customId.startsWith('tb_modal_custom:')) {
    const parts   = customId.split(':');
    const userId  = parts[1];
    const slotIdx = parseInt(parts[2], 10);
    if (!interaction.inGuild())
      return interaction.reply({ content: t(locale, 'guildOnly'), ephemeral: true });
    const key = tbKey(interaction.guildId, userId);
    const session = tbSessions.get(key);
    if (!session)
      return interaction.reply({ content: t(locale, 'sessionExpired'), ephemeral: true });

    const code = interaction.fields.getTextInputValue('build_code').trim();
    const name = interaction.fields.getTextInputValue('build_name').trim();

    try { decodeTemplate(code); } catch (err) {
      return interaction.reply({ content: `❌ Invalid code: ${err.message}`, ephemeral: true });
    }

    // Custom builds entered in the team builder are saved as shared to the guild.
    await saveBuild({ guildId: interaction.guildId, userId, name, code, private: false });
    session.slots[slotIdx] = { name, code };
    tbSessions.set(key, session);
    await interaction.deferUpdate();
    return interaction.editReply(await buildTeambuilderMessage(interaction.guildId, userId, locale));
  }

  // ── Teambuild: replace slot ────────────────────────────────────────────────
  if (customId.startsWith('replace_modal:')) {
    await interaction.deferUpdate();

    const slotIndex = parseInt(customId.split(':')[1], 10);
    const newCode   = interaction.fields.getTextInputValue('new_code').trim();

    // Reconstruct codes from the replace buttons
    const oldButtons = interaction.message.components.flatMap(row =>
      row.components.filter(c => c.customId?.startsWith('replace:')),
    );
    const codes = oldButtons.map(b => b.customId.split(':').slice(2).join(':'));
    codes[slotIndex] = newCode;

    // Recover saved name + scope from the hidden disabled button (if present).
    // Format: `saved_name:<scope>:<name>` (newer) or `saved_name:<name>` (older).
    const savedNameBtn = interaction.message.components
      .flatMap(row => row.components)
      .find(c => c.customId?.startsWith('saved_name:'));
    let savedName = null;
    let savedScope = 'shared';
    if (savedNameBtn) {
      const tail = savedNameBtn.customId.slice('saved_name:'.length);
      const firstColon = tail.indexOf(':');
      if (firstColon >= 0 && (tail.startsWith('private:') || tail.startsWith('shared:'))) {
        savedScope = tail.slice(0, firstColon);
        savedName  = tail.slice(firstColon + 1);
      } else {
        savedName = tail;
      }
    }

    await renderTeamBuild(interaction, codes, savedName, locale, { private: savedScope === 'private' });
  }
}
