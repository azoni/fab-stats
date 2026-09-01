// Canonical daily-game date helpers. UTC on purpose: every player must see the
// same puzzle reset at the same instant, so never use the local-time getters.
//
// These used to live in lib/fabdoku/puzzle-generator.ts (which still
// re-exports them), but that module statically loads the frozen game pools
// and the card manifest, so date-only callers (profiles, The Understack)
// import from here instead.

/** Get today's date string in YYYY-MM-DD format (UTC so puzzle resets at the same time for all players). */
export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Get yesterday's date string in YYYY-MM-DD format (UTC). */
export function getYesterdayDateStr(): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - 1);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
