import type { MatchRecord } from "@/types";
import { GameFormat, MatchResult } from "@/types";
import {
  isNoise,
  isMetadataLine,
  guessFormat,
  guessEventType,
  expandEventName,
  parseDate,
  parseResult,
  parseOpponentName,
  type PasteImportEvent,
} from "./gem-paste-import";

export interface SingleEventImportResult {
  event: PasteImportEvent | null;
  error: string | null;
}

const DATE_PATTERN = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i;
const MATCH_ROW_PATTERN = /^(\d+)\s+(.+?\(\d+\))\s+(Win|Loss|Draw)/i;
const META_NOISE = /^(View Results|Results|Total Wins|XP Gained|Net Rating|Matches|Round\s+Opponent|Record|Rating Change|Pending)/i;

export function parseSingleEventPaste(text: string): SingleEventImportResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length < 3) {
    return { event: null, error: "Not enough text to parse. Please paste the full event details." };
  }

  // 1. Find the date line as anchor
  let dateLineIndex = -1;
  let dateStr = "";
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(DATE_PATTERN);
    if (m) {
      dateLineIndex = i;
      dateStr = parseDate(m[0]);
      break;
    }
  }

  if (dateLineIndex === -1) {
    return { event: null, error: "Could not find a date in the pasted text." };
  }

  // 2. Event name = first non-noise line before the date
  const preDateLines = lines.slice(0, dateLineIndex).filter((l) => !isNoise(l));
  const eventName = expandEventName(preDateLines[0] || "Unknown Event");

  // 3. Find first match row
  let firstMatchIndex = lines.length;
  for (let i = dateLineIndex + 1; i < lines.length; i++) {
    if (MATCH_ROW_PATTERN.test(lines[i])) {
      firstMatchIndex = i;
      break;
    }
  }

  // 4. Extract metadata from lines between date and first match
  const metadataLines = lines.slice(dateLineIndex + 1, firstMatchIndex);
  let format = GameFormat.Other;
  let rated = false;
  let venue = "";

  for (const line of metadataLines) {
    if (META_NOISE.test(line)) continue;
    if (/^XP Modifier/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    if (isNoise(line)) continue;

    const fmt = guessFormat(line);
    if (fmt !== GameFormat.Other) { format = fmt; continue; }
    if (line.toLowerCase() === "rated") { rated = true; continue; }
    if (line.toLowerCase() === "not rated" || line.toLowerCase() === "unrated") { rated = false; continue; }

    // First unrecognized metadata line is likely the venue/organizer
    if (!venue && line.length > 2 && !isMetadataLine(line)) {
      venue = line;
    }
  }

  // Also try to detect format from the event name or subtitle lines
  if (format === GameFormat.Other) {
    format = guessFormat([eventName, ...metadataLines].join(" "));
  }

  const eventType = guessEventType([eventName, ...preDateLines, ...metadataLines]);

  // 5. Parse match rows (with playoff and decklist section awareness)
  const matches: Omit<MatchRecord, "id" | "createdAt">[] = [];
  let inPlayoffSection = false;
  let inDecklistSection = false;

  for (let i = firstMatchIndex; i < lines.length; i++) {
    const line = lines[i];

    // Section headers (detect before noise/match checks)
    if (/^Round\s+Opponent/i.test(line)) { inPlayoffSection = false; continue; }
    if (/^Playoff\s+Opponent/i.test(line)) { inPlayoffSection = true; continue; }
    if (/^Decklists$/i.test(line)) { inDecklistSection = true; continue; }

    // Decklist entries: "Format     Hero Name"
    if (inDecklistSection) {
      const deckMatch = line.match(/^(.+?)\s{2,}(.+)$/);
      if (deckMatch) {
        const fmt = guessFormat(deckMatch[1]);
        if (fmt !== GameFormat.Other) {
          const hero = deckMatch[2].trim();
          for (const m of matches) {
            if (m.heroPlayed === "Unknown" && m.format === fmt) m.heroPlayed = hero;
          }
          continue;
        }
      }
      inDecklistSection = false;
    }

    // Match row
    const m = line.match(MATCH_ROW_PATTERN);
    if (m) {
      const result = parseResult(m[3]);
      if (!result) continue;

      const parsed = parseOpponentName(m[2]);
      const roundLabel = inPlayoffSection ? `Round P${m[1]}` : `Round ${m[1]}`;
      matches.push({
        date: dateStr,
        heroPlayed: "Unknown",
        opponentHero: "Unknown",
        opponentName: parsed.name,
        opponentGemId: parsed.gemId || undefined,
        result,
        format,
        notes: `${eventName} | ${roundLabel}`,
        venue: venue || undefined,
        eventType: eventType || undefined,
        rated,
      });
      continue;
    }

    // Bye rows
    const byeMatch = line.match(/^(\d+)\s+Bye/i);
    if (byeMatch) {
      const roundLabel = inPlayoffSection ? `Round P${byeMatch[1]}` : `Round ${byeMatch[1]}`;
      matches.push({
        date: dateStr,
        heroPlayed: "Unknown",
        opponentHero: "Unknown",
        opponentName: "BYE",
        result: MatchResult.Bye,
        format,
        notes: `${eventName} | ${roundLabel}`,
        venue: venue || undefined,
        eventType: eventType || undefined,
        rated,
      });
      continue;
    }
  }

  if (matches.length === 0) {
    return { event: null, error: "No match results found. Make sure the text includes the match table." };
  }

  // Detect hero from matches (for the event-level hero field)
  const detectedHeroes = new Set(matches.map((m) => m.heroPlayed).filter((h) => h !== "Unknown"));
  const heroPlayed = detectedHeroes.size === 1 ? [...detectedHeroes][0]! : undefined;

  return {
    event: {
      eventName,
      eventDate: dateStr,
      format,
      rated,
      venue,
      eventType,
      matches,
      heroPlayed,
    },
    error: null,
  };
}
