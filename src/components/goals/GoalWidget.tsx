"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useGoals } from "@/hooks/useGoals";
import { evaluateGoalProgress, getGoalDescription, type Goal } from "@/lib/goals";
import type { MatchRecord, EventStats } from "@/types";

interface GoalWidgetProps {
  matches: MatchRecord[];
  eventStats: EventStats[];
}

export function GoalWidget({ matches, eventStats }: GoalWidgetProps) {
  const { goals, loading } = useGoals();

  const activeGoals = useMemo(
    () => goals.filter((g) => !g.completedAt).slice(0, 3),
    [goals],
  );

  if (loading || activeGoals.length === 0) return null;

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-fab-text">Goals</h3>
        <Link href="/goals" className="text-[10px] text-fab-dim hover:text-fab-text transition-colors">
          View all
        </Link>
      </div>
      <div className="space-y-2.5">
        {activeGoals.map((goal) => (
          <GoalProgressRow key={goal.id} goal={goal} matches={matches} eventStats={eventStats} />
        ))}
      </div>
    </div>
  );
}

function GoalProgressRow({ goal, matches, eventStats }: { goal: Goal; matches: MatchRecord[]; eventStats: EventStats[] }) {
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
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-fab-text font-medium truncate flex-1">{goal.title || getGoalDescription(goal)}</p>
        <span className="text-[10px] text-fab-dim ml-2 shrink-0">
          {goal.type === "win_rate"
            ? `${progress.current.toFixed(1)}% / ${progress.target}%`
            : `${progress.current} / ${progress.target}`}
        </span>
      </div>
      <div className="h-1.5 bg-fab-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(progress.percent, 1)}%` }}
        />
      </div>
    </div>
  );
}
