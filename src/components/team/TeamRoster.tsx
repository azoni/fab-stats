"use client";
import Link from "next/link";
import type { TeamMember, LeaderboardEntry } from "@/types";
import { Crown, ShieldCheck } from "lucide-react";

interface TeamRosterProps {
  members: TeamMember[];
  leaderboardMap: Map<string, LeaderboardEntry>;
  accentColor?: string;
  filteredStats?: Map<string, { matches: number; wins: number; winRate: number }> | null;
}

const ROLE_CONFIG: Record<string, { label: string; cls: string; icon?: typeof Crown }> = {
  owner: { label: "Owner", cls: "text-fab-gold", icon: Crown },
  admin: { label: "Admin", cls: "text-violet-400", icon: ShieldCheck },
};

export function TeamRoster({ members, leaderboardMap, accentColor = "#d4a843", filteredStats }: TeamRosterProps) {
  const sorted = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    const roleSort = (order[a.role] ?? 3) - (order[b.role] ?? 3);
    if (roleSort !== 0) return roleSort;
    const aMatches = leaderboardMap.get(a.uid)?.totalMatches ?? 0;
    const bMatches = leaderboardMap.get(b.uid)?.totalMatches ?? 0;
    return bMatches - aMatches;
  });

  return (
    <div>
      <h2 className="text-sm font-bold text-fab-text uppercase tracking-wider mb-4">
        Roster <span className="text-fab-dim font-normal normal-case tracking-normal">({members.length})</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sorted.map((member) => {
          const lb = leaderboardMap.get(member.uid);
          const role = ROLE_CONFIG[member.role];

          return (
            <Link
              key={member.uid}
              href={`/player/${member.username}`}
              className="bg-fab-surface border border-fab-border rounded-xl p-4 hover:border-white/15 transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-white/5" />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 ring-1 ring-white/5"
                    style={{ background: `${accentColor}20` }}
                  >
                    <span className="text-sm font-bold" style={{ color: accentColor }}>
                      {member.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-fab-text group-hover:text-white transition-colors truncate">
                      {member.displayName}
                    </span>
                    {role && (
                      <span className={`${role.cls} shrink-0`} title={role.label}>
                        {role.icon && <role.icon className="w-3 h-3" />}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-fab-dim">@{member.username}</span>
                </div>
              </div>

              {/* Stats row */}
              {(() => {
                const fs = filteredStats?.get(member.uid);
                const showFiltered = filteredStats && fs;
                const matchCount = showFiltered ? fs.matches : lb?.totalMatches;
                const winRate = showFiltered ? fs.winRate : lb ? Math.round(lb.winRate) : null;
                const topHero = showFiltered ? null : lb?.topHero?.split(",")[0];

                if (!lb && !showFiltered) return null;
                return (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-fab-border/50">
                    <div>
                      <p className="text-[9px] text-fab-dim uppercase tracking-wider">Matches</p>
                      <p className="text-sm font-bold text-fab-text tabular-nums">{matchCount ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-fab-dim uppercase tracking-wider">Win Rate</p>
                      {winRate !== null && winRate >= 0 ? (
                        <p className={`text-sm font-bold tabular-nums ${winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                          {winRate}%
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-fab-dim">N/A</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] text-fab-dim uppercase tracking-wider">Top Hero</p>
                      <p className="text-xs font-medium text-fab-text truncate">{topHero || "—"}</p>
                    </div>
                  </div>
                );
              })()}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
