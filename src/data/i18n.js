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
    notFound:           (name)        => `❌ No saved build found with name **${name}** in this server`,
    teamNotFound:       (name)        => `❌ No saved team build found with name **${name}** in this server`,
    savedNameBtn:       (name)        => `💾 ${name}`,
    privateLabel:       '🔒 private',
    sharedLabel:        '👥 shared',
    privateOptionDesc:  'When true, this save is only visible to you in this server',
    guildOnly:          '⚠️ This command can only be used inside a Discord server.',
    sessionExpired:     '⚠️ Session expired. Run /teambuilder again.',
    notYourBuilder:     '⚠️ This builder belongs to someone else.',
    pickAtLeastOne:     '⚠️ Select at least one build first.',

    // ── Save-as modal (single build) ─────────────────────────────────────────
    saveAsBtn:          '💾 Save as…',
    saveAsModalTitle:   'Save build',
    saveAsInputLabel:   'Save name',
    saveAsInputHint:    'e.g. My Warrior',

    // ── /list & load pickers ────────────────────────────────────────────────
    listTitle:          '📖 Saved builds in this server',
    listBuildsHeader:   'Builds',
    listTeamsHeader:    'Team builds',
    listEmpty:          'ℹ️ No builds saved yet. Use `/build` or `/teambuild` with the `name` option to save one.',
    listFooter:         '🔒 = your private save  ·  👥 = shared with the server',
    listPickBuild:      'Load a build…',
    listPickTeam:       'Load a team build…',
    listRefresh:        '🔄 Refresh',
    loadPickTitle:      '📂 Pick a build to load',
    loadTeamPickTitle:  '📂 Pick a team build to load',

    // ── /importbuilds ──────────────────────────────────────────────────────
    importTitle:        (fmt)        => `📁 Import preview (${fmt})`,
    importValidHeader:  (n)          => `✅ ${n} valid build(s) ready to save`,
    importInvalidHeader:(n)          => `⚠️ ${n} skipped (invalid template code)`,
    importFooter:       (scope)      => `Will be saved as ${scope}. Click Save All to confirm.`,
    importSaveBtn:      (n)          => `✅ Save ${n} build(s)`,
    importEmpty:        'ℹ️ No .txt files were found in your attachment.',
    importDone:         (saved, total) => `✅ Imported **${saved}** of **${total}** build(s).`,

    // ── Tolkano: name each build screen ──────────────────────────────────────
    tolkNameTitle:      (team)         => `🏷️ Name your imported builds — ${team}`,
    tolkNameHelp:       'Click **Rename N** to set the save name for each build. Default names are auto-generated. When you are happy, click **Save & Render**.',
    tolkSlotLine:       (i, ps, player, name) => `**${i + 1}.** \`${ps}\` · ${player} → **${name}**`,
    tolkRenameBtn:      (i)            => `✏️ #${i + 1}`,
    tolkRenameTeamBtn:  '✏️ Team name',
    tolkSaveRenderBtn:  '✅ Save & Render',
    tolkCancelBtn:      '✖ Cancel',
    tolkRenameModal:    (i)            => `Rename Build #${i + 1}`,
    tolkRenameTeamModal:'Rename Team',
    tolkSavedHeader:    (team)         => `✅ Imported **${team}**`,
    tolkCanceled:       '✖ Import canceled.',

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
    notFound:           (name)        => `❌ Aucun build trouvé avec le nom **${name}** sur ce serveur`,
    teamNotFound:       (name)        => `❌ Aucun build d'équipe trouvé avec le nom **${name}** sur ce serveur`,
    savedNameBtn:       (name)        => `💾 ${name}`,
    privateLabel:       '🔒 privé',
    sharedLabel:        '👥 partagé',
    privateOptionDesc:  'Si vrai, cette sauvegarde n\'est visible que par vous sur ce serveur',
    guildOnly:          '⚠️ Cette commande ne peut être utilisée que dans un serveur Discord.',
    sessionExpired:     '⚠️ Session expirée. Relancez /teambuilder.',
    notYourBuilder:     '⚠️ Ce builder appartient à quelqu\'un d\'autre.',
    pickAtLeastOne:     '⚠️ Sélectionnez au moins un build d\'abord.',

    saveAsBtn:          '💾 Sauvegarder sous…',
    saveAsModalTitle:   'Sauvegarder le build',
    saveAsInputLabel:   'Nom de sauvegarde',
    saveAsInputHint:    'ex. Mon Guerrier',

    listTitle:          '📖 Builds sauvegardés sur ce serveur',
    listBuildsHeader:   'Builds',
    listTeamsHeader:    'Builds d\'équipe',
    listEmpty:          'ℹ️ Aucun build sauvegardé. Utilisez `/build` ou `/teambuild` avec l\'option `name` pour en sauvegarder un.',
    listFooter:         '🔒 = sauvegarde privée  ·  👥 = partagé avec le serveur',
    listPickBuild:      'Charger un build…',
    listPickTeam:       'Charger un build d\'équipe…',
    listRefresh:        '🔄 Rafraîchir',
    loadPickTitle:      '📂 Choisissez un build à charger',
    loadTeamPickTitle:  '📂 Choisissez un build d\'équipe à charger',

    importTitle:        (fmt)        => `📁 Aperçu de l\'import (${fmt})`,
    importValidHeader:  (n)          => `✅ ${n} build(s) valide(s) prêt(s) à sauvegarder`,
    importInvalidHeader:(n)          => `⚠️ ${n} ignoré(s) (code de template invalide)`,
    importFooter:       (scope)      => `Sera sauvegardé en tant que ${scope}. Cliquez sur Tout sauvegarder pour confirmer.`,
    importSaveBtn:      (n)          => `✅ Sauvegarder ${n} build(s)`,
    importEmpty:        'ℹ️ Aucun fichier .txt trouvé dans votre pièce jointe.',
    importDone:         (saved, total) => `✅ ${saved} build(s) sur ${total} importé(s).`,

    tolkNameTitle:      (team)         => `🏷️ Nommez vos builds importés — ${team}`,
    tolkNameHelp:       'Cliquez sur **Renommer N** pour définir le nom de chaque build. Des noms par défaut sont générés. Quand vous êtes prêt, cliquez sur **Sauver & Afficher**.',
    tolkSlotLine:       (i, ps, player, name) => `**${i + 1}.** \`${ps}\` · ${player} → **${name}**`,
    tolkRenameBtn:      (i)            => `✏️ #${i + 1}`,
    tolkRenameTeamBtn:  '✏️ Nom d\'équipe',
    tolkSaveRenderBtn:  '✅ Sauver & Afficher',
    tolkCancelBtn:      '✖ Annuler',
    tolkRenameModal:    (i)            => `Renommer le build #${i + 1}`,
    tolkRenameTeamModal:'Renommer l\'équipe',
    tolkSavedHeader:    (team)         => `✅ **${team}** importée`,
    tolkCanceled:       '✖ Import annulé.',

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
