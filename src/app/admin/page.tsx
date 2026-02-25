"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminDashboardData, backfillLeaderboard, type AdminDashboardData, type AdminUserStats } from "@/lib/admin";
import { getAllFeedback, updateFeedbackStatus } from "@/lib/feedback";
import { getCreators, saveCreators } from "@/lib/creators";
import type { FeedbackItem, Creator } from "@/types";

type SortKey = "matchCount" | "createdAt" | "username";
type SortDir = "asc" | "desc";

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("matchCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "new" | "reviewed" | "done">("all");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState("");
  const [creatorsList, setCreatorsList] = useState<Creator[]>([]);
  const [savingCreators, setSavingCreators] = useState(false);
  const [creatorsSaved, setCreatorsSaved] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/");
    }
  }, [loading, user, isAdmin, router]);

  const fetchData = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const [result, fb, cr] = await Promise.all([getAdminDashboardData(), getAllFeedback(), getCreators()]);
      setData(result);
      setFeedback(fb);
      setCreatorsList(cr);
    } catch {
      setError("Failed to load admin data.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-fab-muted animate-pulse">Loading...</div>
      </div>
    );
  }

  function sortedUsers(users: AdminUserStats[]): AdminUserStats[] {
    return [...users].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "matchCount") cmp = a.matchCount - b.matchCount;
      else if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else cmp = a.username.localeCompare(b.username);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortArrow({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return <span className="ml-1">{sortDir === "desc" ? "\u25BC" : "\u25B2"}</span>;
  }

  function daysAgo(dateStr: string) {
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (d === 0) return "today";
    if (d === 1) return "1 day ago";
    return `${d} days ago`;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-fab-gold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          {backfillProgress && (
            <span className="text-xs text-fab-dim">{backfillProgress}</span>
          )}
          <button
            onClick={async () => {
              setBackfilling(true);
              setBackfillProgress("Starting...");
              try {
                const { updated, failed } = await backfillLeaderboard((done, total) => {
                  setBackfillProgress(`${done}/${total} users`);
                });
                setBackfillProgress(`Done: ${updated} updated, ${failed} failed`);
              } catch {
                setBackfillProgress("Backfill failed");
              } finally {
                setBackfilling(false);
              }
            }}
            disabled={backfilling}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
          >
            {backfilling ? "Backfilling..." : "Backfill Leaderboard"}
          </button>
          <button
            onClick={fetchData}
            disabled={fetching}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-fab-surface border border-fab-border text-fab-text hover:border-fab-gold transition-colors disabled:opacity-50"
          >
            {fetching ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-fab-loss/10 border border-fab-loss/30 rounded-lg p-3 mb-4 text-fab-loss text-sm">
          {error}
        </div>
      )}

      {fetching && !data ? (
        <div className="text-center py-16 text-fab-muted animate-pulse">
          Aggregating stats...
        </div>
      ) : data ? (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <MetricCard label="Total Users" value={data.totalUsers} />
            <MetricCard label="Total Matches" value={data.totalMatches} />
            <MetricCard label="New (7d)" value={data.newUsersThisWeek} />
            <MetricCard label="New (30d)" value={data.newUsersThisMonth} />
            <MetricCard label="New Feedback" value={feedback.filter((f) => f.status === "new").length} />
          </div>

          {/* Users table */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-fab-border">
              <h2 className="text-sm font-semibold text-fab-text">All Users ({data.users.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fab-border text-fab-muted text-left">
                    <th className="px-4 py-2 font-medium">#</th>
                    <th
                      className="px-4 py-2 font-medium cursor-pointer hover:text-fab-text select-none"
                      onClick={() => toggleSort("username")}
                    >
                      User<SortArrow col="username" />
                    </th>
                    <th
                      className="px-4 py-2 font-medium cursor-pointer hover:text-fab-text select-none text-right"
                      onClick={() => toggleSort("matchCount")}
                    >
                      Matches<SortArrow col="matchCount" />
                    </th>
                    <th
                      className="px-4 py-2 font-medium cursor-pointer hover:text-fab-text select-none"
                      onClick={() => toggleSort("createdAt")}
                    >
                      Joined<SortArrow col="createdAt" />
                    </th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers(data.users).map((u, i) => {
                    const isExpanded = expandedUid === u.uid;
                    return (
                      <React.Fragment key={u.uid}>
                        <tr
                          className="border-b border-fab-border/50 hover:bg-fab-surface-hover transition-colors cursor-pointer"
                          onClick={() => setExpandedUid(isExpanded ? null : u.uid)}
                        >
                          <td className="px-4 py-2 text-fab-dim">{i + 1}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {u.photoUrl ? (
                                <img src={u.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-fab-bg border border-fab-border flex items-center justify-center text-fab-gold text-[10px] font-bold">
                                  {u.displayName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="text-fab-text">@{u.username}</span>
                                <div className="text-xs text-fab-dim">{u.displayName}</div>
                              </div>
                              <span className="text-fab-dim text-xs ml-auto">{isExpanded ? "\u25B2" : "\u25BC"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-fab-text">{u.matchCount}</td>
                          <td className="px-4 py-2">
                            <div className="text-fab-text">{new Date(u.createdAt).toLocaleDateString()}</div>
                            <div className="text-xs text-fab-dim">{daysAgo(u.createdAt)}</div>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              u.isPublic
                                ? "bg-fab-win/10 text-fab-win"
                                : "bg-fab-dim/10 text-fab-dim"
                            }`}>
                              {u.isPublic ? "Public" : "Private"}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-fab-border/50 bg-fab-bg/50">
                            <td colSpan={5} className="px-4 py-3">
                              <UserExpandedStats user={u} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mt-6">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">Feedback ({feedback.length})</h2>
              <div className="flex gap-1">
                {(["all", "new", "reviewed", "done"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFeedbackFilter(f)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      feedbackFilter === f
                        ? "bg-fab-gold/20 text-fab-gold"
                        : "text-fab-muted hover:text-fab-text"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f !== "all" && ` (${feedback.filter((fb) => fb.status === f).length})`}
                  </button>
                ))}
              </div>
            </div>
            {feedback.filter((f) => feedbackFilter === "all" || f.status === feedbackFilter).length === 0 ? (
              <div className="px-4 py-8 text-center text-fab-dim text-sm">No feedback yet.</div>
            ) : (
              <div className="divide-y divide-fab-border/50">
                {feedback
                  .filter((f) => feedbackFilter === "all" || f.status === feedbackFilter)
                  .map((f) => (
                    <div key={f.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              f.type === "bug"
                                ? "bg-fab-loss/15 text-fab-loss"
                                : "bg-fab-gold/15 text-fab-gold"
                            }`}>
                              {f.type}
                            </span>
                            <Link
                              href={`/player/${f.username}`}
                              className="text-xs text-fab-muted hover:text-fab-gold transition-colors"
                            >
                              @{f.username}
                            </Link>
                            <span className="text-xs text-fab-dim">
                              {new Date(f.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-fab-text whitespace-pre-wrap break-words">{f.message}</p>
                        </div>
                        <select
                          value={f.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value as "new" | "reviewed" | "done";
                            try {
                              await updateFeedbackStatus(f.id, newStatus);
                              setFeedback((prev) =>
                                prev.map((item) =>
                                  item.id === f.id ? { ...item, status: newStatus } : item
                                )
                              );
                            } catch {
                              setError("Failed to update feedback status.");
                            }
                          }}
                          className={`text-xs rounded px-2 py-1 border bg-fab-bg border-fab-border cursor-pointer shrink-0 ${
                            f.status === "new"
                              ? "text-fab-gold"
                              : f.status === "reviewed"
                              ? "text-blue-400"
                              : "text-fab-win"
                          }`}
                        >
                          <option value="new">New</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Creators Management */}
          <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden mt-6">
            <div className="px-4 py-3 border-b border-fab-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fab-text">Featured Creators ({creatorsList.length})</h2>
              <div className="flex items-center gap-2">
                {creatorsSaved && <span className="text-xs text-fab-win">Saved!</span>}
                <button
                  onClick={async () => {
                    setSavingCreators(true);
                    setCreatorsSaved(false);
                    try {
                      await saveCreators(creatorsList);
                      setCreatorsSaved(true);
                      setTimeout(() => setCreatorsSaved(false), 2000);
                    } catch {
                      setError("Failed to save creators.");
                    } finally {
                      setSavingCreators(false);
                    }
                  }}
                  disabled={savingCreators}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
                >
                  {savingCreators ? "Saving..." : "Save Creators"}
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {creatorsList.map((c, i) => (
                <div key={i} className="bg-fab-bg border border-fab-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-fab-dim font-medium">Creator {i + 1}</span>
                    <button
                      onClick={() => setCreatorsList((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-fab-loss hover:text-fab-loss/80 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={c.name}
                      onChange={(e) => setCreatorsList((prev) => prev.map((cr, j) => j === i ? { ...cr, name: e.target.value } : cr))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={c.description}
                      onChange={(e) => setCreatorsList((prev) => prev.map((cr, j) => j === i ? { ...cr, description: e.target.value } : cr))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold"
                    />
                    <input
                      type="text"
                      placeholder="URL"
                      value={c.url}
                      onChange={(e) => setCreatorsList((prev) => prev.map((cr, j) => j === i ? { ...cr, url: e.target.value } : cr))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold col-span-1"
                    />
                    <select
                      value={c.platform}
                      onChange={(e) => setCreatorsList((prev) => prev.map((cr, j) => j === i ? { ...cr, platform: e.target.value as Creator["platform"] } : cr))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold cursor-pointer"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="twitch">Twitch</option>
                      <option value="twitter">Twitter/X</option>
                      <option value="website">Website</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Image URL (optional)"
                      value={c.imageUrl || ""}
                      onChange={(e) => setCreatorsList((prev) => prev.map((cr, j) => j === i ? { ...cr, imageUrl: e.target.value || undefined } : cr))}
                      className="bg-fab-surface border border-fab-border text-fab-text text-sm rounded px-2 py-1.5 focus:outline-none focus:border-fab-gold col-span-2"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setCreatorsList((prev) => [...prev, { name: "", description: "", url: "", platform: "youtube" }])}
                className="w-full py-2 rounded-lg text-sm font-medium border border-dashed border-fab-border text-fab-muted hover:text-fab-text hover:border-fab-gold/30 transition-colors"
              >
                + Add Creator
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function UserExpandedStats({ user: u }: { user: AdminUserStats }) {
  const hasStats = u.winRate !== undefined;

  return (
    <div className="space-y-3">
      {hasStats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-fab-muted">Win Rate</div>
              <div className={`text-lg font-bold ${(u.winRate ?? 0) >= 50 ? "text-fab-win" : "text-fab-loss"}`}>
                {u.winRate?.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Record</div>
              <div className="text-lg font-bold text-fab-text">
                {u.totalWins}W - {u.totalLosses}L{(u.totalDraws ?? 0) > 0 ? ` - ${u.totalDraws}D` : ""}
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Current Streak</div>
              <div className={`text-lg font-bold ${
                u.currentStreakType === "win" ? "text-fab-win" : u.currentStreakType === "loss" ? "text-fab-loss" : "text-fab-dim"
              }`}>
                {u.currentStreakCount ?? 0} {u.currentStreakType === "win" ? "W" : u.currentStreakType === "loss" ? "L" : "--"}
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Best Win Streak</div>
              <div className="text-lg font-bold text-fab-win">{u.longestWinStreak ?? 0}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-fab-muted">Top Hero</div>
              <div className="text-sm font-semibold text-fab-text">
                {u.topHero ?? "--"}{u.topHeroMatches ? ` (${u.topHeroMatches})` : ""}
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Events</div>
              <div className="text-sm font-semibold text-fab-text">
                {u.eventsPlayed ?? 0} played, {u.eventWins ?? 0} won
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Rated</div>
              <div className="text-sm font-semibold text-fab-text">
                {u.ratedMatches ?? 0} matches{u.ratedMatches ? `, ${u.ratedWinRate?.toFixed(1)}% WR` : ""}
              </div>
            </div>
            <div>
              <div className="text-xs text-fab-muted">Last Updated</div>
              <div className="text-sm text-fab-dim">
                {u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : "--"}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-fab-dim">No leaderboard data yet. Stats sync when user visits their dashboard.</div>
      )}
      <div className="pt-1">
        <Link
          href={`/player/${u.username}`}
          className="text-xs text-fab-gold hover:text-fab-gold-light"
          onClick={(e) => e.stopPropagation()}
        >
          View Profile →
        </Link>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
      <div className="text-2xl font-bold text-fab-text">{value.toLocaleString()}</div>
      <div className="text-xs text-fab-muted mt-1">{label}</div>
    </div>
  );
}
