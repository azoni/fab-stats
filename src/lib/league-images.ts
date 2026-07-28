import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const BANNER_MAX_SIZE = 1600; // wide hero image
const BANNER_MAX_BYTES = 8 * 1024 * 1024;
const ICON_MAX_SIZE = 256; // small square-ish emblem (CSS object-cover crops)
const ICON_MAX_BYTES = 2 * 1024 * 1024;

// ── Banner focal point ──────────────────────────────────────────────────────
// The banner is drawn at object-fit: cover, so most photos overflow the frame
// and only a slice shows. `bannerPosition` (percentages 0..100) is a focal
// anchor: CSS aligns the image's {x,y}% point to the frame's {x,y}% point. One
// value renders across the desk hero, the hub cards, and the editor preview —
// only the visible crop differs per surface. Absent/corrupt → center.
export type BannerPosition = { x: number; y: number };
export const DEFAULT_BANNER_POSITION: BannerPosition = { x: 50, y: 50 };

function clampPct(v: unknown, d: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : d;
}

/** background-position / object-position string for a banner, clamped; center by default. */
export function bannerObjectPosition(pos?: Partial<BannerPosition> | null): string {
  return `${clampPct(pos?.x, 50)}% ${clampPct(pos?.y, 50)}%`;
}

/** Persist the banner focal point on the league doc (organizer-only, no rules change). */
export async function updateLeagueBannerPosition(leagueId: string, pos: BannerPosition): Promise<void> {
  await updateDoc(doc(db, "leagues", leagueId), {
    bannerPosition: { x: Math.round(clampPct(pos.x, 50)), y: Math.round(clampPct(pos.y, 50)) },
    updatedAt: new Date().toISOString(),
  });
}

// ── Banner scrims (single source of truth) ──────────────────────────────────
// Every stop is color-mix over the THEMED token var(--color-fab-bg) — not a
// hardcoded rgba — because that token flips to light values under the daylight
// / parchment themes; hardcoding would paint dark mud over a light page. The
// picker imports LEAGUE_DESK_SCRIM verbatim so what the organizer frames is what
// ships. Comma-stacked: first listed paints on top, so the flat floor is last.
export const LEAGUE_DESK_SCRIM =
  // 1) top cap — behind the status pill + accent-sheen hairline
  "linear-gradient(to bottom, color-mix(in srgb,var(--color-fab-bg) 72%,transparent) 0%, " +
  "color-mix(in srgb,var(--color-fab-bg) 20%,transparent) 20%, transparent 38%)," +
  // 2) left protector — shields title/meta/description from busy right-side art
  "linear-gradient(105deg, color-mix(in srgb,var(--color-fab-bg) 85%,transparent) 0%, " +
  "color-mix(in srgb,var(--color-fab-bg) 50%,transparent) 40%, transparent 70%)," +
  // 3) bottom anchor — solid under the stat band, fades up past the title
  "linear-gradient(to top, var(--color-fab-bg) 2%, color-mix(in srgb,var(--color-fab-bg) 90%,transparent) 24%, " +
  "color-mix(in srgb,var(--color-fab-bg) 42%,transparent) 60%, transparent 86%)," +
  // 4) global floor — uniform wash so even a blown-out photo never blinds
  "linear-gradient(0deg, color-mix(in srgb,var(--color-fab-bg) 30%,transparent), " +
  "color-mix(in srgb,var(--color-fab-bg) 30%,transparent))";

export const LEAGUE_HUB_SCRIM =
  "linear-gradient(to right, var(--color-fab-bg) 0%, color-mix(in srgb,var(--color-fab-bg) 92%,transparent) 40%, " +
  "color-mix(in srgb,var(--color-fab-bg) 58%,transparent) 76%, color-mix(in srgb,var(--color-fab-bg) 42%,transparent) 100%)," +
  "linear-gradient(0deg, color-mix(in srgb,var(--color-fab-bg) 22%,transparent), color-mix(in srgb,var(--color-fab-bg) 22%,transparent))";

function resizeImageToBlob(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) {
            h = Math.round((h * maxSize) / w);
            w = maxSize;
          } else {
            w = Math.round((w * maxSize) / h);
            h = maxSize;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))),
          "image/webp",
          0.85,
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function validateImageFile(file: File, maxBytes: number): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Image must be JPEG, PNG, or WebP.");
  }
  if (file.size > maxBytes) {
    throw new Error(`Image must be under ${Math.round(maxBytes / 1024 / 1024)}MB.`);
  }
}

/** Upload a league banner, persist bannerUrl on the league doc, return the URL. */
export async function uploadLeagueBanner(leagueId: string, file: File): Promise<string> {
  validateImageFile(file, BANNER_MAX_BYTES);
  const storage = getStorage();
  const blob = await resizeImageToBlob(file, BANNER_MAX_SIZE);
  const ref = storageRef(storage, `league-images/banners/${leagueId}/banner.webp`);
  await uploadBytes(ref, blob, { contentType: "image/webp" });
  const bannerUrl = await getDownloadURL(ref);
  await updateDoc(doc(db, "leagues", leagueId), {
    bannerUrl,
    // Recenter — a fresh photo shouldn't inherit the previous image's framing.
    bannerPosition: DEFAULT_BANNER_POSITION,
    updatedAt: new Date().toISOString(),
  });
  return bannerUrl;
}

/** Upload a league icon (emblem), persist iconUrl on the league doc, return the URL. */
export async function uploadLeagueIcon(leagueId: string, file: File): Promise<string> {
  validateImageFile(file, ICON_MAX_BYTES);
  const storage = getStorage();
  const blob = await resizeImageToBlob(file, ICON_MAX_SIZE);
  const ref = storageRef(storage, `league-images/icons/${leagueId}/icon.webp`);
  await uploadBytes(ref, blob, { contentType: "image/webp" });
  const iconUrl = await getDownloadURL(ref);
  await updateDoc(doc(db, "leagues", leagueId), {
    iconUrl,
    updatedAt: new Date().toISOString(),
  });
  return iconUrl;
}

/** Remove the stored icon image + clear iconUrl. */
export async function removeLeagueIcon(leagueId: string): Promise<void> {
  const storage = getStorage();
  try {
    const dirRef = storageRef(storage, `league-images/icons/${leagueId}`);
    const result = await listAll(dirRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch {
    // Directory may not exist — ignore.
  }
  await updateDoc(doc(db, "leagues", leagueId), {
    iconUrl: "",
    updatedAt: new Date().toISOString(),
  });
}

/** Remove the stored banner image + clear bannerUrl. */
export async function removeLeagueBanner(leagueId: string): Promise<void> {
  const storage = getStorage();
  try {
    const dirRef = storageRef(storage, `league-images/banners/${leagueId}`);
    const result = await listAll(dirRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch {
    // Directory may not exist — ignore.
  }
  await updateDoc(doc(db, "leagues", leagueId), {
    bannerUrl: "",
    updatedAt: new Date().toISOString(),
  });
}
