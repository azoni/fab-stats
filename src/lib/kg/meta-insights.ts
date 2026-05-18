/**
 * RAG retrieval for the weekly meta article.
 *
 * This is the "retrieve" half of retrieval-augmented generation: every fact the
 * article is allowed to state comes from here, pulled live from the knowledge
 * graph. The generator is instructed to use ONLY this data — that's the
 * anti-hallucination contract. If a number isn't in MetaInsights, the article
 * can't claim it.
 *
 * Node-side only (imports the Neo4j client).
 */
import { runCypher } from "./neo4j-client";

export interface HeroPopularity {
  hero: string;
  players: number;
}

export interface MatchupFact {
  hero: string;
  opponent: string;
  games: number;
  heroWins: number;
  oppWins: number;
  draws: number;
  /** hero win % excluding draws, rounded */
  heroWinPct: number;
}

export interface NotablePlayer {
  displayName: string;
  username: string;
  topHero: string;
  winRate: number;
  totalMatches: number;
}

export interface MetaInsights {
  generatedAt: string;
  /** ISO week label, e.g. "2026-W20" */
  weekLabel: string;
  topHeroes: HeroPopularity[];
  /** Most-played matchups across the field. */
  topMatchups: MatchupFact[];
  /** Matchup spread for the single most-popular hero. */
  spotlightHero: string | null;
  spotlightMatchups: MatchupFact[];
  /** High-performing pilots of the spotlight hero. */
  spotlightPilots: NotablePlayer[];
  totals: { players: number; heroes: number; matchupEdges: number };
}

const REAL_HERO = `h.name <> 'Unknown'`;

function isoWeek(d: Date): string {
  // ISO-8601 week number (UTC).
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function pct(wins: number, total: number, draws: number): number {
  const decisive = total - draws;
  if (decisive <= 0) return 0;
  return Math.round((wins / decisive) * 100);
}

export async function getMetaInsights(): Promise<MetaInsights> {
  // 1. Most-played heroes (by # of players whose top hero this is).
  const topHeroesRows = await runCypher<{ hero: string; players: number }>(
    `MATCH (:Player)-[:USED_HERO]->(h:Hero)
     WHERE ${REAL_HERO}
     RETURN h.name AS hero, count(*) AS players
     ORDER BY players DESC LIMIT 10`,
  );
  const topHeroes: HeroPopularity[] = topHeroesRows.map((r) => ({
    hero: r.hero,
    players: Number(r.players),
  }));

  const spotlightHero = topHeroes[0]?.hero ?? null;

  // 2. Biggest matchups across the field (by total games).
  // Edges are always created hero1 -> hero2 (hero1 = alphabetically first) and
  // carry m.hero1 / m.hero2 names. Attribute wins via the name, never by
  // position, so orientation is correct regardless of traversal direction.
  const topMatchupRows = await runCypher<{
    hero: string; opponent: string; games: number;
    heroWins: number; oppWins: number; draws: number;
  }>(
    `MATCH (a:Hero)-[m:MATCHUP_WITH]->(b:Hero)
     WHERE a.name <> 'Unknown' AND b.name <> 'Unknown'
     RETURN a.name AS hero, b.name AS opponent, m.total AS games,
            (CASE WHEN m.hero1 = a.name THEN m.hero1Wins ELSE m.hero2Wins END) AS heroWins,
            (CASE WHEN m.hero1 = a.name THEN m.hero2Wins ELSE m.hero1Wins END) AS oppWins,
            m.draws AS draws
     ORDER BY games DESC LIMIT 8`,
  );
  const topMatchups: MatchupFact[] = topMatchupRows.map((r) => {
    const games = Number(r.games);
    const hWins = Number(r.heroWins);
    const oWins = Number(r.oppWins);
    const draws = Number(r.draws);
    return {
      hero: r.hero,
      opponent: r.opponent,
      games,
      heroWins: hWins,
      oppWins: oWins,
      draws,
      heroWinPct: pct(hWins, games, draws),
    };
  });

  // 3. Spotlight hero's matchup spread.
  let spotlightMatchups: MatchupFact[] = [];
  if (spotlightHero) {
    const rows = await runCypher<{
      opponent: string; games: number;
      heroWins: number; oppWins: number; draws: number;
    }>(
      // Undirected match — the spotlight hero may be hero1 OR hero2 of the
      // edge. Attribute by name (m.hero1), not position. This was the bug that
      // flipped "Verdance vs Arakni" win counts in the first generated article.
      `MATCH (h:Hero {name: $hero})-[m:MATCHUP_WITH]-(opp:Hero)
       WHERE opp.name <> 'Unknown'
       RETURN opp.name AS opponent, m.total AS games,
              (CASE WHEN m.hero1 = h.name THEN m.hero1Wins ELSE m.hero2Wins END) AS heroWins,
              (CASE WHEN m.hero1 = h.name THEN m.hero2Wins ELSE m.hero1Wins END) AS oppWins,
              m.draws AS draws
       ORDER BY games DESC LIMIT 6`,
      { hero: spotlightHero },
    );
    spotlightMatchups = rows.map((r) => {
      const games = Number(r.games);
      const hWins = Number(r.heroWins);
      const oWins = Number(r.oppWins);
      const draws = Number(r.draws);
      return {
        hero: spotlightHero,
        opponent: r.opponent,
        games,
        heroWins: hWins,
        oppWins: oWins,
        draws,
        heroWinPct: pct(hWins, games, draws),
      };
    });
  }

  // 4. Standout pilots of the spotlight hero (min 50 matches, top win rate).
  let spotlightPilots: NotablePlayer[] = [];
  if (spotlightHero) {
    const rows = await runCypher<{
      displayName: string; username: string; winRate: number; totalMatches: number;
    }>(
      `MATCH (p:Player)-[:USED_HERO]->(h:Hero {name: $hero})
       WHERE p.totalMatches >= 50
       RETURN p.displayName AS displayName, p.username AS username,
              p.winRate AS winRate, p.totalMatches AS totalMatches
       ORDER BY p.winRate DESC LIMIT 5`,
      { hero: spotlightHero },
    );
    spotlightPilots = rows.map((r) => ({
      displayName: r.displayName,
      username: r.username,
      topHero: spotlightHero,
      winRate: Math.round(Number(r.winRate) * 10) / 10,
      totalMatches: Number(r.totalMatches),
    }));
  }

  // 5. Totals for context.
  const totalsRows = await runCypher<{ players: number; heroes: number }>(
    `MATCH (p:Player) WITH count(p) AS players
     MATCH (h:Hero) WHERE h.name <> 'Unknown'
     RETURN players, count(h) AS heroes`,
  );
  const edgeRows = await runCypher<{ edges: number }>(
    `MATCH (:Hero)-[m:MATCHUP_WITH]->(:Hero) RETURN count(m) AS edges`,
  );

  return {
    generatedAt: new Date().toISOString(),
    weekLabel: isoWeek(new Date()),
    topHeroes,
    topMatchups,
    spotlightHero,
    spotlightMatchups,
    spotlightPilots,
    totals: {
      players: Number(totalsRows[0]?.players ?? 0),
      heroes: Number(totalsRows[0]?.heroes ?? 0),
      matchupEdges: Number(edgeRows[0]?.edges ?? 0),
    },
  };
}
