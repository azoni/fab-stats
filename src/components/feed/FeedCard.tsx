"use client";
import { useState } from "react";
import Link from "next/link";
import type { FeedEvent, ImportFeedEvent } from "@/types";
import { rankBorderClass, rankBorderColor } from "@/lib/leaderboard-ranks";

export interface FeedGroup {
  events: FeedEvent[];
  totalMatchCount: number;
}

/** Group consecutive import feed events from the same user into collapsible groups.
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

/** Shared avatar + header row — clickable link to player profile */
function FeedCardHeader({ event, compact, rankMap }: { event: FeedEvent; compact?: boolean; rankMap?: Map<string, 1 | 2 | 3 | 4 | 5> }) {
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
    />
  ) : (
    <div className={`rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold shrink-0 ${compact ? "w-6 h-6 text-[10px]" : "w-10 h-10 text-sm"} ${border}`}>
      {initials}
    </div>
  );

  if (event.isPublic) {
    return <Link href={`/player/${event.username}`}>{avatar}</Link>;
  }
  return avatar;
}

function NameAndTime({ event, compact }: { event: FeedEvent; compact?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {event.isPublic ? (
        <Link href={`/player/${event.username}`} className={`font-semibold text-fab-text hover:text-fab-gold transition-colors ${compact ? "text-xs" : ""}`}>
          {event.displayName}
        </Link>
      ) : (
        <span className={`font-semibold text-fab-text ${compact ? "text-xs" : ""}`}>{event.displayName}</span>
      )}
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

export function FeedCard({ event, compact, rankMap }: { event: FeedEvent; compact?: boolean; rankMap?: Map<string, 1 | 2 | 3 | 4 | 5> }) {
  const cardBorder = rankBorderColor(rankMap?.get(event.userId));
  return (
    <div className={`bg-fab-surface border border-fab-border rounded-lg ${compact ? "px-3 py-2" : "p-4"}`} style={cardBorder ? { borderColor: cardBorder } : undefined}>
      <div className={`flex items-center ${compact ? "gap-2" : "gap-3 items-start"}`}>
        <FeedCardHeader event={event} compact={compact} rankMap={rankMap} />
        <div className="flex-1 min-w-0">
          <NameAndTime event={event} compact={compact} />
          {event.type === "import" && <ImportContent event={event} compact={compact} />}
          {event.type === "achievement" && <AchievementContent event={event} compact={compact} />}
          {event.type === "placement" && <PlacementContent event={event} compact={compact} />}
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
            <span key={hero} className="px-2 py-0.5 rounded-full bg-fab-gold/10 text-fab-gold text-xs font-medium">
              {hero}
            </span>
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

function formatEventDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PlacementContent({ event, compact }: { event: FeedEvent & { type: "placement" }; compact?: boolean }) {
  const info = placementLabels[event.placementType] || placementLabels.top8;

  if (compact) {
    return (
      <p className="text-[11px] text-fab-muted">
        <span className={`font-semibold ${info.color}`}>{info.label}</span> at {event.eventName}
        {event.eventDate && <span className="text-fab-dim"> &middot; {formatEventDate(event.eventDate)}</span>}
      </p>
    );
  }

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
        {event.hero && (
          <span className="px-2 py-0.5 rounded-full bg-fab-gold/10 text-fab-gold text-xs font-medium">
            {event.hero}
          </span>
        )}
        <span className="px-2 py-0.5 rounded-full bg-fab-surface text-fab-dim text-xs">
          {event.eventType}
        </span>
        {event.eventDate && (
          <span className="px-2 py-0.5 rounded-full bg-fab-surface text-fab-dim text-xs">
            {formatEventDate(event.eventDate)}
          </span>
        )}
      </div>
    </>
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

export function GroupedFeedCard({ group, compact, rankMap }: { group: FeedGroup; compact?: boolean; rankMap?: Map<string, 1 | 2 | 3 | 4 | 5> }) {
  const [expanded, setExpanded] = useState(false);
  const first = group.events[0];
  const isSingle = group.events.length === 1;

  // Collect all unique heroes across grouped import events
  const allHeroes = [...new Set(
    group.events.flatMap((e) => e.type === "import" ? (e.topHeroes || []) : []),
  )];

  if (isSingle) return <FeedCard event={first} compact={compact} rankMap={rankMap} />;

  // Multi-event groups are only for imports
  const cardBorder = rankBorderColor(rankMap?.get(first.userId));
  return (
    <div className={`bg-fab-surface border border-fab-border rounded-lg ${compact ? "px-3 py-2" : "p-4"}`} style={cardBorder ? { borderColor: cardBorder } : undefined}>
      <div className={`flex items-center ${compact ? "gap-2" : "gap-3 items-start"}`}>
        <FeedCardHeader event={first} compact={compact} rankMap={rankMap} />
        <div className="flex-1 min-w-0">
          <NameAndTime event={first} compact={compact} />

          {compact ? (
            <p className="text-[11px] text-fab-muted">
              <span className="font-semibold text-fab-text">{group.totalMatchCount}</span> match{group.totalMatchCount !== 1 ? "es" : ""}{" "}
              <span className="text-fab-dim">&middot; {group.events.length} imports</span>
            </p>
          ) : (
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
                    <span key={hero} className="px-2 py-0.5 rounded-full bg-fab-gold/10 text-fab-gold text-xs font-medium">
                      {hero}
                    </span>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
