/**
 * Client-side reader for the SEO/health dashboard. Pulls the latest snapshots
 * written by the scheduled functions: link-audit (seoAudits), site-health
 * (webVitals), kg-sync (kg-sync-runs), generate-meta-article (meta-article-runs).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LinkAudit } from "./link-graph";
import type { VitalsAudit } from "./web-vitals";

export interface SyncRun {
  ranAt: string;
  ok: boolean;
  players?: number;
  heroes?: number;
  matchups?: number;
  articles?: number;
  durationMs?: number;
  error?: string;
}

export interface MetaArticleRun {
  ranAt: string;
  ok: boolean;
  slug?: string;
  title?: string;
  weekLabel?: string;
  model?: string;
  spotlightHero?: string;
  error?: string;
}

export interface SeoHealthData {
  linkAudit: (LinkAudit & { durationMs?: number }) | null;
  webVitals: (VitalsAudit & { durationMs?: number }) | null;
  syncRuns: SyncRun[];
  metaArticleRuns: MetaArticleRun[];
}

/** Latest doc id in a date-keyed collection (ids are YYYY-MM-DD, so max wins). */
async function latestDateDoc<T>(col: string): Promise<T | null> {
  const snap = await getDocs(collection(db, col));
  if (snap.empty) return null;
  const ids = snap.docs.map((d) => d.id).sort();
  const newest = ids[ids.length - 1];
  const d = await getDoc(doc(db, col, newest));
  return d.exists() ? (d.data() as T) : null;
}

async function recentRuns<T>(col: string, n: number): Promise<T[]> {
  try {
    const q = query(collection(db, col), orderBy("ranAt", "desc"), limit(n));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as T);
  } catch {
    return []; // collection may not exist yet
  }
}

export async function getSeoHealthData(): Promise<SeoHealthData> {
  const [linkAudit, webVitals, syncRuns, metaArticleRuns] = await Promise.all([
    latestDateDoc<LinkAudit & { durationMs?: number }>("seoAudits"),
    latestDateDoc<VitalsAudit & { durationMs?: number }>("webVitals"),
    recentRuns<SyncRun>("kg-sync-runs", 5),
    recentRuns<MetaArticleRun>("meta-article-runs", 5),
  ]);
  return { linkAudit, webVitals, syncRuns, metaArticleRuns };
}
