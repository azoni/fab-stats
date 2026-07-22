/**
 * League scheduled-sessions qualification test — `npx tsx scripts/league-schedule.test.ts`.
 * Mirrors the venue/date/session gate of matchQualifiesForLeague + buildSessionKeys
 * (src/lib/leagues-scoring.ts) — keep in sync if that changes. Uses an identity
 * alias expansion (no admin store merges). Legacy path = store-in-list + global
 * window; scheduled path = exact (store, date) pairings only.
 */
type Session = { storeSlug: string; date: string };

// mirror: slugifyStoreName (store-directory.ts)
const slugify = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9]/g, "");
// mirror: buildSessionKeys (identity alias expansion)
const buildSessionKeys = (sessions: Session[]) => new Set(sessions.map((s) => `${s.storeSlug}|${s.date}`));
// mirror: the venue/date/session branch of matchQualifiesForLeague
function qualifies(
  venue: string,
  date: string,
  opts: { storeSet: Set<string>; startDate: string; endDate: string; sessionKeys?: Set<string> | null },
): boolean {
  const slug = slugify(venue);
  const matchDate = (date || "").slice(0, 10);
  if (!matchDate) return false;
  if (opts.sessionKeys) return opts.sessionKeys.has(`${slug}|${matchDate}`);
  if (!opts.storeSet.has(slug)) return false;
  if (matchDate < opts.startDate) return false;
  if (matchDate > opts.endDate) return false;
  return true;
}

let fail = 0;
const check = (name: string, cond: boolean) => { console.log(`  ${cond ? "✓" : "✗"} ${name}`); if (!cond) fail++; };
const storeSet = new Set(["storea", "storeb"]);
const win = { storeSet, startDate: "2026-07-01", endDate: "2026-07-31", sessionKeys: null as Set<string> | null };

console.log("1. Legacy (no schedule): store in list AND date in window");
check("Store A on an in-window day counts", qualifies("Store A", "2026-07-05", win));
check("Store A out of window does NOT", !qualifies("Store A", "2026-08-05", win));
check("Non-league store does NOT", !qualifies("Store C", "2026-07-05", win));

console.log("\n2. Scheduled sessions: only exact (store, date) pairings count");
const keys = buildSessionKeys([{ storeSlug: "storea", date: "2026-07-05" }, { storeSlug: "storeb", date: "2026-07-12" }]);
const sch = { ...win, sessionKeys: keys };
check("Store A on its scheduled date counts", qualifies("Store A", "2026-07-05", sch));
check("Store A on a NON-scheduled in-window date does NOT", !qualifies("Store A", "2026-07-12", sch));
check("Store B on ITS scheduled date counts", qualifies("Store B", "2026-07-12", sch));
check("Store B on Store A's date does NOT", !qualifies("Store B", "2026-07-05", sch));

console.log(`\n${fail === 0 ? "ALL PASS ✓" : fail + " FAILURE(S) ✗"}\n`);
process.exit(fail === 0 ? 0 : 1);
