"use client";
import { useAutoSyncRecompute } from "@/hooks/useAutoSyncRecompute";

/** Silent component that triggers recomputation after auto-sync imports. */
export function AutoSyncRecompute() {
  useAutoSyncRecompute();
  return null;
}
