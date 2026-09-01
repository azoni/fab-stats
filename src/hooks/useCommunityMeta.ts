"use client";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLeaderboardEntries } from "@/lib/leaderboard";
import { computeMetaStats, type CommunityOverview, type HeroMetaStats } from "@/lib/meta-stats";
import { useAuth } from "@/contexts/AuthContext";

export interface CommunityMeta {
  overview: CommunityOverview;
  heroStats: HeroMetaStats[];
}

export const EMPTY_COMMUNITY_META: CommunityMeta = {
  overview: { totalPlayers: 0, totalMatches: 0, totalHeroes: 0, totalEvents: 0, avgWinRate: 0 },
  heroStats: [],
};

const CACHE_TTL = 30 * 60_000;
const DOC_STALE_MS = 12 * 60 * 60_000;
const cache: Record<"guest" | "auth", { meta: CommunityMeta; ts: number } | null> = { guest: null, auth: null };

/**
 * computeMetaStats() over the community, as the logged-out home shows it.
 * Served from community/_meta_home(_auth), which the leaderboard compactor
 * recomputes every full run; before the first publish (or if it goes stale)
 * this computes it client-side from the raw scan exactly as before.
 */
async function loadCommunityMeta(isAuthenticated: boolean): Promise<CommunityMeta> {
  const tier = isAuthenticated ? "auth" : "guest";
  const hit = cache[tier];
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.meta;

  let meta: CommunityMeta | null = null;
  try {
    const snap = await getDoc(doc(db, "community", isAuthenticated ? "_meta_home_auth" : "_meta_home"));
    if (snap.exists()) {
      const d = snap.data() as Partial<CommunityMeta> & { v?: number; updatedAt?: string };
      const age = d.updatedAt ? Date.now() - Date.parse(d.updatedAt) : Infinity;
      if (d.v === 1 && d.overview && Array.isArray(d.heroStats) && age < DOC_STALE_MS) {
        meta = { overview: d.overview, heroStats: d.heroStats };
      }
    }
  } catch {
    /* fall through to the client-side computation */
  }
  if (!meta) {
    const entries = await getLeaderboardEntries(true, isAuthenticated);
    meta = computeMetaStats(entries);
  }
  cache[tier] = { meta, ts: Date.now() };
  return meta;
}

export function useCommunityMeta(enabled: boolean): CommunityMeta {
  const { user, loading: authLoading } = useAuth();
  const [meta, setMeta] = useState<CommunityMeta | null>(null);

  useEffect(() => {
    if (!enabled || authLoading) return;
    let cancelled = false;
    loadCommunityMeta(!!user)
      .then((m) => {
        if (!cancelled) setMeta(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, authLoading, user]);

  return meta ?? EMPTY_COMMUNITY_META;
}
