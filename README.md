# GW Discord Builds

A Discord bot that renders **Guild Wars 1** build template codes as visual skill-bar images — similar to how builds appear on PvXwiki — with interactive skill-info lookups and team build management.

---

## Features

| Feature | Description |
|---|---|
| `/build <code>` | Decode a GW1 template code and render an 8-skill bar image with named attributes |
| Skill info select | Pick any skill slot to see its name, type, energy/cast/recharge, description |
| 📋 Copy Template button | Instantly get the raw template code as an ephemeral reply |
| `/teambuild <build1…8>` | Render up to 8 builds stacked as a team build image |
| 🔄 Replace #N button | Click to swap any build in a team build via a modal |

---

## Quick Start

### 1. Prerequisites

- Node.js ≥ 18
- A Discord application with a bot user ([discord.com/developers](https://discord.com/developers))

### 2. Install

```bash
npm install
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env and fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID
```

### 4. Register slash commands

```bash
npm run deploy
```

### 5. Run

```bash
npm start
# or for auto-restart during development:
npm run dev
```

---

## Running with Docker

```bash
# Copy and fill in your credentials
cp .env.example .env

# Build & start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The skill cache (`cache/`) is stored in a named Docker volume (`gwbot_cache`) so icons and skill JSON persist across container restarts.

---

## Build Template Codes

GW1 template codes look like: `OwUTMoqhWxrDWYDgUgsYA`

You can copy them from:
- In-game → Save Template → copy the code
- PvXwiki build pages
- Any GW fan site that lists template codes

The bot decodes the **[GW template format](https://wiki.guildwars.com/wiki/Template_format)**:
extracts primary/secondary profession, attribute allocations, and 8 skill IDs.
Skill data (description, energy, cast, recharge, icon) is fetched live from the
**[Guild Wars Wiki](https://wiki.guildwars.com)** and cached locally in `cache/`.

---

## Project Structure

```
src/
  index.js                    Bot entry point
  deploy-commands.js          Register slash commands
  commands/
    build.js                  /build command
    teambuild.js              /teambuild command
  lib/
    templateDecoder.js        Decode GW1 .txt template codes → professions / skills
    skillData.js              Fetch & cache skill data + icons from the wiki
    skillRenderer.js          Render skill bars with @napi-rs/canvas
    uiHelpers.js              Discord embed / component builders
  interactions/
    interactionHandler.js     Route buttons, select menus, modals
cache/                        Auto-created; stores skills.json + icon images
```

---

## Extending the Skill Map

`src/lib/skillData.js` contains a `SKILL_TEMPLATE_MAP` object mapping template IDs
to skill names.  A partial set is bundled for bootstrapping.  To get full coverage:

1. Download a complete skill ID dump from the wiki or from a GW data-mining project.
2. Replace / merge the map object in `skillData.js`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from the Developer Portal |
| `DISCORD_CLIENT_ID` | ✅ | Application (client) ID |
| `DISCORD_GUILD_ID` | optional | Pre-deploy commands to this guild instantly |

---

## License

MIT
