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

/** Check if today is a holiday with a special theme override. Uses UTC date. */
function getHolidayTheme(): ThemeName | null {
  const now = new Date();
  const m = now.getUTCMonth() + 1; // 1-12
  const d = now.getUTCDate();
  if (m === 3 && d === 17) return "shamrock"; // St. Patrick's Day
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
