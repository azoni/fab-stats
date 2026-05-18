/**
 * Weekly internal-link / crawl audit.
 *
 * Crawls the live site, rebuilds the :Page link graph in Neo4j, derives an
 * audit (broken links, orphan pages, sitemap coverage gaps, link equity),
 * and stores a report in Firestore `seoAudits/{date}` for the SEO dashboard.
 *
 * Required env: NEO4J_*, FIREBASE_SERVICE_ACCOUNT
 */
import type { Config } from "@netlify/functions";
import { getAdminDb } from "./firebase-admin.ts";
import { closeDriver } from "../../src/lib/kg/neo4j-client.ts";
import {
  crawlSite,
  persistLinkGraph,
  computeAudit,
} from "../../src/lib/seo/link-graph.ts";

const BASE_URL = "https://www.fabstats.net";

const handler = async (): Promise<Response> => {
  const started = Date.now();
  try {
    const { pages, sitemap, sitemapHosts } = await crawlSite({
      baseUrl: BASE_URL,
      maxPages: 80,
    });
    await persistLinkGraph(pages);
    const audit = await computeAudit(BASE_URL, pages, sitemap, sitemapHosts);

    const db = getAdminDb();
    const day = new Date().toISOString().slice(0, 10);
    await db.collection("seoAudits").doc(day).set({
      ...audit,
      durationMs: Date.now() - started,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        pagesCrawled: audit.pagesCrawled,
        broken: audit.brokenLinks.length,
        orphans: audit.orphanPages.length,
        missingFromSitemap: audit.missingFromSitemap.length,
        sitemapHostMismatch: audit.sitemapHostMismatch,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[link-audit] failed:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await closeDriver();
  }
};

export default handler;

// Sundays 05:00 UTC. Deploy as a background function (crawl can exceed the
// synchronous timeout).
export const config: Config = {
  schedule: "0 5 * * 0",
};
