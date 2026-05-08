import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type ThemeName = "grimoire" | "leyline" | "rosetta" | "daylight";

export const THEME_OPTIONS: { value: ThemeName; label: string; description: string }[] = [
  { value: "leyline", label: "Leyline", description: "Arcane glass observatory, luminous and floating" },
  { value: "daylight", label: "Daylight", description: "Clean and bright, easy on the eyes" },
  { value: "rosetta", label: "Rosetta", description: "Polished tournament dark, warm gold and teal accents" },
  { value: "grimoire", label: "Grimoire", description: "Ancient spellbook, warm leather and candlelight" },
];

const DEFAULT_THEME: ThemeName = "rosetta";
const VALID_THEME_VALUES = new Set<ThemeName>(THEME_OPTIONS.map((o) => o.value));

export function normalizeThemeName(value: unknown): ThemeName {
  return typeof value === "string" && VALID_THEME_VALUES.has(value as ThemeName)
    ? (value as ThemeName)
    : DEFAULT_THEME;
}

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
      if (Date.now() - ts < CACHE_TTL) {
        return { theme: normalizeThemeName(theme), generation: generation ?? 0 };
      }
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, "admin", "themeConfig"));
    const data = snap.exists() ? snap.data() : {};
    const theme = normalizeThemeName(data.defaultTheme);
    const generation = (data.themeGeneration as number) ?? 0;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, generation, ts: Date.now() }));
    } catch {}
    return { theme, generation };
  } catch {
    return { theme: DEFAULT_THEME, generation: 0 };
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

/** Bump the theme generation; forces all users back to admin default on next visit. */
export async function resetAllUserThemes(): Promise<void> {
  const snap = await getDoc(doc(db, "admin", "themeConfig"));
  const current = snap.exists() ? (snap.data().themeGeneration as number) ?? 0 : 0;
  const next = current + 1;
  await setDoc(doc(db, "admin", "themeConfig"), { themeGeneration: next }, { merge: true });
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const theme = cached ? normalizeThemeName(JSON.parse(cached).theme) : DEFAULT_THEME;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, generation: next, ts: Date.now() }));
  } catch {}
}
