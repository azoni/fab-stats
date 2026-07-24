import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit as fbLimit,
} from "firebase/firestore";
import { db } from "./firebase";
import { searchCards } from "./cards";
import { searchHeroes, getHeroPortraitUrl } from "./heroes";

export type TierItemKind = "card" | "hero" | "custom";

export interface TierItem {
  /** Unique instance id (an item can only live in one place at a time). */
  id: string;
  label: string;
  imageUrl: string;
  kind: TierItemKind;
  /** Source ref for dedup ("card:<id>" / "hero:<name>"); absent for custom. */
  refId?: string;
}

export interface Tier {
  id: string;
  label: string;
  color: string; // hex
}

export interface TierListDoc {
  id: string;
  title: string;
  tiers: Tier[];
  /** container id (tier id or POOL_ID) → ordered item ids. */
  placement: Record<string, string[]>;
  items: Record<string, TierItem>;
  ownerUid: string;
  ownerName?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The unranked tray. */
export const POOL_ID = "__pool__";

/** Classic S→F red-to-green ramp. */
export const DEFAULT_TIERS: Tier[] = [
  { id: "s", label: "S", color: "#f87171" },
  { id: "a", label: "A", color: "#fb923c" },
  { id: "b", label: "B", color: "#fbbf24" },
  { id: "c", label: "C", color: "#facc15" },
  { id: "d", label: "D", color: "#a3e635" },
  { id: "f", label: "F", color: "#4ade80" },
];

export const TIER_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#facc15", "#a3e635",
  "#4ade80", "#34d399", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6", "#9ca3af",
];

let _seq = 0;
function uid(prefix = "i"): string {
  _seq += 1;
  const rnd =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.abs(((_seq * 2654435761) >>> 0)).toString(36);
  return `${prefix}_${rnd}${_seq.toString(36)}`;
}

export function newTierListId(): string {
  return uid("tl");
}

// ── Autocomplete over the card DB + heroes ───────────────────────────────────

export interface ItemSuggestion {
  label: string;
  imageUrl: string;
  kind: "card" | "hero";
  refId: string;
  sub: string; // class / "Hero" — shown dim in the dropdown
}

/** Combined, relevance-ranked suggestions across heroes + released cards. */
export function searchItems(q: string, max = 24): ItemSuggestion[] {
  const queryStr = q.trim();
  if (queryStr.length < 1) return [];
  const lower = queryStr.toLowerCase();

  const out: ItemSuggestion[] = [];
  for (const h of searchHeroes(queryStr)) {
    out.push({
      label: h.name,
      imageUrl: getHeroPortraitUrl(h.name) || h.imageUrl || "",
      kind: "hero",
      refId: `hero:${h.name}`,
      sub: "Hero",
    });
  }
  for (const c of searchCards(queryStr)) {
    out.push({
      label: c.name,
      imageUrl: c.imageUrl,
      kind: "card",
      refId: `card:${c.cardIdentifier}`,
      sub: c.classes[0] || c.types[0] || "Card",
    });
  }

  // Rank the FULL match set before trimming — prefix matches first, then shorter
  // names (closer matches), then alpha — so a prefix hit is never sliced away.
  out.sort((a, b) => {
    const ap = a.label.toLowerCase().startsWith(lower) ? 0 : 1;
    const bp = b.label.toLowerCase().startsWith(lower) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    if (a.label.length !== b.label.length) return a.label.length - b.label.length;
    return a.label.localeCompare(b.label);
  });
  return out.slice(0, max);
}

export function suggestionToItem(s: ItemSuggestion): TierItem {
  return { id: uid(), label: s.label, imageUrl: s.imageUrl, kind: s.kind, refId: s.refId };
}

export function makeCustomItem(label: string, imageUrl: string): TierItem {
  return { id: uid(), label: label.trim() || "Item", imageUrl: imageUrl.trim(), kind: "custom" };
}

export function makeTier(label: string): Tier {
  return { id: uid("t"), label, color: TIER_COLORS[0] };
}

// ── Firestore persistence ────────────────────────────────────────────────────

function tierListsCol() {
  return collection(db, "tierLists");
}

/** Create/overwrite a tier list. Owner-only per rules; public read for sharing. */
export async function saveTierList(list: TierListDoc): Promise<void> {
  await setDoc(doc(db, "tierLists", list.id), { ...list, updatedAt: new Date().toISOString() });
}

export async function getTierList(id: string): Promise<TierListDoc | null> {
  const snap = await getDoc(doc(db, "tierLists", id));
  return snap.exists() ? (snap.data() as TierListDoc) : null;
}

export async function listMyTierLists(ownerUid: string): Promise<TierListDoc[]> {
  const q = query(
    tierListsCol(),
    where("ownerUid", "==", ownerUid),
    orderBy("updatedAt", "desc"),
    fbLimit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TierListDoc);
}

export async function deleteTierList(id: string): Promise<void> {
  await deleteDoc(doc(db, "tierLists", id));
}
