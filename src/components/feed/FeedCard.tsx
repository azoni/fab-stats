"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import type { FeedEvent, ImportFeedEvent, FaBdokuFeedEvent, FaBdokuCardFeedEvent, CrosswordFeedEvent, HeroGuesserFeedEvent, MatchupManiaFeedEvent, TriviaFeedEvent, TimelineFeedEvent, ConnectionsFeedEvent, RampageFeedEvent, KnockoutFeedEvent, BrawlFeedEvent, NinjaComboFeedEvent, ShadowStrikeFeedEvent, BladeDashFeedEvent } from "@/types";
import { rankBorderClass } from "@/lib/leaderboard-ranks";
import { playerHref } from "@/lib/constants";
import { HeroShieldBadge } from "@/components/profile/HeroShieldBadge";
import { TeamBadge } from "@/components/profile/TeamBadge";
import { FEED_REACTIONS, addFeedReaction, removeFeedReaction, deleteFeedEvent } from "@/lib/feed";

export interface FeedGroup {
  events: FeedEvent[];
  totalMatchCount: number;
}

const GAME_TYPES = new Set(["fabdoku", "fabdoku-cards", "crossword", "heroguesser", "matchupmania", "trivia", "timeline", "connections", "rampage", "kayosknockout", "brutebrawl", "ninjacombo", "shadowstrike", "bladedash"]);

/** Group consecutive import or game feed events from the same user into collapsible groups.
 *  Achievement/placement events are never grouped — they stay as single-item groups. */
export function groupConsecutiveEvents(events: FeedEvent[]): FeedGroup[] {
  const groups: FeedGroup[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (
      event.type === "import" &&
      last &&
      last.events[0].type === "import" &&
      last.events[0].userId === event.userId
    ) {
      last.events.push(event);
      last.totalMatchCount += event.matchCount;
    } else if (
      GAME_TYPES.has(event.type) &&
      last &&
      GAME_TYPES.has(last.events[0].type) &&
      last.events[0].userId === event.userId
    ) {
      last.events.push(event);
    } else {
      groups.push({
        events: [event],
        totalMatchCount: event.type === "import" ? event.matchCount : 0,
      });
    }
  }
  return groups;
}

function formatTimeAgo(isoString: string): string {
  const now = Date.now();
  const date = new Date(isoString);
  const diff = now - date.getTime();

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const isThisYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "numeric" }),
  });
}

function formatFullTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const rarityColors: Record<string, string> = {
  common: "bg-gray-500/15 text-gray-400",
  uncommon: "bg-green-500/15 text-green-400",
  rare: "bg-blue-500/15 text-blue-400",
  epic: "bg-purple-500/15 text-purple-400",
  legendary: "bg-yellow-500/15 text-yellow-400",
};

const placementLabels: Record<string, { label: string; color: string; icon: string }> = {
  champion: { label: "Champion", color: "text-yellow-400", icon: "M2.5 19h19v3h-19zM22.5 7l-5 4-5.5-7-5.5 7-5-4 2 12h17z" },
  finalist: { label: "Finalist", color: "text-amber-400", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" },
  top4: { label: "Top 4", color: "text-orange-400", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" },
  top8: { label: "Top 8", color: "text-fab-gold", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" },
};

// ── Major event placement card styles (Battle Hardened and up) ──

const MAJOR_EVENT_CARD_STYLE: Record<string, {
  border: string;
  rgb: string;
  shadow: string;
  championShadow: string;
}> = {
  "Battle Hardened": {
    border: "#cd7f32",
    rgb: "205,127,50",
    shadow: "0 0 12px rgba(205,127,50,0.3)",
    championShadow: "0 0 16px rgba(205,127,50,0.45), 0 0 32px rgba(205,127,50,0.15)",
  },
  "The Calling": {
    border: "#60a5fa",
    rgb: "96,165,250",
    shadow: "0 0 14px rgba(96,165,250,0.35)",
    championShadow: "0 0 18px rgba(96,165,250,0.5), 0 0 36px rgba(96,165,250,0.15)",
  },
  Nationals: {
    border: "#f87171",
    rgb: "248,113,113",
    shadow: "0 0 14px rgba(248,113,113,0.35)",
    championShadow: "0 0 18px rgba(248,113,113,0.5), 0 0 36px rgba(248,113,113,0.15)",
  },
  "Pro Tour": {
    border: "#a78bfa",
    rgb: "167,139,250",
    shadow: "0 0 18px rgba(167,139,250,0.4)",
    championShadow: "0 0 22px rgba(167,139,250,0.55), 0 0 44px rgba(167,139,250,0.2)",
  },
  Worlds: {
    border: "#fbbf24",
    rgb: "251,191,36",
    shadow: "0 0 20px rgba(251,191,36,0.45), 0 0 40px rgba(251,191,36,0.15)",
    championShadow: "0 0 24px rgba(251,191,36,0.6), 0 0 48px rgba(251,191,36,0.25), 0 0 64px rgba(251,191,36,0.1)",
  },
};

/** Shared avatar + header row — clickable link to player profile */
function FeedCardHeader({ event, compact, rankMap }: { event: FeedEvent; compact?: boolean; rankMap?: Map<string, 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8> }) {
  const initials = event.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const border = rankBorderClass(rankMap?.get(event.userId));

  const avatar = event.photoUrl ? (
    <img
      src={event.photoUrl}
      alt=""
      className={`rounded-full shrink-0 ${compact ? "w-6 h-6" : "w-10 h-10"} ${border}`}
      loading="lazy"
    />
  ) : (
    <div className={`rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold shrink-0 ${compact ? "w-6 h-6 text-[10px]" : "w-10 h-10 text-sm"} ${border}`}>
      {initials}
    </div>
  );

  if (event.isPublic) {
    return <Link href={playerHref(event.username)} onClick={(e) => e.stopPropagation()}>{avatar}</Link>;
  }
  return avatar;
}

function NameAndTime({ event, compact, heroCompletionMap }: { event: FeedEvent; compact?: boolean; heroCompletionMap?: Map<string, number> }) {
  const pct = heroCompletionMap?.get(event.userId) ?? 0;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {event.isPublic ? (
        <Link href={playerHref(event.username)} onClick={(e) => e.stopPropagation()} className={`font-semibold text-fab-text hover:text-fab-gold transition-colors ${compact ? "text-xs" : ""}`}>
          {event.displayName}
        </Link>
      ) : (
        <span className={`font-semibold text-fab-text ${compact ? "text-xs" : ""}`}>{event.displayName}</span>
      )}
      {event.teamName && <TeamBadge teamName={event.teamName} teamIconUrl={event.teamIconUrl} size="xs" />}
      {pct >= 35 && <HeroShieldBadge pct={pct} />}
      {compact ? (
        <span className="text-[10px] text-fab-dim">{formatTimeAgo(event.createdAt)}</span>
      ) : (
        <>
          <span className="text-xs text-fab-dim">@{event.username}</span>
          <span className="text-xs text-fab-dim" title={formatFullTimestamp(event.createdAt)}>
            {formatTimeAgo(event.createdAt)}
          </span>
        </>
      )}
    </div>
  );
}

// ── Reactions ──

/** FaB-themed SVG reaction icons */
function ReactionIcon({ reactionKey, className }: { reactionKey: string; className?: string }) {
  switch (reactionKey) {
    case "gg": // Crossed swords
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
          <path d="M13 19l6-6" />
          <path d="M16 16l4 4" />
          <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
          <path d="M11 19l-6-6" />
          <path d="M8 16l-4 4" />
        </svg>
      );
    case "goagain": // Circular arrow (go again!)
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0115.36-6.36L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
        </svg>
      );
    case "majestic": // Diamond gem
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12l4 6-10 12L2 9z" />
          <path d="M2 9h20" />
          <path d="M10 3l-2 6 4 12 4-12-2-6" />
        </svg>
      );
    case "dominate": // Shield with bolt
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M13 7l-4 5h5l-4 5" />
        </svg>
      );
    default:
      return null;
  }
}

