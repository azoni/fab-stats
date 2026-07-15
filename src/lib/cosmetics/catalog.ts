/**
 * Client access to the cosmetic shop/gacha catalog (`cosmeticCatalog/{itemId}`).
 * Public-readable SKUs; admin-only validated writes (gated by firestore.rules).
 * Read-modelled after profile-background-catalog: in-memory + localStorage cache
 * with a short TTL, plus an unfiltered admin loader.
 *
 * A SKU is rendered by <CosmeticPreview> purely from (category, previewKind,
 * previewValue), so equipped cosmetics render on ANY player's profile from the
 * equipped-id — the viewer only needs the (public) catalog, not the owner's wallet.
 */
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { SEED_COSMETICS } from "./seed-cosmetics";

export type CosmeticCategory =
  | "avatarFrame"
  | "companion"
  | "aura"
  | "nameplate"
  | "background"
  | "trophySkin"
  | "cursor";

export type CosmeticRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  name: string;
  description: string;
  price: number;
  /** Render selector for <CosmeticPreview> (e.g. "avatarFrame", "companion"). */
  previewKind: string;
  /** Pipe-delimited render params (e.g. "heraldic|gold|4"). */
  previewValue: string;
  /** Optional id this SKU unlocks in a legacy system (background/trophy/cursor). */
  grantsId?: string;
  gachaPool?: string;
  gachaWeight?: number;
  isActive: boolean;
  shopVisible: boolean;
  sortOrder: number;
  updatedAt?: string;
}

export const CATALOG_COLLECTION = "cosmeticCatalog";
/** Only these keys may be written — must match validCosmeticCatalogDoc in firestore.rules. */
export const CATALOG_DOC_KEYS: (keyof CosmeticItem)[] = [
  "id",
  "category",
  "rarity",
  "name",
  "description",
  "price",
  "previewKind",
  "previewValue",
  "grantsId",
  "gachaPool",
  "gachaWeight",
  "isActive",
  "shopVisible",
  "sortOrder",
  "updatedAt",
];

export const COSMETIC_CATEGORIES: CosmeticCategory[] = [
  "avatarFrame",
  "companion",
  "aura",
  "nameplate",
  "background",
  "trophySkin",
  "cursor",
];

export const RARITY_ORDER: Record<CosmeticRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export const RARITY_LABELS: Record<CosmeticRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

/** Default price ladder by rarity (SKUs may override via their own `price`). */
export const PRICE_BY_RARITY: Record<CosmeticRarity, number> = {
  common: 300,
  uncommon: 800,
  rare: 2000,
  epic: 5000,
  legendary: 12000,
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const PERSIST_TTL_MS = 12 * 60 * 60 * 1000;
const LS_KEY = "fab.cosmeticCatalog.v1";
const MAX_ITEMS = 1000;

let memCache: { items: CosmeticItem[]; at: number } | null = null;
let inFlight: Promise<CosmeticItem[]> | null = null;
const byId = new Map<string, CosmeticItem>();

const ID_RE = /^[a-z0-9][a-z0-9-]{1,79}$/i;

function isRarity(v: unknown): v is CosmeticRarity {
  return v === "common" || v === "uncommon" || v === "rare" || v === "epic" || v === "legendary";
}
function isCategory(v: unknown): v is CosmeticCategory {
  return (COSMETIC_CATEGORIES as string[]).includes(v as string);
}

/** Strict per-field validation; returns null for anything malformed. */
export function sanitizeCosmetic(raw: unknown): CosmeticItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) return null;
  if (!isCategory(r.category) || !isRarity(r.rarity)) return null;
  if (typeof r.name !== "string" || !r.name || r.name.length > 80) return null;
  const price = typeof r.price === "number" && Number.isFinite(r.price) ? Math.max(0, Math.round(r.price)) : 0;
  const item: CosmeticItem = {
    id: r.id,
    category: r.category,
    rarity: r.rarity,
    name: r.name,
    description: typeof r.description === "string" ? r.description.slice(0, 300) : "",
    price,
    previewKind: typeof r.previewKind === "string" ? r.previewKind.slice(0, 40) : r.category,
    previewValue: typeof r.previewValue === "string" ? r.previewValue.slice(0, 600) : "",
    isActive: r.isActive !== false,
    shopVisible: r.shopVisible !== false,
    sortOrder: typeof r.sortOrder === "number" && Number.isFinite(r.sortOrder) ? r.sortOrder : 0,
  };
  if (typeof r.grantsId === "string" && r.grantsId) item.grantsId = r.grantsId.slice(0, 120);
  if (typeof r.gachaPool === "string" && r.gachaPool) item.gachaPool = r.gachaPool.slice(0, 60);
  if (typeof r.gachaWeight === "number" && Number.isFinite(r.gachaWeight)) item.gachaWeight = Math.max(0, Math.round(r.gachaWeight));
  if (typeof r.updatedAt === "string") item.updatedAt = r.updatedAt.slice(0, 40);
  return item;
}

