/**
 * /teambuilder command
 * Interactive team builder: pick saved builds from dropdowns or paste new ones.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { listBuilds } from '../lib/buildStore.js';

// ── In-memory sessions ────────────────────────────────────────────────────────
// key: userId  →  { name: string|null, slots: Array(8) of {name,code}|null, page: 0|1 }
export const tbSessions = new Map();

export const data = new SlashCommandBuilder()
  .setName('teambuilder')
  .setDescription('Build a team interactively from saved builds / Construire une équipe interactivement');

export async function execute(interaction) {
  const userId = interaction.user.id;
  tbSessions.set(userId, { name: null, slots: Array(8).fill(null), page: 0 });
  await interaction.reply(buildTeambuilderMessage(userId));
}

// ── Message builder ───────────────────────────────────────────────────────────

/**
 * Build the full message payload for the team builder.
 * @param {string} userId
 * @returns {{ embeds, components }}
 */
export function buildTeambuilderMessage(userId) {
  const session = tbSessions.get(userId);
  if (!session) return { content: '⚠️ Session expired. Run /teambuilder again.', components: [] };

  const { name, slots, page } = session;
  const pageStart = page * 4; // slots 0-3 or 4-7

  const savedBuilds = listBuilds().slice(0, 24); // max 25 options = 1 custom + 24 saved

  // ── Embed ─────────────────────────────────────────────────────────────────
  const slotLines = slots.map((s, i) =>
    s ? `**${i + 1}.** ${s.name}` : `**${i + 1}.** *(empty)*`,
  );

  const embed = new EmbedBuilder()
    .setTitle('🔨 Team Builder')
    .setDescription(slotLines.join('\n'))
    .setColor(0x1a1a2e)
    .setFooter({ text: name ? `Team: ${name}` : 'No team name — click 🏷️ to set one' });

  // ── Row 1: action buttons ─────────────────────────────────────────────────
  const nameBtn = new ButtonBuilder()
    .setCustomId(`tb_name:${userId}`)
    .setLabel(name ? `🏷️ ${name.slice(0, 20)}` : '🏷️ Set Team Name')
    .setStyle(ButtonStyle.Secondary);

  const pageBtn = new ButtonBuilder()
    .setCustomId(`tb_page:${userId}`)
    .setLabel(page === 0 ? 'Slots 5–8 ▶' : '◀ Slots 1–4')
    .setStyle(ButtonStyle.Secondary);

  const renderBtn = new ButtonBuilder()
    .setCustomId(`tb_render:${userId}`)
    .setLabel('🔨 Build Team')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(slots.every(s => !s));

  const row1 = new ActionRowBuilder().addComponents(nameBtn, pageBtn, renderBtn);

  // ── Rows 2-5: one select menu per slot on current page ────────────────────
  const selectRows = [];
  for (let i = 0; i < 4; i++) {
    const slotIdx = pageStart + i;
    const current = slots[slotIdx];

    const options = [
      new StringSelectMenuOptionBuilder()
        .setValue('tb_custom')
        .setLabel('📝 Enter new build…')
        .setDescription('Paste a template code and save it with a name'),
    ];

    if (current) {
      // Add "clear" option when a slot is selected
      options.push(
        new StringSelectMenuOptionBuilder()
          .setValue('tb_clear')
          .setLabel('✕ Clear this slot')
          .setDescription('Remove the current build from this slot'),
      );
    }

    for (const b of savedBuilds) {
      const opt = new StringSelectMenuOptionBuilder()
        .setValue(b.name)
        .setLabel(b.name.slice(0, 100))
        .setDescription(b.code.slice(0, 50));
      if (current?.name === b.name) opt.setDefault(true);
      options.push(opt);
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`tb_slot:${userId}:${slotIdx}`)
      .setPlaceholder(`Slot ${slotIdx + 1}${current ? ` · ${current.name}` : ' (empty)'}`)
      .addOptions(options);

    selectRows.push(new ActionRowBuilder().addComponents(select));
  }

  return { embeds: [embed], components: [row1, ...selectRows] };
}
