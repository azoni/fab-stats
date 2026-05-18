/**
 * Weekly meta-article generator (scheduled).
 *
 * retrieve (Neo4j) → generate (Claude Opus 4.7) → persist as DRAFT in Firestore.
 *
 * Drafts are NOT auto-published — a human reviews via the admin console, then
 * publishes. Once published, the nightly kg-sync ingests it as an Article node
 * (heroTags → MENTIONS_HERO edges) and the /api/jsonld/article/{slug} endpoint
 * serves schema.org Article structured data with `mentions`. The graph →
 * content → SEO loop closes through existing Phase-1 infra; nothing extra here.
 *
 * NOTE: a single Opus 4.7 generation can take ~60s. Netlify caps synchronous
 * functions at ~10s, so this MUST run as a background function. The `-background`
 * naming convention or a long-timeout config is required at deploy time; the
 * weekly `schedule` below triggers it. Run locally via scripts/generate-article.ts.
 *
 * Required env: ANTHROPIC_API_KEY, NEO4J_*, FIREBASE_SERVICE_ACCOUNT
 */
import type { Config } from "@netlify/functions";
import { getAdminDb } from "./firebase-admin.ts";
import { buildMetaArticleDraft } from "../../src/lib/kg/article-pipeline.ts";
import { closeDriver } from "../../src/lib/kg/neo4j-client.ts";

const handler = async (): Promise<Response> => {
  const started = Date.now();
  try {
    const { article, insights, generation } = await buildMetaArticleDraft();

    const db = getAdminDb();
    // Deterministic id (= slug) → re-running the same ISO week overwrites that
    // week's draft instead of piling up duplicates.
    await db.collection("articles").doc(article.id).set(article);

    // Run record for the content-performance / health dashboards.
    await db.collection("meta-article-runs").add({
      ranAt: new Date().toISOString(),
      ok: true,
      slug: article.slug,
      title: article.title,
      weekLabel: insights.weekLabel,
      model: generation.model,
      usage: generation.usage,
      spotlightHero: insights.spotlightHero,
      durationMs: Date.now() - started,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        slug: article.slug,
        status: article.status,
        title: article.title,
        usage: generation.usage,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-meta-article] failed:", err);
    try {
      await getAdminDb().collection("meta-article-runs").add({
        ranAt: new Date().toISOString(),
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
      });
    } catch {
      /* swallow logging failure */
    }
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  } finally {
    await closeDriver();
  }
};

export default handler;

// Mondays 09:00 UTC — fresh meta read for the week. Deploy as a background
// function (generation exceeds the synchronous timeout).
export const config: Config = {
  schedule: "0 9 * * 1",
};
