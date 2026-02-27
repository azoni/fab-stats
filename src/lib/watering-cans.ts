import { updateProfile } from "./firestore-storage";

export interface WateringCanDef {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "epic";
  cursor: string;
  dropColor: string;
  /** Inline SVG string for the picker preview (24x24) */
  previewSvg: string;
}

/* ── SVG cursor data URIs ─────────────────────────────── */

const classicCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect x='4' y='12' width='14' height='10' rx='2' fill='%2360a5fa'/%3E%3Cpath d='M7 12C7 6 15 6 15 12' fill='none' stroke='%233b82f6' stroke-width='2'/%3E%3Cpath d='M18 16L26 26' stroke='%233b82f6' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='27' cy='27' r='3' fill='%2393c5fd'/%3E%3C/svg%3E") 27 27, auto`;

const goldenCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect x='4' y='12' width='14' height='10' rx='2' fill='%23fbbf24'/%3E%3Ccircle cx='8' cy='15' r='1' fill='%23fef3c7' opacity='0.7'/%3E%3Cpath d='M7 12C7 6 15 6 15 12' fill='none' stroke='%23d97706' stroke-width='2'/%3E%3Cpath d='M18 16L26 26' stroke='%23d97706' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='27' cy='27' r='3' fill='%23fde047'/%3E%3C/svg%3E") 27 27, auto`;

const crystalCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect x='4' y='12' width='14' height='10' rx='2' fill='%235eead4' fill-opacity='0.5' stroke='%2399f6e4' stroke-width='0.8'/%3E%3Cline x1='6' y1='14' x2='16' y2='20' stroke='white' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='16' y1='14' x2='6' y2='20' stroke='white' stroke-width='0.5' opacity='0.4'/%3E%3Cpath d='M7 12C7 6 15 6 15 12' fill='none' stroke='%2314b8a6' stroke-width='2'/%3E%3Cpath d='M18 16L26 26' stroke='%2314b8a6' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='27' cy='27' r='3' fill='white' opacity='0.85'/%3E%3C/svg%3E") 27 27, auto`;

const roseCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect x='4' y='12' width='14' height='10' rx='2' fill='%23f9a8d4'/%3E%3Ccircle cx='9' cy='15' r='1.2' fill='%23fce7f3' opacity='0.6'/%3E%3Cpath d='M7 12C7 6 15 6 15 12' fill='none' stroke='%23ec4899' stroke-width='2'/%3E%3Cpath d='M18 16L26 26' stroke='%23ec4899' stroke-width='2.5' stroke-linecap='round'/%3E%3Cpath d='M27 25.5C27 24.5 28.5 23 28.5 23S30 24.5 30 25.5C30 26.5 29 27.2 28.5 27.2S27 26.5 27 25.5Z' fill='%23f472b6'/%3E%3Cpath d='M24 26C24 25 25.5 23.5 25.5 23.5S27 25 27 26C27 27 26 27.7 25.5 27.7S24 27 24 26Z' fill='%23f472b6'/%3E%3C/svg%3E") 27 27, auto`;

const natureCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect x='4' y='12' width='14' height='10' rx='2' fill='%234ade80'/%3E%3Cpath d='M7 12C7 6 15 6 15 12' fill='none' stroke='%2316a34a' stroke-width='2'/%3E%3Cellipse cx='9' cy='9' rx='2.5' ry='1' fill='%2322c55e' transform='rotate(-30 9 9)'/%3E%3Cellipse cx='13' cy='8' rx='2.5' ry='1' fill='%2322c55e' transform='rotate(25 13 8)'/%3E%3Cpath d='M18 16L26 26' stroke='%2316a34a' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='27' cy='27' r='3' fill='%2392400e'/%3E%3C/svg%3E") 27 27, auto`;

const rainbowCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='rg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ef4444'/%3E%3Cstop offset='20%25' stop-color='%23f59e0b'/%3E%3Cstop offset='40%25' stop-color='%23eab308'/%3E%3Cstop offset='60%25' stop-color='%2322c55e'/%3E%3Cstop offset='80%25' stop-color='%233b82f6'/%3E%3Cstop offset='100%25' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='4' y='12' width='14' height='10' rx='2' fill='url(%23rg)'/%3E%3Cpath d='M7 12C7 6 15 6 15 12' fill='none' stroke='%238b5cf6' stroke-width='2'/%3E%3Cpath d='M18 16L26 26' stroke='%238b5cf6' stroke-width='2.5' stroke-linecap='round'/%3E%3Cpath d='M27 24L29 27L27 30L25 27Z' fill='white'/%3E%3Ccircle cx='27' cy='27' r='1' fill='%23c4b5fd'/%3E%3C/svg%3E") 27 27, auto`;

/* ── Preview SVGs (24x24 for picker) ──────────────────── */

const classicPreview = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><rect x="4" y="12" width="14" height="10" rx="2" fill="#60a5fa"/><path d="M7 12C7 6 15 6 15 12" fill="none" stroke="#3b82f6" stroke-width="2"/><path d="M18 16L26 26" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/><circle cx="27" cy="27" r="3" fill="#93c5fd"/></svg>`;

const goldenPreview = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><rect x="4" y="12" width="14" height="10" rx="2" fill="#fbbf24"/><circle cx="8" cy="15" r="1" fill="#fef3c7" opacity="0.7"/><path d="M7 12C7 6 15 6 15 12" fill="none" stroke="#d97706" stroke-width="2"/><path d="M18 16L26 26" stroke="#d97706" stroke-width="2.5" stroke-linecap="round"/><circle cx="27" cy="27" r="3" fill="#fde047"/></svg>`;

