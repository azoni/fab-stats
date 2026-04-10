"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PenSquare, Search } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import { useAuth } from "@/contexts/AuthContext";
import { getPublishedArticles } from "@/lib/articles";
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
    getPublishedArticles(150).then((items) => {
      setArticles(items);
      setLoading(false);
    }).catch(() => setLoading(false));
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
      <div className="flex flex-col gap-4 rounded-lg border border-fab-border bg-fab-surface p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-fab-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-fab-gold">
              Articles
              <span className="rounded-full bg-fab-bg px-2 py-0.5 text-[10px] text-fab-dim">Beta</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-fab-text">Stories, tech, and tournament notes.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-fab-muted">
              Follow writer notes from around the community, filter by hero or author, and dig into the pieces worth sharing.
            </p>
          </div>

          <Link
            href="/articles/new"
            className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold ${
              isAdmin
                ? "border-fab-gold/35 bg-fab-gold/10 text-fab-gold hover:bg-fab-gold/15"
                : "border-fab-border bg-fab-bg text-fab-dim"
            }`}
          >
            <PenSquare className="w-4 h-4" />
            {isAdmin ? "Write Article" : "Composer Beta"}
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr),minmax(180px,1fr),minmax(180px,1fr)]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, notes, heroes, and tags"
              className="w-full rounded-md border border-fab-border bg-fab-bg px-10 py-2.5 text-sm text-fab-text outline-none focus:border-fab-gold/40"
            />
          </label>

          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="rounded-md border border-fab-border bg-fab-bg px-3 py-2.5 text-sm text-fab-text outline-none focus:border-fab-gold/40"
          >
            <option value="all">All authors</option>
            {authorOptions.map(([username, displayName]) => (
              <option key={username} value={username}>{displayName}</option>
            ))}
          </select>

          <select
            value={heroFilter}
            onChange={(e) => setHeroFilter(e.target.value)}
            className="rounded-md border border-fab-border bg-fab-bg px-3 py-2.5 text-sm text-fab-text outline-none focus:border-fab-gold/40"
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
