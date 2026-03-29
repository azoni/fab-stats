"use client";
import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getTeamByName, getTeamMembers, joinTeam, leaveTeam } from "@/lib/teams";
import { getMatchesByUserId } from "@/lib/firestore-storage";
import { computePlayoffFinishes, computeEventStats } from "@/lib/stats";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TeamHeader } from "@/components/team/TeamHeader";
import { TeamAggregateStats } from "@/components/team/TeamAggregateStats";
import { TeamRoster } from "@/components/team/TeamRoster";
import { TeamRecentPlacements } from "@/components/team/TeamRecentPlacements";
import { TrophyCase } from "@/components/profile/TrophyCase";
import { ArmoryGarden } from "@/components/profile/ArmoryGarden";
import type { Team, TeamMember, LeaderboardEntry, EventStats, UserProfile } from "@/types";
import type { PlayoffFinish } from "@/lib/stats";
import { toast } from "sonner";
import Link from "next/link";

type PageState = "loading" | "not_found" | "loaded";

export default function TeamPage() {
  const pathname = usePathname();
  const teamname = decodeURIComponent(pathname.split("/").pop() || "");
  const { user, profile, isAdmin: isSiteAdmin } = useAuth();

  const [state, setState] = useState<PageState>("loading");
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [leaderboardMap, setLeaderboardMap] = useState<Map<string, LeaderboardEntry>>(new Map());

  // Match-based data (lazy loaded)
  const [allFinishes, setAllFinishes] = useState<(PlayoffFinish & { memberName: string; memberUsername?: string })[]>([]);
  const [allArmoryStats, setAllArmoryStats] = useState<EventStats[]>([]);
  const [matchDataLoaded, setMatchDataLoaded] = useState(false);

  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const viewerRole = useMemo(() => {
    if (!user) return null;
    const m = members.find((m) => m.uid === user.uid);
    return m?.role ?? null;
  }, [user, members]);

  const canJoin = !!user && !!profile && !profile.teamId;
  const accent = team?.accentColor || "#d4a843";

  // ── Load team + members + leaderboard data ──
  useEffect(() => {
    if (!teamname) { setState("not_found"); return; }
    let cancelled = false;

    (async () => {
      try {
        const t = await getTeamByName(teamname);
        if (!t || cancelled) { if (!cancelled) setState("not_found"); return; }

        const m = await getTeamMembers(t.id);
        if (cancelled) return;

        // Fetch leaderboard entries for all members
        const lbEntries = await Promise.all(
          m.map(async (member) => {
            try {
              const snap = await getDoc(doc(db, "leaderboard", member.uid));
              if (snap.exists()) return [member.uid, snap.data() as LeaderboardEntry] as const;
            } catch { /* skip private profiles */ }
            return null;
          })
        );

        if (cancelled) return;

        const lbMap = new Map<string, LeaderboardEntry>();
        for (const entry of lbEntries) {
          if (entry) lbMap.set(entry[0], entry[1]);
        }

        setTeam(t);
        setMembers(m);
        setLeaderboardMap(lbMap);
        setState("loaded");
      } catch {
        if (!cancelled) setState("not_found");
      }
    })();

    return () => { cancelled = true; };
  }, [teamname]);

  // ── Lazy load match data for trophy case + armory + placements ──
  useEffect(() => {
    if (state !== "loaded" || matchDataLoaded || members.length === 0) return;
    let cancelled = false;

    (async () => {
      const finishes: (PlayoffFinish & { memberName: string; memberUsername?: string })[] = [];
      const armoryStats: EventStats[] = [];

      // Fetch matches for each member (limited to first 20 members for perf)
      const fetchMembers = members.slice(0, 20);
      await Promise.all(
        fetchMembers.map(async (member) => {
          try {
            const matches = await getMatchesByUserId(member.uid);
            if (cancelled) return;

            const es = computeEventStats(matches);
            const pf = computePlayoffFinishes(es);
            for (const f of pf) {
              finishes.push({ ...f, memberName: member.displayName, memberUsername: member.username });
            }

            const armory = es.filter((e) => e.eventType === "Armory");
            armoryStats.push(...armory);
          } catch { /* skip inaccessible profiles */ }
        })
      );

      if (cancelled) return;

      setAllFinishes(finishes);
      setAllArmoryStats(armoryStats);
      setMatchDataLoaded(true);
    })();

    return () => { cancelled = true; };
  }, [state, matchDataLoaded, members]);

  async function handleJoin() {
    if (!team || !profile) return;
    setJoining(true);
    try {
      await joinTeam(team.id, profile);
      toast.success("You joined the team!");
      const m = await getTeamMembers(team.id);
      setMembers(m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join.");
    }
    setJoining(false);
  }

  async function handleLeave() {
    if (!team || !user) return;
    setLeaving(true);
    try {
      await leaveTeam(team.id, user.uid);
      toast.success("You left the team.");
      const m = await getTeamMembers(team.id);
      setMembers(m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave.");
    }
    setLeaving(false);
  }

  // Dummy profile for ArmoryGarden
  const dummyProfile = useMemo<UserProfile>(() => ({
    uid: "", username: "", displayName: team?.name ?? "", createdAt: "", isPublic: true,
  }), [team?.name]);

  if (state === "loading") {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-fab-surface rounded-2xl" />
          <div className="grid grid-cols-6 gap-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-fab-surface rounded-xl" />)}
          </div>
          <div className="h-48 bg-fab-surface rounded-xl" />
        </div>
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-fab-text mb-2">Team Not Found</h1>
        <p className="text-sm text-fab-muted mb-4">This team doesn&apos;t exist or has been disbanded.</p>
        <Link href="/" className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors">
          Go home
        </Link>
      </div>
    );
  }

  const lbEntries = [...leaderboardMap.values()];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <TeamHeader
        team={team!}
        members={members}
        viewerRole={viewerRole}
        onJoin={handleJoin}
        onLeave={handleLeave}
        joining={joining}
        leaving={leaving}
        canJoin={canJoin}
        isSiteAdmin={isSiteAdmin}
      />

      {/* Team Stats */}
      <TeamAggregateStats entries={lbEntries} accentColor={accent} />

      {/* Recent Placements — the showcase highlight */}
      {matchDataLoaded && allFinishes.length > 0 && (
        <TeamRecentPlacements finishes={allFinishes} accentColor={accent} />
      )}

      {/* Trophy Case */}
      {allFinishes.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-fab-text uppercase tracking-wider mb-4">Trophy Case</h2>
          <TrophyCase finishes={allFinishes} />
        </div>
      )}

      {/* Loading indicator for match data */}
      {!matchDataLoaded && (
        <div className="bg-fab-surface border border-fab-border rounded-xl p-8 text-center">
          <div className="inline-block w-5 h-5 border-2 border-fab-dim border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-fab-dim">Loading placements and match data...</p>
        </div>
      )}

      {/* Armory Garden */}
      {matchDataLoaded && allArmoryStats.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-fab-text uppercase tracking-wider mb-4">Armory Garden</h2>
          <ArmoryGarden eventStats={allArmoryStats} ownerProfile={dummyProfile} />
        </div>
      )}

      {/* Roster */}
      <TeamRoster members={members} leaderboardMap={leaderboardMap} accentColor={accent} />
    </div>
  );
}
