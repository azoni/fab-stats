// Netlify serverless function — AI chat assistant powered by Claude Haiku.
// Authenticates via Firebase, enforces rate limits, fetches user context
// from Firestore, calls Claude, persists messages + cost tracking.

import { verifyFirebaseToken } from "./verify-auth.ts";
import { getAdminDb } from "./firebase-admin.ts";
import { FieldValue } from "firebase-admin/firestore";

// ── Constants ──

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MODEL = "claude-haiku-4-5-20251001";
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_PAIRS = 10;
const MAX_TOKENS = 1024;
const HOURLY_LIMIT = 10;
const DAILY_LIMIT = 50;

// Haiku pricing (per token)
const INPUT_COST_PER_TOKEN = 0.80 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 4.00 / 1_000_000;

// Leaderboard cache (shared across warm invocations)
let leaderboardCache: { entries: any[]; fetchedAt: number } | null = null;
const LB_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ── Helpers ──

function jsonResponse(body: any, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extraHeaders },
  });
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  return inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
}

// ── Rate Limiting ──

interface RateLimitResult {
  allowed: boolean;
  hourlyRemaining: number;
  dailyRemaining: number;
  retryAfter?: number;
  type?: "hourly" | "daily";
}

async function checkAndIncrementRateLimit(userId: string): Promise<RateLimitResult> {
  const db = getAdminDb();
  const statsRef = db.doc(`users/${userId}/chatStats/main`);

  return db.runTransaction(async (t) => {
    const snap = await t.get(statsRef);
    const data = snap.data() || {};

    const now = Date.now();
    const hourAgo = now - 3_600_000;
    const todayStr = new Date().toISOString().slice(0, 10);

    // Reset hourly window if expired
    const hourlyWindowStart = data.hourlyWindowStart || 0;
    const hourlyCount = hourlyWindowStart > hourAgo ? (data.hourlyCount || 0) : 0;
    const resetHourly = hourlyWindowStart <= hourAgo;

    // Reset daily window if new day
    const dailyWindowStart = data.dailyWindowStart || "";
    const dailyCount = dailyWindowStart === todayStr ? (data.dailyCount || 0) : 0;
    const resetDaily = dailyWindowStart !== todayStr;

    // Check limits
    if (hourlyCount >= HOURLY_LIMIT) {
      const retryAfter = Math.ceil((hourlyWindowStart + 3_600_000 - now) / 1000);
      return { allowed: false, hourlyRemaining: 0, dailyRemaining: DAILY_LIMIT - dailyCount, retryAfter, type: "hourly" as const };
    }
    if (dailyCount >= DAILY_LIMIT) {
      const midnight = new Date(todayStr + "T00:00:00Z");
      midnight.setUTCDate(midnight.getUTCDate() + 1);
      const retryAfter = Math.ceil((midnight.getTime() - now) / 1000);
      return { allowed: false, hourlyRemaining: HOURLY_LIMIT - hourlyCount, dailyRemaining: 0, retryAfter, type: "daily" as const };
    }

    // Increment
    const update: any = {
      hourlyCount: hourlyCount + 1,
      dailyCount: dailyCount + 1,
      lastMessageAt: new Date().toISOString(),
    };
    if (resetHourly) update.hourlyWindowStart = now;
    else update.hourlyWindowStart = hourlyWindowStart;
    if (resetDaily) update.dailyWindowStart = todayStr;
    else update.dailyWindowStart = dailyWindowStart;

    t.set(statsRef, update, { merge: true });

    return {
      allowed: true,
      hourlyRemaining: HOURLY_LIMIT - hourlyCount - 1,
      dailyRemaining: DAILY_LIMIT - dailyCount - 1,
    };
  });
}

// ── Context Building ──

