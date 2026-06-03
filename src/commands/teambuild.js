/**
 * /teambuild command
 * Usage: /teambuild [name:<savename>] [private:true] build1:<code> ... [build8:<code>]
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
    .setDescription('Render a full Guild Wars 1 team build / Afficher un build d\'équipe GW1')
    .setDMPermission(false),
)
  .addStringOption(opt =>
    opt.setName('name')
       .setDescription('Save this team build under a name for later use with /loadteam')
       .setRequired(false),
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
  await interaction.deferReply();
  const locale    = interaction.locale;
  const name      = interaction.options.getString('name')?.trim() || null;
  const isPrivate = interaction.options.getBoolean('private') ?? false;

  const rawCodes = [];
  for (let i = 1; i <= 8; i++) {
    const code = interaction.options.getString(`build${i}`);
    if (code) rawCodes.push(code.trim());
  }

  if (rawCodes.length === 0) {
    return interaction.editReply({ content: t(locale, 'noBuildCode') });
  }

  await renderTeamBuild(interaction, rawCodes, name, locale, { private: isPrivate });
}

/**
 * Shared render helper — used by /teambuild, /loadteam, and the replace modal.
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').ModalSubmitInteraction} interaction
 * @param {string[]}    codes   Template codes
 * @param {string|null} name    Save name (null = anonymous, no save)
 * @param {string}      [locale]
 * @param {object}      [opts]
 * @param {boolean}     [opts.private] If true and `name` is set, save as user-private
 * @param {(payload:any)=>Promise<any>} [opts.responder] Custom sender (defaults to interaction.editReply)
 */
export async function renderTeamBuild(interaction, codes, name, locale, opts = {}) {
  locale ??= interaction.locale;

  const builds = [];
  const errors = [];

  for (let i = 0; i < codes.length; i++) {
    try {
      const decoded = decodeTemplate(codes[i]);
      const skills  = resolveSkills(decoded.skills);
      const saved   = interaction.inGuild()
        ? await findBuildByCode({ guildId: interaction.guildId, userId: interaction.user.id, code: codes[i] })
        : null;
      builds.push({ decoded, skills, code: codes[i], savedName: saved?.name ?? null });
    } catch (err) {
      errors.push(`Build ${i + 1}: ${err.message}`);
    }
  }

  if (builds.length === 0) {
    return interaction.editReply({ content: t(locale, 'allFailed', errors.join('\n')) });
  }

  if (name && interaction.inGuild()) {
    await saveTeamBuild({
      guildId: interaction.guildId,
      userId:  interaction.user.id,
      name,
      codes:   builds.map(b => b.code),
      private: !!opts.private,
    });
  }

  const imgBuffer  = await renderTeamBuildImage(builds);
  const attachment = new AttachmentBuilder(imgBuffer, { name: 'teambuild.png' });

  const scopeTag = name
    ? ` · ${opts.private ? t(locale, 'privateLabel') : t(locale, 'sharedLabel')}`
    : '';
  const footerText = t(locale, 'teamFooter', builds.length) + (name ? ` · 💾 ${name}${scopeTag}` : '');

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

  // Hidden disabled button to carry the save name + scope through replace interactions
  if (name) {
    const scope = opts.private ? 'private' : 'shared';
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`saved_name:${scope}:${name}`)
          .setLabel(t(locale, 'savedNameBtn', name))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      ),
    );
  }

  const payload = {
    embeds:     [embed],
    files:      [attachment],
    components: components.slice(0, 5),
  };
  if (opts.responder) await opts.responder(payload);
  else await interaction.editReply(payload);
}
