"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStoreDirectory, type StoreDirectoryEntry } from "@/lib/store-directory";
import { Info, Search, Store as StoreIcon, Users } from "lucide-react";

type SortMode = "matches" | "players" | "alpha";

export default function StoresHub() {
  const [directory, setDirectory] = useState<StoreDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("matches");

  useEffect(() => {
    let cancelled = false;
    getStoreDirectory()
      .then((d) => {
        if (!cancelled) setDirectory(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q ? directory.filter((d) => d.name.toLowerCase().includes(q)) : directory;
    list = [...list];
    if (sort === "matches") list.sort((a, b) => b.totalMatches - a.totalMatches);
    else if (sort === "players") list.sort((a, b) => b.uniquePlayers - a.uniquePlayers);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [directory, query, sort]);

  const totalMatches = directory.reduce((acc, d) => acc + d.totalMatches, 0);
  const totalPlayers = useMemo(() => {
    // unique player set is not stored at this level (only count per store);
    // approximate by max — informational only.
    return directory.reduce((m, d) => Math.max(m, d.uniquePlayers), 0);
  }, [directory]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-fab-gold sm:text-4xl">
          <StoreIcon className="mr-2 inline h-7 w-7 align-[-3px]" /> Stores
        </h1>
        <p className="mt-2 text-sm text-fab-dim sm:text-base">
          Every Flesh and Blood game store any FaB Stats player has logged a match at.
          Stores appear here automatically from imported match data — no registration needed.
        </p>
        <p className="mt-1 text-xs text-fab-dim">
          <Info className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
          Stores are used in{" "}
          <Link href="/leagues" className="text-fab-gold underline-offset-2 hover:underline">
            community leagues
          </Link>{" "}
          — pick a set of stores, set a date window, and run your own competition.
        </p>
      </header>

      {!loading && directory.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2 sm:max-w-md">
          <Stat label="Stores" value={directory.length.toLocaleString()} />
          <Stat label="Total matches" value={totalMatches.toLocaleString()} />
          <Stat label="Top store size" value={`${totalPlayers}+`} sub="players" />
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
          <input
            className="store-search"
            placeholder="Search stores by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-fab-dim">
          <span>Sort:</span>
          {(["matches", "players", "alpha"] as SortMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSort(m)}
              className={`rounded-md border px-2 py-1 font-bold transition-colors ${
                sort === m
                  ? "border-fab-gold bg-fab-gold/10 text-fab-gold"
                  : "border-fab-border/60 bg-fab-bg/60 text-fab-dim hover:text-fab-text"
              }`}
            >
              {m === "matches" ? "Most matches" : m === "players" ? "Most players" : "A–Z"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-fab-dim">Loading store directory…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-6 text-center text-fab-dim">
          {query
            ? "No stores match that search."
            : "No stores yet — once players import matches, their venues will show up here."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.slice(0, 300).map((s) => (
            <li
              key={s.slug}
              className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-3 shadow-inner shadow-black/10 transition-colors hover:border-fab-gold/40"
            >
              <Link href={`/stores/${s.slug}`} className="block">
                <h2 className="truncate text-base font-bold text-fab-gold">{s.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fab-dim">
                  <span className="inline-flex items-center gap-1">
                    <StoreIcon className="h-3 w-3" /> {s.totalMatches.toLocaleString()} matches
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {s.uniquePlayers} player
                    {s.uniquePlayers === 1 ? "" : "s"}
                  </span>
                  {s.totalMatches > 0 && (
                    <span className="text-fab-text">
                      {Math.round((s.totalWins / s.totalMatches) * 1000) / 10}% community W/R
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {filtered.length > 300 && (
        <p className="mt-3 text-center text-xs text-fab-dim">
          Showing first 300 — refine the search to narrow down.
        </p>
      )}

      <style jsx>{`
        :global(.store-search) {
          width: 100%;
          border-radius: 6px;
          border: 1px solid rgb(var(--fab-border) / 0.7);
          background: rgb(var(--fab-bg) / 0.6);
          color: rgb(var(--fab-text));
          padding: 6px 10px 6px 30px;
          font-size: 14px;
        }
        :global(.store-search:focus) {
          outline: 2px solid rgb(var(--fab-gold) / 0.6);
          outline-offset: -1px;
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 px-3 py-2 shadow-inner shadow-black/10">
      <p className="text-lg font-black leading-none text-fab-gold">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-fab-dim">
        {label}
        {sub && <span className="ml-1 lowercase">{sub}</span>}
      </p>
    </div>
  );
}
