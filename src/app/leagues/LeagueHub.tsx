"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getAllLeagues, createLeague, joinLeague } from "@/lib/leagues";
import { getStoreDirectory, type StoreDirectoryEntry } from "@/lib/store-directory";
import type { League, LeagueScoringRules } from "@/types";
import { toast } from "sonner";
import { CalendarDays, Info, MapPin, PlusCircle, Search, Store as StoreIcon, Trophy, Users } from "lucide-react";

type Tab = "browse" | "about" | "create";

const FORMAT_OPTIONS = [
  "Classic Constructed",
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

function StatusPill({ status }: { status: League["status"] }) {
  const map: Record<League["status"], { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-fab-bg/70 text-fab-dim border-fab-border/60" },
    active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
    completed: { label: "Completed", cls: "bg-sky-500/15 text-sky-300 border-sky-500/40" },
  };
  const { label, cls } = map[status] || map.active;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
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

export default function LeagueHub() {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);

  // Create state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pointsWin, setPointsWin] = useState(3);
  const [pointsLoss, setPointsLoss] = useState(0);
  const [pointsDraw, setPointsDraw] = useState(1);
  const [eligibleEventTypes, setEligibleEventTypes] = useState<string[]>(["Armory"]);
  const [eligibleFormats, setEligibleFormats] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Store directory + selection
  const [directory, setDirectory] = useState<StoreDirectoryEntry[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [selectedStoreSlugs, setSelectedStoreSlugs] = useState<string[]>([]);
  const [storeSearch, setStoreSearch] = useState("");

  const [joiningId, setJoiningId] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeTab !== "create") return;
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
  }, [activeTab]);

  const filteredDirectory = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter((d) => d.name.toLowerCase().includes(q));
  }, [directory, storeSearch]);

  function toggleStore(slug: string) {
    setSelectedStoreSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function toggleArrayItem(arr: string[], item: string, setter: (v: string[]) => void) {
    setter(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  }

  async function handleCreateLeague() {
    if (!user || !profile) {
      toast.error("Sign in to create a league.");
      return;
    }
    if (selectedStoreSlugs.length === 0) {
      toast.error("Pick at least one store from the directory.");
      return;
    }
    setCreating(true);
    try {
      const scoringRules: LeagueScoringRules = {
        pointsPerWin: pointsWin,
        pointsPerLoss: pointsLoss,
        pointsPerDraw: pointsDraw,
        eligibleEventTypes: eligibleEventTypes.length > 0 ? eligibleEventTypes : undefined,
        eligibleFormats: eligibleFormats.length > 0 ? eligibleFormats : undefined,
      };
      await createLeague(profile, {
        name: name.trim(),
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        region: region.trim() || undefined,
        country: country.trim() || undefined,
        startDate,
        endDate,
        storeSlugs: selectedStoreSlugs,
        scoringRules,
      });
      toast.success("League created!");
      setName("");
      setDescription("");
      setCity("");
      setRegion("");
      setCountry("");
      setStartDate("");
      setEndDate("");
      setSelectedStoreSlugs([]);
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
      await joinLeague(league.id, profile);
      toast.success(`Joined ${league.name}.`);
      const refreshed = await getAllLeagues();
      setLeagues(refreshed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join.");
    }
    setJoiningId(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-fab-gold sm:text-4xl">
          <Trophy className="mr-2 inline h-7 w-7 align-[-3px]" /> Leagues
        </h1>
        <p className="mt-2 text-sm text-fab-dim sm:text-base">
          Community-run competitions across a set of stores. Players join, play armory events as
          normal, and league standings update from their imported match history.
        </p>
        <p className="mt-1 text-xs text-fab-dim">
          <Info className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
          Looking for the store directory?{" "}
          <Link href="/stores" className="text-fab-gold underline-offset-2 hover:underline">
            Browse all stores →
          </Link>
        </p>
      </header>

      <nav className="mb-6 flex gap-2 border-b border-fab-border/60">
        {(["about", "browse", "create"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeTab === t
                ? "border-b-2 border-fab-gold text-fab-gold"
                : "text-fab-dim hover:text-fab-text"
            }`}
          >
            {t === "about" ? "How leagues work" : t === "browse" ? "Browse" : "Create a league"}
          </button>
        ))}
      </nav>

      {activeTab === "about" && <AboutPanel />}

      {activeTab === "browse" && (
        <section>
          {loading ? (
            <p className="text-fab-dim">Loading leagues…</p>
          ) : leagues.length === 0 ? (
            <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-6 text-center">
              <p className="text-fab-text">No leagues yet — be the first to start one.</p>
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className="mt-4 inline-flex items-center gap-1 rounded-md bg-fab-gold px-3 py-1.5 text-sm font-bold text-black hover:bg-fab-gold/80"
              >
                <PlusCircle className="h-4 w-4" /> Create a league
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {leagues.map((l) => (
                <li
                  key={l.id}
                  className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4 shadow-inner shadow-black/10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/leagues/${l.slug}`}
                          className="text-lg font-bold text-fab-gold hover:underline"
                        >
                          {l.name}
                        </Link>
                        <StatusPill status={l.status} />
                      </div>
                      {(l.city || l.region || l.country) && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-fab-dim">
                          <MapPin className="h-3 w-3" />
                          {[l.city, l.region, l.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-fab-dim">
                        <CalendarDays className="h-3 w-3" />
                        {formatDateRange(l.startDate, l.endDate)}
                      </p>
                      {l.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-fab-text">{l.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-fab-border/60 bg-fab-bg/60 px-2 py-1 text-[11px] font-bold text-fab-text">
                        <Users className="h-3 w-3" /> {l.memberCount}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-fab-border/60 bg-fab-bg/60 px-2 py-1 text-[11px] font-bold text-fab-text">
                        <StoreIcon className="h-3 w-3" /> {l.storeSlugs.length}
                      </span>
                      <button
                        type="button"
                        disabled={joiningId === l.id || !user}
                        onClick={() => handleJoin(l)}
                        className="rounded-md bg-fab-gold px-3 py-1 text-xs font-bold text-black hover:bg-fab-gold/80 disabled:opacity-50"
                      >
                        {joiningId === l.id ? "Joining…" : "Join"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === "create" && (
        <section className="space-y-6">
          {!user && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              You need to be signed in to create a league.{" "}
              <Link href="/login" className="underline">
                Sign in
              </Link>
              .
            </div>
          )}

          <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4">
            <h2 className="text-lg font-bold text-fab-gold">League details</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="League name *">
                <input
                  className="input-base"
                  placeholder="e.g. Santiago Armory League — Autumn 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </Field>
              <Field label="City">
                <input
                  className="input-base"
                  placeholder="e.g. Santiago"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Field>
              <Field label="Region / State">
                <input
                  className="input-base"
                  placeholder="e.g. Región Metropolitana"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </Field>
              <Field label="Country">
                <input
                  className="input-base"
                  placeholder="e.g. Chile"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </Field>
              <Field label="Start date *">
                <input
                  type="date"
                  className="input-base"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label="End date *">
                <input
                  type="date"
                  className="input-base"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea
                  className="input-base min-h-[80px]"
                  placeholder="What is this league? Any extra rules players should know?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4">
            <h2 className="text-lg font-bold text-fab-gold">Scoring</h2>
            <p className="mt-1 text-xs text-fab-dim">
              Points are awarded per match. Defaults: 3/0/1 (win/loss/draw) — standard armory scoring.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Points per win">
                <input
                  type="number"
                  className="input-base"
                  value={pointsWin}
                  onChange={(e) => setPointsWin(Number(e.target.value))}
                />
              </Field>
              <Field label="Points per loss">
                <input
                  type="number"
                  className="input-base"
                  value={pointsLoss}
                  onChange={(e) => setPointsLoss(Number(e.target.value))}
                />
              </Field>
              <Field label="Points per draw">
                <input
                  type="number"
                  className="input-base"
                  value={pointsDraw}
                  onChange={(e) => setPointsDraw(Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-fab-dim">
                Eligible event types
              </p>
              <p className="text-[11px] text-fab-dim">
                Only matches in these event types count. Default: Armory only.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EVENT_TYPE_OPTIONS.map((t) => (
                  <ChipToggle
                    key={t}
                    active={eligibleEventTypes.includes(t)}
                    onToggle={() => toggleArrayItem(eligibleEventTypes, t, setEligibleEventTypes)}
                  >
                    {t}
                  </ChipToggle>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-fab-dim">
                Eligible formats
              </p>
              <p className="text-[11px] text-fab-dim">
                Leave all unchecked to count any format. Check specific ones to restrict (e.g. CC-only).
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FORMAT_OPTIONS.map((f) => (
                  <ChipToggle
                    key={f}
                    active={eligibleFormats.includes(f)}
                    onToggle={() => toggleArrayItem(eligibleFormats, f, setEligibleFormats)}
                  >
                    {f}
                  </ChipToggle>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-fab-gold">
              <StoreIcon className="h-5 w-5" /> Pick participating stores
            </h2>
            <p className="mt-1 text-xs text-fab-dim">
              Search the store directory and check the stores that count for this league. Stores
              appear here automatically once any player has imported a match from that venue.
              <br />
              If a store you need isn&apos;t showing, ask one of its players to import a match
              from there first.
            </p>

            <div className="mt-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-fab-dim" />
                <input
                  className="input-base pl-8"
                  placeholder="Search stores by name…"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-fab-dim">
                <span>
                  {directoryLoading
                    ? "Loading…"
                    : `${filteredDirectory.length} of ${directory.length} stores`}
                </span>
                {selectedStoreSlugs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStoreSlugs([])}
                    className="text-fab-dim underline hover:text-fab-text"
                  >
                    Clear selection ({selectedStoreSlugs.length})
                  </button>
                )}
              </div>
              {directoryLoading ? (
                <p className="mt-2 text-sm text-fab-dim">Loading store directory…</p>
              ) : filteredDirectory.length === 0 ? (
                <p className="mt-2 text-sm text-fab-dim">
                  No stores match. The directory is built from imported matches — once someone
                  imports a match with this venue, it&apos;ll appear.
                </p>
              ) : (
                <ul className="mt-2 grid max-h-80 gap-1 overflow-y-auto sm:grid-cols-2">
                  {filteredDirectory.slice(0, 200).map((s) => (
                    <li key={s.slug}>
                      <label
                        className={`flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors ${
                          selectedStoreSlugs.includes(s.slug)
                            ? "border-fab-gold bg-fab-gold/10"
                            : "border-fab-border/60 bg-fab-bg/60 hover:border-fab-border"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStoreSlugs.includes(s.slug)}
                          onChange={() => toggleStore(s.slug)}
                          className="mt-1"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-bold text-fab-text">{s.name}</span>
                          <span className="block truncate text-[11px] text-fab-dim">
                            {s.totalMatches} matches · {s.uniquePlayers} player
                            {s.uniquePlayers === 1 ? "" : "s"}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {filteredDirectory.length > 200 && (
                <p className="mt-2 text-[11px] text-fab-dim">
                  Showing first 200 — refine the search to narrow down.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={
                creating ||
                !user ||
                !name.trim() ||
                !startDate ||
                !endDate ||
                selectedStoreSlugs.length === 0
              }
              onClick={handleCreateLeague}
              className="rounded-md bg-fab-gold px-4 py-2 text-sm font-bold text-black hover:bg-fab-gold/80 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create league"}
            </button>
          </div>
        </section>
      )}

      <style jsx>{`
        :global(.input-base) {
          width: 100%;
          border-radius: 6px;
          border: 1px solid rgb(var(--fab-border) / 0.7);
          background: rgb(var(--fab-bg) / 0.6);
          color: rgb(var(--fab-text));
          padding: 6px 10px;
          font-size: 14px;
        }
        :global(.input-base:focus) {
          outline: 2px solid rgb(var(--fab-gold) / 0.6);
          outline-offset: -1px;
        }
      `}</style>
    </div>
  );
}

function Field({
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
      className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
        active
          ? "border-fab-gold bg-fab-gold/15 text-fab-gold"
          : "border-fab-border/60 bg-fab-bg/60 text-fab-dim hover:text-fab-text"
      }`}
    >
      {children}
    </button>
  );
}

function AboutPanel() {
  return (
    <section className="space-y-5 text-sm text-fab-text">
      <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-5">
        <h2 className="text-lg font-bold text-fab-gold">What is a league?</h2>
        <p className="mt-2 leading-relaxed">
          A <strong>FaB Stats league</strong> is a community-run competition that tracks
          wins, losses, and draws across a chosen set of stores during a date window. Players
          register, play armory events as normal at any participating store, and the league
          leaderboard updates automatically from their imported match history.
        </p>
        <p className="mt-2 leading-relaxed">
          Leagues are <strong>independent of any single store</strong> — anyone can create one
          and act as the organizer.
        </p>
      </div>

      <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-5">
        <h2 className="text-lg font-bold text-fab-gold">How to run a league</h2>
        <ol className="mt-2 list-decimal space-y-3 pl-5 leading-relaxed">
          <li>
            <strong>Pick the participating stores.</strong> Open the &quot;Create a league&quot;
            tab and search the{" "}
            <Link href="/stores" className="text-fab-gold underline">
              store directory
            </Link>
            . Stores show up here automatically once anyone has imported a match from that
            venue. If a needed store is missing, ask a player to import any match from there.
          </li>
          <li>
            <strong>Create the league.</strong> Pick a name, date range (e.g. Mar 1 → Jun 30),
            and check the stores that count. Set scoring (default 3/0/1 for win/loss/draw) and
            optionally restrict to specific formats (CC-only, mixed, etc.) or event types
            (Armory by default).
          </li>
          <li>
            <strong>Share the league link.</strong> Players visit{" "}
            <code className="rounded bg-fab-bg/60 px-1 text-fab-gold">/leagues/your-slug</code>{" "}
            and click <em>Join</em>. They need a FaB Stats account.
          </li>
          <li>
            <strong>Players upload their matches as usual.</strong> The browser extension,
            paste-import, CSV upload, and admin auto-sync all work. Any qualifying match (at
            a registered store, in the date window, matching the format/event-type filters)
            counts automatically.
          </li>
          <li>
            <strong>Standings update on demand.</strong> The league page shows the current
            leaderboard; the organizer (or any member) can click &quot;Refresh standings&quot;
            to recompute from the latest matches.
          </li>
        </ol>
      </div>

      <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-5">
        <h2 className="text-lg font-bold text-fab-gold">Organizer powers</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
          <li>Edit league name, dates, description, and location</li>
          <li>Add or remove participating stores at any time</li>
          <li>Change scoring rules (points, eligible event types, eligible formats)</li>
          <li>Remove disruptive members</li>
          <li>Mark the league as completed or disband it</li>
        </ul>
      </div>

      <div className="rounded-lg border border-fab-border/70 bg-fab-bg/45 p-5">
        <h2 className="text-lg font-bold text-fab-gold">Trust &amp; limits</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
          <li>
            Match data is self-uploaded. GEM-scraped matches are the most reliable; paste/CSV
            entries are also accepted but trust them at your discretion.
          </li>
          <li>
            Players need <strong>public profiles</strong> on FaB Stats for the league to read
            their matches.
          </li>
          <li>Byes never count for points.</li>
          <li>
            Store matching is by name. If GEM uses a slightly different venue name than what
            appears in the directory, both names show up as separate stores. The league can
            include both.
          </li>
        </ul>
      </div>

      <p className="text-center text-xs text-fab-dim">
        Default scoring: <code>3</code> win / <code>0</code> loss / <code>1</code> draw — same
        as standard armory scoring. Tweak per-league as needed.
      </p>
    </section>
  );
}
