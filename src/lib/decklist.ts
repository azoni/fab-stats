/**
 * Decklist link handling. Players can attach a decklist URL (typically a Fabrary
 * link) to a tournament placement so it appears — clickable — on the activity feed.
 *
 * We accept Fabrary and other common Flesh and Blood decklist hosts with a friendly
 * label, and still allow any other valid URL (the caller shows a soft "unrecognized
 * host" warning) rather than blocking builders we don't know about.
 */

/** Known FaB decklist / deckbuilder hosts → the label shown on the feed link. */
const KNOWN_DECKLIST_HOSTS: Record<string, string> = {
  "fabrary.net": "Fabrary",
  "fabdb.net": "FaBDB",
  "fabdb.io": "FaBDB",
  "talishar.net": "Talishar",
};

/** Max stored URL length. Kept under the Firestore rule cap (500) so a link that
 *  validates at import can also be edited/cleared later — the rule would otherwise
 *  reject an over-long value on update while accepting it on create. */
export const MAX_DECKLIST_URL_LENGTH = 400;

export interface NormalizedDecklist {
  /** Canonical URL (https:// prepended when the input had no scheme). */
  url: string;
  /** Bare hostname, lowercased, without a leading "www.". */
  host: string;
  /** Friendly label for the link ("Fabrary", "FaBDB", … or "Decklist"). */
  label: string;
  /** True when the host is a recognized FaB decklist site. */
  known: boolean;
}

/**
 * Parse + normalize a user-entered decklist URL. Returns null when the input is
 * blank or not a plausible web URL (so the caller can show a validation error).
 * A missing scheme is treated as https. Unknown-but-valid hosts return known=false.
 */
export function normalizeDecklistUrl(raw: string): NormalizedDecklist | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  // Reject schemeless single words ("deck", "localhost") — a real host has a dot.
  if (!host.includes(".")) return null;
  // Reject over-long links so create + edit agree (see MAX_DECKLIST_URL_LENGTH).
  if (u.toString().length > MAX_DECKLIST_URL_LENGTH) return null;

  const knownLabel =
    KNOWN_DECKLIST_HOSTS[host] ??
    Object.entries(KNOWN_DECKLIST_HOSTS).find(([h]) => host.endsWith(`.${h}`))?.[1];

  return { url: u.toString(), host, label: knownLabel ?? "Decklist", known: !!knownLabel };
}

/** Short label for an already-stored decklist URL (e.g. a "View on Fabrary" link). */
export function decklistLabel(url: string): string {
  return normalizeDecklistUrl(url)?.label ?? "Decklist";
}
