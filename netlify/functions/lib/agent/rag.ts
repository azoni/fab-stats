/**
 * Firestore-native RAG: the knowledge base lives in the `ragChunks` collection
 * with a 384-dim Vector field + a vector index, queried with findNearest. No
 * Postgres / Neon — this is the whole point of the Netlify-native build.
 *
 * One-time setup (gcloud), see scripts/ingest-rag.ts header.
 */
import type { Firestore } from "firebase-admin/firestore";
import { embed, EMBED_DIM } from "./embed";

export const RAG_COLLECTION = "ragChunks";

export interface RetrievedChunk {
  sourceType: string;
  sourceId: string;
  title: string;
  url: string | null;
  content: string;
  score: number; // cosine similarity in [0,1]
}

/** Embed the query and return the top-k nearest KB chunks (cosine). */
export async function retrieveFromFirestore(db: Firestore, query: string, k = 5): Promise<RetrievedChunk[]> {
  const { FieldValue } = await import("firebase-admin/firestore");
  const qv = await embed(query);
  const snap = await db
    .collection(RAG_COLLECTION)
    .findNearest({
      vectorField: "embedding",
      queryVector: FieldValue.vector(qv),
      limit: k,
      distanceMeasure: "COSINE",
      distanceResultField: "_distance",
    })
    .get();

  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const dist = typeof data._distance === "number" ? data._distance : 1;
    return {
      sourceType: String(data.sourceType ?? ""),
      sourceId: String(data.sourceId ?? ""),
      title: String(data.title ?? ""),
      url: (data.url as string | null) ?? null,
      content: String(data.content ?? ""),
      score: 1 - dist, // Firestore returns cosine DISTANCE; unit vectors → sim = 1 - dist
    };
  });
}

export interface RagChunkInput {
  sourceType: string;
  sourceId: string;
  title: string;
  url?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
}

/** Embed + upsert one chunk (used by the ingest script). */
export async function writeChunk(db: Firestore, chunk: RagChunkInput): Promise<void> {
  const { FieldValue } = await import("firebase-admin/firestore");
  const vec = await embed(chunk.content);
  if (vec.length !== EMBED_DIM) throw new Error(`Unexpected embedding dim ${vec.length}`);
  const id = `${chunk.sourceType}__${chunk.sourceId}`.replace(/[^A-Za-z0-9_-]/g, "_");
  await db
    .collection(RAG_COLLECTION)
    .doc(id)
    .set({
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      title: chunk.title,
      url: chunk.url ?? null,
      content: chunk.content,
      metadata: chunk.metadata ?? {},
      embedding: FieldValue.vector(vec),
      updatedAt: new Date().toISOString(),
    });
}
