/**
 * Shared help / welcome embed content.
 *
 * Used by:
 *   • /help                       — on-demand reference
 *   • guildCreate welcome message — sent once when the bot joins a server
 */

import { EmbedBuilder } from 'discord.js';

const CONTENT = {
  en: {
    title:       '📖 GW Discord Builds — Help',
    welcomeTitle:'👋 Thanks for adding GW Discord Builds!',
    intro:
      'This bot decodes **Guild Wars 1** template codes and renders them as ' +
      'skill-bar images. Builds are saved **per server**, so each Discord ' +
      'community has its own library.',
    quickStart:  '🚀 Quick start',
    quickStartBody:
      '1. Copy a build template code from in-game (Save Template) or PvXwiki — ' +
      'they look like `OwUTMoqhWxrDWYDgUgsYA`.\n' +
      '2. Run `/build code:<code>` to render it.\n' +
      '3. Add `name:<something>` to save it for later. Add `private:true` to ' +
      'keep that save visible only to you.\n' +
      '4. Reload anytime with `/load name:<something>`.',
    commands:    '🛠️ Commands',
    cmdBuild:
      '`/build code:<code> [name] [private]` — render a single build and ' +
      'optionally save it under a name.',
    cmdLoad:
      '`/load name:<name>` — re-render a saved build. Your own private build ' +
      'wins over a shared one with the same name.',
    cmdTeam:
      '`/teambuild build1:<code> … build8:<code> [name] [private]` — stack up ' +
      'to 8 builds as a single team-build image.',
    cmdLoadTeam:
      '`/loadteam name:<name>` — re-render a saved team build.',
    cmdBuilder:
      '`/teambuilder` — interactive builder: pick saved builds from dropdowns ' +
      'or paste new ones, name the team, render it.',
    cmdTolkano:
      '`/tolkanoimport match_id:<id> name:<name> [private]` — import a team ' +
      'build from a [tolkano.com](https://tolkano.com) match page. You\'ll pick ' +
      'which of the two teams to save. Note: tolkano doesn\'t expose attribute ' +
      'allocations, so imported builds render with no attributes set.',
    cmdList:
      '`/list [mine_only]` — list every saved build & team build in this server ' +
      'with dropdowns to load any of them.',
    cmdImport:
      '`/importbuilds file:<.txt|.zip> [private]` — bulk-import your in-game ' +
      'templates. Attach a single `.txt` or a `.zip` of your ' +
      '`Guild Wars/Templates/` folder; the filename becomes the save name.',
    cmdHelp:
      '`/help` — show this message.',
    scopes:      '🔒 Sharing & privacy',
    scopesBody:
      '• 👥 **Shared** (default): everyone in this server can `/load` the build.\n' +
      '• 🔒 **Private** (`private:true`): only you can `/load` it inside this server.\n' +
      'Saves are isolated per Discord server — nothing leaks to other servers.',
    tipsTitle:   '💡 Tips',
    tipsBody:
      '• Click 📋 **Copy Template** under any rendered build to get the raw code as an ephemeral reply.\n' +
      '• In `/teambuild`, click 🔄 **Replace #N** to swap one slot via a modal.\n' +
      '• In the rendered build, use the dropdown to inspect any skill (cost, cast, recharge, description, wiki link).',
    links:       '🔗 Links',
    linksBody: (privacy, terms, repo) =>
      `[Privacy](${privacy}) · [Terms](${terms}) · [Source](${repo})`,
  },
  fr: {
    title:       '📖 GW Discord Builds — Aide',
    welcomeTitle:'👋 Merci d\'avoir ajouté GW Discord Builds !',
    intro:
      'Ce bot décode les codes de template **Guild Wars 1** et les affiche en ' +
      'images de barre de skills. Les builds sont sauvegardés **par serveur**, ' +
      'donc chaque communauté Discord a sa propre bibliothèque.',
    quickStart:  '🚀 Démarrage rapide',
    quickStartBody:
      '1. Copiez un code de template depuis le jeu (Sauvegarder le modèle) ou ' +
      'PvXwiki — par exemple `OwUTMoqhWxrDWYDgUgsYA`.\n' +
      '2. Lancez `/build code:<code>` pour l\'afficher.\n' +
      '3. Ajoutez `name:<nom>` pour le sauvegarder. Ajoutez `private:true` pour ' +
      'que la sauvegarde ne soit visible que par vous.\n' +
      '4. Rechargez-le quand vous voulez avec `/load name:<nom>`.',
    commands:    '🛠️ Commandes',
    cmdBuild:
      '`/build code:<code> [name] [private]` — affiche un build et le ' +
      'sauvegarde éventuellement sous un nom.',
    cmdLoad:
      '`/load name:<nom>` — recharge un build sauvegardé. Votre build privé ' +
      'prime sur un build partagé du même nom.',
    cmdTeam:
      '`/teambuild build1:<code> … build8:<code> [name] [private]` — affiche ' +
      'jusqu\'à 8 builds en une seule image d\'équipe.',
    cmdLoadTeam:
      '`/loadteam name:<nom>` — recharge un build d\'équipe sauvegardé.',
    cmdBuilder:
      '`/teambuilder` — builder interactif : choisissez des builds dans des ' +
      'menus déroulants ou collez-en de nouveaux, nommez l\'équipe, affichez-la.',
    cmdTolkano:
      '`/tolkanoimport match_id:<id> name:<nom> [private]` — importe un build ' +
      'd\'équipe depuis une page de match [tolkano.com](https://tolkano.com). ' +
      'Vous choisirez laquelle des deux équipes sauvegarder. Note : tolkano ne ' +
      'fournit pas les attributs, donc les builds importés s\'affichent sans attributs.',
    cmdList:
      '`/list [mine_only]` — liste tous les builds & builds d\'équipe sauvegardés ' +
      'sur ce serveur, avec des menus déroulants pour les charger.',
    cmdImport:
      '`/importbuilds file:<.txt|.zip> [private]` — importe en masse vos templates ' +
      'du jeu. Attachez un seul `.txt` ou un `.zip` de votre dossier ' +
      '`Guild Wars/Templates/` ; le nom du fichier devient le nom de sauvegarde.',
    cmdHelp:
      '`/help` — affiche ce message.',
    scopes:      '🔒 Partage & confidentialité',
    scopesBody:
      '• 👥 **Partagé** (par défaut) : tout le monde sur ce serveur peut faire `/load`.\n' +
      '• 🔒 **Privé** (`private:true`) : vous seul pouvez le `/load` sur ce serveur.\n' +
      'Les sauvegardes sont isolées par serveur Discord — rien ne fuite ailleurs.',
    tipsTitle:   '💡 Astuces',
    tipsBody:
      '• Cliquez 📋 **Copier le template** sous un build pour récupérer le code brut (réponse éphémère).\n' +
      '• Dans `/teambuild`, cliquez 🔄 **Remplacer #N** pour changer un slot via un modal.\n' +
      '• Dans un build affiché, utilisez le menu déroulant pour inspecter un skill (coût, cast, recharge, description, lien wiki).',
    links:       '🔗 Liens',
    linksBody: (privacy, terms, repo) =>
      `[Confidentialité](${privacy}) · [Conditions](${terms}) · [Code source](${repo})`,
  },
};

