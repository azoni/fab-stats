import { cards } from "@flesh-and-blood/cards";
import { Type } from "@flesh-and-blood/types";
import { getAdminDb } from "./firebase-admin.ts";
import { verifyFirebaseToken } from "./verify-auth.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key",
};

const CARD_IMAGE_CDN = "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large";
const INCLUDED_CARD_TYPES = new Set<string>([
  Type.Action,
  Type.Equipment,
  Type.Weapon,
  Type.Instant,
  Type.DefenseReaction,
  Type.AttackReaction,
]);

type ArticleStatus = "draft" | "published" | "archived";
type ArticleImageWidth = "standard" | "wide" | "full";
type ArticleCalloutTone = "note" | "tip" | "warning";

interface ArticleGalleryImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
}

type ArticleBlock =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "heading"; level: 2 | 3; text: string }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "list"; style: "bullet" | "numbered"; items: string[] }
  | { id: string; type: "divider" }
  | { id: string; type: "image"; url: string; alt?: string; caption?: string; width?: ArticleImageWidth }
  | { id: string; type: "gallery"; images: ArticleGalleryImage[]; columns?: 2 | 3 }
  | { id: string; type: "callout"; tone: ArticleCalloutTone; title?: string; text: string }
  | { id: string; type: "embed"; url: string; title?: string; caption?: string };

