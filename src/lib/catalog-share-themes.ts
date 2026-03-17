import type { ProfileBackgroundOption } from "@/lib/profile-backgrounds";

interface ThemeWithBackground {
  id: string;
  label: string;
  backgroundImage?: string;
}

function normalizeBackgroundKey(image?: string): string {
  return (image || "").trim().toLowerCase();
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
