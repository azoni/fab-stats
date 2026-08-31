/**
 * Opponent-hero lookup against scraped official coverage, server-side.
 *
 * The import page enriches matches that are missing opponentHero by matching
 * (opponentName, date, event) against the coverage-matches collection. That
 * collection is admin-read-only in rules (and a full client scan would be
 * quota-heavy anyway), so this endpoint does the lookup with the admin SDK
 * and an in-memory index cache. Coverage data is public information from
 * fabtcg.com event coverage, so the endpoint is unauthenticated.
 *
 *   POST { pairs: [{ opponentName, date, notes }] }  (max 1000)
 *   →    { results: [{ i, hero, confidence }] }      (hits only, i = pair index)
 */
import { getAdminDb } from "./firebase-admin.ts";
import {
  buildCoverageIndex,
  findOpponentHero,
  type CoverageIndex,
} from "../../src/lib/coverage-lookup.ts";
import type { CoverageMatch } from "../../src/lib/sitemap-scraper.ts";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

let cachedIndex: { index: CoverageIndex; size: number; ts: number } | null = null;
const INDEX_TTL = 10 * 60_000;

async function getIndex(): Promise<{ index: CoverageIndex; size: number }> {
  if (cachedIndex && Date.now() - cachedIndex.ts < INDEX_TTL) return cachedIndex;
  const db = getAdminDb();
  const snap = await db.collection("coverage-matches").get();
  const matches = snap.docs.map((d) => d.data() as CoverageMatch);
  const index = buildCoverageIndex(matches);
  cachedIndex = { index, size: matches.length, ts: Date.now() };
  return cachedIndex;
}

interface Pair {
  opponentName?: string;
  date?: string;
  notes?: string;
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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
