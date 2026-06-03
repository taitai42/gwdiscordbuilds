/**
 * GW Builds Discord Bot — entry point
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, Events, ChannelType, PermissionsBitField } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { handleInteraction } from './interactions/interactionHandler.js';
import { initSchema } from './lib/db.js';
import { buildHelpEmbed } from './lib/helpContent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Create client ────────────────────────────────────────────────────────────

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ── Load commands ────────────────────────────────────────────────────────────

client.commands = new Collection();
const commandsPath = join(__dirname, 'commands');

for (const file of readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const mod = await import(pathToFileURL(join(commandsPath, file)).href);
  if (mod.data && mod.execute) {
    client.commands.set(mod.data.name, mod);
    console.log(`[commands] Loaded /${mod.data.name}`);
  }
}

// ── Event: ready ─────────────────────────────────────────────────────────────

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

// ── Event: guildCreate (bot added to a server) ───────────────────────────────

client.on(Events.GuildCreate, async (guild) => {
  console.log(`[guildCreate] Added to "${guild.name}" (${guild.id})`);

  const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
  if (!me) return;

  const canSend = (ch) =>
    ch?.type === ChannelType.GuildText &&
    ch.permissionsFor(me)?.has(PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.SendMessages | PermissionsBitField.Flags.EmbedLinks);

  // Prefer the configured system channel, then the first text channel we can post in.
  const channel =
    (canSend(guild.systemChannel) && guild.systemChannel) ||
    guild.channels.cache.find(canSend) ||
    null;

  if (!channel) {
    console.log(`[guildCreate] No suitable channel in "${guild.name}" — skipping welcome message.`);
    return;
  }

  try {
    await channel.send({ embeds: [buildHelpEmbed(guild.preferredLocale, { welcome: true })] });
  } catch (err) {
    console.warn(`[guildCreate] Could not send welcome message in "${guild.name}":`, err.message);
  }
});

// ── Event: interaction ────────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async (interaction) => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[${interaction.commandName}] Error:`, err);
      const reply = { content: `❌ An error occurred: ${err.message}`, ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply(reply);
      }
    }
    return;
  }

  // Buttons, select menus, modals
  await handleInteraction(interaction);
});

// ── Login ─────────────────────────────────────────────────────────────────────

await initSchema();
client.login(process.env.DISCORD_TOKEN);
