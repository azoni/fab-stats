/**
 * Run the internal-link audit against the live site and print the report.
 *
 *   node --env-file=.env --import tsx scripts/run-link-audit.ts
 *   node --env-file=.env --import tsx scripts/run-link-audit.ts https://www.fabstats.net 80
 *
 * Crawls + rebuilds the :Page graph in Neo4j + prints the audit. Does not
 * persist the Firestore report (the scheduled function does that).
 */
import { execSync } from "node:child_process";
import {
  crawlSite,
  persistLinkGraph,
  computeAudit,
} from "../src/lib/seo/link-graph";
import { closeDriver } from "../src/lib/kg/neo4j-client";

const rawArgs = process.argv.slice(2).filter((a) => a !== "--persist");
const baseUrl = rawArgs[0] ?? "https://www.fabstats.net";
const maxPages = Number(rawArgs[1] ?? 80);
const persist = process.argv.includes("--persist");

async function main(): Promise<void> {
  console.log(`[audit] Crawling ${baseUrl} (max ${maxPages} pages)…`);
  const t0 = Date.now();
  const { pages, sitemap, sitemapHosts } = await crawlSite({ baseUrl, maxPages });
  console.log(
    `[audit] Crawled ${pages.size} pages in ${((Date.now() - t0) / 1000).toFixed(1)}s ` +
      `(${sitemap.size} in sitemap)`,
  );

  console.log("[audit] Rebuilding :Page link graph in Neo4j…");
  await persistLinkGraph(pages);

  const audit = await computeAudit(baseUrl, pages, sitemap, sitemapHosts);

  console.log("\n" + "═".repeat(64));
  console.log(`Link audit — ${baseUrl}`);
  console.log("─".repeat(64));
  console.log(`Pages crawled:        ${audit.pagesCrawled}`);
  console.log(`Broken links:         ${audit.brokenLinks.length}`);
  console.log(`Orphan pages:         ${audit.orphanPages.length}`);
  console.log(`Missing from sitemap: ${audit.missingFromSitemap.length}`);
  if (audit.sitemapHostMismatch) {
    console.log(
      `\n⚠ SITEMAP CANONICAL ISSUE: sitemap.xml lists URLs on ` +
        `[${audit.sitemapHostMismatch.sitemapHosts.join(", ")}] but the ` +
        `canonical host is ${audit.sitemapHostMismatch.canonicalHost} — ` +
        `every sitemap URL 301-redirects. Google wants final canonical URLs.`,
    );
  }

  if (audit.brokenLinks.length) {
    console.log("\nBroken links:");
    for (const b of audit.brokenLinks.slice(0, 15))
      console.log(`  ${b.status}  ${b.from} → ${b.to}`);
  }
  if (audit.orphanPages.length) {
    console.log("\nOrphan pages (in sitemap, no internal inbound links):");
    for (const o of audit.orphanPages) console.log(`  ${o}`);
  }
  if (audit.missingFromSitemap.length) {
    console.log("\nLinked but not in sitemap (coverage gaps):");
    for (const mm of audit.missingFromSitemap.slice(0, 20)) console.log(`  ${mm}`);
  }
  console.log("\nTop pages by inbound internal links (link equity):");
  for (const e of audit.linkEquity.slice(0, 10))
    console.log(`  ${String(e.inbound).padStart(3)}  ${e.path}`);
  console.log("═".repeat(64));

  if (persist) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      const json = execSync("netlify env:get FIREBASE_SERVICE_ACCOUNT --json", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      const parsed = JSON.parse(json);
      process.env.FIREBASE_SERVICE_ACCOUNT =
        parsed.FIREBASE_SERVICE_ACCOUNT ?? Object.values(parsed)[0];
    }
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)),
      });
    }
    const fdb = getFirestore();
    fdb.settings({ ignoreUndefinedProperties: true });
    const day = new Date().toISOString().slice(0, 10);
    await fdb.collection("seoAudits").doc(day).set(audit);
    console.log(`[audit] ✓ Persisted to seoAudits/${day}`);
  }
}

main()
  .catch((e) => {
    console.error("[audit] ✗ FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
