import { doc, getDoc, getDocFromCache } from "firebase/firestore";
import { db } from "./firebase";
import {
  COMPACT_FORMAT_VERSION,
  fromCompactRow,
  type CompactManifest,
  type CompactRow,
  type CompactShard,
} from "./leaderboard-compact-format";
import type { LeaderboardEntry } from "@/types";

/** Snapshot older than this means the compactor is not running — callers
 *  fall back to the raw scan rather than show stale ranks. */
const STALE_MS = 3 * 60 * 60_000;

/**
 * Read one tier of the compact leaderboard snapshot. Returns null when the
 * snapshot is absent, stale, torn (a shard from a different publish), or the
 * wrong format version — the caller then runs the raw collection scan.
 *
 * Reads: 1 manifest (always from the server, it is tiny) + one per shard.
 * Shards are served from the Firestore SDK's persistent IndexedDB cache when
 * their `updatedAt` still matches the manifest, so a reload or new tab pays
 * one billed read instead of re-downloading ~2–3 MB.
 */
export async function readCompactLeaderboard(isAuthenticated: boolean): Promise<LeaderboardEntry[] | null> {
  const base = isAuthenticated ? "_lb_auth" : "_lb_guest";
  const manSnap = await getDoc(doc(db, "community", base));
  if (!manSnap.exists()) return null;
  const man = manSnap.data() as Partial<CompactManifest>;
  if (man.v !== COMPACT_FORMAT_VERSION || !man.shards || !Array.isArray(man.fields) || !man.updatedAt) return null;
  const age = Date.now() - Date.parse(man.touchedAt || man.updatedAt);
  if (!Number.isFinite(age) || age > STALE_MS) return null;

  const rows: CompactRow[] = [];
  for (let i = 0; i < man.shards; i++) {
    const ref = doc(db, "community", `${base}_${i}`);
    let shard: CompactShard | null = null;
    try {
      const cached = await getDocFromCache(ref);
      if (cached.exists()) {
        const d = cached.data() as CompactShard;
        if (d.updatedAt === man.updatedAt) shard = d;
      }
    } catch {
      /* nothing cached (or persistence unavailable) — read from the server */
    }
    if (!shard) {
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      shard = snap.data() as CompactShard;
      if (shard.updatedAt !== man.updatedAt) return null; // torn publish
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(shard.data);
    } catch {
      return null;
    }
    if (!Array.isArray(parsed)) return null;
    for (const row of parsed as CompactRow[]) rows.push(row);
  }
  return rows.map((row) => fromCompactRow(man.fields!, row));
}
