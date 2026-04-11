"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Clock3, Eye, MessageCircle, Share2 } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import { ArticleComments } from "./ArticleComments";
import { ArticleContent } from "./ArticleContent";
import { ArticleReactionBar } from "./ArticleReactionBar";
import { useAuth } from "@/contexts/AuthContext";
import { articleHref, getArticleBySlug, getArticlesByAuthorUsername, isLikelyValidPhotoUrl } from "@/lib/articles";
import { getProfileByUsername } from "@/lib/firestore-storage";
import { trackArticleView } from "@/lib/article-views";
import type { ArticleRecord } from "@/types";

function formatDate(isoString?: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ArticleDetailClient({ initialSlug }: { initialSlug?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [article, setArticle] = useState<ArticleRecord | null>(null);
  const [related, setRelated] = useState<ArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [photoFailed, setPhotoFailed] = useState(false);
  const slug = useMemo(() => {
    const pathSlug = decodeURIComponent(pathname.split("/").pop() || "");
    return pathSlug && pathSlug !== "_" ? pathSlug : (initialSlug || "");
  }, [initialSlug, pathname]);
  const handleCommentCountChange = useCallback((count: number) => {
    setArticle((current) => current ? { ...current, commentCount: count } : current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setPhotoFailed(false);
    getArticleBySlug(slug).then((item) => {
      if (cancelled) return;
      setArticle(item);
      setLoading(false);

      if (!item) return;

      getArticlesByAuthorUsername(item.authorUsername, 4).then((items) => {
        if (!cancelled) {
          setRelated(items.filter((candidate) => candidate.id !== item.id).slice(0, 3));
        }
      }).catch(() => {});

      if (!isLikelyValidPhotoUrl(item.authorPhotoUrl)) {
        getProfileByUsername(item.authorUsername).then((authorProfile) => {
          if (cancelled || !isLikelyValidPhotoUrl(authorProfile?.photoUrl)) return;
          setArticle((current) => current ? { ...current, authorPhotoUrl: authorProfile!.photoUrl } : current);
          setPhotoFailed(false);
        }).catch(() => {});
      }

      trackArticleView(item.id, user?.uid).then((counted) => {
        if (!cancelled && counted) {
          setArticle((current) => current ? { ...current, viewCount: current.viewCount + 1 } : current);
        }
      }).catch(() => {});
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [slug, user?.uid]);

  const shareHref = useMemo(() => article ? articleHref(article.slug) : "", [article]);

  async function handleShare() {
    if (!article) return;
    const absoluteUrl = typeof window !== "undefined" ? `${window.location.origin}${shareHref}` : shareHref;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("idle");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="h-8 w-40 animate-pulse rounded bg-fab-surface" />
        <div className="h-96 animate-pulse rounded-lg border border-fab-border bg-fab-surface" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-fab-border bg-fab-surface p-8 text-center">
        <h1 className="text-2xl font-semibold text-fab-text">Article not found</h1>
        <p className="mt-2 text-sm text-fab-muted">That share link no longer points to a published article.</p>
        <Link href="/articles" className="mt-4 inline-flex text-sm font-semibold text-fab-gold hover:text-fab-gold-light">
          Back to articles
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-fab-dim hover:text-fab-gold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <Link href="/articles" className="text-sm font-medium text-fab-dim hover:text-fab-gold">
          All articles
        </Link>
      </div>

      <article className="overflow-hidden rounded-lg border border-fab-border bg-fab-surface">
        {article.coverImageUrl && (
          <img src={article.coverImageUrl} alt={article.title} className="h-[280px] w-full object-cover sm:h-[360px]" />
        )}

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            {article.heroTags.map((tag) => (
              <span key={tag} className="rounded-full bg-fab-gold/10 px-2.5 py-1 text-[11px] font-semibold text-fab-gold">
                {tag}
              </span>
            ))}
            {article.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-fab-bg px-2.5 py-1 text-[11px] text-fab-dim">
                {tag}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-tight text-fab-text sm:text-4xl">{article.title}</h1>
            <p className="max-w-3xl text-base leading-7 text-fab-muted">{article.excerpt}</p>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-fab-border bg-fab-bg p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              {isLikelyValidPhotoUrl(article.authorPhotoUrl) && !photoFailed ? (
                <img
                  src={article.authorPhotoUrl}
                  alt=""
                  className="h-11 w-11 rounded-full border border-fab-border object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-fab-gold/15 text-sm font-bold text-fab-gold">
                  {article.authorDisplayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <Link href={`/player/${article.authorUsername}`} className="block text-sm font-semibold text-fab-text hover:text-fab-gold">
                  {article.authorDisplayName}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fab-dim">
                  <span>@{article.authorUsername}</span>
                  <span>{formatDate(article.publishedAt || article.updatedAt || article.createdAt)}</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{article.readingMinutes} min</span>
                  <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{article.viewCount}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{article.commentCount}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-fab-border px-4 py-2 text-sm font-medium text-fab-text hover:border-fab-gold/35 hover:text-fab-gold"
            >
              <Share2 className="w-4 h-4" />
              {copyState === "copied" ? "Link copied" : "Share"}
            </button>
          </div>

          <ArticleReactionBar articleId={article.id} initialCounts={article.reactionCounts} />

          <div className="pt-2">
            <ArticleContent blocks={article.contentBlocks} />
          </div>
        </div>
      </article>

      <ArticleComments
        articleId={article.id}
        allowComments={article.allowComments}
        onCommentCountChange={handleCommentCountChange}
      />

      {related.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-fab-text">More from {article.authorDisplayName}</h2>
              <p className="text-sm text-fab-dim">Keep reading on the same line of thought.</p>
            </div>
            <Link href={`/articles?author=${article.authorUsername}`} className="text-sm font-medium text-fab-gold hover:text-fab-gold-light">
              View all
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {related.map((item) => (
              <ArticleCard key={item.id} article={item} compact showAuthor={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