function sortCatalog(items: CosmeticItem[]): CosmeticItem[] {
  return [...items].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] ||
      a.name.localeCompare(b.name),
  );
}

function indexById(items: CosmeticItem[]) {
  byId.clear();
  for (const it of items) byId.set(it.id, it);
}

/** The default catalog is the bundled SEED_COSMETICS — so the shop, rendering,
 *  and purchases all work with ZERO admin seeding. Any Firestore cosmeticCatalog
 *  doc (admin override / custom SKU) takes precedence by id. */
function mergeWithSeed(remote: CosmeticItem[]): CosmeticItem[] {
  const map = new Map<string, CosmeticItem>();
  for (const it of SEED_COSMETICS) map.set(it.id, it);
  for (const it of remote) map.set(it.id, it);
  return [...map.values()].filter((i) => i.isActive !== false);
}

// Seed the id index immediately so getCosmeticById resolves before any fetch
// (e.g. rendering an equipped cosmetic on a profile on first paint).
indexById(sortCatalog(SEED_COSMETICS));

function readPersisted(): CosmeticItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; items: unknown[] };
    if (!parsed || typeof parsed.at !== "number" || Date.now() - parsed.at > PERSIST_TTL_MS) return null;
    const items = (parsed.items ?? []).map(sanitizeCosmetic).filter(Boolean) as CosmeticItem[];
    return items;
  } catch {
    return null;
  }
}

function writePersisted(items: CosmeticItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ at: Date.now(), items }));
  } catch {
    /* quota / private mode */
  }
}

async function fetchActiveFromFirestore(): Promise<CosmeticItem[]> {
  // Equipped cosmetics must be renderable even when not shop-visible, so we fetch
  // ALL active SKUs; the shop UI filters on `shopVisible` separately.
  try {
    const q = query(collection(db, CATALOG_COLLECTION), where("isActive", "==", true), limit(MAX_ITEMS));
    const snap = await getDocs(q);
    const remote = snap.docs.map((d) => sanitizeCosmetic({ id: d.id, ...d.data() })).filter(Boolean) as CosmeticItem[];
    return mergeWithSeed(remote);
  } catch {
    // Missing index / offline: fall back to the bundled defaults (never empty).
    try {
      const snap = await getDocs(query(collection(db, CATALOG_COLLECTION), limit(MAX_ITEMS)));
      const remote = snap.docs
        .map((d) => sanitizeCosmetic({ id: d.id, ...d.data() }))
        .filter((x): x is CosmeticItem => !!x && x.isActive);
      return mergeWithSeed(remote);
    } catch {
      return mergeWithSeed([]);
    }
  }
}

/** Async load (cache → persisted → network), de-duped across concurrent callers. */
export async function loadCosmeticCatalog(forceRefresh = false): Promise<CosmeticItem[]> {
  if (!forceRefresh && memCache && Date.now() - memCache.at < CACHE_TTL_MS) return memCache.items;
  if (!forceRefresh) {
    const persisted = readPersisted();
    if (persisted && persisted.length) {
      const sorted = sortCatalog(persisted);
      memCache = { items: sorted, at: Date.now() };
      indexById(sorted);
      // Kick a background refresh but return the persisted view immediately.
      if (!inFlight) inFlight = fetchActiveFromFirestore().then((items) => {
        const s = sortCatalog(items);
        memCache = { items: s, at: Date.now() };
        indexById(s);
        writePersisted(s);
        inFlight = null;
        return s;
      }).catch(() => { inFlight = null; return sorted; });
      return sorted;
    }
  }
  if (inFlight) return inFlight;
  inFlight = fetchActiveFromFirestore()
    .then((items) => {
      const sorted = sortCatalog(items);
      memCache = { items: sorted, at: Date.now() };
      indexById(sorted);
      writePersisted(sorted);
      inFlight = null;
      return sorted;
    })
    .catch(() => {
      inFlight = null;
      return memCache?.items ?? [];
    });
  return inFlight;
}

