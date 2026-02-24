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
}

export interface PasteImportResult {
  events: PasteImportEvent[];
  totalMatches: number;
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

function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(line));
}

function guessFormat(text: string): GameFormat {
  const lower = text.toLowerCase();
  if (lower.includes("classic constructed")) return GameFormat.ClassicConstructed;
  if (lower.includes("blitz")) return GameFormat.Blitz;
  if (lower.includes("draft")) return GameFormat.Draft;
  if (lower.includes("sealed")) return GameFormat.Sealed;
  if (lower.includes("clash")) return GameFormat.Clash;
  if (lower.includes("ultimate pit fight") || lower.includes("upf")) return GameFormat.UltimatePitFight;
  return GameFormat.Other;
}

function guessEventType(lines: string[]): string {
  const all = lines.join(" ").toLowerCase();
  if (all.includes("proquest")) return "ProQuest";
  if (all.includes("calling")) return "The Calling";
  if (all.includes("battle hardened")) return "Battle Hardened";
  if (all.includes("pre release") || all.includes("pre-release")) return "Pre-Release";
  if (all.includes("skirmish")) return "Skirmish";
  if (all.includes("road to nationals")) return "Road to Nationals";
  if (all.includes("national")) return "Nationals";
  if (all.includes("armory")) return "Armory";
  return "Other";
}

/** Check if a line looks like an event title (contains event-type keywords) */
function isEventNameLike(line: string): boolean {
  return /armory|proquest|pro quest|pre.?release|skirmish|calling|battle hardened|nationals?|road to|clash|showdown|tournament|championship|qualifier|league|on demand|sealed|draft|constructed|weekly|ira|welcome to rathe|round robin/i.test(line);
}

/** Check if a line looks like event metadata rather than a venue name */
function isMetadataLine(line: string): boolean {
  return /^(Classic Constructed|Blitz|Sealed|Draft|Clash|Ultimate Pit Fight|Rated|Not Rated|Unrated|XP Modifier|Competitive|Casual|Record|Rating)/i.test(line);
}

function parseDate(dateStr: string): string {
  const cleaned = dateStr
    .replace(/,\s*\d{1,2}:\d{2}\s*(AM|PM)/i, "")
    .replace(/noon/gi, "")
    .trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  const noPeriod = cleaned.replace(/(\w{3})\./g, "$1");
  const d2 = new Date(noPeriod);
  if (!isNaN(d2.getTime())) return d2.toISOString().split("T")[0];
  return new Date().toISOString().split("T")[0];
}

function parseResult(text: string): MatchResult | null {
  const lower = text.toLowerCase().trim();
  if (lower === "win") return MatchResult.Win;
  if (lower === "loss") return MatchResult.Loss;
  if (lower === "draw") return MatchResult.Draw;
  return null;
}

function parseOpponentName(raw: string): string {
  const match = raw.match(/^(.+?)\s*\(\d+\)\s*$/);
  return match ? match[1].trim() : raw.trim();
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
    (cl) => cl.length > 3 && !datePattern.test(cl) && !shortDatePattern.test(cl) && !isMetadataLine(cl)
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

  function saveCurrentEvent() {
    if (currentMatches.length > 0 && currentEvent) {
      events.push({
        eventName: currentEvent.name,
        eventDate: currentEvent.date,
        format: currentEvent.format,
        rated: currentEvent.rated,
        venue: currentEvent.venue,
        eventType: currentEvent.eventType,
        matches: currentMatches,
      });
      currentMatches = [];
    }
  }

  for (const line of lines) {
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
        currentMatches.push({
          date: currentEvent.date,
          heroPlayed: "Unknown",
          opponentHero: "Unknown",
          opponentName: parseOpponentName(matchMatch[2]),
          result,
          format: currentEvent.format,
          notes: `${currentEvent.name} | Round ${matchMatch[1]}`,
          venue: currentEvent.venue || undefined,
          eventType: currentEvent.eventType || undefined,
          rated: currentEvent.rated,
        });
      }
      continue;
    }

    // Bye rows
    if (/^\d+\s+Bye/i.test(line)) continue;

    // Date line = new event boundary
    const dateMatch = line.match(datePattern) || line.match(shortDatePattern);
    if (dateMatch) {
      saveCurrentEvent();

      // Extract event name AND venue from pre-date context
      const { eventName, venue: preVenue } = extractEventNameAndVenue(contextLines, datePattern, shortDatePattern);

      currentEvent = {
        name: eventName,
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
        if (!isMetadataLine(line) && !isEventNameLike(line) && guessFormat(line) === GameFormat.Other) {
          currentEvent.venue = line;
        }
      }

      // Detect event type
      currentEvent.eventType = guessEventType([...currentEvent.contextLines, currentEvent.name]);
    }
  }

  saveCurrentEvent();

  const totalMatches = events.reduce((sum, e) => sum + e.matches.length, 0);
  return { events, totalMatches };
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

  let date = new Date().toISOString().split("T")[0];
  for (const line of contextLines) {
    const m = line.match(datePattern) || line.match(shortDatePattern);
    if (m) { date = parseDate(m[0]); break; }
  }

  const { eventName, venue } = extractEventNameAndVenue(contextLines, datePattern, shortDatePattern);

  return {
    name: eventName,
    date,
    format: guessFormat(contextLines.join(" ")),
    rated: contextLines.some((l) => l.toLowerCase() === "rated"),
    venue,
    eventType: guessEventType(contextLines),
    contextLines,
  };
}
