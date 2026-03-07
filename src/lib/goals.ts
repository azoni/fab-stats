import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { MatchRecord, EventStats } from "@/types";
import { MatchResult } from "@/types";

export interface Goal {
  id: string;
  type: "win_rate" | "match_count" | "event_finish" | "streak";
  title: string;
  target: number;
  format?: string;
  hero?: string;
  eventType?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GoalProgress {
  current: number;
  target: number;
  percent: number;
  completed: boolean;
}

function goalsCollection(userId: string) {
  return collection(db, "users", userId, "goals");
}

export async function getGoals(userId: string): Promise<Goal[]> {
  const snap = await getDocs(goalsCollection(userId));
  return snap.docs.map((d) => d.data() as Goal).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveGoal(userId: string, goal: Goal): Promise<void> {
  await setDoc(doc(db, "users", userId, "goals", goal.id), goal);
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "goals", goalId));
}

export function evaluateGoalProgress(
  goal: Goal,
  matches: MatchRecord[],
  eventStats: EventStats[],
): GoalProgress {
  let filtered = matches.filter((m) => m.result !== MatchResult.Bye);
  if (goal.format) filtered = filtered.filter((m) => m.format === goal.format);
  if (goal.hero) filtered = filtered.filter((m) => m.heroPlayed === goal.hero);

  let current = 0;

  switch (goal.type) {
    case "win_rate": {
      const wins = filtered.filter((m) => m.result === MatchResult.Win).length;
      current = filtered.length > 0 ? (wins / filtered.length) * 100 : 0;
      break;
    }
    case "match_count": {
      current = filtered.length;
      break;
    }
    case "event_finish": {
      // target: 1 = champion, 2 = finalist, 4 = top4, 8 = top8
      let es = eventStats;
      if (goal.eventType) es = es.filter((e) => e.eventType === goal.eventType);
      // Count events where placement is <= target
      current = es.filter((e) => {
        const placement = getPlacement(e);
        return placement > 0 && placement <= goal.target;
      }).length;
      break;
    }
    case "streak": {
      // Current win streak
      const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      let streak = 0;
      for (const m of sorted) {
        if (m.result === MatchResult.Win) streak++;
        else break;
      }
      current = streak;
      break;
    }
  }

  const percent = goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0;
  const completed = current >= goal.target;

  return { current, target: goal.target, percent, completed };
}

function getPlacement(event: EventStats): number {
  // Simple heuristic: look at match count and win rate to estimate placement
  // Events with all wins and >=3 matches = champion territory
  if (event.totalMatches >= 3 && event.winRate === 100) return 1;
  if (event.totalMatches >= 3 && event.winRate >= 75) return 4;
  if (event.totalMatches >= 3 && event.winRate >= 60) return 8;
  return 0;
}

export function getGoalTypeLabel(type: Goal["type"]): string {
  switch (type) {
    case "win_rate": return "Win Rate";
    case "match_count": return "Match Count";
    case "event_finish": return "Event Finish";
    case "streak": return "Win Streak";
  }
}

export function getGoalDescription(goal: Goal): string {
  const parts: string[] = [];
  switch (goal.type) {
    case "win_rate":
      parts.push(`Reach ${goal.target}% win rate`);
      break;
    case "match_count":
      parts.push(`Play ${goal.target} matches`);
      break;
    case "event_finish":
      parts.push(`Finish top ${goal.target} at an event`);
      break;
    case "streak":
      parts.push(`Win ${goal.target} matches in a row`);
      break;
  }
  if (goal.hero) parts.push(`with ${goal.hero}`);
  if (goal.format) parts.push(`in ${goal.format}`);
  if (goal.eventType) parts.push(`at ${goal.eventType}`);
  return parts.join(" ");
}
