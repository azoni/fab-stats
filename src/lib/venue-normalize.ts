/**
 * Venue name normalization + junk detection.
 *
 * GEM match imports frequently capture the wrong text as a match "venue" — a
 * tournament organizer's player name + GEM id (`Alexander Mueller (92356863)`),
 * a date (`30 Mar`), a URL, or a leaked event-description blurb (`Players will
 * receive 8 Booster Packs...`, `100% of entry fee given as store credit`).
 * Every distinct junk string with >=2 matches used to surface as a fake "store"
 * on /stores, in the league store picker, and in the Discover counts.
 *
 * `normalizeVenueName` is the single source of truth for turning a raw venue
 * string into a clean display name — or an empty string when it's not a real
 * venue at all. It is intentionally CONSERVATIVE: it only drops on strong junk
 * signals and defaults to keeping anything ambiguous, so real (even oddly-named
 * or non-English) stores are never removed.
 *
 * Applied at four layers:
 *   1. import write  (firestore-storage.ts)  — stop new junk entering matches
 *   2. leaderboard build (leaderboard.ts)    — keep junk out of venueBreakdown
 *   3. directory build (store-directory.ts)  — hide existing junk client-side
 *   4. aggregator (store-aggregator.mts)     — MIRROR of this logic, server-side
 *
 * When editing the rules here, mirror them into `store-aggregator.mts`
 * (`normalizeForDisplay`) — it runs in the Netlify function build and cannot
 * import from src/.
 */

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

/** Words that positively identify a real store/venue — used to RESCUE names that
 *  would otherwise be dropped (e.g. a real store with its GEM id appended, or a
 *  name that brushes a blurb keyword). */
const STORE_TOKEN =
  /\b(game|games|gaming|store|shop|shoppe|cards?|hobby|hobbies|tcg|ccg|comics?|collectib\w*|geek|dragons?|guild|castle|tavern|taverna|arena|battle|club|lounge|emporium|outpost|nexus|vault|realm|kingdom|toys?|play|meeple|dice|board|tabletop|nerd|wizard|goblin|troll|forge|anvil|sanctuary|cave|den|hub|central|house|world|land|zone|caf[eé]|coffee|books?|manga|anime|otaku|dungeon|labyrinth|portal|gate|keep|bazaar|market|mart|depot|academy|league|society|association|centre|center)\b/i;

/** Legal-entity suffixes at the end of a name mark a real business — never junk. */
const LEGAL_SUFFIX =
  /(\bl\.?l\.?c\.?|\binc\.?|\bltd\.?|\bllp\.?|\bgmbh|\bs\.?r\.?l\.?|\bs\.?a\.?s\.?|\bs\.?n\.?c\.?|\bpty\.?|\bcorp\.?|\bkft|\boy|\bd\.?o\.?o\.?|&\s*c\.?)\s*$/i;

/** High-precision vocabulary that only appears in leaked GEM event descriptions,
 *  prize/entry blurbs, and rules text — not in real store names. */
const BLURB =
  /\b(entry fee|table fee|store credit|booster packs?|will receive|players? (will|receive|must|can|should)|construct a deck|deck of exactly|deck ?list|card legality|legal as defined|prize support|participation prize|promo(tional)? cards?|proxies|pre-?registration|please register|sign ?up (at|via|online|here)|register (at|via|online|through|here)|refreshments|livestream|per person|per player|prizes? (are|will|be|awarded)|100% of|round the pool|top \d+ (will|receive|get)|doors open|check.?in)\b/i;

const URL_RE = /https?:\/\/|www\.\S/i;

const DATE_RES: RegExp[] = [
  new RegExp(`^\\d{1,2}\\s+(${MONTHS})`, "i"), // "30 Mar"
  new RegExp(`^(${MONTHS})\\w*\\s+\\d{1,2}(st|nd|rd|th)?$`, "i"), // "Mar 30", "March 30th"
  /^\d{4}-\d{2}-\d{2}/, // "2024-03-30"
  /^\d{1,2}[/.]\d{1,2}([/.]\d{2,4})?$/, // "3/30", "30.03.2024"
];

const CURRENCY = /[¥€£]\s?\d|(^|\s)\$\s?\d/;

/**
 * Normalize a raw venue string to a clean display name, or `""` if it is not a
 * real venue (junk that should be dropped). Also strips a trailing GEM id
 * (`Istmo Games (15281657)` -> `Istmo Games`) so id-suffixed real stores merge
 * with their clean slug.
 */
export function normalizeVenueName(raw: string | null | undefined): string {
  const name = (raw || "").trim().replace(/\s+/g, " ");
  if (!name) return "";

  // Strip a trailing GEM id — "Store Name (12345678)" or a mis-parsed player.
  const stripped = name.replace(/\s*\(\d{6,}\)\s*$/, "").trim();
  const hadId = stripped !== name;

  if (stripped.length <= 2) return ""; // "AE", stray initials
  if (URL_RE.test(stripped)) return ""; // a URL is never a store name
  if (DATE_RES.some((re) => re.test(stripped))) return ""; // bare date

  const legal = LEGAL_SUFFIX.test(stripped);
  const storey = legal || STORE_TOKEN.test(stripped);

  // Fee/currency text with no store-y word — "$10 entry", "¥2000".
  if (!storey && CURRENCY.test(stripped)) return "";
  // Leaked event/prize/rules blurb (legal-entity names are protected).
  if (!legal && BLURB.test(stripped)) return "";
  // Id-suffixed, no store word, 2-4 word person-name shape -> mis-parsed player.
  // (A single word with an id is far more likely a real store than a person.)
  if (hadId && !storey && /^[^\d]+$/.test(stripped)) {
    const nameWords = stripped.split(/\s+/).length;
    if (nameWords >= 2 && nameWords <= 4) return "";
  }

  return stripped;
}

/** True when a raw venue string is junk (not a real venue). */
export function isJunkVenue(raw: string | null | undefined): boolean {
  return !!(raw && raw.trim()) && normalizeVenueName(raw) === "";
}

/**
 * Clean a venue for writing to a match doc: returns the normalized name, or
 * `undefined` when it should not be stored at all (junk). The match itself is
 * still kept — only the junk venue is dropped.
 */
export function sanitizeVenueForWrite(raw: string | null | undefined): string | undefined {
  return normalizeVenueName(raw) || undefined;
}
