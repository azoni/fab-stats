// Netlify serverless function — generates tweet threads using Claude.
// Admin-only. Fetches community meta data from Firestore, sends to Claude
// with the user's prompt, returns a structured tweet thread.

import { verifyFirebaseToken } from "./verify-auth.ts";
import { getAdminDb } from "./firebase-admin.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2048;

// Leaderboard cache
let lbCache: { entries: any[]; fetchedAt: number } | null = null;
const LB_CACHE_TTL = 10 * 60 * 1000;

// Hero matchup cache
let matchupCache: { data: any[]; fetchedAt: number } | null = null;
const MATCHUP_CACHE_TTL = 10 * 60 * 1000;

function jsonResponse(body: any, status: number) {
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

// ── Data Fetching ──

async function fetchLeaderboardEntries(): Promise<any[]> {
  if (lbCache && Date.now() - lbCache.fetchedAt < LB_CACHE_TTL) {
    return lbCache.entries;
  }
  const db = getAdminDb();
  const snap = await db.collection("leaderboard").where("isPublic", "==", true).get();
  const entries = snap.docs.map((d) => d.data());
  lbCache = { entries, fetchedAt: Date.now() };
  return entries;
}

async function fetchHeroMatchups(): Promise<any[]> {
  if (matchupCache && Date.now() - matchupCache.fetchedAt < MATCHUP_CACHE_TTL) {
    return matchupCache.data;
  }
  const db = getAdminDb();
  const snap = await db.collection("heroMatchups").get();
  const data = snap.docs.map((d) => d.data());
  matchupCache = { data, fetchedAt: Date.now() };
  return data;
}

// ── Context Building ──

function buildCommunityContext(entries: any[], matchups: any[]): string {
  const totalPlayers = entries.length;
  const totalMatches = entries.reduce((s: number, e: any) => s + (e.totalMatches || 0), 0);
  const totalDraws = entries.reduce((s: number, e: any) => s + (e.totalDraws || 0), 0);
  const totalByes = entries.reduce((s: number, e: any) => s + (e.totalByes || 0), 0);

  // Hero meta (all time)
  const heroAgg = new Map<string, { players: number; matches: number; wins: number }>();
  for (const entry of entries) {
    if (!entry.heroBreakdown) continue;
    for (const h of entry.heroBreakdown) {
      const cur = heroAgg.get(h.hero) || { players: 0, matches: 0, wins: 0 };
      cur.players++;
      cur.matches += h.matches || 0;
      cur.wins += h.wins || 0;
      heroAgg.set(h.hero, cur);
    }
  }
  const heroStats = [...heroAgg.entries()]
    .map(([hero, d]) => ({
      hero,
      players: d.players,
      matches: d.matches,
      wins: d.wins,
      winRate: d.matches > 0 ? Math.round(d.wins / d.matches * 1000) / 10 : 0,
      metaShare: totalMatches > 0 ? Math.round(d.matches / totalMatches * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.matches - a.matches);

  // Weekly hero breakdown
  const weeklyHeroAgg = new Map<string, { matches: number; wins: number }>();
  for (const entry of entries) {
    if (!entry.weeklyHeroBreakdown) continue;
    for (const h of entry.weeklyHeroBreakdown) {
      const cur = weeklyHeroAgg.get(h.hero) || { matches: 0, wins: 0 };
      cur.matches += h.matches || 0;
      cur.wins += h.wins || 0;
      weeklyHeroAgg.set(h.hero, cur);
    }
  }
  const weeklyHeroes = [...weeklyHeroAgg.entries()]
    .map(([hero, d]) => ({ hero, matches: d.matches, wins: d.wins, winRate: d.matches > 0 ? Math.round(d.wins / d.matches * 1000) / 10 : 0 }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 15);

  // Top 8 data
  const top8Agg = new Map<string, { count: number; champions: number; finalists: number; top4: number; top8: number }>();
  const top8ByEventType = new Map<string, Map<string, { count: number; champions: number }>>();
  for (const entry of entries) {
    if (!entry.top8Heroes) continue;
    for (const t of entry.top8Heroes) {
      const cur = top8Agg.get(t.hero) || { count: 0, champions: 0, finalists: 0, top4: 0, top8: 0 };
      cur.count++;
      if (t.placementType === "champion") cur.champions++;
      else if (t.placementType === "finalist") cur.finalists++;
      else if (t.placementType === "top4") cur.top4++;
      else cur.top8++;
      top8Agg.set(t.hero, cur);

      // By event type
      const et = t.eventType || "Other";
      if (!top8ByEventType.has(et)) top8ByEventType.set(et, new Map());
      const etMap = top8ByEventType.get(et)!;
      const etCur = etMap.get(t.hero) || { count: 0, champions: 0 };
      etCur.count++;
      if (t.placementType === "champion") etCur.champions++;
      etMap.set(t.hero, etCur);
    }
  }
  const top8Heroes = [...top8Agg.entries()]
    .map(([hero, d]) => ({ hero, ...d }))
    .sort((a, b) => b.count - a.count);

  const top8ByET: Record<string, { hero: string; count: number; champions: number }[]> = {};
  for (const [et, heroMap] of top8ByEventType) {
    top8ByET[et] = [...heroMap.entries()]
      .map(([hero, d]) => ({ hero, ...d }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Hero matchup data (aggregate)
  const matchupAgg = new Map<string, { hero1Wins: number; hero2Wins: number; draws: number; total: number }>();
  for (const doc of matchups) {
    const key = `${doc.hero1} vs ${doc.hero2}`;
    const cur = matchupAgg.get(key) || { hero1Wins: 0, hero2Wins: 0, draws: 0, total: 0 };
    cur.hero1Wins += doc.hero1Wins || 0;
    cur.hero2Wins += doc.hero2Wins || 0;
    cur.draws += doc.draws || 0;
    cur.total += doc.total || 0;
    matchupAgg.set(key, cur);
  }
  const topMatchups = [...matchupAgg.entries()]
    .filter(([, d]) => d.total >= 10)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 30)
    .map(([key, d]) => ({ matchup: key, ...d }));

  // Top players
  const topPlayers = entries
    .filter((e: any) => (e.totalMatches || 0) >= 20)
    .sort((a: any, b: any) => (b.winRate || 0) - (a.winRate || 0))
    .slice(0, 10)
    .map((e: any) => ({
      name: e.displayName || e.username,
      matches: e.totalMatches,
      winRate: e.winRate,
      topHero: e.topHero,
      top8s: e.totalTop8s || 0,
    }));

  // Venue breakdown (aggregated across all players)
  const venueAgg = new Map<string, { matches: number; wins: number }>();
  for (const entry of entries) {
    if (!entry.venueBreakdown) continue;
    for (const v of entry.venueBreakdown) {
      const cur = venueAgg.get(v.venue) || { matches: 0, wins: 0 };
      cur.matches += v.matches || 0;
      cur.wins += v.wins || 0;
      venueAgg.set(v.venue, cur);
    }
  }
  const venues = [...venueAgg.entries()]
    .map(([venue, d]) => ({ venue, matches: d.matches, wins: d.wins, winRate: d.matches > 0 ? Math.round(d.wins / d.matches * 1000) / 10 : 0 }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 20);

  // Format breakdown
  const formatAgg = new Map<string, { matches: number; wins: number }>();
  for (const entry of entries) {
    if (!entry.heroBreakdownDetailed) continue;
    for (const h of entry.heroBreakdownDetailed) {
      const f = h.format || "Unknown";
      const cur = formatAgg.get(f) || { matches: 0, wins: 0 };
      cur.matches += h.matches || 0;
      cur.wins += h.wins || 0;
      formatAgg.set(f, cur);
    }
  }
  const formats = [...formatAgg.entries()]
    .map(([format, d]) => ({ format, matches: d.matches, winRate: d.matches > 0 ? Math.round(d.wins / d.matches * 1000) / 10 : 0 }))
    .sort((a, b) => b.matches - a.matches);

  // Event type breakdown (Armory, Skirmish, ProQuest, etc.)
  const eventTypeAgg = new Map<string, { matches: number; wins: number; players: number }>();
  for (const entry of entries) {
    if (!entry.heroBreakdownDetailed) continue;
    const seenET = new Set<string>();
    for (const h of entry.heroBreakdownDetailed) {
      const et = h.eventType || "Other";
      const cur = eventTypeAgg.get(et) || { matches: 0, wins: 0, players: 0 };
      cur.matches += h.matches || 0;
      cur.wins += h.wins || 0;
      if (!seenET.has(et)) { cur.players++; seenET.add(et); }
      eventTypeAgg.set(et, cur);
    }
  }
  const eventTypes = [...eventTypeAgg.entries()]
    .map(([eventType, d]) => ({ eventType, matches: d.matches, wins: d.wins, players: d.players, winRate: d.matches > 0 ? Math.round(d.wins / d.matches * 1000) / 10 : 0 }))
    .sort((a, b) => b.matches - a.matches);

  // Community streaks & milestones
  const streakLeaders = entries
    .filter((e: any) => (e.longestWinStreak || 0) >= 5)
    .sort((a: any, b: any) => (b.longestWinStreak || 0) - (a.longestWinStreak || 0))
    .slice(0, 5)
    .map((e: any) => ({ name: e.displayName || e.username, streak: e.longestWinStreak, topHero: e.topHero }));

  const hotStreaks = entries
    .filter((e: any) => e.currentStreakType === "win" && (e.currentStreakCount || 0) >= 3)
    .sort((a: any, b: any) => (b.currentStreakCount || 0) - (a.currentStreakCount || 0))
    .slice(0, 5)
    .map((e: any) => ({ name: e.displayName || e.username, streak: e.currentStreakCount, topHero: e.topHero }));

  // Armory stats
  const armoryPlayers = entries.filter((e: any) => (e.armoryMatches || 0) >= 5);
  const armoryStats = {
    totalPlayers: armoryPlayers.length,
    totalMatches: armoryPlayers.reduce((s: number, e: any) => s + (e.armoryMatches || 0), 0),
    avgWinRate: armoryPlayers.length > 0
      ? Math.round(armoryPlayers.reduce((s: number, e: any) => s + (e.armoryWinRate || 0), 0) / armoryPlayers.length * 10) / 10
      : 0,
    topPlayers: armoryPlayers
      .sort((a: any, b: any) => (b.armoryWinRate || 0) - (a.armoryWinRate || 0))
      .slice(0, 5)
      .map((e: any) => ({ name: e.displayName || e.username, matches: e.armoryMatches, winRate: Math.round((e.armoryWinRate || 0) * 10) / 10 })),
  };

  // Weekly/monthly activity
  const weeklyActive = entries.filter((e: any) => (e.weeklyMatches || 0) > 0);
  const monthlyActive = entries.filter((e: any) => (e.monthlyMatches || 0) > 0);
  const activityStats = {
    weeklyActivePlayers: weeklyActive.length,
    weeklyTotalMatches: weeklyActive.reduce((s: number, e: any) => s + (e.weeklyMatches || 0), 0),
    monthlyActivePlayers: monthlyActive.length,
    monthlyTotalMatches: monthlyActive.reduce((s: number, e: any) => s + (e.monthlyMatches || 0), 0),
  };

  // Hero loyalty (players most dedicated to one hero)
  const heroLoyalists = entries
    .filter((e: any) => (e.totalMatches || 0) >= 20 && e.topHero && (e.topHeroMatches || 0) > 0)
    .map((e: any) => ({ name: e.displayName || e.username, hero: e.topHero, matches: e.topHeroMatches, total: e.totalMatches, pct: Math.round((e.topHeroMatches / e.totalMatches) * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  // Hero diversity (players who play the most different heroes)
  const heroDiverse = entries
    .filter((e: any) => (e.totalMatches || 0) >= 20 && (e.uniqueHeroes || 0) > 0)
    .sort((a: any, b: any) => (b.uniqueHeroes || 0) - (a.uniqueHeroes || 0))
    .slice(0, 5)
    .map((e: any) => ({ name: e.displayName || e.username, heroes: e.uniqueHeroes, matches: e.totalMatches }));

  // Draw rate analysis
  const drawRate = totalMatches > 0 ? Math.round(totalDraws / totalMatches * 1000) / 10 : 0;

  // Globe trotters (most venues visited)
  const globeTrotters = entries
    .filter((e: any) => (e.uniqueVenues || 0) >= 3)
    .sort((a: any, b: any) => (b.uniqueVenues || 0) - (a.uniqueVenues || 0))
    .slice(0, 5)
    .map((e: any) => ({ name: e.displayName || e.username, venues: e.uniqueVenues, matches: e.totalMatches }));

  // Event grinders (most events played)
  const eventGrinders = entries
    .filter((e: any) => (e.eventsPlayed || 0) >= 5)
    .sort((a: any, b: any) => (b.eventsPlayed || 0) - (a.eventsPlayed || 0))
    .slice(0, 5)
    .map((e: any) => ({ name: e.displayName || e.username, events: e.eventsPlayed, eventWins: e.eventWins || 0, matches: e.totalMatches }));

  return JSON.stringify({
    overview: { totalPlayers, totalMatches, totalDraws, totalByes, drawRate },
    heroStats: heroStats.slice(0, 25),
    weeklyHeroes,
    top8Heroes: top8Heroes.slice(0, 20),
    top8ByEventType: top8ByET,
    topMatchups,
    topPlayers,
    formats,
    venues,
    eventTypes,
    streakLeaders,
    hotStreaks,
    armoryStats,
    activityStats,
    heroLoyalists,
    heroDiverse,
    globeTrotters,
    eventGrinders,
  });
}

const SYSTEM_PROMPT = `You are a social media content writer for FaB Stats (fabstats.net), a community platform for Flesh and Blood TCG players. You create engaging tweet threads based on community data.

Rules:
- Output ONLY a JSON array of strings, where each string is one tweet in the thread. Example: ["tweet 1", "tweet 2", "tweet 3"]
- Each tweet MUST be under 280 characters. This is critical — count carefully.
- Use real numbers from the data provided. NEVER fabricate statistics.
- Make it engaging, conversational, and fun. Use emojis sparingly but effectively.
- The last tweet should mention fabstats.net/meta and ask a question to drive engagement.
- Include #FleshandBlood on the first tweet.
- Aim for 2-4 tweets per thread.
- Use line breaks within tweets for readability.
- When the user asks about specific data (like draws, matchups, etc.), find relevant supporting data and weave it into a narrative.
- If the data doesn't support the user's angle, say so honestly in the first tweet and pivot to what the data does show.

Today's date: ${new Date().toISOString().slice(0, 10)}`;

// ── Main Handler ──

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await verifyFirebaseToken(req);
  if (!auth) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  // Admin only
  const isAdmin = await checkIsAdmin(auth.email);
  if (!isAdmin) {
    return jsonResponse({ error: "Admin access required" }, 403);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "API key not configured" }, 500);
  }

  try {
    const body = await req.json();
    const prompt = body?.prompt?.trim();
    if (!prompt) {
      return jsonResponse({ error: "Prompt is required" }, 400);
    }

    // Fetch data
    const [entries, matchups] = await Promise.all([
      fetchLeaderboardEntries(),
      fetchHeroMatchups(),
    ]);

    const context = buildCommunityContext(entries, matchups);

    // Call Claude
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          {
            role: "user",
            content: `Here is the current community data:\n\n${context}\n\nGenerate a tweet thread about: ${prompt}`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return jsonResponse({ error: "AI service unavailable" }, 502);
    }

    const data = await anthropicRes.json();
    const responseText = data?.content?.[0]?.text || "[]";

    // Parse JSON array from response
    let tweets: string[];
    try {
      // Find the JSON array in the response (Claude might wrap it in markdown)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      tweets = jsonMatch ? JSON.parse(jsonMatch[0]) : [responseText];
    } catch {
      tweets = [responseText];
    }

    // Build image recommendation based on prompt
    let imageRecommendation = "Consider attaching a Meta Share Card screenshot from fabstats.net/meta";
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("proquest") || lowerPrompt.includes("pq")) {
      imageRecommendation = "Attach: Meta Share Card for ProQuest from fabstats.net/meta";
    } else if (lowerPrompt.includes("top 8") || lowerPrompt.includes("top8")) {
      imageRecommendation = "Attach: Top 8 breakdown chart from fabstats.net/meta";
    } else if (lowerPrompt.includes("matchup")) {
      imageRecommendation = "Attach: Matchup grid screenshot from fabstats.net/meta";
    }

    return jsonResponse({ tweets, imageRecommendation }, 200);

  } catch (err: any) {
    console.error("social-tweet function error:", err);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
}
