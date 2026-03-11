/**
 * Register slash commands with Discord.
 * Run once (or whenever commands change):  node src/deploy-commands.js
 *
 * To register guild-scoped (instant, dev):  set DISCORD_GUILD_ID in .env
 * To register globally (up to 1 h delay):   remove / leave DISCORD_GUILD_ID empty
 */

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsPath = join(__dirname, 'commands');

const commands = [];
for (const file of readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const mod = await import(pathToFileURL(join(commandsPath, file)).href);
  if (mod.data) commands.push(mod.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

const route = process.env.DISCORD_GUILD_ID
  ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID)
  : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

console.log(`Registering ${commands.length} command(s) to ${process.env.DISCORD_GUILD_ID ? 'guild' : 'global'}…`);
const data = await rest.put(route, { body: commands });
console.log(`✅ Registered ${data.length} command(s).`);
