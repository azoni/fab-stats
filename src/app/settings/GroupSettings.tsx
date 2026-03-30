"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups } from "@/hooks/useGroup";
import {
  createGroup,
  updateGroup,
  disbandGroup,
  leaveGroup,
  kickMember,
  updateMemberRole,
  transferOwnership,
  getPendingInvites,
  getGroupMembers,
} from "@/lib/groups";
import { GroupMemberRow } from "@/components/group/GroupMemberRow";
import { GroupInviteSearch } from "@/components/group/GroupInviteSearch";
import { GroupImageUploader } from "@/components/group/GroupImageUploader";
import type { GroupMember, GroupInvite } from "@/types";
import { toast } from "sonner";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

interface GroupSectionProps {
  groupId: string;
  groupName: string;
}

/** Expandable management panel for a single group */
function GroupSection({ groupId, groupName }: GroupSectionProps) {
  const { user, profile } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [myRole, setMyRole] = useState<"owner" | "admin" | "member" | null>(null);
  const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Edit group
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editJoinMode, setEditJoinMode] = useState<"open" | "invite">("invite");
  const [saving, setSaving] = useState(false);

  // Danger zone
  const [confirmDisband, setConfirmDisband] = useState(false);
  const [disbanding, setDisbanding] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Transfer ownership
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Load members + invites when expanded
  useEffect(() => {
    if (!expanded || !user) return;
    setLoadingMembers(true);
    Promise.all([
      getGroupMembers(groupId),
      getPendingInvites(groupId),
    ])
      .then(([m, inv]) => {
        setMembers(m);
        setPendingInvites(inv);
        const me = m.find((mem) => mem.uid === user.uid);
        setMyRole(me?.role ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [expanded, groupId, user]);

  function refreshMembers() {
    getGroupMembers(groupId).then((m) => {
      setMembers(m);
      const me = m.find((mem) => mem.uid === user?.uid);
      setMyRole(me?.role ?? null);
    }).catch(() => {});
  }

  function refreshInvites() {
    getPendingInvites(groupId).then(setPendingInvites).catch(() => {});
  }

  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";
  const group = { id: groupId, name: groupName }; // minimal for display

  const sortedMembers = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    return (order[a.role] ?? 3) - (order[b.role] ?? 3);
  });

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await updateGroup(groupId, {
        name: editName.trim(),
        description: editDesc.trim(),
        joinMode: editJoinMode,
      });
      toast.success("Group updated!");
      setEditing(false);
      refreshMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update group.");
    }
    setSaving(false);
  }

  async function handleDisband() {
    if (!user) return;
    setDisbanding(true);
    try {
      await disbandGroup(groupId, user.uid);
      toast.success("Group disbanded.");
      setConfirmDisband(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disband group.");
    }
    setDisbanding(false);
  }

  async function handleLeave() {
    if (!user) return;
    setLeaving(true);
    try {
      await leaveGroup(groupId, user.uid);
      toast.success("You left the group.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave group.");
    }
    setLeaving(false);
  }

  async function handlePromote(uid: string) {
    if (!user) return;
    try {
      await updateMemberRole(groupId, user.uid, uid, "admin");
      toast.success("Member promoted to admin.");
      refreshMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote.");
    }
  }

  async function handleDemote(uid: string) {
    if (!user) return;
    try {
      await updateMemberRole(groupId, user.uid, uid, "member");
      toast.success("Admin demoted to member.");
      refreshMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to demote.");
    }
  }

  async function handleKick(uid: string) {
    if (!user) return;
    try {
      await kickMember(groupId, user.uid, uid);
      toast.success("Member removed.");
      refreshMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to kick member.");
    }
  }

  async function handleTransfer(targetUid: string) {
    if (!user) return;
    setTransferring(true);
    try {
      await transferOwnership(groupId, user.uid, targetUid);
      toast.success("Ownership transferred.");
      setTransferTarget(null);
      refreshMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer ownership.");
    }
    setTransferring(false);
  }

  return (
    <div className="border border-fab-border rounded-lg overflow-hidden">
      {/* Collapse header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-fab-surface hover:bg-fab-surface-hover transition-colors"
      >
        <span className="text-sm font-semibold text-fab-text">{groupName}</span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-fab-dim" />
        ) : (
          <ChevronRight className="w-4 h-4 text-fab-dim" />
        )}
      </button>

      {expanded && (
        <div className="px-4 py-4 space-y-5">
          {loadingMembers ? (
            <p className="text-sm text-fab-dim">Loading...</p>
          ) : isOwnerOrAdmin ? (
            <>
              {/* Edit group */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Link
                    href={`/group/${groupId}`}
                    className="text-sm font-semibold text-fab-text hover:text-fab-gold transition-colors"
                  >
                    {groupName}
                  </Link>
                  <button
                    onClick={() => {
                      setEditing(!editing);
                      setEditName(groupName);
                      setEditDesc("");
                      setEditJoinMode("invite");
                    }}
                    className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors"
                  >
                    {editing ? "Cancel" : "Edit"}
                  </button>
                </div>

                {editing && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="block text-xs text-fab-muted mb-1">Group Name</label>
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

              {/* Icon upload (icon only, no background) */}
              <GroupImageUploader
                groupId={groupId}
                currentIconUrl={undefined}
                onIconUploaded={() => {}}
              />

              {/* Invite search */}
              {user && profile && (
                <GroupInviteSearch
                  groupId={groupId}
                  groupName={groupName}
                  groupIconUrl={undefined}
                  inviter={{ uid: user.uid, displayName: profile.displayName }}
                  members={members}
                  pendingInvites={pendingInvites}
                  onInviteSent={refreshInvites}
                />
              )}

              {/* Members list */}
              <div>
                <label className="block text-xs text-fab-muted mb-1.5 font-medium">
                  Members ({members.length})
                </label>
                <div className="border border-fab-border rounded-lg divide-y divide-fab-border">
                  {sortedMembers.map((m) => (
                    <GroupMemberRow
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

              {/* Transfer ownership (owner only) */}
              {myRole === "owner" && (
                <div>
                  <label className="block text-xs text-fab-muted mb-1.5 font-medium">Transfer Ownership</label>
                  <div className="flex flex-wrap gap-2">
                    {members
                      .filter((m) => m.uid !== user?.uid)
                      .map((m) => (
                        <button
                          key={m.uid}
                          onClick={() => setTransferTarget(transferTarget === m.uid ? null : m.uid)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            transferTarget === m.uid
                              ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30"
                              : "bg-fab-surface border border-fab-border text-fab-dim hover:text-fab-muted"
                          }`}
                        >
                          {m.displayName}
                        </button>
                      ))}
                  </div>
                  {transferTarget && (
                    <button
                      onClick={() => handleTransfer(transferTarget)}
                      disabled={transferring}
                      className="mt-2 px-4 py-1.5 rounded-lg bg-fab-gold text-fab-bg text-sm font-semibold hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                    >
                      {transferring ? "Transferring..." : "Confirm Transfer"}
                    </button>
                  )}
                </div>
              )}

              {/* Disband (owner only) */}
              {myRole === "owner" && (
                <div className="pt-2 border-t border-fab-border">
                  {!confirmDisband ? (
                    <button
                      onClick={() => setConfirmDisband(true)}
                      className="text-sm text-fab-loss hover:text-fab-loss/80 transition-colors"
                    >
                      Disband Group...
                    </button>
                  ) : (
                    <div className="bg-fab-loss/10 border border-fab-loss/30 rounded-lg p-3">
                      <p className="text-sm text-fab-loss font-medium mb-2">
                        This will permanently delete the group and remove all members.
                      </p>
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
              )}
            </>
          ) : (
            /* Regular member: just show leave */
            <div className="pt-2">
              <p className="text-sm text-fab-dim mb-3">
                You are a member of this group. Only owners and admins can manage settings.
              </p>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="text-sm text-fab-loss hover:text-fab-loss/80 transition-colors disabled:opacity-50"
              >
                {leaving ? "Leaving..." : "Leave Group"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GroupSettings() {
  const { user, profile } = useAuth();
  const { groups, loading } = useMyGroups();

  // Create group form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinMode, setJoinMode] = useState<"open" | "invite">("invite");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!user || !profile) return;
    setCreating(true);
    try {
      await createGroup(profile, {
        name: name.trim(),
        description: description.trim() || undefined,
        joinMode,
      });
      toast.success("Group created!");
      setName("");
      setDescription("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create group.");
    }
    setCreating(false);
  }

  if (loading) {
    return <p className="text-sm text-fab-dim py-4">Loading groups...</p>;
  }

  return (
    <div className="space-y-5">
      {/* Existing groups */}
      {groups.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-fab-text">Your Groups</h3>
          {groups.map((g) => (
            <GroupSection key={g.id} groupId={g.id} groupName={g.name} />
          ))}
        </div>
      )}

      {/* Create group */}
      <div>
        <h3 className="text-sm font-semibold text-fab-text mb-3">Create a Group</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-fab-muted mb-1">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="Enter group name..."
              maxLength={50}
              className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 transition-colors"
            />
            <span className="text-[10px] text-fab-dim">{name.length}/50</span>
          </div>

          <div>
            <label className="block text-xs text-fab-muted mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Tell others about your group..."
              maxLength={500}
              rows={3}
              className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 transition-colors resize-none"
            />
            <span className="text-[10px] text-fab-dim">{description.length}/500</span>
          </div>

          <div>
            <label className="block text-xs text-fab-muted mb-1">Join Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setJoinMode("invite")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  joinMode === "invite"
                    ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30"
                    : "bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-muted"
                }`}
              >
                Invite Only
              </button>
              <button
                onClick={() => setJoinMode("open")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  joinMode === "open"
                    ? "bg-fab-gold/15 text-fab-gold border border-fab-gold/30"
                    : "bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-muted"
                }`}
              >
                Open
              </button>
            </div>
            <p className="text-[10px] text-fab-dim mt-1">
              {joinMode === "invite" ? "Only invited users can join." : "Anyone can join your group."}
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="w-full py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
