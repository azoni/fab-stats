"use client";
import Link from "next/link";
import type { FeedEvent } from "@/types";

interface FeedCardProps {
  event: FeedEvent;
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

export function FeedCard({ event }: FeedCardProps) {
  const initials = event.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {event.photoUrl ? (
          <img
            src={event.photoUrl}
            alt=""
            className="w-10 h-10 rounded-full shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-sm font-bold shrink-0">
            {initials}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {event.isPublic ? (
              <Link href={`/player/${event.username}`} className="font-semibold text-fab-text hover:text-fab-gold transition-colors">
                {event.displayName}
              </Link>
            ) : (
              <span className="font-semibold text-fab-text">{event.displayName}</span>
            )}
            <span className="text-xs text-fab-dim">@{event.username}</span>
            <span className="text-xs text-fab-dim" title={formatFullTimestamp(event.createdAt)}>
              {formatTimeAgo(event.createdAt)}
            </span>
          </div>

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
        </div>
      </div>
    </div>
  );
}
