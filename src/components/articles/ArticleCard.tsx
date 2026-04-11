"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, Eye, MessageCircle, Share2 } from "lucide-react";
import { articleHref, getArticlePrimaryImage } from "@/lib/articles";
import type { ArticleReactionKey, ArticleRecord } from "@/types";

function totalReactions(counts?: Partial<Record<ArticleReactionKey, number>>): number {
  return (counts?.heart ?? 0) + (counts?.fire ?? 0) + (counts?.insight ?? 0);
}

function formatDate(isoString?: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ArticleCard({
  article,
  compact = false,
  showAuthor = true,
}: {
  article: ArticleRecord;
  compact?: boolean;
  showAuthor?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const href = articleHref(article.slug);
  const imageUrl = getArticlePrimaryImage(article);
  const showPhoto = Boolean(article.authorPhotoUrl) && !photoFailed;
  const reactionTotal = useMemo(() => totalReactions(article.reactionCounts), [article.reactionCounts]);

  async function handleShare() {
    const absoluteUrl = typeof window !== "undefined" ? `${window.location.origin}${href}` : href;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={`overflow-hidden rounded-lg border border-fab-border bg-fab-surface ${compact ? "" : "shadow-sm"}`}>
      {imageUrl && (
        <Link href={href} className="block">
          <img
            src={imageUrl}
            alt={article.title}
            className={compact ? "h-40 w-full object-cover" : "h-56 w-full object-cover"}
            loading="lazy"
          />
        </Link>
      )}

      <div className={compact ? "p-4" : "p-5"}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-fab-dim">
              <span>{formatDate(article.publishedAt || article.updatedAt || article.createdAt)}</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="w-3.5 h-3.5" />
                {article.readingMinutes} min
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {article.viewCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                {article.commentCount}
              </span>
              {reactionTotal > 0 && <span>{reactionTotal} reacts</span>}
            </div>

            <Link href={href} className="mt-2 block">
              <h3 className={`font-semibold text-fab-text transition-colors hover:text-fab-gold ${compact ? "text-lg" : "text-xl"}`}>
                {article.title}
              </h3>
            </Link>

            <p className="mt-2 text-sm leading-6 text-fab-muted">{article.excerpt}</p>
          </div>

          {!compact && (
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-fab-border bg-fab-bg text-fab-dim transition-colors hover:text-fab-gold"
              title="Copy share link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {showAuthor && (
          <div className="mt-4 flex items-center gap-2">
            {showPhoto ? (
              <img
                src={article.authorPhotoUrl}
                alt=""
                className="h-8 w-8 rounded-full border border-fab-border object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fab-gold/15 text-xs font-bold text-fab-gold">
                {article.authorDisplayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <Link href={`/player/${article.authorUsername}`} className="block truncate text-sm font-medium text-fab-text hover:text-fab-gold">
                {article.authorDisplayName}
              </Link>
              <span className="text-xs text-fab-dim">@{article.authorUsername}</span>
            </div>
          </div>
        )}

        {(article.heroTags.length > 0 || article.tags.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {article.heroTags.slice(0, 3).map((tag) => (
              <span key={`hero-${tag}`} className="rounded-full bg-fab-gold/10 px-2 py-0.5 text-[11px] font-medium text-fab-gold">
                {tag}
              </span>
            ))}
            {article.tags.slice(0, Math.max(0, 4 - article.heroTags.length)).map((tag) => (
              <span key={`tag-${tag}`} className="rounded-full bg-fab-bg px-2 py-0.5 text-[11px] text-fab-dim">
                {tag}
              </span>
            ))}
          </div>
        )}

        {!compact && copied && <p className="mt-2 text-xs text-emerald-400">Link copied.</p>}
      </div>
    </article>
  );
}
