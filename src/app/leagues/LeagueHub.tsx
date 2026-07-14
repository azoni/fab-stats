"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getAllLeagues, createLeague, joinLeague, leagueRequiresApproval, getMyLeagueIds, getLeaguesByIds } from "@/lib/leagues";
import { getStoreDirectory, slugifyStoreName, findNearMatchStore, storeNameMatchesQuery, type StoreDirectoryEntry } from "@/lib/store-directory";
import type { League, LeagueScoringRules } from "@/types";
import { toast } from "sonner";
import { PageHero } from "@/components/ui/PageHero";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CalendarDays, ListChecks, MapPin, PlusCircle, Search, Store as StoreIcon, Trophy, Users, X } from "lucide-react";

type Tab = "browse" | "my" | "about" | "create";

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

interface CreateFormState {
  name: string;
  description: string;
  city: string;
  region: string;
  country: string;
  startDate: string;
  endDate: string;
  pointsWin: number;
  pointsLoss: number;
  pointsDraw: number;
  pointsBye: number;
  pointsPerMatch: number;
  eligibleEventTypes: string[];
  eligibleFormats: string[];
  selectedStoreSlugs: string[];
  /** Display names for free-typed stores not in the directory, keyed by slug. */
  storeNames: Record<string, string>;
  joinPolicy: "open" | "approval";
}

const INITIAL_FORM: CreateFormState = {
  name: "",
  description: "",
  city: "",
  region: "",
  country: "",
  startDate: "",
  endDate: "",
  pointsWin: 3,
  pointsLoss: 1,
  pointsDraw: 1,
  pointsBye: 0,
  pointsPerMatch: 0,
  eligibleEventTypes: ["Armory"],
  eligibleFormats: [],
  selectedStoreSlugs: [],
  storeNames: {},
  joinPolicy: "approval",
};

