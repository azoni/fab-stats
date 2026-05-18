/**
 * Playstyle embeddings.
 *
 * The core lesson here: a useful embedding is NOT of raw numbers — it's of a
 * well-composed natural-language *representation*. Two players who both "main
 * one aggressive hero and grind ProQuests" should land near each other in
 * vector space even if their exact win rates differ. So we first turn a
 * player's stats into a "playstyle card" sentence, then embed that.
 *
 * Model: all-MiniLM-L6-v2 (384-dim, cosine). Runs locally via Transformers.js
 * — no API key, no cost. Swap `embed()` for a hosted API at scale; the rest
 * of the pipeline (cards, vector index, queries) is unchanged.
 *
 * Dependency-free except @xenova/transformers — callers resolve hero metadata
 * and pass it in, so this module stays trivially testable.
 */
import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMS = 384;

let _embedder: Promise<FeatureExtractionPipeline> | null = null;

/** Lazy singleton — the model (~90MB) downloads once on first use, then caches. */
function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!_embedder) {
    _embedder = pipeline("feature-extraction", EMBEDDING_MODEL) as Promise<FeatureExtractionPipeline>;
  }
  return _embedder;
}

/** Encode one string → 384-dim unit vector (mean-pooled + L2-normalized). */
export async function embed(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

/** Encode many strings. Sequential — MiniLM is fast and this avoids RAM spikes. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) out.push(await embed(t));
  return out;
}

// ── Playstyle feature → text ──

export interface PlaystyleInput {
  displayName: string;
  topHero?: string | null;
  /** Hero metadata for topHero, resolved by the caller (keeps this module decoupled). */
  topHeroClasses?: string[];
  topHeroTalents?: string[];
  winRate?: number;
  totalMatches?: number;
  uniqueHeroes?: number;
  /** [{hero, matches, winRate}] sorted desc by matches — top few used. */
  heroBreakdown?: { hero: string; matches: number; winRate: number }[];
  eventsPlayed?: number;
  totalTop8s?: number;
  top8sByEventType?: Record<string, number>;
  longestWinStreak?: number;
  uniqueVenues?: number;
  nemesis?: string;
}

function tier(matches: number): string {
  if (matches >= 1000) return "extremely high-volume veteran";
  if (matches >= 400) return "high-volume dedicated";
  if (matches >= 150) return "regular competitive";
  if (matches >= 40) return "casual-competitive";
  return "newer / low-sample";
}

function skill(winRate: number): string {
  if (winRate >= 65) return "elite win rate";
  if (winRate >= 57) return "strong win rate";
  if (winRate >= 50) return "above-average win rate";
  if (winRate >= 43) return "even win rate";
  return "developing win rate";
}

/**
 * Specialist (few heroes, deep) vs generalist (many heroes, shallow).
 * Uses the share of matches on the single most-played hero.
 */
function focus(input: PlaystyleInput): string {
  const total = input.totalMatches ?? 0;
  const topMatches = input.heroBreakdown?.[0]?.matches ?? 0;
  if (total === 0) return "unestablished hero pool";
  const share = topMatches / total;
  if ((input.uniqueHeroes ?? 0) <= 2 || share >= 0.7) return "deep specialist who mains a single hero";
  if (share >= 0.45) return "focused player with a clear main and a small backup pool";
  if ((input.uniqueHeroes ?? 0) >= 10) return "broad generalist who plays the whole field";
  return "flexible player who rotates a few heroes";
}

function competitiveLevel(input: PlaystyleInput): string {
  const t8 = input.totalTop8s ?? 0;
  if (t8 >= 8) return `proven tournament performer with ${t8} Top 8 finishes`;
  if (t8 >= 3) return `solid tournament results (${t8} Top 8 finishes)`;
  if (t8 >= 1) return `has tournament Top 8 experience`;
  if ((input.eventsPlayed ?? 0) >= 10) return "active event grinder without deep runs yet";
  return "primarily local / casual play";
}

/**
 * Compose the playstyle card. This sentence is what actually gets embedded —
 * the quality of similarity search lives or dies here.
 */
export function buildPlaystyleCard(input: PlaystyleInput): string {
  const parts: string[] = [];

  const heroId = input.topHero && input.topHero !== "Unknown"
    ? input.topHero
    : null;
  const heroDesc = heroId
    ? `${heroId}${input.topHeroClasses?.length ? ` (${input.topHeroClasses.join("/")}${input.topHeroTalents?.length ? ", " + input.topHeroTalents.join("/") : ""})` : ""}`
    : "no established main hero";

  parts.push(
    `Flesh and Blood TCG player. Main hero: ${heroDesc}.`,
  );

  const others = (input.heroBreakdown ?? [])
    .slice(1, 4)
    .map((h) => h.hero)
    .filter((h) => h && h !== "Unknown");
  if (others.length) parts.push(`Also plays ${others.join(", ")}.`);

  parts.push(
    `${tier(input.totalMatches ?? 0)} player with ${Math.round(input.winRate ?? 0)}% win rate (${skill(input.winRate ?? 0)}) across ${input.totalMatches ?? 0} tracked matches.`,
  );

  parts.push(`Hero approach: ${focus(input)}.`);
  parts.push(`Competitive profile: ${competitiveLevel(input)}.`);

  const eventTypes = Object.keys(input.top8sByEventType ?? {});
  if (eventTypes.length) {
    parts.push(`Performs in ${eventTypes.join(", ")} events.`);
  }

  if ((input.uniqueVenues ?? 0) >= 8) {
    parts.push(`Travels widely — played at ${input.uniqueVenues} venues.`);
  } else if ((input.uniqueVenues ?? 0) > 0) {
    parts.push(`Plays a local circuit (${input.uniqueVenues} venues).`);
  }

  if ((input.longestWinStreak ?? 0) >= 12) {
    parts.push(`Capable of long dominant runs (best streak ${input.longestWinStreak}).`);
  }

  if (input.nemesis && input.nemesis !== "Unknown") {
    parts.push(`Historically struggles against ${input.nemesis}.`);
  }

  return parts.join(" ");
}

/** Cosine similarity for two unit vectors (sanity-check / non-Neo4j paths). */
export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are already L2-normalized
}
