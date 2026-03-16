/**
 * Server-side GEM scraper — ports the browser extension's DOM parsing to Node.js
 * using cheerio. Handles login, pagination, and HTML parsing of gem.fabtcg.com.
 */
import * as cheerio from "cheerio";

const GEM_BASE = "https://gem.fabtcg.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ── Types ────────────────────────────────────────────────────────

export interface GemScrapedMatch {
  round: number;
  roundLabel: string;
  opponent: string;
  opponentGemId: string;
  result: "win" | "loss" | "draw" | "bye";
}

export interface GemScrapedEvent {
  gemEventId: string;
  name: string;
  date: string;
  venue: string;
  eventType: string;
  eventTier: string;
  format: string;
  rated: boolean;
  xpModifier: number;
  hero: string;
  matches: GemScrapedMatch[];
}

export interface GemScrapeOptions {
  maxPages?: number;
  sinceDate?: string; // YYYY-MM-DD — stop when all events on a page are older
}

export class GemLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GemLoginError";
  }
}

// ── Known Data ───────────────────────────────────────────────────

const KNOWN_HEROES = new Set([
  "Arakni","Arakni, Huntsman","Arakni, Marionette","Arakni, Solitary Confinement","Arakni, Web of Deceit",
  "Aurora","Aurora, Shooting Star","Azalea","Azalea, Ace in the Hole",
  "Benji, the Piercing Wind","Betsy","Betsy, Skin in the Game","Blaze, Firemind",
  "Boltyn","Bravo","Bravo, Showstopper","Bravo, Star of the Show",
  "Brevant, Civic Protector","Briar","Briar, Warden of Thorns",
  "Chane","Chane, Bound by Shadow","Cindra","Cindra, Dracai of Retribution",
  "Dash","Dash I/O","Dash, Database","Dash, Inventor Extraordinaire","Data Doll MKII",
  "Dorinthea","Dorinthea Ironsong","Dorinthea, Quicksilver Prodigy",
  "Dromai","Dromai, Ash Artist","Emperor, Dracai of Aesir",
  "Enigma","Enigma, Ledger of Ancestry","Enigma, New Moon",
  "Fai","Fai, Rising Rebellion","Fang","Fang, Dracai of Blades",
  "Florian","Florian, Rotwood Harbinger",
  "Ira, Crimson Haze","Ira, Scarlet Revenger",
  "Iyslander","Iyslander, Stormbind",
  "Kano","Kano, Dracai of Aether",
  "Kassai","Kassai of the Golden Sand","Kassai, Cintari Sellsword",
  "Katsu","Katsu, the Wanderer",
  "Kayo","Kayo, Armed and Dangerous","Kayo, Berserker Runt","Kayo, Strong-arm",
  "Levia","Levia, Shadowborn Abomination","Lexi","Lexi, Livewire",
  "Maxx","Maxx, the Hype","Melody","Melody, Sing-along",
  "Nuu","Nuu, Alluring Desire",
  "Oldhim","Oldhim, Grandfather of Eternity",
  "Olympia","Olympia, Prized Fighter",
  "Oscilio","Oscilio, Constella Intelligence",
  "Pheano, High Philosopher",
  "Prism","Prism, Advent of Thrones","Prism, Sculptor of Arc Light",
  "Rhinar","Rhinar, Reckless Rampage",
  "Riptide","Riptide, Lurker of the Deep",
  "Runeblood",
  "Shiyana","Shiyana, Diamond Gemini",
  "Squizzy, Sporespreader",
  "Teklovossen","Teklovossen, Esteemed Magnate",
  "Terra","Terra, Steward of the Wild",
  "Uzuri","Uzuri, Switchblade",
  "Viserai","Viserai, Rune Blood",
  "Vynnset","Vynnset, Iron Maiden",
  "Zen","Zen, Tamer of Purpose",
]);

const KNOWN_FORMATS = [
  "Classic Constructed", "Silver Age", "Blitz", "Draft",
  "Sealed", "Clash", "Ultimate Pit Fight", "Living Legend",
];

const FORMAT_ALIASES: Record<string, string> = {
  "booster draft": "Draft",
  "sealed deck": "Sealed",
  "living legend": "Living Legend",
};

// ── Cookie Helpers ───────────────────────────────────────────────

