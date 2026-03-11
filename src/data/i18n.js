/**
 * i18n — French / English UI strings for the bot.
 *
 * Usage:
 *   import { t } from '../data/i18n.js';
 *   t(interaction.locale, 'buildTitle', 'Warrior', 'Paragon')
 *
 * Discord locale strings: https://discord.com/developers/docs/reference#locales
 * French users have interaction.locale === 'fr'
 */

const STRINGS = {
  en: {
    // ── /build ───────────────────────────────────────────────────────────────
    buildTitle:         (pri, sec)    => `${pri} / ${sec} Build`,
    noAttrs:            ()            => 'No attributes set',
    templateFooter:     (code)        => `Template: ${code}`,
    invalidCode:        (msg)         => `❌ Invalid template code: ${msg}`,
    copyTemplate:       '📋 Copy Template',

    // ── /teambuild ───────────────────────────────────────────────────────────
    teamBuildTitle:     'Team Build',
    teamFooter:         (n)           => `${n} build(s) • Click Replace to swap a build`,
    noBuildCode:        '❌ Please provide at least one build template code.',
    allFailed:          (errs)        => `❌ All template codes failed:\n${errs}`,
    replaceBtn:         (i)           => `🔄 #${i + 1}`,
    copyBtn:            (i)           => `📋 #${i + 1}`,
    noBuildsRemain:     '❌ No valid builds remain.',

    // ── Skill info embed ─────────────────────────────────────────────────────
    skillSlotTitle:     (i, name)     => `Slot ${i + 1}: ${name}`,
    noDesc:             'No description available.',
    wikiLink:           (url)         => `[View on GW Wiki](${url})`,
    fieldType:          'Type',
    fieldAttribute:     'Attribute',
    fieldEnergy:        'Energy',
    fieldActivation:    'Activation',
    fieldRecharge:      'Recharge',
    fieldCampaign:      'Campaign',

    // ── Select menu ──────────────────────────────────────────────────────────
    selectPlaceholder:  'Select a skill to view its details…',
    emptySlotLabel:     (i)           => `Slot ${i + 1}: (empty)`,
    skillSlotLabel:     (i, name)     => `Slot ${i + 1}: ${name}`,
    emptySlotDesc:      'Empty skill slot',

    // ── Replace modal ────────────────────────────────────────────────────────
    replaceModalTitle:  (i)           => `Replace Build #${i + 1}`,
    replaceInputLabel:  'New template code',
    replaceInputHint:   'e.g. OwUTMoqhWxrDWYDgUgsYA',

    // ── Save / Load ───────────────────────────────────────────────────────────
    buildSaved:         (name)        => `✅ Build saved as **${name}**`,
    teamSaved:          (name)        => `✅ Team build saved as **${name}**`,
    notFound:           (name)        => `❌ No saved build found with name **${name}**`,
    teamNotFound:       (name)        => `❌ No saved team build found with name **${name}**`,
    savedNameBtn:       (name)        => `💾 ${name}`,

    // ── Misc ─────────────────────────────────────────────────────────────────
    copyContent:        (code)        => `\`\`\`\n${code}\n\`\`\``,
    noTemplateCode:     '⚠️ Could not find template code.',
  },

  fr: {
    buildTitle:         (pri, sec)    => `Build ${pri} / ${sec}`,
    noAttrs:            ()            => 'Aucun attribut défini',
    templateFooter:     (code)        => `Template : ${code}`,
    invalidCode:        (msg)         => `❌ Code de template invalide : ${msg}`,
    copyTemplate:       '📋 Copier le template',

    teamBuildTitle:     'Build d\'équipe',
    teamFooter:         (n)           => `${n} build(s) • Cliquez sur 🔄 pour remplacer un build`,
    noBuildCode:        '❌ Veuillez fournir au moins un code de template.',
    allFailed:          (errs)        => `❌ Tous les codes ont échoué :\n${errs}`,
    replaceBtn:         (i)           => `🔄 #${i + 1}`,
    copyBtn:            (i)           => `📋 #${i + 1}`,
    noBuildsRemain:     '❌ Aucun build valide restant.',

    skillSlotTitle:     (i, name)     => `Emplacement ${i + 1} : ${name}`,
    noDesc:             'Aucune description disponible.',
    wikiLink:           (url)         => `[Voir sur le Wiki GW](${url})`,
    fieldType:          'Type',
    fieldAttribute:     'Attribut',
    fieldEnergy:        'Énergie',
    fieldActivation:    'Activation',
    fieldRecharge:      'Recharge',
    fieldCampaign:      'Campagne',

    selectPlaceholder:  'Sélectionnez un skill pour voir ses détails…',
    emptySlotLabel:     (i)           => `Emplacement ${i + 1} : (vide)`,
    skillSlotLabel:     (i, name)     => `Emplacement ${i + 1} : ${name}`,
    emptySlotDesc:      'Emplacement vide',

    replaceModalTitle:  (i)           => `Remplacer le build #${i + 1}`,
    replaceInputLabel:  'Nouveau code de template',
    replaceInputHint:   'ex. OwUTMoqhWxrDWYDgUgsYA',

    // ── Save / Load ───────────────────────────────────────────────────────────
    buildSaved:         (name)        => `✅ Build sauvegardé sous **${name}**`,
    teamSaved:          (name)        => `✅ Build d'équipe sauvegardé sous **${name}**`,
    notFound:           (name)        => `❌ Aucun build trouvé avec le nom **${name}**`,
    teamNotFound:       (name)        => `❌ Aucun build d'équipe trouvé avec le nom **${name}**`,
    savedNameBtn:       (name)        => `💾 ${name}`,

    copyContent:        (code)        => `\`\`\`\n${code}\n\`\`\``,
    noTemplateCode:     '⚠️ Impossible de retrouver le code du template.',
  },
};

/**
 * Translate a string key for a given Discord locale.
 * Falls back to English for any non-French locale.
 *
 * @param {string}  locale  interaction.locale (e.g. 'en-US', 'fr')
 * @param {string}  key     Key from STRINGS
 * @param {...any}  args    Arguments forwarded to the string if it is a function
 * @returns {string}
 */
export function t(locale, key, ...args) {
  const lang = locale?.startsWith('fr') ? 'fr' : 'en';
  const val  = STRINGS[lang]?.[key] ?? STRINGS.en[key];
  if (val === undefined) return key; // fallback for missing keys
  return typeof val === 'function' ? val(...args) : val;
}
