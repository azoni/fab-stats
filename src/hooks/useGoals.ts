"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getGoals, saveGoal, deleteGoal, type Goal } from "@/lib/goals";

export function useGoals() {
  const { user, isGuest } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || isGuest) {
      setGoals([]);
      setLoading(false);
      return;
    }
    getGoals(user.uid)
      .then(setGoals)
      .catch((e) => {
        console.error("Failed to load goals:", e);
        setError("Failed to load goals");
        setGoals([]);
      })
      .finally(() => setLoading(false));
  }, [user, isGuest]);

  const addGoal = useCallback(async (goal: Goal) => {
    if (!user || isGuest) return;
    try {
      setError(null);
      await saveGoal(user.uid, goal);
      setGoals((prev) => [goal, ...prev]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save goal";
      console.error("addGoal failed:", e);
      setError(msg);
      throw e;
    }
  }, [user, isGuest]);

  const removeGoal = useCallback(async (goalId: string) => {
    if (!user || isGuest) return;
    try {
      setError(null);
      await deleteGoal(user.uid, goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete goal";
      console.error("removeGoal failed:", e);
      setError(msg);
      throw e;
    }
  }, [user, isGuest]);

  const updateGoal = useCallback(async (goal: Goal) => {
    if (!user || isGuest) return;
    try {
      setError(null);
      await saveGoal(user.uid, goal);
      setGoals((prev) => prev.map((g) => g.id === goal.id ? goal : g));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update goal";
      console.error("updateGoal failed:", e);
      setError(msg);
      throw e;
    }
  }, [user, isGuest]);

  const clearError = useCallback(() => setError(null), []);

  return { goals, loading, error, clearError, addGoal, removeGoal, updateGoal };
}
