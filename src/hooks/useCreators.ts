import { useState, useEffect, useCallback } from "react";
import { getCreators } from "@/lib/creators";
import type { Creator } from "@/types";

/**
 * Fetches creators list. Default: fetches eagerly on mount.
 * Pass `{ lazy: true }` to defer the Firestore read until `load()` is called.
 */
export function useCreators(opts?: { lazy?: boolean }) {
  const lazy = opts?.lazy ?? false;
  const [creators, setCreators] = useState<Creator[]>([]);
  const [triggered, setTriggered] = useState(!lazy);

  useEffect(() => {
    if (!triggered) return;
    getCreators().then(setCreators).catch(() => {});
  }, [triggered]);

  const load = useCallback(() => setTriggered(true), []);

  return Object.assign(creators, { load });
}
