import type { CoverageMatch } from "./sitemap-scraper";

// ── Name Normalization ──

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"');
}

function extractEventName(notes: string): string {
  return (notes.split(" | ")[0] || "").trim();
}

function extractRoundNumber(notes: string): number {
  const roundPart = (notes.split(" | ")[1] || "").trim();
  const num = roundPart.match(/\d+/);
  return num ? parseInt(num[0]) : 0;
}

// ── Coverage Index ──

export interface CoverageIndexEntry {
  hero: string;
  event: string;
  round: number;
  eventDate: string;
}

// Key: "normalizedPlayerName|date" → array of entries (player may have multiple matches on same day)
export type CoverageIndex = Map<string, CoverageIndexEntry[]>;

export function buildCoverageIndex(matches: CoverageMatch[]): CoverageIndex {
  const index: CoverageIndex = new Map();

  for (const m of matches) {
    // Index both players
    for (const [name, hero] of [
      [m.player1, m.player1Hero],
      [m.player2, m.player2Hero],
    ]) {
      if (!name || !hero) continue;

      const key = `${normalizeName(name)}|${m.eventDate || ""}`;
      const entries = index.get(key) || [];
      entries.push({
        hero,
        event: m.event,
        round: m.round,
        eventDate: m.eventDate,
      });
      index.set(key, entries);
    }
  }

  return index;
}

// ── Lookup ──

export interface CoverageLookupResult {
  hero: string;
  confidence: "exact" | "fuzzy";
  event: string;
  round: number;
}

export function findOpponentHero(
  opponentName: string,
  matchDate: string,
  matchNotes: string,
  index: CoverageIndex
): CoverageLookupResult | null {
  if (!opponentName) return null;

  const normalizedOpp = normalizeName(opponentName);
  const eventName = extractEventName(matchNotes);
  const roundNum = extractRoundNumber(matchNotes);

  // Try exact key: name + date
  const key = `${normalizedOpp}|${matchDate}`;
  const entries = index.get(key);

  if (entries && entries.length > 0) {
    // If we have event name, try to match it
    if (eventName) {
      const eventLower = eventName.toLowerCase();

      // Try round-specific match first
      if (roundNum > 0) {
        const roundMatch = entries.find(
          (e) =>
            e.round === roundNum &&
            eventMatches(e.event, eventLower)
        );
        if (roundMatch) {
          return {
            hero: roundMatch.hero,
            confidence: "exact",
            event: roundMatch.event,
            round: roundMatch.round,
          };
        }
      }

      // Try event-only match (any round) — take the most common hero
      const eventEntries = entries.filter((e) =>
        eventMatches(e.event, eventLower)
      );
      if (eventEntries.length > 0) {
        const hero = mostCommonHero(eventEntries);
        return {
          hero,
          confidence: "exact",
          event: eventEntries[0].event,
          round: eventEntries[0].round,
        };
      }
    }

    // No event match but we have date + name match — use most common hero
    const hero = mostCommonHero(entries);
    return {
      hero,
      confidence: "fuzzy",
      event: entries[0].event,
      round: entries[0].round,
    };
  }

  // Try without date (name only) — much lower confidence
  // Only useful if the player consistently plays one hero
  // Skip this for now to avoid false positives

  return null;
}

function eventMatches(coverageEvent: string, userEventLower: string): boolean {
  const covLower = coverageEvent.toLowerCase();

  // Exact match
  if (covLower === userEventLower) return true;

  // Coverage event contains user event or vice versa
  if (covLower.includes(userEventLower) || userEventLower.includes(covLower)) return true;

  // Strip common prefixes and compare
  const stripped = (s: string) =>
    s
      .replace(/^world premiere:\s*/i, "")
      .replace(/^wp:\s*/i, "")
      .replace(/\s*\d{4}\s*$/, "") // strip trailing year
      .trim();

  const strippedCov = stripped(covLower);
  const strippedUser = stripped(userEventLower);
  if (strippedCov === strippedUser) return true;
  if (strippedCov.includes(strippedUser) || strippedUser.includes(strippedCov)) return true;

  return false;
}

function mostCommonHero(entries: CoverageIndexEntry[]): string {
  const counts = new Map<string, number>();
  for (const e of entries) {
    counts.set(e.hero, (counts.get(e.hero) || 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [hero, count] of counts) {
    if (count > bestCount) {
      best = hero;
      bestCount = count;
    }
  }
  return best;
}

// ── Batch Processing ──

export interface BackfillResult {
  matchId: string;
  userId: string;
  opponentName: string;
  hero: string;
  confidence: "exact" | "fuzzy";
  event: string;
}

export function findMatchesNeedingHeroes(
  matches: { id: string; opponentName?: string; opponentHero: string; date: string; notes?: string }[],
  userId: string,
  index: CoverageIndex
): BackfillResult[] {
  const results: BackfillResult[] = [];

  for (const m of matches) {
    // Skip if hero already set
    if (m.opponentHero && m.opponentHero !== "Unknown") continue;
    if (!m.opponentName) continue;

    const lookup = findOpponentHero(
      m.opponentName,
      m.date,
      m.notes || "",
      index
    );

    if (lookup && lookup.confidence === "exact") {
      results.push({
        matchId: m.id,
        userId,
        opponentName: m.opponentName,
        hero: lookup.hero,
        confidence: lookup.confidence,
        event: lookup.event,
      });
    }
  }

  return results;
}
