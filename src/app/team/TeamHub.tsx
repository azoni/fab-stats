"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTeam, useTeamInvites } from "@/hooks/useTeam";
import { getAllTeams, acceptTeamInvite, declineTeamInvite } from "@/lib/teams";
import { TeamMemberRow } from "@/components/team/TeamMemberRow";
import { TeamInviteSearch } from "@/components/team/TeamInviteSearch";
import { TeamImageUploader } from "@/components/team/TeamImageUploader";
import { SmartSearch } from "@/components/search/SmartSearch";
import { createTeam, updateTeam, disbandTeam, leaveTeam, kickMember, updateMemberRole, transferOwnership, getPendingInvites } from "@/lib/teams";
import type { Team, TeamInvite as TeamInviteType, LeaderboardEntry } from "@/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Users, Shield, Globe, Plus, Settings, ChevronRight } from "lucide-react";

type Tab = "my-team" | "browse" | "create";

export default function TeamHub() {
  const [mounted, setMounted] = useState(false);
  const { user, profile, isAdmin: isSiteAdmin } = useAuth();
  const { team, members, myRole, loading } = useMyTeam();
  const { invites } = useTeamInvites();

  useEffect(() => { setMounted(true); }, []);

  const hasTeam = !!team;
  const [activeTab, setActiveTab] = useState<Tab>("browse");

  // Sync tab when team loads
  useEffect(() => {
    if (team) setActiveTab("my-team");
    else if (activeTab === "my-team") setActiveTab("browse");
  }, [team]); // eslint-disable-line react-hooks/exhaustive-deps

  // Browse state
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Create state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [joinMode, setJoinMode] = useState<"open" | "invite">("invite");
  const [creating, setCreating] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  // Manage state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editJoinMode, setEditJoinMode] = useState<"open" | "invite">("invite");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">("public");
  const [editAccentColor, setEditAccentColor] = useState("#d4a843");
  const [saving, setSaving] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<TeamInviteType[]>([]);
  const [confirmDisband, setConfirmDisband] = useState(false);
  const [disbanding, setDisbanding] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Load match count for create validation
  useEffect(() => {
    if (!user || profile?.teamId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "leaderboard", user.uid));
        setMatchCount(snap.exists() ? ((snap.data() as LeaderboardEntry).totalMatches ?? 0) : 0);
      } catch { setMatchCount(0); }
    })();
  }, [user, profile?.teamId]);

  // Load teams for browse
  useEffect(() => {
    if (activeTab !== "browse") return;
    setTeamsLoading(true);
    getAllTeams().then((teams) => setAllTeams(isSiteAdmin ? teams : teams.filter((t) => t.visibility !== "private"))).catch(() => {}).finally(() => setTeamsLoading(false));
  }, [activeTab]);

  // Load pending invites for manage
  useEffect(() => {
    if (team) getPendingInvites(team.id).then(setPendingInvites).catch(() => {});
  }, [team]);

  function refreshInvites() {
    if (team) getPendingInvites(team.id).then(setPendingInvites).catch(() => {});
  }

  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";
  const canCreate = matchCount !== null && matchCount >= 15 && !profile?.teamId;

  const sortedMembers = useMemo(() =>
    [...members].sort((a, b) => {
      const order = { owner: 0, admin: 1, member: 2 };
      return (order[a.role] ?? 3) - (order[b.role] ?? 3);
    }),
  [members]);

  async function handleCreate() {
    if (!user || !profile) return;
    setCreating(true);
    try {
      await createTeam(profile, matchCount ?? 0, { name: name.trim(), slug: slug.trim() || undefined, description: description.trim() || undefined, joinMode });
      toast.success("Team created!");
      setName(""); setSlug(""); setDescription("");
      setActiveTab("my-team");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create team.");
    }
    setCreating(false);
  }

  async function handleSaveEdit() {
    if (!team) return;
    setSaving(true);
    try {
      await updateTeam(team.id, { name: editName.trim(), slug: editSlug.trim() || undefined, description: editDesc.trim(), joinMode: editJoinMode, visibility: editVisibility, accentColor: editAccentColor });
      toast.success("Team updated!");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update.");
    }
    setSaving(false);
  }

  async function handleDisband() {
    if (!team || !user) return;
    setDisbanding(true);
    try {
      await disbandTeam(team.id, user.uid);
      toast.success("Team disbanded.");
      setConfirmDisband(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disband.");
    }
    setDisbanding(false);
  }

  async function handleTransfer() {
    if (!team || !user || !transferTarget) return;
    setTransferring(true);
    try {
      await transferOwnership(team.id, user.uid, transferTarget);
      toast.success("Ownership transferred.");
      setTransferTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer.");
    }
    setTransferring(false);
  }

  async function handleLeave() {
    if (!team || !user) return;
    setLeaving(true);
    try {
      await leaveTeam(team.id, user.uid);
      toast.success("You left the team.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave.");
    }
    setLeaving(false);
  }

  async function handleAcceptInvite(invite: TeamInviteType) {
    if (!profile) return;
    try {
      await acceptTeamInvite(invite.id, profile);
      toast.success(`Joined ${invite.teamName}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept.");
    }
  }

  async function handleDeclineInvite(invite: TeamInviteType) {
    try {
      await declineTeamInvite(invite.id);
      toast.success("Invite declined.");
    } catch {
      toast.error("Failed to decline.");
    }
  }

  if (!mounted || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-fab-surface rounded" />
          <div className="h-12 bg-fab-surface rounded-lg" />
          <div className="h-64 bg-fab-surface rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fab-gold">Teams</h1>
        {hasTeam && (
          <Link href={`/team/${team.nameLower}`} className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors flex items-center gap-1">
            View Team Page <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-amber-400">Team Invites</h2>
          {hasTeam && (
            <p className="text-xs text-amber-400/70">Leave your current team to accept an invite.</p>
          )}
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between bg-fab-surface rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-fab-text">{inv.teamName}</p>
                <p className="text-xs text-fab-dim">Invited by {inv.inviterName}</p>
              </div>
              <div className="flex gap-2">
                {!hasTeam && (
                  <button onClick={() => handleAcceptInvite(inv)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-win/20 text-fab-win hover:bg-fab-win/30 transition-colors">
                    Accept
                  </button>
                )}
                <button onClick={() => handleDeclineInvite(inv)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-fab-dim hover:text-fab-muted transition-colors">
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-fab-surface border border-fab-border rounded-lg p-1">
        {hasTeam && (
          <button
            onClick={() => setActiveTab("my-team")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "my-team" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:text-fab-muted"
            }`}
          >
            <Settings className="w-3.5 h-3.5 inline mr-1.5" />My Team
          </button>
        )}
        <button
          onClick={() => setActiveTab("browse")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "browse" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:text-fab-muted"
          }`}
        >
          <Users className="w-3.5 h-3.5 inline mr-1.5" />Browse Teams
        </button>
        {!hasTeam && (
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "create" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:text-fab-muted"
            }`}
          >
            <Plus className="w-3.5 h-3.5 inline mr-1.5" />Create Team
          </button>
        )}
      </div>

      {/* ── My Team tab ── */}
      {activeTab === "my-team" && team && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-fab-surface border border-fab-border rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                {team.iconUrl ? (
                  <img src={team.iconUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-fab-border" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-fab-gold/15 border border-fab-gold/30 flex items-center justify-center">
                    <span className="text-lg font-bold text-fab-gold">{team.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-fab-text">{team.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-fab-dim mt-0.5">
                    <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      team.joinMode === "open" ? "bg-fab-win/10 text-fab-win" : "bg-fab-surface text-fab-dim border border-fab-border"
                    }`}>{team.joinMode === "open" ? "Open" : "Invite Only"}</span>
                  </div>
                </div>
              </div>
              {isOwnerOrAdmin && (
                <button
                  onClick={() => { setEditing(!editing); setEditName(team.name); setEditSlug(team.nameLower); setEditDesc(team.description || ""); setEditJoinMode(team.joinMode); setEditVisibility(team.visibility || "public"); setEditAccentColor(team.accentColor || "#d4a843"); }}
                  className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors"
                >
                  {editing ? "Cancel" : "Edit"}
                </button>
              )}
            </div>

            {team.description && !editing && <p className="text-sm text-fab-muted">{team.description}</p>}

            {editing && (
              <div className="space-y-3 mt-3">
                <div>
                  <label className="block text-xs text-fab-muted mb-1">Team Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value.slice(0, 50))} maxLength={50}
                    className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text focus:outline-none focus:border-fab-gold/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-fab-muted mb-1">URL Slug</label>
                  <div className="flex items-center gap-0 bg-fab-bg border border-fab-border rounded-lg overflow-hidden">
                    <span className="text-xs text-fab-dim pl-3 shrink-0">fabstats.net/team/</span>
                    <input type="text" value={editSlug} onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30))} maxLength={30}
                      className="flex-1 bg-transparent py-2 pr-3 text-sm text-fab-text focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-fab-muted mb-1">Description</label>
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value.slice(0, 500))} maxLength={500} rows={3}
                    className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text focus:outline-none focus:border-fab-gold/50 transition-colors resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-fab-muted mb-1">Join Mode</label>
                  <div className="flex gap-2">
                    {(["invite", "open"] as const).map((mode) => (
                      <button key={mode} onClick={() => setEditJoinMode(mode)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          editJoinMode === mode ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30" : "bg-fab-bg border border-fab-border text-fab-dim"
                        }`}>
                        {mode === "invite" ? "Invite Only" : "Open"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-fab-muted mb-1">Visibility</label>
                  <div className="flex gap-2">
                    {(["public", "private"] as const).map((v) => (
                      <button key={v} onClick={() => setEditVisibility(v)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          editVisibility === v ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30" : "bg-fab-bg border border-fab-border text-fab-dim"
                        }`}>
                        {v === "public" ? "Public" : "Private"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-fab-dim mt-1">{editVisibility === "public" ? "Anyone can find and view your team." : "Team is hidden from browse and search."}</p>
                </div>
                <div>
                  <label className="block text-xs text-fab-muted mb-1">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {["#d4a843", "#ef4444", "#f97316", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"].map((c) => (
                        <button key={c} onClick={() => setEditAccentColor(c)}
                          className={`w-7 h-7 rounded-lg transition-all ${editAccentColor === c ? "ring-2 ring-white/40 scale-110" : "ring-1 ring-white/10 hover:ring-white/20"}`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <input type="color" value={editAccentColor} onChange={(e) => setEditAccentColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent" title="Custom color" />
                  </div>
                </div>
                <button onClick={handleSaveEdit} disabled={saving || !editName.trim()}
                  className="w-full py-2 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          {/* Image uploads */}
          {isOwnerOrAdmin && (
            <div className="bg-fab-surface border border-fab-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-fab-text mb-4">Team Images</h3>
              <TeamImageUploader teamId={team.id} currentIconUrl={team.iconUrl} currentBackgroundUrl={team.backgroundUrl}
                onIconUploaded={() => {}} onBackgroundUploaded={() => {}} />
            </div>
          )}

          {/* Invite search */}
          {isOwnerOrAdmin && user && profile && (
            <div className="bg-fab-surface border border-fab-border rounded-xl p-6">
              <TeamInviteSearch teamId={team.id} teamName={team.name} teamIconUrl={team.iconUrl}
                inviter={{ uid: user.uid, displayName: profile.displayName }}
                members={members} pendingInvites={pendingInvites} onInviteSent={refreshInvites} />
            </div>
          )}

          {/* Members */}
          <div className="bg-fab-surface border border-fab-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-fab-text mb-3">Members ({members.length})</h3>
            <div className="divide-y divide-fab-border">
              {sortedMembers.map((m) => (
                <TeamMemberRow key={m.uid} member={m} viewerRole={myRole} isOwner={myRole === "owner"}
                  onPromote={(uid) => { if (team && user) updateMemberRole(team.id, user.uid, uid, "admin").then(() => toast.success("Promoted.")).catch(() => toast.error("Failed.")); }}
                  onDemote={(uid) => { if (team && user) updateMemberRole(team.id, user.uid, uid, "member").then(() => toast.success("Demoted.")).catch(() => toast.error("Failed.")); }}
                  onKick={(uid) => { if (team && user) kickMember(team.id, user.uid, uid).then(() => toast.success("Removed.")).catch(() => toast.error("Failed.")); }}
                />
              ))}
            </div>
          </div>

          {/* Transfer Ownership (owner only) */}
          {myRole === "owner" && members.length > 1 && (
            <div className="bg-fab-surface border border-fab-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-fab-text mb-3">Transfer Ownership</h3>
              {!transferTarget ? (
                <div className="space-y-2">
                  <p className="text-xs text-fab-dim">Select a member to make the new owner. You will become an admin.</p>
                  <div className="flex flex-wrap gap-2">
                    {members.filter((m) => m.uid !== user?.uid).map((m) => (
                      <button key={m.uid} onClick={() => setTransferTarget(m.uid)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors">
                        {m.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-sm text-amber-400 font-medium mb-2">
                    Transfer ownership to {members.find((m) => m.uid === transferTarget)?.displayName}?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleTransfer} disabled={transferring}
                      className="px-4 py-1.5 rounded-lg bg-fab-gold text-fab-bg text-sm font-semibold hover:bg-fab-gold-light transition-colors disabled:opacity-50">
                      {transferring ? "Transferring..." : "Confirm Transfer"}
                    </button>
                    <button onClick={() => setTransferTarget(null)}
                      className="px-4 py-1.5 rounded-lg bg-fab-surface border border-fab-border text-fab-dim text-sm hover:text-fab-muted transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leave / Disband */}
          <div className="bg-fab-surface border border-fab-border rounded-xl p-6">
            {myRole === "owner" ? (
              !confirmDisband ? (
                <button onClick={() => setConfirmDisband(true)} className="text-sm text-fab-loss hover:text-fab-loss/80 transition-colors">
                  Disband Team...
                </button>
              ) : (
                <div className="bg-fab-loss/10 border border-fab-loss/30 rounded-lg p-3">
                  <p className="text-sm text-fab-loss font-medium mb-2">This will permanently delete the team and remove all members.</p>
                  <div className="flex gap-2">
                    <button onClick={handleDisband} disabled={disbanding}
                      className="px-4 py-1.5 rounded-lg bg-fab-loss text-white text-sm font-semibold hover:bg-fab-loss/80 transition-colors disabled:opacity-50">
                      {disbanding ? "Disbanding..." : "Confirm Disband"}
                    </button>
                    <button onClick={() => setConfirmDisband(false)}
                      className="px-4 py-1.5 rounded-lg bg-fab-surface border border-fab-border text-fab-dim text-sm hover:text-fab-muted transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )
            ) : (
              <button onClick={handleLeave} disabled={leaving}
                className="text-sm text-fab-loss hover:text-fab-loss/80 transition-colors disabled:opacity-50">
                {leaving ? "Leaving..." : "Leave Team"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Browse tab ── */}
      {activeTab === "browse" && (
        <div className="space-y-4">
          <SmartSearch placeholder="Search players or teams..." />

          {teamsLoading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-fab-surface rounded-lg animate-pulse" />)}
            </div>
          )}

          {!teamsLoading && allTeams.length === 0 && (
            <div className="text-center py-12 text-fab-dim">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No teams yet. Be the first to create one!</p>
            </div>
          )}

          {!teamsLoading && allTeams.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allTeams.sort((a, b) => b.memberCount - a.memberCount).map((t) => (
                <Link key={t.id} href={`/team/${t.nameLower}`}
                  className="bg-fab-surface border border-fab-border rounded-xl p-4 hover:border-fab-gold/30 hover:bg-fab-surface-hover transition-colors group">
                  <div className="flex items-center gap-3">
                    {t.iconUrl ? (
                      <img src={t.iconUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-fab-border shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-fab-gold/15 border border-fab-gold/30 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-fab-gold">{t.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-fab-text group-hover:text-fab-gold transition-colors truncate">{t.name}</p>
                        {isSiteAdmin && t.visibility === "private" && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 shrink-0">Private</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-fab-dim mt-0.5">
                        <span>{t.memberCount} member{t.memberCount !== 1 ? "s" : ""}</span>
                        {t.joinMode === "open" ? (
                          <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" /> Open</span>
                        ) : (
                          <span className="flex items-center gap-0.5"><Shield className="w-3 h-3" /> Invite Only</span>
                        )}
                      </div>
                      {t.description && <p className="text-xs text-fab-muted mt-1 line-clamp-1">{t.description}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create tab ── */}
      {activeTab === "create" && (
        <div className="bg-fab-surface border border-fab-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-fab-text mb-4">Create a Team</h2>

          {!user && (
            <div className="text-center py-8">
              <p className="text-sm text-fab-dim mb-3">Sign in to create a team.</p>
              <Link href="/settings" className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors">Go to Settings</Link>
            </div>
          )}

          {user && matchCount !== null && matchCount < 15 && (
            <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-3 text-sm text-fab-draw mb-4">
              You need at least 15 logged matches to create a team. You have {matchCount}.
            </div>
          )}

          {user && profile?.teamId && (
            <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-3 text-sm text-fab-draw mb-4">
              You&apos;re already on a team. Leave your current team first.
            </div>
          )}

          {user && canCreate && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-fab-muted mb-1">Team Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value.slice(0, 50))} placeholder="Enter team name..." maxLength={50}
                  className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 transition-colors" />
                <span className="text-[10px] text-fab-dim">{name.length}/50</span>
              </div>
              <div>
                <label className="block text-xs text-fab-muted mb-1">URL Slug (optional)</label>
                <div className="flex items-center gap-0 bg-fab-bg border border-fab-border rounded-lg overflow-hidden">
                  <span className="text-xs text-fab-dim pl-3 shrink-0">fabstats.net/team/</span>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30))} placeholder={name ? name.toLowerCase().replace(/[^a-z0-9]/g, "") : "teamname"} maxLength={30}
                    className="flex-1 bg-transparent py-2 pr-3 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none" />
                </div>
                <span className="text-[10px] text-fab-dim">Leave blank to auto-generate from team name</span>
              </div>
              <div>
                <label className="block text-xs text-fab-muted mb-1">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} placeholder="Tell others about your team..." maxLength={500} rows={3}
                  className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 transition-colors resize-none" />
                <span className="text-[10px] text-fab-dim">{description.length}/500</span>
              </div>
              <div>
                <label className="block text-xs text-fab-muted mb-1">Join Mode</label>
                <div className="flex gap-2">
                  {(["invite", "open"] as const).map((mode) => (
                    <button key={mode} onClick={() => setJoinMode(mode)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        joinMode === mode ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30" : "bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-muted"
                      }`}>
                      {mode === "invite" ? "Invite Only" : "Open"}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-fab-dim mt-1">{joinMode === "invite" ? "Only invited users can join." : "Anyone can join your team."}</p>
              </div>
              <button onClick={handleCreate} disabled={!name.trim() || creating}
                className="w-full py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm disabled:opacity-50">
                {creating ? "Creating..." : "Create Team"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