/** Synchronous best-effort accessor. Falls back to the bundled defaults (never
 *  empty), so the shop and rendering work before any Firestore fetch resolves. */
export function getCachedCosmeticCatalog(): CosmeticItem[] {
  if (memCache) return memCache.items;
  const persisted = readPersisted();
  const base = persisted && persisted.length ? mergeWithSeed(persisted) : sortCatalog(SEED_COSMETICS);
  const sorted = sortCatalog(base);
  memCache = { items: sorted, at: 0 }; // at:0 → next load() refreshes
  indexById(sorted);
  return sorted;
}

/** Resolve a SKU by id from the loaded catalog (undefined if unknown/inactive). */
export function getCosmeticById(id: string | undefined | null): CosmeticItem | undefined {
  if (!id) return undefined;
  if (byId.size === 0) getCachedCosmeticCatalog();
  return byId.get(id);
}

/** Direct single-doc fetch (fallback when the full catalog isn't cached yet). */
export async function fetchCosmeticById(id: string): Promise<CosmeticItem | null> {
  const cached = byId.get(id);
  if (cached) return cached;
  try {
    const snap = await getDoc(doc(db, CATALOG_COLLECTION, id));
    if (!snap.exists()) return null;
    const item = sanitizeCosmetic({ id: snap.id, ...snap.data() });
    if (item) byId.set(item.id, item);
    return item;
  } catch {
    return null;
  }
}

/** Admin-scope loader: every doc incl. inactive/hidden, unsorted-filtered. */
export async function loadCosmeticCatalogForAdmin(): Promise<CosmeticItem[]> {
  const snap = await getDocs(query(collection(db, CATALOG_COLLECTION), limit(MAX_ITEMS)));
  const items = snap.docs.map((d) => sanitizeCosmetic({ id: d.id, ...d.data() })).filter(Boolean) as CosmeticItem[];
  return sortCatalog(items);
}

function toDocPayload(item: CosmeticItem): Record<string, unknown> {
  // Emit EXACTLY the whitelisted keys (rules use keys().hasOnly). Omit undefined
  // optionals rather than writing null so hasOnly stays satisfied.
  const out: Record<string, unknown> = {
    id: item.id,
    category: item.category,
    rarity: item.rarity,
    name: item.name,
    description: item.description ?? "",
    // Clamp to the bounds in firestore.rules' validCosmeticCatalogDoc so an
    // out-of-range admin edit can't trigger a PERMISSION_DENIED on save.
    price: Math.min(1_000_000, Math.max(0, Math.round(item.price))),
    previewKind: item.previewKind,
    previewValue: item.previewValue,
    isActive: item.isActive !== false,
    shopVisible: item.shopVisible !== false,
    sortOrder: Math.min(100_000, Math.max(0, Math.round(Number(item.sortOrder) || 0))),
    updatedAt: new Date().toISOString(),
  };
  if (item.grantsId) out.grantsId = item.grantsId;
  if (item.gachaPool) out.gachaPool = item.gachaPool;
  if (typeof item.gachaWeight === "number") out.gachaWeight = Math.min(100_000, Math.max(0, Math.round(item.gachaWeight)));
  return out;
}

/** Admin write: full-replace a single SKU doc (guaranteed keys().hasOnly-valid). */
export async function saveCosmeticCatalogEntry(item: CosmeticItem): Promise<void> {
  await setDoc(doc(db, CATALOG_COLLECTION, item.id), toDocPayload(item));
  memCache = null; // invalidate so next load refetches
}

/** Admin batch seed/upsert (chunks of 400). */
export async function seedCosmeticCatalog(items: CosmeticItem[]): Promise<number> {
  let written = 0;
  for (let i = 0; i < items.length; i += 400) {
    const chunk = items.slice(i, i + 400);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const clean = sanitizeCosmetic(item);
      if (!clean) continue;
      batch.set(doc(db, CATALOG_COLLECTION, clean.id), toDocPayload(clean));
      written++;
    }
    await batch.commit();
  }
  memCache = null;
  return written;
}
