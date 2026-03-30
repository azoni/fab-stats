"use client";
import { useState } from "react";
import Link from "next/link";
import type { GroupMember, LeaderboardEntry } from "@/types";
import { Crown, ShieldCheck, Pencil, Check, X } from "lucide-react";
import { updateMemberTitle } from "@/lib/groups";
import { toast } from "sonner";

interface GroupRosterProps {
  members: GroupMember[];
  leaderboardMap: Map<string, LeaderboardEntry>;
  accentColor?: string;
  filteredStats?: Map<string, { matches: number; wins: number; winRate: number }> | null;
  groupId?: string;
  viewerRole?: "owner" | "admin" | "member" | null;
  viewerUid?: string;
  onMemberUpdated?: () => void;
}

const ROLE_CONFIG: Record<string, { label: string; cls: string; icon?: typeof Crown }> = {
  owner: { label: "Owner", cls: "text-fab-gold", icon: Crown },
  admin: { label: "Admin", cls: "text-violet-400", icon: ShieldCheck },
};

export function GroupRoster({ members, leaderboardMap, accentColor = "#d4a843", filteredStats, groupId, viewerRole, viewerUid, onMemberUpdated }: GroupRosterProps) {
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const canEditTitles = viewerRole === "owner" || viewerRole === "admin";

  const sorted = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    const roleSort = (order[a.role] ?? 3) - (order[b.role] ?? 3);
    if (roleSort !== 0) return roleSort;
    const aMatches = leaderboardMap.get(a.uid)?.totalMatches ?? 0;
    const bMatches = leaderboardMap.get(b.uid)?.totalMatches ?? 0;
    return bMatches - aMatches;
  });

  async function handleSaveTitle(memberUid: string) {
    if (!groupId || !viewerUid) return;
    setSavingTitle(true);
    try {
      await updateMemberTitle(groupId, viewerUid, memberUid, titleDraft);
      toast.success(titleDraft.trim() ? "Title updated" : "Title removed");
      setEditingTitle(null);
      onMemberUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update title");
    } finally {
      setSavingTitle(false);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-bold text-fab-text uppercase tracking-wider mb-4">
        Roster <span className="text-fab-dim font-normal normal-case tracking-normal">({members.length})</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sorted.map((member) => {
          const lb = leaderboardMap.get(member.uid);
          const role = ROLE_CONFIG[member.role];
          const isEditingThis = editingTitle === member.uid;

          return (
            <div key={member.uid} className="bg-fab-surface border border-fab-border rounded-xl p-4 hover:border-white/15 transition-all group relative">
              <Link
                href={`/player/${member.username}`}
                className="block"
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
                    {member.title && !isEditingThis && (
                      <p className="text-[11px] text-fab-muted mt-0.5 truncate">{member.title}</p>
                    )}
                  </div>
                </div>
              </Link>

              {/* Title editing */}
              {isEditingThis && (
                <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    placeholder="e.g. Captain, Coach, Analyst..."
                    maxLength={40}
                    autoFocus
                    className="flex-1 bg-fab-bg border border-fab-border rounded-md px-2 py-1 text-xs text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(member.uid); if (e.key === "Escape") setEditingTitle(null); }}
                  />
                  <button
                    onClick={() => handleSaveTitle(member.uid)}
                    disabled={savingTitle}
                    className="p-1 rounded text-fab-win hover:bg-fab-win/10 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingTitle(null)}
                    className="p-1 rounded text-fab-loss hover:bg-fab-loss/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Edit title button */}
              {canEditTitles && !isEditingThis && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingTitle(member.uid); setTitleDraft(member.title || ""); }}
                  className="absolute top-2 right-2 p-1.5 rounded-md text-fab-dim opacity-0 group-hover:opacity-100 hover:text-fab-text hover:bg-fab-surface-hover transition-all"
                  title="Set title"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}

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
            </div>
          );
        })}
      </div>
    </div>
  );
}
