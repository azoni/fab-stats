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
import { TeamShareModal, type TeamShareData } from "@/components/team/TeamShareCard";
import { TrophyCase } from "@/components/profile/TrophyCase";
import { ArmoryGarden } from "@/components/profile/ArmoryGarden";
import type { Team, TeamMember, LeaderboardEntry, EventStats, UserProfile } from "@/types";
import type { PlayoffFinish } from "@/lib/stats";
import { DashboardFilters } from "@/components/home/DashboardFilters";
import { getEventType } from "@/lib/stats";
import { getEventTier } from "@/lib/events";
import type { MatchRecord } from "@/types";
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

  const [allMatches, setAllMatches] = useState<Map<string, MatchRecord[]>>(new Map());
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Filters
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterHero, setFilterHero] = useState("all");

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
      const memberMatches = new Map<string, MatchRecord[]>();

      // Fetch matches for each member (limited to first 20 members for perf)
      const fetchMembers = members.slice(0, 20);
      await Promise.all(
        fetchMembers.map(async (member) => {
          try {
            const matches = await getMatchesByUserId(member.uid);
            if (cancelled) return;

            memberMatches.set(member.uid, matches);

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

      setAllMatches(memberMatches);
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

  // Compute filter options + filtered matches from all members
  const allMemberMatches = useMemo(() => [...allMatches.values()].flat(), [allMatches]);

  const filterOptions = useMemo(() => {
    const formats = new Set<string>();
    const eventTypes = new Set<string>();
    const heroes = new Set<string>();
    for (const m of allMemberMatches) {
      if (m.format) formats.add(m.format);
      const et = getEventType(m);
      if (et && et !== "Other") eventTypes.add(et);
      if (m.heroPlayed && m.heroPlayed !== "Unknown") heroes.add(m.heroPlayed);
    }
    return {
      formats: [...formats].sort(),
      eventTypes: [...eventTypes].sort(),
      heroes: [...heroes].sort(),
    };
  }, [allMemberMatches]);

  const isFiltered = filterFormat !== "all" || filterEventType !== "all" || filterTier !== "all" || filterHero !== "all";

  // Filtered matches per member (for filtered aggregate stats)
  const filteredMatchesPerMember = useMemo(() => {
    if (!isFiltered) return allMatches;
    const result = new Map<string, MatchRecord[]>();
    for (const [uid, matches] of allMatches) {
      result.set(uid, matches.filter((m) => {
        if (filterFormat !== "all" && m.format !== filterFormat) return false;
        if (filterTier === "rated" && m.rated !== true) return false;
        if (filterTier === "unrated" && m.rated === true) return false;
        if (filterTier !== "all" && filterTier !== "rated" && filterTier !== "unrated" && getEventTier(getEventType(m)) !== Number(filterTier)) return false;
        if (filterEventType !== "all" && getEventType(m) !== filterEventType) return false;
        if (filterHero !== "all" && m.heroPlayed !== filterHero) return false;
        return true;
      }));
    }
    return result;
  }, [allMatches, filterFormat, filterEventType, filterTier, filterHero, isFiltered]);

  // Filtered aggregate stats for roster display
  const filteredMemberStats = useMemo(() => {
    if (!isFiltered) return null; // use leaderboard data when no filters
    const stats = new Map<string, { matches: number; wins: number; winRate: number }>();
    for (const [uid, matches] of filteredMatchesPerMember) {
      const wins = matches.filter((m) => m.result === "win").length;
      const total = matches.filter((m) => m.result !== "bye").length;
      stats.set(uid, { matches: matches.length, wins, winRate: total > 0 ? Math.round((wins / total) * 100) : -1 });
    }
    return stats;
  }, [filteredMatchesPerMember, isFiltered]);

  const lbEntries = [...leaderboardMap.values()];

  // Compute share card data from leaderboard entries
  const shareData = useMemo<TeamShareData | null>(() => {
    if (!team) return null;
    let totalMatches = 0, totalWins = 0, totalLosses = 0, totalDraws = 0, totalByes = 0;
    let totalEvents = 0, totalTop8s = 0, bestStreak = 0;
    const heroMap = new Map<string, { matches: number; wins: number }>();

    for (const e of lbEntries) {
      totalMatches += e.totalMatches;
      totalWins += e.totalWins;
      totalLosses += e.totalLosses;
      totalDraws += e.totalDraws;
      totalByes += e.totalByes;
      totalEvents += e.eventsPlayed ?? 0;
      totalTop8s += e.totalTop8s ?? 0;
      if (e.longestWinStreak > bestStreak) bestStreak = e.longestWinStreak;
      if (e.heroBreakdown) {
        for (const h of e.heroBreakdown) {
          const existing = heroMap.get(h.hero);
          if (existing) { existing.matches += h.matches; existing.wins += h.wins; }
          else heroMap.set(h.hero, { matches: h.matches, wins: h.wins });
        }
      }
    }

    const denom = totalMatches - totalByes;
    const winRate = denom > 0 ? Math.round((totalWins / denom) * 100) : 0;
    const top8Conversion = totalEvents > 0 ? Math.round((totalTop8s / totalEvents) * 100) : 0;

    const topHeroes = [...heroMap.entries()]
      .sort((a, b) => b[1].matches - a[1].matches)
      .slice(0, 3)
      .map(([hero, { matches, wins }]) => ({
        hero: hero.split(",")[0],
        matches,
        winRate: matches > 0 ? Math.round((wins / matches) * 100) : 0,
      }));

    const topMembers = [...members]
      .map((m) => {
        const lb = leaderboardMap.get(m.uid);
        return { name: m.displayName, photoUrl: m.photoUrl, matches: lb?.totalMatches ?? 0, winRate: lb?.winRate ?? 0 };
      })
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 5);

    return {
      teamName: team.name,
      teamSlug: team.nameLower,
      teamIconUrl: team.iconUrl,
      teamBackgroundUrl: team.backgroundUrl,
      accentColor: team.accentColor || "#d4a843",
      description: team.description,
      memberCount: members.length,
      totalMatches, winRate, wins: totalWins, losses: totalLosses, draws: totalDraws,
      totalEvents, totalTop8s, top8Conversion, bestStreak,
      topHeroes, topMembers,
    };
  }, [team, lbEntries, members, leaderboardMap]);

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <TeamHeader
        team={team!}
        members={members}
        viewerRole={viewerRole}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onShare={() => setShowShareModal(true)}
        joining={joining}
        leaving={leaving}
        canJoin={canJoin}
        isSiteAdmin={isSiteAdmin}
      />

      {showShareModal && shareData && (
        <TeamShareModal data={shareData} onClose={() => setShowShareModal(false)} />
      )}

      {/* Filters */}
      {matchDataLoaded && filterOptions.formats.length > 0 && (
        <DashboardFilters
          formats={filterOptions.formats}
          eventTypes={filterOptions.eventTypes}
          heroes={filterOptions.heroes}
          filterFormat={filterFormat}
          filterEventType={filterEventType}
          filterTier={filterTier}
          filterHero={filterHero}
          onFormatChange={setFilterFormat}
          onEventTypeChange={setFilterEventType}
          onTierChange={setFilterTier}
          onHeroChange={setFilterHero}
        />
      )}

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
      <TeamRoster members={members} leaderboardMap={leaderboardMap} accentColor={accent} filteredStats={filteredMemberStats} />
    </div>
  );
}