function StatusBadge({ status }: { status: League["status"] }) {
  const variant: Record<League["status"], "muted" | "win" | "default"> = {
    draft: "muted",
    active: "win",
    completed: "default",
  };
  return (
    <Badge variant={variant[status] || "default"} size="xs">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function formatDateRange(start: string, end: string) {
  const fmt = (s: string) =>
    new Date(s + "T00:00:00Z").toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} → ${fmt(end)}`;
}

function validateForm(form: CreateFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "League name is required.";
  else if (form.name.trim().length > 80) errors.name = "Max 80 characters.";
  if (form.description.length > 1000) errors.description = "Max 1000 characters.";
  if (!form.startDate) errors.startDate = "Start date is required.";
  if (!form.endDate) errors.endDate = "End date is required.";
  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    errors.endDate = "End date must be after start date.";
  }
  if (form.selectedStoreSlugs.length === 0) errors.stores = "Pick at least one store.";
  if (!Number.isFinite(form.pointsWin)) errors.pointsWin = "Number required.";
  if (!Number.isFinite(form.pointsLoss)) errors.pointsLoss = "Number required.";
  if (!Number.isFinite(form.pointsDraw)) errors.pointsDraw = "Number required.";
  if (!Number.isFinite(form.pointsBye)) errors.pointsBye = "Number required.";
  if (!Number.isFinite(form.pointsPerMatch)) errors.pointsPerMatch = "Number required.";
  return errors;
}

type BrowseFilter = "all" | "active" | "upcoming" | "completed";

function timeRemainingLabel(league: League): { label: string; tone: "gold" | "muted" | "win" | "default" } | null {
  const todayIso = new Date().toISOString().slice(0, 10);
  if (league.status === "completed") return null;
  if (league.startDate > todayIso) {
    const days = Math.ceil(
      (new Date(league.startDate).getTime() - new Date(todayIso).getTime()) / 86_400_000,
    );
    return { label: days <= 0 ? "Starts today" : `Starts in ${days}d`, tone: "muted" };
  }
  if (league.endDate < todayIso) return { label: "Ended", tone: "muted" };
  const days = Math.ceil(
    (new Date(league.endDate).getTime() - new Date(todayIso).getTime()) / 86_400_000,
  );
  if (days <= 0) return { label: "Ends today", tone: "gold" };
  if (days <= 7) return { label: `${days}d left`, tone: "gold" };
  return { label: `${days}d left`, tone: "win" };
}

export default function LeagueHub() {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [browseFilter, setBrowseFilter] = useState<BrowseFilter>("all");
  const [browseSearch, setBrowseSearch] = useState("");

  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [creating, setCreating] = useState(false);

  const formErrors = useMemo(() => validateForm(form), [form]);
  // Surface errors only after first submit attempt — avoids yelling at the user
  // before they've finished typing.
  const errors = submitAttempted ? formErrors : ({} as Record<string, string>);

  // Store directory loaded ONCE. After that, the user's selections + filtering
  // are all local-only — never refetch on keystrokes.
  const [directory, setDirectory] = useState<StoreDirectoryEntry[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [storeSearch, setStoreSearch] = useState("");

  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [myLeagueIds, setMyLeagueIds] = useState<Set<string>>(new Set());
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [myLeaguesLoading, setMyLeaguesLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setMyLeagueIds(new Set());
      setMyLeagues([]);
      setMyLeaguesLoading(false);
      setActiveTab((t) => (t === "my" ? "browse" : t));
      return;
    }
    let cancelled = false;
    setMyLeaguesLoading(true);
    getMyLeagueIds(user.uid)
      .then(async (ids) => {
        if (cancelled) return;
        setMyLeagueIds(ids);
        // Fetch the actual docs by id so "My leagues" isn't limited by the
        // newest-100 cap on getAllLeagues().
        const docs = await getLeaguesByIds([...ids]);
        if (!cancelled) setMyLeagues(docs);
      })
      .catch((e) => {
        console.warn("Failed to load your leagues:", e);
      })
      .finally(() => {
        if (!cancelled) setMyLeaguesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    getAllLeagues()
      .then((l) => {
        if (!cancelled) setLeagues(l);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the directory ONCE on mount — the user said selection is sparse
  // and reloading on every keystroke is wrong.
  useEffect(() => {
    let cancelled = false;
    getStoreDirectory()
      .then((d) => {
        if (!cancelled) setDirectory(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDirectoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDirectory = useMemo(() => {
    // Don't show any stores until the user actually types — the directory has
    // potentially thousands of entries and picking is sparse.
    if (!storeSearch.trim()) return [];
    return directory.filter((d) => storeNameMatchesQuery(d.name, storeSearch));
  }, [directory, storeSearch]);

  // Whether the typed search resolves to a store that isn't already in the
  // directory or selected — i.e. it can be added by name.
  const typedStoreSlug = slugifyStoreName(storeSearch);
  const canAddTypedStore =
    !!storeSearch.trim() &&
    typedStoreSlug.length >= 2 &&
    !directory.some((d) => d.slug === typedStoreSlug) &&
    !form.selectedStoreSlugs.includes(typedStoreSlug);
  // Catch typos (e.g. "vudugaminng" → "vudugaming") before a phantom store is added.
  const storeNearMatch = canAddTypedStore ? findNearMatchStore(typedStoreSlug, directory) : null;

  // Stores already selected by the user (keep at top, even when filtered out).
  const selectedStoreEntries = useMemo(() => {
    const byId = new Map(directory.map((d) => [d.slug, d]));
    return form.selectedStoreSlugs
      .map(
        (slug) =>
          byId.get(slug) || {
            slug,
            name: form.storeNames[slug] || slug,
            totalMatches: 0,
            uniquePlayers: 0,
          },
      );
  }, [directory, form.selectedStoreSlugs, form.storeNames]);

  function update<K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleStore(slug: string) {
    setForm((f) => ({
      ...f,
      selectedStoreSlugs: f.selectedStoreSlugs.includes(slug)
        ? f.selectedStoreSlugs.filter((s) => s !== slug)
        : [...f.selectedStoreSlugs, slug],
    }));
  }

  // Add a store the organizer typed that isn't in the auto-directory (e.g. its
  // only importer is private, or it hasn't been aggregated yet). Matches count
  // by venue-name slug, so no directory presence is required.
  function addTypedStore() {
    const name = storeSearch.trim().replace(/\s+/g, " ");
    const slug = slugifyStoreName(name);
    if (!slug || slug.length < 2) {
      toast.error("Store name is too short.");
      return;
    }
    // If the typed name collides with a directory store, just select that one.
    const inDir = directory.find((d) => d.slug === slug);
    if (inDir) {
      if (!form.selectedStoreSlugs.includes(slug)) toggleStore(slug);
      setStoreSearch("");
      return;
    }
    if (!form.selectedStoreSlugs.includes(slug)) {
      setForm((f) => ({
        ...f,
        selectedStoreSlugs: [...f.selectedStoreSlugs, slug],
        storeNames: { ...f.storeNames, [slug]: name },
      }));
    }
    setStoreSearch("");
  }

  function toggleArrayItem(key: "eligibleEventTypes" | "eligibleFormats", item: string) {
    setForm((f) => {
      const arr = f[key];
      return {
        ...f,
        [key]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item],
      };
    });
  }

  async function handleCreateLeague() {
    setSubmitAttempted(true);
    const v = validateForm(form);
    if (Object.keys(v).length > 0) {
      const firstError = Object.values(v)[0];
      toast.error(firstError);
      return;
    }
    if (!user || !profile) {
      toast.error("Sign in to create a league.");
      return;
    }
    setCreating(true);
    try {
      const scoringRules: LeagueScoringRules = {
        pointsPerWin: form.pointsWin,
        pointsPerLoss: form.pointsLoss,
        pointsPerDraw: form.pointsDraw,
        pointsPerBye: form.pointsBye > 0 ? form.pointsBye : undefined,
        pointsPerMatch: form.pointsPerMatch > 0 ? form.pointsPerMatch : undefined,
        eligibleEventTypes:
          form.eligibleEventTypes.length > 0 ? form.eligibleEventTypes : undefined,
        eligibleFormats: form.eligibleFormats.length > 0 ? form.eligibleFormats : undefined,
      };
      await createLeague(profile, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        city: form.city.trim() || undefined,
        region: form.region.trim() || undefined,
        country: form.country.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        storeSlugs: form.selectedStoreSlugs,
        storeNames: form.storeNames,
        scoringRules,
        joinPolicy: form.joinPolicy,
      });
      toast.success("League created!");
      setForm(INITIAL_FORM);
      setSubmitAttempted(false);
      const refreshed = await getAllLeagues();
      setLeagues(refreshed);
      setActiveTab("browse");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create league.");
    }
    setCreating(false);
  }

  async function handleJoin(league: League) {
    if (!user || !profile) {
      toast.error("Sign in to join a league.");
      return;
    }
    setJoiningId(league.id);
    try {
      const result = await joinLeague(league, profile);
      if (result === "requested") {
        setRequestedIds((prev) => new Set(prev).add(league.id));
        toast.success(`Requested to join ${league.name}. The organizer will review it.`);
      } else {
        toast.success(`Joined ${league.name}.`);
        setMyLeagueIds((prev) => new Set(prev).add(league.id));
        setMyLeagues((prev) => (prev.some((l) => l.id === league.id) ? prev : [...prev, league]));
        const refreshed = await getAllLeagues();
        setLeagues(refreshed);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join.");
    }
    setJoiningId(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-4">
      <PageHero
        eyebrow={<><Badge variant="gold" size="xs">Beta</Badge>{" "}Leagues</>}
        title="Community-run armory leagues"
        description="Players join, play armory events as normal at any participating store, and league standings update from their imported match history."
        icon={<Trophy className="h-4 w-4" />}
        metrics={[
          { label: "Active leagues", value: leagues.filter((l) => l.status === "active").length },
          { label: "Total leagues", value: leagues.length },
        ]}
        actions={
          <Link
            href="/stores"
            className="inline-flex items-center gap-1.5 rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 text-xs font-semibold text-fab-text hover:border-fab-gold/40 hover:text-fab-gold"
          >
            <StoreIcon className="h-3.5 w-3.5" /> Browse stores
          </Link>
        }
      />

      <div className="flex gap-1 overflow-x-auto border-b border-fab-border">
        {((user ? ["browse", "my", "about", "create"] : ["browse", "about", "create"]) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
              activeTab === t
                ? "border-b-2 border-fab-gold text-fab-gold"
                : "text-fab-muted hover:text-fab-text"
            }`}
          >
            {t === "about"
              ? "How leagues work"
              : t === "browse"
                ? "Browse"
                : t === "my"
                  ? "My leagues"
                  : "Create a league"}
          </button>
        ))}
      </div>

      {activeTab === "about" && <AboutPanel />}

      {activeTab === "browse" && (
        <section className="space-y-3">
          {!loading && leagues.length > 0 && (
            <Card padding="sm">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[180px] flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fab-dim" />
                  <input
                    className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-1.5 pl-8 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
                    placeholder="Search leagues…"
                    value={browseSearch}
                    onChange={(e) => setBrowseSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {(["all", "active", "upcoming", "completed"] as BrowseFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setBrowseFilter(f)}
                      className={`rounded-md border px-2.5 py-1 font-semibold transition-colors ${
                        browseFilter === f
                          ? "border-fab-gold/50 bg-fab-gold/10 text-fab-gold"
                          : "border-fab-border bg-fab-bg text-fab-muted hover:text-fab-text"
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {loading ? (
            <Card padding="md">
              <p className="text-sm text-fab-muted">Loading leagues…</p>
            </Card>
          ) : leagues.length === 0 ? (
            <Card padding="md" className="text-center">
              <p className="text-sm text-fab-text">No leagues yet — be the first to start one.</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setActiveTab("create")}
                leftIcon={<PlusCircle className="h-4 w-4" />}
              >
                Create a league
              </Button>
            </Card>
          ) : (() => {
            const todayIso = new Date().toISOString().slice(0, 10);
            const q = browseSearch.trim().toLowerCase();
            const filtered = leagues.filter((l) => {
              // Status filter
              if (browseFilter === "active" && !(l.status === "active" && l.startDate <= todayIso && l.endDate >= todayIso)) return false;
              if (browseFilter === "upcoming" && !(l.status !== "completed" && l.startDate > todayIso)) return false;
              if (browseFilter === "completed" && !(l.status === "completed" || l.endDate < todayIso)) return false;
              // Search
              if (q) {
                const blob = `${l.name} ${l.city || ""} ${l.region || ""} ${l.country || ""}`.toLowerCase();
                if (!blob.includes(q)) return false;
              }
              return true;
            });

            // Leagues you're already in float to the top of Browse.
            if (myLeagueIds.size > 0) {
              filtered.sort(
                (a, b) => (myLeagueIds.has(b.id) ? 1 : 0) - (myLeagueIds.has(a.id) ? 1 : 0),
              );
            }

            if (filtered.length === 0) {
              return (
                <Card padding="md">
                  <p className="text-sm text-fab-muted">
                    No leagues match {q ? <>&ldquo;{browseSearch}&rdquo;</> : "that filter"}.
                  </p>
                </Card>
              );
            }

            return (
              <ul className="space-y-2.5">
                {filtered.map((l) => {
                  const timeBadge = timeRemainingLabel(l);
                  return (
                    <li key={l.id}>
                      <Card padding="sm" className="relative">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/leagues/${l.slug}`}
                                className="text-base font-bold text-fab-text after:absolute after:inset-0 hover:text-fab-gold"
                              >
                                {l.name}
                              </Link>
                              <StatusBadge status={l.status} />
                              {timeBadge && (
                                <Badge variant={timeBadge.tone} size="xs">
                                  {timeBadge.label}
                                </Badge>
                              )}
                            </div>
                            {(l.city || l.region || l.country) && (
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-fab-muted">
                                <MapPin className="h-3 w-3" />
                                {[l.city, l.region, l.country].filter(Boolean).join(", ")}
                              </p>
                            )}
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-fab-muted">
                              <CalendarDays className="h-3 w-3" />
                              {formatDateRange(l.startDate, l.endDate)}
                            </p>
                            {l.description && (
                              <p className="mt-2 line-clamp-2 text-xs text-fab-muted">
                                {l.description}
                              </p>
                            )}
                          </div>
                          <div className="relative z-10 flex flex-col items-end gap-1.5">
                            <div className="flex gap-1.5">
                              <Badge size="xs" variant="muted">
                                <Users className="h-3 w-3" /> {l.memberCount}
                              </Badge>
                              <Badge size="xs" variant="muted">
                                <StoreIcon className="h-3 w-3" /> {l.storeSlugs.length}
                              </Badge>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={joiningId === l.id || !user || requestedIds.has(l.id)}
                              onClick={() => handleJoin(l)}
                            >
                              {requestedIds.has(l.id)
                                ? "Requested"
                                : joiningId === l.id
                                  ? "…"
                                  : leagueRequiresApproval(l)
                                    ? "Request"
                                    : "Join"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </section>
      )}

      {activeTab === "my" && (
        <section className="space-y-3">
          {(() => {
            if (myLeaguesLoading && myLeagues.length === 0) {
              return (
                <Card padding="md">
                  <p className="text-sm text-fab-muted">Loading your leagues…</p>
                </Card>
              );
            }
            const mine = [...myLeagues].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            if (mine.length === 0) {
              return (
                <Card padding="md" className="text-center">
                  <p className="text-sm text-fab-text">You haven&apos;t joined any leagues yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("browse")}
                    className="mt-2 text-sm font-semibold text-fab-gold underline"
                  >
                    Browse leagues
                  </button>
                </Card>
              );
            }
            return (
              <ul className="space-y-2.5">
                {mine.map((l) => {
                  const organizer = !!user && l.organizerUid === user.uid;
                  const timeBadge = timeRemainingLabel(l);
                  return (
                    <li key={l.id}>
                      <Card padding="sm" className="relative">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/leagues/${l.slug}`}
                                className="text-base font-bold text-fab-text after:absolute after:inset-0 hover:text-fab-gold"
                              >
                                {l.name}
                              </Link>
                              <StatusBadge status={l.status} />
                              <Badge size="xs" variant={organizer ? "gold" : "muted"}>
                                {organizer ? "Organizer" : "Player"}
                              </Badge>
                              {timeBadge && (
                                <Badge variant={timeBadge.tone} size="xs">
                                  {timeBadge.label}
                                </Badge>
                              )}
                            </div>
                            {(l.city || l.region || l.country) && (
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-fab-muted">
                                <MapPin className="h-3 w-3" />
                                {[l.city, l.region, l.country].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="relative z-10 flex items-center gap-1.5">
                            <Badge size="xs" variant="muted">
                              <Users className="h-3 w-3" /> {l.memberCount}
                            </Badge>
                            <Link
                              href={`/leagues/${l.slug}`}
                              className="rounded-md border border-fab-border bg-fab-bg px-2.5 py-1 text-xs font-bold text-fab-text hover:border-fab-gold/40 hover:text-fab-gold"
                            >
                              {organizer ? "Manage" : "Open"}
                            </Link>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </section>
      )}

      {activeTab === "create" && (
        <section className="space-y-4">
          {!user && (
            <Card padding="sm" className="border-amber-500/40 bg-amber-500/[0.08]">
              <p className="flex items-center gap-2 text-sm text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                You need to be signed in to create a league.{" "}
                <Link href="/login" className="underline">
                  Sign in
                </Link>
                .
              </p>
            </Card>
          )}

          {/* League details */}
          <Card padding="md">
            <h2 className="text-base font-bold text-fab-text">League details</h2>
            <p className="mt-0.5 text-xs text-fab-muted">
              The basics — what the league is, where, and when.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="League name" required error={errors.name}>
                <input
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  placeholder="e.g. Santiago Armory League — Autumn 2026"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  maxLength={80}
                  aria-invalid={!!errors.name}
                />
              </Field>
              <Field label="City">
                <input
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  placeholder="Santiago"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </Field>
              <Field label="Region / State">
                <input
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  placeholder="Región Metropolitana"
                  value={form.region}
                  onChange={(e) => update("region", e.target.value)}
                />
              </Field>
              <Field label="Country">
                <input
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  placeholder="Chile"
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                />
              </Field>
              <Field label="Start date" required error={errors.startDate}>
                <input
                  type="date"
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                  aria-invalid={!!errors.startDate}
                />
              </Field>
              <Field label="End date" required error={errors.endDate}>
                <input
                  type="date"
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                  aria-invalid={!!errors.endDate}
                />
              </Field>
              <Field
                label="Description"
                className="sm:col-span-2"
                error={errors.description}
                hint={`${form.description.length}/1000`}
              >
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
                  placeholder="What is this league? Any extra rules players should know?"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  maxLength={1000}
                />
              </Field>
            </div>
          </Card>

          {/* Membership */}
          <Card padding="md">
            <h2 className="text-base font-bold text-fab-text">Membership</h2>
            <p className="mt-0.5 text-xs text-fab-muted">
              Control who can join. Approval is recommended so only players you recognize
              show up in your standings.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  { value: "approval", title: "Require approval", desc: "Players request to join; you approve each one." },
                  { value: "open", title: "Open to anyone", desc: "Any signed-in player can join instantly." },
                ] as const
              ).map((opt) => {
                const active = form.joinPolicy === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("joinPolicy", opt.value)}
                    aria-pressed={active}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      active
                        ? "border-fab-gold/60 bg-fab-gold/10"
                        : "border-fab-border bg-fab-bg hover:border-fab-gold/30"
                    }`}
                  >
                    <span className={`block text-sm font-bold ${active ? "text-fab-gold" : "text-fab-text"}`}>
                      {opt.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-fab-muted">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Scoring */}
          <Card padding="md">
            <h2 className="text-base font-bold text-fab-text">Scoring</h2>
            <p className="mt-0.5 text-xs text-fab-muted">
              Default: 3/1/1 (win/loss/draw) — every game earns at least 1 point. Use the
              bye and participation knobs if you want to reward showing up extra.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Points per win">
                <input
                  type="number"
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  value={form.pointsWin}
                  onChange={(e) => update("pointsWin", Number(e.target.value))}
                />
              </Field>
              <Field label="Points per loss">
                <input
                  type="number"
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  value={form.pointsLoss}
                  onChange={(e) => update("pointsLoss", Number(e.target.value))}
                />
              </Field>
              <Field label="Points per draw">
                <input
                  type="number"
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  value={form.pointsDraw}
                  onChange={(e) => update("pointsDraw", Number(e.target.value))}
                />
              </Field>
              <Field
                label="Points per bye"
                hint="0 = byes don't count (default)."
              >
                <input
                  type="number"
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  value={form.pointsBye}
                  onChange={(e) => update("pointsBye", Number(e.target.value))}
                />
              </Field>
              <Field
                label="Participation bonus"
                hint="Added to every W/L/D match (not byes)."
              >
                <input
                  type="number"
                  className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30 aria-invalid:border-fab-red/70"
                  value={form.pointsPerMatch}
                  onChange={(e) => update("pointsPerMatch", Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">
                Eligible event types
              </p>
              <p className="text-[11px] text-fab-muted">
                Only matches in these event types count. Default: Armory only.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EVENT_TYPE_OPTIONS.map((t) => (
                  <ChipToggle
                    key={t}
                    active={form.eligibleEventTypes.includes(t)}
                    onToggle={() => toggleArrayItem("eligibleEventTypes", t)}
                  >
                    {t}
                  </ChipToggle>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">
                Eligible formats
              </p>
              <p className="text-[11px] text-fab-muted">
                Leave all unchecked to count any format. Check to restrict (e.g. CC-only).
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FORMAT_OPTIONS.map((f) => (
                  <ChipToggle
                    key={f}
                    active={form.eligibleFormats.includes(f)}
                    onToggle={() => toggleArrayItem("eligibleFormats", f)}
                  >
                    {f}
                  </ChipToggle>
                ))}
              </div>
            </div>
          </Card>

          {/* Store picker */}
          <Card padding="md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-fab-text">
                  <StoreIcon className="h-4 w-4 text-fab-gold" /> Participating stores
                </h2>
                <p className="mt-0.5 text-xs text-fab-muted">
                  Search the directory, or type a store name to add one that isn&apos;t listed
                  yet. Matches are counted by venue name.
                </p>
              </div>
              <Badge
                variant={form.selectedStoreSlugs.length > 0 ? "gold" : "muted"}
                size="sm"
              >
                {form.selectedStoreSlugs.length} selected
              </Badge>
            </div>

            {errors.stores && (
              <p className="mt-2 flex items-center gap-1 text-xs text-fab-loss">
                <AlertCircle className="h-3 w-3" /> {errors.stores}
              </p>
            )}

            {/* Selected chips — surface what's already picked */}
            {selectedStoreEntries.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedStoreEntries.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => toggleStore(s.slug)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-fab-gold/40 bg-fab-gold/15 px-2.5 py-1 text-xs font-semibold text-fab-gold hover:bg-fab-gold/25"
                    title="Click to remove"
                  >
                    {s.name}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
              <input
                className="w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2 pl-9 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold/60 focus:outline-none focus:ring-2 focus:ring-fab-gold/30"
                placeholder="Search the store directory…"
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAddTypedStore) {
                    e.preventDefault();
                    addTypedStore();
                  }
                }}
              />
            </div>

            {canAddTypedStore && (
              <div className="mt-2">
                {storeNearMatch && (
                  <button
                    type="button"
                    onClick={() => {
                      toggleStore(storeNearMatch.slug);
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
                    Add “<span className="font-semibold">{storeSearch.trim()}</span>”
                  </span>
                  <PlusCircle className="h-4 w-4 shrink-0" />
                </button>
                <p className="mt-1 text-[11px] text-fab-dim">
                  Adds as <span className="font-mono text-fab-muted">{typedStoreSlug}</span> — matches
                  count when a player&apos;s match venue reads exactly this (as it appears in GEM).
                </p>
              </div>
            )}

            <div className="mt-3">
              {directoryLoading ? (
                <p className="text-sm text-fab-muted">Loading store directory…</p>
              ) : !storeSearch.trim() ? (
                <p className="rounded-md border border-dashed border-fab-border bg-fab-bg/40 px-3 py-4 text-center text-xs text-fab-muted">
                  Type a store name above to search the directory of{" "}
                  <span className="font-semibold text-fab-text">{directory.length}</span>{" "}
                  known stores.
                </p>
              ) : filteredDirectory.length === 0 ? (
                <p className="text-sm text-fab-muted">No stores match that search.</p>
              ) : (
                <ul className="grid max-h-72 gap-1 overflow-y-auto rounded-md border border-fab-border/60 bg-fab-bg/40 p-1.5 sm:grid-cols-2">
                  {filteredDirectory.slice(0, 200).map((s) => {
                    const active = form.selectedStoreSlugs.includes(s.slug);
                    return (
                      <li key={s.slug}>
                        <label
                          className={`flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors ${
                            active
                              ? "border-fab-gold/50 bg-fab-gold/10"
                              : "border-transparent hover:border-fab-border hover:bg-fab-bg/80"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleStore(s.slug)}
                            className="mt-1 accent-fab-gold"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-fab-text">
                              {s.name}
                            </span>
                            <span className="block truncate text-[11px] text-fab-dim">
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
              {filteredDirectory.length > 200 && (
                <p className="mt-2 text-[11px] text-fab-dim">
                  Showing first 200 — refine the search to narrow down.
                </p>
              )}
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {submitAttempted && Object.keys(errors).length > 0 && (
              <p className="flex items-center gap-1 text-xs text-fab-loss">
                <AlertCircle className="h-3 w-3" /> Fix the highlighted fields above.
              </p>
            )}
            <Button
              variant="primary"
              size="md"
              disabled={creating || !user}
              onClick={handleCreateLeague}
              leftIcon={<ListChecks className="h-4 w-4" />}
            >
              {creating ? "Creating…" : "Create league"}
            </Button>
          </div>
        </section>
      )}

    </div>
  );
}

function Field({
  label,
  children,
  className = "",
  required,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-fab-dim">
        <span>
          {label}
          {required && <span className="ml-1 text-fab-gold">*</span>}
        </span>
        {hint && !error && <span className="font-normal normal-case tracking-normal text-fab-dim">{hint}</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-[11px] text-fab-loss">
          <AlertCircle className="h-3 w-3" /> {error}
        </span>
      )}
    </label>
  );
}

function ChipToggle({
  active,
  onToggle,
  children,
}: {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "border-fab-gold/50 bg-fab-gold/15 text-fab-gold"
          : "border-fab-border bg-fab-bg text-fab-muted hover:border-fab-border/80 hover:text-fab-text"
      }`}
    >
      {children}
    </button>
  );
}

function AboutPanel() {
  return (
    <section className="space-y-4 text-sm text-fab-text">
      <Card padding="md">
        <h2 className="text-base font-bold text-fab-text">What is a league?</h2>
        <p className="mt-2 leading-relaxed text-fab-muted">
          A <span className="text-fab-text">FaB Stats league</span> is a community-run
          competition that tracks wins, losses, and draws across a chosen set of stores
          during a date window. Players register, play armory events as normal at any
          participating store, and the league leaderboard updates automatically from
          their imported match history.
        </p>
        <p className="mt-2 leading-relaxed text-fab-muted">
          Leagues are independent of any single store — anyone can create one and act as
          the organizer.
        </p>
      </Card>

      <Card padding="md">
        <h2 className="text-base font-bold text-fab-text">How to run a league</h2>
        <ol className="mt-2 list-decimal space-y-2.5 pl-5 leading-relaxed text-fab-muted">
          <li>
            <span className="text-fab-text">Pick the participating stores.</span> Open the
            &quot;Create a league&quot; tab and search the{" "}
            <Link href="/stores" className="text-fab-gold underline">
              store directory
            </Link>
            . Stores show up automatically once anyone has imported a match from that
            venue.
          </li>
          <li>
            <span className="text-fab-text">Create the league.</span> Pick a name, date
            range, and the stores that count. Set scoring (default 3/1/1 for W/L/D) and
            optionally restrict to specific formats or event types.
          </li>
          <li>
            <span className="text-fab-text">Share the league link.</span> Players visit{" "}
            <code className="rounded bg-fab-bg px-1 text-fab-gold">
              /leagues/your-slug
            </code>{" "}
            and click <em>Join</em>.
          </li>
          <li>
            <span className="text-fab-text">Players upload their matches as usual.</span>{" "}
            Browser extension, paste-import, CSV, and admin auto-sync all work. Qualifying
            matches count automatically.
          </li>
          <li>
            <span className="text-fab-text">Standings update on demand.</span> Click{" "}
            <em>Refresh</em> on the league page to recompute.
          </li>
        </ol>
      </Card>

      <Card padding="md">
        <h2 className="text-base font-bold text-fab-text">Organizer powers</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed text-fab-muted">
          <li>Edit league name, dates, description, and location</li>
          <li>Add or remove participating stores at any time</li>
          <li>Change scoring rules (points, eligible event types, eligible formats)</li>
          <li>Remove disruptive members</li>
          <li>Mark the league as completed or disband it</li>
        </ul>
      </Card>

      <Card padding="md">
        <h2 className="text-base font-bold text-fab-text">Trust &amp; limits</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed text-fab-muted">
          <li>
            Match data is self-uploaded. GEM-scraped matches are the most reliable.
          </li>
          <li>
            Players need <span className="text-fab-text">public profiles</span> so the
            league can read their matches.
          </li>
          <li>Byes only count if the league sets a bye payout.</li>
          <li>
            <span className="text-fab-text">Dates are inclusive and use UTC.</span>{" "}
            A match on the start or end date both count.
          </li>
          <li>
            If GEM uses a slightly different venue name than the registered one, both
            names show up as separate stores. The league can include both.
          </li>
        </ul>
      </Card>
    </section>
  );
}
