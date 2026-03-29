"use client";
import Link from "next/link";
import { HeroImg } from "@/components/heroes/HeroImg";
import { TeamBadge } from "@/components/profile/TeamBadge";
import { HeroShieldBadge } from "@/components/profile/HeroShieldBadge";
import { CardBorderWrapper, buildCardBorder, buildUnderline } from "@/components/profile/CardBorderWrapper";
import type { FeaturedEvent, LeaderboardEntry } from "@/types";
import { localDate, playerHref } from "@/lib/constants";


// Tournament bracket placements: 1st, 2nd, 3-4th, 5-8th
const BRACKET_PLACEMENT = [1, 2, 3, 3, 5, 5, 5, 5];

interface TournamentCardProps {
  event: FeaturedEvent;
  entryMap: Map<string, LeaderboardEntry>;
  /** Optional displayName → LeaderboardEntry map for auto-matching unlinked players */
  nameMap?: Map<string, LeaderboardEntry>;
  /** Show full-height image instead of cropped thumbnail */
  fullImage?: boolean;
}

/** Try to find a matching leaderboard entry by username or display name */
function resolvePlayer(
  player: { name: string; username?: string },
  entryMap: Map<string, LeaderboardEntry>,
  nameMap?: Map<string, LeaderboardEntry>,
): { entry: LeaderboardEntry | undefined; username: string | undefined } {
  // First try explicit username link
  if (player.username) {
    const entry = entryMap.get(player.username);
    if (entry) return { entry, username: player.username };
  }
  // Then try name matching
  if (nameMap) {
    const entry = nameMap.get(player.name.toLowerCase());
    if (entry) return { entry, username: entry.username };
  }
  return { entry: undefined, username: undefined };
}

/** Get the best border config from a player's top8 history */
function getBestBorder(entry: LeaderboardEntry) {
  if (!entry.top8Heroes || entry.top8Heroes.length === 0) return { border: null, underline: null };
  // Sort by best placement
  const RANK: Record<string, number> = { champion: 4, finalist: 3, top4: 2, top8: 1 };
  const TIER: Record<string, number> = { Worlds: 6, "Pro Tour": 5, Nationals: 4, "The Calling": 3, "Battle Hardened": 2, ProQuest: 1, "Road to Nationals": 1, Skirmish: 0 };
  const sorted = [...entry.top8Heroes].sort((a, b) => {
    const rankDiff = (RANK[b.placementType] ?? 0) - (RANK[a.placementType] ?? 0);
    if (rankDiff !== 0) return rankDiff;
    return (TIER[b.eventType] ?? 0) - (TIER[a.eventType] ?? 0);
  });
  const best = sorted[0];
  return {
    border: buildCardBorder(best.eventType, best.placementType),
    underline: buildUnderline(best.eventType, best.placementType),
  };
}

export function TournamentCard({ event, entryMap, nameMap, fullImage }: TournamentCardProps) {
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
              const { entry: lbEntry, username } = resolvePlayer(player, entryMap, nameMap);
              const placement = BRACKET_PLACEMENT[pi] ?? pi + 1;
              const isChampion = placement === 1;

              // Build decoration configs from their best finish
              const { border: cardBorder, underline } = lbEntry ? getBestBorder(lbEntry) : { border: null, underline: null };

              const nameEl = (
                <span className={`font-medium text-sm truncate ${isChampion ? "text-fab-gold" : "text-fab-text"}`}>
                  {player.name}
                </span>
              );

              const badges = lbEntry ? (
                <div className="flex items-center gap-1 shrink-0">
                  {lbEntry.teamName && (
                    <TeamBadge teamName={lbEntry.teamName} teamIconUrl={lbEntry.teamIconUrl} size="xs" linkToTeam={false} />
                  )}
                  {lbEntry.bothHeroesCompletionPct > 0 && (
                    <HeroShieldBadge pct={lbEntry.bothHeroesCompletionPct} size="sm" />
                  )}
                </div>
              ) : null;

              const playerContent = (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {lbEntry?.photoUrl ? (
                    <img
                      src={lbEntry.photoUrl}
                      alt=""
                      className="w-7 h-7 rounded-full shrink-0"
                    />
                  ) : lbEntry ? (
                    <div className="w-7 h-7 rounded-full bg-fab-gold/20 flex items-center justify-center text-fab-gold text-xs font-bold shrink-0">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-fab-border/50 flex items-center justify-center text-fab-dim text-xs font-bold shrink-0">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {nameEl}
                  {badges}
                </div>
              );

              const row = (
                <div className={`flex items-center gap-2 py-1 ${isChampion ? "bg-fab-gold/5 -mx-2 px-2 rounded" : ""}`}>
                  <span className={`text-xs w-5 text-right shrink-0 font-bold ${isChampion ? "text-fab-gold" : "text-fab-dim"}`}>
                    {placement}.
                  </span>

                  {lbEntry && username ? (
                    <Link
                      href={playerHref(username)}
                      className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                    >
                      {playerContent.props.children}
                    </Link>
                  ) : (
                    playerContent
                  )}

                  {player.hero && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <HeroImg name={player.hero} size="sm" />
                      <span className="text-xs text-fab-muted hidden sm:inline">{player.hero}</span>
                    </div>
                  )}
                </div>
              );

              // Wrap linked players with their card border decoration
              if (lbEntry && cardBorder && cardBorder.placement > 0) {
                return (
                  <CardBorderWrapper
                    key={pi}
                    cardBorder={cardBorder}
                    borderStyle="beam"
                    underline={underline}
                    contentClassName="rounded-lg"
                  >
                    {row}
                  </CardBorderWrapper>
                );
              }

              return <div key={pi}>{row}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
