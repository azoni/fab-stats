"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups } from "@/hooks/useGroup";
import { getAllGroups, createGroup, updateGroup, disbandGroup, leaveGroup, kickMember, updateMemberRole, updateMemberTitle, transferOwnership, getPendingInvites, getGroupMembers } from "@/lib/groups";
import { GroupMemberRow } from "@/components/group/GroupMemberRow";
import { GroupInviteSearch } from "@/components/group/GroupInviteSearch";
import { GroupImageUploader } from "@/components/group/GroupImageUploader";
import { SmartSearch } from "@/components/search/SmartSearch";
import type { Group, GroupMember, GroupInvite } from "@/types";
import { toast } from "sonner";
import { Users, Globe, Shield, Plus, ChevronRight, ChevronDown } from "lucide-react";

type Tab = "my-groups" | "browse" | "create";

export default function GroupHub() {
  const [mounted, setMounted] = useState(false);
  const { user, profile, isAdmin: isSiteAdmin } = useAuth();
  const { groups: myGroups, loading } = useMyGroups();

  useEffect(() => { setMounted(true); }, []);

  const hasGroups = myGroups.length > 0;
  const [activeTab, setActiveTab] = useState<Tab>("browse");

  // Sync tab when groups load
  useEffect(() => {
    if (myGroups.length > 0) setActiveTab("my-groups");
    else if (activeTab === "my-groups") setActiveTab("browse");
  }, [myGroups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Browse state
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Create state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [joinMode, setJoinMode] = useState<"open" | "invite">("invite");
  const [creating, setCreating] = useState(false);

  // Manage state — which group is expanded
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Load groups for browse
  useEffect(() => {
    if (activeTab !== "browse") return;
    setGroupsLoading(true);
    getAllGroups().then((groups) => setAllGroups(isSiteAdmin ? groups : groups.filter((g) => g.visibility !== "private"))).catch(() => {}).finally(() => setGroupsLoading(false));
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    if (!user || !profile) return;
    setCreating(true);
    try {
      await createGroup(profile, { name: name.trim(), slug: slug.trim() || undefined, description: description.trim() || undefined, joinMode });
      toast.success("Group created!");
      setName(""); setSlug(""); setDescription(""); setJoinMode("invite");
      setActiveTab("my-groups");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create group.");
    }
    setCreating(false);
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
        <div>
          <h1 className="text-2xl font-bold text-fab-gold">Groups</h1>
          <p className="text-sm text-fab-muted mt-1">A casual version of teams — join as many groups as you want. Pool your stats, track heroes, and have fun together. No badge on your profile, just good vibes.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-fab-surface border border-fab-border rounded-lg p-1">
        {hasGroups && (
          <button
            onClick={() => setActiveTab("my-groups")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "my-groups" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:text-fab-muted"
            }`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1.5" />My Groups
          </button>
        )}
        <button
          onClick={() => setActiveTab("browse")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "browse" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:text-fab-muted"
          }`}
        >
          <Globe className="w-3.5 h-3.5 inline mr-1.5" />Browse Groups
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "create" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:text-fab-muted"
          }`}
        >
          <Plus className="w-3.5 h-3.5 inline mr-1.5" />Create Group
        </button>
      </div>

      {/* ── My Groups tab ── */}
      {activeTab === "my-groups" && (
        <div className="space-y-3">
          {myGroups.length === 0 && (
            <div className="text-center py-12 text-fab-dim">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">You&apos;re not in any groups yet.</p>
            </div>
          )}

          {[...myGroups].sort((a, b) => b.memberCount - a.memberCount).map((g) => (
            <GroupManageCard
              key={g.id}
              group={g}
              expanded={expandedGroupId === g.id}
              onToggle={() => setExpandedGroupId(expandedGroupId === g.id ? null : g.id)}
              user={user}
              profile={profile}
              isSiteAdmin={isSiteAdmin}
            />
          ))}
        </div>
      )}

      {/* ── Browse tab ── */}
      {activeTab === "browse" && (
        <div className="space-y-4">
          <SmartSearch placeholder="Search players or groups..." />

          {groupsLoading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-fab-surface rounded-lg animate-pulse" />)}
            </div>
          )}

          {!groupsLoading && allGroups.length === 0 && (
            <div className="text-center py-12 text-fab-dim">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No groups yet. Be the first to create one!</p>
            </div>
          )}

          {!groupsLoading && allGroups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...allGroups].sort((a, b) => b.memberCount - a.memberCount).map((g) => (
                <Link key={g.id} href={`/group/${g.nameLower}`}
                  className="bg-fab-surface border border-fab-border rounded-xl p-4 hover:border-fab-gold/30 hover:bg-fab-surface-hover transition-colors group">
                  <div className="flex items-center gap-3">
                    {g.iconUrl ? (
                      <img src={g.iconUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-fab-border shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-fab-gold/15 border border-fab-gold/30 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-fab-gold">{g.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-fab-text group-hover:text-fab-gold transition-colors truncate">{g.name}</p>
                        {isSiteAdmin && g.visibility === "private" && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 shrink-0">Private</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-fab-dim mt-0.5">
                        <span>{g.memberCount} member{g.memberCount !== 1 ? "s" : ""}</span>
                        {g.joinMode === "open" ? (
                          <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" /> Open</span>
                        ) : (
                          <span className="flex items-center gap-0.5"><Shield className="w-3 h-3" /> Invite Only</span>
                        )}
                      </div>
                      {g.description && <p className="text-xs text-fab-muted mt-1 line-clamp-1">{g.description}</p>}
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
          <h2 className="text-sm font-semibold text-fab-text mb-4">Create a Group</h2>

          {!user && (
            <div className="text-center py-8">
              <p className="text-sm text-fab-dim mb-3">Sign in to create a group.</p>
              <Link href="/settings" className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors">Go to Settings</Link>
            </div>
          )}

          {user && profile && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-fab-muted mb-1">Group Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value.slice(0, 50))} placeholder="Enter group name..." maxLength={50}
                  className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/50 transition-colors" />
                <span className="text-[10px] text-fab-dim">{name.length}/50</span>
              </div>
              <div>
                <label className="block text-xs text-fab-muted mb-1">URL Slug (optional)</label>
                <div className="flex items-center gap-0 bg-fab-bg border border-fab-border rounded-lg overflow-hidden">
                  <span className="text-xs text-fab-dim pl-3 shrink-0">fabstats.net/group/</span>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30))} placeholder={name ? name.toLowerCase().replace(/[^a-z0-9]/g, "") : "groupname"} maxLength={30}
                    className="flex-1 bg-transparent py-2 pr-3 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none" />
                </div>
                <span className="text-[10px] text-fab-dim">Leave blank to auto-generate from group name</span>
              </div>
              <div>
                <label className="block text-xs text-fab-muted mb-1">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} placeholder="Tell others about your group..." maxLength={500} rows={3}
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
                <p className="text-[10px] text-fab-dim mt-1">{joinMode === "invite" ? "Only invited users can join." : "Anyone can join your group."}</p>
              </div>
              <button onClick={handleCreate} disabled={!name.trim() || creating}
                className="w-full py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm disabled:opacity-50">
                {creating ? "Creating..." : "Create Group"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Expandable group management card ──

function GroupManageCard({ group, expanded, onToggle, user, profile, isSiteAdmin }: {
  group: Group;
  expanded: boolean;
  onToggle: () => void;
  user: any;
  profile: any;
  isSiteAdmin: boolean;
}) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDesc, setEditDesc] = useState(group.description || "");
  const [editSlug, setEditSlug] = useState(group.nameLower);
  const [editJoinMode, setEditJoinMode] = useState(group.joinMode);
  const [editVisibility, setEditVisibility] = useState(group.visibility || "public");
  const [editAccentColor, setEditAccentColor] = useState(group.accentColor || "#d4a843");
  const [saving, setSaving] = useState(false);

  // Actions state
  const [confirmDisband, setConfirmDisband] = useState(false);
  const [disbanding, setDisbanding] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Load members when expanded
  useEffect(() => {
    if (!expanded || membersLoaded) return;
    getGroupMembers(group.id).then(setMembers).catch(() => {});
    getPendingInvites(group.id).then(setPendingInvites).catch(() => {});
    setMembersLoaded(true);
  }, [expanded, membersLoaded, group.id]);

  const myRole = useMemo(() => {
    if (!user) return null;
    return members.find((m) => m.uid === user.uid)?.role ?? null;
  }, [user, members]);

  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";

  const sortedMembers = useMemo(() =>
    [...members].sort((a, b) => {
      const order = { owner: 0, admin: 1, member: 2 };
      return (order[a.role] ?? 3) - (order[b.role] ?? 3);
    }),
  [members]);

  function refreshMembers() {
    getGroupMembers(group.id).then(setMembers).catch(() => {});
  }
  function refreshInvites() {
    getPendingInvites(group.id).then(setPendingInvites).catch(() => {});
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await updateGroup(group.id, { name: editName.trim(), slug: editSlug, description: editDesc, joinMode: editJoinMode, visibility: editVisibility, accentColor: editAccentColor });
      toast.success("Group updated!");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update group.");
    }
    setSaving(false);
  }

  async function handleDisband() {
    if (!user) return;
    setDisbanding(true);
    try {
      await disbandGroup(group.id, user.uid);
      toast.success("Group disbanded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disband.");
    }
    setDisbanding(false);
  }

  async function handleLeave() {
    if (!user) return;
    setLeavingGroup(true);
    try {
      await leaveGroup(group.id, user.uid);
      toast.success("You left the group.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave.");
    }
    setLeavingGroup(false);
  }

  async function handleTransfer() {
    if (!user || !transferTarget) return;
    setTransferring(true);
    try {
      await transferOwnership(group.id, user.uid, transferTarget);
      toast.success("Ownership transferred.");
      setTransferTarget(null);
      refreshMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer.");
    }
    setTransferring(false);
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-xl overflow-hidden">
      {/* Header — always visible, click to expand */}
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-fab-surface-hover transition-colors text-left">
        <div className="flex items-center gap-3 min-w-0">
          {group.iconUrl ? (
            <img src={group.iconUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-fab-border shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-fab-gold/15 border border-fab-gold/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-fab-gold">{group.name.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-fab-text truncate">{group.name}</p>
            <div className="flex items-center gap-2 text-xs text-fab-dim mt-0.5">
              <span>{group.memberCount} member{group.memberCount !== 1 ? "s" : ""}</span>
              {group.joinMode === "open" ? (
                <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" /> Open</span>
              ) : (
                <span className="flex items-center gap-0.5"><Shield className="w-3 h-3" /> Invite Only</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/group/${group.nameLower}`} onClick={(e) => e.stopPropagation()} className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors flex items-center gap-1">
            View <ChevronRight className="w-3 h-3" />
          </Link>
          <ChevronDown className={`w-4 h-4 text-fab-dim transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Expanded management panel */}
      {expanded && (
        <div className="border-t border-fab-border p-4 space-y-6">
          {/* Edit section */}
          {isOwnerOrAdmin && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-fab-text">Group Settings</h3>
                <button onClick={() => { setEditing(!editing); setEditName(group.name); setEditSlug(group.nameLower); setEditDesc(group.description || ""); setEditJoinMode(group.joinMode); setEditVisibility(group.visibility || "public"); setEditAccentColor(group.accentColor || "#d4a843"); }}
                  className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors">
                  {editing ? "Cancel" : "Edit"}
                </button>
              </div>

              {!editing && group.description && <p className="text-sm text-fab-muted mb-3">{group.description}</p>}

              {editing && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-fab-muted mb-1">Group Name</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value.slice(0, 50))} maxLength={50}
                      className="w-full bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text focus:outline-none focus:border-fab-gold/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-fab-muted mb-1">URL Slug</label>
                    <div className="flex items-center gap-0 bg-fab-bg border border-fab-border rounded-lg overflow-hidden">
                      <span className="text-xs text-fab-dim pl-3 shrink-0">fabstats.net/group/</span>
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
          )}

          {/* Image upload */}
          {isOwnerOrAdmin && (
            <div>
              <h3 className="text-sm font-semibold text-fab-text mb-3">Group Icon</h3>
              <GroupImageUploader groupId={group.id} currentIconUrl={group.iconUrl} onIconUploaded={() => {}} />
            </div>
          )}

          {/* Invite search */}
          {isOwnerOrAdmin && user && profile && (
            <div>
              <GroupInviteSearch groupId={group.id} groupName={group.name} groupIconUrl={group.iconUrl}
                inviter={{ uid: user.uid, displayName: profile.displayName }}
                members={members} pendingInvites={pendingInvites} onInviteSent={refreshInvites} />
            </div>
          )}

          {/* Members */}
          <div>
            <h3 className="text-sm font-semibold text-fab-text mb-3">Members ({members.length})</h3>
            <div className="divide-y divide-fab-border">
              {sortedMembers.map((m) => (
                <GroupMemberRow key={m.uid} member={m} viewerRole={myRole} isOwner={myRole === "owner"}
                  onPromote={(uid) => { if (user) updateMemberRole(group.id, user.uid, uid, "admin").then(() => { toast.success("Promoted."); refreshMembers(); }).catch(() => toast.error("Failed.")); }}
                  onDemote={(uid) => { if (user) updateMemberRole(group.id, user.uid, uid, "member").then(() => { toast.success("Demoted."); refreshMembers(); }).catch(() => toast.error("Failed.")); }}
                  onKick={(uid) => { if (user) kickMember(group.id, user.uid, uid).then(() => { toast.success("Removed."); refreshMembers(); }).catch(() => toast.error("Failed.")); }}
                  onTitleChange={async (uid, title) => { if (user) { await updateMemberTitle(group.id, user.uid, uid, title); toast.success(title.trim() ? "Title updated." : "Title removed."); refreshMembers(); } }}
                />
              ))}
            </div>
          </div>

          {/* Transfer Ownership */}
          {myRole === "owner" && members.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-fab-text mb-3">Transfer Ownership</h3>
              {!transferTarget ? (
                <div className="space-y-2">
                  <p className="text-xs text-fab-dim">Select a member to make the new owner.</p>
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
                      {transferring ? "Transferring..." : "Confirm"}
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
          <div>
            {myRole === "owner" ? (
              !confirmDisband ? (
                <button onClick={() => setConfirmDisband(true)} className="text-sm text-fab-loss hover:text-fab-loss/80 transition-colors">
                  Disband Group...
                </button>
              ) : (
                <div className="bg-fab-loss/10 border border-fab-loss/30 rounded-lg p-3">
                  <p className="text-sm text-fab-loss font-medium mb-2">This will permanently delete the group and remove all members.</p>
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
              <button onClick={handleLeave} disabled={leavingGroup}
                className="text-sm text-fab-loss hover:text-fab-loss/80 transition-colors disabled:opacity-50">
                {leavingGroup ? "Leaving..." : "Leave Group"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
