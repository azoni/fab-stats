"use client";
import type { Team, TeamMember } from "@/types";
import { Users, Shield, Globe, Calendar, EyeOff, Share2 } from "lucide-react";

interface TeamHeaderProps {
  team: Team;
  members: TeamMember[];
  viewerRole: "owner" | "admin" | "member" | null;
  onJoin?: () => void;
  onLeave?: () => void;
  onShare?: () => void;
  joining?: boolean;
  leaving?: boolean;
  canJoin?: boolean;
  isSiteAdmin?: boolean;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export function TeamHeader({ team, members, viewerRole, onJoin, onLeave, onShare, joining, leaving, canJoin, isSiteAdmin }: TeamHeaderProps) {
  const isMember = viewerRole !== null;
  const accent = team.accentColor || "#d4a843";
  const hasBg = !!team.backgroundUrl;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-fab-border">
      {/* Background layer */}
      <div className="absolute inset-0">
        {hasBg ? (
          <img
            src={team.backgroundUrl}
            alt=""
            className="w-full h-full object-cover scale-110 blur-sm opacity-40"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${accent}18 0%, transparent 50%, ${accent}08 100%)`,
            }}
          />
        )}
        {/* Gradient overlay for readability */}
        <div
          className="absolute inset-0"
          style={{
            background: hasBg
              ? `linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.3) 100%)`
              : "transparent",
          }}
        />
      </div>

      {/* Accent bar */}
      <div className="absolute top-0 inset-x-0 h-1" style={{ background: accent }} />

      {/* Content */}
      <div className="relative px-6 pt-8 pb-6 md:px-8 md:pt-10 md:pb-8">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Icon */}
          {team.iconUrl ? (
            <img
              src={team.iconUrl}
              alt={team.name}
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover shrink-0 ring-2 ring-white/10 shadow-lg"
            />
          ) : (
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ring-2 ring-white/10"
              style={{ background: `linear-gradient(135deg, ${accent}40, ${accent}20)` }}
            >
              <span className="text-3xl md:text-4xl font-black" style={{ color: accent }}>
                {team.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{team.name}</h1>
              {isSiteAdmin && team.visibility === "private" && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                  <EyeOff className="w-3 h-3" /> Private
                </span>
              )}
            </div>
            {team.description && (
              <p className="text-sm text-white/70 mt-1.5 max-w-xl leading-relaxed">{team.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-white/50">
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
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Est. {formatDate(team.createdAt)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 sm:self-center flex items-center gap-2">
            {onShare && (
              <button
                onClick={onShare}
                className="p-2 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-all"
                title="Share team card"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            {!isMember && team.joinMode === "open" && canJoin && onJoin && (
              <button
                onClick={onJoin}
                disabled={joining}
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 shadow-lg"
                style={{ background: accent, color: "#111" }}
              >
                {joining ? "Joining..." : "Join Team"}
              </button>
            )}
            {isMember && viewerRole !== "owner" && onLeave && (
              <button
                onClick={onLeave}
                disabled={leaving}
                className="px-5 py-2 rounded-xl font-semibold bg-white/10 backdrop-blur border border-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-all text-sm disabled:opacity-50"
              >
                {leaving ? "Leaving..." : "Leave Team"}
              </button>
            )}
            {isMember && viewerRole === "owner" && (
              <span
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: `${accent}25`, color: accent }}
              >
                Owner
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