function buildUserContext(lbEntry: any, allMatches: any[], h2hRecords: any[], lbEntries: any[]): string {
  if (!lbEntry) return "No player data available — the user may not have imported any matches yet.";

  const player: any = {
    username: lbEntry.username,
    displayName: lbEntry.displayName,
    totalMatches: lbEntry.totalMatches || 0,
    totalWins: lbEntry.totalWins || 0,
    totalLosses: lbEntry.totalLosses || 0,
    totalDraws: lbEntry.totalDraws || 0,
    totalByes: lbEntry.totalByes || 0,
    winRate: lbEntry.winRate ?? 0,
    topHero: lbEntry.topHero || "Unknown",
    topHeroMatches: lbEntry.topHeroMatches || 0,
    longestWinStreak: lbEntry.longestWinStreak || 0,
    currentWinStreak: lbEntry.currentWinStreak || 0,
    eventsPlayed: lbEntry.eventsPlayed || 0,
    eventWins: lbEntry.eventWins || 0,
    totalTop8s: lbEntry.totalTop8s || 0,
    ratedMatches: lbEntry.ratedMatches || 0,
    ratedWinRate: lbEntry.ratedWinRate ?? 0,
    weeklyMatches: lbEntry.weeklyMatches || 0,
    weeklyWins: lbEntry.weeklyWins || 0,
    monthlyMatches: lbEntry.monthlyMatches || 0,
    monthlyWins: lbEntry.monthlyWins || 0,
    armoryMatches: lbEntry.armoryMatches || 0,
    armoryWins: lbEntry.armoryWins || 0,
    earnings: lbEntry.earnings || 0,
  };

  // Hero breakdown (all)
  if (lbEntry.heroBreakdown?.length) {
    player.heroBreakdown = lbEntry.heroBreakdown.map((h: any) => ({
      hero: h.hero,
      matches: h.matches,
      wins: h.wins,
      winRate: h.matches > 0 ? Math.round(h.wins / h.matches * 1000) / 10 : 0,
    }));
  }

  // Nemesis
  if (lbEntry.nemesis) {
    player.nemesis = { name: lbEntry.nemesis, winRate: lbEntry.nemesisWinRate };
  }

  // Build opponent name lookup from leaderboard
  const uidToName = new Map<string, string>();
  for (const e of lbEntries) {
    if (e.userId) uidToName.set(e.userId, e.displayName || e.username);
  }

  // H2H opponent records (with names resolved)
  const opponents = h2hRecords
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 30)
    .map((r) => ({
      name: uidToName.get(r.opponentUid) || "Unknown",
      wins: r.myWins,
      losses: r.theirWins,
      draws: r.draws,
      total: r.total,
      winRate: r.total > 0 ? Math.round(r.myWins / r.total * 1000) / 10 : 0,
    }));

  // Aggregate opponent stats by hero (from match data)
  const heroMatchups = new Map<string, { wins: number; losses: number; draws: number }>();
  for (const m of allMatches) {
    const oppHero = m.opponentHero || "Unknown";
    if (oppHero === "Unknown") continue;
    const cur = heroMatchups.get(oppHero) || { wins: 0, losses: 0, draws: 0 };
    if (m.result === "win") cur.wins++;
    else if (m.result === "loss") cur.losses++;
    else if (m.result === "draw") cur.draws++;
    heroMatchups.set(oppHero, cur);
  }
  const vsHeroes = [...heroMatchups.entries()]
    .map(([hero, d]) => ({
      hero,
      wins: d.wins,
      losses: d.losses,
      draws: d.draws,
      total: d.wins + d.losses + d.draws,
      winRate: (d.wins + d.losses + d.draws) > 0 ? Math.round(d.wins / (d.wins + d.losses + d.draws) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  // Event history (aggregated per event)
  const eventMap = new Map<string, { date: string; format: string; eventType: string; hero: string; wins: number; losses: number; draws: number }>();
  for (const m of allMatches) {
    const eventName = m.notes?.split(" | ")[0]?.trim() || "";
    if (!eventName) continue;
    const cur = eventMap.get(eventName) || { date: m.date, format: m.format || "", eventType: m.eventType || "", hero: m.heroPlayed || "", wins: 0, losses: 0, draws: 0 };
    if (m.result === "win") cur.wins++;
    else if (m.result === "loss") cur.losses++;
    else if (m.result === "draw") cur.draws++;
    eventMap.set(eventName, cur);
  }
  const events = [...eventMap.entries()]
    .slice(0, 30)
    .map(([name, d]) => ({
      name,
      date: d.date,
      format: d.format,
      eventType: d.eventType,
      hero: d.hero,
      record: `${d.wins}W-${d.losses}L${d.draws > 0 ? `-${d.draws}D` : ""}`,
    }));

  // Recent matches (last 30 with full detail)
  const recentMatches = allMatches.slice(0, 30).map((m: any) => ({
    date: m.date,
    hero: m.heroPlayed,
    opponent: m.opponentName || "Unknown",
    opponentHero: m.opponentHero || "Unknown",
    result: m.result,
    format: m.format,
    eventType: m.eventType || "Unknown",
  }));

  return JSON.stringify({ player, opponents, vsHeroes, events, recentMatches });
}

function buildMetaSummary(entries: any[]): string {
  const publicEntries = entries.filter((e: any) => e.isPublic);
  const totalPlayers = publicEntries.length;
  const totalMatches = publicEntries.reduce((s: number, e: any) => s + (e.totalMatches || 0), 0);

  // Hero meta — aggregate hero breakdown
  const heroAgg = new Map<string, { players: number; matches: number; wins: number }>();
  for (const entry of publicEntries) {
    if (!entry.heroBreakdown) continue;
    for (const h of entry.heroBreakdown) {
      const cur = heroAgg.get(h.hero) || { players: 0, matches: 0, wins: 0 };
      cur.players++;
      cur.matches += h.matches || 0;
      cur.wins += h.wins || 0;
      heroAgg.set(h.hero, cur);
    }
  }

  const topHeroes = [...heroAgg.entries()]
    .map(([hero, d]) => ({
      hero,
      players: d.players,
      matches: d.matches,
      winRate: d.matches > 0 ? Math.round(d.wins / d.matches * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 10);

  // Top players by win rate (min 10 matches)
  const topPlayers = publicEntries
    .filter((e: any) => (e.totalMatches || 0) >= 10)
    .sort((a: any, b: any) => (b.winRate || 0) - (a.winRate || 0))
    .slice(0, 5)
    .map((e: any) => ({
      name: e.displayName || e.username,
      winRate: e.winRate,
      matches: e.totalMatches,
      topHero: e.topHero,
    }));

  return JSON.stringify({ totalPlayers, totalMatches, topHeroes, topPlayers });
}

const SYSTEM_PROMPT_PREFIX = `You are the FaB Stats Assistant, an AI helper for Flesh and Blood TCG players on fabstats.net. You help users understand their match statistics, analyze performance, discuss the game meta, compare matchups, and answer questions about Flesh and Blood heroes, cards, and strategy.

Your data includes:
- The player's full stats (win rate, streaks, hero breakdown, event history, etc.)
- Their head-to-head record vs every opponent they've played on the platform
- Their win rate vs each opponent hero
- Their event history with per-event records
- Their 30 most recent individual matches
- Community meta: top heroes by play rate + win rate, top players

Rules:
- Be concise and conversational. Use specific numbers from the data when relevant.
- Never fabricate statistics. If data is not available, say so clearly.
- Never reveal other users' private data. You may reference public leaderboard aggregates.
- Format numbers nicely (e.g., "62.3%" not "62.33333%").
- You can reference FaB card data, hero abilities, and game mechanics from your training knowledge.
- When asked about matchups or predictions, base your analysis on available data and clearly note when you're speculating.
- If asked about something outside FaB or the platform, briefly acknowledge and redirect.
- Keep responses under 300 words unless the user asks for a detailed breakdown.
`;

function buildSystemPrompt(userContext: string, metaSummary: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${SYSTEM_PROMPT_PREFIX}
Today's date: ${today}.

## Your Player's Data
${userContext}

## Community Meta (Public Leaderboard Summary)
${metaSummary}`;
}

// ── Fetch Data ──

async function fetchLeaderboardEntries(): Promise<any[]> {
  if (leaderboardCache && Date.now() - leaderboardCache.fetchedAt < LB_CACHE_TTL) {
    return leaderboardCache.entries;
  }

  const db = getAdminDb();
  const snap = await db.collection("leaderboard").where("isPublic", "==", true).get();
  const entries = snap.docs.map((d) => d.data());
  leaderboardCache = { entries, fetchedAt: Date.now() };
  return entries;
}

async function fetchUserLeaderboardEntry(userId: string): Promise<any | null> {
  const db = getAdminDb();
  const snap = await db.doc(`leaderboard/${userId}`).get();
  return snap.exists ? snap.data() : null;
}

async function fetchAllMatches(userId: string): Promise<any[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(`users/${userId}/matches`)
    .orderBy("date", "desc")
    .get();
  return snap.docs.map((d) => d.data());
}

async function fetchH2HRecords(userId: string): Promise<any[]> {
  const db = getAdminDb();
  // H2H docs use sorted pair IDs — query both sides
  const [asP1, asP2] = await Promise.all([
    db.collection("h2h").where("p1", "==", userId).get(),
    db.collection("h2h").where("p2", "==", userId).get(),
  ]);
  const records: any[] = [];
  for (const d of asP1.docs) {
    const data = d.data();
    records.push({
      opponentUid: data.p2,
      myWins: data.p1Wins,
      theirWins: data.p2Wins,
      draws: data.draws,
      total: data.total,
    });
  }
  for (const d of asP2.docs) {
    const data = d.data();
    records.push({
      opponentUid: data.p1,
      myWins: data.p2Wins,
      theirWins: data.p1Wins,
      draws: data.draws,
      total: data.total,
    });
  }
  return records;
}

// ── Save Messages ──

async function saveMessages(
  userId: string,
  userMessage: string,
  assistantMessage: string,
  usage: { inputTokens: number; outputTokens: number; cost: number },
) {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const batch = db.batch();

  // User message
  const userRef = db.collection(`users/${userId}/chatMessages`).doc();
  batch.set(userRef, {
    role: "user",
    content: userMessage,
    createdAt: now,
  });

  // Assistant message
  const assistantRef = db.collection(`users/${userId}/chatMessages`).doc();
  batch.set(assistantRef, {
    role: "assistant",
    content: assistantMessage,
    createdAt: new Date(Date.now() + 1).toISOString(), // +1ms to ensure ordering
    model: MODEL,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cost: usage.cost,
  });

  // Update cumulative stats
  const statsRef = db.doc(`users/${userId}/chatStats/main`);
  batch.set(statsRef, {
    totalMessages: FieldValue.increment(1),
    totalResponses: FieldValue.increment(1),
    totalInputTokens: FieldValue.increment(usage.inputTokens),
    totalOutputTokens: FieldValue.increment(usage.outputTokens),
    totalCost: FieldValue.increment(usage.cost),
  }, { merge: true });

  await batch.commit();
  return assistantRef.id;
}

// ── Main Handler ──

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Auth
  const userId = await verifyFirebaseToken(req);
  if (!userId) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "API key not configured" }, 500);
  }

  try {
    // Parse + validate
    const body = await req.json();
    const message = body?.message?.trim();
    const history: { role: string; content: string }[] = body?.history || [];

    if (!message) {
      return jsonResponse({ error: "Message is required" }, 400);
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return jsonResponse({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` }, 400);
    }

    // Rate limit
    const rateResult = await checkAndIncrementRateLimit(userId);
    if (!rateResult.allowed) {
      return jsonResponse({
        error: "Rate limit exceeded",
        retryAfter: rateResult.retryAfter,
        type: rateResult.type,
        rateLimits: {
          hourlyRemaining: rateResult.hourlyRemaining,
          dailyRemaining: rateResult.dailyRemaining,
        },
      }, 429);
    }

    // Fetch context in parallel
    const [lbEntry, allMatches, h2hRecords, lbEntries] = await Promise.all([
      fetchUserLeaderboardEntry(userId),
      fetchAllMatches(userId),
      fetchH2HRecords(userId),
      fetchLeaderboardEntries(),
    ]);

    // Build prompts
    const userContext = buildUserContext(lbEntry, allMatches, h2hRecords, lbEntries);
    const metaSummary = buildMetaSummary(lbEntries);
    const systemPrompt = buildSystemPrompt(userContext, metaSummary);

    // Build conversation messages (last N pairs + new message)
    const conversationMessages: { role: string; content: string }[] = [];
    const recentHistory = history.slice(-MAX_HISTORY_PAIRS * 2);
    for (const msg of recentHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        conversationMessages.push({ role: msg.role, content: msg.content });
      }
    }
    conversationMessages.push({ role: "user", content: message });

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
        system: systemPrompt,
        messages: conversationMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return jsonResponse({ error: "AI service unavailable" }, 502);
    }

    const data = await anthropicRes.json();
    const responseText = data?.content?.[0]?.text || "I'm sorry, I couldn't generate a response.";
    const inputTokens = data?.usage?.input_tokens || 0;
    const outputTokens = data?.usage?.output_tokens || 0;
    const cost = estimateCost(inputTokens, outputTokens);

    // Save messages + stats (don't block response on failure)
    let messageId = "";
    try {
      messageId = await saveMessages(userId, message, responseText, { inputTokens, outputTokens, cost });
    } catch (err) {
      console.error("Failed to save chat messages:", err);
    }

    return jsonResponse({
      response: responseText,
      messageId,
      usage: { inputTokens, outputTokens, cost: Math.round(cost * 1_000_000) / 1_000_000 },
      rateLimits: {
        hourlyRemaining: rateResult.hourlyRemaining,
        dailyRemaining: rateResult.dailyRemaining,
      },
    }, 200, { "Cache-Control": "no-store" });

  } catch (err: any) {
    console.error("chat function error:", err);
    // Graceful error messages based on failure type
    if (err?.message?.includes("FIREBASE_SERVICE_ACCOUNT")) {
      return jsonResponse({ error: "Chat service is not configured yet. Please try again later." }, 503);
    }
    if (err?.code === "ECONNREFUSED" || err?.code === "ENOTFOUND") {
      return jsonResponse({ error: "Unable to reach the AI service. Please try again in a moment." }, 502);
    }
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
}