function extractCookies(headers: Headers): string {
  const cookies: string[] = [];
  // Headers.getSetCookie() returns all Set-Cookie values
  const setCookies = headers.getSetCookie?.() ?? [];
  for (const sc of setCookies) {
    const nameValue = sc.split(";")[0];
    if (nameValue) cookies.push(nameValue);
  }
  return cookies.join("; ");
}

function mergeCookies(existing: string, newCookies: string): string {
  const map = new Map<string, string>();
  for (const c of existing.split("; ").filter(Boolean)) {
    const [k, ...v] = c.split("=");
    map.set(k, v.join("="));
  }
  for (const c of newCookies.split("; ").filter(Boolean)) {
    const [k, ...v] = c.split("=");
    map.set(k, v.join("="));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

// ── GEM Login ────────────────────────────────────────────────────

/**
 * Authenticate with GEM and return session cookies.
 * GEM uses Django with CSRF protection.
 */
export async function gemLogin(username: string, password: string): Promise<string> {
  // Step 1: GET the GEM homepage which contains the login form
  const loginPageRes = await fetch(`${GEM_BASE}/`, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
  });

  const loginHtml = await loginPageRes.text();
  const initialCookies = extractCookies(loginPageRes.headers);

  // Extract CSRF token from the login form
  const $ = cheerio.load(loginHtml);
  const csrfToken =
    $('input[name="csrfmiddlewaretoken"]').val() as string ||
    "";

  if (!csrfToken) {
    throw new GemLoginError("Could not find CSRF token on GEM login page");
  }

  // Step 2: POST login credentials (form submits to homepage)
  const formBody = new URLSearchParams({
    csrfmiddlewaretoken: csrfToken,
    username: username,
    password: password,
  });

  const loginRes = await fetch(`${GEM_BASE}/`, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: initialCookies,
      Referer: `${GEM_BASE}/`,
    },
    body: formBody.toString(),
    redirect: "manual",
  });

  const responseCookies = extractCookies(loginRes.headers);
  const allCookies = mergeCookies(initialCookies, responseCookies);

  // Successful login redirects (302) to profile page
  const status = loginRes.status;
  if (status >= 300 && status < 400) {
    const location = loginRes.headers.get("location") || "";
    // If redirected to profile or dashboard, login succeeded
    if (location.includes("/profile") || location.includes("/dashboard")) {
      return allCookies;
    }
    // Redirected somewhere else — could still be valid
    // Check if we got a sessionid cookie (indicates successful auth)
    if (allCookies.includes("sessionid=")) {
      return allCookies;
    }
    throw new GemLoginError("Invalid credentials");
  }

  // If we got a 200, the login form was re-rendered (credentials were wrong)
  if (status === 200) {
    throw new GemLoginError("Invalid username or password");
  }

  throw new GemLoginError(`Unexpected login response: HTTP ${status}`);
}

// ── Page Fetching ────────────────────────────────────────────────

export async function fetchGemPage(url: string, cookies: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: cookies,
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`GEM HTTP ${res.status} for ${url}`);
  return res.text();
}

// ── Date Parsing ─────────────────────────────────────────────────

function parseDate(text: string): string {
  if (!text) return "";
  const cleaned = text.replace(/,?\s*\d{1,2}:\d{2}\s*(AM|PM)?\s*$/i, "").trim();
  const normalized = cleaned.replace(/(\w{3})\.\s/, "$1 ");
  const d = new Date(normalized);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return "";
}

// ── Event Type / Format Classification ───────────────────────────

function guessEventType(text: string): string {
  const lower = text.toLowerCase();
  if (/armory/i.test(lower)) return "Armory";
  if (/pre.?release/i.test(lower)) return "Pre-Release";
  if (/on demand/i.test(lower)) return "On Demand";
  if (/skirmish/i.test(lower)) return "Skirmish";
  if (/road to nationals?|\brtn\b/i.test(lower)) return "Road to Nationals";
  if (/pro\s*quest|\bpq\b/i.test(lower)) return "ProQuest";
  if (/battle hardened|\bbh\b/i.test(lower)) return "Battle Hardened";
  if (/\bcalling\b/i.test(lower)) return "The Calling";
  if (/\bnationals?\b/i.test(lower)) return "Nationals";
  if (/pro tour/i.test(lower)) return "Pro Tour";
  if (/\bpti\b|professional tournament invit/i.test(lower)) return "PTI";
  if (/worlds|world championship/i.test(lower)) return "Worlds";
  return "";
}

