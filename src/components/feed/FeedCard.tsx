"use client";
import { useState } from "react";
import Link from "next/link";
import type { FeedEvent } from "@/types";

export interface FeedGroup {
  events: FeedEvent[];
  totalMatchCount: number;
}

/** Group consecutive feed events from the same user into collapsible groups */
export function groupConsecutiveEvents(events: FeedEvent[]): FeedGroup[] {
  const groups: FeedGroup[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.events[0].userId === event.userId) {
      last.events.push(event);
      last.totalMatchCount += event.matchCount;
    } else {
      groups.push({ events: [event], totalMatchCount: event.matchCount });
    }
  }
  return groups;
}

interface FeedCardProps {
  event: FeedEvent;
  compact?: boolean;
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

export function FeedCard({ event, compact }: FeedCardProps) {
  const initials = event.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`bg-fab-surface border border-fab-border rounded-lg ${compact ? "px-3 py-2" : "p-4"}`}>
      <div className={`flex items-center ${compact ? "gap-2" : "gap-3 items-start"}`}>
        {/* Avatar */}
        {event.photoUrl ? (
          <img
            src={event.photoUrl}
            alt=""
            className={`rounded-full shrink-0 ${compact ? "w-6 h-6" : "w-10 h-10"}`}
          />
        ) : (
          <div className={`rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold shrink-0 ${compact ? "w-6 h-6 text-[10px]" : "w-10 h-10 text-sm"}`}>
            {initials}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
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

          {compact ? (
            <p className="text-[11px] text-fab-muted">
              <span className="font-semibold text-fab-text">{event.matchCount}</span> match{event.matchCount !== 1 ? "es" : ""}
              {event.source && <span className="text-fab-dim"> via {event.source === "csv" ? "CSV" : event.source}</span>}
            </p>
          ) : (
            <>
              <p className="text-sm text-fab-muted mt-1">
                imported{" "}
                <span className="font-semibold text-fab-text">
                  {event.matchCount}
                </span>{" "}
                match{event.matchCount !== 1 ? "es" : ""}
                {event.source && (
                  <span className="text-fab-dim"> via {event.source === "csv" ? "CSV" : event.source}</span>
                )}
              </p>

              {/* Hero pills */}
              {event.topHeroes && event.topHeroes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {event.topHeroes.map((hero) => (
                    <span
                      key={hero}
                      className="px-2 py-0.5 rounded-full bg-fab-gold/10 text-fab-gold text-xs font-medium"
                    >
                      {hero}
                    </span>
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

/** A single import line inside an expanded group */
function GroupedImportRow({ event }: { event: FeedEvent }) {
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

export function GroupedFeedCard({ group, compact }: { group: FeedGroup; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const first = group.events[0];
  const isSingle = group.events.length === 1;

  const initials = first.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Collect all unique heroes across grouped events
  const allHeroes = [...new Set(group.events.flatMap((e) => e.topHeroes || []))];

  if (isSingle) return <FeedCard event={first} compact={compact} />;

  return (
    <div className={`bg-fab-surface border border-fab-border rounded-lg ${compact ? "px-3 py-2" : "p-4"}`}>
      <div className={`flex items-center ${compact ? "gap-2" : "gap-3 items-start"}`}>
        {/* Avatar */}
        {first.photoUrl ? (
          <img src={first.photoUrl} alt="" className={`rounded-full shrink-0 ${compact ? "w-6 h-6" : "w-10 h-10"}`} />
        ) : (
          <div className={`rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold font-bold shrink-0 ${compact ? "w-6 h-6 text-[10px]" : "w-10 h-10 text-sm"}`}>
            {initials}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {first.isPublic ? (
              <Link href={`/player/${first.username}`} className={`font-semibold text-fab-text hover:text-fab-gold transition-colors ${compact ? "text-xs" : ""}`}>
                {first.displayName}
              </Link>
            ) : (
              <span className={`font-semibold text-fab-text ${compact ? "text-xs" : ""}`}>{first.displayName}</span>
            )}
            {compact ? (
              <span className="text-[10px] text-fab-dim">{formatTimeAgo(first.createdAt)}</span>
            ) : (
              <>
                <span className="text-xs text-fab-dim">@{first.username}</span>
                <span className="text-xs text-fab-dim" title={formatFullTimestamp(first.createdAt)}>
                  {formatTimeAgo(first.createdAt)}
                </span>
              </>
            )}
          </div>

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

              {/* Hero pills */}
              {allHeroes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {allHeroes.map((hero) => (
                    <span key={hero} className="px-2 py-0.5 rounded-full bg-fab-gold/10 text-fab-gold text-xs font-medium">
                      {hero}
                    </span>
                  ))}
                </div>
              )}

              {/* Expand/collapse toggle */}
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

              {/* Expanded rows */}
              {expanded && (
                <div className="mt-2 border-t border-fab-border pt-2 space-y-0.5">
                  {group.events.map((e) => (
                    <GroupedImportRow key={e.id} event={e} />
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
