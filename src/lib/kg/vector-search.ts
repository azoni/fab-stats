/**
 * Vector + hybrid search over the Player knowledge graph.
 *
 * Three retrieval modes, all backed by the Neo4j native vector index
 * `player_playstyle` (384-dim, cosine):
 *
 *   1. findSimilarPlayers(id)       — player → nearest players (uses stored vector)
 *   2. searchPlayersByText(query)   — free-text → players (embeds query, then ANN)
 *   3. hybridSimilar(id, filters)   — ANN + graph constraints in ONE Cypher query
 *
 * Mode 3 is the reason the vectors live in the graph: vector similarity and
 * relationship filters compose without a client-side join.
 */
import { runCypher, int } from "./neo4j-client";

export interface SimilarPlayer {
  id: string;
  displayName: string;
  username: string;
  topHero: string | null;
  winRate: number;
  totalMatches: number;
  playstyleCard: string;
  /** Cosine similarity in [0,1]; higher = closer. */
  score: number;
}

interface RawRow {
  id: string;
  displayName: string;
  username: string;
  topHero: string | null;
  winRate: number;
  totalMatches: number;
  playstyleCard: string;
  score: number;
}

function toSimilar(rows: RawRow[]): SimilarPlayer[] {
  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName ?? r.username ?? r.id,
    username: r.username ?? "",
    topHero: r.topHero ?? null,
    winRate: typeof r.winRate === "number" ? r.winRate : Number(r.winRate ?? 0),
    totalMatches:
      typeof r.totalMatches === "number"
        ? r.totalMatches
        : Number(r.totalMatches ?? 0),
    playstyleCard: r.playstyleCard ?? "",
    score: typeof r.score === "number" ? r.score : Number(r.score ?? 0),
  }));
}

/**
 * Players whose playstyle vector is nearest to the given player's.
 * Over-fetches by 1 and drops the player itself.
 */
export async function findSimilarPlayers(
  playerId: string,
  k = 10,
): Promise<SimilarPlayer[]> {
  const rows = await runCypher<RawRow>(
    `MATCH (p:Player {id: $id})
     WHERE p.playstyleEmbedding IS NOT NULL
     CALL db.index.vector.queryNodes('player_playstyle', $k, p.playstyleEmbedding)
     YIELD node AS s, score
     WHERE s.id <> $id
     RETURN s.id AS id, s.displayName AS displayName, s.username AS username,
            s.topHero AS topHero, s.winRate AS winRate,
            s.totalMatches AS totalMatches, s.playstyleCard AS playstyleCard,
            score
     ORDER BY score DESC`,
    { id: playerId, k: int(k + 1) },
  );
  return toSimilar(rows).slice(0, k);
}

/**
 * Free-text semantic search. Caller supplies the query embedding (so this
 * module stays free of the embedding model — important for edge/runtime
 * environments where the 90MB model can't load).
 */
export async function searchPlayersByVector(
  queryVector: number[],
  k = 10,
): Promise<SimilarPlayer[]> {
  const rows = await runCypher<RawRow>(
    `CALL db.index.vector.queryNodes('player_playstyle', $k, $vec)
     YIELD node AS s, score
     RETURN s.id AS id, s.displayName AS displayName, s.username AS username,
            s.topHero AS topHero, s.winRate AS winRate,
            s.totalMatches AS totalMatches, s.playstyleCard AS playstyleCard,
            score
     ORDER BY score DESC`,
    { vec: queryVector, k: int(k) },
  );
  return toSimilar(rows);
}

export interface HybridFilters {
  /** Restrict to players who main this hero. */
  sameTopHero?: string;
  /** Restrict to teammates of the seed player. */
  sameTeam?: boolean;
  /** Minimum tracked matches (filters out low-sample noise). */
  minMatches?: number;
}

/**
 * The headline query: nearest-neighbour search composed with graph filters
 * in a single round-trip. Over-fetches (ANN k=50) then applies relationship
 * predicates so the filters don't starve the vector search.
 */
export async function hybridSimilar(
  playerId: string,
  filters: HybridFilters = {},
  k = 10,
): Promise<SimilarPlayer[]> {
  const predicates: string[] = ["s.id <> $id"];
  if (filters.sameTopHero) predicates.push("s.topHero = $sameTopHero");
  if (typeof filters.minMatches === "number")
    predicates.push("s.totalMatches >= $minMatches");
  if (filters.sameTeam)
    predicates.push(
      "EXISTS { (s)-[:MEMBER_OF_TEAM]->(:Team)<-[:MEMBER_OF_TEAM]-(p) }",
    );

  const rows = await runCypher<RawRow>(
    `MATCH (p:Player {id: $id})
     WHERE p.playstyleEmbedding IS NOT NULL
     CALL db.index.vector.queryNodes('player_playstyle', 50, p.playstyleEmbedding)
     YIELD node AS s, score
     WHERE ${predicates.join(" AND ")}
     RETURN s.id AS id, s.displayName AS displayName, s.username AS username,
            s.topHero AS topHero, s.winRate AS winRate,
            s.totalMatches AS totalMatches, s.playstyleCard AS playstyleCard,
            score
     ORDER BY score DESC
     LIMIT $k`,
    {
      id: playerId,
      k: int(k),
      sameTopHero: filters.sameTopHero ?? null,
      minMatches: int(filters.minMatches ?? 0),
    },
  );
  return toSimilar(rows);
}