interface ArticleRecordData {
  authorUid: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoUrl?: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string;
  contentBlocks: ArticleBlock[];
  searchText: string;
  heroTags: string[];
  tags: string[];
  status: ArticleStatus;
  allowComments: boolean;
  readingMinutes: number;
  viewCount: number;
  commentCount: number;
  reactionCounts?: Partial<Record<"heart" | "fire" | "insight", number>>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface ExistingArticleData {
  id: string;
  authorUid: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoUrl?: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string;
  contentBlocks: ArticleBlock[];
  searchText: string;
  heroTags: string[];
  tags: string[];
  status: ArticleStatus;
  allowComments: boolean;
  readingMinutes: number;
  viewCount: number;
  commentCount: number;
  reactionCounts?: Partial<Record<"heart" | "fire" | "insight", number>>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface AuthorProfile {
  uid: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  isPublic?: boolean;
  hideFromFeed?: boolean;
  teamId?: string;
}

interface ResolvedCard {
  name: string;
  cardIdentifier: string;
  imageUrl: string;
  pitch?: number;
}

type CardRefInput =
  | string
  | {
    name?: unknown;
    cardIdentifier?: unknown;
    imageUrl?: unknown;
    alt?: unknown;
    caption?: unknown;
  };

interface AdminAuthResult {
  uid: string | null;
  email: string | null;
  via: "firebase" | "key";
}

const STATUS_VALUES = new Set<ArticleStatus>(["draft", "published", "archived"]);
const IMAGE_WIDTH_VALUES = new Set<ArticleImageWidth>(["standard", "wide", "full"]);
const CALLOUT_TONES = new Set<ArticleCalloutTone>(["note", "tip", "warning"]);

const cardRecords: ResolvedCard[] = cards
  .filter((card) => card.types.some((type) => INCLUDED_CARD_TYPES.has(String(type))))
  .map((card) => {
    const imageId = card.defaultImage || "";
    return {
      name: card.name,
      cardIdentifier: card.cardIdentifier,
      imageUrl: imageId ? `${CARD_IMAGE_CDN}/${imageId}.webp` : "",
      pitch: card.pitch,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name) || (a.pitch ?? 99) - (b.pitch ?? 99));

const cardsById = new Map<string, ResolvedCard>();
const cardsByNormalizedName = new Map<string, ResolvedCard[]>();
for (const card of cardRecords) {
  if (!cardsById.has(card.cardIdentifier)) cardsById.set(card.cardIdentifier, card);
  const key = normalizeLookupKey(card.name);
  const existing = cardsByNormalizedName.get(key) || [];
  existing.push(card);
  cardsByNormalizedName.set(key, existing);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeLookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanString(value: unknown, maxLen = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, maxLen) : "";
}

function cleanOptionalString(value: unknown, maxLen = 2000): string | undefined {
  const cleaned = cleanString(value, maxLen);
  return cleaned || undefined;
}

function cleanTagList(value: unknown, maxCount = 12, itemMaxLen = 48): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const deduped = new Set<string>();

  for (const item of source) {
    const cleaned = cleanString(item, itemMaxLen);
    if (!cleaned) continue;
    deduped.add(cleaned);
    if (deduped.size >= maxCount) break;
  }

  return Array.from(deduped);
}

function parseStatus(value: unknown, fallback: ArticleStatus): ArticleStatus {
  return typeof value === "string" && STATUS_VALUES.has(value as ArticleStatus)
    ? (value as ArticleStatus)
    : fallback;
}

function parseImageWidth(value: unknown): ArticleImageWidth | undefined {
  return typeof value === "string" && IMAGE_WIDTH_VALUES.has(value as ArticleImageWidth)
    ? (value as ArticleImageWidth)
    : undefined;
}

function parseCalloutTone(value: unknown): ArticleCalloutTone {
  return typeof value === "string" && CALLOUT_TONES.has(value as ArticleCalloutTone)
    ? (value as ArticleCalloutTone)
    : "note";
}

function parseGalleryColumns(value: unknown): 2 | 3 {
  return value === 3 ? 3 : 2;
}

function toInt(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function cleanReactionCounts(value: unknown): Partial<Record<"heart" | "fire" | "insight", number>> | undefined {
  if (!value || typeof value !== "object") return undefined;

  const result: Partial<Record<"heart" | "fire" | "insight", number>> = {};
  for (const key of ["heart", "fire", "insight"] as const) {
    const raw = (value as Record<string, unknown>)[key];
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      result[key] = Math.floor(raw);
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function getArticleText(block: ArticleBlock): string {
  if ("text" in block) {
    return "title" in block ? `${block.title || ""} ${block.text}`.trim() : block.text;
  }
  if ("items" in block) return block.items.join(" ");
  if (block.type === "image") return `${block.alt || ""} ${block.caption || ""}`.trim();
  if (block.type === "gallery") {
    return block.images.map((image) => `${image.alt || ""} ${image.caption || ""}`.trim()).join(" ");
  }
  if (block.type === "embed") {
    return [block.title || "", block.caption || "", block.url].join(" ").trim();
  }
  return "";
}

function estimateReadingMinutes(blocks: ArticleBlock[]): number {
  const words = blocks
    .map(getArticleText)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function buildSearchText(input: {
  title: string;
  excerpt: string;
  authorDisplayName: string;
  authorUsername: string;
  heroTags: string[];
  tags: string[];
  blocks: ArticleBlock[];
}): string {
  return [
    input.title,
    input.excerpt,
    input.authorDisplayName,
    input.authorUsername,
    input.heroTags.join(" "),
    input.tags.join(" "),
    input.blocks.map(getArticleText).join(" "),
  ]
    .join(" ")
    .trim()
    .toLowerCase()
    .slice(0, 8000);
}

function siteOrigin(req: Request): string {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return new URL(req.url).origin;
}

function isLooseRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeExistingArticle(id: string, raw: Record<string, unknown>): ExistingArticleData {
  return {
    id,
    authorUid: cleanString(raw.authorUid, 120),
    authorUsername: cleanString(raw.authorUsername, 80),
    authorDisplayName: cleanString(raw.authorDisplayName, 120),
    authorPhotoUrl: cleanOptionalString(raw.authorPhotoUrl, 2000),
    title: cleanString(raw.title, 180),
    slug: cleanString(raw.slug, 180),
    excerpt: cleanString(raw.excerpt, 600),
    coverImageUrl: cleanOptionalString(raw.coverImageUrl, 2000),
    contentBlocks: Array.isArray(raw.contentBlocks) ? (raw.contentBlocks as ArticleBlock[]) : [],
    searchText: cleanString(raw.searchText, 8000),
    heroTags: cleanTagList(raw.heroTags),
    tags: cleanTagList(raw.tags),
    status: parseStatus(raw.status, "draft"),
    allowComments: raw.allowComments !== false,
    readingMinutes: toInt(raw.readingMinutes, 1) || 1,
    viewCount: toInt(raw.viewCount, 0),
    commentCount: toInt(raw.commentCount, 0),
    reactionCounts: cleanReactionCounts(raw.reactionCounts),
    createdAt: cleanString(raw.createdAt, 40),
    updatedAt: cleanString(raw.updatedAt, 40),
    publishedAt: cleanOptionalString(raw.publishedAt, 40),
  };
}

function resolveCardByName(name: string): ResolvedCard | null {
  const normalized = normalizeLookupKey(name);
  if (!normalized) return null;

  const exact = cardsByNormalizedName.get(normalized);
  if (exact?.length) return exact[0];

  const partialMatches = cardRecords.filter((card) => normalizeLookupKey(card.name).includes(normalized));
  if (partialMatches.length === 1) return partialMatches[0];

  return null;
}

function resolveCardRef(ref: CardRefInput, location: string): ArticleGalleryImage {
  const raw = typeof ref === "string" ? { name: ref } : (isLooseRecord(ref) ? ref : {});
  const explicitId = cleanString(raw.cardIdentifier, 160);
  const name = cleanString(raw.name, 180);
  const manualImageUrl = cleanOptionalString(raw.imageUrl, 2000);
  const explicitAlt = cleanOptionalString(raw.alt, 180);
  const explicitCaption = cleanOptionalString(raw.caption, 280);

  let resolved: ResolvedCard | null = null;
  if (explicitId) resolved = cardsById.get(explicitId) || null;
  if (!resolved && name) resolved = resolveCardByName(name);

  if (resolved?.imageUrl) {
    return {
      id: makeId(),
      url: resolved.imageUrl,
      alt: explicitAlt || resolved.name,
      caption: explicitCaption,
    };
  }

  if (manualImageUrl) {
    return {
      id: makeId(),
      url: manualImageUrl,
      alt: explicitAlt || name || undefined,
      caption: explicitCaption,
    };
  }

  throw new Error(`Could not resolve card at ${location}. Provide a valid card name/cardIdentifier or a fallback imageUrl.`);
}

function sanitizeBlocks(input: unknown): ArticleBlock[] {
  if (!Array.isArray(input)) return [];

  const blocks: ArticleBlock[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const rawBlock = input[index];
    if (!isLooseRecord(rawBlock)) continue;

    const type = cleanString(rawBlock.type, 32);
    const id = cleanString(rawBlock.id, 80) || makeId();

    if (type === "paragraph") {
      const text = cleanString(rawBlock.text, 12000);
      if (text) blocks.push({ id, type: "paragraph", text });
      continue;
    }

    if (type === "heading") {
      const text = cleanString(rawBlock.text, 300);
      if (text) {
        blocks.push({
          id,
          type: "heading",
          level: rawBlock.level === 3 ? 3 : 2,
          text,
        });
      }
      continue;
    }

    if (type === "quote") {
      const text = cleanString(rawBlock.text, 4000);
      if (text) blocks.push({ id, type: "quote", text });
      continue;
    }

    if (type === "list") {
      const items = Array.isArray(rawBlock.items)
        ? rawBlock.items.map((item) => cleanString(item, 800)).filter(Boolean)
        : [];
      if (items.length) {
        blocks.push({
          id,
          type: "list",
          style: rawBlock.style === "numbered" ? "numbered" : "bullet",
          items,
        });
      }
      continue;
    }

    if (type === "divider") {
      blocks.push({ id, type: "divider" });
      continue;
    }

    if (type === "image") {
      const url = cleanString(rawBlock.url, 2000);
      if (url) {
        blocks.push({
          id,
          type: "image",
          url,
          alt: cleanOptionalString(rawBlock.alt, 180),
          caption: cleanOptionalString(rawBlock.caption, 280),
          width: parseImageWidth(rawBlock.width),
        });
      }
      continue;
    }

    if (type === "gallery") {
      const rawImages = Array.isArray(rawBlock.images) ? rawBlock.images : [];
      const images: ArticleGalleryImage[] = [];

      for (let imageIndex = 0; imageIndex < rawImages.length; imageIndex += 1) {
        const rawImage = rawImages[imageIndex];
        if (!isLooseRecord(rawImage)) continue;
        const url = cleanString(rawImage.url, 2000);
        if (!url) continue;
        images.push({
          id: cleanString(rawImage.id, 80) || makeId(),
          url,
          alt: cleanOptionalString(rawImage.alt, 180),
          caption: cleanOptionalString(rawImage.caption, 280),
        });
      }

      if (images.length) {
        blocks.push({
          id,
          type: "gallery",
          images,
          columns: parseGalleryColumns(rawBlock.columns),
        });
      }
      continue;
    }

    if (type === "callout") {
      const text = cleanString(rawBlock.text, 4000);
      const title = cleanOptionalString(rawBlock.title, 180);
      if (text || title) {
        blocks.push({
          id,
          type: "callout",
          tone: parseCalloutTone(rawBlock.tone),
          title,
          text,
        });
      }
      continue;
    }

    if (type === "embed") {
      const url = cleanString(rawBlock.url, 2000);
      if (url) {
        blocks.push({
          id,
          type: "embed",
          url,
          title: cleanOptionalString(rawBlock.title, 180),
          caption: cleanOptionalString(rawBlock.caption, 280),
        });
      }
      continue;
    }

    if (type === "card") {
      const image = resolveCardRef(
        {
          name: rawBlock.name,
          cardIdentifier: rawBlock.cardIdentifier,
          imageUrl: rawBlock.imageUrl,
          alt: rawBlock.alt,
          caption: rawBlock.caption,
        },
        `blocks[${index}]`,
      );
      blocks.push({
        id,
        type: "image",
        url: image.url,
        alt: image.alt,
        caption: image.caption,
        width: parseImageWidth(rawBlock.width) || "standard",
      });
      continue;
    }

    if (type === "cards") {
      const items = Array.isArray(rawBlock.items) ? rawBlock.items : [];
      const images = items.map((item, itemIndex) => resolveCardRef(item as CardRefInput, `blocks[${index}].items[${itemIndex}]`));
      if (images.length) {
        blocks.push({
          id,
          type: "gallery",
          images,
          columns: parseGalleryColumns(rawBlock.columns),
        });
      }
    }
  }

  return blocks;
}

async function isAdminUser(uid: string | null, email: string | null): Promise<boolean> {
  const db = getAdminDb();
  const snap = await db.collection("admin").doc("config").get();
  if (!snap.exists) return false;

  const data = snap.data() || {};
  const normalizedEmail = (email || "").trim().toLowerCase();
  const emailList = Array.isArray(data.adminEmails)
    ? data.adminEmails
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
    : [];
  const uidList = Array.isArray(data.adminUids)
    ? data.adminUids
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
    : [];

  return emailList.includes(normalizedEmail) || (!!uid && uidList.includes(uid));
}

async function authenticateAdminRequest(req: Request): Promise<AdminAuthResult | null> {
  const configuredKey = cleanString(process.env.ARTICLE_ADMIN_KEY || process.env.MCP_ADMIN_KEY, 200);
  const providedKey = cleanString(req.headers.get("x-admin-key"), 200);
  if (configuredKey && providedKey && providedKey === configuredKey) {
    return { uid: null, email: null, via: "key" };
  }

  const auth = await verifyFirebaseToken(req);
  if (!auth) return null;

  const allowed = await isAdminUser(auth.uid, auth.email);
  return allowed ? { uid: auth.uid, email: auth.email, via: "firebase" } : null;
}

async function resolveAuthorUid(
  input: Record<string, unknown>,
  auth: AdminAuthResult,
  existing: ExistingArticleData | null,
): Promise<string> {
  const db = getAdminDb();

  const authorUid = cleanString(input.authorUid, 120);
  if (authorUid) return authorUid;

  const authorUsername = cleanString(input.authorUsername, 80).toLowerCase();
  if (authorUsername) {
    const usernameSnap = await db.collection("usernames").doc(authorUsername).get();
    const userId = cleanString(usernameSnap.data()?.userId, 120);
    if (!userId) throw new Error(`Could not resolve author username "${authorUsername}".`);
    return userId;
  }

  if (existing?.authorUid) return existing.authorUid;
  if (auth.uid) return auth.uid;
  throw new Error("authorUid or authorUsername is required when using x-admin-key auth.");
}

async function getAuthorProfile(uid: string): Promise<AuthorProfile | null> {
  const db = getAdminDb();
  const snap = await db.doc(`users/${uid}/profile/main`).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  return {
    uid,
    username: cleanString(data.username, 80),
    displayName: cleanString(data.displayName, 120),
    photoUrl: cleanOptionalString(data.photoUrl, 2000),
    isPublic: data.isPublic === true,
    hideFromFeed: data.hideFromFeed === true,
    teamId: cleanOptionalString(data.teamId, 120),
  };
}

async function ensureUniqueSlug(slugRoot: string, excludeArticleId?: string): Promise<string> {
  const db = getAdminDb();
  const root = slugify(slugRoot || "article") || "article";
  let candidate = root;
  let counter = 2;

  while (true) {
    const snapshot = await db.collection("articles").where("slug", "==", candidate).limit(10).get();
    const collision = snapshot.docs.some((doc) => doc.id !== excludeArticleId);
    if (!collision) return candidate;
    candidate = `${root}-${counter}`;
    counter += 1;
  }
}

async function enrichFeedData(profile: AuthorProfile): Promise<Record<string, unknown>> {
  const db = getAdminDb();
  const extra: Record<string, unknown> = {};
  if (profile.photoUrl) extra.photoUrl = profile.photoUrl;

  if (profile.teamId) {
    extra.teamId = profile.teamId;
    try {
      const teamSnap = await db.collection("teams").doc(profile.teamId).get();
      if (teamSnap.exists) {
        const team = teamSnap.data() || {};
        const teamName = cleanOptionalString(team.name, 120);
        const teamIconUrl = cleanOptionalString(team.iconUrl, 2000);
        if (teamName) extra.teamName = teamName;
        if (teamIconUrl) extra.teamIconUrl = teamIconUrl;
      }
    } catch {
      // Best-effort only.
    }
  }

  return extra;
}

async function upsertArticleFeedEvent(profile: AuthorProfile, articleId: string, article: ArticleRecordData): Promise<void> {
  if (!profile.isPublic || profile.hideFromFeed) return;

  const db = getAdminDb();
  const base: Record<string, unknown> = {
    type: "article",
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: true,
    articleId,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    heroTags: article.heroTags,
    publishedAt: article.publishedAt || article.updatedAt,
    createdAt: article.publishedAt || article.updatedAt,
  };

  if (article.coverImageUrl) base.coverImageUrl = article.coverImageUrl;
  Object.assign(base, await enrichFeedData(profile));

  const existing = await db.collection("feedEvents")
    .where("type", "==", "article")
    .where("articleId", "==", articleId)
    .limit(1)
    .get();

  if (existing.empty) {
    await db.collection("feedEvents").add(base);
    return;
  }

  await existing.docs[0].ref.set(base, { merge: true });
}

async function deleteArticleFeedEvents(articleId: string): Promise<void> {
  const db = getAdminDb();
  const snapshot = await db.collection("feedEvents")
    .where("type", "==", "article")
    .where("articleId", "==", articleId)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();
  for (const doc of snapshot.docs) batch.delete(doc.ref);
  await batch.commit();
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = await authenticateAdminRequest(req);
  if (!auth) {
    return json(
      {
        error: "Admin authentication required",
        hint: "Send Authorization: Bearer <firebase id token> or X-Admin-Key: <ARTICLE_ADMIN_KEY|MCP_ADMIN_KEY>.",
      },
      401,
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!isLooseRecord(parsed)) throw new Error("Invalid body");
    body = parsed;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const db = getAdminDb();
    const articleId = cleanString(body.articleId, 120) || db.collection("articles").doc().id;
    const existingSnap = await db.collection("articles").doc(articleId).get();
    const existing = existingSnap.exists ? normalizeExistingArticle(articleId, existingSnap.data() || {}) : null;
    const title = hasOwn(body, "title")
      ? cleanString(body.title, 180)
      : (existing?.title || "");
    if (!title) return json({ error: "title is required" }, 400);

    const authorUid = await resolveAuthorUid(body, auth, existing);
    const authorProfile = await getAuthorProfile(authorUid);
    if (!authorProfile?.username || !authorProfile.displayName) {
      return json({ error: "Resolved author profile is missing username or displayName" }, 400);
    }

    const status = parseStatus(body.status, existing?.status || "draft");
    const excerpt = hasOwn(body, "excerpt")
      ? cleanString(body.excerpt, 600)
      : (existing?.excerpt || "");
    const heroTags = hasOwn(body, "heroTags")
      ? cleanTagList(body.heroTags)
      : (existing?.heroTags || []);
    const tags = hasOwn(body, "tags")
      ? cleanTagList(body.tags)
      : (existing?.tags || []);
    const allowComments = typeof body.allowComments === "boolean"
      ? body.allowComments
      : (existing?.allowComments ?? true);
    const hasBlocks = hasOwn(body, "contentBlocks") || hasOwn(body, "blocks");
    const blocksInput = Array.isArray(body.contentBlocks)
      ? body.contentBlocks
      : Array.isArray(body.blocks)
        ? body.blocks
        : [];
    const contentBlocks = hasBlocks ? sanitizeBlocks(blocksInput) : (existing?.contentBlocks || []);

    if (status === "published" && contentBlocks.length === 0) {
      return json({ error: "Published articles need at least one valid content block" }, 400);
    }

    const slugSource = hasOwn(body, "slug")
      ? cleanString(body.slug, 180)
      : (existing?.slug || title);
    const slug = await ensureUniqueSlug(slugSource, articleId);
    const now = new Date().toISOString();
    const publishedAt = status === "published"
      ? cleanOptionalString(body.publishedAt, 40) || existing?.publishedAt || now
      : existing?.publishedAt;

    const articleData: ArticleRecordData = {
      authorUid: authorProfile.uid,
      authorUsername: authorProfile.username,
      authorDisplayName: authorProfile.displayName,
      authorPhotoUrl: authorProfile.photoUrl,
      title,
      slug,
      excerpt,
      coverImageUrl: hasOwn(body, "coverImageUrl")
        ? cleanOptionalString(body.coverImageUrl, 2000)
        : existing?.coverImageUrl,
      contentBlocks,
      searchText: buildSearchText({
        title,
        excerpt,
        authorDisplayName: authorProfile.displayName,
        authorUsername: authorProfile.username,
        heroTags,
        tags,
        blocks: contentBlocks,
      }),
      heroTags,
      tags,
      status,
      allowComments,
      readingMinutes: estimateReadingMinutes(contentBlocks),
      viewCount: existing?.viewCount || 0,
      commentCount: existing?.commentCount || 0,
      reactionCounts: existing?.reactionCounts,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      publishedAt,
    };

    await db.collection("articles").doc(articleId).set(articleData);

    const shouldSyncFeed = status === "published" && body.createFeedEvent !== false;
    if (shouldSyncFeed) {
      await upsertArticleFeedEvent(authorProfile, articleId, articleData);
    } else {
      await deleteArticleFeedEvents(articleId);
    }

    const path = `/articles/${encodeURIComponent(slug)}`;
    return json({
      ok: true,
      articleId,
      status,
      slug,
      path,
      url: `${siteOrigin(req)}${path}`,
      author: {
        uid: authorProfile.uid,
        username: authorProfile.username,
        displayName: authorProfile.displayName,
      },
      blockCount: contentBlocks.length,
      feedSynced: shouldSyncFeed,
      publishedAt: publishedAt || null,
      authMode: auth.via,
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Could not create article" },
      400,
    );
  }
}
