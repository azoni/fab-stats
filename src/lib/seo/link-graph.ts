/**
 * Internal-link crawler + link graph.
 *
 * Crawls the live site (seeded from sitemap.xml), builds a same-origin link
 * graph as `:Page`-[:LINKS_TO]->`:Page` in Neo4j (dogfooding the graph DB for
 * an SEO problem), and derives an audit: broken links, orphan pages, and
 * link-equity (inbound-link count) per page.
 *
 * Node-side only. Uses cheerio (already a dependency) — no headless browser.
 */
import * as cheerio from "cheerio";
import { runCypher } from "../kg/neo4j-client";

export interface CrawlOptions {
  baseUrl: string; // e.g. https://www.fabstats.net
  maxPages?: number;
  /** Extra seed paths beyond sitemap.xml (e.g. "/scout"). */
  seedPaths?: string[];
}

export interface PageNode {
  url: string;
  path: string;
  status: number;
  title: string;
  inSitemap: boolean;
  outLinks: string[]; // same-origin, normalized
}

export interface BrokenLink {
  from: string;
  to: string;
  status: number;
}

export interface LinkAudit {
  baseUrl: string;
  crawledAt: string;
  pagesCrawled: number;
  brokenLinks: BrokenLink[];
  /** In sitemap but reachable by zero internal links. */
  orphanPages: string[];
  /** Linked internally but absent from sitemap.xml (coverage gap). */
  missingFromSitemap: string[];
  /** Top pages by inbound internal links. */
  linkEquity: { path: string; inbound: number }[];
  /**
   * Set when sitemap.xml lists URLs on a host that 301-redirects to the
   * canonical host (e.g. bare domain when the site canonicalizes to www).
   * Google wants sitemap URLs to be the final canonical, non-redirecting form.
   */
  sitemapHostMismatch: { sitemapHosts: string[]; canonicalHost: string } | null;
}

const ASSET_RE = /\.(png|jpe?g|gif|webp|svg|css|js|ico|xml|txt|pdf|woff2?|ttf|map)(\?|$)/i;
const UA =
  "Mozilla/5.0 (compatible; FabStatsSEOBot/1.0; +https://www.fabstats.net)";

/** Host without a leading "www." — so bare and www are treated as one site. */
function canonicalHost(h: string): string {
  return h.replace(/^www\./, "");
}

function normalize(base: URL, href: string): string | null {
  try {
    const u = new URL(href, base);
    // Same site if the host matches ignoring a leading www. (the bare domain
    // 301-redirects to www on this site — we still want to follow those links).
    if (canonicalHost(u.host) !== canonicalHost(base.host)) return null;
    if (ASSET_RE.test(u.pathname)) return null;
    let p = u.pathname.replace(/\/+$/, "");
    if (p === "") p = "/";
    // Collapse to the canonical base origin so www/bare don't double-count.
    return base.origin + p;
  } catch {
    return null;
  }
}

async function fetchPage(
  url: string,
): Promise<{ status: number; html: string; contentType: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    const contentType = res.headers.get("content-type") ?? "";
    const html = contentType.includes("text/html") ? await res.text() : "";
    return { status: res.status, html, contentType };
  } catch {
    return { status: 0, html: "", contentType: "" }; // network failure
  }
}

