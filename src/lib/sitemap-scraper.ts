import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  startAfter,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

// ── Types ──

export interface SitemapDecklist {
  slug: string;
  url: string;
  player: string;
  playerLower: string;
  hero: string;
  event: string;
  placement: string;
  cards: { name: string; count: number }[];
  gemDecklistId: string | null;
  scrapedAt: string;
  eventDate: string;
  eventUrl: string;
  format: string;
  country: string;
  countryCode: string;
  playerGemId: string;
}

export interface ScrapeStatus {
  totalUrls: number;
  scrapedCount: number;
  lastScrapeAt: string;
}

export interface DecklistFilters {
  hero?: string;
  player?: string;
  event?: string;
  pageSize?: number;
  lastSlug?: string;
}

// ── Auth Helper ──

async function getAuthToken(): Promise<string> {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

// ── Netlify Function Calls ──

export async function fetchSitemapUrls(): Promise<string[]> {
  const token = await getAuthToken();
  const res = await fetch("/.netlify/functions/sitemap-scrape?mode=sitemap", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch sitemap");
  }

  const data = await res.json();
  return data.urls;
}

export async function fetchDecklist(
  url: string
): Promise<Omit<SitemapDecklist, "playerLower" | "scrapedAt">> {
  const token = await getAuthToken();
  const res = await fetch(
    `/.netlify/functions/sitemap-scrape?mode=decklist&url=${encodeURIComponent(url)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch decklist: ${url}`);
  }

  const data = await res.json();
  return data.decklist;
}

// ── Firestore Operations ──

const COLLECTION = "sitemap-decklists";
const META_DOC = "sitemap-meta/scrape-status";

export async function getScrapedSlugs(): Promise<Set<string>> {
  const snap = await getDocs(collection(db, COLLECTION));
  const slugs = new Set<string>();
  for (const d of snap.docs) {
    slugs.add(d.id);
  }
  return slugs;
}

export async function saveDecklists(
  decklists: Omit<SitemapDecklist, "playerLower" | "scrapedAt">[]
): Promise<number> {
  const now = new Date().toISOString();
  let saved = 0;

  // Batch in groups of 400 (under Firestore 500 limit)
  for (let i = 0; i < decklists.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = decklists.slice(i, i + 400);

    for (const dl of chunk) {
      const docData: SitemapDecklist = {
        ...dl,
        playerLower: dl.player.toLowerCase(),
        scrapedAt: now,
      };
      batch.set(doc(db, COLLECTION, dl.slug), docData);
      saved++;
    }

    await batch.commit();
  }

  return saved;
}

export async function getScrapeStatus(): Promise<ScrapeStatus | null> {
  const snap = await getDoc(doc(db, META_DOC));
  if (!snap.exists()) return null;
  return snap.data() as ScrapeStatus;
}

export async function updateScrapeStatus(
  status: Partial<ScrapeStatus>
): Promise<void> {
  await setDoc(doc(db, META_DOC), status, { merge: true });
}

export async function searchDecklists(
  filters: DecklistFilters
): Promise<SitemapDecklist[]> {
  const constraints: QueryConstraint[] = [];

  if (filters.hero) {
    constraints.push(where("hero", "==", filters.hero));
  }

  if (filters.player) {
    const lower = filters.player.toLowerCase();
    constraints.push(where("playerLower", ">=", lower));
    constraints.push(where("playerLower", "<=", lower + "\uf8ff"));
  }

  if (filters.event) {
    constraints.push(where("event", "==", filters.event));
  }

  // If no player filter, add an orderBy for consistent pagination
  if (!filters.player) {
    constraints.push(orderBy("slug"));
  }

  constraints.push(limit(filters.pageSize || 50));

  if (filters.lastSlug) {
    const lastDoc = await getDoc(doc(db, COLLECTION, filters.lastSlug));
    if (lastDoc.exists()) {
      constraints.push(startAfter(lastDoc));
    }
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SitemapDecklist);
}

export async function getScrapedCount(): Promise<number> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.size;
}

export async function clearAllDecklists(): Promise<number> {
  const snap = await getDocs(collection(db, COLLECTION));
  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    for (const d of snap.docs.slice(i, i + 400)) {
      batch.delete(d.ref);
    }
    await batch.commit();
    deleted += Math.min(400, snap.docs.length - i);
  }
  analyticsCache = null;
  return deleted;
}

