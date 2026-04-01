"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { isAprilFoolsDay } from "@/lib/april-fools";

interface AprilFoolsContextValue {
  /** True if it's April 1st AND user hasn't toggled off */
  isFoolsMode: boolean;
  /** True if today is April 1st (regardless of toggle) */
  isAprilFools: boolean;
  /** Toggle between foolish and real stats */
  toggleFools: () => void;
}

const AprilFoolsContext = createContext<AprilFoolsContextValue>({
  isFoolsMode: false,
  isAprilFools: false,
  toggleFools: () => {},
});

export function useAprilFools() {
  return useContext(AprilFoolsContext);
}

const FOOLS_DISMISSED_KEY = "fab-fools-dismissed";

export function AprilFoolsProvider({ children }: { children: React.ReactNode }) {
  const [isAprilFools] = useState(() => isAprilFoolsDay());
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const v = localStorage.getItem(FOOLS_DISMISSED_KEY);
      if (!v) return false;
      const { date } = JSON.parse(v);
      return date === new Date().toISOString().slice(0, 10);
    } catch { return false; }
  });

  const isFoolsMode = isAprilFools && !dismissed;

  const toggleFools = useCallback(() => {
    setDismissed((prev) => {
      const next = !prev;
      try {
        if (next) {
          localStorage.setItem(FOOLS_DISMISSED_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10) }));
        } else {
          localStorage.removeItem(FOOLS_DISMISSED_KEY);
        }
      } catch {}
      return next;
    });
  }, []);

  return (
    <AprilFoolsContext.Provider value={{ isFoolsMode, isAprilFools, toggleFools }}>
      {children}
    </AprilFoolsContext.Provider>
  );
}

/** Banner component — renders at top of page on April 1st */
export function FoolsBanner() {
  const { isAprilFools, isFoolsMode, toggleFools } = useAprilFools();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !isAprilFools) return null;

  return (
    <div className="fools-banner fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 px-4 py-2 text-center text-sm font-bold md:hidden-none">
      <span>
        {isFoolsMode
          ? "Happy April Fools! Your stats may be slightly... exaggerated. 🤡"
          : "April Fools mode off — showing real stats 😌"}
      </span>
      <button
        onClick={toggleFools}
        className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur hover:bg-white/30 transition-colors"
      >
        {isFoolsMode ? "Show Real Stats" : "Go Foolish"}
      </button>
    </div>
  );
}
