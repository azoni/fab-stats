/**
 * Opponent-hero lookup against scraped official coverage, server-side.
 *
 * The import page enriches matches that are missing opponentHero by matching
 * (opponentName, date, event) against the coverage-matches collection. That
 * collection is admin-read-only in rules (and a full client scan would be
 * quota-heavy anyway), so this endpoint does the lookup with the admin SDK
 * and an in-memory index cache. Coverage data is public information, but the
 * cold-cache path is a full-collection read — requiring a signed-in Firebase
 * token keeps anonymous callers from farming scans, and concurrent cold
 * requests coalesce onto one scan per instance.
 *
 *   POST { pairs: [{ opponentName, date, notes }] }  (max 1000, Bearer token)
 *   →    { results: [{ i, hero, confidence }] }      (hits only, i = pair index)
 */
import { getAdminDb } from "./firebase-admin.ts";
import { verifyFirebaseToken } from "./verify-auth.ts";
import {
  buildCoverageIndex,
  findOpponentHero,
  type CoverageIndex,
} from "../../src/lib/coverage-lookup.ts";
import type { CoverageMatch } from "../../src/lib/sitemap-scraper.ts";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

let cachedIndex: { index: CoverageIndex; size: number; ts: number } | null = null;
let indexInFlight: Promise<{ index: CoverageIndex; size: number }> | null = null;
const INDEX_TTL = 10 * 60_000;

async function getIndex(): Promise<{ index: CoverageIndex; size: number }> {
  if (cachedIndex && Date.now() - cachedIndex.ts < INDEX_TTL) return cachedIndex;
  // Coalesce concurrent cold requests onto a single collection scan.
  if (indexInFlight) return indexInFlight;
  indexInFlight = (async () => {
    try {
      const db = getAdminDb();
      const snap = await db.collection("coverage-matches").get();
      const matches = snap.docs.map((d) => d.data() as CoverageMatch);
      const index = buildCoverageIndex(matches);
      cachedIndex = { index, size: matches.length, ts: Date.now() };
      return cachedIndex;
    } finally {
      indexInFlight = null;
    }
  })();
  return indexInFlight;
}

interface Pair {
  opponentName?: string;
  date?: string;
  notes?: string;
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Signed-in users only — the cold path is a full-collection read, so
  // anonymous callers must not be able to trigger scans at will.
  const auth = await verifyFirebaseToken(req);
  if (!auth) return json({ error: "Sign in required." }, 401);

  let body: { pairs?: Pair[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const pairs = Array.isArray(body.pairs) ? body.pairs.slice(0, 1000) : [];
  if (pairs.length === 0) return json({ results: [] });

  try {
    const { index, size } = await getIndex();
    if (size === 0) return json({ results: [] });

    const results: { i: number; hero: string; confidence: "exact" | "fuzzy" }[] = [];
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      if (!p || typeof p.opponentName !== "string" || typeof p.date !== "string") continue;
      const hit = findOpponentHero(
        p.opponentName.slice(0, 100),
        p.date.slice(0, 10),
        typeof p.notes === "string" ? p.notes.slice(0, 500) : "",
        index,
      );
      if (hit) results.push({ i, hero: hit.hero, confidence: hit.confidence });
    }
    return json({ results });
  } catch (err) {
    console.error("[coverage-heroes] Fatal:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}
