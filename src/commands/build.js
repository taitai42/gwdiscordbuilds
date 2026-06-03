/**
 * /build command
 * Usage: /build code:<template_code> [name:<savename>] [private:true]
 * Renders a single GW1 build as a skill bar image with skill-info buttons.
 */

import {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { decodeTemplate, PROFESSION_COLORS } from '../lib/templateDecoder.js';
import { resolveSkills } from '../lib/skillData.js';
import { renderBuildBar } from '../lib/skillRenderer.js';
import { buildSkillSelectMenu } from '../lib/uiHelpers.js';
import { getAttributeName } from '../data/attributeMap.js';
import { t } from '../data/i18n.js';
import { saveBuild } from '../lib/buildStore.js';

export const data = new SlashCommandBuilder()
  .setName('build')
  .setDescription('Render a Guild Wars 1 build from a template code / Afficher un build GW1 depuis un code de template')
  .setDMPermission(false)
  .addStringOption(opt =>
    opt.setName('code')
       .setDescription('Build template code (e.g. OwUTMoqhWxrDWYDgUgsYA)')
       .setRequired(true),
  )
  .addStringOption(opt =>
    opt.setName('name')
       .setDescription('Save this build under a name for later use with /load')
       .setRequired(false),
  )
  .addBooleanOption(opt =>
    opt.setName('private')
       .setDescription('If true, only you can /load this build in this server')
       .setRequired(false),
  );

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: t(interaction.locale, 'guildOnly'), ephemeral: true });
  }
  await interaction.deferReply();
  const locale    = interaction.locale;
  const code      = interaction.options.getString('code', true).trim();
  const name      = interaction.options.getString('name')?.trim() || null;
  const isPrivate = interaction.options.getBoolean('private') ?? false;
  await renderBuild(interaction, code, name, locale, { private: isPrivate });
}

/**
 * Shared render helper — used by /build and /load.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string}      code     Template code
 * @param {string|null} name     Save name (null = don't save / anonymous)
 * @param {string}      [locale]
 * @param {object}      [opts]
 * @param {boolean}     [opts.private] If true and `name` is set, save as user-private
 */
export async function renderBuild(interaction, code, name, locale, opts = {}) {
  locale ??= interaction.locale;

  let decoded;
  try {
    decoded = decodeTemplate(code);
  } catch (err) {
    return interaction.editReply({ content: t(locale, 'invalidCode', err.message) });
  }

  if (name && interaction.inGuild()) {
    await saveBuild({
      guildId: interaction.guildId,
      userId:  interaction.user.id,
      name,
      code,
      private: !!opts.private,
    });
  }

  const skills = resolveSkills(decoded.skills);

  const imgBuffer  = await renderBuildBar(decoded, skills, name);
  const attachment = new AttachmentBuilder(imgBuffer, { name: 'build.png' });

  const color = PROFESSION_COLORS[decoded.primary] ?? '#888888';

  const attrSummary = decoded.attributes.length
    ? decoded.attributes.map(a => `**${getAttributeName(a.id)}**: ${a.level}`).join('  |  ')
    : t(locale, 'noAttrs');

  const scopeTag = name
    ? ` · ${opts.private ? t(locale, 'privateLabel') : t(locale, 'sharedLabel')}`
    : '';
  const footerText = t(locale, 'templateFooter', code) + (name ? ` · 💾 ${name}${scopeTag}` : '');

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'buildTitle', decoded.primary, decoded.secondary))
    .setDescription(attrSummary)
    .setImage('attachment://build.png')
    .setColor(parseInt(color.replace('#', ''), 16))
    .setFooter({ text: footerText });

  const selectMenu = buildSkillSelectMenu(skills, 'skill_info:single', locale);

  const copyBtn = new ButtonBuilder()
    .setCustomId(`copy_template:${code}`)
    .setLabel(t(locale, 'copyTemplate'))
    .setStyle(ButtonStyle.Secondary);

  const saveBtn = new ButtonBuilder()
    .setCustomId(`build_save:${code}`)
    .setLabel(t(locale, 'saveAsBtn'))
    .setStyle(ButtonStyle.Primary);

  const rowSelect  = new ActionRowBuilder().addComponents(selectMenu);
  const rowButtons = new ActionRowBuilder().addComponents(copyBtn, saveBtn);

  await interaction.editReply({
    embeds:     [embed],
    files:      [attachment],
    components: [rowSelect, rowButtons],
  });
}
