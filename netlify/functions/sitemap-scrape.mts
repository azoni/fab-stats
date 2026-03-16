// Netlify serverless function — CORS proxy for scraping fabtcg.com sitemap data.
// Admin-only. Fetches sitemap XML or individual decklist pages from fabtcg.com,
// parses the HTML, and returns structured data.

import { verifyFirebaseToken } from "./verify-auth.ts";
import { getAdminDb } from "./firebase-admin.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SITEMAP_URLS = [
  "https://fabtcg.com/decklist-sitemap.xml",
  "https://fabtcg.com/decklist-sitemap2.xml",
  "https://fabtcg.com/decklist-sitemap3.xml",
  "https://fabtcg.com/decklist-sitemap4.xml",
];

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Admin Check ──

async function checkIsAdmin(email: string | null): Promise<boolean> {
  if (!email) return false;
  const db = getAdminDb();
  const snap = await db.doc("admin/config").get();
  const data = snap.data();
  if (!data?.adminEmails?.length) return false;
  return data.adminEmails.includes(email);
}

// ── Sitemap Fetching ──

async function fetchSitemapUrls(): Promise<string[]> {
  const allUrls: string[] = [];

  for (const sitemapUrl of SITEMAP_URLS) {
    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });

    if (!res.ok) {
      console.error(`Failed to fetch ${sitemapUrl}: ${res.status}`);
      continue;
    }

    const xml = await res.text();
    // Extract <loc> URLs from sitemap XML
    const locRegex = /<loc>(https:\/\/fabtcg\.com\/decklists\/[^<]+)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      const url = match[1];
      // Skip the index page itself
      if (url === "https://fabtcg.com/decklists/" || url === "https://fabtcg.com/ja/decklists/") {
        continue;
      }
      // Skip Japanese locale pages
      if (url.includes("/ja/")) continue;
      allUrls.push(url);
    }
  }

  return allUrls;
}

// ── Decklist Page Parsing ──

interface ParsedDecklist {
  slug: string;
  url: string;
  player: string;
  hero: string;
  event: string;
  placement: string;
  cards: { name: string; count: number }[];
  gemDecklistId: string | null;
  eventDate: string;
  eventUrl: string;
  format: string;
  country: string;
  countryCode: string;
  playerGemId: string;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&#8211;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8216;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function parsePlayerGridField(html: string, label: string): string {
  // Matches: <h3>\n  Label  \n</h3>\n<p>\n  Value  \n</p>
  const regex = new RegExp(
    `<h3>\\s*${label}\\s*</h3>\\s*<p[^>]*>([\\s\\S]*?)</p>`,
    "i"
  );
  const match = html.match(regex);
  if (!match) return "";
  // Strip HTML tags and trim
  return decodeHtml(match[1].replace(/<[^>]+>/g, "").trim());
}

function parseDecklistHtml(html: string, url: string): ParsedDecklist {
  // Extract slug from URL
  const slugMatch = url.match(/\/decklists\/([^/]+)\/?$/);
  const slug = slugMatch ? slugMatch[1] : url;

  // Extract player-name h2 content: "Player Name – Hero – Event Name"
  const h2Match = html.match(/<div class="player-name">\s*<h2>([^<]+)<\/h2>/);
  const h2Text = h2Match ? decodeHtml(h2Match[1]) : "";

  // Split on " – " (en dash with spaces)
  const parts = h2Text.split(" – ").map((p) => p.trim());
  const player = parts[0] || "";
  const hero = parts[1] || "";
  const event = parts.slice(2).join(" – ") || "";

  // ── Player Grid Fields ──

  // Rank/placement
  const rankMatch = html.match(/<p class="rank">\s*([^<]+)\s*<\/p>/);
  const placement = rankMatch ? rankMatch[1].trim() : "";

  // Date (e.g. "September 7, 2024")
  const dateRaw = parsePlayerGridField(html, "Date");
  let eventDate = "";
  if (dateRaw) {
    const d = new Date(dateRaw);
    if (!isNaN(d.getTime())) eventDate = d.toISOString().split("T")[0];
  }

  // Player GEM ID (e.g. "Michael Hamilton (34331578)" → "34331578")
  const playerFieldRaw = parsePlayerGridField(html, "Player");
  const gemIdMatch = playerFieldRaw.match(/\((\d+)\)\s*$/);
  const playerGemId = gemIdMatch ? gemIdMatch[1] : "";

  // Event URL (link inside Event field)
  const eventUrlMatch = html.match(
    /player-grid[\s\S]*?Event[\s\S]*?<a\s+href="([^"]+)"[^>]*>/i
  );
  const eventUrl = eventUrlMatch ? eventUrlMatch[1] : "";

  // Format
  const format = parsePlayerGridField(html, "Format");

  // Country/Region
  const countryRaw = parsePlayerGridField(html, "Country/Region");
  const country = countryRaw || "";

  // Country code from flag class (e.g. <i class="us flag">)
  const flagMatch = html.match(
    /player-grid[\s\S]*?Country[\s\S]*?<i class="(\w{2}) flag">/i
  );
  const countryCode = flagMatch ? flagMatch[1].toUpperCase() : "";

  // GEM decklist import ID
  const gemMatch = html.match(/gem\.fabtcg\.com\/profile\/decklists\/import\/fabtcg\/\?id=([a-f0-9-]+)/);
  const gemDecklistId = gemMatch ? gemMatch[1] : null;

  // Cards
  const cards: { name: string; count: number }[] = [];
  const cardRegex = /<span class="card-name">(\d+)\s*x\s*([^<]+)<\/span>/g;
  let cardMatch;
  while ((cardMatch = cardRegex.exec(html)) !== null) {
    cards.push({
      count: parseInt(cardMatch[1], 10),
      name: decodeHtml(cardMatch[2].trim()),
    });
  }

  return {
    slug, url, player, hero, event, placement, cards, gemDecklistId,
    eventDate, eventUrl, format, country, countryCode, playerGemId,
  };
}

async function fetchAndParseDecklist(url: string): Promise<ParsedDecklist> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  const html = await res.text();
  return parseDecklistHtml(html, url);
}

// ── Main Handler ──

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await verifyFirebaseToken(req);
  if (!auth) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const isAdmin = await checkIsAdmin(auth.email);
  if (!isAdmin) {
    return jsonResponse({ error: "Admin access required" }, 403);
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");

  try {
    if (mode === "sitemap") {
      const urls = await fetchSitemapUrls();
      return jsonResponse({ urls }, 200);
    }

    if (mode === "decklist") {
      const decklistUrl = url.searchParams.get("url");
      if (!decklistUrl || !decklistUrl.startsWith("https://fabtcg.com/decklists/")) {
        return jsonResponse({ error: "Invalid or missing decklist URL" }, 400);
      }
      const decklist = await fetchAndParseDecklist(decklistUrl);
      return jsonResponse({ decklist }, 200);
    }

    return jsonResponse({ error: "Invalid mode. Use ?mode=sitemap or ?mode=decklist&url=..." }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("sitemap-scrape function error:", message);
    return jsonResponse({ error: message }, 500);
  }
}