function ReactionBar({ event, userId, compact }: { event: FeedEvent; userId?: string; compact?: boolean }) {
  const [localReactions, setLocalReactions] = useState<Record<string, string[]>>(event.reactions || {});
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async (key: string) => {
    if (!userId || busy) return;
    setBusy(true);
    const users = localReactions[key] || [];
    const hasReacted = users.includes(userId);

    // Optimistic update
    setLocalReactions((prev) => {
      const current = prev[key] || [];
      return {
        ...prev,
        [key]: hasReacted ? current.filter((id) => id !== userId) : [...current, userId],
      };
    });

    try {
      if (hasReacted) {
        await removeFeedReaction(event.id, key, userId);
      } else {
        await addFeedReaction(event.id, key, userId);
      }
    } catch {
      // Revert on error
      setLocalReactions((prev) => ({
        ...prev,
        [key]: hasReacted ? [...(prev[key] || []), userId] : (prev[key] || []).filter((id) => id !== userId),
      }));
    } finally {
      setBusy(false);
    }
  }, [userId, busy, localReactions, event.id]);

  const totalReactions = Object.values(localReactions).reduce((sum, arr) => sum + arr.length, 0);

  const iconSize = compact ? "w-3 h-3" : "w-3.5 h-3.5";

  // Show existing reactions + add button
  return (
    <div className={`flex items-center gap-1 flex-wrap ${compact ? "mt-1" : "mt-2"}`} onClick={(e) => e.stopPropagation()}>
      {FEED_REACTIONS.map((r) => {
        const users = localReactions[r.key] || [];
        const count = users.length;
        const active = userId ? users.includes(userId) : false;

        // In compact mode, only show reactions that have counts
        if (compact && count === 0) return null;

        return (
          <button
            key={r.key}
            onClick={() => toggle(r.key)}
            disabled={!userId}
            title={r.label}
            className={`inline-flex items-center gap-0.5 rounded-full transition-colors ${
              compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
            } ${
              active
                ? "bg-fab-gold/15 border border-fab-gold/40 text-fab-gold"
                : count > 0
                  ? "bg-fab-surface border border-fab-border text-fab-muted hover:border-fab-gold/30 hover:text-fab-text"
                  : "border border-transparent text-fab-dim hover:bg-fab-surface hover:border-fab-border hover:text-fab-muted"
            } ${!userId ? "cursor-default opacity-60" : "cursor-pointer"}`}
          >
            <ReactionIcon reactionKey={r.key} className={iconSize} />
            {count > 0 && <span className="font-medium">{count}</span>}
          </button>
        );
      })}
      {/* If no reactions yet in compact mode, show a subtle add hint */}
      {compact && totalReactions === 0 && userId && (
        <div className="flex items-center gap-0.5">
          {FEED_REACTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => toggle(r.key)}
              title={r.label}
              className="px-1 py-0.5 text-fab-dim/50 hover:text-fab-dim transition-colors rounded"
            >
              <ReactionIcon reactionKey={r.key} className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Delete button ──

function DeleteFeedButton({ eventId, onDelete }: { eventId: string; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="absolute top-1 right-1 z-10" onClick={(e) => e.stopPropagation()}>
      {confirming ? (
        <div className="flex items-center gap-1 bg-fab-bg border border-fab-border rounded-md px-1.5 py-0.5">
          <button
            onClick={async () => {
              setDeleting(true);
              try {
                await deleteFeedEvent(eventId);
                onDelete(eventId);
              } catch { /* silent */ }
              setDeleting(false);
              setConfirming(false);
            }}
            disabled={deleting}
            className="text-[10px] text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
          >
            {deleting ? "..." : "Delete"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-[10px] text-fab-dim hover:text-fab-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="opacity-0 group-hover/feed:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/10 text-fab-dim hover:text-red-400"
          title="Delete feed event"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Hero pill helper ──

function HeroPill({ hero, compact }: { hero: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-fab-gold/10 text-fab-gold font-medium ${
      compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"
    }`}>
      {hero}
    </span>
  );
}

// ── Content components ──

export function FeedCard({ event, compact, rankMap, eventTierMap, underlineTierMap, heroCompletionMap, userId, isAdmin, onDelete }: { event: FeedEvent; compact?: boolean; rankMap?: Map<string, 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>; eventTierMap?: Map<string, { border: string; shadow: string }>; underlineTierMap?: Map<string, { color: string; rgb: string }>; heroCompletionMap?: Map<string, number>; userId?: string; isAdmin?: boolean; onDelete?: (eventId: string) => void }) {
  const tierStyle = eventTierMap?.get(event.userId);
  const underlineStyle = underlineTierMap?.get(event.userId);
  const canDelete = isAdmin || (userId && userId === event.userId);

  // Per-card major event placement styling
  let majorStyle: (typeof MAJOR_EVENT_CARD_STYLE)[string] | undefined;
  let isChampion = false;
  let showCornerAccents = false;
  if (event.type === "placement") {
    majorStyle = MAJOR_EVENT_CARD_STYLE[event.eventType];
    isChampion = event.placementType === "champion";
    showCornerAccents = !!majorStyle;
  }

  // Major event styling takes priority over user-level tier styling
  const cardStyle = majorStyle
    ? {
        borderColor: majorStyle.border,
        boxShadow: isChampion ? majorStyle.championShadow : majorStyle.shadow,
      }
    : tierStyle
      ? { borderColor: tierStyle.border, boxShadow: tierStyle.shadow }
      : undefined;

  return (
    <div
      className={`bg-fab-surface border border-fab-border rounded-lg ${compact ? "px-3 py-2" : "p-4"} relative group/feed overflow-hidden ${majorStyle && isChampion && !compact ? "feed-shimmer" : ""}`}
      style={cardStyle}
    >
      {/* Major event accent top bar */}
      {majorStyle && !compact && (
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: isChampion ? 3 : 2.5,
            background: `linear-gradient(90deg, transparent, rgba(${majorStyle.rgb},${isChampion ? 0.9 : 0.7}), transparent)`,
          }}
        />
      )}
      {/* Major event left accent strip */}
      {majorStyle && !compact && (
        <div
          className="absolute top-0 left-0 bottom-0 pointer-events-none"
          style={{
            width: isChampion ? 3.5 : 3,
            background: `linear-gradient(180deg, rgba(${majorStyle.rgb},${isChampion ? 0.8 : 0.5}), rgba(${majorStyle.rgb},0.15))`,
          }}
        />
      )}
      {/* Major event radial gradient overlay */}
      {majorStyle && !compact && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            backgroundImage: `radial-gradient(ellipse at top left, rgba(${majorStyle.rgb},${isChampion ? 0.1 : 0.05}) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(${majorStyle.rgb},0.03) 0%, transparent 50%)`,
          }}
        />
      )}
      {/* Corner filigrees for major event placements */}
      {showCornerAccents && !compact && majorStyle && (
        <>
          <svg className="absolute top-0 left-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32" fill="none">
            <path d="M0 0 L14 0 Q10 3 7 7 Q3 10 0 14 Z" fill={`rgba(${majorStyle.rgb},0.1)`} />
            <path d="M0 0 L10 0 Q7 3 5 5 Q3 7 0 10" stroke={majorStyle.border} strokeWidth="0.75" fill="none" opacity="0.5" />
          </svg>
          <svg className="absolute top-0 right-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32" fill="none">
            <path d="M32 0 L18 0 Q22 3 25 7 Q29 10 32 14 Z" fill={`rgba(${majorStyle.rgb},0.1)`} />
            <path d="M32 0 L22 0 Q25 3 27 5 Q29 7 32 10" stroke={majorStyle.border} strokeWidth="0.75" fill="none" opacity="0.5" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32" fill="none">
            <path d="M0 32 L0 18 Q3 22 7 25 Q10 29 14 32 Z" fill={`rgba(${majorStyle.rgb},0.1)`} />
            <path d="M0 32 L0 22 Q3 25 5 27 Q7 29 10 32" stroke={majorStyle.border} strokeWidth="0.75" fill="none" opacity="0.5" />
          </svg>
          <svg className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32" fill="none">
            <path d="M32 32 L32 18 Q29 22 25 25 Q22 29 18 32 Z" fill={`rgba(${majorStyle.rgb},0.1)`} />
            <path d="M32 32 L32 22 Q29 25 27 27 Q25 29 22 32" stroke={majorStyle.border} strokeWidth="0.75" fill="none" opacity="0.5" />
          </svg>
        </>
      )}
      {/* Decorative side diamonds for champion placements */}
      {majorStyle && isChampion && !compact && (
        <>
          <svg className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-4 pointer-events-none" viewBox="0 0 8 16" fill="none">
            <path d="M4 0 L8 8 L4 16 L0 8 Z" fill={`rgba(${majorStyle.rgb},0.2)`} />
          </svg>
          <svg className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-4 pointer-events-none" viewBox="0 0 8 16" fill="none">
            <path d="M4 0 L8 8 L4 16 L0 8 Z" fill={`rgba(${majorStyle.rgb},0.2)`} />
          </svg>
        </>
      )}
      {/* Bottom accent bar for major events */}
      {majorStyle && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: isChampion ? 3 : 2.5,
            background: `linear-gradient(90deg, transparent, rgba(${majorStyle.rgb},${isChampion ? 0.8 : 0.5}), transparent)`,
          }}
        />
      )}
      {/* Underline for non-major event cards */}
      {!majorStyle && underlineStyle && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: 2.5, background: underlineStyle.color, boxShadow: `0 0 4px rgba(${underlineStyle.rgb},0.3)` }}
        />
      )}
      {canDelete && onDelete && (
        <DeleteFeedButton eventId={event.id} onDelete={onDelete} />
      )}
      {event.type === "placement" && event.eventDate && (
        <p className={`text-[10px] text-fab-dim font-medium ${compact ? "mb-1" : "mb-1.5"}`}>{formatEventDate(event.eventDate)}</p>
      )}
      <div className={`flex items-center ${compact ? "gap-2" : "gap-3 items-start"}`}>
        <FeedCardHeader event={event} compact={compact} rankMap={rankMap} />
        <div className="flex-1 min-w-0">
          <NameAndTime event={event} compact={compact} heroCompletionMap={heroCompletionMap} />
          {event.type === "import" && <ImportContent event={event} compact={compact} />}
          {event.type === "achievement" && <AchievementContent event={event} compact={compact} />}
          {event.type === "placement" && <PlacementContent event={event} compact={compact} />}
          {event.type === "fabdoku" && <FaBdokuContent event={event} compact={compact} />}
          {event.type === "fabdoku-cards" && <FaBdokuCardContent event={event} compact={compact} />}
          {event.type === "crossword" && <CrosswordContent event={event} compact={compact} />}
          {event.type === "heroguesser" && <HeroGuesserContent event={event} compact={compact} />}
          {event.type === "matchupmania" && <MatchupManiaContent event={event} compact={compact} />}
          {event.type === "trivia" && <TriviaContent event={event} compact={compact} />}
          {event.type === "timeline" && <TimelineContent event={event} compact={compact} />}
          {event.type === "connections" && <ConnectionsContent event={event} compact={compact} />}
          {event.type === "rampage" && <RampageContent event={event} compact={compact} />}
          {event.type === "kayosknockout" && <KnockoutContent event={event} compact={compact} />}
          {event.type === "brutebrawl" && <BrawlContent event={event} compact={compact} />}
          {event.type === "ninjacombo" && <NinjaComboContent event={event} compact={compact} />}
          {event.type === "shadowstrike" && <ShadowStrikeContent event={event} compact={compact} />}
          {event.type === "bladedash" && <BladeDashContent event={event} compact={compact} />}
          <ReactionBar event={event} userId={userId} compact={compact} />
        </div>
      </div>
    </div>
  );
}

function ImportContent({ event, compact }: { event: ImportFeedEvent; compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        <span className="font-semibold text-fab-text">{event.matchCount}</span> match{event.matchCount !== 1 ? "es" : ""}
        {event.source && <span className="text-fab-dim"> via {event.source === "csv" ? "CSV" : event.source}</span>}
        {event.topHeroes && event.topHeroes.length > 0 && (
          <span className="ml-1.5">
            {event.topHeroes.map((hero) => (
              <HeroPill key={hero} hero={hero} compact />
            ))}
          </span>
        )}
      </p>
    );
  }

  return (
    <>
      <p className="text-sm text-fab-muted mt-1">
        imported{" "}
        <span className="font-semibold text-fab-text">{event.matchCount}</span>{" "}
        match{event.matchCount !== 1 ? "es" : ""}
        {event.source && <span className="text-fab-dim"> via {event.source === "csv" ? "CSV" : event.source}</span>}
      </p>
      {event.topHeroes && event.topHeroes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {event.topHeroes.map((hero) => (
            <HeroPill key={hero} hero={hero} />
          ))}
        </div>
      )}
    </>
  );
}

function AchievementContent({ event, compact }: { event: FeedEvent & { type: "achievement" }; compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        unlocked <span className="font-semibold text-purple-400">{event.achievements.length}</span> achievement{event.achievements.length !== 1 ? "s" : ""}
      </p>
    );
  }

  return (
    <>
      <p className="text-sm text-fab-muted mt-1">
        unlocked {event.achievements.length === 1 ? "a new achievement" : `${event.achievements.length} new achievements`}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {event.achievements.map((a) => (
          <span key={a.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${rarityColors[a.rarity] || rarityColors.common}`}>
            {a.name}
          </span>
        ))}
      </div>
    </>
  );
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatEventDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

function PlacementContent({ event, compact }: { event: FeedEvent & { type: "placement" }; compact?: boolean }) {
  const info = placementLabels[event.placementType] || placementLabels.top8;
  const majorStyle = MAJOR_EVENT_CARD_STYLE[event.eventType];
  const isChampion = event.placementType === "champion";

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        <span
          className={`font-semibold ${majorStyle ? "" : info.color}`}
          style={majorStyle ? { color: majorStyle.border } : undefined}
        >
          {info.label}
        </span>{" "}
        at {event.eventName}
        {event.hero && <span className="ml-1"><HeroPill hero={event.hero} compact /></span>}
      </p>
    );
  }

  // Enhanced layout for major event placements
  if (majorStyle) {
    return (
      <>
        <div className="flex items-center gap-2.5 mt-1">
          {/* Medal icon with colored circle background */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `rgba(${majorStyle.rgb},0.15)`,
              boxShadow: isChampion ? `0 0 10px rgba(${majorStyle.rgb},0.3)` : undefined,
            }}
          >
            <svg className="w-5 h-5" style={{ color: majorStyle.border }} viewBox="0 0 24 24" fill="currentColor">
              <path d={info.icon} />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-fab-muted">
              {isChampion ? (
                <span className="font-bold tracking-wide" style={{ color: majorStyle.border }}>
                  Champion
                </span>
              ) : (
                <>
                  placed{" "}
                  <span className="font-semibold" style={{ color: majorStyle.border }}>
                    {info.label}
                  </span>
                </>
              )}{" "}
              at{" "}
              <span className="font-semibold text-fab-text">{event.eventName}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {event.hero && <HeroPill hero={event.hero} />}
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `rgba(${majorStyle.rgb},0.12)`,
              color: majorStyle.border,
            }}
          >
            {event.eventType}
          </span>
        </div>
      </>
    );
  }

  // Default non-major event placement
  return (
    <>
      <div className="flex items-center gap-2 mt-1">
        <svg className={`w-4 h-4 ${info.color}`} viewBox="0 0 24 24" fill="currentColor">
          <path d={info.icon} />
        </svg>
        <p className="text-sm text-fab-muted">
          placed <span className={`font-semibold ${info.color}`}>{info.label}</span> at{" "}
          <span className="font-semibold text-fab-text">{event.eventName}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {event.hero && <HeroPill hero={event.hero} />}
        <span className="px-2 py-0.5 rounded-full bg-fab-surface text-fab-dim text-xs">
          {event.eventType}
        </span>
      </div>
    </>
  );
}

