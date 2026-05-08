"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTeam, useMyTeams, useTeamInvites } from "@/hooks/useTeam";
import { getAllTeams, acceptTeamInvite, declineTeamInvite, joinTeam, getProfileTeamIds, setPrimaryTeam, getTeamMembers } from "@/lib/teams";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { TeamMemberRow } from "@/components/team/TeamMemberRow";
import { TeamInviteSearch } from "@/components/team/TeamInviteSearch";
import { TeamImageUploader } from "@/components/team/TeamImageUploader";
import { createTeam, updateTeam, disbandTeam, leaveTeam, kickMember, updateMemberRole, updateMemberTitle, transferOwnership, getPendingInvites } from "@/lib/teams";
import type { Team, TeamInvite as TeamInviteType, LeaderboardEntry } from "@/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Globe, LayoutGrid, Plus, Search, Settings, Shield, Sparkles, Trophy, Users } from "lucide-react";

type Tab = "my-team" | "browse" | "create";

function formatCompact(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function TeamMetric({ label, value, tone = "gold" }: { label: string; value: string; tone?: "gold" | "green" | "blue" | "rose" }) {
  const color = {
    gold: "text-fab-gold",
    green: "text-emerald-300",
    blue: "text-sky-300",
    rose: "text-rose-300",
  }[tone];

  return (
    <div className="rounded-xl border border-fab-border/70 bg-fab-bg/45 px-2 py-2 shadow-inner shadow-black/10 sm:px-4 sm:py-3">
      <p className={`text-base font-black leading-none sm:text-xl ${color}`}>{value}</p>
      <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-[0.08em] text-fab-dim sm:text-[10px] sm:tracking-[0.16em]">{label}</p>
    </div>
  );
}

const TEAM_FINISH_RANK: Record<string, number> = {
  Armory: 1,
  Skirmish: 2,
  "Road to Nationals": 3,
  ProQuest: 4,
  "Battle Hardened": 5,
  "The Calling": 6,
  Nationals: 7,
  "Pro Tour": 8,
  Worlds: 9,
};

type TeamFinishStyle = { label: string; border: string; shadow: string; variant: "border" | "underline" };

const TEAM_FINISH_STYLE: Record<string, TeamFinishStyle> = {
  Armory: { label: "Armory finish", border: "#d4975a", shadow: "0 0 8px rgba(212,151,90,0.18)", variant: "underline" },
  Skirmish: { label: "Skirmish finish", border: "#93c5fd", shadow: "0 0 8px rgba(147,197,253,0.18)", variant: "underline" },
  "Road to Nationals": { label: "RTN finish", border: "#fca5a5", shadow: "0 0 8px rgba(252,165,165,0.18)", variant: "underline" },
  ProQuest: { label: "PQ finish", border: "#c4b5fd", shadow: "0 0 8px rgba(196,181,253,0.2)", variant: "underline" },
  "Battle Hardened": { label: "Battle Hardened", border: "#cd7f32", shadow: "0 0 10px rgba(205,127,50,0.22)", variant: "border" },
  "The Calling": { label: "Calling finish", border: "#60a5fa", shadow: "0 0 10px rgba(96,165,250,0.22)", variant: "border" },
  Nationals: { label: "Nationals finish", border: "#f87171", shadow: "0 0 10px rgba(248,113,113,0.22)", variant: "border" },
  "Pro Tour": { label: "Pro Tour finish", border: "#a78bfa", shadow: "0 0 12px rgba(167,139,250,0.25)", variant: "border" },
  Worlds: { label: "Worlds finish", border: "#fbbf24", shadow: "0 0 12px rgba(251,191,36,0.28)", variant: "border" },
};

function bestFinishForEntry(entry?: LeaderboardEntry) {
  if (!entry) return null;
  let bestType: string | null = null;
  let bestRank = 0;
  for (const eventType of Object.keys(entry.minorTop8sByEventType || {})) {
    const rank = TEAM_FINISH_RANK[eventType] || 0;
    if (rank > bestRank) {
      bestType = eventType;
      bestRank = rank;
    }
  }
  for (const eventType of Object.keys(entry.top8sByEventType || {})) {
    const rank = TEAM_FINISH_RANK[eventType] || 0;
    if (rank > bestRank) {
      bestType = eventType;
      bestRank = rank;
    }
  }
  return bestType ? { ...TEAM_FINISH_STYLE[bestType], rank: bestRank } : null;
}

export default function TeamHub() {
  const [mounted, setMounted] = useState(false);
  const { user, profile, isAdmin: isSiteAdmin, refreshProfile } = useAuth();
  const { teams: myTeams, primaryTeamId, loading: teamsListLoading } = useMyTeams();
  const { invites } = useTeamInvites();
  const { entries: leaderboardEntries } = useLeaderboard(true);

  useEffect(() => { setMounted(true); }, []);

  // The "My Teams" tab can show any of the user's teams. Defaults to primary,
  // user can switch via the team-switcher pills at the top of the tab.
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  useEffect(() => {
    // Auto-select primary on first load. Re-select if the user leaves the
    // currently-selected team (it disappears from myTeams).
    if (selectedTeamId && myTeams.some((t) => t.id === selectedTeamId)) return;
    setSelectedTeamId(primaryTeamId);
  }, [primaryTeamId, myTeams, selectedTeamId]);

  const { team, members, loading: teamLoading } = useTeam(selectedTeamId);
  const myRole = profile?.uid && members.length > 0
    ? (members.find((m) => m.uid === profile.uid)?.role ?? null)
    : null;
  const loading = teamsListLoading || (!!selectedTeamId && teamLoading);
  const hasTeam = myTeams.length > 0;

  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  // Keep users without teams out of the My Teams tab, but let Browse stay the default.
  useEffect(() => {
    if (!hasTeam && activeTab === "my-team") setActiveTab("browse");
  }, [hasTeam, activeTab]);

  // Browse state
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [browseFilter, setBrowseFilter] = useState<"joinable" | "all" | "open" | "invite">("all");
  const [browseQuery, setBrowseQuery] = useState("");
  const [browseSort, setBrowseSort] = useState<"members" | "newest" | "alpha">("members");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [teamMemberUids, setTeamMemberUids] = useState<Record<string, string[]>>({});

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

  // Load match count for create validation. Multi-team: this no longer
  // depends on whether the user is already on a team.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "leaderboard", user.uid));
        setMatchCount(snap.exists() ? ((snap.data() as LeaderboardEntry).totalMatches ?? 0) : 0);
      } catch { setMatchCount(0); }
    })();
  }, [user]);

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
  // Multi-team: users on a team can still create another one.
  const canCreate = matchCount !== null && matchCount >= 15;

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
      await refreshProfile();
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
      await refreshProfile();
      toast.success(`Left ${team.name}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave.");
    }
    setLeaving(false);
  }

  async function handleAcceptInvite(invite: TeamInviteType) {
    if (!profile) return;
    try {
      await acceptTeamInvite(invite.id, profile);
      await refreshProfile();
      toast.success(`Joined ${invite.teamName}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept.");
    }
  }

  async function handleDeclineInvite(invite: TeamInviteType) {
    try {
      await declineTeamInvite(invite.id);
      toast.success("Invite declined.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline.");
    }
  }

  async function handleSetPrimary(teamId: string) {
    if (!user) return;
    setSettingPrimaryId(teamId);
    try {
      await setPrimaryTeam(user.uid, teamId);
      await refreshProfile();
      toast.success("Primary team updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set primary team.");
    } finally {
      setSettingPrimaryId(null);
    }
  }

  async function handleQuickJoin(t: Team) {
    if (!profile) {
      toast.error("Sign in to join a team.");
      return;
    }
    setJoiningId(t.id);
    try {
      await joinTeam(t.id, profile);
      await refreshProfile();
      // Optimistic update so the card disappears from "Joinable" immediately.
      setAllTeams((prev) => prev.map((x) => (x.id === t.id ? { ...x, memberCount: x.memberCount + 1 } : x)));
      toast.success(`Joined ${t.name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join.");
    } finally {
      setJoiningId(null);
    }
  }

  // Teams the viewer is already a member of — drives the "Joinable" filter
  // and the per-card join button visibility.
  const myTeamIds = useMemo(() => new Set(profile ? getProfileTeamIds(profile) : []), [profile]);

  const teamStats = useMemo(() => {
    const openTeams = allTeams.filter((t) => t.joinMode === "open").length;
    const joinableTeams = allTeams.filter((t) => t.joinMode === "open" && !myTeamIds.has(t.id)).length;
    const totalMembers = allTeams.reduce((sum, t) => sum + (t.memberCount ?? 0), 0);
    return {
      publicTeams: allTeams.length,
      openTeams,
      joinableTeams,
      totalMembers,
    };
  }, [allTeams, myTeamIds]);

  const visibleTeams = useMemo(() => {
    let teams = allTeams;
    if (browseFilter === "joinable") {
      teams = teams.filter((t) => t.joinMode === "open" && !myTeamIds.has(t.id));
    } else if (browseFilter === "open") {
      teams = teams.filter((t) => t.joinMode === "open");
    } else if (browseFilter === "invite") {
      teams = teams.filter((t) => t.joinMode === "invite");
    }
    const q = browseQuery.trim().toLowerCase();
    if (q) {
      teams = teams.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.nameLower.includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false),
      );
    }
    const sorted = [...teams];
    if (browseSort === "members") {
      sorted.sort((a, b) => b.memberCount - a.memberCount);
    } else if (browseSort === "newest") {
      sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (browseSort === "alpha") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [allTeams, browseFilter, browseQuery, browseSort, myTeamIds]);

  useEffect(() => {
    if (activeTab !== "browse" || visibleTeams.length === 0) return;
    let cancelled = false;
    const missing = visibleTeams.filter((t) => !teamMemberUids[t.id]).slice(0, 30);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (t) => {
        const members = await getTeamMembers(t.id).catch(() => []);
        return [t.id, members.map((m) => m.uid)] as const;
      }),
    ).then((rows) => {
      if (cancelled) return;
      setTeamMemberUids((prev) => {
        const next = { ...prev };
        for (const [teamId, uids] of rows) next[teamId] = uids;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [activeTab, visibleTeams, teamMemberUids]);

  const teamFinishStyles = useMemo(() => {
    const entryByUid = new Map(leaderboardEntries.map((entry) => [entry.userId, entry]));
    const styles: Record<string, TeamFinishStyle | null> = {};
    for (const t of allTeams) {
      const uids = teamMemberUids[t.id] || [];
      let best: (TeamFinishStyle & { rank: number }) | null = null;
      for (const uid of uids) {
        const finish = bestFinishForEntry(entryByUid.get(uid));
        if (!finish) continue;
        if (!best || finish.rank > best.rank) best = finish;
      }
      styles[t.id] = best;
    }
    return styles;
  }, [allTeams, leaderboardEntries, teamMemberUids]);

  if (!mounted || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="animate-pulse space-y-5">
          <div className="h-32 rounded-2xl border border-fab-border bg-fab-surface sm:h-52" />
          <div className="h-14 rounded-xl border border-fab-border bg-fab-surface" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl border border-fab-border bg-fab-surface" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-0 py-0 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-fab-border/80 bg-[linear-gradient(135deg,rgba(25,23,18,0.96),rgba(14,15,14,0.95)_58%,rgba(17,24,22,0.92))] p-3 shadow-[0_22px_70px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(245,179,57,0.16),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(38,211,177,0.11),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-fab-border/80 bg-fab-bg/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fab-gold">
            <Sparkles className="h-3.5 w-3.5" />
            Community squads
          </div>
          <h1 className="mt-3 text-2xl font-black text-fab-text sm:mt-4 sm:text-4xl">Teams</h1>
          <p className="mt-3 hidden max-w-2xl text-sm leading-6 text-fab-muted sm:block sm:text-base">
            Browse competitive groups, join open rosters, or manage the badge that represents you on profiles and leaderboards.
            {allTeams.length > 0 && <> <span className="text-fab-text font-semibold tabular-nums">{allTeams.length}</span> public team{allTeams.length === 1 ? "" : "s"} · your primary team's badge shows on profile and leaderboard.</>}
            {allTeams.length === 0 && <> Your primary team's badge shows on your profile and leaderboard.</>}
          </p>
        </div>
        </div>
        <div className="relative mt-4 grid grid-cols-4 gap-1.5 sm:mt-5 sm:gap-3">
          <TeamMetric label="Public" value={formatCompact(teamStats.publicTeams)} />
          <TeamMetric label="Members" value={formatCompact(teamStats.totalMembers)} tone="green" />
          <TeamMetric label="Open" value={formatCompact(teamStats.openTeams)} tone="blue" />
          <TeamMetric label="My Teams" value={formatCompact(myTeams.length)} tone="rose" />
        </div>
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-amber-400">Team Invites</h2>
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between bg-fab-surface rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-fab-text">{inv.teamName}</p>
                <p className="text-xs text-fab-dim">Invited by {inv.inviterName}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAcceptInvite(inv)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-win/20 text-fab-win hover:bg-fab-win/30 transition-colors">
                  Accept
                </button>
                <button onClick={() => handleDeclineInvite(inv)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-fab-dim hover:text-fab-muted transition-colors">
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-fab-border/80 bg-fab-surface/85 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.14)]">
        <button
          onClick={() => setActiveTab("browse")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
            activeTab === "browse" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:bg-fab-bg/60 hover:text-fab-muted"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 inline mr-1.5" />Browse
        </button>
        {hasTeam && (
          <button
            onClick={() => setActiveTab("my-team")}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
              activeTab === "my-team" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:bg-fab-bg/60 hover:text-fab-muted"
            }`}
          >
            <Settings className="w-3.5 h-3.5 inline mr-1.5" />My Teams
            {myTeams.length > 1 && (
              <span className="ml-1.5 text-[10px] font-bold tabular-nums opacity-75">{myTeams.length}</span>
            )}
          </button>
        )}
        {/* Multi-team: Create is always available to authed users — they can
            captain multiple teams. Stay hidden for guests/unauthed. */}
        {user && (
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
              activeTab === "create" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-dim hover:bg-fab-bg/60 hover:text-fab-muted"
            }`}
          >
            <Plus className="w-3.5 h-3.5 inline mr-1.5" />Create
          </button>
        )}
      </div>

      {/* My Teams tab */}
      {activeTab === "my-team" && team && (
        <div className="space-y-6">
          {/* My Teams switcher — only when on multiple teams */}
          {myTeams.length > 1 && (
            <div className="bg-fab-surface border border-fab-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-fab-dim mb-2 px-1">
                My Teams ({myTeams.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {myTeams.map((t) => {
                  const isPrimary = t.id === primaryTeamId;
                  const isSelected = t.id === selectedTeamId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeamId(t.id)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors border ${
                        isSelected
                          ? "bg-fab-gold/15 border-fab-gold/40 text-fab-gold"
                          : "bg-fab-bg border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30"
                      }`}
                    >
                      {t.iconUrl ? (
                        <img src={t.iconUrl} alt="" className="w-5 h-5 rounded object-cover" />
                      ) : (
                        <span className="w-5 h-5 rounded bg-fab-gold/20 flex items-center justify-center text-[9px] font-bold text-fab-gold">
                          {t.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="font-semibold truncate max-w-[140px]">{t.name}</span>
                      {isPrimary && (
                        <span className="text-[9px] uppercase tracking-wider font-bold text-fab-gold/80">★ Primary</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                    {team.id === primaryTeamId && myTeams.length > 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-fab-gold/15 text-fab-gold font-semibold">★ Primary</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {team.id !== primaryTeamId && myTeams.length > 1 && (
                  <button
                    onClick={() => handleSetPrimary(team.id)}
                    disabled={settingPrimaryId === team.id}
                    className="text-xs text-fab-muted hover:text-fab-gold transition-colors disabled:opacity-50"
                    title="Use this team for badges, /team default, share cards"
                  >
                    {settingPrimaryId === team.id ? "Setting..." : "Set as Primary"}
                  </button>
                )}
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => { setEditing(!editing); setEditName(team.name); setEditSlug(team.nameLower); setEditDesc(team.description || ""); setEditJoinMode(team.joinMode); setEditVisibility(team.visibility || "public"); setEditAccentColor(team.accentColor || "#d4a843"); }}
                    className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors"
                  >
                    {editing ? "Cancel" : "Edit"}
                  </button>
                )}
              </div>
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
                  onTitleChange={async (uid, title) => { if (team && user) { await updateMemberTitle(team.id, user.uid, uid, title); toast.success(title.trim() ? "Title updated." : "Title removed."); } }}
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
        <div className="space-y-5">
          <div className="rounded-xl border border-fab-border/80 bg-fab-surface/85 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-fab-text">
                  <Search className="h-4 w-4 text-fab-gold" />
                  Browse Teams
                </h2>
                <p className="text-xs text-fab-muted">
                  Showing {visibleTeams.length} of {allTeams.length} teams. {teamStats.joinableTeams} open team{teamStats.joinableTeams === 1 ? "" : "s"} available to join.
                </p>
              </div>
              <p className="text-xs font-bold text-fab-gold">{browseSort === "members" ? "Sorted by members" : browseSort === "newest" ? "Newest first" : "A to Z"}</p>
            </div>
          </div>
          {/* Search input — local to the team browse, separate from global SmartSearch */}
          <input
            type="text"
            value={browseQuery}
            onChange={(e) => setBrowseQuery(e.target.value)}
            placeholder="Search teams by name or description..."
            className="w-full rounded-xl border border-fab-border/80 bg-fab-surface/85 px-4 py-3 text-sm text-fab-text shadow-inner shadow-black/10 placeholder:text-fab-dim focus:border-fab-gold/50 focus:outline-none"
          />

          {/* Filter + sort row */}
          <div className="flex flex-wrap items-center gap-2">
            {([
              { id: "joinable", label: "Joinable", desc: "Open teams you're not on" },
              { id: "open", label: "Open", desc: "All open-join teams" },
              { id: "invite", label: "Invite Only", desc: "Teams that require an invite" },
              { id: "all", label: "All", desc: "Every public team" },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setBrowseFilter(f.id)}
                title={f.desc}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  browseFilter === f.id
                    ? "border border-fab-gold/35 bg-fab-gold/15 text-fab-gold"
                    : "border border-fab-border/80 bg-fab-surface/85 text-fab-dim hover:text-fab-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="text-fab-dim">Sort</span>
              <select
                value={browseSort}
                onChange={(e) => setBrowseSort(e.target.value as typeof browseSort)}
                className="rounded-lg border border-fab-border/80 bg-fab-surface/85 px-2.5 py-1.5 text-xs font-bold text-fab-text focus:border-fab-gold/50 focus:outline-none"
              >
                <option value="members">Members</option>
                <option value="newest">Newest</option>
                <option value="alpha">A → Z</option>
              </select>
            </div>
          </div>

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

          {!teamsLoading && allTeams.length > 0 && visibleTeams.length === 0 && (
            <div className="text-center py-12 text-fab-dim">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No teams match those filters.</p>
              {browseFilter === "joinable" && (
                <button
                  onClick={() => setBrowseFilter("all")}
                  className="text-xs text-fab-gold hover:text-fab-gold-light transition-colors mt-2"
                >
                  Show all teams
                </button>
              )}
            </div>
          )}

          {!teamsLoading && visibleTeams.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTeams.map((t) => {
                const alreadyMember = myTeamIds.has(t.id);
                const canQuickJoin = !!profile && !alreadyMember && t.joinMode === "open";
                const finishStyle = teamFinishStyles[t.id];
                return (
                  <div
                    key={t.id}
                    className="group relative overflow-hidden rounded-xl border border-fab-border/80 bg-fab-surface/85 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.14)] transition-colors hover:border-fab-gold/50 hover:bg-fab-gold/10"
                    style={finishStyle?.variant === "border" ? { borderColor: finishStyle.border, boxShadow: finishStyle.shadow } : undefined}
                  >
                    {finishStyle?.variant === "underline" && (
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-80" style={{ background: finishStyle.border, boxShadow: finishStyle.shadow }} />
                    )}
                    <div className="flex items-start gap-3">
                      <Link href={`/teams/${t.nameLower}`} className="shrink-0">
                        {t.iconUrl ? (
                          <img src={t.iconUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-fab-border" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-fab-gold/15 border border-fab-gold/30 flex items-center justify-center">
                            <span className="text-sm font-bold text-fab-gold">{t.name.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/teams/${t.nameLower}`} className="block">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-fab-text group-hover:text-fab-gold transition-colors truncate">{t.name}</p>
                            {alreadyMember && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-fab-gold/15 text-fab-gold shrink-0">Member</span>
                            )}
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
                            {t.createdAt && (
                              <span>· Est. {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                            )}
                          </div>
                          {/* Reserved 1-line description slot keeps every card
                              the same height even when descriptions are missing. */}
                          <p className={`text-xs mt-1 line-clamp-1 ${t.description ? "text-fab-muted" : "text-fab-dim/60 italic"}`}>
                            {t.description || "No description"}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md border border-fab-border bg-fab-bg/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-fab-dim">
                              <Users className="h-3 w-3" />
                              {t.memberCount === 1 ? "Solo roster" : `${t.memberCount} players`}
                            </span>
                            {finishStyle ? (
                              <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ borderColor: finishStyle.border, color: finishStyle.border }}>
                                <Trophy className="h-3 w-3" />
                                {finishStyle.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-fab-border bg-fab-bg/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-fab-dim">
                                Building resume
                              </span>
                            )}
                          </div>
                        </Link>
                      </div>
                      {canQuickJoin && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleQuickJoin(t); }}
                          disabled={joiningId === t.id}
                          className="shrink-0 px-3 py-1.5 rounded-md bg-fab-gold text-fab-bg text-xs font-bold hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                        >
                          {joiningId === t.id ? "Joining..." : "Join"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Create tab ── */}
      {activeTab === "create" && (
        <div className="overflow-hidden rounded-xl border border-fab-border/80 bg-fab-surface/85 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
          <div className="border-b border-fab-border/70 bg-fab-bg/35 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-fab-gold/25 bg-fab-gold/10 text-fab-gold">
                <Plus className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-fab-text">Create a Team</h2>
                <p className="mt-1 text-sm text-fab-muted">Start a public or invite-only roster once you have 15 logged matches.</p>
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6">

          {!user && (
            <div className="text-center py-8">
              <p className="text-sm text-fab-dim mb-3">Sign in to create a team.</p>
              <Link href="/login" className="text-sm font-bold text-fab-gold transition-colors hover:text-fab-gold-light">Sign In</Link>
            </div>
          )}

          {user && matchCount !== null && matchCount < 15 && (
            <div className="bg-fab-draw/10 border border-fab-draw/30 rounded-lg p-3 text-sm text-fab-draw mb-4">
              You need at least 15 logged matches to create a team. You have {matchCount}.
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
        </div>
      )}
    </div>
  );
}
