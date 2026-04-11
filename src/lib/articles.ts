import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  increment,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ArticleBlock, ArticleReactionKey, ArticleRecord, ArticleStatus } from "@/types";

const ARTICLES_COLLECTION = "articles";

function articlesCollection() {
  return collection(db, ARTICLES_COLLECTION);
}

function articleDoc(articleId: string) {
  return doc(db, ARTICLES_COLLECTION, articleId);
}

export function createArticleId(): string {
  return doc(articlesCollection()).id;
}

function cleanReactionCounts(input: unknown): Partial<Record<ArticleReactionKey, number>> | undefined {
  if (!input || typeof input !== "object") return undefined;

  const reactionCounts: Partial<Record<ArticleReactionKey, number>> = {};
  for (const key of ["fire", "heart", "insight"] as const) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      reactionCounts[key] = value;
    }
  }

  return Object.keys(reactionCounts).length > 0 ? reactionCounts : undefined;
}

function cleanArticleRecord(data: Record<string, unknown>, id: string): ArticleRecord {
  return {
    id,
    authorUid: String(data.authorUid || ""),
    authorUsername: String(data.authorUsername || ""),
    authorDisplayName: String(data.authorDisplayName || ""),
    authorPhotoUrl: typeof data.authorPhotoUrl === "string" ? data.authorPhotoUrl : undefined,
    title: String(data.title || ""),
    slug: String(data.slug || ""),
    excerpt: String(data.excerpt || ""),
    coverImageUrl: typeof data.coverImageUrl === "string" ? data.coverImageUrl : undefined,
    contentBlocks: Array.isArray(data.contentBlocks) ? (data.contentBlocks as ArticleBlock[]) : [],
    searchText: String(data.searchText || ""),
    heroTags: Array.isArray(data.heroTags) ? data.heroTags.map((v) => String(v)) : [],
    tags: Array.isArray(data.tags) ? data.tags.map((v) => String(v)) : [],
    status: (data.status as ArticleStatus) || "draft",
    allowComments: data.allowComments !== false,
    readingMinutes: typeof data.readingMinutes === "number" ? data.readingMinutes : 1,
    viewCount: typeof data.viewCount === "number" ? data.viewCount : 0,
    commentCount: typeof data.commentCount === "number" ? data.commentCount : 0,
    reactionCounts: cleanReactionCounts(data.reactionCounts),
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || data.createdAt || ""),
    publishedAt: typeof data.publishedAt === "string" ? data.publishedAt : undefined,
  };
}

function sortByPublishedDesc(a: ArticleRecord, b: ArticleRecord): number {
  return new Date(b.publishedAt || b.updatedAt || b.createdAt).getTime()
    - new Date(a.publishedAt || a.updatedAt || a.createdAt).getTime();
}

function extractBlockText(block: ArticleBlock): string {
  if ("text" in block) {
    return "title" in block ? `${block.title || ""} ${block.text}`.trim() : block.text;
  }
  if ("items" in block) return block.items.join(" ");
  if (block.type === "image") return `${block.caption || ""} ${block.alt || ""}`.trim();
  if (block.type === "gallery") {
    return block.images.map((image) => `${image.caption || ""} ${image.alt || ""}`.trim()).join(" ");
  }
  if (block.type === "embed") {
    return [block.title || "", block.caption || "", block.url].join(" ").trim();
  }
  return "";
}

export function articleHref(slug: string): string {
  return `/articles/${encodeURIComponent(slug)}`;
}

// Reject obviously broken photo URLs (truncated/malformed data URLs, etc.)
// so the UI can fall back to the letter avatar instead of triggering
// net::ERR_INVALID_URL on a corrupt src.
export function isLikelyValidPhotoUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:")) {
    // Must be image/* and base64 with non-empty payload, no whitespace.
    if (/\s/.test(trimmed)) return false;
    const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+)$/.exec(trimmed);
    if (!match) return false;
    // Browsers reject extremely long data URLs; cap at ~1.5MB to be safe.
    if (trimmed.length > 1_500_000) return false;
    return match[1].length > 0;
  }
  return /^https?:\/\//i.test(trimmed);
}

export function getArticlePrimaryImage(article: Pick<ArticleRecord, "coverImageUrl" | "contentBlocks">): string | undefined {
  if (article.coverImageUrl) return article.coverImageUrl;
  for (const block of article.contentBlocks) {
    if (block.type === "image") return block.url;
    if (block.type === "gallery") return block.images[0]?.url;
  }
  return undefined;
}