const REPO_URL    = 'https://github.com/taitai42/gwdiscordbuilds';
const PRIVACY_URL = `${REPO_URL}/blob/main/PRIVACY.md`;
const TERMS_URL   = `${REPO_URL}/blob/main/TERMS.md`;

/**
 * Build the help embed (also used as the install welcome message).
 * @param {string}  [locale]
 * @param {object}  [opts]
 * @param {boolean} [opts.welcome] If true, use the welcome title and add a "what now?" line.
 */
export function buildHelpEmbed(locale, { welcome = false } = {}) {
  const lang = locale?.startsWith('fr') ? 'fr' : 'en';
  const c    = CONTENT[lang];

  return new EmbedBuilder()
    .setTitle(welcome ? c.welcomeTitle : c.title)
    .setColor(0x1a1a2e)
    .setDescription(c.intro)
    .addFields(
      { name: c.quickStart,    value: c.quickStartBody },
      { name: c.commands,      value: [c.cmdBuild, c.cmdLoad, c.cmdTeam, c.cmdLoadTeam, c.cmdBuilder].join('\n') },
      { name: '\u200b',         value: [c.cmdTolkano, c.cmdList, c.cmdImport, c.cmdHelp].join('\n') },
      { name: c.scopes,        value: c.scopesBody },
      { name: c.tipsTitle,     value: c.tipsBody },
      { name: c.links,         value: c.linksBody(PRIVACY_URL, TERMS_URL, REPO_URL) },
    );
}
