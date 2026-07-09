import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Local copy of the store slug rule (kept in sync with store-directory.ts:7-9 and
// the aggregator). Duplicated here rather than imported to avoid a circular
// dependency (store-directory imports this module's index/expand helpers).
function slugify(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** An admin-defined grouping of store slugs that are really ONE store. */
export interface StoreAliasGroup {
  /** Canonical slug for the merged store (must be one of memberSlugs). */
  canonicalSlug: string;
  /** Forced display name shown for the merged store. */
  displayName: string;
  /** All slugs that belong to this store (includes canonicalSlug). */
  memberSlugs: string[];
  updatedAt: string;
  updatedBy: string;
}

export interface StoreAliasIndex {
  /** member slug -> canonical slug */
  memberToCanonical: Map<string, string>;
  /** canonical slug -> group */
  canonicalToGroup: Map<string, StoreAliasGroup>;
}

const CACHE_KEY = "fab_store_aliases";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/** Public-readable alias map (doc `admin/storeAliases`). Cached in localStorage. */
export async function getStoreAliases(): Promise<StoreAliasGroup[]> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { groups, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return groups as StoreAliasGroup[];
    }
  } catch {
    /* no window / bad JSON — fall through to a fresh read */
  }

  try {
    const snap = await getDoc(doc(db, "admin", "storeAliases"));
    if (!snap.exists()) return [];
    const groups = (snap.data().groups || []) as StoreAliasGroup[];
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ groups, ts: Date.now() }));
    } catch {
      /* storage unavailable */
    }
    return groups;
  } catch {
    return [];
  }
}

/** Admin write. Validates the invariants that keep distinct stores separate. */
export async function saveStoreAliases(groups: StoreAliasGroup[], adminUid: string): Promise<void> {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const cleaned: StoreAliasGroup[] = [];

  for (const g of groups) {
    const members = Array.from(
      new Set(g.memberSlugs.map(slugify).filter((s) => s.length >= 2)),
    );
    if (members.length < 2) {
      throw new Error("Each merge needs at least two stores.");
    }
    const canonical = slugify(g.canonicalSlug);
    if (!members.includes(canonical)) {
      throw new Error("The canonical store must be one of the merged stores.");
    }
    const displayName = g.displayName.trim();
    if (!displayName) {
      throw new Error("Each merge needs a display name.");
    }
    // No slug may belong to two groups — this is what keeps genuinely-different
    // stores (e.g. Magicsur Chile vs La Reina) from ever being combined.
    for (const m of members) {
      if (seen.has(m)) throw new Error(`Store "${m}" is in more than one merge.`);
      seen.add(m);
    }
    cleaned.push({ canonicalSlug: canonical, displayName, memberSlugs: members, updatedAt: now, updatedBy: adminUid });
  }

  await setDoc(doc(db, "admin", "storeAliases"), { groups: cleaned, updatedAt: now });
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ groups: cleaned, ts: Date.now() }));
  } catch {
    /* storage unavailable */
  }
}

export function invalidateStoreAliasCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* noop */
  }
}

export function buildAliasIndex(groups: StoreAliasGroup[]): StoreAliasIndex {
  const memberToCanonical = new Map<string, string>();
  const canonicalToGroup = new Map<string, StoreAliasGroup>();
  for (const g of groups) {
    canonicalToGroup.set(g.canonicalSlug, g);
    for (const m of g.memberSlugs) memberToCanonical.set(m, g.canonicalSlug);
  }
  return { memberToCanonical, canonicalToGroup };
}

/** Map a member slug to its canonical slug (or return it unchanged). */
export function resolveCanonicalSlug(slug: string, index: StoreAliasIndex): string {
  return index.memberToCanonical.get(slug) || slug;
}

/** The group a slug belongs to, if any (looks up via canonical). */
export function groupForSlug(slug: string, index: StoreAliasIndex): StoreAliasGroup | undefined {
  const canonical = index.memberToCanonical.get(slug);
  return canonical ? index.canonicalToGroup.get(canonical) : undefined;
}

/** Expand slugs to include every member slug of any group they belong to. */
export function expandSlugSet(slugs: string[], index: StoreAliasIndex): Set<string> {
  const out = new Set<string>();
  for (const slug of slugs) {
    out.add(slug);
    const group = groupForSlug(slug, index);
    if (group) for (const m of group.memberSlugs) out.add(m);
  }
  return out;
}
