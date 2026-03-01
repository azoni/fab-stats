"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ThemeName } from "@/lib/theme-config";
import { getDefaultTheme } from "@/lib/theme-config";

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "arcana";
    return (localStorage.getItem(USER_THEME_KEY) as ThemeName) || "arcana";
  });
  const [isCustom, setIsCustom] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(USER_THEME_KEY) !== null;
  });

  // Fetch admin default if user hasn't explicitly chosen
  useEffect(() => {
    if (localStorage.getItem(USER_THEME_KEY)) return;
    getDefaultTheme().then((t) => {
      if (!localStorage.getItem(USER_THEME_KEY)) {
        setThemeState(t);
        document.documentElement.setAttribute("data-theme", t);
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
    getDefaultTheme().then((t) => {
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
