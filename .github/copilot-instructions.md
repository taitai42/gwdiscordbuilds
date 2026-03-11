# GitHub Copilot Instructions

## Project Overview
Discord bot (`discord.js` v14, Node.js ESM) that renders **Guild Wars 1** build template codes as skill-bar images using `@napi-rs/canvas`.

## Key Files
| File | Purpose |
|---|---|
| `src/lib/templateDecoder.js` | Bit-level decoder for GW1 template format (type 14) |
| `src/lib/skillData.js` | Fetch + cache skill data/icons from the GW wiki API |
| `src/lib/skillRenderer.js` | Canvas renderer for skill bars and team-build stacks |
| `src/lib/uiHelpers.js` | Discord embed + component builders |
| `src/interactions/interactionHandler.js` | Route buttons, select menus, modals |
| `src/commands/build.js` | `/build` slash command |
| `src/commands/teambuild.js` | `/teambuild` slash command |

## Conventions
- **ESM modules** — use `import`/`export`, no `require()`
- **Async/await** throughout — no callbacks
- **Error handling** — commands `deferReply` then `editReply` on error
- **Ephemeral** — skill info responses are always ephemeral
- **Cache** — skill JSON at `cache/skills.json`, icons at `cache/icons/`
- Skill template IDs are **11-bit** values; 0 = empty slot
- The GW custom base64 alphabet: `AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789+/`

## GW1 Template Format Reference
https://wiki.guildwars.com/wiki/Template_format

## Adding More Commands
1. Create `src/commands/<name>.js` exporting `data` (SlashCommandBuilder) and `execute(interaction)`
2. Run `npm run deploy` to register changes with Discord