const gridCellColor: Record<string, string> = {
  correct: "bg-fab-win",
  wrong: "bg-fab-loss",
  empty: "bg-fab-border",
};

function FaBdokuContent({ event, compact }: { event: FaBdokuFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-fab-muted">
          {actionText} FaBdoku &middot;{" "}
          <span className="font-semibold text-fab-text">{event.correctCount}/9</span>
          {event.uniquenessScore !== undefined && (
            <span className="ml-1 text-fab-gold font-semibold">{event.uniquenessScore}pts</span>
          )}
        </p>
        <div className="grid grid-cols-3 gap-px shrink-0">
          {(Array.isArray(event.grid[0]) ? event.grid.flat() : event.grid).map((cell, i) => (
            <div key={i} className={`w-2 h-2 rounded-[1px] ${gridCellColor[cell]}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mt-1">
        <div>
          <p className="text-sm text-fab-muted">
            {actionText}{" "}
            <Link href="/fabdoku" className="font-semibold text-fab-gold hover:underline">FaBdoku</Link>
            {" "}&mdash;{" "}
            <span className="font-semibold text-fab-text">{event.correctCount}/9</span> in {event.guessesUsed} guesses
          </p>
          {event.uniquenessScore !== undefined && (
            <p className="text-xs text-fab-muted mt-0.5">
              Uniqueness: <span className="font-semibold text-fab-gold">{event.uniquenessScore}</span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-0.5 shrink-0 ml-auto">
          {(Array.isArray(event.grid[0]) ? event.grid.flat() : event.grid).map((cell, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-sm ${gridCellColor[cell]}`} />
          ))}
        </div>
      </div>
    </>
  );
}