// ── Analytics ──

export interface DecklistSummary {
  hero: string;
  event: string;
  placement: string;
  player: string;
  eventDate: string;
  format: string;
  country: string;
  countryCode: string;
  playerGemId: string;
}

let analyticsCache: { data: DecklistSummary[]; ts: number } | null = null;
const ANALYTICS_CACHE_TTL = 10 * 60_000; // 10 minutes

export async function getAllDecklistSummaries(): Promise<DecklistSummary[]> {
  if (analyticsCache && Date.now() - analyticsCache.ts < ANALYTICS_CACHE_TTL) {
    return analyticsCache.data;
  }

  const snap = await getDocs(collection(db, COLLECTION));
  const data = snap.docs.map((d) => {
    const raw = d.data();
    return {
      hero: raw.hero || "",
      event: raw.event || "",
      placement: raw.placement || "",
      player: raw.player || "",
      eventDate: raw.eventDate || "",
      format: raw.format || "",
      country: raw.country || "",
      countryCode: raw.countryCode || "",
      playerGemId: raw.playerGemId || "",
    };
  });

  analyticsCache = { data, ts: Date.now() };
  return data;
}

export interface HeroMetaStat {
  hero: string;
  count: number;
  metaShare: number;
  placements: { label: string; count: number }[];
  wins: number;
  top8s: number;
  events: Set<string>;
}

export interface EventSummary {
  event: string;
  decklistCount: number;
  heroes: { hero: string; count: number; metaShare: number; placements: string[] }[];
}

export function computeHeroMeta(
  decklists: DecklistSummary[],
  eventFilter?: string
): HeroMetaStat[] {
  const filtered = eventFilter
    ? decklists.filter((d) => d.event === eventFilter)
    : decklists;

  const total = filtered.length;
  const heroMap = new Map<string, { count: number; placements: Map<string, number>; events: Set<string> }>();

  for (const dl of filtered) {
    if (!dl.hero) continue;
    let entry = heroMap.get(dl.hero);
    if (!entry) {
      entry = { count: 0, placements: new Map(), events: new Set() };
      heroMap.set(dl.hero, entry);
    }
    entry.count++;
    entry.events.add(dl.event);
    if (dl.placement) {
      entry.placements.set(dl.placement, (entry.placements.get(dl.placement) || 0) + 1);
    }
  }

  return [...heroMap.entries()]
    .map(([hero, data]) => {
      const placements = [...data.placements.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

      const wins = placements
        .filter((p) => /^1st$|^champion$/i.test(p.label))
        .reduce((s, p) => s + p.count, 0);

      const top8s = placements
        .filter((p) => /top\s*8|top\s*4|finalist|2nd|3rd|4th|5th|6th|7th|8th|champion|1st/i.test(p.label))
        .reduce((s, p) => s + p.count, 0);

      return {
        hero,
        count: data.count,
        metaShare: total > 0 ? Math.round((data.count / total) * 1000) / 10 : 0,
        placements,
        wins,
        top8s,
        events: data.events,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function computeEventSummaries(decklists: DecklistSummary[]): EventSummary[] {
  const eventMap = new Map<string, DecklistSummary[]>();
  for (const dl of decklists) {
    if (!dl.event) continue;
    const list = eventMap.get(dl.event) || [];
    list.push(dl);
    eventMap.set(dl.event, list);
  }

  return [...eventMap.entries()]
    .map(([event, entries]) => {
      const total = entries.length;
      const heroCount = new Map<string, { count: number; placements: string[] }>();
      for (const e of entries) {
        if (!e.hero) continue;
        const h = heroCount.get(e.hero) || { count: 0, placements: [] };
        h.count++;
        if (e.placement) h.placements.push(e.placement);
        heroCount.set(e.hero, h);
      }
      const heroes = [...heroCount.entries()]
        .map(([hero, data]) => ({
          hero,
          count: data.count,
          metaShare: total > 0 ? Math.round((data.count / total) * 1000) / 10 : 0,
          placements: data.placements,
        }))
        .sort((a, b) => b.count - a.count);

      return { event, decklistCount: total, heroes };
    })
    .sort((a, b) => b.decklistCount - a.decklistCount);
}
