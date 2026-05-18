/**
 * Server-side data for the ungated /lab console.
 *
 *   GET /api/lab-data?view=content   → { articles, bios }
 *   GET /api/lab-data?view=seo       → SeoHealthData shape
 *
 * /lab is intentionally unauthenticated, so client-side Firestore reads hit
 * security rules. This function uses firebase-admin (rules-bypassing) to read
 * the internal collections — the same server-side pattern as kg-stats /
 * kg-graph / jsonld.
 */
import type { Context } from "@netlify/functions";
import { getAdminDb } from "./firebase-admin.ts";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=30",
  "Access-Control-Allow-Origin": "*",
};

async function contentView() {
  const db = getAdminDb();
  const [aSnap, bSnap] = await Promise.all([
    db.collection("articles").get(),
    db.collection("playerBios").get(),
  ]);
  const articles = aSnap.docs
    .map((d) => d.data())
    .filter((a) => Array.isArray(a.tags) && a.tags.includes("auto-generated"))
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  const bios = bSnap.docs
    .map((d) => d.data())
    .sort((a, b) =>
      String(b.generatedAt ?? "").localeCompare(String(a.generatedAt ?? "")),
    );
  return { articles, bios };
}

async function latestDateDoc(col: string) {
  const db = getAdminDb();
  const snap = await db.collection(col).get();
  if (snap.empty) return null;
  const ids = snap.docs.map((d) => d.id).sort();
  const newest = snap.docs.find((d) => d.id === ids[ids.length - 1]);
  return newest ? newest.data() : null;
}

async function recentRuns(col: string, n: number) {
  const db = getAdminDb();
  try {
    const snap = await db
      .collection(col)
      .orderBy("ranAt", "desc")
      .limit(n)
      .get();
    return snap.docs.map((d) => d.data());
  } catch {
    return [];
  }
}

async function seoView() {
  const [linkAudit, webVitals, syncRuns, metaArticleRuns] = await Promise.all([
    latestDateDoc("seoAudits"),
    latestDateDoc("webVitals"),
    recentRuns("kg-sync-runs", 5),
    recentRuns("meta-article-runs", 5),
  ]);
  return { linkAudit, webVitals, syncRuns, metaArticleRuns };
}

const handler = async (req: Request, _ctx: Context): Promise<Response> => {
  void _ctx;
  const view = new URL(req.url).searchParams.get("view") ?? "content";
  try {
    const data = view === "seo" ? await seoView() : await contentView();
    return new Response(JSON.stringify(data), { status: 200, headers: HEADERS });
  } catch (err) {
    console.error("[lab-data] failed:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: HEADERS,
    });
  }
};

export default handler;
