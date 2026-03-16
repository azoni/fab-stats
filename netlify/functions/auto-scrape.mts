// Netlify scheduled function — auto-scrapes new FABTCG coverage data daily.
// Runs as a background function (up to 15 min timeout).
// Checks for new tournaments with coverage pages and scrapes their match results.

import type { Config } from "@netlify/functions";
import { getAdminDb } from "./firebase-admin.ts";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const TOURNAMENT_SITEMAP_URL = "https://fabtcg.com/tournament-sitemap.xml";

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

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── Tournament & Coverage Discovery ──

async function getTournamentUrls(): Promise<string[]> {
  const xml = await fetchPage(TOURNAMENT_SITEMAP_URL);
  const urls: string[] = [];
  const regex = /<loc>(https:\/\/fabtcg\.com\/organised-play\/[^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) urls.push(match[1]);
  return urls;
}

async function findCoverage(tournamentUrl: string): Promise<{
  coverageUrl: string;
  name: string;
  eventDate: string;
} | null> {
  const html = await fetchPage(tournamentUrl);
  const covMatch = html.match(/href="(https:\/\/fabtcg\.com\/coverage\/[^"]+)"/);
  if (!covMatch) return null;

  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const name = titleMatch
    ? decodeHtml(titleMatch[1].replace(/ - Flesh and Blood TCG$/, "").trim())
    : "";

  const dateMatch = html.match(/"datePublished":"(\d{4}-\d{2}-\d{2})/);
  const eventDate = dateMatch ? dateMatch[1] : "";

  return { coverageUrl: covMatch[1], name, eventDate };
}

async function getRounds(coverageUrl: string): Promise<{
  eventName: string;
  format: string;
  resultUrls: string[];
}> {
  const html = await fetchPage(coverageUrl);

  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const eventName = titleMatch
    ? decodeHtml(titleMatch[1].replace(/ - Flesh and Blood TCG$/, "").trim())
    : "";

  const formatMatch = html.match(/class="rounds">[^<]*-\s*([^<]+)</);
  const format = formatMatch ? formatMatch[1].trim() : "";

  const resultUrls: string[] = [];
  const regex = /href="((?:https:\/\/fabtcg\.com)?\/coverage\/[^"]+\/results\/\d+\/)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let url = match[1];
    if (url.startsWith("/")) url = "https://fabtcg.com" + url;
    if (!resultUrls.includes(url)) resultUrls.push(url);
  }

  resultUrls.sort((a, b) => {
    const ra = parseInt(a.match(/\/results\/(\d+)\//)?.[1] || "0");
    const rb = parseInt(b.match(/\/results\/(\d+)\//)?.[1] || "0");
    return ra - rb;
  });

  return { eventName, format, resultUrls };
}

interface ParsedMatch {
  player1: string;
  player1Hero: string;
  player1Country: string;
  player2: string;
  player2Hero: string;
  player2Country: string;
  result: "player1" | "player2" | "draw";
  round: number;
}

function parseResults(html: string, round: number): ParsedMatch[] {
  const matches: ParsedMatch[] = [];
  const rows = html.split(/class="match-row"/);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const p1Block = row.match(/<!-- Player 1 -->([\s\S]*?)<!-- (?:Winner|Player 2) -->/i);
    const p2Block = row.match(/<!-- Player 2 -->([\s\S]*?)(?:<\/tr>|$)/i);
    const winnerBlock = row.match(/<!-- Winner -->([\s\S]*?)<!-- Player 2 -->/i);

    if (!p1Block || !p2Block) continue;

    const parsePlayer = (block: string) => {
      const nameMatch = block.match(/<strong>\s*(?:<[^>]+>\s*)*([^<]+)/);
      const heroMatch = block.match(/<span(?:\s+class="hero-name")?>\s*([^<]+)\s*<\/span>/);
      const flagMatch = block.match(/<i class="flag (\w{2})">|<i class="(\w{2}) flag">/);
      return {
        name: nameMatch ? decodeHtml(nameMatch[1].trim()) : "",
        hero: heroMatch ? decodeHtml(heroMatch[1].trim()) : "",
        country: flagMatch ? (flagMatch[1] || flagMatch[2] || "").toUpperCase() : "",
      };
    };

    const p1 = parsePlayer(p1Block[1]);
    const p2 = parsePlayer(p2Block[1]);
    if (!p1.name || !p2.name) continue;

    let result: "player1" | "player2" | "draw" = "draw";
    if (winnerBlock) {
      const pill = winnerBlock[1].toLowerCase();
      if (pill.includes("player 1 win")) result = "player1";
      else if (pill.includes("player 2 win")) result = "player2";
    }
    if (result === "draw") {
      if (p1Block[1].includes("winner")) result = "player1";
      else if (p2Block[1].includes("winner")) result = "player2";
    }

    matches.push({
      player1: p1.name, player1Hero: p1.hero, player1Country: p1.country,
      player2: p2.name, player2Hero: p2.hero, player2Country: p2.country,
      result, round,
    });
  }

  return matches;
}

// ── Firestore Operations (Admin SDK) ──

async function getScrapedSlugs(): Promise<Set<string>> {
  const db = getAdminDb();
  const snap = await db.collection("coverage-events").get();
  return new Set(snap.docs.map((d) => d.id));
}

async function saveMatches(
  matches: Record<string, unknown>[],
): Promise<void> {
  const db = getAdminDb();
  const batch = db.batch();
  let count = 0;

  for (const m of matches) {
    const docId = `${m.event}_r${m.round}_${m.player1}_${m.player2}`
      .replace(/[/\\.\s]+/g, "_")
      .slice(0, 200);
    batch.set(db.collection("coverage-matches").doc(docId), m);
    count++;

    if (count >= 400) {
      await batch.commit();
      count = 0;
    }
  }

  if (count > 0) await batch.commit();
}

async function saveEvent(
  slug: string,
  data: Record<string, unknown>,
): Promise<void> {
  const db = getAdminDb();
  await db.collection("coverage-events").doc(slug).set(data);
}

async function rebuildSummaries(
): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection("coverage-matches").get();

  const pairMap = new Map<string, Record<string, unknown>>();

  for (const doc of snap.docs) {
    const m = doc.data();
    if (!m.player1Hero || !m.player2Hero) continue;

    const sorted = [m.player1Hero, m.player2Hero].sort();
    const key = `${sorted[0]}__${sorted[1]}`;
    const isHero1 = m.player1Hero === sorted[0];

    let s = pairMap.get(key) as Record<string, unknown> | undefined;
    if (!s) {
      s = {
        hero1: sorted[0], hero2: sorted[1],
        hero1Wins: 0, hero2Wins: 0, draws: 0, total: 0,
        byEvent: {}, byFormat: {},
      };
      pairMap.set(key, s);
    }

    (s.total as number)++;
    if (m.result === "draw") (s.draws as number)++;
    else if (m.result === "player1") {
      if (isHero1) (s.hero1Wins as number)++;
      else (s.hero2Wins as number)++;
    } else if (m.result === "player2") {
      if (isHero1) (s.hero2Wins as number)++;
      else (s.hero1Wins as number)++;
    }

    // By event
    if (m.event) {
      const byEvent = s.byEvent as Record<string, Record<string, number>>;
      if (!byEvent[m.event]) byEvent[m.event] = { hero1Wins: 0, hero2Wins: 0, draws: 0, total: 0 };
      byEvent[m.event].total++;
      if (m.result === "draw") byEvent[m.event].draws++;
      else if (m.result === "player1") { if (isHero1) byEvent[m.event].hero1Wins++; else byEvent[m.event].hero2Wins++; }
      else if (m.result === "player2") { if (isHero1) byEvent[m.event].hero2Wins++; else byEvent[m.event].hero1Wins++; }
    }

    // By format
    if (m.format) {
      const byFormat = s.byFormat as Record<string, Record<string, number>>;
      if (!byFormat[m.format]) byFormat[m.format] = { hero1Wins: 0, hero2Wins: 0, draws: 0, total: 0 };
      byFormat[m.format].total++;
      if (m.result === "draw") byFormat[m.format].draws++;
      else if (m.result === "player1") { if (isHero1) byFormat[m.format].hero1Wins++; else byFormat[m.format].hero2Wins++; }
      else if (m.result === "player2") { if (isHero1) byFormat[m.format].hero2Wins++; else byFormat[m.format].hero1Wins++; }
    }
  }

  // Clear existing
  const existingSnap = await db.collection("coverage-matchup-summaries").get();
  const deleteBatch = db.batch();
  for (const doc of existingSnap.docs) deleteBatch.delete(doc.ref);
  if (!existingSnap.empty) await deleteBatch.commit();

  // Write new
  const now = new Date().toISOString();
  const summaries = [...pairMap.values()];
  let count = 0;
  let batch = db.batch();
  for (const s of summaries) {
    s.updatedAt = now;
    const docId = `${s.hero1}__${s.hero2}`.replace(/[/\\.\s]+/g, "_");
    batch.set(db.collection("coverage-matchup-summaries").doc(docId), s);
    count++;
    if (count >= 400) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();

  return summaries.length;
}

// ── Main Handler ──

export default async function handler() {
  console.log("[auto-scrape] Starting scheduled coverage scrape...");

  try {
    const tournamentUrls = await getTournamentUrls();
    const scrapedSlugs = await getScrapedSlugs();
    let newEvents = 0;
    let newMatches = 0;

    for (const tUrl of tournamentUrls) {
      const slug = tUrl.replace(/\/$/, "").split("/").pop() || "";
      if (scrapedSlugs.has(slug)) continue;

      try {
        const discovery = await findCoverage(tUrl);
        if (!discovery) continue;

        await new Promise((r) => setTimeout(r, 500));

        const roundInfo = await getRounds(discovery.coverageUrl);
        if (roundInfo.resultUrls.length === 0) continue;

        const allMatches: Record<string, unknown>[] = [];

        for (const resultUrl of roundInfo.resultUrls) {
          try {
            const html = await fetchPage(resultUrl);
            const round = parseInt(resultUrl.match(/\/results\/(\d+)\//)?.[1] || "0");
            const parsed = parseResults(html, round);

            for (const m of parsed) {
              allMatches.push({
                ...m,
                event: roundInfo.eventName || discovery.name,
                coverageUrl: discovery.coverageUrl,
                eventDate: discovery.eventDate || "",
                format: roundInfo.format || "",
              });
            }
          } catch {
            // skip failed round
          }

          await new Promise((r) => setTimeout(r, 500));
        }

        if (allMatches.length > 0) {
          await saveMatches(allMatches);
          await saveEvent(slug, {
            slug,
            coverageUrl: discovery.coverageUrl,
            tournamentUrl: tUrl,
            eventName: roundInfo.eventName || discovery.name,
            eventDate: discovery.eventDate || "",
            format: roundInfo.format || "",
            roundCount: roundInfo.resultUrls.length,
            matchCount: allMatches.length,
            scrapedAt: new Date().toISOString(),
          });
          newEvents++;
          newMatches += allMatches.length;
          console.log(`[auto-scrape] Scraped ${discovery.name}: ${allMatches.length} matches`);
        }
      } catch (err) {
        console.error(`[auto-scrape] Failed on ${slug}:`, err);
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    // Rebuild summaries if we got new data
    if (newMatches > 0) {
      const summaryCount = await rebuildSummaries();
      console.log(`[auto-scrape] Rebuilt ${summaryCount} matchup summaries`);
    }

    // Save scrape status for admin dashboard
    const db = getAdminDb();
    await db.doc("sitemap-meta/auto-scrape-status").set({
      lastRunAt: new Date().toISOString(),
      newEvents,
      newMatches,
      totalEventsChecked: tournamentUrls.length,
    });

    console.log(`[auto-scrape] Done. ${newEvents} new events, ${newMatches} new matches.`);
  } catch (err) {
    console.error("[auto-scrape] Fatal error:", err);
  }
}

// Run daily at 6 AM UTC
export const config: Config = {
  schedule: "0 6 * * *",
};
