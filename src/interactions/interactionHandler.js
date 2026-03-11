/**
 * Interaction handler router
 *
 * Handles:
 *  • skill_info:* select menus  →  show skill detail embed (ephemeral)
 *  • copy_template:<code>       →  ephemeral reply with raw template code
 *  • replace:<index>:<code>     →  prompt user for new template code via modal
 *  • replace_modal:<index>      →  re-render team build with replaced slot
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
import { tbSessions, buildTeambuilderMessage } from '../commands/teambuilder.js';
import { saveBuild, loadBuild } from '../lib/buildStore.js';

// In-memory store for ongoing team build sessions
const teamSessions = new Map();

export function saveSession(key, builds) { teamSessions.set(key, builds); }
export function getSession(key)          { return teamSessions.get(key); }

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
      return interaction.reply({ content: '⚠️ This builder belongs to someone else.', ephemeral: true });

    const session = tbSessions.get(userId);
    if (!session)
      return interaction.reply({ content: '⚠️ Session expired. Run /teambuilder again.', ephemeral: true });

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
      const entry = loadBuild(value);
      if (entry) session.slots[slotIdx] = { name: entry.name, code: entry.code };
    }
    await interaction.deferUpdate();
    return interaction.editReply(buildTeambuilderMessage(userId));
  }

  // ── Skill info select ──────────────────────────────────────────────────────
  if (customId.startsWith('skill_info:')) {
    const slotIndex = parseInt(values[0], 10);

    const templateCode = interaction.message.embeds[0]?.footer?.text
      ?.replace(/^Template\s*:\s*/i, '')  // strip "Template: " prefix
      ?.replace(/\s*·\s*💾.*/u, '')       // strip " · 💾 name" suffix
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
      return interaction.reply({ content: '⚠️ This builder belongs to someone else.', ephemeral: true });

    const session = tbSessions.get(userId);
    if (!session)
      return interaction.reply({ content: '⚠️ Session expired. Run /teambuilder again.', ephemeral: true });

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
      await interaction.deferUpdate();
      return interaction.editReply(buildTeambuilderMessage(userId));
    }

    if (prefix === 'tb_render') {
      const codes = session.slots.filter(Boolean).map(s => s.code);
      if (codes.length === 0)
        return interaction.reply({ content: '⚠️ Select at least one build first.', ephemeral: true });
      await interaction.deferUpdate();
      await renderTeamBuild(interaction, codes, session.name, locale);
      tbSessions.delete(userId);
      return;
    }
  }

  // ── Copy template button ──────────────────────────────────────────────────
  if (customId.startsWith('copy_template:')) {
    // format: copy_template:<index>:<code>  (index kept unique across builds)
    const rest  = customId.slice('copy_template:'.length);
    const code  = rest.slice(rest.indexOf(':') + 1);
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

  // ── Teambuilder: set team name ─────────────────────────────────────────────
  if (customId.startsWith('tb_modal_name:')) {
    const userId  = customId.slice('tb_modal_name:'.length);
    const session = tbSessions.get(userId);
    if (!session)
      return interaction.reply({ content: '⚠️ Session expired. Run /teambuilder again.', ephemeral: true });
    session.name = interaction.fields.getTextInputValue('team_name').trim();
    await interaction.deferUpdate();
    return interaction.editReply(buildTeambuilderMessage(userId));
  }

  // ── Teambuilder: enter custom build ───────────────────────────────────────
  if (customId.startsWith('tb_modal_custom:')) {
    const parts   = customId.split(':');
    const userId  = parts[1];
    const slotIdx = parseInt(parts[2], 10);
    const session = tbSessions.get(userId);
    if (!session)
      return interaction.reply({ content: '⚠️ Session expired. Run /teambuilder again.', ephemeral: true });

    const code = interaction.fields.getTextInputValue('build_code').trim();
    const name = interaction.fields.getTextInputValue('build_name').trim();

    try { decodeTemplate(code); } catch (err) {
      return interaction.reply({ content: `❌ Invalid code: ${err.message}`, ephemeral: true });
    }

    saveBuild(name, code);
    session.slots[slotIdx] = { name, code };
    await interaction.deferUpdate();
    return interaction.editReply(buildTeambuilderMessage(userId));
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

    // Recover saved name from the hidden disabled button (if present)
    const savedNameBtn = interaction.message.components
      .flatMap(row => row.components)
      .find(c => c.customId?.startsWith('saved_name:'));
    const savedName = savedNameBtn ? savedNameBtn.customId.slice('saved_name:'.length) : null;

    await renderTeamBuild(interaction, codes, savedName, locale);
  }
}

