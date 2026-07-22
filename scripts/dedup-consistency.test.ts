/**
 * Dedup / import consistency test — run: `npx tsx scripts/dedup-consistency.test.ts`
 *
 * Guards the invariant that makes Smart Sync safe for existing users: the SAME
 * underlying GEM match, imported by ANY method (CSV vs extension payload), must
 * produce the SAME dedup fingerprint — otherwise a first-time full pull re-imports
 * everything as "new". Also checks date-parse agreement, new/dup counting, and
 * that distinct matches never collapse (no false dedup).
 *
 * Exercises the REAL parsers (parseGemCsv, parseExtensionJson, parseDate) and the
 * REAL event-name expansion (expandEventName). The fingerprint
 * (normalizeNotes/matchFingerprint) is mirrored from src/lib/firestore-storage.ts
 * — keep it in sync if that changes.
 *
 * KNOWN CAVEAT (section 5, informational): playoff rounds imported via CSV are
 * labeled "Round <n>" while the extension classifies them to "P1/P2/P3", so a
 * CSV-imported top-cut match can still dedup-miss against an extension re-pull.
 * Narrow (CSV importers who made top cut) and pre-existing; not fixed here.
 */
import { parseGemCsv } from "@/lib/gem-import";
import { parseExtensionJson, parseDate } from "@/lib/gem-paste-import";
import { expandEventName } from "@/lib/event-name";
import type { MatchRecord } from "@/types";

type Draft = Omit<MatchRecord, "id" | "createdAt">;

// ── Mirror of src/lib/firestore-storage.ts normalizeNotes/matchFingerprint ──
// (includes the expandEventName fix so raw "PQ" and expanded "ProQuest" collapse)
function normalizeRoundLabel(roundRaw: string): string {
  const round = roundRaw.trim();
  const core = round.replace(/^Round\s+/i, "");
  if (/^P(\d+)$/i.test(core)) return `P${core.match(/(\d+)/)![1]}`;
  if (/^Playoff$/i.test(core)) return "P1";
  if (/^Top\s*8$/i.test(core)) return "P1";
  if (/^(Quarter|Top\s*4)$/i.test(core)) return "P2";
  if (/^Semi/i.test(core)) return "P2";
  if (/^Finals?$/i.test(core)) return "P3";
  return round;
}
function normalizeNotes(notes: string): string {
  const parts = notes.split(" | ");
  return `${expandEventName(parts[0]?.trim() || "")}|${normalizeRoundLabel(parts[1]?.trim() || "")}`;
}
function fingerprint(m: Draft): string {
  const n = m.notes ? normalizeNotes(m.notes) : "";
  return `${m.date}|${(m.opponentName || "").toLowerCase()}|${n}|${m.result}`;
}
function gemDedupKey(m: Draft): string | null {
  if (!m.gemEventId) return null;
  const round = normalizeRoundLabel((m.notes || "").split(" | ")[1]?.trim() || "");
  return `${m.gemEventId}|${round}|${(m.opponentName || "").toLowerCase()}|${m.result}`;
}
// Extension content.js parseDate (replicated) — must agree with the app parsers.
function extensionParseDate(text: string): string {
  const cleaned = text.replace(/,?\s*\d{1,2}:\d{2}\s*(AM|PM)?\s*$/i, "").trim();
  const normalized = cleaned.replace(/(\w{3})\.\s/, "$1 ");
  const d = new Date(normalized + " UTC");
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}
// Mirror of importMatchesFirestore's dedup split (notes fingerprint OR gemEventId key).
function dedupSplit(existing: Draft[], incoming: Draft[]) {
  const seen = new Set(existing.map(fingerprint));
  const gemSeen = new Set(existing.map(gemDedupKey).filter((k): k is string => !!k));
  let imported = 0, skipped = 0;
  for (const m of incoming) {
    const gk = gemDedupKey(m);
    if (seen.has(fingerprint(m)) || (gk && gemSeen.has(gk))) skipped++;
    else { seen.add(fingerprint(m)); if (gk) gemSeen.add(gk); imported++; }
  }
  return { imported, skipped };
}

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ✓ ${name}`);
  else { console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`); failures++; }
}

// Realistic Swiss matches across two events, one with an abbreviated name ("PQ")
// and one with another ("RtN") — expressed identically for CSV and extension.
const RAW = [
  { event: "Friday Night Armory", rawDate: "Jul. 15, 2026", date: "2026-07-15", opp: "Jane Doe", gid: "12345", round: 1, result: "Win", rating: "+10" },
  { event: "Friday Night Armory", rawDate: "Jul. 15, 2026", date: "2026-07-15", opp: "John Smith", gid: "67890", round: 2, result: "Loss", rating: "-8" },
  { event: "PQ Downtown", rawDate: "Aug. 2, 2026", date: "2026-08-02", opp: "Alex Ng", gid: "11111", round: 3, result: "Win", rating: "+12" },
  { event: "RtN Qualifier", rawDate: "Aug. 9, 2026", date: "2026-08-09", opp: "Sam Lee", gid: "22222", round: 4, result: "Draw", rating: "+1" },
];
const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
function buildCsv(rows: typeof RAW): string {
  const header = ["Event Name", "Event Date", "Opponent", "Result", "Round", "Rating Change"].map(q).join(",");
  const lines = rows.map((r) => [r.event, r.rawDate, `${r.opp} (${r.gid})`, r.result, String(r.round), r.rating].map(q).join(","));
  return [header, ...lines].join("\n");
}
function buildExtensionJson(rows: typeof RAW): string {
  return JSON.stringify({
    fabStatsVersion: 2, userGemId: "99999",
    matches: rows.map((r) => ({
      event: r.event, date: r.date, venue: "Card Shop", eventType: "Armory", format: "Classic Constructed",
      hero: "Unknown", round: r.round, roundLabel: "", opponent: r.opp, opponentGemId: r.gid,
      result: r.result.toLowerCase(), gemEventId: `ev-${r.event}-${r.date}`, extensionVersion: "2.3.0",
    })),
  });
}

