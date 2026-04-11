"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PenSquare, Search } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import { useAuth } from "@/contexts/AuthContext";
import { getPublishedArticles, isLikelyValidPhotoUrl } from "@/lib/articles";
import { getProfileByUsername } from "@/lib/firestore-storage";
import type { ArticleRecord } from "@/types";

export function ArticlesIndexClient() {
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [authorFilter, setAuthorFilter] = useState(() => searchParams.get("author") || "all");
  const [heroFilter, setHeroFilter] = useState(() => searchParams.get("hero") || "all");

  useEffect(() => {
    let cancelled = false;
    getPublishedArticles(150).then((items) => {
      if (cancelled) return;
      setArticles(items);
      setLoading(false);

      const missing = Array.from(new Set(
        items.filter((article) => !isLikelyValidPhotoUrl(article.authorPhotoUrl)).map((article) => article.authorUsername),
      ));
      if (missing.length === 0) return;

      Promise.all(missing.map(async (username) => {
        try {
          const authorProfile = await getProfileByUsername(username);
          const photoUrl = isLikelyValidPhotoUrl(authorProfile?.photoUrl) ? authorProfile!.photoUrl : undefined;
          return [username, photoUrl] as const;
        } catch {
          return [username, undefined] as const;
        }
      })).then((entries) => {
        if (cancelled) return;
        const photoMap = new Map(entries.filter(([, url]) => Boolean(url)));
        if (photoMap.size === 0) return;
        setArticles((current) => current.map((article) =>
          isLikelyValidPhotoUrl(article.authorPhotoUrl) || !photoMap.has(article.authorUsername)
            ? article
            : { ...article, authorPhotoUrl: photoMap.get(article.authorUsername) }));
      });
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const authorOptions = useMemo(() => {
    return Array.from(new Map(articles.map((article) => [article.authorUsername, article.authorDisplayName])).entries())
      .sort((a, b) => a[1].localeCompare(b[1]));
  }, [articles]);

  const heroOptions = useMemo(() => {
    return Array.from(new Set(articles.flatMap((article) => article.heroTags))).sort((a, b) => a.localeCompare(b));
  }, [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((article) => {
      if (authorFilter !== "all" && article.authorUsername !== authorFilter) return false;
      if (heroFilter !== "all" && !article.heroTags.includes(heroFilter)) return false;
      if (!q) return true;

      const haystack = [
        article.title,
        article.excerpt,
        article.authorDisplayName,
        article.authorUsername,
        article.searchText,
        article.heroTags.join(" "),
        article.tags.join(" "),
      ].join(" ").toLowerCase();

      return haystack.includes(q);
    });
  }, [articles, authorFilter, heroFilter, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-fab-border bg-fab-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-fab-text sm:text-xl">Articles</h1>
              <span className="rounded-full bg-fab-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fab-gold">Beta</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-fab-dim">Stories, tech, and tournament notes from the community.</p>
          </div>

          <Link
            href="/articles/new"
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
              isAdmin
                ? "border-fab-gold/35 bg-fab-gold/10 text-fab-gold hover:bg-fab-gold/15"
                : "border-fab-border bg-fab-bg text-fab-dim"
            }`}
          >
            <PenSquare className="w-3.5 h-3.5" />
            {isAdmin ? "Write Article" : "Composer Beta"}
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fab-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, notes, heroes, tags"
              className="w-full rounded-md border border-fab-border bg-fab-bg px-8 py-1.5 text-xs text-fab-text outline-none focus:border-fab-gold/40"
            />
          </label>

          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-xs text-fab-text outline-none focus:border-fab-gold/40 sm:w-44"
          >
            <option value="all">All authors</option>
            {authorOptions.map(([username, displayName]) => (
              <option key={username} value={username}>{displayName}</option>
            ))}
          </select>

          <select
            value={heroFilter}
            onChange={(e) => setHeroFilter(e.target.value)}
            className="rounded-md border border-fab-border bg-fab-bg px-2 py-1.5 text-xs text-fab-text outline-none focus:border-fab-gold/40 sm:w-44"
          >
            <option value="all">All heroes</option>
            {heroOptions.map((hero) => (
              <option key={hero} value={hero}>{hero}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-lg border border-fab-border bg-fab-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-fab-border bg-fab-surface p-8 text-center">
          <p className="text-sm text-fab-muted">No articles match that filter yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
