/**
 * UI helpers — reusable Discord embed / component builders.
 */

import {
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { PROFESSION_COLORS } from './templateDecoder.js';
import { t } from '../data/i18n.js';

/**
 * Build a skill info embed for a given skill object.
 * @param {object} skill
 * @param {number} slotIndex  0-based slot index
 * @param {string} locale     interaction.locale
 */
export function buildSkillInfoEmbed(skill, slotIndex, locale = 'en-US') {
  const color = skill.professionColor
    ? parseInt(skill.professionColor.replace('#', ''), 16)
    : 0x6688cc;

  const fields = [];
  if (skill.type)       fields.push({ name: t(locale, 'fieldType'),       value: skill.type,                    inline: true });
  if (skill.attribute)  fields.push({ name: t(locale, 'fieldAttribute'),  value: skill.attribute,               inline: true });
  if (skill.energy)     fields.push({ name: t(locale, 'fieldEnergy'),     value: `${skill.energy} ⚡`,           inline: true });
  if (skill.activation) fields.push({ name: t(locale, 'fieldActivation'), value: `${skill.activation}s`,        inline: true });
  if (skill.recharge)   fields.push({ name: t(locale, 'fieldRecharge'),   value: `${skill.recharge}s`,          inline: true });
  if (skill.campaign)   fields.push({ name: t(locale, 'fieldCampaign'),   value: skill.campaign,                inline: true });

  const wikiUrl = `https://wiki.guildwars.com/wiki/${skill.name.replace(/ /g, '_')}`;

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'skillSlotTitle', slotIndex, skill.name))
    .setURL(wikiUrl)
    .setDescription(skill.description || t(locale, 'noDesc'))
    .setColor(color);

  if (fields.length) embed.addFields(fields);
  if (skill.iconUrl)  embed.setThumbnail(skill.iconUrl);

  return embed;
}

/**
 * Build a StringSelectMenu that allows users to pick a skill slot to inspect.
 * @param {Array}  skills    Array of 8 skill objects
 * @param {string} customId  baseId of the select menu
 * @param {string} locale    interaction.locale
 */
export function buildSkillSelectMenu(skills, customId, locale = 'en-US') {
  const options = skills.map((skill, i) => {
    const isEmpty = !skill || skill.type === 'None';

    const label = isEmpty
      ? t(locale, 'emptySlotLabel', i)
      : t(locale, 'skillSlotLabel', i, skill.name);

    const desc = isEmpty
      ? t(locale, 'emptySlotDesc')
      : [
          skill.type,
          skill.energy      ? `${skill.energy}⚡`  : null,
          skill.activation  ? `${skill.activation}s cast` : null,
          skill.recharge    ? `${skill.recharge}s recharge` : null,
        ].filter(Boolean).join(' · ').slice(0, 100);

    return new StringSelectMenuOptionBuilder()
      .setValue(String(i))
      .setLabel(label.slice(0, 100))
      .setDescription(desc || '\u200b');
  });

  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(t(locale, 'selectPlaceholder'))
    .addOptions(options);
}
