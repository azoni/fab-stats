"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ThemeName } from "@/lib/theme-config";
import { getThemeConfig } from "@/lib/theme-config";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  resetTheme: () => void;
  isCustom: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "arcana",
  setTheme: () => {},
  resetTheme: () => {},
  isCustom: false,
});

const USER_THEME_KEY = "fab-theme";
const USER_THEME_GEN_KEY = "fab-theme-gen";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "arcana";
    return (localStorage.getItem(USER_THEME_KEY) as ThemeName) || "arcana";
  });
  const [isCustom, setIsCustom] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(USER_THEME_KEY) !== null;
  });

  // Fetch admin config — check generation to force-reset stale user choices
  useEffect(() => {
    getThemeConfig().then(({ theme: adminTheme, generation }) => {
      const userTheme = localStorage.getItem(USER_THEME_KEY);
      const userGen = parseInt(localStorage.getItem(USER_THEME_GEN_KEY) || "0", 10);

      if (userTheme && userGen < generation) {
        // Admin bumped generation — clear user's choice
        localStorage.removeItem(USER_THEME_KEY);
        localStorage.setItem(USER_THEME_GEN_KEY, String(generation));
        setThemeState(adminTheme);
        setIsCustom(false);
        document.documentElement.setAttribute("data-theme", adminTheme);
      } else if (!userTheme) {
        // No user choice — use admin default
        localStorage.setItem(USER_THEME_GEN_KEY, String(generation));
        setThemeState(adminTheme);
        document.documentElement.setAttribute("data-theme", adminTheme);
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
      setThemeState(t);
      document.documentElement.setAttribute("data-theme", t);
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
