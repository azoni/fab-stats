"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search, Star, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import type { FavoriteEntry } from "@/lib/favorites";

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "recently";
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return "recently";
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FavoritesPage() {
  const { user, isGuest } = useAuth();
  const { favorites, isLoaded } = useFavorites();
  const [query, setQuery] = useState("");

  const filteredFavorites = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return favorites;
    return favorites.filter((fav) =>
      fav.targetDisplayName.toLowerCase().includes(q) || fav.targetUsername.toLowerCase().includes(q)
    );
  }, [favorites, query]);

  if (!user || isGuest) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-fab-border bg-fab-surface text-fab-gold">
          <Star className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-fab-text">Favorites</h1>
        <p className="mt-2 text-sm leading-6 text-fab-muted">Sign in to build a quick-access list of player profiles.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-fab-gold px-5 py-2.5 text-sm font-bold text-fab-bg transition-colors hover:bg-fab-gold-light"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="h-40 rounded-2xl border border-fab-border bg-fab-surface animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-fab-border bg-fab-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-fab-border/80 bg-[linear-gradient(135deg,rgba(25,23,18,0.96),rgba(14,15,14,0.95)_58%,rgba(17,24,22,0.92))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(245,179,57,0.16),transparent_30%),radial-gradient(circle_at_88%_22%,rgba(38,211,177,0.1),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fab-border/80 bg-fab-bg/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fab-gold">
              <Star className="h-3.5 w-3.5" />
              Saved profiles
            </div>
            <h1 className="mt-4 text-3xl font-black text-fab-text sm:text-4xl">Favorites</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-fab-muted sm:text-base">
              Keep your most-watched players close for quick profile checks, trends, and matchup prep.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <FavoriteMetric label="Saved" value={favorites.length.toLocaleString()} />
            <FavoriteMetric label="Visible" value={filteredFavorites.length.toLocaleString()} tone="green" />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-fab-border/80 bg-fab-surface/85 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col gap-3 border-b border-fab-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-fab-text">Watchlist</h2>
            <p className="text-xs text-fab-muted">Players you have starred from profile pages.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search favorites..."
              className="w-full rounded-lg border border-fab-border/80 bg-fab-bg/70 py-2 pl-9 pr-3 text-sm text-fab-text shadow-inner shadow-black/10 placeholder:text-fab-dim focus:border-fab-gold/50 focus:bg-fab-surface/95 focus:outline-none"
            />
          </div>
        </div>

        {filteredFavorites.length === 0 ? (
          <EmptyFavorites hasFavorites={favorites.length > 0} query={query} />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {filteredFavorites.map((fav) => (
              <FavoriteCard key={fav.targetUserId} favorite={fav} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FavoriteMetric({ label, value, tone = "gold" }: { label: string; value: string; tone?: "gold" | "green" }) {
  return (
    <div className="rounded-xl border border-fab-border/70 bg-fab-bg/45 px-4 py-3 shadow-inner shadow-black/10">
      <p className={`text-xl font-black leading-none ${tone === "green" ? "text-emerald-300" : "text-fab-gold"}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-fab-dim">{label}</p>
    </div>
  );
}

function FavoriteCard({ favorite }: { favorite: FavoriteEntry }) {
  return (
    <Link
      href={`/player/${favorite.targetUsername}`}
      className="group flex items-center gap-3 rounded-xl border border-fab-border/80 bg-fab-bg/40 p-3 transition-colors hover:border-fab-gold/50 hover:bg-fab-gold/10"
    >
      {favorite.targetPhotoUrl ? (
        <img
          src={favorite.targetPhotoUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full border border-fab-border/80 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-fab-gold/25 bg-fab-gold/15 text-base font-black text-fab-gold">
          {favorite.targetDisplayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold text-fab-text transition-colors group-hover:text-fab-gold">{favorite.targetDisplayName}</div>
        <div className="text-xs text-fab-dim">@{favorite.targetUsername}</div>
        <div className="mt-1 text-[11px] text-fab-muted">Saved {timeAgo(favorite.createdAt)}</div>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-fab-dim transition-colors group-hover:text-fab-gold" />
    </Link>
  );
}

function EmptyFavorites({ hasFavorites, query }: { hasFavorites: boolean; query: string }) {
  return (
    <div className="px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-fab-border bg-fab-bg text-fab-dim">
        {hasFavorites ? <Search className="h-6 w-6" /> : <Star className="h-6 w-6" />}
      </div>
      <p className="font-bold text-fab-text">{hasFavorites ? "No matching favorites" : "No favorites yet"}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-fab-dim">
        {hasFavorites
          ? `No saved players match "${query.trim()}".`
          : "Visit a player profile and tap the star to add them to this watchlist."}
      </p>
      {!hasFavorites && (
        <Link
          href="/search"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-fab-border bg-fab-bg px-3 py-2 text-sm font-bold text-fab-muted transition-colors hover:border-fab-gold/50 hover:text-fab-gold"
        >
          <UserPlus className="h-4 w-4" />
          Find Players
        </Link>
      )}
    </div>
  );
}
