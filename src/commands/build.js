/**
 * /build command
 * Usage: /build code:<template_code>
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
import { buildSkillInfoEmbed, buildSkillSelectMenu } from '../lib/uiHelpers.js';
import { getAttributeName } from '../data/attributeMap.js';
import { t } from '../data/i18n.js';
import { saveBuild } from '../lib/buildStore.js';

export const data = new SlashCommandBuilder()
  .setName('build')
  .setDescription('Render a Guild Wars 1 build from a template code / Afficher un build GW1 depuis un code de template')
  .addStringOption(opt =>
    opt.setName('code')
       .setDescription('Build template code (e.g. OwUTMoqhWxrDWYDgUgsYA)')
       .setRequired(true),
  )
  .addStringOption(opt =>
    opt.setName('name')
       .setDescription('Save this build under a name for later use with /load')
       .setRequired(false),
  );

export async function execute(interaction) {
  await interaction.deferReply();
  const locale = interaction.locale;
  const code   = interaction.options.getString('code', true).trim();
  const name   = interaction.options.getString('name')?.trim() || null;
  await renderBuild(interaction, code, name, locale);
}

/**
 * Shared render helper — used by /build and /load.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string}      code    Template code
 * @param {string|null} name    Save name (null = don't save / anonymous)
 * @param {string}      [locale]
 */
export async function renderBuild(interaction, code, name, locale) {
  locale ??= interaction.locale;

  let decoded;
  try {
    decoded = decodeTemplate(code);
  } catch (err) {
    return interaction.editReply({ content: t(locale, 'invalidCode', err.message) });
  }

  if (name) saveBuild(name, code);

  const skills = resolveSkills(decoded.skills);

  const imgBuffer  = await renderBuildBar(decoded, skills, name);
  const attachment = new AttachmentBuilder(imgBuffer, { name: 'build.png' });

  const color = PROFESSION_COLORS[decoded.primary] ?? '#888888';

  // Attribute summary with real names
  const attrSummary = decoded.attributes.length
    ? decoded.attributes.map(a => `**${getAttributeName(a.id)}**: ${a.level}`).join('  |  ')
    : t(locale, 'noAttrs');

  const footerText = t(locale, 'templateFooter', code) + (name ? ` · 💾 ${name}` : '');

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

  const rowSelect  = new ActionRowBuilder().addComponents(selectMenu);
  const rowButtons = new ActionRowBuilder().addComponents(copyBtn);

  await interaction.editReply({
    embeds:     [embed],
    files:      [attachment],
    components: [rowSelect, rowButtons],
  });
}
