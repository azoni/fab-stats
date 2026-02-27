import type { MatchRecord } from "@/types";
import { MatchResult, GameFormat } from "@/types";

export interface PasteImportEvent {
  eventName: string;
  eventDate: string;
  format: GameFormat;
  rated: boolean;
  venue: string;
  eventType: string;
  matches: Omit<MatchRecord, "id" | "createdAt">[];
  heroPlayed?: string;
}

export interface PasteImportResult {
  events: PasteImportEvent[];
  totalMatches: number;
  skippedEventNames: string[];
  extensionMeta?: { userGemId?: string };
}

const NOISE_PATTERNS = [
  /^(Dashboard|History|Decklists|Profile|Event History)$/i,
  /^(English|Changing language|Introducing|Find out more|×)$/i,
  /^(YouTube|Twitter|Instagram|Facebook|Flesh & Blood|FAB Rules)$/i,
  /^(op@|info@|Live chat|Bug reports)/i,
  /^(fabtcg\.com|Leaderboards|Rules & Policies|Retailer|Card Database)/i,
  /^©/,
  /^(<<|>>|\.\.\.|\d{1,2})$/,
  /^(Round\s+Opponent|Playoff\s+Opponent|Matches$|Results$|Total Wins|XP Gained|Net Rating|View Results|Event description)/i,
  /^Record\s*\(W-L\)/i,
  /^Rating Change$/i,
  /^(Support|Resources|Connect)$/i,
  /^\d+\s*-\s*\d+(\s*-\s*\d+)?$/, // Score lines like "3-1" or "3-1-0"
  /^\d{3,}$/, // Pure numbers 3+ digits (ratings, XP)
  /^[+-]\d+$/, // Rating changes like "+15" or "-8"
  /^XP Modifier/i,
  /^\d+\s*(Players?|Participants?)$/i, // "24 Players"
];

export function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(line));
}

export function guessFormat(text: string): GameFormat {
  const lower = text.toLowerCase();
  if (lower.includes("classic constructed")) return GameFormat.ClassicConstructed;
  if (lower.includes("silver age")) return GameFormat.SilverAge;
  if (lower.includes("blitz")) return GameFormat.Blitz;
  if (lower.includes("draft")) return GameFormat.Draft;
  if (lower.includes("sealed")) return GameFormat.Sealed;
  if (lower.includes("clash")) return GameFormat.Clash;
  if (lower.includes("ultimate pit fight") || lower.includes("upf")) return GameFormat.UltimatePitFight;
  return GameFormat.Other;
}

const EVENT_ABBREVIATIONS: Record<string, string> = {
  "rtn": "Road to Nationals",
  "pq": "ProQuest",
  "bh": "Battle Hardened",
  "upf": "Ultimate Pit Fight",
};

/** Expand known abbreviations in event names */
export function expandEventName(name: string): string {
  const lowerFull = name.trim().toLowerCase();
  if (EVENT_ABBREVIATIONS[lowerFull]) return EVENT_ABBREVIATIONS[lowerFull];
  let result = name;
  for (const [abbr, expanded] of Object.entries(EVENT_ABBREVIATIONS)) {
    result = result.replace(new RegExp("\\b" + abbr + "\\b", "gi"), expanded);
  }
  return result;
}

/** Competitive event types ordered by prestige (lowest first).
 *  When multiple keywords match, the lowest tier wins. */
const COMPETITIVE_TYPES: [RegExp, string][] = [
  [/skirmish/i, "Skirmish"],
  [/road to national|\brtn\b/i, "Road to Nationals"],
  [/proquest|pro quest|\bpq\b/i, "ProQuest"],
  [/battle hardened|\bbh\b/i, "Battle Hardened"],
  [/\bcalling\b/i, "The Calling"],
  [/\bnational/i, "Nationals"],
  [/pro tour/i, "Pro Tour"],
  [/worlds|world championship/i, "Worlds"],
];

export function guessEventType(lines: string[]): string {
  const all = lines.join(" ").toLowerCase();
  // Local/casual events — always win
  if (all.includes("world premiere")) return "Pre-Release";
  if (all.includes("pre release") || all.includes("pre-release")) return "Pre-Release";
  if (all.includes("armory")) return "Armory";
  if (all.includes("on demand")) return "On Demand";
  // Competitive events — pick lowest prestige when multiple match
  for (const [pattern, type] of COMPETITIVE_TYPES) {
    if (pattern.test(all)) return type;
  }
  return "Other";
}

/** Check if a line looks like an event title (contains event-type keywords) */
function isEventNameLike(line: string): boolean {
  return /armory|proquest|pro quest|pre.?release|skirmish|calling|battle hardened|nationals?|road to|clash|showdown|tournament|championship|qualifier|league|on demand|sealed|draft|constructed|weekly|ira|welcome to rathe|round robin/i.test(line);
}

