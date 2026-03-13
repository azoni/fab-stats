export type ProfileBackgroundKind = "key-art" | "playmat" | "hero-art";

export interface ProfileBackgroundOption {
  id: string;
  label: string;
  imageUrl: string;
  kind: ProfileBackgroundKind;
  focusPosition?: string;
  adminOnly?: boolean;
}

export const NONE_BACKGROUND_ID = "none";

export const PROFILE_BACKGROUND_OPTIONS: ProfileBackgroundOption[] = [
  { id: "wtr-key-art-v1", label: "Welcome to Rathe", imageUrl: "/backgrounds/fab-official/wtr-key-art-v1.jpg", kind: "key-art", focusPosition: "center top" },
  { id: "arcane-rising-key-art", label: "Arcane Rising", imageUrl: "/backgrounds/fab-official/arcane-rising-key-art.jpg", kind: "key-art", focusPosition: "center top" },
  { id: "monarch-key-art", label: "Monarch", imageUrl: "/backgrounds/fab-official/monarch-key-art.jpg", kind: "key-art", focusPosition: "center top" },
  { id: "tales-of-aria-key-art", label: "Tales of Aria", imageUrl: "/backgrounds/fab-official/tales-of-aria-key-art.jpg", kind: "key-art", focusPosition: "center top" },
  { id: "playmat-aria", label: "Aria Playmat", imageUrl: "/backgrounds/fab-official/lore-aria-matte.jpg", kind: "playmat", focusPosition: "center center" },
  { id: "playmat-solana", label: "Solana Playmat", imageUrl: "/backgrounds/fab-official/lore-solana-matte.jpg", kind: "playmat", focusPosition: "center center" },
  { id: "playmat-volcor", label: "Volcor Playmat", imageUrl: "/backgrounds/fab-official/lore-volcor-matte.jpg", kind: "playmat", focusPosition: "center center" },
  { id: "wtr-key-art-v2", label: "Rathe Alt Key Art", imageUrl: "/backgrounds/fab-official/wtr-key-art-v2.jpg", kind: "key-art", focusPosition: "center top", adminOnly: true },
  { id: "hunted-key-art", label: "The Hunted", imageUrl: "/backgrounds/fab-official/hunted-key-art.jpg", kind: "key-art", focusPosition: "center top", adminOnly: true },
  { id: "hunted-cindra-adult", label: "Cindra (The Hunted)", imageUrl: "/backgrounds/fab-official/hunted-cindra-adult.jpg", kind: "hero-art", focusPosition: "50% 18%", adminOnly: true },
  { id: "hunted-fang-adult", label: "Fang (The Hunted)", imageUrl: "/backgrounds/fab-official/hunted-fang-adult.jpg", kind: "hero-art", focusPosition: "50% 20%", adminOnly: true },
  { id: "hunted-arakni-adult", label: "Arakni (The Hunted)", imageUrl: "/backgrounds/fab-official/hunted-arakni-adult.jpg", kind: "hero-art", focusPosition: "50% 22%", adminOnly: true },
  { id: "high-seas-marlynn", label: "Marlynn (High Seas)", imageUrl: "/backgrounds/fab-official/high-seas-marlynn.jpg", kind: "hero-art", focusPosition: "52% 18%", adminOnly: true },
  { id: "high-seas-puffin", label: "Puffin (High Seas)", imageUrl: "/backgrounds/fab-official/high-seas-puffin.jpg", kind: "hero-art", focusPosition: "52% 20%", adminOnly: true },
  { id: "high-seas-gravybones", label: "Gravy Bones (High Seas)", imageUrl: "/backgrounds/fab-official/high-seas-gravybones.jpg", kind: "hero-art", focusPosition: "50% 20%", adminOnly: true },
];

export function getProfileBackgroundOptions(isAdmin: boolean): ProfileBackgroundOption[] {
  return PROFILE_BACKGROUND_OPTIONS.filter((opt) => isAdmin || !opt.adminOnly);
}

export function resolveProfileBackgroundImage(backgroundId?: string | null): string | undefined {
  if (!backgroundId || backgroundId === NONE_BACKGROUND_ID) return undefined;
  return PROFILE_BACKGROUND_OPTIONS.find((opt) => opt.id === backgroundId)?.imageUrl;
}

export function resolveProfileBackgroundPosition(backgroundId?: string | null): string | undefined {
  if (!backgroundId || backgroundId === NONE_BACKGROUND_ID) return undefined;
  return PROFILE_BACKGROUND_OPTIONS.find((opt) => opt.id === backgroundId)?.focusPosition;
}

export function resolveBackgroundPositionForImage(imageUrl?: string | null): string {
  if (!imageUrl) return "center center";
  return PROFILE_BACKGROUND_OPTIONS.find((opt) => opt.imageUrl === imageUrl)?.focusPosition || "center center";
}

export function buildOptimizedImageUrl(imageUrl: string, width: number, quality = 68): string {
  if (!imageUrl) return imageUrl;
  // Non-local images should pass through unchanged.
  if (!imageUrl.startsWith("/")) return imageUrl;

  const safeWidth = Math.max(64, Math.min(3840, Math.round(width)));
  const safeQuality = Math.max(35, Math.min(100, Math.round(quality)));
  return `/_next/image?url=${encodeURIComponent(imageUrl)}&w=${safeWidth}&q=${safeQuality}`;
}