function getEventTier(eventType: string): string {
  switch (eventType) {
    case "Armory":
    case "On Demand":
    case "Pre-Release":
      return "casual";
    case "Skirmish":
    case "Road to Nationals":
    case "ProQuest":
    case "PTI":
      return "competitive";
    case "Battle Hardened":
    case "The Calling":
    case "Nationals":
    case "Pro Tour":
    case "Worlds":
      return "professional";
    default:
      return "";
  }
}

interface EventMeta {
  date: string;
  venue: string;
  eventType: string;
  format: string;
  rated: boolean;
  xpModifier: number;
}

function classifyMetaItems(items: string[], fallbackDate: string): EventMeta {
  const meta: EventMeta = {
    date: "",
    venue: "",
    eventType: "",
    format: "",
    rated: false,
    xpModifier: 0,
  };

  const dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i;
  const shortDateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i;
  const unmatched: string[] = [];

  for (const text of items) {
    if (dateRegex.test(text) || shortDateRegex.test(text)) {
      if (!meta.date) meta.date = parseDate(text);
      continue;
    }

    const trimmed = text.trim();
    const trimmedLower = trimmed.toLowerCase();
    const matchedFormat = KNOWN_FORMATS.find((f) => f.toLowerCase() === trimmedLower);
    if (matchedFormat) {
      meta.format = matchedFormat;
      continue;
    }
    if (FORMAT_ALIASES[trimmedLower]) {
      meta.format = FORMAT_ALIASES[trimmedLower];
      continue;
    }

    if (/^\s*Rated\s*$/i.test(text)) { meta.rated = true; continue; }
    if (/^\s*Not Rated\s*$/i.test(text) || /^\s*Unrated\s*$/i.test(text)) { meta.rated = false; continue; }

    const xpMatch = text.match(/XP Modifier:\s*(\d+)/i);
    if (xpMatch) { meta.xpModifier = parseInt(xpMatch[1]); continue; }

    const eventType = guessEventType(text);
    if (eventType) {
      meta.eventType = eventType;
      continue;
    }

    unmatched.push(text);
  }

  for (const text of unmatched) {
    const t = text.trim();
    if (t.length >= 2 && t.length < 150 && !/^\d+$/.test(t)) {
      meta.venue = t;
      break;
    }
  }

  if (!meta.date && fallbackDate) {
    meta.date = parseDate(fallbackDate);
  }

  return meta;
}

// ── Playoff Round Classification ─────────────────────────────────

function classifyPlayoffRound(roundText: string): string {
  const lower = roundText.toLowerCase();
  if (/final/i.test(lower) && !/semi|quarter/i.test(lower)) return "Finals";
  if (/semi/i.test(lower)) return "Top 4";
  if (/quarter/i.test(lower)) return "Top 8";
  if (/top\s*4/i.test(lower)) return "Top 4";
  if (/top\s*8/i.test(lower)) return "Top 8";
  return "Playoff";
}

// ── HTML Parsing (Cheerio) ───────────────────────────────────────