/** Check if a line looks like event metadata rather than a venue name */
export function isMetadataLine(line: string): boolean {
  return /^(Classic Constructed|Blitz|Sealed|Draft|Clash|Ultimate Pit Fight|Rated|Not Rated|Unrated|XP Modifier|Competitive|Casual|Record|Rating)/i.test(line);
}

/** Check if a line is definitely not a venue (days of the week, prize descriptions, etc.) */
function isNotVenue(line: string): boolean {
  const lower = line.toLowerCase().trim();
  // Days of the week
  if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(lower)) return true;
  // Prize / reward descriptions (e.g. "4x Cold Foil ...", "2x Channel Thunder Steppe ...")
  if (/^\d+x\s/i.test(line)) return true;
  // Lines mentioning prize/award language
  if (/awarded to|promo cards?|cold foil|rainbow foil|extended art/i.test(line)) return true;
  // Player count lines
  if (/^\d+\s*(players?|participants?)$/i.test(lower)) return true;
  return false;
}

export function parseDate(dateStr: string): string {
  const cleaned = dateStr
    .replace(/,\s*\d{1,2}:\d{2}\s*(AM|PM)/i, "")
    .replace(/noon/gi, "")
    .trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  // Try removing abbreviated month periods (e.g. "Feb." → "Feb")
  const noPeriod = cleaned.replace(/(\w{3})\./g, "$1");
  const d2 = new Date(noPeriod);
  if (!isNaN(d2.getTime())) return d2.toISOString().split("T")[0];
  // Try DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d3 = new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`);
    if (!isNaN(d3.getTime())) return d3.toISOString().split("T")[0];
  }
  // Return empty string instead of today's date — caller must handle missing dates
  return "";
}

export function parseResult(text: string): MatchResult | null {
  const lower = text.toLowerCase().trim();
  if (lower === "win") return MatchResult.Win;
  if (lower === "loss") return MatchResult.Loss;
  if (lower === "draw") return MatchResult.Draw;
  if (lower === "bye") return MatchResult.Bye;
  return null;
}

export function parseOpponentName(raw: string): { name: string; gemId: string } {
  const match = raw.match(/^(.+?)\s*\((\d+)\)\s*$/);
  if (match) {
    return { name: match[1].trim(), gemId: match[2] };
  }
  return { name: raw.trim(), gemId: "" };
}

/**
 * From a list of pre-date context lines, extract the event name and venue.
 * Strategy: if a line contains event-type keywords, it's the event name.
 * Other qualifying lines are venue candidates.
 */
function extractEventNameAndVenue(
  contextLines: string[],
  datePattern: RegExp,
  shortDatePattern: RegExp
): { eventName: string; venue: string } {
  const qualifying = contextLines.filter(
    (cl) => cl.length > 3 && !datePattern.test(cl) && !shortDatePattern.test(cl) && !isMetadataLine(cl) && !isNotVenue(cl)
  );

  if (qualifying.length === 0) {
    return { eventName: "Unknown Event", venue: "" };
  }

  if (qualifying.length === 1) {
    return { eventName: qualifying[0], venue: "" };
  }

  // Multiple qualifying lines — try to distinguish event name from venue
  // Look for a line with event-type keywords
  const eventLine = qualifying.find((l) => isEventNameLike(l));

  if (eventLine) {
    // The event-keyword line is the event name; the other is likely the venue
    const venueLine = qualifying.find((l) => l !== eventLine && !isEventNameLike(l));
    return { eventName: eventLine, venue: venueLine || "" };
  }

  // No event keywords found — use the longest line as event name, other as venue
  const sorted = [...qualifying].sort((a, b) => b.length - a.length);
  return { eventName: sorted[0], venue: sorted.length > 1 ? sorted[1] : "" };
}

