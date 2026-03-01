"use client";
import Link from "next/link";
import { getHeroByName } from "@/lib/heroes";
import { HeroClassIcon } from "@/components/heroes/HeroClassIcon";
import type { FeaturedEvent, LeaderboardEntry } from "@/types";
import { localDate } from "@/lib/constants";

// Tournament bracket placements: 1st, 2nd, 3-4th, 5-8th
const BRACKET_PLACEMENT = [1, 2, 3, 3, 5, 5, 5, 5];

interface TournamentCardProps {
  event: FeaturedEvent;
  entryMap: Map<string, LeaderboardEntry>;
  /** Show full-height image instead of cropped thumbnail */
  fullImage?: boolean;
}

export function TournamentCard({ event, entryMap, fullImage }: TournamentCardProps) {
  const dateStr = (() => {
    try {
      return localDate(event.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return event.date;
    }
  })();

  const players = event.players || [];

  return (
    <div className="relative bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      {/* Pitch strip */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-400/25 to-transparent z-10" />
      {event.imageUrl && (
        fullImage ? (
          <div className="w-full max-h-56 overflow-hidden bg-black/20">
            <img
              src={event.imageUrl}
              alt={event.name}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="relative w-full h-40 sm:h-48 overflow-hidden">
            <img
              src={event.imageUrl}
              alt={event.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-fab-surface/80 via-transparent to-transparent" />
          </div>
        )
      )}
      <div className="p-4">
        <div className="min-w-0">
          <p className="font-semibold text-fab-text">{event.name}</p>
          <p className="text-xs text-fab-dim mt-0.5">
            {dateStr}
            {event.eventType && <> &middot; {event.eventType}</>}
            {event.format && <> &middot; {event.format}</>}
          </p>
          {event.description && (
            <p className="text-sm text-fab-muted mt-1">{event.description}</p>
          )}
        </div>

        {players.length > 0 && (
          <div className="mt-3 space-y-1">
            {players.map((player, pi) => {
              const lbEntry = player.username ? entryMap.get(player.username) : undefined;
              const heroInfo = player.hero ? getHeroByName(player.hero) : undefined;
              const heroClass = heroInfo?.classes[0];
              const placement = BRACKET_PLACEMENT[pi] ?? pi + 1;
              const isChampion = placement === 1;

              const nameEl = (
                <span className={`font-medium text-sm truncate ${isChampion ? "text-fab-gold" : "text-fab-text"}`}>
                  {player.name}
                </span>
              );

              return (
                <div key={pi} className={`flex items-center gap-2 py-1 ${isChampion ? "bg-fab-gold/5 -mx-2 px-2 rounded" : ""}`}>
                  <span className={`text-xs w-5 text-right shrink-0 font-bold ${isChampion ? "text-fab-gold" : "text-fab-dim"}`}>
                    {placement}.
                  </span>

                  {lbEntry ? (
                    <Link
                      href={`/player/${player.username}`}
                      className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                    >
                      {lbEntry.photoUrl ? (
                        <img
                          src={lbEntry.photoUrl}
                          alt=""
                          className="w-7 h-7 rounded-full shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {nameEl}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-full bg-fab-border/50 flex items-center justify-center text-fab-dim text-xs font-bold shrink-0">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      {nameEl}
                    </div>
                  )}

                  {player.hero && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <HeroClassIcon heroClass={heroClass} size="sm" />
                      <span className="text-xs text-fab-muted hidden sm:inline">{player.hero}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