function parseMatchTable($details: cheerio.Cheerio<cheerio.Element>, $root: cheerio.CheerioAPI): GemScrapedMatch[] {
  const matches: GemScrapedMatch[] = [];

  $details.find("table").each((_, table) => {
    const $table = $root(table);
    const headers = $table.find("th").map((_, th) => $root(th).text().trim().toLowerCase()).get();

    // Skip summary tables
    if (headers.some((h: string) =>
      h.includes("total wins") || h.includes("xp gained") || h.includes("net rating")
    )) return;

    const roundIdx = headers.findIndex((h: string) =>
      h.includes("round") || h.includes("playoff") || h === "rnd" || h === "#"
    );
    const oppIdx = headers.findIndex((h: string) =>
      h.includes("opponent") || h.includes("player") || h.includes("team") || h === "name"
    );
    const resultIdx = headers.findIndex((h: string) =>
      h.includes("result") || h.includes("outcome") || h === "w/l" || h === "win/loss"
    );

    if (oppIdx === -1 || resultIdx === -1) return;

    const isPlayoff = headers.some((h: string) => h.includes("playoff") || h.includes("top"));

    let $rows = $table.find("tbody tr");
    if ($rows.length === 0) {
      $rows = $table.find("tr").slice(1); // skip header row
    }

    $rows.each((_, row) => {
      const cells = $root(row).find("td");
      if (cells.length <= Math.max(oppIdx, resultIdx)) return;

      const roundText = roundIdx >= 0 ? $root(cells[roundIdx]).text().trim() : "0";
      const oppRaw = $root(cells[oppIdx]).text().trim();
      const resultText = $root(cells[resultIdx]).text().trim().toLowerCase();

      if (/^bye$/i.test(oppRaw) || /bye/i.test(resultText)) {
        matches.push({
          round: parseInt(roundText) || 0,
          roundLabel: isPlayoff ? classifyPlayoffRound(roundText) : "",
          opponent: "BYE",
          opponentGemId: "",
          result: "bye",
        });
        return;
      }

      if (!oppRaw || oppRaw.length < 2) return;

      let result: "win" | "loss" | "draw" | undefined;
      if (resultText === "win" || resultText === "w") result = "win";
      else if (resultText === "loss" || resultText === "l") result = "loss";
      else if (resultText === "draw" || resultText === "d") result = "draw";
      else return;

      const gemIdMatch = oppRaw.match(/\((\d+)\)\s*$/);
      matches.push({
        round: parseInt(roundText) || 0,
        roundLabel: isPlayoff ? classifyPlayoffRound(roundText) : "",
        opponent: oppRaw.replace(/\s*\(\d+\)\s*$/, "").trim(),
        opponentGemId: gemIdMatch ? gemIdMatch[1] : "",
        result,
      });
    });
  });

  return matches;
}

function extractHeroFromDetails($details: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): string {
  // Look for "Decklists" heading
  let decklistHeading: cheerio.Element | null = null;
  $details.find("h5").each((_, h5) => {
    if ($(h5).text().trim() === "Decklists") {
      decklistHeading = h5;
    }
  });
  if (!decklistHeading) return "Unknown";

  // Scan sibling elements after the heading
  let el = $(decklistHeading).next();
  while (el.length) {
    // Check links, cells, spans, divs
    el.find("a, td, span, div, p").each((_, child) => {
      const text = $(child).text().trim();
      if (KNOWN_HEROES.has(text)) return false; // break .each
    });

    // Check direct text of leaf elements
    const foundInChildren = el.find("a, td, span, div, p").toArray()
      .map((c) => $(c).text().trim())
      .find((t) => KNOWN_HEROES.has(t));
    if (foundInChildren) return foundInChildren;

    if (el.children().length <= 1) {
      const text = el.text().trim();
      if (KNOWN_HEROES.has(text)) return text;
    }

    el = el.next();
  }

  return "Unknown";
}

function extractHeroFromEventCard($event: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): string {
  const $decklists = $event.find(".event__decklists");
  if (!$decklists.length) return "Unknown";
  let hero = "Unknown";
  $decklists.find("a").each((_, link) => {
    const text = $(link).text().trim();
    if (KNOWN_HEROES.has(text)) {
      hero = text;
      return false; // break
    }
  });
  return hero;
}

function parseOneEvent($event: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): GemScrapedEvent | null {
  const gemEventId = $event.attr("id") || "";
  const titleEl = $event.find("h4.event__title, .event__title").first();
  const title = titleEl.text().trim();

  const dateLabel = $event.find(".event__when").first().text().trim();

  const metaTexts = $event.find(".event__meta-item > span, .event__meta-item span")
    .map((_, s) => $(s).text().trim())
    .get()
    .filter((t: string) => t.length > 0);

  const meta = classifyMetaItems(metaTexts, dateLabel);

  const $details = $event.find("details.event__extra-details");
  if (!$details.length) return null; // Skip in-progress events server-side

  const matches = parseMatchTable($details, $);
  if (matches.length === 0) return null;

  const hero = extractHeroFromDetails($details, $);

  return {
    gemEventId,
    name: title,
    date: meta.date,
    venue: meta.venue,
    eventType: meta.eventType,
    eventTier: getEventTier(meta.eventType),
    format: meta.format,
    rated: meta.rated,
    xpModifier: meta.xpModifier,
    hero,
    matches,
  };
}

// ── Parse a Full History Page ────────────────────────────────────