function FaBdokuCardContent({ event, compact }: { event: FaBdokuCardFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-fab-muted">
          {actionText} FaBdoku Cards &middot;{" "}
          <span className="font-semibold text-fab-text">{event.correctCount}/9</span>
          {event.uniquenessScore !== undefined && (
            <span className="ml-1 text-fab-gold font-semibold">{event.uniquenessScore}pts</span>
          )}
        </p>
        <div className="grid grid-cols-3 gap-px shrink-0">
          {(Array.isArray(event.grid[0]) ? event.grid.flat() : event.grid).map((cell, i) => (
            <div key={i} className={`w-2 h-2 rounded-[1px] ${gridCellColor[cell]}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mt-1">
        <div>
          <p className="text-sm text-fab-muted">
            {actionText}{" "}
            <Link href="/fabdoku?mode=cards" className="font-semibold text-fab-gold hover:underline">FaBdoku Cards</Link>
            {" "}&mdash;{" "}
            <span className="font-semibold text-fab-text">{event.correctCount}/9</span> in {event.guessesUsed} guesses
          </p>
          {event.uniquenessScore !== undefined && (
            <p className="text-xs text-fab-muted mt-0.5">
              Uniqueness: <span className="font-semibold text-fab-gold">{event.uniquenessScore}</span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-0.5 shrink-0 ml-auto">
          {(Array.isArray(event.grid[0]) ? event.grid.flat() : event.grid).map((cell, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-sm ${gridCellColor[cell]}`} />
          ))}
        </div>
      </div>
    </>
  );
}

function formatCrosswordTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CrosswordContent({ event, compact }: { event: CrosswordFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const statusText = event.won ? `Solved in ${formatCrosswordTime(event.elapsedSeconds)}` : `${event.wordsFound}/${event.totalWords} words`;
  const noHints = event.checksUsed + event.revealsUsed === 0;

  const hintParts: string[] = [];
  if (event.checksUsed > 0) hintParts.push(`${event.checksUsed} check${event.checksUsed !== 1 ? "s" : ""}`);
  if (event.revealsUsed > 0) hintParts.push(`${event.revealsUsed} reveal${event.revealsUsed !== 1 ? "s" : ""}`);
  const hintText = hintParts.length > 0 ? hintParts.join(", ") : null;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Crossword &middot;{" "}
        <span className="font-semibold text-fab-text">{statusText}</span>
        {noHints && event.won ? <span className="ml-1 text-fab-gold">No hints!</span>
          : hintText && <span className="ml-1 text-fab-dim">({hintText})</span>}
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/crossword" className="font-semibold text-fab-gold hover:underline">FaB Crossword</Link>
        {" "}&mdash;{" "}
        <span className="font-semibold text-fab-text">{statusText}</span>
      </p>
      {noHints && event.won ? (
        <p className="text-xs text-fab-gold mt-0.5">No hints used!</p>
      ) : hintText && (
        <p className="text-xs text-fab-dim mt-0.5">{hintText}</p>
      )}
    </div>
  );
}

