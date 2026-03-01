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

/** Get the admin-configured default theme (cached) */
export async function getDefaultTheme(): Promise<ThemeName> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { theme, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return theme;
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, "admin", "themeConfig"));
    const theme = snap.exists() ? (snap.data().defaultTheme as ThemeName) || "arcana" : "arcana";
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, ts: Date.now() }));
    } catch {}
    return theme;
  } catch {
    return "arcana";
  }
}

/** Save the admin default theme (admin only) */
export async function saveDefaultTheme(theme: ThemeName): Promise<void> {
  await setDoc(doc(db, "admin", "themeConfig"), { defaultTheme: theme });
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, ts: Date.now() }));
  } catch {}
}
