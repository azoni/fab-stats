"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Heart, Lightbulb } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ARTICLE_REACTIONS, getArticleReaction, toggleArticleReaction } from "@/lib/article-reactions";
import type { ArticleReactionKey } from "@/types";

function reactionIcon(key: ArticleReactionKey) {
  if (key === "heart") return <Heart className="w-4 h-4" />;
  if (key === "fire") return <Flame className="w-4 h-4" />;
  return <Lightbulb className="w-4 h-4" />;
}

function normalizeCounts(input?: Partial<Record<ArticleReactionKey, number>>): Record<ArticleReactionKey, number> {
  return {
    heart: input?.heart ?? 0,
    fire: input?.fire ?? 0,
    insight: input?.insight ?? 0,
  };
}

export function ArticleReactionBar({
  articleId,
  initialCounts,
}: {
  articleId: string;
  initialCounts?: Partial<Record<ArticleReactionKey, number>>;
}) {
  const { user, isGuest } = useAuth();
  const [selected, setSelected] = useState<ArticleReactionKey | null>(null);
  const [counts, setCounts] = useState<Record<ArticleReactionKey, number>>(normalizeCounts(initialCounts));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCounts(normalizeCounts(initialCounts));
  }, [initialCounts]);

  useEffect(() => {
    if (!user?.uid || isGuest) {
      setSelected(null);
      return;
    }

    getArticleReaction(articleId, user.uid).then(setSelected).catch(() => setSelected(null));
  }, [articleId, isGuest, user?.uid]);

  const totalReactions = useMemo(
    () => counts.heart + counts.fire + counts.insight,
    [counts],
  );

  const canReact = !!user?.uid && !isGuest;

  async function handleToggle(nextKey: ArticleReactionKey) {
    if (!canReact || busy || !user?.uid) return;

    setBusy(true);
    const previous = selected;
    setCounts((current) => {
      const next = { ...current };
      if (previous) next[previous] = Math.max(0, next[previous] - 1);
      if (previous !== nextKey) next[nextKey] += 1;
      return next;
    });
    setSelected((current) => (current === nextKey ? null : nextKey));

    try {
      const nextSelected = await toggleArticleReaction(articleId, user.uid, nextKey);
      setSelected(nextSelected);
    } catch {
      setCounts(normalizeCounts(initialCounts));
      setSelected(previous);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ARTICLE_REACTIONS.map((reaction) => {
        const isActive = selected === reaction.key;
        return (
          <button
            key={reaction.key}
            type="button"
            onClick={() => handleToggle(reaction.key)}
            disabled={!canReact || busy}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-fab-gold/40 bg-fab-gold/10 text-fab-text"
                : "border-fab-border bg-fab-surface text-fab-muted hover:text-fab-text"
            } ${!canReact ? "cursor-default opacity-75" : ""}`}
          >
            <span className={reaction.color}>{reactionIcon(reaction.key)}</span>
            <span>{reaction.label}</span>
            <span className="text-fab-dim">{counts[reaction.key]}</span>
          </button>
        );
      })}
      <span className="text-xs text-fab-dim">
        {totalReactions} reaction{totalReactions === 1 ? "" : "s"}
      </span>
      {!canReact && (
        <span className="text-xs text-fab-dim">Sign in to react.</span>
      )}
    </div>
  );
}
