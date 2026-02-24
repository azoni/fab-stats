import type { MatchRecord } from "@/types";
import { MatchResult, GameFormat } from "@/types";

export interface GemMetadata {
  playerName: string;
  gemId: string;
  eloRating: string;
  exportDate: string;
}

export interface GemImportResult {
  metadata: GemMetadata;
  matches: Omit<MatchRecord, "id" | "createdAt">[];
  skipped: number;
}

function parseDate(dateStr: string): string {
  // Format: "Jan. 15, 2025" or variations
  const cleaned = dateStr.replace(/noon/gi, "12:00 PM").trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  // Fallback: try removing periods from month abbreviation
  const noPeriod = cleaned.replace(/(\w{3})\./g, "$1");
  const d2 = new Date(noPeriod);
  if (!isNaN(d2.getTime())) {
    return d2.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

function parseOpponent(raw: string): { name: string; gemId: string } {
  // Format: "Name (GEM_ID)"
  const match = raw.match(/^(.+?)\s*\((\d+)\)\s*$/);
  if (match) {
    return { name: match[1].trim(), gemId: match[2] };
  }
  return { name: raw.trim(), gemId: "" };
}

function parseResult(raw: string): MatchResult | null {
  const lower = raw.toLowerCase().trim();
  if (lower === "win") return MatchResult.Win;
  if (lower === "loss") return MatchResult.Loss;
  if (lower === "draw") return MatchResult.Draw;
  // Byes and Unknown are skipped
  return null;
}

function guessFormat(eventName: string): GameFormat {
  const lower = eventName.toLowerCase();
  if (lower.includes("blitz")) return GameFormat.Blitz;
  if (lower.includes("classic constructed") || lower.includes(" cc")) return GameFormat.ClassicConstructed;
  if (lower.includes("draft")) return GameFormat.Draft;
  if (lower.includes("sealed")) return GameFormat.Sealed;
  if (lower.includes("clash")) return GameFormat.Clash;
  if (lower.includes("ultimate pit fight") || lower.includes("upf")) return GameFormat.UltimatePitFight;
  return GameFormat.Other;
}

function stripQuotes(s: string): string {
  return s.replace(/^"|"$/g, "").trim();
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map(stripQuotes);
}

export function parseGemCsv(csvText: string): GemImportResult {
  // Remove BOM if present
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);

  const metadata: GemMetadata = {
    playerName: "",
    gemId: "",
    eloRating: "",
    exportDate: "",
  };

  const matches: Omit<MatchRecord, "id" | "createdAt">[] = [];
  let skipped = 0;
  let headerFound = false;
  let columnMap: Record<string, number> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse metadata lines
    if (trimmed.startsWith("#")) {
      const content = trimmed.slice(1).trim();
      const colonIdx = content.indexOf(":");
      if (colonIdx > -1) {
        const key = content.slice(0, colonIdx).trim().toLowerCase();
        const value = content.slice(colonIdx + 1).trim();
        if (key.includes("player name")) metadata.playerName = value;
        else if (key.includes("gem id")) metadata.gemId = value;
        else if (key.includes("elo")) metadata.eloRating = value;
        else if (key.includes("export date")) metadata.exportDate = value;
      }
      continue;
    }

    // Parse header
    if (!headerFound) {
      const fields = splitCsvLine(trimmed);
      fields.forEach((f, i) => {
        columnMap[f.toLowerCase().trim()] = i;
      });
      headerFound = true;
      continue;
    }

    // Parse data rows
    const fields = splitCsvLine(trimmed);
    const get = (col: string) => {
      const idx = columnMap[col];
      return idx !== undefined && idx < fields.length ? fields[idx] : "";
    };

    const eventName = get("event name");
    const eventDate = get("event date");
    const opponent = get("opponent");
    const resultStr = get("result");
    const round = get("round");
    const ratingChange = get("rating change");

    // Skip byes and unknown results
    const result = parseResult(resultStr);
    if (!result) {
      skipped++;
      continue;
    }

    // Skip bye opponents
    if (opponent.toLowerCase() === "bye") {
      skipped++;
      continue;
    }

    const { name: opponentName } = parseOpponent(opponent);
    const roundInfo = round ? `Round ${round}` : "";
    const ratingInfo = ratingChange ? `Rating: ${ratingChange}` : "";
    const notesParts = [eventName, roundInfo, ratingInfo].filter(Boolean);

    matches.push({
      date: parseDate(eventDate),
      heroPlayed: "Unknown",
      opponentHero: "Unknown",
      opponentName: opponentName,
      result,
      format: guessFormat(eventName),
      notes: notesParts.join(" | "),
    });
  }

  return { metadata, matches, skipped };
}
