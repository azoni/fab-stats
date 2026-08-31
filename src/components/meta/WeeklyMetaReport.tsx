"use client";

/**
 * "This week in the meta" — renders the newest PUBLISHED article from the
 * weekly meta-article pipeline inline on /meta. The generator writes drafts
 * every Monday; a human publishes via the admin console. Renders nothing when
 * no published article exists, so the card is inert until one ships.
 *
 * Reads are cheap: equality filter (no composite index needed), client-side
 * sort, 30-minute localStorage cache.
 */
import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Newspaper } from "lucide-react";
import { db } from "@/lib/firebase";
import { ArticleBlocks } from "@/components/articles/ArticleBlocks";
import type { ArticleRecord } from "@/types";

const CACHE_KEY = "fab_weekly_meta_article";
const CACHE_TTL = 30 * 60 * 1000;

async function getLatestPublishedArticle(): Promise<ArticleRecord | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { article, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return article;
    }
  } catch {}

  try {
    const snap = await getDocs(
      query(collection(db, "articles"), where("status", "==", "published"), limit(25)),
    );
    const articles = snap.docs.map((d) => d.data() as ArticleRecord);
    articles.sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));
    const article = articles[0] ?? null;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ article, ts: Date.now() }));
    } catch {}
    return article;
  } catch {
    return null;
  }
}

export function WeeklyMetaReport() {
  const [article, setArticle] = useState<ArticleRecord | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getLatestPublishedArticle().then(setArticle).catch(() => {});
  }, []);

  if (!article) return null;

  const dateLabel = (article.publishedAt || article.createdAt).slice(0, 10);

  return (
    <div className="mt-8">
      <div className="mb-1 flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-fab-muted" />
        <h2 className="text-sm font-semibold text-fab-text">This week in the meta</h2>
        <span className="text-[10px] text-fab-dim">{dateLabel}</span>
      </div>
      <div className="rounded-lg border border-fab-border bg-fab-surface/95 p-4">
        <h3 className="text-base font-bold text-fab-gold">{article.title}</h3>
        {!expanded ? (
          <>
            {article.excerpt && <p className="mt-1.5 text-sm text-fab-muted">{article.excerpt}</p>}
            <button
              onClick={() => setExpanded(true)}
              className="mt-2.5 text-xs font-semibold text-fab-gold hover:underline"
            >
              Read the full report
            </button>
          </>
        ) : (
          <>
            <div className="mt-3">
              <ArticleBlocks blocks={article.contentBlocks ?? []} />
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="mt-3 text-xs font-semibold text-fab-muted transition-colors hover:text-fab-gold"
            >
              Collapse
            </button>
          </>
        )}
      </div>
    </div>
  );
}
