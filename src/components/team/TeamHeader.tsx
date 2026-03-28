"use client";
import type { Team, TeamMember } from "@/types";
import { Users, Shield, Globe } from "lucide-react";

interface TeamHeaderProps {
  team: Team;
  members: TeamMember[];
  viewerRole: "owner" | "admin" | "member" | null;
  onJoin?: () => void;
  onLeave?: () => void;
  joining?: boolean;
  leaving?: boolean;
  canJoin?: boolean;
}

export function TeamHeader({ team, members, viewerRole, onJoin, onLeave, joining, leaving, canJoin }: TeamHeaderProps) {
  const isMember = viewerRole !== null;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start gap-5">
        {/* Icon */}
        {team.iconUrl ? (
          <img
            src={team.iconUrl}
            alt={team.name}
            className="w-20 h-20 rounded-xl object-cover border-2 border-fab-border shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-fab-gold/15 border-2 border-fab-gold/30 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-fab-gold">{team.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-fab-text">{team.name}</h1>
          {team.description && (
            <p className="text-sm text-fab-muted mt-1 max-w-xl">{team.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-fab-dim">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              {team.joinMode === "open" ? (
                <><Globe className="w-3.5 h-3.5" /> Open</>
              ) : (
                <><Shield className="w-3.5 h-3.5" /> Invite Only</>
              )}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 sm:self-center">
          {!isMember && team.joinMode === "open" && canJoin && onJoin && (
            <button
              onClick={onJoin}
              disabled={joining}
              className="px-5 py-2 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join Team"}
            </button>
          )}
          {isMember && viewerRole !== "owner" && onLeave && (
            <button
              onClick={onLeave}
              disabled={leaving}
              className="px-5 py-2 rounded-lg font-semibold bg-fab-surface border border-fab-border text-fab-dim hover:text-fab-muted transition-colors text-sm disabled:opacity-50"
            >
              {leaving ? "Leaving..." : "Leave Team"}
            </button>
          )}
          {isMember && viewerRole === "owner" && (
            <span className="px-3 py-1.5 rounded-lg bg-fab-gold/15 text-fab-gold text-xs font-semibold">
              Owner
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