export function estimateReadingMinutes(blocks: ArticleBlock[]): number {
  const text = blocks.map(extractBlockText).join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function buildArticleSearchText(input: {
  title: string;
  excerpt: string;
  authorDisplayName: string;
  authorUsername: string;
  heroTags: string[];
  tags: string[];
  blocks: ArticleBlock[];
}): string {
  const blockText = input.blocks.map(extractBlockText).join(" ");

  return [
    input.title,
    input.excerpt,
    input.authorDisplayName,
    input.authorUsername,
    input.heroTags.join(" "),
    input.tags.join(" "),
    blockText,
  ].join(" ").trim().toLowerCase();
}

export async function getPublishedArticles(limitCount = 100): Promise<ArticleRecord[]> {
  const constraints: QueryConstraint[] = [
    orderBy("publishedAt", "desc"),
    limit(limitCount),
  ];
  const snapshot = await getDocs(query(articlesCollection(), ...constraints));
  return snapshot.docs
    .map((d) => cleanArticleRecord(d.data() as Record<string, unknown>, d.id))
    .filter((article) => article.status === "published");
}

export async function getArticleBySlug(slug: string): Promise<ArticleRecord | null> {
  const snapshot = await getDocs(query(articlesCollection(), where("slug", "==", slug), limit(5)));
  const articles = snapshot.docs
    .map((d) => cleanArticleRecord(d.data() as Record<string, unknown>, d.id))
    .filter((article) => article.status === "published")
    .sort(sortByPublishedDesc);
  return articles[0] || null;
}

export async function getArticleById(articleId: string): Promise<ArticleRecord | null> {
  const snapshot = await getDoc(articleDoc(articleId));
  if (!snapshot.exists()) return null;
  return cleanArticleRecord(snapshot.data() as Record<string, unknown>, snapshot.id);
}

export async function slugExists(slug: string, excludeArticleId?: string): Promise<boolean> {
  const snapshot = await getDocs(query(articlesCollection(), where("slug", "==", slug), limit(10)));
  return snapshot.docs.some((docSnapshot) => docSnapshot.id !== excludeArticleId);
}

export async function ensureUniqueArticleSlug(baseSlug: string, excludeArticleId?: string): Promise<string> {
  const root = baseSlug.trim() || "article";
  let candidate = root;
  let counter = 2;

  while (await slugExists(candidate, excludeArticleId)) {
    candidate = `${root}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export async function getArticlesByAuthorUid(authorUid: string, limitCount = 12): Promise<ArticleRecord[]> {
  const snapshot = await getDocs(query(articlesCollection(), where("authorUid", "==", authorUid)));
  return snapshot.docs
    .map((d) => cleanArticleRecord(d.data() as Record<string, unknown>, d.id))
    .filter((article) => article.status === "published")
    .sort(sortByPublishedDesc)
    .slice(0, limitCount);
}

export async function getArticleDraftsByAuthorUid(authorUid: string): Promise<ArticleRecord[]> {
  const snapshot = await getDocs(query(articlesCollection(), where("authorUid", "==", authorUid)));
  return snapshot.docs
    .map((d) => cleanArticleRecord(d.data() as Record<string, unknown>, d.id))
    .filter((article) => article.status !== "published")
    .sort((a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
    );
}

export async function getArticlesByAuthorUsername(authorUsername: string, limitCount = 12): Promise<ArticleRecord[]> {
  const snapshot = await getDocs(query(articlesCollection(), where("authorUsername", "==", authorUsername)));
  return snapshot.docs
    .map((d) => cleanArticleRecord(d.data() as Record<string, unknown>, d.id))
    .filter((article) => article.status === "published")
    .sort(sortByPublishedDesc)
    .slice(0, limitCount);
}

export async function createArticle(article: Omit<ArticleRecord, "id">): Promise<ArticleRecord> {
  const docRef = await addDoc(articlesCollection(), article);
  return { ...article, id: docRef.id };
}

export async function saveArticle(articleId: string, article: Omit<ArticleRecord, "id">): Promise<ArticleRecord> {
  await setDoc(articleDoc(articleId), article);
  return { ...article, id: articleId };
}

export async function updateArticle(articleId: string, updates: Partial<ArticleRecord>): Promise<void> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== "id") clean[key] = value;
  }
  await updateDoc(articleDoc(articleId), clean);
}

export async function incrementArticleCommentCount(articleId: string, delta: 1 | -1): Promise<void> {
  await updateDoc(articleDoc(articleId), {
    commentCount: increment(delta),
    updatedAt: new Date().toISOString(),
  });
}

export async function incrementArticleViewCount(articleId: string): Promise<void> {
  await updateDoc(articleDoc(articleId), {
    viewCount: increment(1),
  });
}
