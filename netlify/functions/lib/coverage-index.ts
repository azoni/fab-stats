/**
 * The import-time opponent-hero lookup index, published as one gzipped JSON
 * blob in Storage by auto-scrape and read by coverage-heroes.
 *
 * coverage-heroes used to rebuild the index from a full coverage-matches scan
 * (50k–150k billed reads, multi-second) on every cold instance and every 10
 * minutes after. Now it downloads this file (one object read) and falls back
 * to the scan only when the blob is missing or behind the collection (the
 * coverage-events count is stored alongside and re-checked with one cheap
 * aggregation read).
 */
import { gzipSync, gunzipSync } from "node:zlib";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp, getAdminDb } from "../firebase-admin.ts";
import { buildCoverageIndex, type CoverageIndex, type CoverageIndexEntry } from "../../../src/lib/coverage-lookup.ts";
import type { CoverageMatch } from "../../../src/lib/sitemap-scraper.ts";

export const COVERAGE_INDEX_OBJECT = "indexes/coverage-index.json.gz";
const STORAGE_BUCKET = "fab-stats-fc757.firebasestorage.app";

interface BlobPayload {
  v: number;
  builtAt: string;
  matchCount: number;
  eventCount: number;
  index: Record<string, CoverageIndexEntry[]>;
}

export async function countCoverageEvents(): Promise<number> {
  return (await getAdminDb().collection("coverage-events").count().get()).data().count;
}

export async function writeCoverageIndexBlob(matches: Record<string, unknown>[]): Promise<number> {
  const index = buildCoverageIndex(matches as unknown as CoverageMatch[]);
  const payload: BlobPayload = {
    v: 1,
    builtAt: new Date().toISOString(),
    matchCount: matches.length,
    eventCount: await countCoverageEvents(),
    index: Object.fromEntries(index),
  };
  const body = gzipSync(Buffer.from(JSON.stringify(payload), "utf8"));
  await getStorage(getAdminApp())
    .bucket(STORAGE_BUCKET)
    .file(COVERAGE_INDEX_OBJECT)
    .save(body, { contentType: "application/json", resumable: false });
  return index.size;
}

/**
 * Download + validate the blob. Returns null when absent, unparsable, or
 * when the collection has grown since it was built (new events scraped by the
 * manual sitemap-scrape between nightly auto-scrape runs).
 */
export async function readCoverageIndexBlob(): Promise<{ index: CoverageIndex; size: number } | null> {
  try {
    const file = getStorage(getAdminApp()).bucket(STORAGE_BUCKET).file(COVERAGE_INDEX_OBJECT);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buf] = await file.download();
    const payload = JSON.parse(gunzipSync(buf).toString("utf8")) as BlobPayload;
    if (payload.v !== 1 || !payload.index) return null;
    const currentEvents = await countCoverageEvents();
    if (currentEvents !== payload.eventCount) return null;
    return { index: new Map(Object.entries(payload.index)), size: payload.matchCount };
  } catch (err) {
    console.warn("[coverage-index] blob read failed, falling back to scan:", err);
    return null;
  }
}
