import type { ProfileBackgroundOption } from "@/lib/profile-backgrounds";

interface ThemeWithBackground {
  id: string;
  label: string;
  backgroundImage?: string;
}

function normalizeBackgroundKey(image?: string): string {
  const raw = (image || "").trim();
  if (!raw) return "";

  const cleanRaw = raw.split("#")[0].split("?")[0];

  try {
    const parsed = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw)
      : new URL(raw, "https://fabstats.local");

    if (parsed.hostname.toLowerCase() === "firebasestorage.googleapis.com") {
      const match = parsed.pathname.match(/\/o\/(.+)$/);
      if (match && match[1]) {
        const objectPath = decodeURIComponent(match[1]).toLowerCase();
        const objectName = objectPath.split("/").filter(Boolean).pop();
        return objectName || objectPath;
      }
    }

    const pathName = decodeURIComponent(parsed.pathname).toLowerCase();
    const fileName = pathName.split("/").filter(Boolean).pop();
    return fileName || pathName;
  } catch {
    const fallback = cleanRaw.toLowerCase();
    const fileName = fallback.split("/").filter(Boolean).pop();
    return fileName || fallback;
  }
}

function makeUniqueThemeId(candidate: string, usedIds: Set<string>): string {
  if (!usedIds.has(candidate)) return candidate;
  let suffix = 2;
  let next = `${candidate}-${suffix}`;
  while (usedIds.has(next)) {
    suffix += 1;
    next = `${candidate}-${suffix}`;
  }
  return next;
}

export function appendCatalogBackgroundThemes<T extends ThemeWithBackground>(
  baseThemes: readonly T[],
  backgroundOptions: readonly ProfileBackgroundOption[],
  buildTheme: (background: ProfileBackgroundOption, index: number, baseTheme: T) => T,
): T[] {
  if (!baseThemes.length) return [];

  const merged = [...baseThemes];
  const baseTheme = baseThemes[0];
  const usedIds = new Set(merged.map((theme) => theme.id));
  const seenBackgrounds = new Set(
    merged
      .map((theme) => normalizeBackgroundKey(theme.backgroundImage))
      .filter((key) => key.length > 0),
  );

  let idx = 0;
  for (const option of backgroundOptions) {
    const bgKey = normalizeBackgroundKey(option.imageUrl);
    if (!bgKey || seenBackgrounds.has(bgKey)) continue;

    const built = buildTheme(option, idx, baseTheme);
    const id = makeUniqueThemeId(built.id || `catalog-${option.id}`, usedIds);
    const label = built.label || option.label;
    const themed = {
      ...built,
      id,
      label,
      backgroundImage: option.imageUrl,
    };
    merged.push(themed);
    usedIds.add(id);
    seenBackgrounds.add(bgKey);
    idx += 1;
  }

  return merged;
}