function TriviaContent({ event, compact }: { event: TriviaFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const statusText = `${event.score}/${event.totalQuestions}`;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} FaB Trivia &middot;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/trivia" className="font-semibold text-red-400 hover:underline">FaB Trivia</Link>
        {" "}&mdash;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText} correct</span>
      </p>
    </div>
  );
}

function TimelineContent({ event, compact }: { event: TimelineFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const statusText = event.won ? `Won with ${event.livesRemaining} lives left` : "Failed";

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Timeline &middot;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/timeline" className="font-semibold text-cyan-400 hover:underline">FaB Timeline</Link>
        {" "}&mdash;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    </div>
  );
}

function ConnectionsContent({ event, compact }: { event: ConnectionsFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const statusText = event.won ? `Solved (${event.mistakesUsed} mistakes)` : `${event.groupsFound}/4 groups`;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Connections &middot;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/connections" className="font-semibold text-yellow-400 hover:underline">FaB Connections</Link>
        {" "}&mdash;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    </div>
  );
}

function MatchupManiaContent({ event, compact }: { event: MatchupManiaFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const statusText = `${event.score}/${event.totalRounds}`;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Matchup Mania &middot;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/matchupmania" className="font-semibold text-orange-400 hover:underline">Matchup Mania</Link>
        {" "}&mdash;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText} correct</span>
      </p>
    </div>
  );
}

