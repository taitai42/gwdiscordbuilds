# GW Discord Builds

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)

A Discord bot that renders **Guild Wars 1** build template codes as visual
skill-bar images, with interactive skill lookups and per-server build
libraries.

> ⚠️ Unofficial fan project. Not affiliated with NCsoft or ArenaNet.
> "Guild Wars" and related marks are trademarks of their respective owners.

---

## Features

| Command | What it does |
|---|---|
| `/build code:<…> [name:<…>] [private:<bool>]` | Render an 8-skill bar from a template code. Optionally save under a name (shared in the server, or private to you). |
| `/load name:<…>` | Re-render a previously saved build (your private build wins over a shared one with the same name). |
| `/teambuild build1:<…> … build8:<…> [name:<…>] [private:<bool>]` | Stack up to 8 builds as a team build image. |
| `/loadteam name:<…>` | Re-render a saved team build. |
| `/teambuilder` | Interactive builder: pick saved builds from dropdowns, name the team, render it. |
| `/tolkanoimport match_id:<id> name:<…> [private:<bool>]` | Import a team build from a [tolkano.com](https://tolkano.com) match page (you pick which of the two teams to save). |
| `/help` | Show the full command reference + quick-start. |
| Skill info select | Inspect any slot for energy, cast, recharge, description, wiki link. |
| 📋 Copy Template | Ephemeral reply with the raw template code. |
| 🔄 Replace #N | Swap any build in a team via modal. |

Saves are **scoped per Discord server**. Every guild has its own library —
nothing leaks between servers. Users can optionally save builds as
private; private saves are visible only to the saver inside that guild.

When the bot joins a server, it posts a welcome message in the system
channel (or the first channel it can post in) with the same content as
`/help`.

---

## Add the bot

A public hosted instance will be linked here once Discord verification
completes. In the meantime you can self-host (see below).

---

## Self-hosting (Docker, recommended)

The default setup runs the bot and a MySQL 8.4 database side by side.

```bash
# 1. Clone
git clone https://github.com/taitai42/gwdiscordbuilds
cd gwdiscordbuilds

# 2. Configure
cp .env.example .env
# Edit .env — fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, and choose
# strong MYSQL_PASSWORD / MYSQL_ROOT_PASSWORD values.

# 3. Bring up the stack
docker compose up -d --build

# 4. Register slash commands (once, and again whenever they change)
docker compose exec gwbot npm run deploy

# 5. Tail logs
docker compose logs -f gwbot
```

Saved builds live in the named `db-data` Docker volume. Skill icons and
wiki cache live in the bind-mounted `./cache` folder.

## Self-hosting (without Docker)

Requires Node.js ≥ 18 and a reachable MySQL ≥ 8.0.

```bash
npm install
cp .env.example .env   # set DISCORD_* and MYSQL_* — MYSQL_HOST=localhost
npm run deploy         # register slash commands
npm start
```

The schema is applied automatically at startup
([`schema.sql`](./schema.sql)).

---

## Configuration

| Variable | Required | Notes |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from the Developer Portal |
| `DISCORD_CLIENT_ID` | ✅ | Application (client) ID |
| `DISCORD_GUILD_ID` | optional | Pre-register commands to one guild for instant updates during dev |
| `MYSQL_HOST` | ✅ | `db` under docker-compose; `localhost` otherwise |
| `MYSQL_PORT` | optional | Defaults to `3306` |
| `MYSQL_DATABASE` | ✅ | Database name (`gwbot` by default) |
| `MYSQL_USER` / `MYSQL_PASSWORD` | ✅ | Credentials for the bot user |
| `MYSQL_ROOT_PASSWORD` | docker only | Used to initialize the MySQL container |

> ⚠️ If a bot token of yours ever ended up in a commit or a shared
> screenshot: **rotate it immediately** in the Developer Portal → Bot →
> Reset Token. The old token is permanently invalidated.

---

## Build template codes

A GW1 template code looks like: `OwUTMoqhWxrDWYDgUgsYA`. The bot decodes
the [official template format](https://wiki.guildwars.com/wiki/Template_format)
— primary/secondary profession, attribute allocation, and 8 skill IDs.
Skill metadata and icons are fetched lazily from the
[Guild Wars Wiki](https://wiki.guildwars.com) and cached on disk.

---

## Project structure

```
schema.sql                  MySQL DDL applied at startup
src/
  index.js                  Bot entry point
  deploy-commands.js        Register slash commands with Discord
  commands/
    build.js                /build
    load.js                 /load
    teambuild.js            /teambuild
    loadteam.js             /loadteam
    teambuilder.js          /teambuilder (interactive)
    tolkanoimport.js        /tolkanoimport
    help.js                 /help
  interactions/
    interactionHandler.js   Buttons, selects, modals router
  lib/
    db.js                   MySQL connection pool + schema bootstrap
    buildStore.js           Per-guild build / team-build storage
    sessionStore.js         TTL-backed in-memory session store
    helpContent.js          Shared embed for /help + welcome message
    tolkanoImporter.js      Fetcher + parser for tolkano.com match pages
    templateDecoder.js      GW1 template bit-level decoder
    skillData.js            Wiki fetch + cache for skill metadata + icons
    skillRenderer.js        Canvas renderer (@napi-rs/canvas)
    uiHelpers.js            Embed / select-menu builders
  data/
    attributeMap.js         GW1 attribute ID → name
    skillMap.js             GW1 skill template ID → wiki name
    i18n.js                 EN / FR strings
scripts/
  downloadIcons.js          Pre-populate cache/icons
  downloadSkillData.js      Pre-populate cache/skillData.json
cache/                      Runtime cache (icons + skill JSON)
```

---

## Documentation

* [Privacy Policy](./PRIVACY.md)
* [Terms of Service](./TERMS.md)
* [Security Policy](./SECURITY.md)
* [Contributing](./CONTRIBUTING.md)
* [License (MIT)](./LICENSE)

---

## Acknowledgements

* The [Guild Wars Wiki](https://wiki.guildwars.com) community for the
  template format documentation and the public skill API.
* [discord.js](https://discord.js.org/) and
  [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas).
