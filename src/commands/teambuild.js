/**
 * /teambuild command
 * Usage: /teambuild [name:<savename>] build1:<code> ... [build8:<code>]
 */

import {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { decodeTemplate } from '../lib/templateDecoder.js';
import { resolveSkills } from '../lib/skillData.js';
import { renderTeamBuildImage } from '../lib/skillRenderer.js';
import { t } from '../data/i18n.js';
import { saveTeamBuild, findBuildByCode } from '../lib/buildStore.js';

function addBuildOptions(builder) {
  for (let i = 1; i <= 8; i++) {
    builder.addStringOption(opt =>
      opt.setName(`build${i}`)
         .setDescription(`Build ${i} template code`)
         .setRequired(i === 1),
    );
  }
  return builder;
}

export const data = addBuildOptions(
  new SlashCommandBuilder()
    .setName('teambuild')
    .setDescription('Render a full Guild Wars 1 team build / Afficher un build d\'équipe GW1'),
).addStringOption(opt =>
  opt.setName('name')
     .setDescription('Save this team build under a name for later use with /loadteam')
     .setRequired(false),
);

export async function execute(interaction) {
  await interaction.deferReply();
  const locale = interaction.locale;
  const name   = interaction.options.getString('name')?.trim() || null;

  const rawCodes = [];
  for (let i = 1; i <= 8; i++) {
    const code = interaction.options.getString(`build${i}`);
    if (code) rawCodes.push(code.trim());
  }

  if (rawCodes.length === 0) {
    return interaction.editReply({ content: t(locale, 'noBuildCode') });
  }

  await renderTeamBuild(interaction, rawCodes, name, locale);
}

/**
 * Shared render helper — used by /teambuild, /loadteam, and the replace modal.
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').ModalSubmitInteraction} interaction
 * @param {string[]}    codes   Template codes
 * @param {string|null} name    Save name (null = anonymous)
 * @param {string}      [locale]
 */
export async function renderTeamBuild(interaction, codes, name, locale) {
  locale ??= interaction.locale;

  const builds = [];
  const errors = [];

  for (let i = 0; i < codes.length; i++) {
    try {
      const decoded    = decodeTemplate(codes[i]);
      const skills     = resolveSkills(decoded.skills);
      const savedName  = findBuildByCode(codes[i])?.name ?? null;
      builds.push({ decoded, skills, code: codes[i], savedName });
    } catch (err) {
      errors.push(`Build ${i + 1}: ${err.message}`);
    }
  }

  if (builds.length === 0) {
    return interaction.editReply({ content: t(locale, 'allFailed', errors.join('\n')) });
  }

  if (name) saveTeamBuild(name, builds.map(b => b.code));

  const imgBuffer  = await renderTeamBuildImage(builds);
  const attachment = new AttachmentBuilder(imgBuffer, { name: 'teambuild.png' });

  const footerText = t(locale, 'teamFooter', builds.length) + (name ? ` · 💾 ${name}` : '');

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'teamBuildTitle'))
    .setDescription(
      builds.map((b, i) => {
        const tag = b.savedName ? ` · **${b.savedName}**` : '';
        return `**${i + 1}.** ${b.decoded.primary}/${b.decoded.secondary}${tag}`;
      }).join('\n') +
      (errors.length ? `\n\n⚠️ ${errors.join(', ')}` : ''),
    )
    .setImage('attachment://teambuild.png')
    .setColor(0x1a1a2e)
    .setFooter({ text: footerText });

  const replaceButtons = builds.map((b, i) =>
    new ButtonBuilder()
      .setCustomId(`replace:${i}:${b.code}`)
      .setLabel(t(locale, 'replaceBtn', i))
      .setStyle(ButtonStyle.Secondary),
  );
  const copyButtons = builds.map((b, i) =>
    new ButtonBuilder()
      .setCustomId(`copy_template:${i}:${b.code}`)
      .setLabel(t(locale, 'copyBtn', i))
      .setStyle(ButtonStyle.Primary),
  );

  const components = [];
  for (let r = 0; r < replaceButtons.length; r += 5)
    components.push(new ActionRowBuilder().addComponents(replaceButtons.slice(r, r + 5)));
  for (let r = 0; r < copyButtons.length; r += 5)
    components.push(new ActionRowBuilder().addComponents(copyButtons.slice(r, r + 5)));

  // Hidden disabled button to carry the save name through replace interactions
  if (name) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`saved_name:${name}`)
          .setLabel(t(locale, 'savedNameBtn', name))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      ),
    );
  }

  await interaction.editReply({
    embeds:     [embed],
    files:      [attachment],
    components: components.slice(0, 5),
  });
}

