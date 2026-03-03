"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { KUDOS_TYPES, loadKudosLeaderboard, type KudosLeaderEntry } from "@/lib/kudos";
import { getProfile } from "@/lib/firestore-storage";

interface ProfileInfo {
  displayName: string;
  username: string;
  photoUrl?: string;
}

export function KudosLeaderboard() {
  const [selectedCategory, setSelectedCategory] = useState("total");
  const [entries, setEntries] = useState<KudosLeaderEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);

  const categories = useMemo(() => [
    { id: "total", label: "Overall" },
    ...KUDOS_TYPES.map((kt) => ({ id: kt.id, label: kt.label })),
  ], []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadKudosLeaderboard(selectedCategory, 10).then(async (data) => {
      if (cancelled) return;
      setEntries(data);

      // Load profiles for any new UIDs
      const newUids = data.map((e) => e.uid).filter((uid) => !profiles[uid]);
      if (newUids.length > 0) {
        const fetched: Record<string, ProfileInfo> = {};
        await Promise.all(
          newUids.map(async (uid) => {
            const p = await getProfile(uid).catch(() => null);
            if (p) fetched[uid] = { displayName: p.displayName, username: p.username, photoUrl: p.photoUrl };
          })
        );
        if (!cancelled) setProfiles((prev) => ({ ...prev, ...fetched }));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-fab-border flex items-center justify-between">
        <h3 className="text-xs font-semibold text-fab-text">Kudos Leaders</h3>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-fab-border overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? "bg-fab-gold/15 text-fab-gold"
                : "text-fab-muted hover:text-fab-text"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Leaderboard list */}
      <div className="min-h-[120px]">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-4 h-4 border-2 border-fab-gold/30 border-t-fab-gold rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-fab-dim text-xs py-6">No kudos yet</p>
        ) : (
          entries.map((entry, i) => {
            const p = profiles[entry.uid];
            return (
              <div key={entry.uid} className={`flex items-center gap-2.5 px-4 py-2 ${i > 0 ? "border-t border-fab-border" : ""}`}>
                <span className={`text-xs font-bold w-4 text-center shrink-0 ${
                  i === 0 ? "text-amber-400" : i < 3 ? "text-fab-text" : "text-fab-dim"
                }`}>
                  {i + 1}
                </span>
                {p?.photoUrl ? (
                  <img src={p.photoUrl} alt="" className="w-5 h-5 rounded-full shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-fab-gold/20 flex items-center justify-center shrink-0">
                    <span className="text-[8px] font-bold text-fab-gold">
                      {p?.displayName?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                {p?.username ? (
                  <Link href={`/player/${p.username}`} className="text-xs font-medium text-fab-text hover:text-fab-gold transition-colors truncate flex-1">
                    {p.displayName}
                  </Link>
                ) : (
                  <span className="text-xs text-fab-muted truncate flex-1">Unknown</span>
                )}
                <span className="text-xs font-bold text-fab-gold tabular-nums shrink-0">{entry.count}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
