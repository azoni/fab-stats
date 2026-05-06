"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ThemeName } from "@/lib/theme-config";
import { THEME_OPTIONS, getThemeConfig, normalizeThemeName } from "@/lib/theme-config";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  resetTheme: () => void;
  isCustom: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "rosetta",
  setTheme: () => {},
  resetTheme: () => {},
  isCustom: false,
});

const USER_THEME_KEY = "fab-theme";
const USER_THEME_GEN_KEY = "fab-theme-gen";

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
  localStorage.removeItem(USER_THEME_KEY);
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "rosetta";
    return migrateSlug(localStorage.getItem(USER_THEME_KEY)) || "rosetta";
  });

  const [isCustom, setIsCustom] = useState(() => {
    if (typeof window === "undefined") return false;
    return migrateSlug(localStorage.getItem(USER_THEME_KEY)) !== null;
  });

  useEffect(() => {
    getThemeConfig().then(({ theme: adminTheme, generation }) => {
      const userTheme = migrateSlug(localStorage.getItem(USER_THEME_KEY));
      const userGen = parseInt(localStorage.getItem(USER_THEME_GEN_KEY) || "0", 10);

      if (userTheme && userGen < generation) {
        localStorage.removeItem(USER_THEME_KEY);
        localStorage.setItem(USER_THEME_GEN_KEY, String(generation));
        setThemeState(adminTheme);
        setIsCustom(false);
        document.documentElement.setAttribute("data-theme", adminTheme);
      } else if (!userTheme) {
        localStorage.setItem(USER_THEME_GEN_KEY, String(generation));
        setThemeState(adminTheme);
        setIsCustom(false);
        document.documentElement.setAttribute("data-theme", adminTheme);
      } else {
        localStorage.setItem(USER_THEME_GEN_KEY, String(generation));
        setThemeState(userTheme);
        setIsCustom(true);
        document.documentElement.setAttribute("data-theme", userTheme);
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeName) => {
    const normalized = normalizeThemeName(nextTheme);
    setThemeState(normalized);
    setIsCustom(true);
    localStorage.setItem(USER_THEME_KEY, normalized);
    document.documentElement.setAttribute("data-theme", normalized);
  }, []);

  const resetTheme = useCallback(() => {
    localStorage.removeItem(USER_THEME_KEY);
    setIsCustom(false);
    getThemeConfig().then(({ theme: defaultTheme }) => {
      setThemeState(defaultTheme);
      document.documentElement.setAttribute("data-theme", defaultTheme);
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, resetTheme, isCustom }),
    [theme, setTheme, resetTheme, isCustom]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