async function readSitemap(
  base: URL,
): Promise<{ urls: string[]; rawHosts: string[] }> {
  // sitemap.xml is served as application/xml — read the body unconditionally
  // (fetchPage only returns a body for text/html).
  let xml = "";
  try {
    const res = await fetch(base.origin + "/sitemap.xml", {
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    if (res.ok) xml = await res.text();
  } catch {
    /* sitemap unreachable — treated as empty */
  }
  if (!xml) return { urls: [], rawHosts: [] };
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const rawHosts = new Set<string>();
  for (const l of locs) {
    try {
      rawHosts.add(new URL(l).host);
    } catch {
      /* skip malformed loc */
    }
  }
  const urls = locs
    .map((l) => normalize(base, l))
    .filter((x): x is string => Boolean(x));
  return { urls, rawHosts: [...rawHosts] };
}

/** BFS crawl, same-origin, bounded by maxPages. */
export async function crawlSite(opts: CrawlOptions): Promise<{
  pages: Map<string, PageNode>;
  sitemap: Set<string>;
  sitemapHosts: string[];
}> {
  const base = new URL(opts.baseUrl);
  const maxPages = opts.maxPages ?? 60;

  const { urls: sitemapUrls, rawHosts: sitemapHosts } = await readSitemap(base);
  const sitemap = new Set(sitemapUrls);

  const seeds = [
    base.origin + "/",
    ...sitemapUrls,
    ...(opts.seedPaths ?? []).map((p) => normalize(base, p)).filter((x): x is string => !!x),
  ];

  const queue: string[] = [...new Set(seeds)];
  const pages = new Map<string, PageNode>();

  while (queue.length && pages.size < maxPages) {
    const url = queue.shift()!;
    if (pages.has(url)) continue;

    const { status, html } = await fetchPage(url);
    const $ = html ? cheerio.load(html) : null;
    const title = $ ? $("title").first().text().trim().slice(0, 200) : "";

    const outLinks: string[] = [];
    if ($) {
      $("a[href]").each((_, el) => {
        const norm = normalize(base, $(el).attr("href") ?? "");
        if (norm && norm !== url) outLinks.push(norm);
      });
    }
    const uniqueOut = [...new Set(outLinks)];

    pages.set(url, {
      url,
      path: new URL(url).pathname,
      status,
      title,
      inSitemap: sitemap.has(url),
      outLinks: uniqueOut,
    });

    for (const link of uniqueOut) {
      if (!pages.has(link) && !queue.includes(link)) queue.push(link);
    }
  }

  return { pages, sitemap, sitemapHosts };
}

/** Rebuild the :Page / :LINKS_TO subgraph in Neo4j (UNWIND-batched). */
export async function persistLinkGraph(
  pages: Map<string, PageNode>,
): Promise<void> {
  await runCypher(`MATCH (p:Page) DETACH DELETE p`);

  const pageRows = [...pages.values()].map((p) => ({
    url: p.url,
    path: p.path,
    status: p.status,
    title: p.title,
    inSitemap: p.inSitemap,
  }));
  await runCypher(
    `UNWIND $rows AS r
     MERGE (p:Page {url: r.url})
     SET p.path = r.path, p.status = r.status, p.title = r.title,
         p.inSitemap = r.inSitemap`,
    { rows: pageRows },
  );

  const edgeRows: { from: string; to: string }[] = [];
  for (const p of pages.values()) {
    for (const to of p.outLinks) edgeRows.push({ from: p.url, to });
  }
  await runCypher(
    `UNWIND $rows AS r
     MATCH (a:Page {url: r.from})
     MERGE (b:Page {url: r.to})
     MERGE (a)-[:LINKS_TO]->(b)`,
    { rows: edgeRows },
  );
}

/** Derive the audit (uses the graph for orphan/equity computation). */
export async function computeAudit(
  baseUrl: string,
  pages: Map<string, PageNode>,
  sitemap: Set<string>,
  sitemapHosts: string[] = [],
): Promise<LinkAudit> {
  const brokenLinks: BrokenLink[] = [];
  for (const p of pages.values()) {
    for (const to of p.outLinks) {
      const target = pages.get(to);
      if (target && (target.status >= 400 || target.status === 0)) {
        brokenLinks.push({ from: p.path, to: target.path, status: target.status });
      }
    }
  }

  // Orphans: in sitemap but zero inbound LINKS_TO (graph query).
  const orphanRows = await runCypher<{ url: string }>(
    `MATCH (p:Page {inSitemap: true})
     WHERE NOT ( ()-[:LINKS_TO]->(p) )
     RETURN p.url AS url`,
  );
  const orphanPages = orphanRows.map((r) => new URL(r.url).pathname);

  // Coverage gap: linked internally (200) but not in sitemap.
  const missingFromSitemap = [...pages.values()]
    .filter((p) => p.status === 200 && !p.inSitemap)
    .map((p) => p.path);

  const equityRows = await runCypher<{ path: string; inbound: number }>(
    `MATCH (p:Page)
     OPTIONAL MATCH ( )-[r:LINKS_TO]->(p)
     RETURN p.path AS path, count(r) AS inbound
     ORDER BY inbound DESC LIMIT 15`,
  );
  const linkEquity = equityRows.map((r) => ({
    path: r.path,
    inbound: Number(r.inbound),
  }));

  // Sitemap canonical-host check: any sitemap host that isn't exactly the
  // canonical base host is serving 301-redirecting URLs to Google.
  const canonical = new URL(baseUrl).host;
  const offending = sitemapHosts.filter((h) => h !== canonical);
  const sitemapHostMismatch =
    offending.length > 0
      ? { sitemapHosts: offending, canonicalHost: canonical }
      : null;

  return {
    baseUrl,
    crawledAt: new Date().toISOString(),
    pagesCrawled: pages.size,
    brokenLinks,
    orphanPages,
    missingFromSitemap,
    linkEquity,
    sitemapHostMismatch,
  };
}
