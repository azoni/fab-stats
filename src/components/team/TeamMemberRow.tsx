"use client";
import Link from "next/link";
import type { TeamMember } from "@/types";

interface TeamMemberRowProps {
  member: TeamMember;
  viewerRole: "owner" | "admin" | "member" | null;
  isOwner: boolean;
  onPromote?: (uid: string) => void;
  onDemote?: (uid: string) => void;
  onKick?: (uid: string) => void;
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  owner: { label: "Owner", cls: "bg-fab-gold/15 text-fab-gold" },
  admin: { label: "Admin", cls: "bg-violet-500/15 text-violet-400" },
  member: { label: "Member", cls: "bg-fab-surface text-fab-dim" },
};

export function TeamMemberRow({ member, viewerRole, isOwner, onPromote, onDemote, onKick }: TeamMemberRowProps) {
  const badge = ROLE_BADGE[member.role] ?? ROLE_BADGE.member;
  const canManage = viewerRole === "owner" || viewerRole === "admin";
  const canChangeRole = isOwner && member.role !== "owner";
  const canKick = canManage && member.role !== "owner";

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-fab-surface-hover transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {member.photoUrl ? (
          <img src={member.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-fab-border flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-fab-dim">{member.displayName.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="min-w-0">
          <Link href={`/player/${member.username}`} className="text-sm font-medium text-fab-text hover:text-fab-gold transition-colors truncate block">
            {member.displayName}
          </Link>
          <span className="text-xs text-fab-dim">@{member.username}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {canManage && member.role !== "owner" && (
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {canChangeRole && member.role === "member" && onPromote && (
            <button
              onClick={() => onPromote(member.uid)}
              className="text-[11px] px-2 py-1 rounded bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
            >
              Promote
            </button>
          )}
          {canChangeRole && member.role === "admin" && onDemote && (
            <button
              onClick={() => onDemote(member.uid)}
              className="text-[11px] px-2 py-1 rounded bg-fab-surface text-fab-dim hover:bg-fab-border transition-colors"
            >
              Demote
            </button>
          )}
          {canKick && onKick && (
            <button
              onClick={() => onKick(member.uid)}
              className="text-[11px] px-2 py-1 rounded bg-fab-loss/10 text-fab-loss hover:bg-fab-loss/20 transition-colors"
            >
              Kick
            </button>
          )}
        </div>
      )}
    </div>
  );
}
