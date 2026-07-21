/**
 * Event-name normalization shared by the import parsers AND the dedup fingerprint.
 *
 * GEM event names sometimes arrive abbreviated ("PQ", "RtN"). The extension/paste
 * parsers expand these at parse time, but the CSV parser stores them raw — so the
 * SAME event imported by different methods would carry different names. Because the
 * dedup fingerprint keys on the (normalized) event name, `normalizeNotes` runs
 * `expandEventName` too, so raw "PQ Downtown" and expanded "ProQuest Downtown"
 * collapse to one fingerprint and dedup correctly. Kept dependency-free so
 * firestore-storage.ts (imported almost everywhere) can use it without pulling in
 * the heavier parser modules.
 */
const EVENT_ABBREVIATIONS: Record<string, string> = {
  "rtn": "Road to Nationals",
  "pq": "ProQuest",
  "bh": "Battle Hardened",
  "upf": "Ultimate Pit Fight",
};

/** Expand known abbreviations in event names. Idempotent (expanded forms contain
 *  no abbreviation whole-words, so re-applying is a no-op). */
export function expandEventName(name: string): string {
  const lowerFull = name.trim().toLowerCase();
  if (EVENT_ABBREVIATIONS[lowerFull]) return EVENT_ABBREVIATIONS[lowerFull];
  let result = name;
  for (const [abbr, expanded] of Object.entries(EVENT_ABBREVIATIONS)) {
    result = result.replace(new RegExp("\\b" + abbr + "\\b", "gi"), expanded);
  }
  return result;
}
