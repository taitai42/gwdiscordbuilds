/**
 * Tolkano.com match importer.
 *
 * Tolkano is a third-party Guild Wars 1 match-replay site whose match pages
 * (https://tolkano.com/match/<id>) list the two teams that played, with each
 * player's primary / secondary professions and 8 skills.
 *
 * Attribute allocations are **not** exposed on the page, so the codes we
 * synthesize have empty attribute lists. Imported builds will render with
 * "No attributes set" — that's expected.
 */

const USER_AGENT = 'gwdiscordbuilds (+https://github.com/taitai42/gwdiscordbuilds)';
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Fetch and parse a tolkano.com match page.
 * @param {string} matchId  Numeric match ID (digits only)
 * @returns {Promise<Array<{guildId:string, name:string, players:Array<{name:string, characterId:string, primaryIdx:number, secondaryIdx:number, skills:number[]}>}>>}
 */
export async function fetchTolkanoMatch(matchId) {
  if (!/^\d{6,32}$/.test(matchId)) {
    throw new Error('Invalid match id (expected digits only).');
  }
  const url = `https://tolkano.com/match/${matchId}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let html;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
      signal:  ctrl.signal,
    });
    if (!res.ok) throw new Error(`tolkano.com returned HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('tolkano.com request timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
  return parseMatchHtml(html);
}

/**
 * Parse a tolkano match page HTML payload into two teams of players.
 * Exported separately so it can be unit-tested without network I/O.
 * @param {string} html
 */
export function parseMatchHtml(html) {
  // The page contains 4 guild anchors: the first two appear in the page header,
  // the next two introduce the team sections. We use the latter as section
  // boundaries.
  const guildRx = /<a[^>]*href="\/guild\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
  const allGuilds = [...html.matchAll(guildRx)];
  if (allGuilds.length < 4) {
    throw new Error('Could not locate the two team sections on the match page.');
  }

  const sections = [
    { guildId: allGuilds[2][1], name: cleanGuildName(allGuilds[2][2]), start: allGuilds[2].index, end: allGuilds[3].index },
    { guildId: allGuilds[3][1], name: cleanGuildName(allGuilds[3][2]), start: allGuilds[3].index, end: html.length },
  ];

  return sections.map(sec => ({
    guildId: sec.guildId,
    name:    sec.name,
    players: parsePlayersInSection(html.slice(sec.start, sec.end)),
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanGuildName(rawAnchorBody) {
  // Strip HTML tags and squash whitespace; cap length for safe embedding.
  const txt = rawAnchorBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  // The anchor body includes "Guild Name [TAG] Rank : N Rating : M" — keep the
  // human bit up to "Rank :" (which the header anchors include but the section
  // anchors don't).
  const cut = txt.split(/\s+Rank\s*:/i)[0];
  return cut.slice(0, 80);
}

function parsePlayersInSection(html) {
  // Character anchors look like:
  //   title="Player Name" href="/character/123"
  const charRx = /title="([^"]+)"\s+href="\/character\/(\d+)"/g;
  const chars = [...html.matchAll(charRx)];

  // Each player's 8 skill icons live inside a single skill-grid div:
  //   <div style="display:flex;gap:1px;height:36px">…<img src="/skills/N.webp"/>…</div>
  const skillGridOpen = '<div style="display:flex;gap:1px;height:36px">';

  const players = [];
  for (let i = 0; i < chars.length; i++) {
    const start = chars[i].index;
    const end   = (i + 1 < chars.length) ? chars[i + 1].index : html.length;
    const block = html.slice(start, end);

    // The 2 profession refs immediately preceding this character anchor.
    const before = html.slice(0, start);
    const profMatches = [...before.matchAll(/\/professions\/(\d+)\.webp/g)];
    const [primaryIdx = 0, secondaryIdx = 0] = profMatches.slice(-2).map(m => Number(m[1]));

    // Extract skills strictly from inside this player's skill grid (if present).
    let skills = [];
    const gridStart = block.indexOf(skillGridOpen);
    if (gridStart >= 0) {
      const gridContentStart = gridStart + skillGridOpen.length;
      const gridContentEnd   = block.indexOf('</div>', gridContentStart);
      const grid = block.slice(gridContentStart, gridContentEnd >= 0 ? gridContentEnd : undefined);
      skills = [...grid.matchAll(/\/skills\/(\d+)\.webp/g)].map(m => Number(m[1]));
    }
    skills = skills.slice(0, 8);
    while (skills.length < 8) skills.push(0); // pad empty slots

    players.push({
      name:          decodeHtmlEntities(chars[i][1]).slice(0, 80),
      characterId:   chars[i][2],
      primaryIdx,
      secondaryIdx,
      skills,
    });
  }
  return players;
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'");
}
