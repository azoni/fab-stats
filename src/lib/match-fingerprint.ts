/**
 * Compute a deterministic fingerprint for a match that will be the same
 * regardless of which side imported it. Used for shared comment threads.
 *
 * Components: date + sorted(heroes) + eventName + round
 * Both players in a match share the same date, heroes (reversed), event, and round.
 */
export function computeMatchFingerprint(match: {
  date: string;
  heroPlayed: string;
  opponentHero: string;
  notes?: string;
}): string {
  const heroes = [
    (match.heroPlayed || "unknown").toLowerCase().trim(),
    (match.opponentHero || "unknown").toLowerCase().trim(),
  ]
    .sort()
    .join("|");

  // Extract event name and round from notes ("EventName | Round 1")
  const parts = (match.notes || "").split("|").map((s) => s.trim().toLowerCase());
  const eventName = parts[0] || "";
  const round = parts[1] || "";

  const raw = `v1|${match.date}|${heroes}|${eventName}|${round}`;

  // Two independent 32-bit hashes for ~64-bit collision resistance
  let a = 0x811c9dc5 | 0;
  let b = 0x050c5d1f | 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995);
  }

  return (
    (a >>> 0).toString(16).padStart(8, "0") +
    (b >>> 0).toString(16).padStart(8, "0")
  );
}
