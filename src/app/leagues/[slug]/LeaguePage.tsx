"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  disbandLeague,
  getLeagueBySlug,
  joinLeague,
  kickLeagueMember,
  leaveLeague,
  subscribeToLeague,
  subscribeToLeagueMembers,
  updateLeague,
  approveJoinRequest,
  removeJoinRequest,
  hasPendingJoinRequest,
  subscribeToJoinRequests,
  leagueRequiresApproval,
  listLeagueSeasons,
} from "@/lib/leagues";
import { NewSeasonModal } from "@/components/leagues/NewSeasonModal";
import { getStoreDirectory, slugifyStoreName, findNearMatchStore, storeNameMatchesQuery, type StoreDirectoryEntry } from "@/lib/store-directory";
import { HeroImg } from "@/components/heroes/HeroImg";
import { uploadLeagueBanner, removeLeagueBanner } from "@/lib/league-images";
import { recomputeAndStoreStandings, TIEBREAKER_TEXT } from "@/lib/leagues-scoring";
import {
  getLeagueMatchPool,
  deriveFilterOptions,
  applyFilters,
  poolSummary,
  type LeagueMatchPool,
  type LeagueFilters,
} from "@/lib/leagues-insights";
import {
  Marquee,
  LeagueControlBar,
  Podium,
  BroadcastStandings,
  StorylineCards,
  KpiStrip,
  HeroMetaBars,
  MatchupGrid,
  StoreTurf,
  ActivityPulse,
  standingsFromPool,
  signatureHeroByUid,
  recentFormByUid,
} from "./league-desk";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  League,
  LeagueMember,
  LeagueJoinRequest,
  LeagueScoringRules,
  LeagueSession,
  LeagueSeasonArchive,
  LeagueStandingEntry,
} from "@/types";
import { LeagueScheduleBuilder } from "@/components/leagues/LeagueScheduleBuilder";
import { toast } from "sonner";
import {
  ArrowLeft,
  Image as ImageIcon,
  RefreshCw,
  Settings,
  UserMinus,
} from "lucide-react";

