/**
 * /importbuilds command
 *
 * Bulk-imports Guild Wars build template files into the bot.
 * Attach either a single `<name>.txt` or a `.zip` of your entire
 * `Guild Wars/Templates/` folder. The filename (sans extension) is used as
 * each build's save name.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { parseImportBuffer, fetchAttachment } from '../lib/buildsImporter.js';
import { importSessions, importSessionKey } from '../interactions/interactionHandler.js';
import { t } from '../data/i18n.js';

export const data = new SlashCommandBuilder()
  .setName('importbuilds')
  .setDescription('Bulk-import .txt template files (single or .zip) / Importer en masse vos builds GW')
  .setDMPermission(false)
  .addAttachmentOption(opt =>
    opt.setName('file')
       .setDescription('A .txt template file, or a .zip of your Guild Wars/Templates/ folder')
       .setRequired(true),
  )
  .addBooleanOption(opt =>
    opt.setName('private')
       .setDescription('If true, all imported builds are private to you in this server (default: false)')
       .setRequired(false),
  );

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: t(interaction.locale, 'guildOnly'), ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const locale     = interaction.locale;
  const attachment = interaction.options.getAttachment('file', true);
  const isPrivate  = interaction.options.getBoolean('private') ?? false;

  let entries, format;
  try {
    const buf = await fetchAttachment(attachment.url, attachment.size);
    ({ entries, format } = parseImportBuffer(buf, attachment.name));
  } catch (err) {
    return interaction.editReply({ content: `❌ ${err.message}` });
  }

  if (entries.length === 0) {
    return interaction.editReply({ content: t(locale, 'importEmpty') });
  }

  const valid   = entries.filter(e => e.valid);
  const invalid = entries.filter(e => !e.valid);

  // Stash for the Save All button
  importSessions.set(
    importSessionKey(interaction.guildId, interaction.user.id),
    { entries: valid, private: isPrivate },
  );

  await interaction.editReply(buildImportPreview({
    valid,
    invalid,
    format,
    isPrivate,
    userId: interaction.user.id,
    locale,
  }));
}

function buildImportPreview({ valid, invalid, format, isPrivate, userId, locale }) {
  const lines = [];
  if (valid.length) {
    lines.push(`**${t(locale, 'importValidHeader', valid.length)}**`);
    lines.push(valid.slice(0, 20).map(e => `• \`${truncate(e.name, 50)}\``).join('\n'));
    if (valid.length > 20) lines.push(`…and **${valid.length - 20}** more`);
  }
  if (invalid.length) {
    if (lines.length) lines.push('');
    lines.push(`**${t(locale, 'importInvalidHeader', invalid.length)}**`);
    lines.push(invalid.slice(0, 10).map(e =>
      `• \`${truncate(e.name, 40)}\` — ${e.error || 'invalid'}`,
    ).join('\n'));
    if (invalid.length > 10) lines.push(`…and **${invalid.length - 10}** more`);
  }

  const scopeTag = isPrivate ? t(locale, 'privateLabel') : t(locale, 'sharedLabel');

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'importTitle', format.toUpperCase()))
    .setColor(0x1a1a2e)
    .setDescription(lines.join('\n').slice(0, 4000))
    .setFooter({ text: t(locale, 'importFooter', scopeTag) });

  const components = [];
  if (valid.length > 0) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`import_save:${userId}`)
        .setLabel(t(locale, 'importSaveBtn', valid.length))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`import_cancel:${userId}`)
        .setLabel(t(locale, 'tolkCancelBtn'))
        .setStyle(ButtonStyle.Danger),
    ));
  } else {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`import_cancel:${userId}`)
        .setLabel(t(locale, 'tolkCancelBtn'))
        .setStyle(ButtonStyle.Secondary),
    ));
  }

  return { embeds: [embed], components, content: '' };
}

function truncate(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
