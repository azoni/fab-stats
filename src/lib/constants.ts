export const STORAGE_KEY = "fab-stats-data";
export const CURRENT_VERSION = 1;

/** Matches on or after this date require explicit hero selection during import. */
export const HERO_REQUIRED_CUTOFF = "2026-02-24";

/** Returns the href for a player link.
 *
 * Community players imported from GEM often have display-name-style usernames with
 * spaces or accents (e.g. "Igueta Marreta") — a strict slug whitelist wrongly sent
 * those to /search. Instead, route any non-empty identifier to the profile page,
 * URL-encoded: /player resolves exact, stale/changed, and display-name usernames and
 * shows a graceful "not found" (with a pre-filled search) only when nothing matches. */
export function playerHref(username: string): string {
  const u = (username || "").trim();
  if (!u) return "/search";
  return `/player/${encodeURIComponent(u)}`;
}

/**
 * Parse a date string as local time.
 * Date-only strings like "2024-01-15" are parsed by JS as UTC midnight,
 * which in western timezones displays as the previous day.
 * Appending T00:00:00 forces local time interpretation.
 */
export function localDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + "T00:00:00");
  }
  return new Date(dateStr);
}