const crystalPreview = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><rect x="4" y="12" width="14" height="10" rx="2" fill="#5eead4" fill-opacity="0.5" stroke="#99f6e4" stroke-width="0.8"/><line x1="6" y1="14" x2="16" y2="20" stroke="white" stroke-width="0.5" opacity="0.4"/><line x1="16" y1="14" x2="6" y2="20" stroke="white" stroke-width="0.5" opacity="0.4"/><path d="M7 12C7 6 15 6 15 12" fill="none" stroke="#14b8a6" stroke-width="2"/><path d="M18 16L26 26" stroke="#14b8a6" stroke-width="2.5" stroke-linecap="round"/><circle cx="27" cy="27" r="3" fill="white" opacity="0.85"/></svg>`;

const rosePreview = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><rect x="4" y="12" width="14" height="10" rx="2" fill="#f9a8d4"/><circle cx="9" cy="15" r="1.2" fill="#fce7f3" opacity="0.6"/><path d="M7 12C7 6 15 6 15 12" fill="none" stroke="#ec4899" stroke-width="2"/><path d="M18 16L26 26" stroke="#ec4899" stroke-width="2.5" stroke-linecap="round"/><circle cx="27" cy="27" r="3" fill="#f472b6"/></svg>`;

const naturePreview = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><rect x="4" y="12" width="14" height="10" rx="2" fill="#4ade80"/><path d="M7 12C7 6 15 6 15 12" fill="none" stroke="#16a34a" stroke-width="2"/><ellipse cx="9" cy="9" rx="2.5" ry="1" fill="#22c55e" transform="rotate(-30 9 9)"/><ellipse cx="13" cy="8" rx="2.5" ry="1" fill="#22c55e" transform="rotate(25 13 8)"/><path d="M18 16L26 26" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round"/><circle cx="27" cy="27" r="3" fill="#92400e"/></svg>`;

const rainbowPreview = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><defs><linearGradient id="rpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ef4444"/><stop offset="20%" stop-color="#f59e0b"/><stop offset="40%" stop-color="#eab308"/><stop offset="60%" stop-color="#22c55e"/><stop offset="80%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect x="4" y="12" width="14" height="10" rx="2" fill="url(#rpg)"/><path d="M7 12C7 6 15 6 15 12" fill="none" stroke="#8b5cf6" stroke-width="2"/><path d="M18 16L26 26" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round"/><path d="M27 24L29 27L27 30L25 27Z" fill="white"/><circle cx="27" cy="27" r="1" fill="#c4b5fd"/></svg>`;

/* ── Can definitions ──────────────────────────────────── */

export const WATERING_CANS: WateringCanDef[] = [
  {
    id: "classic",
    name: "Classic Blue",
    description: "The trusty blue watering can. Simple and reliable.",
    rarity: "common",
    cursor: classicCursor,
    dropColor: "rgba(96, 165, 250, 0.7)",
    previewSvg: classicPreview,
  },
  {
    id: "golden",
    name: "Golden Can",
    description: "A gilded watering can that rains liquid gold.",
    rarity: "uncommon",
    cursor: goldenCursor,
    dropColor: "rgba(251, 191, 36, 0.7)",
    previewSvg: goldenPreview,
  },
  {
    id: "crystal",
    name: "Crystal Can",
    description: "Translucent teal crystal, waters with pure clarity.",
    rarity: "rare",
    cursor: crystalCursor,
    dropColor: "rgba(94, 234, 212, 0.7)",
    previewSvg: crystalPreview,
  },
  {
    id: "rose",
    name: "Rose Gold",
    description: "Elegant pink-gold finish with petal-soft drops.",
    rarity: "rare",
    cursor: roseCursor,
    dropColor: "rgba(244, 114, 182, 0.7)",
    previewSvg: rosePreview,
  },
  {
    id: "nature",
    name: "Verdant Can",
    description: "Grown from the garden itself, with leafy accents.",
    rarity: "uncommon",
    cursor: natureCursor,
    dropColor: "rgba(74, 222, 128, 0.7)",
    previewSvg: naturePreview,
  },
  {
    id: "rainbow",
    name: "Prismatic Can",
    description: "A spectral masterpiece that waters in all colors.",
    rarity: "epic",
    cursor: rainbowCursor,
    dropColor: "rgba(196, 181, 253, 0.7)",
    previewSvg: rainbowPreview,
  },
];

export const DEFAULT_CAN_ID = "classic";
export const ALL_CAN_IDS = WATERING_CANS.map((c) => c.id);

export function getCanById(id: string): WateringCanDef {
  return WATERING_CANS.find((c) => c.id === id) ?? WATERING_CANS[0];
}

export function getUnlockedCanIds(profile: { username: string; unlockedCans?: string[] }): string[] {
  if (profile.username === "azoni") return ALL_CAN_IDS;
  const set = new Set(["classic", ...(profile.unlockedCans ?? [])]);
  return ALL_CAN_IDS.filter((id) => set.has(id));
}

/** Stub for future unlock logic */
export async function unlockCan(userId: string, canId: string, currentUnlocked: string[]): Promise<string[]> {
  const updated = [...new Set([...currentUnlocked, canId])];
  await updateProfile(userId, { unlockedCans: updated });
  return updated;
}
