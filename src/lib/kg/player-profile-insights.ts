/**
 * RAG retrieval for an auto-generated player bio.
 *
 * Reuses the graph we already built: the Phase-2 playstyle card (a scouting
 * report in prose), the corrected MATCHUP_WITH edges for the player's main
 * hero, and Phase-2 vector similarity for "plays like…". As with the meta
 * article, the bio generator may ONLY use facts returned here.
 *
 * Node-side only.
 */
import { runCypher } from "./neo4j-client";
import { findSimilarPlayers } from "./vector-search";

export interface PlayerBioInsights {
  found: boolean;
  id: string;
  displayName: string;
  username: string;
  topHero: string | null;
  winRate: number;
  totalMatches: number;
  uniqueHeroes: number;
  /** Phase-2 generated scouting sentence — rich grounding on its own. */
  playstyleCard: string;
  /** Best / worst matchups for the player's main hero (orientation-safe). */
  mainHeroBest: { opponent: string; winPct: number; games: number }[];
  mainHeroWorst: { opponent: string; winPct: number; games: number }[];
  /** Phase-2 nearest-playstyle players. */
  similarPlayers: { displayName: string; topHero: string | null; score: number }[];
  team: string | null;
}

function pct(wins: number, total: number, draws: number): number {
  const decisive = total - draws;
  if (decisive <= 0) return 0;
  return Math.round((wins / decisive) * 100);
}

/** Resolve a player by username (case-insensitive) or by node id. */
async function resolvePlayer(idOrUsername: string) {
  const rows = await runCypher<{
    id: string; displayName: string; username: string; topHero: string | null;
    winRate: number; totalMatches: number; uniqueHeroes: number;
    playstyleCard: string | null; teamName: string | null;
  }>(
    `MATCH (p:Player)
     WHERE p.id = $q OR toLower(p.username) = toLower($q)
     RETURN p.id AS id, p.displayName AS displayName, p.username AS username,
            p.topHero AS topHero, p.winRate AS winRate,
            p.totalMatches AS totalMatches, p.uniqueHeroes AS uniqueHeroes,
            p.playstyleCard AS playstyleCard, p.teamName AS teamName
     LIMIT 1`,
    { q: idOrUsername },
  );
  return rows[0] ?? null;
}

export async function getPlayerBioInsights(
  idOrUsername: string,
): Promise<PlayerBioInsights> {
  const p = await resolvePlayer(idOrUsername);
  if (!p) {
    return {
      found: false, id: "", displayName: "", username: "", topHero: null,
      winRate: 0, totalMatches: 0, uniqueHeroes: 0, playstyleCard: "",
      mainHeroBest: [], mainHeroWorst: [], similarPlayers: [], team: null,
    };
  }

  // Main hero matchup spread (orientation-safe via m.hero1 name; min 30 games).
  let mainHeroBest: PlayerBioInsights["mainHeroBest"] = [];
  let mainHeroWorst: PlayerBioInsights["mainHeroWorst"] = [];
  if (p.topHero && p.topHero !== "Unknown") {
    const rows = await runCypher<{
      opponent: string; games: number; heroWins: number; draws: number;
    }>(
      `MATCH (h:Hero {name: $hero})-[m:MATCHUP_WITH]-(opp:Hero)
       WHERE opp.name <> 'Unknown' AND m.total >= 30
       RETURN opp.name AS opponent, m.total AS games, m.draws AS draws,
              (CASE WHEN m.hero1 = h.name THEN m.hero1Wins ELSE m.hero2Wins END) AS heroWins
       ORDER BY games DESC LIMIT 25`,
      { hero: p.topHero },
    );
    const spread = rows
      .map((r) => ({
        opponent: r.opponent,
        games: Number(r.games),
        winPct: pct(Number(r.heroWins), Number(r.games), Number(r.draws)),
      }))
      .sort((a, b) => b.winPct - a.winPct);
    mainHeroBest = spread.slice(0, 3);
    mainHeroWorst = spread.slice(-3).reverse();
  }

  // Phase-2 vector similarity.
  let similarPlayers: PlayerBioInsights["similarPlayers"] = [];
  try {
    const sims = await findSimilarPlayers(p.id, 3);
    similarPlayers = sims.map((s) => ({
      displayName: s.displayName,
      topHero: s.topHero,
      score: Math.round(s.score * 1000) / 1000,
    }));
  } catch {
    // player may not have an embedding yet — bio still works without it
  }

  return {
    found: true,
    id: p.id,
    displayName: p.displayName || p.username,
    username: p.username,
    topHero: p.topHero,
    winRate: Math.round(Number(p.winRate) * 10) / 10,
    totalMatches: Number(p.totalMatches),
    uniqueHeroes: Number(p.uniqueHeroes),
    playstyleCard: p.playstyleCard ?? "",
    mainHeroBest,
    mainHeroWorst,
    similarPlayers,
    team: p.teamName ?? null,
  };
}
