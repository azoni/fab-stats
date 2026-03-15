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
