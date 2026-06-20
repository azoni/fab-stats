/**
 * Local sentence embeddings (MiniLM, 384-dim, normalized) — vendored from
 * fab-stats src/lib/kg/embeddings.ts. Zero API cost; the SAME vector space the
 * Neo4j player index uses, so one warm model serves both pgvector retrieval and
 * the find_similar_players tool. Swappable for a hosted embed model behind this
 * same `embed()` signature later.
 */
import { pipeline, env, type FeatureExtractionPipeline } from "@xenova/transformers";

env.allowLocalModels = false; // always pull from the HF hub cache

export const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBED_DIM = 384;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", EMBED_MODEL) as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
}

/** Embed one string → a 384-dim unit vector. */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

/** Embed many strings sequentially (the model is single-instance / warm). */
export async function embedAll(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) out.push(await embed(t));
  return out;
}
