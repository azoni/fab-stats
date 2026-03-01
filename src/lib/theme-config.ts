import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type ThemeName = "arcana" | "ironheart" | "chromatic";

export const THEME_OPTIONS: { value: ThemeName; label: string; description: string }[] = [
  { value: "arcana", label: "Arcana", description: "Purple & gold, refined and distinctive" },
  { value: "ironheart", label: "Ironheart", description: "Warm TCG table, antiqued gold" },
  { value: "chromatic", label: "Chromatic", description: "Data-first, cool and competitive" },
];

const CACHE_KEY = "fab_theme_config";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/** Get the admin-configured default theme + generation (cached) */
export async function getDefaultTheme(): Promise<ThemeName> {
  const config = await getThemeConfig();
  return config.theme;
}

export async function getThemeConfig(): Promise<{ theme: ThemeName; generation: number }> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { theme, generation, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return { theme, generation: generation ?? 0 };
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, "admin", "themeConfig"));
    const data = snap.exists() ? snap.data() : {};
    const theme = (data.defaultTheme as ThemeName) || "arcana";
    const generation = (data.themeGeneration as number) ?? 0;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, generation, ts: Date.now() }));
    } catch {}
    return { theme, generation };
  } catch {
    return { theme: "arcana", generation: 0 };
  }
}

/** Save the admin default theme (admin only) */
export async function saveDefaultTheme(theme: ThemeName): Promise<void> {
  await setDoc(doc(db, "admin", "themeConfig"), { defaultTheme: theme }, { merge: true });
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const generation = cached ? (JSON.parse(cached).generation ?? 0) : 0;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, generation, ts: Date.now() }));
  } catch {}
}

/** Bump the theme generation — forces all users back to admin default on next visit */
export async function resetAllUserThemes(): Promise<void> {
  const snap = await getDoc(doc(db, "admin", "themeConfig"));
  const current = snap.exists() ? (snap.data().themeGeneration as number) ?? 0 : 0;
  const next = current + 1;
  await setDoc(doc(db, "admin", "themeConfig"), { themeGeneration: next }, { merge: true });
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const theme = cached ? (JSON.parse(cached).theme as ThemeName) || "arcana" : "arcana";
    localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, generation: next, ts: Date.now() }));
  } catch {}
}
