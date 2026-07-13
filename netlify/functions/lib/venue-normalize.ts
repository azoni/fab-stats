/**
 * Venue name normalization + junk detection (SERVER copy).
 *
 * MIRROR of src/lib/venue-normalize.ts — the Netlify function build can't import
 * from src/, so this duplicates the rules (same pattern as slugifyStoreName).
 * Keep the two in sync. See src/lib/venue-normalize.ts for the full rationale.
 *
 * Used by the auto-scrape import pipeline (stop new junk entering matches) and
 * the store-aggregator (keep junk out of the precomputed directory).
 */

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

const STORE_TOKEN =
  /\b(game|games|gaming|store|shop|shoppe|cards?|hobby|hobbies|tcg|ccg|comics?|collectib\w*|geek|dragons?|guild|castle|tavern|taverna|arena|battle|club|lounge|emporium|outpost|nexus|vault|realm|kingdom|toys?|play|meeple|dice|board|tabletop|nerd|wizard|goblin|troll|forge|anvil|sanctuary|cave|den|hub|central|house|world|land|zone|caf[eé]|coffee|books?|manga|anime|otaku|dungeon|labyrinth|portal|gate|keep|bazaar|market|mart|depot|academy|league|society|association|centre|center)\b/i;

const LEGAL_SUFFIX =
  /(\bl\.?l\.?c\.?|\binc\.?|\bltd\.?|\bllp\.?|\bgmbh|\bs\.?r\.?l\.?|\bs\.?a\.?s\.?|\bs\.?n\.?c\.?|\bpty\.?|\bcorp\.?|\bkft|\boy|\bd\.?o\.?o\.?|&\s*c\.?)\s*$/i;

const BLURB =
  /\b(entry fee|table fee|store credit|booster packs?|will receive|players? (will|receive|must|can|should)|construct a deck|deck of exactly|deck ?list|card legality|legal as defined|prize support|participation prize|promo(tional)? cards?|proxies|pre-?registration|please register|sign ?up (at|via|online|here)|register (at|via|online|through|here)|refreshments|livestream|per person|per player|prizes? (are|will|be|awarded)|100% of|round the pool|1st place|first place|top \d+ (will|receive|get)|doors open|check.?in)\b/i;

const URL_RE = /https?:\/\/|www\.\S/i;

const DATE_RES: RegExp[] = [
  new RegExp(`^\\d{1,2}\\s+(${MONTHS})`, "i"),
  new RegExp(`^(${MONTHS})\\w*\\s+\\d{1,2}(st|nd|rd|th)?$`, "i"),
  /^\d{4}-\d{2}-\d{2}/,
  /^\d{1,2}[/.]\d{1,2}([/.]\d{2,4})?$/,
];

const CURRENCY = /[¥€£]\s?\d|(^|\s)\$\s?\d/;

/** Clean a raw venue string, or return "" when it isn't a real venue. */
export function normalizeVenueName(raw: string | null | undefined): string {
  const name = (raw || "").trim().replace(/\s+/g, " ");
  if (!name) return "";
  const stripped = name.replace(/\s*\(\d{6,}\)\s*$/, "").trim();
  const hadId = stripped !== name;
  if (stripped.length <= 2) return "";
  if (URL_RE.test(stripped)) return "";
  if (DATE_RES.some((re) => re.test(stripped))) return "";
  const legal = LEGAL_SUFFIX.test(stripped);
  const storey = legal || STORE_TOKEN.test(stripped);
  if (!storey && CURRENCY.test(stripped)) return "";
  if (!legal && BLURB.test(stripped)) return "";
  if (hadId && !storey && /^[^\d]+$/.test(stripped) && stripped.split(/\s+/).length <= 4) return "";
  return stripped;
}

/** Cleaned venue name for writing, or undefined when it should be dropped. */
export function sanitizeVenueForWrite(raw: string | null | undefined): string | undefined {
  return normalizeVenueName(raw) || undefined;
}
