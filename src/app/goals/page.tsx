"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useGoals } from "@/hooks/useGoals";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/contexts/AuthContext";
import { computeEventStats } from "@/lib/stats";
import { evaluateGoalProgress, getGoalDescription, getGoalTypeLabel, type Goal } from "@/lib/goals";
import { HeroSelect } from "@/components/heroes/HeroSelect";
import { GameFormat } from "@/types";
import { BarChart3, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { WinRateRing } from "@/components/charts/WinRateRing";
import { MiniDonut } from "@/components/charts/MiniDonut";
import { SegmentedBar } from "@/components/charts/SegmentedBar";

export default function GoalsPage() {
  const { user, isGuest } = useAuth();
  const { goals, loading, addGoal, removeGoal } = useGoals();
  const { matches, isLoaded } = useMatches();
  const [showForm, setShowForm] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const eventStats = useMemo(() => computeEventStats(matches), [matches]);

  const activeGoals = useMemo(() => goals.filter((g) => !g.completedAt), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.completedAt), [goals]);

  if (!user || isGuest) {
    return (
      <div className="text-center py-16">
        <p className="text-fab-muted mb-6">Sign in to set and track goals.</p>
        <Link href="/login" className="inline-block px-6 py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-inset ring-emerald-500/20">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-fab-text leading-tight">Goals</h1>
          <p className="text-xs text-fab-muted leading-tight">Track your competitive targets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold/90 transition-colors"
        >
          {showForm ? "Cancel" : "+ New Goal"}
        </button>
      </div>

      {/* Add goal form */}
      {showForm && (
        <AddGoalForm
          onAdd={async (goal) => {
            try {
              await addGoal(goal);
              setShowForm(false);
              toast.success("Goal added");
            } catch {
              toast.error("Failed to add goal.");
            }
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Completion summary */}
      {!loading && isLoaded && goals.length > 0 && (
        <div className="flex items-center gap-4 mb-6 bg-fab-surface border border-fab-border rounded-lg p-4">
          <MiniDonut
            size={80}
            strokeWidth={12}
            segments={[
              { value: completedGoals.length, color: "var(--color-fab-win)", label: "Done" },
              { value: activeGoals.length, color: "var(--color-fab-muted)", label: "Active" },
            ]}
            centerLabel={
              <span className="text-xs font-bold text-fab-text">
                {completedGoals.length}/{goals.length}
              </span>
            }
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-fab-text mb-1">
              {completedGoals.length === goals.length
                ? "All goals completed!"
                : `${completedGoals.length} of ${goals.length} goals completed`}
            </p>
            <SegmentedBar
              segments={[
                { value: completedGoals.length, color: "var(--color-fab-win)", label: `${completedGoals.length} done` },
                { value: activeGoals.length, color: "var(--color-fab-muted)", label: `${activeGoals.length} active` },
              ]}
              height="sm"
              showLabels
            />
          </div>
        </div>
      )}

      {/* Active goals */}
      {loading || !isLoaded ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-fab-surface border border-fab-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : activeGoals.length === 0 && completedGoals.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-fab-border rounded-lg">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-fab-muted" />
          <p className="text-fab-muted">No goals yet</p>
          <p className="text-fab-dim text-sm mt-1">Click &quot;+ New Goal&quot; to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-fab-text mb-3">Active ({activeGoals.length})</h2>
              <div className="space-y-2">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    matches={matches}
                    eventStats={eventStats}
                    onDelete={async () => {
                      try { await removeGoal(goal.id); } catch { toast.error("Failed to remove goal."); }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-fab-text mb-3">Completed ({completedGoals.length})</h2>
              <div className="space-y-2">
                {(showAllCompleted ? completedGoals : completedGoals.slice(0, 5)).map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    matches={matches}
                    eventStats={eventStats}
                    onDelete={async () => {
                      try { await removeGoal(goal.id); } catch { toast.error("Failed to remove goal."); }
                    }}
                  />
                ))}
              </div>
              {completedGoals.length > 5 && !showAllCompleted && (
                <button
                  onClick={() => setShowAllCompleted(true)}
                  className="w-full mt-2 py-2 text-xs text-fab-dim hover:text-fab-text transition-colors"
                >
                  Show {completedGoals.length - 5} more
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  matches,
  eventStats,
  onDelete,
}: {
  goal: Goal;
  matches: import("@/types").MatchRecord[];
  eventStats: import("@/types").EventStats[];
  onDelete: () => void;
}) {
  const progress = useMemo(
    () => evaluateGoalProgress(goal, matches, eventStats),
    [goal, matches, eventStats],
  );

  const barColor = progress.completed
    ? "bg-fab-win"
    : progress.percent >= 50
      ? "bg-fab-gold"
      : "bg-fab-muted";

  return (
    <div className={`bg-fab-surface border rounded-lg p-4 ${progress.completed ? "border-fab-win/30" : "border-fab-border"}`}>
      <div className="flex items-start gap-3">
        <WinRateRing
          value={Math.min(progress.percent, 100)}
          size={36}
          strokeWidth={3}
          color={progress.completed ? "var(--color-fab-win)" : progress.percent >= 50 ? "var(--color-fab-gold)" : undefined}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {progress.completed && (
              <CheckCircle className="w-4 h-4 text-fab-win shrink-0" />
            )}
            <p className="text-sm font-medium text-fab-text truncate">
              {goal.title || getGoalDescription(goal)}
            </p>
          </div>
          <p className="text-[10px] text-fab-dim mb-2">
            {getGoalTypeLabel(goal.type)}
            {goal.hero && ` · ${goal.hero}`}
            {goal.format && ` · ${goal.format}`}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SegmentedBar
                segments={[
                  { value: Math.min(progress.current, progress.target), color: progress.completed ? "var(--color-fab-win)" : progress.percent >= 50 ? "var(--color-fab-gold)" : "var(--color-fab-muted)" },
                  { value: Math.max(progress.target - progress.current, 0), color: "var(--color-fab-bg)" },
                ]}
                height="sm"
              />
            </div>
            <span className="text-xs text-fab-dim shrink-0">
              {goal.type === "win_rate"
                ? `${progress.current.toFixed(1)}%`
                : progress.current}
              {" / "}
              {goal.type === "win_rate" ? `${progress.target}%` : progress.target}
            </span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-fab-dim hover:text-fab-loss transition-colors p-1 shrink-0"
          title="Delete goal"
          aria-label="Delete goal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AddGoalForm({ onAdd, onCancel }: { onAdd: (goal: Goal) => Promise<void>; onCancel: () => void }) {
  const [type, setType] = useState<Goal["type"]>("win_rate");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [hero, setHero] = useState("");
  const [format, setFormat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const t = Number(target);
    if (!t || isNaN(t) || t <= 0) return;
    setSaving(true);
    setError("");
    try {
      await onAdd({
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        title: title.trim(),
        target: t,
        hero: hero || undefined,
        format: format || undefined,
        createdAt: new Date().toISOString(),
      });
    } catch {
      setError("Failed to save goal. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4 mb-6">
      <h3 className="text-sm font-bold text-fab-text mb-3">New Goal</h3>
      <div className="space-y-3">
        {/* Type */}
        <div className="flex flex-wrap gap-1">
          {(["win_rate", "match_count", "streak", "event_finish"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                type === t ? "bg-fab-gold text-fab-bg" : "bg-fab-bg text-fab-muted hover:text-fab-text border border-fab-border"
              }`}
            >
              {getGoalTypeLabel(t)}
            </button>
          ))}
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title (optional)"
          className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-1.5 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold"
        />

        {/* Target */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-fab-dim w-16">Target</label>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={type === "win_rate" ? "e.g. 60" : type === "match_count" ? "e.g. 100" : "e.g. 5"}
            className="flex-1 bg-fab-bg border border-fab-border rounded-md px-3 py-1.5 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold"
          />
          {type === "win_rate" && <span className="text-xs text-fab-dim">%</span>}
        </div>

        {/* Optional filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="max-w-[180px]">
            <HeroSelect value={hero} onChange={setHero} label="Hero (optional)" />
          </div>
          <div>
            <label className="text-[10px] text-fab-dim block mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="bg-fab-bg border border-fab-border rounded-md px-2 py-1.5 text-sm text-fab-text focus:outline-none focus:border-fab-gold"
            >
              <option value="">Any</option>
              {Object.values(GameFormat).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        {error && (
          <p className="text-xs text-fab-loss">{error}</p>
        )}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={!target || Number(target) <= 0 || saving}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Add Goal"}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-fab-muted hover:text-fab-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
