/** Tool registry (Netlify-native build). Reuses the vendored pure compute +
 *  Firestore admin reads; no external service. */
import type { Firestore } from "firebase-admin/firestore";
import type { Tool } from "./defs";
import { findCard } from "./cards";
import { retrieveFromFirestore } from "./rag";
import { computeOverallStats, computeHeroStats } from "./stats";
import { computeMetaStats } from "./meta-stats";
import { MatchResult, type MatchRecord, type LeaderboardEntry } from "./fab-types";

// Warm-instance leaderboard cache so meta queries don't rescan ~2,500 docs each call.
let lbCache: { list: LeaderboardEntry[]; ts: number } | null = null;
async function getLeaderboard(db: Firestore): Promise<LeaderboardEntry[]> {
  if (lbCache && Date.now() - lbCache.ts < 5 * 60 * 1000) return lbCache.list;
  const snap = await db.collection("leaderboard").get();
  const list = snap.docs.map((d) => d.data() as LeaderboardEntry);
  lbCache = { list, ts: Date.now() };
  return list;
}

async function getUserMatches(db: Firestore, uid: string): Promise<MatchRecord[]> {
  const snap = await db.collection(`users/${uid}/matches`).orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MatchRecord);
}

const searchKnowledge: Tool = {
  name: "search_knowledge",
  description:
    "Semantic search over the FaB Stats knowledge base (site guides/docs and card rules). Use for 'how does X work', strategy/guide, format, or terminology questions. Returns the most relevant passages with sources.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "A natural-language search query." },
      k: { type: "integer", description: "How many passages (default 5).", minimum: 1, maximum: 10 },
    },
    required: ["query"],
  },
  handler: async (input, ctx) => {
    const query = String(input.query ?? "");
    const k = typeof input.k === "number" ? input.k : 5;
    try {
      const hits = await retrieveFromFirestore(ctx.db, query, k);
      ctx.trace({ type: "retrieval", data: { query, hits: hits.map((h) => ({ id: h.sourceId, score: h.score })) } });
      return {
        data: { hits: hits.map((h) => ({ title: h.title, sourceType: h.sourceType, url: h.url, score: Number(h.score.toFixed(3)), content: h.content })) },
        citations: hits.map((h) => ({ id: `kb:${h.sourceType}:${h.sourceId}`, label: h.title, url: h.url, kind: "kb" as const })),
      };
    } catch {
      // No vector index / collection yet — degrade gracefully.
      return { data: { hits: [], note: "The knowledge base isn't set up in this environment yet." } };
    }
  },
};

const findCardTool: Tool = {
  name: "find_card",
  description:
    "Look up one Flesh and Blood card by exact name (or close prefix) and return its type, stats, and official rules text. Use for any question about what a specific named card does.",
  input_schema: { type: "object", properties: { name: { type: "string", description: "The card name (or a close prefix)." } }, required: ["name"] },
  handler: async (input) => {
    const name = String(input.name ?? "");
    const card = findCard(name);
    if (!card) return { data: { found: false, query: name } };
    return {
      data: {
        found: true,
        name: card.name,
        type: card.typeText,
        pitch: card.pitch,
        cost: card.cost,
        power: card.power,
        defense: card.defense,
        classes: card.classes,
        talents: card.talents,
        keywords: card.keywords,
        text: card.functionalText ?? "(no rules text)",
        legalFormats: card.legalFormats,
      },
      citations: [{ id: `card:${card.cardIdentifier}`, label: card.name, url: card.imageUrl || null, kind: "computed" }],
    };
  },
};

