"use client";
import Link from "next/link";
import type { TeamMember, LeaderboardEntry } from "@/types";

interface TeamRosterProps {
  members: TeamMember[];
  leaderboardMap: Map<string, LeaderboardEntry>;
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  owner: { label: "Owner", cls: "bg-fab-gold/15 text-fab-gold" },
  admin: { label: "Admin", cls: "bg-violet-500/15 text-violet-400" },
};

export function TeamRoster({ members, leaderboardMap }: TeamRosterProps) {
  const sorted = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    const roleSort = (order[a.role] ?? 3) - (order[b.role] ?? 3);
    if (roleSort !== 0) return roleSort;
    // Then by matches played (descending)
    const aMatches = leaderboardMap.get(a.uid)?.totalMatches ?? 0;
    const bMatches = leaderboardMap.get(b.uid)?.totalMatches ?? 0;
    return bMatches - aMatches;
  });

  return (
    <div>
      <h2 className="text-sm font-semibold text-fab-text mb-3">Members ({members.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sorted.map((member) => {
          const lb = leaderboardMap.get(member.uid);
          const badge = ROLE_BADGE[member.role];

          return (
            <Link
              key={member.uid}
              href={`/player/${member.username}`}
              className="bg-fab-surface border border-fab-border rounded-lg p-4 hover:border-fab-gold/30 hover:bg-fab-surface-hover transition-colors group"
            >
              <div className="flex items-center gap-3">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-fab-border flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-fab-dim">{member.displayName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-fab-text group-hover:text-fab-gold transition-colors truncate">
                      {member.displayName}
                    </span>
                    {badge && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-fab-dim">@{member.username}</span>
                </div>
              </div>

              {lb && (
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-fab-border">
                  <div>
                    <p className="text-[10px] text-fab-dim">Matches</p>
                    <p className="text-sm font-bold text-fab-text tabular-nums">{lb.totalMatches}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-fab-dim">Win Rate</p>
                    <p className={`text-sm font-bold tabular-nums ${lb.winRate >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                      {Math.round(lb.winRate)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-fab-dim">Top Hero</p>
                    <p className="text-sm font-medium text-fab-text truncate">{lb.topHero?.split(",")[0] || "—"}</p>
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
