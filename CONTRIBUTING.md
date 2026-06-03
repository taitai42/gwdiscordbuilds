# Contributing to GW Discord Builds

Thanks for your interest! This project is small and pull requests are
welcome. The bot is written in modern JavaScript (ESM, Node.js ≥ 18) on
top of discord.js v14 and `@napi-rs/canvas`.

## Development setup

1. Fork and clone the repo.
2. Copy the env template and fill in your own bot credentials:
   ```bash
   cp .env.example .env
   ```
   Create a Discord application + bot at
   <https://discord.com/developers/applications> for testing. Add the bot
   to a private guild and put that guild's ID in `DISCORD_GUILD_ID` so
   slash commands register instantly.
3. Bring up the stack (MySQL + bot):
   ```bash
   docker compose up --build
   ```
   Or run locally against a MySQL you already have:
   ```bash
   npm install
   npm run deploy   # register slash commands
   npm start
   ```

## Coding conventions

* ESM only (`import` / `export`, never `require`).
* Async/await everywhere — no callbacks.
* Keep functions small; favor descriptive names over comments.
* User-facing strings go through [`src/data/i18n.js`](src/data/i18n.js)
  with both English and French variants.
* Persistent state goes through [`src/lib/buildStore.js`](src/lib/buildStore.js).
  Never bypass it to write to MySQL directly from a command.
* Don't break the guild-isolation contract: every save / load path must
  include `guildId` and `userId`.

## Pull requests

* One logical change per PR.
* Describe the user-visible effect, not just the code change.
* If you touched a slash command's signature, mention that operators will
  need to re-run `npm run deploy`.
* If you added a new command or interaction, add it to the table in the
  README.

## Reporting bugs

Open an issue with:

* What you ran (the template code or command).
* What you expected.
* What happened (paste any error from the bot's log if you self-host).

## Security issues

Please follow [SECURITY.md](./SECURITY.md) instead of opening a public
issue.
