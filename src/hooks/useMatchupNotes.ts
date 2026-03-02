"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMatchupNotes,
  saveGeneralNotes,
  saveMatchupNote,
  type MatchupNoteDoc,
} from "@/lib/matchup-notes";

const DEBOUNCE_MS = 1500;

export function useMatchupNotes(heroName: string | null) {
  const { user } = useAuth();
  const [general, setGeneral] = useState("");
  const [matchups, setMatchups] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Track pending saves for debounce
  const generalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchupTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const currentHero = useRef(heroName);

  // Load notes when hero changes
  useEffect(() => {
    currentHero.current = heroName;
    if (!user || !heroName) {
      setGeneral("");
      setMatchups({});
      return;
    }
    setLoading(true);
    getMatchupNotes(user.uid, heroName).then((doc) => {
      if (currentHero.current !== heroName) return;
      setGeneral(doc?.general || "");
      setMatchups(doc?.matchups || {});
      setLoading(false);
    });
  }, [user, heroName]);

  const flushGeneral = useCallback(async () => {
    if (!user || !heroName) return;
    setSaving(true);
    try {
      await saveGeneralNotes(user.uid, heroName, general);
    } finally {
      setSaving(false);
    }
  }, [user, heroName, general]);

  const flushMatchup = useCallback(async (opponent: string, note: string) => {
    if (!user || !heroName) return;
    setSaving(true);
    try {
      await saveMatchupNote(user.uid, heroName, opponent, note);
    } finally {
      setSaving(false);
    }
  }, [user, heroName]);

  const updateGeneral = useCallback(
    (value: string) => {
      setGeneral(value);
      if (generalTimer.current) clearTimeout(generalTimer.current);
      generalTimer.current = setTimeout(async () => {
        if (!user || !heroName) return;
        setSaving(true);
        try {
          await saveGeneralNotes(user.uid, heroName, value);
        } finally {
          setSaving(false);
        }
      }, DEBOUNCE_MS);
    },
    [user, heroName]
  );

  const updateMatchup = useCallback(
    (opponent: string, value: string) => {
      setMatchups((prev) => ({ ...prev, [opponent]: value }));
      const existing = matchupTimers.current.get(opponent);
      if (existing) clearTimeout(existing);
      matchupTimers.current.set(
        opponent,
        setTimeout(async () => {
          if (!user || !heroName) return;
          setSaving(true);
          try {
            await saveMatchupNote(user.uid, heroName, opponent, value);
          } finally {
            setSaving(false);
          }
        }, DEBOUNCE_MS)
      );
    },
    [user, heroName]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (generalTimer.current) clearTimeout(generalTimer.current);
      matchupTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return {
    general,
    matchups,
    loading,
    saving,
    updateGeneral,
    updateMatchup,
    flushGeneral,
    flushMatchup,
  };
}