export default function LeaguePage() {
  // Read the slug from the URL, not useParams: in static export this page is
  // served from the /leagues/_.html placeholder, so useParams returns "_" and the
  // real league slug is only in the pathname. (Matches the player/group pattern.)
  const pathname = usePathname();
  const slug = decodeURIComponent(pathname?.split("/").pop() || "");
  const { user, profile, isAdmin } = useAuth();

  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<LeagueJoinRequest[]>([]);
  const [myRequestPending, setMyRequestPending] = useState(false);
  const [directory, setDirectory] = useState<StoreDirectoryEntry[]>([]);
  const [standings, setStandings] = useState<LeagueStandingEntry[] | null>(null);
  const [standingsAt, setStandingsAt] = useState<string | null>(null);
  // True once the standings snapshot has resolved (whether or not a doc exists),
  // so the auto-refresh effect knows the current freshness before deciding.
  const [standingsLoaded, setStandingsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [recomputing, setRecomputing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [seasons, setSeasons] = useState<LeagueSeasonArchive[]>([]);
  const [viewingSeasonId, setViewingSeasonId] = useState<string | null>(null);
  const [showNewSeason, setShowNewSeason] = useState(false);
  const [leagueTab, setLeagueTab] = useState<"standings" | "meta" | "players">("standings");
  const [pool, setPool] = useState<LeagueMatchPool | null>(null);
  const [filters, setFilters] = useState<LeagueFilters>({});

  useEffect(() => {
    if (!slug || slug === "_") return;
    let cancelled = false;
    (async () => {
      const found = await getLeagueBySlug(slug);
      if (cancelled) return;
      if (!found) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLeagueId(found.id);
      setLeague(found);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Subscribe to league + members + standings
  useEffect(() => {
    if (!leagueId) return;
    const unsubL = subscribeToLeague(leagueId, (l) => setLeague(l));
    const unsubM = subscribeToLeagueMembers(leagueId, (m) => setMembers(m));
    const unsubS = onSnapshot(doc(db, "leagues", leagueId, "standings", "current"), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { entries: LeagueStandingEntry[]; computedAt: string };
        setStandings(data.entries);
        setStandingsAt(data.computedAt);
      }
      setStandingsLoaded(true);
    });
    return () => {
      unsubL();
      unsubM();
      unsubS();
    };
  }, [leagueId]);

  const reloadSeasons = useCallback(async () => {
    if (!leagueId) return;
    try {
      setSeasons(await listLeagueSeasons(leagueId));
    } catch {
      setSeasons([]);
    }
  }, [leagueId]);
  useEffect(() => {
    reloadSeasons();
  }, [reloadSeasons]);

  // Resolve store names from the directory
  useEffect(() => {
    let cancelled = false;
    getStoreDirectory()
      .then((d) => {
        if (!cancelled) setDirectory(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const storeRows = useMemo(() => {
    if (!league) return [];
    const bySlug = new Map(directory.map((d) => [d.slug, d]));
    return league.storeSlugs.map(
      (slug) =>
        bySlug.get(slug) || {
          slug,
          name: league.storeNames?.[slug] || slug,
          totalMatches: 0,
          uniquePlayers: 0,
        },
    );
  }, [league, directory]);

  const isOrganizer = !!user && !!league && user.uid === league.organizerUid;
  // Site admins get organizer-equivalent powers for moderation.
  const canEdit = isOrganizer || (!!user && isAdmin && !!league);
  const isMember = useMemo(
    () => !!user && members.some((m) => m.uid === user.uid),
    [user, members],
  );

  // One windowed read of every member's in-window matches → the match pool that
  // powers filters, stats, matchups and filtered standings (all in memory).
  useEffect(() => {
    if (!leagueId) return;
    let cancelled = false;
    getLeagueMatchPool(leagueId)
      .then((p) => !cancelled && setPool(p))
      .catch(() => !cancelled && setPool(null));
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const filtersActive =
    !!(filters.stores?.length || filters.formats?.length || filters.eventTypes?.length || filters.startDate || filters.endDate);
  const filterOptions = useMemo(
    () => (pool ? deriveFilterOptions(pool.matches) : { stores: [], formats: [], eventTypes: [] }),
    [pool],
  );
  const filteredMatches = useMemo(
    () => (pool ? applyFilters(pool.matches, filters) : []),
    [pool, filters],
  );
  // Signature-hero crests are stable across filters → derive from the full pool.
  const signatureHeroes = useMemo(() => (pool ? signatureHeroByUid(pool.matches) : {}), [pool]);
  const form = useMemo(() => recentFormByUid(filteredMatches), [filteredMatches]);
  const filterSummary = useMemo(() => {
    const s = poolSummary(filteredMatches);
    return { matches: s.totalMatches, players: s.players, events: s.events };
  }, [filteredMatches]);
  // Unfiltered → canonical persisted standings (preserves private members).
  // Any filter active → derive from the (readable) pool + an honesty note.
  const displayStandings = useMemo(() => {
    if (filtersActive && pool) return standingsFromPool(filteredMatches, pool.league);
    return standings || [];
  }, [filtersActive, pool, filteredMatches, standings]);

  // Auto-refresh the standings snapshot when it's stale, so imported matches show
  // up without anyone clicking "Refresh". Standings are otherwise a manual, on-click
  // snapshot: a member imports, but the leaderboard stays frozen until someone
  // recomputes. Here, opening the league self-heals it. Guardrails:
  //   • only members / organizer / admin fire it (Firestore rules only let them
  //     write the standings doc);
  //   • once per league per mount (ref keyed by leagueId — survives league switches);
  //   • only when the snapshot is missing or older than STANDINGS_STALE_MS, so we
  //     don't re-read every member's matches on every view.
  // Only auto-refresh while the league is live (today inside its window and not a
  // draft). Draft / future / completed leagues gain no new matches, so an on-view
  // recompute would just re-read every member's matches for nothing. Manual
  // Refresh still works for those (e.g. backfilling a finished league).
  const leagueActive = useMemo(() => {
    if (!league) return false;
    const today = new Date().toISOString().slice(0, 10);
    return league.status !== "draft" && league.startDate <= today && league.endDate >= today;
  }, [league]);

  const autoRefreshedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!leagueId || !standingsLoaded) return;
    if (!leagueActive) return;
    if (!(isMember || canEdit)) return;
    if (autoRefreshedForRef.current === leagueId) return;
    const STANDINGS_STALE_MS = 10 * 60 * 1000;
    const ageMs = standingsAt ? Date.now() - Date.parse(standingsAt) : Infinity;
    if (ageMs < STANDINGS_STALE_MS) return;
    autoRefreshedForRef.current = leagueId;
    let cancelled = false;
    (async () => {
      try {
        const entries = await recomputeAndStoreStandings(leagueId);
        if (!cancelled) setStandings(entries);
      } catch {
        // Silent: the manual "Refresh" button stays available as a fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leagueId, standingsLoaded, standingsAt, isMember, canEdit, leagueActive]);

  // Organizer: live pending join requests for the approval panel.
  useEffect(() => {
    if (!leagueId || !isOrganizer) {
      setJoinRequests([]);
      return;
    }
    return subscribeToJoinRequests(leagueId, setJoinRequests);
  }, [leagueId, isOrganizer]);

  // Non-member: do I already have a pending request?
  useEffect(() => {
    if (!user || !leagueId || isMember || isOrganizer) {
      setMyRequestPending(false);
      return;
    }
    let cancelled = false;
    hasPendingJoinRequest(leagueId, user.uid)
      .then((p) => !cancelled && setMyRequestPending(p))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, leagueId, isMember, isOrganizer]);

  async function handleRecompute() {
    if (!league) return;
    setRecomputing(true);
    try {
      const entries = await recomputeAndStoreStandings(league.id);
      setStandings(entries);
      getLeagueMatchPool(league.id).then(setPool).catch(() => {});
      toast.success("Standings refreshed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refresh standings.");
    }
    setRecomputing(false);
  }

  async function handleJoin() {
    if (!user || !profile || !league) {
      toast.error("Sign in to join the league.");
      return;
    }
    try {
      const result = await joinLeague(league, profile);
      if (result === "requested") {
        setMyRequestPending(true);
        toast.success("Request sent. The organizer will review it.");
      } else {
        toast.success(`Joined ${league.name}.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join.");
    }
  }

  async function handleCancelRequest() {
    if (!user || !league) return;
    try {
      await removeJoinRequest(league.id, user.uid);
      setMyRequestPending(false);
      toast.success("Request cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel request.");
    }
  }

  async function handleApprove(request: LeagueJoinRequest) {
    if (!league) return;
    try {
      await approveJoinRequest(league.id, request);
      toast.success(`Approved ${request.displayName}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve.");
    }
  }

  async function handleRejectRequest(uid: string, name: string) {
    if (!league) return;
    try {
      await removeJoinRequest(league.id, uid);
      toast.success(`Declined ${name}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline.");
    }
  }

  async function handleLeave() {
    if (!user || !league) return;
    try {
      await leaveLeague(league.id, user.uid);
      toast.success("Left the league.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave.");
    }
  }

  async function handleKick(uid: string) {
    if (!user || !league) return;
    if (!confirm("Remove this member from the league?")) return;
    try {
      await kickLeagueMember(league.id, user.uid, uid);
      toast.success("Member removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member.");
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-fab-dim">Loading league…</div>;
  }
  if (notFound || !league) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-fab-text">
          League not found. <Link href="/leagues" className="text-fab-gold underline">Back to leagues</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-3">
        <Link
          href="/leagues"
          className="inline-flex items-center gap-1 text-xs text-fab-dim hover:text-fab-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All leagues
        </Link>
      </div>

      <Marquee
        league={league}
        organizerName={league.organizerName}
        memberCount={league.memberCount}
        members={members}
        matchCount={pool?.matches.length}
        leader={standings?.[0] || null}
        leaderHero={standings?.[0] ? signatureHeroes[standings[0].uid] : undefined}
        actions={
          <>
            {!isMember &&
              (myRequestPending ? (
                <div className="flex flex-col items-stretch gap-1">
                  <span className="rounded-md border border-fab-gold/40 bg-fab-gold/10 px-3 py-1.5 text-center text-sm font-bold text-fab-gold">
                    Request pending
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="text-[11px] font-bold text-fab-dim hover:text-rose-300"
                  >
                    Cancel request
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={!user}
                  className="rounded-md bg-fab-gold px-3 py-1.5 text-sm font-bold text-black hover:bg-fab-gold/80 disabled:opacity-50"
                >
                  {leagueRequiresApproval(league) ? "Request to join" : "Join league"}
                </button>
              ))}
            {isMember && !isOrganizer && (
              <button
                type="button"
                onClick={handleLeave}
                className="rounded-md border border-fab-border bg-fab-bg/60 px-3 py-1.5 text-xs font-bold text-fab-dim hover:text-rose-300"
              >
                Leave league
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md border border-fab-gold/60 bg-fab-gold/10 px-3 py-1.5 text-xs font-bold text-fab-gold hover:bg-fab-gold/20"
              >
                <Settings className="h-3.5 w-3.5" /> {editing ? "Close editor" : "Edit league"}
                {!isOrganizer && isAdmin && <span className="ml-1 text-[10px]">(admin)</span>}
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowNewSeason(true)}
                title="Archive the current standings and start a fresh season (same members & stores)"
                className="rounded-md border border-fab-border/60 bg-fab-bg/60 px-3 py-1.5 text-xs font-bold text-fab-dim hover:text-fab-gold"
              >
                New season
              </button>
            )}
          </>
        }
      />

      {canEdit && editing && (
        <OrganizerEditor
          league={league}
          directory={directory}
          onClose={() => setEditing(false)}
        />
      )}

      {canEdit && showNewSeason && (
        <NewSeasonModal
          league={league}
          stores={storeRows.map((r) => ({ slug: r.slug, name: r.name }))}
          onClose={() => setShowNewSeason(false)}
          onDone={() => {
            setShowNewSeason(false);
            reloadSeasons();
          }}
        />
      )}

      <LeagueControlBar
        tab={leagueTab}
        setTab={setLeagueTab}
        memberCount={members.length}
        options={filterOptions}
        filters={filters}
        setFilters={setFilters}
        summary={filterSummary}
        filtersActive={filtersActive}
        leagueActive={leagueActive}
        poolReady={!!pool}
      />

      {leagueTab === "standings" && (() => {
        const viewingSeason = viewingSeasonId ? seasons.find((s) => s.id === viewingSeasonId) : null;
        return (
        <section className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-fab-gold">
              Standings{filtersActive && !viewingSeason && <span className="ml-1 text-xs font-normal text-fab-dim">(filtered)</span>}
            </h2>
            <div className="flex items-center gap-2 text-xs text-fab-dim">
              {seasons.length > 0 && (
                <select
                  value={viewingSeasonId || "current"}
                  onChange={(e) => setViewingSeasonId(e.target.value === "current" ? null : e.target.value)}
                  title="View a past season's final standings"
                  className="rounded-md border border-fab-border/60 bg-fab-bg/60 px-2 py-1 text-fab-text focus:border-fab-gold focus:outline-none"
                >
                  <option value="current">
                    Current{league.seasonName ? ` — ${league.seasonName}` : (league.seasonNumber || 1) > 1 ? ` — Season ${league.seasonNumber}` : ""}
                  </option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (final)</option>
                  ))}
                </select>
              )}
              {!viewingSeason && standingsAt && !filtersActive && (
                <span title="Standings recompute automatically when a member opens this page (at most once every 10 min). Refresh forces it now.">
                  Updated{" "}
                  {new Date(standingsAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {!viewingSeason && (isMember || canEdit) && !filtersActive && (
                <button
                  type="button"
                  onClick={handleRecompute}
                  disabled={recomputing}
                  className="inline-flex items-center gap-1 rounded-md border border-fab-border/60 bg-fab-bg/60 px-2 py-1 text-fab-text hover:text-fab-gold disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${recomputing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              )}
            </div>
          </div>

          {viewingSeason ? (
            <>
              <p className="text-[11px] text-fab-dim">
                Final standings — {viewingSeason.name} ({viewingSeason.startDate} → {viewingSeason.endDate}).
              </p>
              <StandingsTable standings={viewingSeason.entries} league={league} />
            </>
          ) : (
            <>
              {filtersActive && pool && pool.unreadableMemberUids.length + pool.readableMemberUids.length > 0 && (
                <p className="text-[11px] text-fab-dim">
                  Filtered view — derived from {pool.readableMemberUids.length} of {members.length} members&apos; visible matches.
                </p>
              )}

              {displayStandings.length > 0 ? (
                <>
                  <Podium standings={displayStandings} signatureHeroes={signatureHeroes} />
                  <StorylineCards matches={filteredMatches} standings={displayStandings} />
                  <BroadcastStandings standings={displayStandings} signatureHeroes={signatureHeroes} form={form} />
                </>
              ) : filtersActive ? (
                <p className="rounded-xl border border-fab-border bg-fab-surface p-4 text-sm text-fab-muted">
                  No matches for these filters.
                </p>
              ) : (
                <StandingsTable standings={standings} league={league} />
              )}
            </>
          )}

          {/* Scoring is directly relevant to the standings, so surface it here
              (rather than only under the Players tab). Reflects the viewed season. */}
          <ScoringSummary scoringRules={viewingSeason ? viewingSeason.scoringRules : league.scoringRules} />
        </section>
        );
      })()}

      {leagueTab === "meta" && (
        <section className="mt-5 space-y-5">
          {!pool ? (
            <p className="text-sm text-fab-muted">Loading match data…</p>
          ) : filteredMatches.length === 0 ? (
            <p className="rounded-xl border border-fab-border bg-fab-surface p-4 text-sm text-fab-muted">
              No matches in view yet. Meta fills in as members log league matches.
            </p>
          ) : (
            <>
              <KpiStrip matches={filteredMatches} />
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-xl border border-fab-border bg-fab-surface p-4">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-fab-dim">Most-played heroes</h3>
                  <HeroMetaBars matches={filteredMatches} />
                </div>
                <div className="rounded-xl border border-fab-border bg-fab-surface p-4">
                  <MatchupGrid matches={filteredMatches} />
                </div>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <StoreTurf matches={filteredMatches} />
                <ActivityPulse matches={filteredMatches} />
              </div>
            </>
          )}
        </section>
      )}

      {leagueTab === "players" && (
        <section className="mt-5 space-y-5">
          {isOrganizer && (
            <JoinRequestsPanel requests={joinRequests} onApprove={handleApprove} onReject={handleRejectRequest} />
          )}
          <PlayerCards
            members={members}
            standings={standings}
            signatureHeroes={signatureHeroes}
            organizerUid={league.organizerUid}
            isOrganizer={isOrganizer}
            currentUid={user?.uid || null}
            onKick={handleKick}
          />
          <StoresList stores={storeRows} />
          {canEdit && <DisbandPanel leagueId={league.id} ownerUid={league.organizerUid} />}
        </section>
      )}
    </div>
  );
}

function StandingsTable({
  standings,
  league,
}: {
  standings: LeagueStandingEntry[] | null;
  league: League;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const isFuture = league.startDate > todayIso;
  const isPast = league.endDate < todayIso;
  const isDraft = league.status === "draft";

  if (!standings) {
    return (
      <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4 text-sm text-fab-dim">
        Standings compute automatically from imported matches the next time a member
        opens this page. A member or organizer can also click <strong>Refresh</strong> to
        recompute now.
      </div>
    );
  }
  if (standings.length === 0) {
    let message: React.ReactNode;
    if (isDraft) {
      message = (
        <>
          This league is still in <strong>draft</strong>. The organizer can mark it active
          from the edit panel — standings will populate once it&apos;s active and players
          start logging matches.
        </>
      );
    } else if (isFuture) {
      message = (
        <>
          League hasn&apos;t started yet. Matches played at the participating stores from{" "}
          <strong>{league.startDate}</strong> onward will count.
        </>
      );
    } else if (isPast) {
      message = "League ended without any qualifying matches being recorded.";
    } else {
      message = (
        <>
          No qualifying matches yet. Once players join and import matches at the participating
          stores during the date window, they&apos;ll appear here.
        </>
      );
    }
    return (
      <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4 text-sm text-fab-muted">
        {message}
      </div>
    );
  }
  const showByes = standings.some((e) => (e.byes || 0) > 0);
  return (
    <div className="overflow-hidden rounded-lg border border-fab-border/70 bg-fab-bg/45">
      <div className="flex items-center justify-between gap-2 border-b border-fab-border/40 bg-fab-bg/30 px-3 py-2 text-[10px] text-fab-dim">
        <span className="font-bold uppercase tracking-[0.12em]">
          {standings.length} player{standings.length === 1 ? "" : "s"} ranked
        </span>
        <span
          title={TIEBREAKER_TEXT}
          className="cursor-help underline decoration-dotted underline-offset-2"
        >
          tie-breakers ⓘ
        </span>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-fab-bg/60 text-xs uppercase tracking-wider text-fab-dim">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Player</th>
            <th className="px-2 py-2 text-right">Pts</th>
            <th className="px-2 py-2 text-right">W</th>
            <th className="px-2 py-2 text-right">L</th>
            <th className="px-2 py-2 text-right">D</th>
            {showByes && <th className="px-2 py-2 text-right">B</th>}
            <th className="px-2 py-2 text-right">Mch</th>
            <th className="px-2 py-2 text-right" title="Distinct events attended">Evt</th>
            <th className="px-2 py-2 text-right">Stores</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((e, i) => (
            <tr
              key={e.uid}
              className={`border-t border-fab-border/40 ${i < 3 ? "bg-fab-gold/[0.04]" : ""}`}
            >
              <td className="px-3 py-2 font-bold text-fab-dim tabular-nums">{i + 1}</td>
              <td className="px-3 py-2">
                <Link
                  href={`/player/${e.username}`}
                  className="font-bold text-fab-text hover:text-fab-gold"
                >
                  {e.displayName}
                </Link>
                <p className="text-[11px] text-fab-dim">@{e.username}</p>
              </td>
              <td className="px-2 py-2 text-right font-black text-fab-gold tabular-nums">{e.points}</td>
              <td className="px-2 py-2 text-right text-emerald-300 tabular-nums">{e.wins}</td>
              <td className="px-2 py-2 text-right text-rose-300 tabular-nums">{e.losses}</td>
              <td className="px-2 py-2 text-right text-sky-300 tabular-nums">{e.draws}</td>
              {showByes && (
                <td className="px-2 py-2 text-right text-fab-muted tabular-nums">{e.byes || 0}</td>
              )}
              <td className="px-2 py-2 text-right text-fab-text tabular-nums">{e.matches}</td>
              <td className="px-2 py-2 text-right text-fab-text tabular-nums">{e.events ?? "—"}</td>
              <td className="px-2 py-2 text-right text-fab-text tabular-nums">{e.storesPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function ScoringSummary({ scoringRules }: { scoringRules: LeagueScoringRules }) {
  const hasBye = (scoringRules.pointsPerBye || 0) > 0;
  const hasParticipation = (scoringRules.pointsPerMatch || 0) > 0;
  const minPerEvent = scoringRules.minPointsPerEvent || 0;
  const attendance = scoringRules.pointsPerEvent || 0;
  return (
    <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-fab-dim">Scoring</h3>
      <div className={`mt-2 grid gap-2 text-center ${hasBye ? "grid-cols-4" : "grid-cols-3"}`}>
        <div>
          <p className="text-lg font-black text-emerald-300 tabular-nums">{scoringRules.pointsPerWin}</p>
          <p className="text-[10px] uppercase tracking-wider text-fab-dim">Win</p>
        </div>
        <div>
          <p className="text-lg font-black text-rose-300 tabular-nums">{scoringRules.pointsPerLoss}</p>
          <p className="text-[10px] uppercase tracking-wider text-fab-dim">Loss</p>
        </div>
        <div>
          <p className="text-lg font-black text-sky-300 tabular-nums">{scoringRules.pointsPerDraw}</p>
          <p className="text-[10px] uppercase tracking-wider text-fab-dim">Draw</p>
        </div>
        {hasBye && (
          <div>
            <p className="text-lg font-black text-fab-text tabular-nums">{scoringRules.pointsPerBye}</p>
            <p className="text-[10px] uppercase tracking-wider text-fab-dim">Bye</p>
          </div>
        )}
      </div>
      {hasParticipation && (
        <p className="mt-2 text-[11px] text-fab-muted">
          +{scoringRules.pointsPerMatch} participation bonus per W/L/D match
        </p>
      )}
      {minPerEvent > 0 && (
        <p className="mt-2 text-[11px] text-fab-muted">
          <span className="font-semibold text-fab-text">Minimum {minPerEvent}:</span>{" "}
          anyone who plays an event scores at least {minPerEvent} total — a floor, not a bonus.
          Win more and your wins stand; it never adds on top of them.
        </p>
      )}
      {attendance > 0 && (
        <p className="mt-2 text-[11px] text-fab-muted">
          <span className="font-semibold text-fab-text">+{attendance} attendance:</span> added
          once per event you play in, on top of your match points.
        </p>
      )}
      {(scoringRules.eligibleEventTypes?.length || 0) > 0 && (
        <p className="mt-3 text-[11px] text-fab-muted">
          <span className="font-semibold text-fab-text">Event types:</span>{" "}
          {scoringRules.eligibleEventTypes!.join(", ")}
        </p>
      )}
      {(scoringRules.eligibleFormats?.length || 0) > 0 && (
        <p className="mt-1 text-[11px] text-fab-muted">
          <span className="font-semibold text-fab-text">Formats:</span>{" "}
          {scoringRules.eligibleFormats!.join(", ")}
        </p>
      )}
      {scoringRules.formatMultipliers && (
        <p className="mt-1 text-[11px] text-fab-muted">
          <span className="font-semibold text-fab-text">Multipliers:</span>{" "}
          {Object.entries(scoringRules.formatMultipliers)
            .map(([f, m]) => `${f} ×${m}`)
            .join(", ")}
        </p>
      )}
      <p className="mt-3 border-t border-fab-border/40 pt-2 text-[11px] text-fab-dim">
        {TIEBREAKER_TEXT}
      </p>
    </div>
  );
}

function StoresList({ stores }: { stores: StoreDirectoryEntry[] }) {
  return (
    <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-fab-dim">
        Participating stores ({stores.length})
      </h3>
      {stores.length === 0 ? (
        <p className="mt-2 text-xs text-fab-dim">No stores yet.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {stores.map((s) => (
            <li key={s.slug} className="text-sm">
              <Link
                href={`/stores/${s.slug}`}
                className="font-bold text-fab-text hover:text-fab-gold"
              >
                {s.name}
              </Link>
              {s.totalMatches > 0 && (
                <span className="ml-1 text-[11px] text-fab-dim">
                  · {s.totalMatches} matches · {s.uniquePlayers} player
                  {s.uniquePlayers === 1 ? "" : "s"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function JoinRequestsPanel({
  requests,
  onApprove,
  onReject,
}: {
  requests: LeagueJoinRequest[];
  onApprove: (request: LeagueJoinRequest) => void;
  onReject: (uid: string, name: string) => void;
}) {
  return (
    <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-fab-dim">
        Join requests ({requests.length})
      </h3>
      {requests.length === 0 ? (
        <p className="mt-2 text-xs text-fab-muted">No pending requests.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {requests.map((r) => (
            <li key={r.uid} className="flex items-center justify-between gap-2">
              <Link
                href={`/player/${r.username}`}
                className="min-w-0 flex-1 truncate text-fab-text hover:text-fab-gold"
              >
                {r.displayName}
                <span className="ml-1 text-[10px] text-fab-dim">@{r.username}</span>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onApprove(r)}
                  className="rounded-md bg-fab-gold px-2 py-1 text-[11px] font-bold text-black hover:bg-fab-gold/80"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onReject(r.uid, r.displayName)}
                  className="rounded-md border border-fab-border px-2 py-1 text-[11px] font-bold text-fab-dim hover:text-rose-300"
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlayerCards({
  members,
  standings,
  signatureHeroes,
  organizerUid,
  isOrganizer,
  currentUid,
  onKick,
}: {
  members: LeagueMember[];
  standings: LeagueStandingEntry[] | null;
  signatureHeroes: Record<string, string>;
  organizerUid: string;
  isOrganizer: boolean;
  currentUid: string | null;
  onKick: (uid: string) => void;
}) {
  const ranked = !!(standings && standings.length);
  const rows = ranked
    ? standings!
    : members.map((m) => ({
        uid: m.uid,
        username: m.username,
        displayName: m.displayName,
        photoUrl: m.photoUrl,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        byes: 0,
        points: 0,
        storesPlayed: 0,
        events: 0,
      }));

  return (
    <div>
      <h2 className="mb-2 text-lg font-bold text-fab-gold">Players</h2>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p, i) => {
          const isOrg = p.uid === organizerUid;
          const isSelf = currentUid === p.uid;
          const decisive = p.matches - p.byes;
          const wr = decisive > 0 ? Math.round((p.wins / decisive) * 100) : null;
          const initial = (p.displayName || p.username || "?").charAt(0).toUpperCase();
          return (
            <div key={p.uid} className="relative rounded-lg border border-fab-border bg-fab-bg/45 p-3">
              <div className="flex items-center gap-2.5">
                <span className="relative inline-block h-10 w-10 shrink-0">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt="" className="h-10 w-10 rounded-full border border-fab-border object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-fab-border bg-fab-surface text-sm font-black text-fab-gold">
                      {initial}
                    </span>
                  )}
                  {signatureHeroes[p.uid] && (
                    <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-fab-bg">
                      <HeroImg name={signatureHeroes[p.uid]} size="sm" />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/player/${p.username}`} className="truncate text-sm font-black text-fab-text hover:text-fab-gold">
                      {p.displayName}
                    </Link>
                    {isOrg && <span className="shrink-0 rounded bg-fab-gold/15 px-1 text-[9px] font-bold text-fab-gold">organizer</span>}
                    {isSelf && !isOrg && <span className="shrink-0 text-[9px] text-fab-dim">(you)</span>}
                  </div>
                  <p className="truncate text-[11px] text-fab-dim">@{p.username}</p>
                </div>
                {ranked && <span className="shrink-0 rounded-md bg-fab-gold/10 px-2 py-0.5 text-sm font-black text-fab-gold">#{i + 1}</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-fab-muted">
                <span><b className="text-fab-text">{p.points}</b> pts</span>
                <span>{p.wins}-{p.losses}{p.draws ? `-${p.draws}` : ""}</span>
                {wr !== null && <span>{wr}% WR</span>}
                <span>{p.matches} gp</span>
                {(p.events ?? 0) > 0 && <span>{p.events} event{p.events === 1 ? "" : "s"}</span>}
                {p.storesPlayed > 0 && <span>{p.storesPlayed} store{p.storesPlayed === 1 ? "" : "s"}</span>}
              </div>
              {isOrganizer && !isOrg && (
                <button
                  type="button"
                  onClick={() => onKick(p.uid)}
                  title="Remove member"
                  className="absolute right-2 top-2 rounded p-1 text-fab-dim hover:text-rose-300"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DisbandPanel({ leagueId, ownerUid }: { leagueId: string; ownerUid: string }) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.04] p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-rose-300">Danger zone</h3>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-2 text-xs font-bold text-rose-300 underline hover:text-rose-200"
        >
          Disband league
        </button>
      ) : (
        <div className="mt-2 space-y-2 text-xs">
          <p className="text-rose-200">
            This will delete the league, its standings, and all member records. Match data is
            unaffected.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={working}
              onClick={async () => {
                setWorking(true);
                try {
                  await disbandLeague(leagueId, ownerUid);
                  toast.success("League disbanded.");
                  window.location.href = "/leagues";
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to disband.");
                  setWorking(false);
                }
              }}
              className="rounded-md bg-rose-500/80 px-2 py-1 font-bold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {working ? "Disbanding…" : "Yes, disband"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-fab-border/60 px-2 py-1 text-fab-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrganizerEditor({
  league,
  directory,
  onClose,
}: {
  league: League;
  directory: StoreDirectoryEntry[];
  onClose: () => void;
}) {
  const [name, setName] = useState(league.name);
  const [description, setDescription] = useState(league.description || "");
  const [city, setCity] = useState(league.city || "");
  const [region, setRegion] = useState(league.region || "");
  const [country, setCountry] = useState(league.country || "");
  const [startDate, setStartDate] = useState(league.startDate);
  const [endDate, setEndDate] = useState(league.endDate);
  const [status, setStatus] = useState<League["status"]>(league.status);
  const [joinPolicy, setJoinPolicy] = useState<"open" | "approval">(
    league.joinPolicy === "open" ? "open" : "approval",
  );
  const [pointsWin, setPointsWin] = useState(league.scoringRules.pointsPerWin);
  const [pointsLoss, setPointsLoss] = useState(league.scoringRules.pointsPerLoss);
  const [pointsDraw, setPointsDraw] = useState(league.scoringRules.pointsPerDraw);
  const [pointsBye, setPointsBye] = useState(league.scoringRules.pointsPerBye || 0);
  const [pointsPerMatch, setPointsPerMatch] = useState(league.scoringRules.pointsPerMatch || 0);
  const [minPointsPerEvent, setMinPointsPerEvent] = useState(league.scoringRules.minPointsPerEvent || 0);
  const [pointsPerEvent, setPointsPerEvent] = useState(league.scoringRules.pointsPerEvent || 0);
  const [eligibleEventTypes, setEligibleEventTypes] = useState<string[]>(
    league.scoringRules.eligibleEventTypes || [],
  );
  const [eligibleFormats, setEligibleFormats] = useState<string[]>(
    league.scoringRules.eligibleFormats || [],
  );
  const [storeSlugs, setStoreSlugs] = useState<string[]>(league.storeSlugs);
  const [storeNames, setStoreNames] = useState<Record<string, string>>(league.storeNames || {});
  const [storeSearch, setStoreSearch] = useState("");
  const [sessions, setSessions] = useState<LeagueSession[]>(league.sessions || []);
  const availableStores = useMemo(
    () =>
      storeSlugs.map((slug) => ({
        slug,
        name: directory.find((d) => d.slug === slug)?.name || storeNames[slug] || slug,
      })),
    [storeSlugs, storeNames, directory],
  );
  const [saving, setSaving] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);

  async function handleBannerFile(file: File | undefined) {
    if (!file) return;
    setBannerBusy(true);
    try {
      await uploadLeagueBanner(league.id, file);
      toast.success("Banner updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload banner.");
    }
    setBannerBusy(false);
  }

  async function handleRemoveBanner() {
    setBannerBusy(true);
    try {
      await removeLeagueBanner(league.id);
      toast.success("Banner removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove banner.");
    }
    setBannerBusy(false);
  }

  function toggleArrayItem(arr: string[], item: string, setter: (v: string[]) => void) {
    setter(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  }

  const filteredDirectory = useMemo(() => {
    if (!storeSearch.trim()) return directory;
    return directory.filter((d) => storeNameMatchesQuery(d.name, storeSearch));
  }, [directory, storeSearch]);

  const typedStoreSlug = slugifyStoreName(storeSearch);
  const canAddTypedStore =
    !!storeSearch.trim() &&
    typedStoreSlug.length >= 2 &&
    !directory.some((d) => d.slug === typedStoreSlug) &&
    !storeSlugs.includes(typedStoreSlug);
  const storeNearMatch = canAddTypedStore ? findNearMatchStore(typedStoreSlug, directory) : null;

  // Add a store by typed name (not in the auto-directory). Matches count by slug.
  function addTypedStore() {
    const nm = storeSearch.trim().replace(/\s+/g, " ");
    const slug = slugifyStoreName(nm);
    if (!slug || slug.length < 2) {
      toast.error("Store name is too short.");
      return;
    }
    const inDir = directory.find((d) => d.slug === slug);
    if (inDir) {
      if (!storeSlugs.includes(slug)) setStoreSlugs((s) => [...s, slug]);
      setStoreSearch("");
      return;
    }
    if (!storeSlugs.includes(slug)) {
      setStoreSlugs((s) => [...s, slug]);
      setStoreNames((n) => ({ ...n, [slug]: nm }));
    }
    setStoreSearch("");
  }

  async function handleSave() {
    // Pre-flight validation — same checks as the create form so an organizer
    // can't accidentally save a league with bad dates / no stores.
    if (!name.trim()) {
      toast.error("League name is required.");
      return;
    }
    // With a per-store schedule, the stores + date window are derived from it, so
    // skip the flat-window checks (the schedule guarantees ≥1 store and valid dates).
    if (sessions.length === 0) {
      if (!startDate || !endDate) {
        toast.error("Start and end dates are required.");
        return;
      }
      if (startDate > endDate) {
        toast.error("End date must be after start date.");
        return;
      }
      if (storeSlugs.length === 0) {
        toast.error("Add at least one store to the league.");
        return;
      }
    }

    // Confirm if marking the league completed — that's a meaningful change
    // that hides it from active views.
    if (status === "completed" && league.status !== "completed") {
      if (!confirm("Mark this league as completed? Players can still view standings, but new matches won't be counted.")) {
        return;
      }
    }

    setSaving(true);
    try {
      const scoringRules: LeagueScoringRules = {
        pointsPerWin: pointsWin,
        pointsPerLoss: pointsLoss,
        pointsPerDraw: pointsDraw,
        pointsPerBye: pointsBye > 0 ? pointsBye : undefined,
        pointsPerMatch: pointsPerMatch > 0 ? pointsPerMatch : undefined,
        minPointsPerEvent: minPointsPerEvent > 0 ? minPointsPerEvent : undefined,
        pointsPerEvent: pointsPerEvent > 0 ? pointsPerEvent : undefined,
        eligibleEventTypes: eligibleEventTypes.length > 0 ? eligibleEventTypes : undefined,
        eligibleFormats: eligibleFormats.length > 0 ? eligibleFormats : undefined,
      };
      const prunedNames: Record<string, string> = {};
      for (const s of storeSlugs) if (storeNames[s]) prunedNames[s] = storeNames[s];
      await updateLeague(league.id, {
        name: name.trim(),
        description: description.trim(),
        city: city.trim(),
        region: region.trim(),
        country: country.trim(),
        startDate,
        endDate,
        storeSlugs,
        storeNames: prunedNames,
        sessions,
        scoringRules,
        status,
        joinPolicy,
      });
      // Recompute standings so new scoring rules / date window / stores take
      // effect right away instead of waiting for an on-view auto-refresh (which
      // never fires for ended leagues). The parent's live standings subscription
      // reflects the result; best-effort — the "Refresh Standings" button is the
      // fallback if this fails (e.g. an organizer who isn't a league member).
      recomputeAndStoreStandings(league.id).catch(() => {});
      toast.success("League updated. Standings recalculating…");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update.");
    }
    setSaving(false);
  }

  const FORMAT_OPTIONS = [
    "Classic Constructed",
    "Silver Age",
    "Blitz",
    "Sealed",
    "Draft",
    "Living Legend",
    "Clash",
    "Ultimate Pit Fight",
  ];
  const EVENT_TYPE_OPTIONS = [
    "Armory",
    "Skirmish",
    "Road to Nationals",
    "ProQuest",
    "Battle Hardened",
    "The Calling",
    "Nationals",
  ];

  return (
    <div className="mt-4 rounded-lg border border-fab-gold/40 bg-fab-gold/[0.04] p-4">
      <h2 className="text-base font-bold text-fab-gold">Edit league</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-fab-dim">Banner image</label>
          {league.bannerUrl && (
            <img
              src={league.bannerUrl}
              alt=""
              className="mb-2 h-24 w-full rounded-md border border-fab-border object-cover"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-xs font-bold text-fab-text hover:border-fab-gold/40 hover:text-fab-gold ${
                bannerBusy ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {bannerBusy ? "Uploading…" : league.bannerUrl ? "Replace banner" : "Upload banner"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={bannerBusy}
                onChange={(e) => {
                  handleBannerFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {league.bannerUrl && (
              <button
                type="button"
                onClick={handleRemoveBanner}
                disabled={bannerBusy}
                className="rounded-md border border-fab-border px-3 py-1.5 text-xs font-bold text-fab-dim hover:text-rose-300 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-fab-dim">
            Wide image (JPEG/PNG/WebP, up to 8MB) shown at the top of the league page.
          </p>
        </div>
        <EditField label="Name">
          <input
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </EditField>
        <EditField label="Status">
          <select
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={status}
            onChange={(e) => setStatus(e.target.value as League["status"])}
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>
        </EditField>
        <EditField label="Joining">
          <select
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={joinPolicy}
            onChange={(e) => setJoinPolicy(e.target.value as "open" | "approval")}
          >
            <option value="approval">Require approval</option>
            <option value="open">Open to anyone</option>
          </select>
        </EditField>
        <EditField label="City">
          <input className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30" value={city} onChange={(e) => setCity(e.target.value)} />
        </EditField>
        <EditField label="Region">
          <input
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </EditField>
        <EditField label="Country">
          <input
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </EditField>
        <EditField label="Start date">
          <input
            type="date"
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </EditField>
        <EditField label="End date">
          <input
            type="date"
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </EditField>
        <EditField label="Description" className="sm:col-span-2">
          <textarea
            className="w-full min-h-[70px] rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
        </EditField>

        <EditField label="Points per win">
          <input
            type="number"
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={pointsWin}
            onChange={(e) => setPointsWin(Number(e.target.value))}
          />
        </EditField>
        <EditField label="Points per loss">
          <input
            type="number"
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={pointsLoss}
            onChange={(e) => setPointsLoss(Number(e.target.value))}
          />
        </EditField>
        <EditField label="Points per draw">
          <input
            type="number"
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={pointsDraw}
            onChange={(e) => setPointsDraw(Number(e.target.value))}
          />
        </EditField>
        <EditField label="Points per bye">
          <input
            type="number"
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={pointsBye}
            onChange={(e) => setPointsBye(Number(e.target.value))}
          />
        </EditField>
        <EditField label="Participation bonus">
          <input
            type="number"
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={pointsPerMatch}
            onChange={(e) => setPointsPerMatch(Number(e.target.value))}
          />
          <p className="mt-1 text-[11px] leading-tight text-fab-dim">
            Added to every W/L/D match you play — per game, not per event (byes excluded).
          </p>
        </EditField>
        <EditField label="Minimum points">
          <input
            type="number"
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={minPointsPerEvent}
            onChange={(e) => setMinPointsPerEvent(Number(e.target.value))}
          />
          <p className="mt-1 text-[11px] leading-tight text-fab-dim">
            A floor on a player&apos;s total — a winless attendee still scores this. Never adds on top of wins.
          </p>
        </EditField>
        <EditField label="Attendance points">
          <input
            type="number"
            className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
            value={pointsPerEvent}
            onChange={(e) => setPointsPerEvent(Number(e.target.value))}
          />
          <p className="mt-1 text-[11px] leading-tight text-fab-dim">
            Added once per event attended — per event, not per game. ON TOP of match points.
          </p>
        </EditField>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-fab-dim">
          Eligible event types
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EVENT_TYPE_OPTIONS.map((t) => {
            const active = eligibleEventTypes.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleArrayItem(eligibleEventTypes, t, setEligibleEventTypes)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  active
                    ? "border-fab-gold bg-fab-gold/15 text-fab-gold"
                    : "border-fab-border/60 bg-fab-bg/60 text-fab-dim"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-fab-dim">Eligible formats</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map((f) => {
            const active = eligibleFormats.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleArrayItem(eligibleFormats, f, setEligibleFormats)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  active
                    ? "border-fab-gold bg-fab-gold/15 text-fab-gold"
                    : "border-fab-border/60 bg-fab-bg/60 text-fab-dim"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-fab-dim">
            Participating stores
          </p>
          <span className="text-[11px] text-fab-muted">{storeSlugs.length} selected</span>
        </div>

        {/* Currently selected chips — surface what's already in the league. */}
        {storeSlugs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {storeSlugs.map((slug) => {
              const entry = directory.find((d) => d.slug === slug);
              const label = entry?.name || storeNames[slug] || slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() =>
                    setStoreSlugs((prev) => prev.filter((x) => x !== slug))
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-fab-gold/40 bg-fab-gold/15 px-2.5 py-1 text-xs font-semibold text-fab-gold hover:bg-fab-gold/25"
                  title="Click to remove"
                >
                  {label}
                  <span className="text-[14px] leading-none">×</span>
                </button>
              );
            })}
          </div>
        )}

        <input
          className="mt-2 w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
          placeholder="Search the directory, or type a name to add…"
          value={storeSearch}
          onChange={(e) => setStoreSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canAddTypedStore) {
              e.preventDefault();
              addTypedStore();
            }
          }}
        />
        {canAddTypedStore && (
          <div className="mt-2">
            {storeNearMatch && (
              <button
                type="button"
                onClick={() => {
                  if (!storeSlugs.includes(storeNearMatch.slug)) {
                    setStoreSlugs((s) => [...s, storeNearMatch.slug]);
                  }
                  setStoreSearch("");
                }}
                className="mb-2 flex w-full items-center justify-between gap-2 rounded-md border border-fab-draw/50 bg-fab-draw/10 px-3 py-2 text-left text-sm text-fab-draw hover:bg-fab-draw/20"
              >
                <span>
                  Did you mean “<span className="font-semibold">{storeNearMatch.name}</span>”?
                  Use the existing store.
                </span>
                <span className="shrink-0 text-[11px] opacity-80">
                  {storeNearMatch.totalMatches} matches
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={addTypedStore}
              className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-dashed border-fab-gold/50 bg-fab-gold/[0.06] px-3 py-2 text-left text-sm text-fab-gold hover:bg-fab-gold/[0.12]"
            >
              <span>
                Add “<span className="font-semibold">{storeSearch.trim()}</span>” by name
              </span>
              <span className="text-[16px] leading-none">＋</span>
            </button>
            <p className="mt-1 text-[11px] text-fab-dim">
              Adds as <span className="font-mono text-fab-muted">{typedStoreSlug}</span> — must match
              the venue name in GEM exactly.
            </p>
          </div>
        )}
        {!storeSearch.trim() ? (
          <p className="mt-2 rounded-md border border-dashed border-fab-border bg-fab-bg/40 px-3 py-3 text-center text-[11px] text-fab-muted">
            Type to search the directory of {directory.length} stores.
          </p>
        ) : filteredDirectory.length === 0 ? (
          <p className="mt-2 text-xs text-fab-dim">No stores match that search.</p>
        ) : (
          <ul className="mt-2 grid max-h-64 gap-1 overflow-y-auto rounded-md border border-fab-border/60 bg-fab-bg/40 p-1.5 sm:grid-cols-2">
            {filteredDirectory.slice(0, 200).map((s) => {
              const active = storeSlugs.includes(s.slug);
              return (
                <li key={s.slug}>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors ${
                      active ? "border-fab-gold/50 bg-fab-gold/10" : "border-transparent hover:border-fab-border hover:bg-fab-bg/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() =>
                        setStoreSlugs((prev) =>
                          prev.includes(s.slug) ? prev.filter((x) => x !== s.slug) : [...prev, s.slug],
                        )
                      }
                      className="mt-1 accent-fab-gold"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-fab-text">{s.name}</span>
                      <span className="block truncate text-[10px] text-fab-dim">
                        {s.totalMatches} matches · {s.uniquePlayers} player
                        {s.uniquePlayers === 1 ? "" : "s"}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Per-store date schedule (optional) — supersedes the flat window above */}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-semibold text-fab-text">Schedule specific dates (optional)</label>
        <LeagueScheduleBuilder sessions={sessions} onChange={setSessions} stores={availableStores} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-fab-border/60 px-3 py-1.5 text-sm text-fab-text"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-fab-gold px-3 py-1.5 text-sm font-bold text-black hover:bg-fab-gold/80 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

    </div>
  );
}

function EditField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-fab-dim">
        {label}
      </span>
      {children}
    </label>
  );
}
