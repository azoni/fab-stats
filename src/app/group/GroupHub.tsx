"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGroups } from "@/hooks/useGroup";
import { getAllGroups, createGroup } from "@/lib/groups";
import { SmartSearch } from "@/components/search/SmartSearch";
import type { Group } from "@/types";
import { toast } from "sonner";
import { Users, Globe, Shield, Plus, ChevronRight } from "lucide-react";

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
        <div className="space-y-4">
          {myGroups.length === 0 && (
            <div className="text-center py-12 text-fab-dim">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">You&apos;re not in any groups yet.</p>
            </div>
          )}

          {myGroups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...myGroups].sort((a, b) => b.memberCount - a.memberCount).map((g) => (
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
                        <ChevronRight className="w-3.5 h-3.5 text-fab-dim group-hover:text-fab-gold transition-colors shrink-0" />
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
