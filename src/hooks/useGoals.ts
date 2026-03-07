"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getGoals, saveGoal, deleteGoal, type Goal } from "@/lib/goals";

export function useGoals() {
  const { user, isGuest } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || isGuest) {
      setGoals([]);
      setLoading(false);
      return;
    }
    getGoals(user.uid)
      .then(setGoals)
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, [user, isGuest]);

  const addGoal = useCallback(async (goal: Goal) => {
    if (!user || isGuest) return;
    await saveGoal(user.uid, goal);
    setGoals((prev) => [goal, ...prev]);
  }, [user, isGuest]);

  const removeGoal = useCallback(async (goalId: string) => {
    if (!user || isGuest) return;
    await deleteGoal(user.uid, goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }, [user, isGuest]);

  const updateGoal = useCallback(async (goal: Goal) => {
    if (!user || isGuest) return;
    await saveGoal(user.uid, goal);
    setGoals((prev) => prev.map((g) => g.id === goal.id ? goal : g));
  }, [user, isGuest]);

  return { goals, loading, addGoal, removeGoal, updateGoal };
}