const csv = parseGemCsv(buildCsv(RAW)).matches;
const ext = parseExtensionJson(buildExtensionJson(RAW)).events.flatMap((e) => e.matches);
console.log(`\nParsed: ${csv.length} CSV, ${ext.length} extension matches\n`);
check("both parsers yielded all matches", csv.length === RAW.length && ext.length === RAW.length, `csv=${csv.length} ext=${ext.length}`);

console.log("\n1. parseDate agreement (extension replica vs app parser)");
for (const raw of ["Jul. 15, 2026", "July 15, 2026, 11:00 AM", "Aug. 2, 2026", "December 31, 2025"]) {
  const e = extensionParseDate(raw), a = parseDate(raw);
  check(`"${raw}" -> ${e}`, e === a && /^\d{4}-\d{2}-\d{2}$/.test(e), `ext=${e} app=${a}`);
}

console.log("\n2. Cross-method fingerprint match (CSV == extension) — incl. abbreviated names");
for (let i = 0; i < RAW.length; i++) {
  check(`match ${i} "${RAW[i].event}"`, fingerprint(csv[i]) === fingerprint(ext[i]),
    `\n      csv=${fingerprint(csv[i])}\n      ext=${fingerprint(ext[i])}`);
}

console.log("\n3. First-time Smart full pull — dedup counts");
const full = dedupSplit(csv, ext); // existing imported via CSV; incoming = full extension re-pull
check("fully-synced re-pull imports 0", full.imported === 0, `imported=${full.imported}`);
check(`skips all ${RAW.length}`, full.skipped === RAW.length, `skipped=${full.skipped}`);
const partial = dedupSplit(csv.slice(0, 2), ext);
check("2 already-present skipped, 2 new imported", partial.skipped === 2 && partial.imported === 2, `skipped=${partial.skipped} imported=${partial.imported}`);

console.log("\n4. No false dedup — distinct matches keep distinct fingerprints");
check("4 distinct matches -> 4 fingerprints", new Set(ext.map(fingerprint)).size === 4, `got ${new Set(ext.map(fingerprint)).size}`);

console.log("\n5. Playoff round: CSV \"Round Top 8\" == extension \"Top 8\" (both -> P1)");
{
  const csvP = parseGemCsv([["Event Name", "Event Date", "Opponent", "Result", "Round"].map(q).join(","),
    ["Season Finale", "Sep. 1, 2026", "Kai P (33333)", "Win", "Top 8"].map(q).join(",")].join("\n")).matches[0];
  const extP = parseExtensionJson(JSON.stringify({ fabStatsVersion: 2, matches: [
    { event: "Season Finale", date: "2026-09-01", opponent: "Kai P", opponentGemId: "33333", round: 0, roundLabel: "Top 8", result: "win", eventType: "Armory", format: "Classic Constructed" }] })).events[0].matches[0];
  check("playoff top-cut match dedups cross-method", !!csvP && !!extP && fingerprint(csvP) === fingerprint(extP),
    `\n      csv=${csvP && fingerprint(csvP)}\n      ext=${extP && fingerprint(extP)}`);
}

console.log("\n6. gemEventId dedup: same event re-pulled with a DRIFTED date + name still dedups");
{
  // Real scenario: US Nationals stored in June as "US National Championship" @ 2026-06-12,
  // re-pulled later as "US National Championship 2026" @ a different day (multi-day event).
  const stored = parseExtensionJson(JSON.stringify({ fabStatsVersion: 2, matches: [
    { event: "US National Championship", date: "2026-06-12", opponent: "Schoenberg, Edward", opponentGemId: "99589223", round: 1, roundLabel: "", result: "win", gemEventId: "439750", eventType: "Nationals", format: "Classic Constructed" }] })).events[0].matches;
  const repull = parseExtensionJson(JSON.stringify({ fabStatsVersion: 2, matches: [
    { event: "US National Championship 2026", date: "2026-06-13", opponent: "Schoenberg, Edward", opponentGemId: "99589223", round: 1, roundLabel: "", result: "win", gemEventId: "439750", eventType: "Nationals", format: "Classic Constructed" }] })).events[0].matches;
  check("notes/date fingerprint differs (drifted)", fingerprint(stored[0]) !== fingerprint(repull[0]));
  const { imported, skipped } = dedupSplit(stored, repull);
  check("re-pull dedups via gemEventId (0 imported, 1 skipped)", imported === 0 && skipped === 1, `imported=${imported} skipped=${skipped}`);
}

console.log(`\n${failures === 0 ? "ALL PASS ✓" : failures + " FAILURE(S) ✗"}\n`);
process.exit(failures === 0 ? 0 : 1);