function ShadowStrikeContent({ event, compact }: { event: ShadowStrikeFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const secs = Math.floor(event.elapsedMs / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const timeStr = `${m}:${String(s).padStart(2, "0")}`;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Shadow Strike &middot;{" "}
        <span className="font-semibold text-fab-text">{event.pairsFound}/8 pairs</span>
        <span className="ml-1 text-fab-dim">{event.flips} flips · {timeStr}</span>
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/shadowstrike" className="font-semibold text-indigo-400 hover:underline">Shadow Strike</Link>
        {" "}&mdash;{" "}
        <span className="font-semibold text-fab-text">{event.pairsFound}/8 pairs</span>
        {" "}in {event.flips} flips · {timeStr}
      </p>
    </div>
  );
}

function BladeDashContent({ event, compact }: { event: BladeDashFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const secs = Math.floor(event.elapsedMs / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const timeStr = `${m}:${String(s).padStart(2, "0")}`;
  const noHints = event.hintsUsed === 0;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Blade Dash &middot;{" "}
        <span className="font-semibold text-fab-text">{event.wordsSolved}/8 words</span>
        <span className="ml-1 text-fab-dim">{timeStr}</span>
        {noHints && <span className="ml-1 text-fab-gold">No hints!</span>}
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/bladedash" className="font-semibold text-pink-400 hover:underline">Blade Dash</Link>
        {" "}&mdash;{" "}
        <span className="font-semibold text-fab-text">{event.wordsSolved}/8 words</span>
        {" "}in {timeStr}
        {event.hintsUsed > 0 && <span className="text-fab-dim"> ({event.hintsUsed} hints)</span>}
      </p>
      {noHints && <p className="text-xs text-fab-gold mt-0.5">No hints used!</p>}
    </div>
  );
}

function HeroGuesserContent({ event, compact }: { event: HeroGuesserFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const statusText = event.won ? `Solved in ${event.guessCount}/${event.maxGuesses}` : `Failed ${event.guessCount}/${event.maxGuesses}`;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Hero Guesser &middot;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/heroguesser" className="font-semibold text-purple-400 hover:underline">Hero Guesser</Link>
        {" "}&mdash;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    </div>
  );
}

// ── Game name helper ──

const GAME_LABELS: Record<string, string> = {
  fabdoku: "FaBdoku",
  "fabdoku-cards": "FaBdoku Cards",
  crossword: "Crossword",
  heroguesser: "Hero Guesser",
  matchupmania: "Matchup Mania",
  trivia: "FaB Trivia",
  timeline: "Timeline",
  connections: "Connections",
  rampage: "Rhinar's Rampage",
  kayosknockout: "Kayo's Knockout",
  brutebrawl: "Brute Brawl",
  ninjacombo: "Katsu's Combo",
  shadowstrike: "Shadow Strike",
  bladedash: "Blade Dash",
};

function GameResultSummary({ event }: { event: FeedEvent }) {
  const name = GAME_LABELS[event.type] || event.type;
  let detail = "";

  switch (event.type) {
    case "fabdoku": {
      const e = event as FaBdokuFeedEvent;
      detail = `${e.correctCount}/9${e.uniquenessScore !== undefined ? ` ${e.uniquenessScore}pts` : ""}`;
      break;
    }
    case "fabdoku-cards": {
      const e = event as FaBdokuCardFeedEvent;
      detail = `${e.correctCount}/9${e.uniquenessScore !== undefined ? ` ${e.uniquenessScore}pts` : ""}`;
      break;
    }
    case "crossword": {
      const e = event as CrosswordFeedEvent;
      detail = e.won ? `Solved in ${(() => { const m = Math.floor(e.elapsedSeconds / 60); const s = e.elapsedSeconds % 60; return `${m}:${String(s).padStart(2, "0")}`; })()}` : `${e.wordsFound}/${e.totalWords} words`;
      break;
    }
    case "heroguesser": {
      const e = event as HeroGuesserFeedEvent;
      detail = e.won ? `Solved in ${e.guessCount}/${e.maxGuesses}` : `Failed ${e.guessCount}/${e.maxGuesses}`;
      break;
    }
    case "matchupmania": {
      const e = event as MatchupManiaFeedEvent;
      detail = `${e.score}/${e.totalRounds}`;
      break;
    }
    case "trivia": {
      const e = event as TriviaFeedEvent;
      detail = `${e.score}/${e.totalQuestions}`;
      break;
    }
    case "timeline": {
      const e = event as TimelineFeedEvent;
      detail = e.won ? `Won with ${e.livesRemaining} lives left` : "Failed";
      break;
    }
    case "connections": {
      const e = event as ConnectionsFeedEvent;
      detail = e.won ? `${e.groupsFound}/4 groups` : `${e.groupsFound}/4 groups`;
      break;
    }
    case "rampage": {
      const e = event as RampageFeedEvent;
      detail = `${e.score}/${e.targetHP} dmg`;
      break;
    }
    case "kayosknockout": {
      const e = event as KnockoutFeedEvent;
      detail = `${e.score}/${e.targetHP} dmg`;
      break;
    }
    case "brutebrawl": {
      const e = event as BrawlFeedEvent;
      detail = `${e.totalDamage}/${e.targetDamage} dmg`;
      break;
    }
    case "ninjacombo": {
      const e = event as NinjaComboFeedEvent;
      detail = e.won ? `${e.totalDamage}/${e.targetDamage} dmg (${e.comboCount} combos)` : `${e.totalDamage}/${e.targetDamage}`;
      break;
    }
    case "shadowstrike": {
      const e = event as ShadowStrikeFeedEvent;
      const secs = Math.floor(e.elapsedMs / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      detail = `${e.pairsFound}/8 pairs in ${m}:${String(s).padStart(2, "0")}`;
      break;
    }
    case "bladedash": {
      const e = event as BladeDashFeedEvent;
      const secs = Math.floor(e.elapsedMs / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      detail = `${e.wordsSolved}/8 words in ${m}:${String(s).padStart(2, "0")}${e.hintsUsed > 0 ? ` (${e.hintsUsed} hints)` : ""}`;
      break;
    }
  }

  const won = "won" in event ? (event as { won: boolean }).won : true;

  return (
    <p className="text-[11px] text-fab-muted">
      {name} &middot; <span className={`font-semibold ${won ? "text-fab-win" : "text-fab-loss"}`}>{detail}</span>
    </p>
  );
}

/** A single import line inside an expanded group */
function GroupedImportRow({ event }: { event: ImportFeedEvent }) {
  return (
    <div className="flex items-center gap-2 text-sm py-1.5">
      <span className="text-fab-muted">
        imported{" "}
        <span className="font-semibold text-fab-text">{event.matchCount}</span>{" "}
        match{event.matchCount !== 1 ? "es" : ""}
        {event.source && (
          <span className="text-fab-dim"> via {event.source === "csv" ? "CSV" : event.source}</span>
        )}
      </span>
      <span className="text-xs text-fab-dim ml-auto shrink-0" title={formatFullTimestamp(event.createdAt)}>
        {formatTimeAgo(event.createdAt)}
      </span>
    </div>
  );
}

export function GroupedFeedCard({ group, compact, rankMap, eventTierMap, underlineTierMap, heroCompletionMap, userId, isAdmin, onDelete }: { group: FeedGroup; compact?: boolean; rankMap?: Map<string, 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>; eventTierMap?: Map<string, { border: string; shadow: string }>; underlineTierMap?: Map<string, { color: string; rgb: string }>; heroCompletionMap?: Map<string, number>; userId?: string; isAdmin?: boolean; onDelete?: (eventId: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const first = group.events[0];
  const isSingle = group.events.length === 1;

  // Collect all unique heroes across grouped import events
  const allHeroes = [...new Set(
    group.events.flatMap((e) => e.type === "import" ? (e.topHeroes || []) : []),
  )];

  if (isSingle) return <FeedCard event={first} compact={compact} rankMap={rankMap} eventTierMap={eventTierMap} underlineTierMap={underlineTierMap} heroCompletionMap={heroCompletionMap} userId={userId} isAdmin={isAdmin} onDelete={onDelete} />;

  const isGameGroup = GAME_TYPES.has(first.type);
  const tierStyle = eventTierMap?.get(first.userId);
  const underlineStyle = underlineTierMap?.get(first.userId);

  return (
    <div
      className={`bg-fab-surface border border-fab-border rounded-lg ${compact ? "px-3 py-2" : "p-4"} relative overflow-hidden`}
      style={tierStyle ? { borderColor: tierStyle.border, boxShadow: tierStyle.shadow } : undefined}
    >
      {underlineStyle && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: 2.5, background: underlineStyle.color, boxShadow: `0 0 4px rgba(${underlineStyle.rgb},0.3)` }}
        />
      )}
      <div className={`flex items-center ${compact ? "gap-2" : "gap-3 items-start"}`}>
        <FeedCardHeader event={first} compact={compact} rankMap={rankMap} />
        <div className="flex-1 min-w-0">
          <NameAndTime event={first} compact={compact} />

          {isGameGroup ? (
            /* ── Grouped game events ── */
            (() => {
              const PREVIEW = 2;
              const hasMore = group.events.length > PREVIEW;
              const visible = expanded ? group.events : group.events.slice(0, PREVIEW);
              return compact ? (
                <>
                  <p className="text-[11px] text-fab-muted">
                    completed <span className="font-semibold text-fab-text">{group.events.length}</span> games
                  </p>
                  <div className="space-y-0.5 mt-1">
                    {visible.map((e) => (
                      <GameResultSummary key={e.id} event={e} />
                    ))}
                  </div>
                  {hasMore && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                      className="text-[10px] text-fab-dim hover:text-fab-muted transition-colors mt-0.5"
                    >
                      {expanded ? "Show less" : `+${group.events.length - PREVIEW} more`}
                    </button>
                  )}
                  <ReactionBar event={first} userId={userId} compact />
                </>
              ) : (
                <>
                  <p className="text-sm text-fab-muted mt-1">
                    completed <span className="font-semibold text-fab-text">{group.events.length}</span> games
                  </p>
                  <div className="space-y-0.5 mt-1.5">
                    {visible.map((e) => (
                      <GameResultSummary key={e.id} event={e} />
                    ))}
                  </div>
                  {hasMore && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                      className="text-xs text-fab-dim hover:text-fab-muted transition-colors mt-1"
                    >
                      {expanded ? "Show less" : `+${group.events.length - PREVIEW} more`}
                    </button>
                  )}
                  <ReactionBar event={first} userId={userId} />
                </>
              );
            })()
          ) : compact ? (
            /* ── Grouped imports (compact) ── */
            <>
              <p className="text-[11px] text-fab-muted">
                <span className="font-semibold text-fab-text">{group.totalMatchCount}</span> match{group.totalMatchCount !== 1 ? "es" : ""}{" "}
                <span className="text-fab-dim">&middot; {group.events.length} imports</span>
                {allHeroes.length > 0 && (
                  <span className="ml-1.5">
                    {allHeroes.map((hero) => (
                      <HeroPill key={hero} hero={hero} compact />
                    ))}
                  </span>
                )}
              </p>
              <ReactionBar event={first} userId={userId} compact />
            </>
          ) : (
            /* ── Grouped imports (full) ── */
            <>
              <p className="text-sm text-fab-muted mt-1">
                imported{" "}
                <span className="font-semibold text-fab-text">{group.totalMatchCount}</span>{" "}
                match{group.totalMatchCount !== 1 ? "es" : ""}{" "}
                <span className="text-fab-dim">across {group.events.length} imports</span>
              </p>

              {allHeroes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {allHeroes.map((hero) => (
                    <HeroPill key={hero} hero={hero} />
                  ))}
                </div>
              )}

              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-fab-dim hover:text-fab-muted transition-colors mt-2"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
                {expanded ? "Hide" : "Show"} {group.events.length} imports
              </button>

              {expanded && (
                <div className="mt-2 border-t border-fab-border pt-2 space-y-0.5">
                  {group.events.map((e) => (
                    <GroupedImportRow key={e.id} event={e as ImportFeedEvent} />
                  ))}
                </div>
              )}

              <ReactionBar event={first} userId={userId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RampageContent({ event, compact }: { event: RampageFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const statusText = `${event.score}/${event.targetHP} dmg`;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Rhinar&apos;s Rampage &middot;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/rhinarsrampage" className="font-semibold text-red-400 hover:underline">Rhinar&apos;s Rampage</Link>
        {" "}&mdash;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    </div>
  );
}

function KnockoutContent({ event, compact }: { event: KnockoutFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const statusText = `${event.score}/${event.targetHP} dmg`;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Kayo&apos;s Knockout &middot;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/kayosknockout" className="font-semibold text-red-400 hover:underline">Kayo&apos;s Knockout</Link>
        {" "}&mdash;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    </div>
  );
}

function BrawlContent({ event, compact }: { event: BrawlFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const statusText = event.won ? `${event.totalDamage}/${event.targetDamage} dmg` : `${event.totalDamage}/${event.targetDamage}`;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Brute Brawl vs {event.defenderName} &middot;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/brutebrawl" className="font-semibold text-red-400 hover:underline">Brute Brawl</Link>
        {" "}vs {event.defenderName} ({event.difficulty}) &mdash;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    </div>
  );
}

function NinjaComboContent({ event, compact }: { event: NinjaComboFeedEvent; compact?: boolean }) {
  const actionText = event.subtype === "shared" ? "shared" : "completed";
  const statusText = event.won
    ? `${event.totalDamage}/${event.targetDamage} dmg (${event.comboCount} combos)`
    : `${event.totalDamage}/${event.targetDamage}`;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        {actionText} Katsu&apos;s Combo &middot;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm text-fab-muted">
        {actionText}{" "}
        <Link href="/ninjacombo" className="font-semibold text-cyan-400 hover:underline">Katsu&apos;s Combo</Link>
        {" "}&mdash;{" "}
        <span className={`font-semibold ${event.won ? "text-fab-win" : "text-fab-loss"}`}>{statusText}</span>
      </p>
    </div>
  );
}