export function parseHistoryPage(html: string): { events: GemScrapedEvent[]; totalPages: number } {
  const $ = cheerio.load(html);
  const events: GemScrapedEvent[] = [];

  $("div.event").each((_, eventEl) => {
    const parsed = parseOneEvent($(eventEl), $);
    if (parsed) events.push(parsed);
  });

  // Detect pagination
  let totalPages = 1;
  $("a[href*='page=']").each((_, link) => {
    const href = $(link).attr("href") || "";
    const m = href.match(/[?&]page=(\d+)/);
    if (m) {
      const p = parseInt(m[1]);
      if (p > totalPages) totalPages = p;
    }
  });

  return { events, totalPages };
}

// ── Extract User GEM ID ─────────────────────────────────────────

export function extractGemIdFromHtml(html: string): string {
  const match = html.match(/GEM\s*ID[:\s]*(\d+)/i);
  return match ? match[1] : "";
}

// ── Scrape Full History ──────────────────────────────────────────

export async function scrapeHistory(
  cookies: string,
  opts: GemScrapeOptions = {}
): Promise<{ events: GemScrapedEvent[]; userGemId: string }> {
  const { maxPages, sinceDate } = opts;

  // Fetch page 1
  const page1Html = await fetchGemPage(`${GEM_BASE}/profile/history/?page=1`, cookies);
  const { events: page1Events, totalPages: detectedPages } = parseHistoryPage(page1Html);

  const effectiveMaxPages = maxPages ? Math.min(detectedPages, maxPages) : detectedPages;
  let allEvents = [...page1Events];

  // Check early stop: if all events on page 1 are before sinceDate
  if (sinceDate && page1Events.length > 0 && page1Events.every((e) => e.date && e.date < sinceDate)) {
    // All events are older than cutoff
  } else {
    // Fetch remaining pages in batches of 3
    for (let batch = 2; batch <= effectiveMaxPages; batch += 3) {
      if (sinceDate && allEvents.length > 0) {
        const lastEvent = allEvents[allEvents.length - 1];
        if (lastEvent.date && lastEvent.date < sinceDate) break;
      }

      const pageNums: number[] = [];
      for (let p = batch; p < batch + 3 && p <= effectiveMaxPages; p++) {
        pageNums.push(p);
      }

      const htmls = await Promise.all(
        pageNums.map(async (p) => {
          // Rate limit: 2s between requests
          await delay(2000);
          return fetchGemPage(`${GEM_BASE}/profile/history/?page=${p}`, cookies);
        })
      );

      for (const html of htmls) {
        const { events } = parseHistoryPage(html);
        allEvents = allEvents.concat(events);
      }
    }
  }

  // Extract user GEM ID from profile page
  let userGemId = "";
  try {
    const profileHtml = await fetchGemPage(`${GEM_BASE}/profile/player/`, cookies);
    userGemId = extractGemIdFromHtml(profileHtml);
  } catch {
    // Non-fatal — GEM ID extraction is best-effort
  }

  return { events: allEvents, userGemId };
}

// ── Convert to Import Format ─────────────────────────────────────

export interface AutoSyncMatch {
  event: string;
  date: string;
  venue: string;
  eventType: string;
  eventTier: string;
  format: string;
  rated: boolean;
  hero: string;
  round: number;
  roundLabel: string;
  opponent: string;
  opponentGemId: string;
  result: string;
  gemEventId: string;
  xpModifier: number;
  source: "auto-sync";
}

export function convertToImportFormat(
  events: GemScrapedEvent[],
  userGemId: string
): { fabStatsVersion: 2; userGemId: string; matches: AutoSyncMatch[] } {
  const matches: AutoSyncMatch[] = [];
  for (const event of events) {
    for (const match of event.matches) {
      matches.push({
        event: event.name,
        date: event.date,
        venue: event.venue,
        eventType: event.eventType,
        eventTier: event.eventTier,
        format: event.format,
        rated: event.rated,
        hero: event.hero,
        round: match.round,
        roundLabel: match.roundLabel,
        opponent: match.opponent,
        opponentGemId: match.opponentGemId,
        result: match.result,
        gemEventId: event.gemEventId,
        xpModifier: event.xpModifier,
        source: "auto-sync",
      });
    }
  }
  return { fabStatsVersion: 2, userGemId, matches };
}

// ── Utilities ────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
