"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ThemeName } from "@/lib/theme-config";
import { THEME_OPTIONS, getThemeConfig } from "@/lib/theme-config";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  resetTheme: () => void;
  isCustom: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "grimoire",
  setTheme: () => {},
  resetTheme: () => {},
  isCustom: false,
});

const USER_THEME_KEY = "fab-theme";
const USER_THEME_GEN_KEY = "fab-theme-gen";

/** Compute Easter Sunday for a given year (Anonymous Gregorian algorithm). */
function computeEaster(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** Get the 4th Thursday of November (Thanksgiving). */
function thanksgivingDay(year: number): number {
  // Nov 1 day of week (0=Sun), find first Thursday, add 3 weeks
  const dow = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const firstThurs = dow <= 4 ? 5 - dow : 12 - dow;
  return firstThurs + 21; // 4th Thursday
}

/** Check if today is a holiday with a special theme override. Uses UTC date. */
function getHolidayTheme(): ThemeName | null {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1; // 1-12
  const d = now.getUTCDate();
  if (m === 1 && d === 1) return "newyear";        // New Year's Day
  if (m === 2 && d === 14) return "valentine";      // Valentine's Day
  if (m === 3 && d === 17) return "shamrock";       // St. Patrick's Day
  const easter = computeEaster(y);
  if (m === easter.month && d === easter.day) return "pastel"; // Easter Sunday
  if (m === 7 && d === 4) return "firework";        // Independence Day
  if (m === 10 && d === 31) return "spooky";        // Halloween
  if (m === 11 && d === thanksgivingDay(y)) return "thankful"; // Thanksgiving
  if (m === 12 && (d === 24 || d === 25)) return "holly"; // Christmas Eve & Day
  if (m === 12 && d === 31) return "lunar";         // New Year's Eve
  return null;
}

// Migrate old theme slugs to new ones
const SLUG_MIGRATION: Record<string, ThemeName> = {
  arcana: "grimoire",
  ironheart: "grimoire",
  chromatic: "rosetta",
};

const VALID_THEMES = new Set(THEME_OPTIONS.map((o) => o.value));

function migrateSlug(raw: string | null): ThemeName | null {
  if (!raw) return null;
  if (VALID_THEMES.has(raw as ThemeName)) return raw as ThemeName;
  const migrated = SLUG_MIGRATION[raw];
  if (migrated) {
    localStorage.setItem(USER_THEME_KEY, migrated);
    return migrated;
  }
  // Unknown slug — clear it
  localStorage.removeItem(USER_THEME_KEY);
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "grimoire";
    const stored = migrateSlug(localStorage.getItem(USER_THEME_KEY));
    return stored || getHolidayTheme() || "grimoire";
  });
  const [isCustom, setIsCustom] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(USER_THEME_KEY) !== null;
  });

  // Fetch admin config — check generation to force-reset stale user choices
  // Holiday themes override the default for the day (users can still pick their own)
  useEffect(() => {
    getThemeConfig().then(({ theme: adminTheme, generation }) => {
      const holiday = getHolidayTheme();
      const effectiveDefault = holiday || adminTheme;
      const userTheme = localStorage.getItem(USER_THEME_KEY);
      const userGen = parseInt(localStorage.getItem(USER_THEME_GEN_KEY) || "0", 10);

      if (userTheme && userGen < generation) {
        // Admin bumped generation — clear user's choice
        localStorage.removeItem(USER_THEME_KEY);
        localStorage.setItem(USER_THEME_GEN_KEY, String(generation));
        setThemeState(effectiveDefault);
        setIsCustom(false);
        document.documentElement.setAttribute("data-theme", effectiveDefault);
      } else if (!userTheme) {
        // No user choice — use holiday or admin default
        localStorage.setItem(USER_THEME_GEN_KEY, String(generation));
        setThemeState(effectiveDefault);
        document.documentElement.setAttribute("data-theme", effectiveDefault);
      } else {
        // User has a valid choice, just sync generation
        localStorage.setItem(USER_THEME_GEN_KEY, String(generation));
      }
    });
  }, []);

  // Apply data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    setIsCustom(true);
    localStorage.setItem(USER_THEME_KEY, t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const resetTheme = useCallback(() => {
    localStorage.removeItem(USER_THEME_KEY);
    setIsCustom(false);
    getThemeConfig().then(({ theme: t }) => {
      const effective = getHolidayTheme() || t;
      setThemeState(effective);
      document.documentElement.setAttribute("data-theme", effective);
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, resetTheme, isCustom }), [theme, setTheme, resetTheme, isCustom]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