export function parseGemPaste(text: string): PasteImportResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const events: PasteImportEvent[] = [];

  const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i;
  const shortDatePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i;
  const matchRowPattern = /^(\d+)\s+(.+?\(\d+\))\s+(Win|Loss|Draw)/i;

  let currentEvent: {
    name: string;
    date: string;
    format: GameFormat;
    rated: boolean;
    venue: string;
    eventType: string;
    contextLines: string[];
  } | null = null;
  let currentMatches: Omit<MatchRecord, "id" | "createdAt">[] = [];
  let contextLines: string[] = [];
  const skippedEventNames: string[] = [];

  function saveCurrentEvent() {
    if (currentEvent) {
      if (currentMatches.length > 0) {
        events.push({
          eventName: currentEvent.name,
          eventDate: currentEvent.date,
          format: currentEvent.format,
          rated: currentEvent.rated,
          venue: currentEvent.venue,
          eventType: currentEvent.eventType,
          matches: currentMatches,
        });
      } else {
        skippedEventNames.push(currentEvent.name);
      }
      currentMatches = [];
    }
  }

  let inPlayoffSection = false;
  let inDecklistSection = false;

  for (const line of lines) {
    // ── Section headers (detect before noise filter) ──
    if (/^Round\s+Opponent/i.test(line)) {
      inPlayoffSection = false;
      continue;
    }
    if (/^Playoff\s+Opponent/i.test(line)) {
      inPlayoffSection = true;
      continue;
    }
    if (/^Decklists$/i.test(line)) {
      inDecklistSection = true;
      continue;
    }

    // ── Decklist entries: "Format     Hero Name" ──
    if (inDecklistSection && currentEvent) {
      const deckMatch = line.match(/^(.+?)\s{2,}(.+)$/);
      if (deckMatch) {
        const fmt = guessFormat(deckMatch[1]);
        if (fmt !== GameFormat.Other) {
          const hero = deckMatch[2].trim();
          for (const m of currentMatches) {
            if (m.heroPlayed === "Unknown" && m.format === fmt) {
              m.heroPlayed = hero;
            }
          }
          continue;
        }
      }
      inDecklistSection = false;
    }

    if (isNoise(line)) continue;

    // Match row
    const matchMatch = line.match(matchRowPattern);
    if (matchMatch) {
      if (!currentEvent) {
        currentEvent = buildEventFromContext(contextLines);
        contextLines = [];
      }
      const result = parseResult(matchMatch[3]);
      if (result) {
        const parsedOpp = parseOpponentName(matchMatch[2]);
        const roundLabel = inPlayoffSection
          ? `Round P${matchMatch[1]}`
          : `Round ${matchMatch[1]}`;
        currentMatches.push({
          date: currentEvent.date,
          heroPlayed: "Unknown",
          opponentHero: "Unknown",
          opponentName: parsedOpp.name,
          opponentGemId: parsedOpp.gemId || undefined,
          result,
          format: currentEvent.format,
          notes: `${currentEvent.name} | ${roundLabel}`,
          venue: currentEvent.venue || undefined,
          eventType: currentEvent.eventType || undefined,
          rated: currentEvent.rated,
          source: "paste",
        });
      }
      continue;
    }

    // Bye rows — import as BYE match
    const byeRowMatch = line.match(/^(\d+)\s+Bye/i);
    if (byeRowMatch) {
      if (!currentEvent) {
        currentEvent = buildEventFromContext(contextLines);
        contextLines = [];
      }
      const roundLabel = inPlayoffSection
        ? `Round P${byeRowMatch[1]}`
        : `Round ${byeRowMatch[1]}`;
      currentMatches.push({
        date: currentEvent.date,
        heroPlayed: "Unknown",
        opponentHero: "Unknown",
        opponentName: "BYE",
        result: MatchResult.Bye,
        format: currentEvent.format,
        notes: `${currentEvent.name} | ${roundLabel}`,
        venue: currentEvent.venue || undefined,
        eventType: currentEvent.eventType || undefined,
        rated: currentEvent.rated,
        source: "paste",
      });
      continue;
    }

    // Date line = new event boundary
    const dateMatch = line.match(datePattern) || line.match(shortDatePattern);
    if (dateMatch) {
      saveCurrentEvent();
      inPlayoffSection = false;
      inDecklistSection = false;

      // Extract event name AND venue from pre-date context
      const { eventName, venue: preVenue } = extractEventNameAndVenue(contextLines, datePattern, shortDatePattern);

      currentEvent = {
        name: expandEventName(eventName),
        date: parseDate(dateMatch[0]),
        format: GameFormat.Other,
        rated: false,
        venue: preVenue,
        eventType: "",
        contextLines: [],
      };
      contextLines = [];
      continue;
    }

    // Context line
    contextLines.push(line);

    if (currentEvent) {
      currentEvent.contextLines.push(line);
      const lower = line.toLowerCase();

      if (currentEvent.format === GameFormat.Other) {
        const fmt = guessFormat(line);
        if (fmt !== GameFormat.Other) currentEvent.format = fmt;
      }
      if (lower === "rated") currentEvent.rated = true;
      if (lower === "not rated" || lower === "unrated") currentEvent.rated = false;

      // Detect venue from post-date context if not already found from pre-date
      if (!currentEvent.venue && currentEvent.contextLines.length <= 5 && line.length > 3) {
        if (!isMetadataLine(line) && !isEventNameLike(line) && !isNotVenue(line) && guessFormat(line) === GameFormat.Other) {
          currentEvent.venue = line;
        }
      }

      // Detect event type
      currentEvent.eventType = guessEventType([...currentEvent.contextLines, currentEvent.name]);
    }
  }

  saveCurrentEvent();

  const totalMatches = events.reduce((sum, e) => sum + e.matches.length, 0);
  return { events, totalMatches, skippedEventNames };
}

