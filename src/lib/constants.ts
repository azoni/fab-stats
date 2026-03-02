export const STORAGE_KEY = "fab-stats-data";
export const CURRENT_VERSION = 1;

/** Valid username slug pattern (lowercase alphanumeric, underscores, hyphens). */
const VALID_USERNAME = /^[a-z0-9_-]+$/i;

/** Returns the correct href for a player link. Invalid usernames redirect to search. */
export function playerHref(username: string): string {
  if (VALID_USERNAME.test(username)) return `/player/${username}`;
  return `/search?q=${encodeURIComponent(username)}`;
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