const getMetaSnapshot: Tool = {
  name: "get_meta_snapshot",
  description:
    "Community meta snapshot — the most-played heroes and their win rates across all tracked players, optionally filtered by format or event type. Use for 'most popular / best hero', meta share, or tier questions.",
  input_schema: {
    type: "object",
    properties: {
      format: { type: "string", description: "Filter to a format, e.g. 'Classic Constructed', 'Blitz'." },
      eventType: { type: "string", description: "Filter to an event type, e.g. 'Armory', 'Pro Tour'." },
      limit: { type: "integer", description: "How many top heroes (default 10).", minimum: 1, maximum: 20 },
    },
    required: [],
  },
  handler: async (input, ctx) => {
    const entries = await getLeaderboard(ctx.db);
    const format = input.format ? String(input.format) : undefined;
    const eventType = input.eventType ? String(input.eventType) : undefined;
    const limit = typeof input.limit === "number" ? input.limit : 10;
    const { overview, heroStats } = computeMetaStats(entries, format, eventType, "all");
    return {
      data: {
        filters: { format: format ?? "all", eventType: eventType ?? "all" },
        players: overview.totalPlayers,
        communityMatches: overview.totalMatches,
        topHeroes: heroStats.slice(0, limit).map((h) => ({
          hero: h.hero,
          players: h.playerCount,
          matches: h.totalMatches,
          winRate: Number(h.avgWinRate.toFixed(1)),
          metaShare: Number(h.metaShare.toFixed(1)),
        })),
        basis: `community-tracked data across ${overview.totalPlayers} players / ${overview.totalMatches} matches (self-selected sample)`,
      },
    };
  },
};

const getMyStats: Tool = {
  name: "get_my_stats",
  description:
    "The CURRENT user's personal tracked stats: overall record, win rate, current streak, and per-hero breakdown. Use for 'my win rate', 'my best hero', 'how am I doing'.",
  input_schema: { type: "object", properties: {}, required: [] },
  handler: async (_input, ctx) => {
    if (!ctx.uid) return { data: { linked: false, note: "No user context; personal stats unavailable." } };
    const matches = await getUserMatches(ctx.db, ctx.uid);
    if (!matches.length) return { data: { linked: true, totalMatches: 0, note: "No tracked matches yet." } };
    const o = computeOverallStats(matches);
    const heroes = computeHeroStats(matches).slice(0, 6);
    return {
      data: {
        linked: true,
        overall: { matches: o.totalMatches, wins: o.totalWins, losses: o.totalLosses, draws: o.totalDraws, winRate: Number(o.overallWinRate.toFixed(1)) },
        streak: o.streaks.currentStreak ? `${o.streaks.currentStreak.count} ${o.streaks.currentStreak.type}` : "none",
        topHeroes: heroes.map((h) => ({ hero: h.heroName, matches: h.totalMatches, wins: h.wins, losses: h.losses, winRate: Number(h.winRate.toFixed(1)) })),
        basis: `over ${o.totalMatches} tracked matches`,
      },
    };
  },
};

const getMatchup: Tool = {
  name: "get_matchup",
  description: "The current user's record with one of THEIR heroes against a specific opponent hero. Use for 'how do I do with X into Y'.",
  input_schema: {
    type: "object",
    properties: { hero: { type: "string", description: "The user's hero." }, vsHero: { type: "string", description: "The opponent hero." } },
    required: ["hero", "vsHero"],
  },
  handler: async (input, ctx) => {
    if (!ctx.uid) return { data: { linked: false, note: "No user context; matchup unavailable." } };
    const hero = String(input.hero ?? "").toLowerCase();
    const vs = String(input.vsHero ?? "").toLowerCase();
    const matches = await getUserMatches(ctx.db, ctx.uid);
    const relevant = matches.filter(
      (m) => (m.heroPlayed ?? "").toLowerCase().includes(hero) && (m.opponentHero ?? "").toLowerCase().includes(vs) && m.result !== MatchResult.Bye,
    );
    let wins = 0;
    let losses = 0;
    let draws = 0;
    for (const m of relevant) {
      if (m.result === MatchResult.Win) wins++;
      else if (m.result === MatchResult.Loss) losses++;
      else if (m.result === MatchResult.Draw) draws++;
    }
    const total = wins + losses + draws;
    return {
      data: {
        hero: input.hero,
        vsHero: input.vsHero,
        wins,
        losses,
        draws,
        total,
        winRate: total ? Number(((wins / total) * 100).toFixed(1)) : null,
        basis: total ? `over ${total} tracked matches` : "no tracked matches for this pairing",
      },
    };
  },
};

export const TOOLS: Tool[] = [searchKnowledge, findCardTool, getMetaSnapshot, getMyStats, getMatchup];
export const TOOL_BY_NAME = new Map<string, Tool>(TOOLS.map((t) => [t.name, t]));