export function parseExtensionJson(json: string): PasteImportResult {
  const parsed = JSON.parse(json);

  // Detect wrapped format (v2) vs flat array (v1)
  type MatchEntry = {
    event?: string;
    date?: string;
    venue?: string;
    eventType?: string;
    format?: string;
    rated?: boolean;
    hero?: string;
    round?: number;
    roundLabel?: string;
    opponent?: string;
    opponentGemId?: string;
    result?: string;
    extensionVersion?: string;
    gemEventId?: string;
    xpModifier?: number;
  };

  let raw: MatchEntry[];
  let extensionMeta: { userGemId?: string } | undefined;

  if (Array.isArray(parsed)) {
    // v1 flat array (old extension)
    raw = parsed;
  } else if (parsed && Array.isArray(parsed.matches)) {
    // v2 wrapped format (new extension)
    raw = parsed.matches;
    if (parsed.userGemId) {
      extensionMeta = { userGemId: parsed.userGemId };
    }
  } else {
    raw = [];
  }

  const eventMap = new Map<
    string,
    {
      name: string;
      info: { date: string; format: GameFormat; rated: boolean; venue: string; eventType: string };
      matches: Omit<MatchRecord, "id" | "createdAt">[];
    }
  >();

  for (const entry of raw) {
    const eventName = expandEventName(entry.event || "Unknown Event");
    const eventDate = entry.date || new Date().toISOString().split("T")[0];

    // Use gemEventId as grouping key when available (more reliable), otherwise name+date
    const groupKey = entry.gemEventId
      ? `gem:${entry.gemEventId}`
      : `${eventName}|${eventDate}`;

    // Detect format from explicit field, falling back to event name
    let format = guessFormat(entry.format || "");
    if (format === GameFormat.Other) {
      format = guessFormat(eventName);
    }

    if (!eventMap.has(groupKey)) {
      eventMap.set(groupKey, {
        name: eventName,
        info: {
          date: eventDate,
          format,
          rated: entry.rated || false,
          venue: entry.venue || "",
          eventType: entry.eventType || "Other",
        },
        matches: [],
      });
    }

    const group = eventMap.get(groupKey)!;
    const result = parseResult(entry.result || "");
    if (!result) continue;

    // Build round info: use roundLabel for playoffs, otherwise "Round N"
    const roundInfo = entry.roundLabel
      ? entry.roundLabel
      : `Round ${entry.round || 0}`;

    group.matches.push({
      date: entry.date || group.info.date,
      heroPlayed: entry.hero || "Unknown",
      opponentHero: "Unknown",
      opponentName: entry.opponent || "Unknown",
      opponentGemId: entry.opponentGemId || undefined,
      result,
      format,
      notes: `${eventName} | ${roundInfo}`,
      venue: entry.venue || undefined,
      eventType: entry.eventType || undefined,
      rated: entry.rated,
      source: "extension",
      extensionVersion: entry.extensionVersion || undefined,
      gemEventId: entry.gemEventId || undefined,
    });
  }

  const events: PasteImportEvent[] = [...eventMap.entries()].map(([, data]) => ({
    eventName: data.name,
    eventDate: data.info.date,
    format: data.info.format,
    rated: data.info.rated,
    venue: data.info.venue,
    eventType: data.info.eventType,
    matches: data.matches,
  }));

  return {
    events,
    totalMatches: events.reduce((sum, e) => sum + e.matches.length, 0),
    skippedEventNames: [],
    extensionMeta,
  };
}

function buildEventFromContext(contextLines: string[]): {
  name: string;
  date: string;
  format: GameFormat;
  rated: boolean;
  venue: string;
  eventType: string;
  contextLines: string[];
} {
  const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i;
  const shortDatePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i;

  let date = "";
  for (const line of contextLines) {
    const m = line.match(datePattern) || line.match(shortDatePattern);
    if (m) { date = parseDate(m[0]); break; }
  }

  const { eventName, venue } = extractEventNameAndVenue(contextLines, datePattern, shortDatePattern);

  return {
    name: expandEventName(eventName),
    date,
    format: guessFormat(contextLines.join(" ")),
    rated: contextLines.some((l) => l.toLowerCase() === "rated"),
    venue,
    eventType: guessEventType(contextLines),
    contextLines,
  };
}
