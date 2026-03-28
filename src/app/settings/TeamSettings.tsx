"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTeam } from "@/hooks/useTeam";
import { createTeam, updateTeam, disbandTeam, leaveTeam, kickMember, updateMemberRole, getPendingInvites } from "@/lib/teams";
import { TeamMemberRow } from "@/components/team/TeamMemberRow";
import { TeamInviteSearch } from "@/components/team/TeamInviteSearch";
import { TeamImageUploader } from "@/components/team/TeamImageUploader";
import type { TeamInvite, LeaderboardEntry } from "@/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import Link from "next/link";

export function TeamSettings() {
  const { user, profile } = useAuth();
  const { team, members, myRole, loading } = useMyTeam();

  // Create team form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinMode, setJoinMode] = useState<"open" | "invite">("invite");
  const [creating, setCreating] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  // Edit team
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editJoinMode, setEditJoinMode] = useState<"open" | "invite">("invite");
  const [saving, setSaving] = useState(false);

  // Invites
  const [pendingInvites, setPendingInvites] = useState<TeamInvite[]>([]);

  // Danger zone
  const [confirmDisband, setConfirmDisband] = useState(false);
  const [disbanding, setDisbanding] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Fetch match count for create validation
  useEffect(() => {
    if (!user || profile?.teamId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "leaderboard", user.uid));
        if (snap.exists()) {
          setMatchCount((snap.data() as LeaderboardEntry).totalMatches ?? 0);
        } else {
          setMatchCount(0);
        }
      } catch {
        setMatchCount(0);
      }
    })();
  }, [user, profile?.teamId]);

  // Fetch pending invites when team loads
  useEffect(() => {
    if (!team) { setPendingInvites([]); return; }
    getPendingInvites(team.id).then(setPendingInvites).catch(() => {});
  }, [team]);

  function refreshInvites() {
    if (team) getPendingInvites(team.id).then(setPendingInvites).catch(() => {});
  }

  async function handleCreate() {
    if (!user || !profile) return;
    setCreating(true);
    try {
      await createTeam(profile, matchCount ?? 0, { name: name.trim(), description: description.trim() || undefined, joinMode });
      toast.success("Team created!");
      setName("");
      setDescription("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create team.");
    }
    setCreating(false);
  }

  async function handleSaveEdit() {
    if (!team) return;
    setSaving(true);
    try {
      await updateTeam(team.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        joinMode: editJoinMode,
      });
      toast.success("Team updated!");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update team.");
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
      toast.error(err instanceof Error ? err.message : "Failed to disband team.");
    }
    setDisbanding(false);
  }

  async function handleLeave() {
    if (!team || !user) return;
    setLeaving(true);
    try {
      await leaveTeam(team.id, user.uid);
      toast.success("You left the team.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave team.");
    }
    setLeaving(false);
  }

  async function handlePromote(uid: string) {
    if (!team || !user) return;
    try {
      await updateMemberRole(team.id, user.uid, uid, "admin");
      toast.success("Member promoted to admin.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote.");
    }
  }

  async function handleDemote(uid: string) {
    if (!team || !user) return;
    try {
      await updateMemberRole(team.id, user.uid, uid, "member");
      toast.success("Admin demoted to member.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to demote.");
    }
  }

  async function handleKick(uid: string) {
    if (!team || !user) return;
    try {
      await kickMember(team.id, user.uid, uid);
      toast.success("Member removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to kick member.");
    }
  }

  if (loading) {
    return <p className="text-sm text-fab-dim py-4">Loading team...</p>;
  }

  // ── No team: show create form ──
  if (!team) {
    const canCreate = matchCount !== null && matchCount >= 25;

    return (
      <div>
        <h3 className="text-sm font-semibold text-fab-text mb-3">Create a Team</h3>
        {matchCount !== null && matchCount < 25 && (
          <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-3 text-sm text-fab-draw mb-4">
            You need at least 25 logged matches to create a team. You have {matchCount}.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-fab-muted mb-1">Team Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="Enter team name..."
              maxLength={50}
              disabled={!canCreate}
              className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 transition-colors disabled:opacity-50"
            />
            <span className="text-[10px] text-fab-dim">{name.length}/50</span>
          </div>

          <div>
            <label className="block text-xs text-fab-muted mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Tell others about your team..."
              maxLength={500}
              rows={3}
              disabled={!canCreate}
              className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 transition-colors resize-none disabled:opacity-50"
            />
            <span className="text-[10px] text-fab-dim">{description.length}/500</span>
          </div>

          <div>
            <label className="block text-xs text-fab-muted mb-1">Join Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setJoinMode("invite")}
                disabled={!canCreate}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  joinMode === "invite"
                    ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30"
                    : "bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-muted"
                } disabled:opacity-50`}
              >
                Invite Only
              </button>
              <button
                onClick={() => setJoinMode("open")}
                disabled={!canCreate}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  joinMode === "open"
                    ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30"
                    : "bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-muted"
                } disabled:opacity-50`}
              >
                Open
              </button>
            </div>
            <p className="text-[10px] text-fab-dim mt-1">
              {joinMode === "invite" ? "Only invited users can join." : "Anyone can join your team."}
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={!canCreate || !name.trim() || creating}
            className="w-full py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Team"}
          </button>
        </div>
      </div>
    );
  }

  // ── Has team ──
  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";
  const sortedMembers = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    return (order[a.role] ?? 3) - (order[b.role] ?? 3);
  });

  return (
    <div className="space-y-5">
      {/* Team header / edit */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {team.iconUrl ? (
              <img src={team.iconUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-fab-border" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-fab-gold/15 flex items-center justify-center">
                <span className="text-sm font-bold text-fab-gold">{team.name.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div>
              <Link href={`/team/${team.nameLower}`} className="text-sm font-semibold text-fab-text hover:text-fab-gold transition-colors">
                {team.name}
              </Link>
              <div className="flex items-center gap-2 text-xs text-fab-dim">
                <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  team.joinMode === "open" ? "bg-fab-win/10 text-fab-win" : "bg-fab-surface text-fab-dim"
                }`}>
                  {team.joinMode === "open" ? "Open" : "Invite Only"}
                </span>
              </div>
            </div>
          </div>
          {isOwnerOrAdmin && (
            <button
              onClick={() => { setEditing(!editing); setEditName(team.name); setEditDesc(team.description || ""); setEditJoinMode(team.joinMode); }}
              className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
          )}
        </div>

        {team.description && !editing && (
          <p className="text-sm text-fab-muted">{team.description}</p>
        )}

        {editing && (
          <div className="space-y-3 mt-3">
            <div>
              <label className="block text-xs text-fab-muted mb-1">Team Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value.slice(0, 50))}
                maxLength={50}
                className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text focus:outline-none focus:border-fab-gold/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-fab-muted mb-1">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={3}
                className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text focus:outline-none focus:border-fab-gold/50 transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-fab-muted mb-1">Join Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditJoinMode("invite")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    editJoinMode === "invite"
                      ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30"
                      : "bg-fab-bg border border-fab-border text-fab-dim"
                  }`}
                >
                  Invite Only
                </button>
                <button
                  onClick={() => setEditJoinMode("open")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    editJoinMode === "open"
                      ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30"
                      : "bg-fab-bg border border-fab-border text-fab-dim"
                  }`}
                >
                  Open
                </button>
              </div>
            </div>
            <button
              onClick={handleSaveEdit}
              disabled={saving || !editName.trim()}
              className="w-full py-2 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Image uploads (owner/admin only) */}
      {isOwnerOrAdmin && (
        <TeamImageUploader
          teamId={team.id}
          currentIconUrl={team.iconUrl}
          currentBackgroundUrl={team.backgroundUrl}
          onIconUploaded={() => {}}
          onBackgroundUploaded={() => {}}
        />
      )}

      {/* Invite search (owner/admin only) */}
      {isOwnerOrAdmin && user && profile && (
        <TeamInviteSearch
          teamId={team.id}
          teamName={team.name}
          teamIconUrl={team.iconUrl}
          inviter={{ uid: user.uid, displayName: profile.displayName }}
          members={members}
          pendingInvites={pendingInvites}
          onInviteSent={refreshInvites}
        />
      )}

      {/* Members list */}
      <div>
        <label className="block text-xs text-fab-muted mb-1.5 font-medium">Members ({members.length})</label>
        <div className="border border-fab-border rounded-lg divide-y divide-fab-border">
          {sortedMembers.map((m) => (
            <TeamMemberRow
              key={m.uid}
              member={m}
              viewerRole={myRole}
              isOwner={myRole === "owner"}
              onPromote={handlePromote}
              onDemote={handleDemote}
              onKick={handleKick}
            />
          ))}
        </div>
      </div>

      {/* Leave / Disband */}
      <div className="pt-2 border-t border-fab-border">
        {myRole === "owner" ? (
          <div>
            {!confirmDisband ? (
              <button
                onClick={() => setConfirmDisband(true)}
                className="text-sm text-fab-loss hover:text-fab-loss/80 transition-colors"
              >
                Disband Team...
              </button>
            ) : (
              <div className="bg-fab-loss/10 border border-fab-loss/30 rounded-lg p-3">
                <p className="text-sm text-fab-loss font-medium mb-2">This will permanently delete the team and remove all members.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDisband}
                    disabled={disbanding}
                    className="px-4 py-1.5 rounded-lg bg-fab-loss text-white text-sm font-semibold hover:bg-fab-loss/80 transition-colors disabled:opacity-50"
                  >
                    {disbanding ? "Disbanding..." : "Confirm Disband"}
                  </button>
                  <button
                    onClick={() => setConfirmDisband(false)}
                    className="px-4 py-1.5 rounded-lg bg-fab-surface border border-fab-border text-fab-dim text-sm hover:text-fab-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="text-sm text-fab-loss hover:text-fab-loss/80 transition-colors disabled:opacity-50"
          >
            {leaving ? "Leaving..." : "Leave Team"}
          </button>
        )}
      </div>
    </div>
  );
}
