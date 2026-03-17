import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
} from "firebase/firestore";
import { deleteObject, getStorage, ref as storageRef } from "firebase/storage";
import { app, db } from "@/lib/firebase";
import {
  PROFILE_BACKGROUND_OPTIONS,
  setRuntimeProfileBackgroundOptions,
  type ProfileBackgroundKind,
  type ProfileBackgroundOption,
  type ProfileBackgroundUnlockType,
} from "@/lib/profile-backgrounds";

const PROFILE_BACKGROUND_CATALOG_COLLECTION = "profileBackgroundCatalog";
const CACHE_TTL_MS = 5 * 60 * 1000;
const PERSIST_TTL_MS = 12 * 60 * 60 * 1000;
const LOCAL_STORAGE_CACHE_KEY_PREFIX = "fab.profileBackgroundCatalog.v1";
const MAX_CATALOG_OPTIONS = 1000;
const DEFAULT_STORAGE_BUCKET = "fab-stats-fc757.firebasestorage.app";

type CatalogScope = "public" | "all";

interface ScopeCache {
  options: ProfileBackgroundOption[] | null;
  cachedAt: number;
}

interface PersistedCatalogPayload {
  cachedAt: number;
  options: ProfileBackgroundOption[];
}

const scopeCache: Record<CatalogScope, ScopeCache> = {
  public: { options: null, cachedAt: 0 },
  all: { options: null, cachedAt: 0 },
};

const inFlightCatalogLoad: Partial<Record<CatalogScope, Promise<ProfileBackgroundOption[]>>> = {};
const optionCacheById = new Map<string, ProfileBackgroundOption>();

const VALID_KINDS: ProfileBackgroundKind[] = ["key-art", "playmat", "hero-art"];
const VALID_UNLOCK_TYPES: ProfileBackgroundUnlockType[] = ["achievement", "supporter", "manual"];

for (const option of PROFILE_BACKGROUND_OPTIONS) {
  optionCacheById.set(option.id, option);
}

function isValidKind(value: unknown): value is ProfileBackgroundKind {
  return typeof value === "string" && (VALID_KINDS as string[]).includes(value);
}

function isValidUnlockType(value: unknown): value is ProfileBackgroundUnlockType {
  return typeof value === "string" && (VALID_UNLOCK_TYPES as string[]).includes(value);
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getScope(includeAdmin: boolean): CatalogScope {
  return includeAdmin ? "all" : "public";
}

function getAllowedStorageBuckets(): Set<string> {
  const buckets = new Set<string>([DEFAULT_STORAGE_BUCKET, "fab-stats-fc757.appspot.com"]);
  const envBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (!envBucket) return buckets;
  buckets.add(envBucket);
  if (envBucket.endsWith(".firebasestorage.app")) {
    buckets.add(envBucket.replace(".firebasestorage.app", ".appspot.com"));
  }
  if (envBucket.endsWith(".appspot.com")) {
    buckets.add(envBucket.replace(".appspot.com", ".firebasestorage.app"));
  }
  return buckets;
}

function isAllowedLocalBackgroundUrl(url: string): boolean {
  return /^\/backgrounds\/[a-z0-9/_-]+\.(jpg|jpeg|png|webp)$/i.test(url);
}

function isAllowedStorageBackgroundUrl(url: string, folder: "full" | "thumb"): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.origin !== "https://firebasestorage.googleapis.com") return false;
  const pathMatch = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
  if (!pathMatch) return false;

  const bucket = decodeURIComponent(pathMatch[1]);
  if (!getAllowedStorageBuckets().has(bucket)) return false;

  const objectPath = decodeURIComponent(pathMatch[2]);
  const expectedPrefix = `profile-backgrounds/${folder}/`;
  if (!objectPath.startsWith(expectedPrefix)) return false;
  if (!/\.(jpg|jpeg|png|webp)$/i.test(objectPath)) return false;

  const alt = parsed.searchParams.get("alt");
  return alt === null || alt === "media";
}

function parseStorageBackgroundObject(
  url: string,
  folder: "full" | "thumb",
): { bucket: string; objectPath: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.origin !== "https://firebasestorage.googleapis.com") return null;
  const pathMatch = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
  if (!pathMatch) return null;

  const bucket = decodeURIComponent(pathMatch[1]);
  if (!getAllowedStorageBuckets().has(bucket)) return null;

  const objectPath = decodeURIComponent(pathMatch[2]);
  const expectedPrefix = `profile-backgrounds/${folder}/`;
  if (!objectPath.startsWith(expectedPrefix)) return null;
  if (!/\.(jpg|jpeg|png|webp)$/i.test(objectPath)) return null;

  return { bucket, objectPath };
}

function isAllowedCatalogImageUrl(url: string, folder: "full" | "thumb"): boolean {
  if (!url) return false;
  if (isAllowedLocalBackgroundUrl(url)) return true;
  return isAllowedStorageBackgroundUrl(url, folder);
}

function sanitizeOption(raw: unknown, fallbackId: string): ProfileBackgroundOption | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const id = typeof data.id === "string" && data.id.trim() ? data.id.trim() : fallbackId;
  const label = typeof data.label === "string" && data.label.trim() ? data.label.trim() : "";
  const imageUrl = typeof data.imageUrl === "string" && data.imageUrl.trim() ? data.imageUrl.trim() : "";
  if (!id || !label || !imageUrl) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/i.test(id)) return null;
  if (label.length > 80) return null;
  if (!isAllowedCatalogImageUrl(imageUrl, "full")) return null;

  const rawThumbnailUrl = typeof data.thumbnailUrl === "string" && data.thumbnailUrl.trim()
    ? data.thumbnailUrl.trim()
    : undefined;
  const thumbnailUrl = rawThumbnailUrl && isAllowedCatalogImageUrl(rawThumbnailUrl, "thumb")
    ? rawThumbnailUrl
    : undefined;

  const option: ProfileBackgroundOption = {
    id,
    label,
    imageUrl,
    kind: isValidKind(data.kind) ? data.kind : "key-art",
    focusPosition: typeof data.focusPosition === "string" && data.focusPosition.trim() ? data.focusPosition.trim() : undefined,
    adminOnly: data.adminOnly === true,
    thumbnailUrl,
    sortOrder: typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder) ? data.sortOrder : undefined,
    isActive: data.isActive !== false,
    unlockType: isValidUnlockType(data.unlockType) ? data.unlockType : undefined,
    unlockKey: typeof data.unlockKey === "string" && data.unlockKey.trim() ? data.unlockKey.trim() : undefined,
    unlockLabel: typeof data.unlockLabel === "string" && data.unlockLabel.trim() ? data.unlockLabel.trim() : undefined,
  };

  if (option.focusPosition && option.focusPosition.length > 40) return null;
  if (option.unlockKey && option.unlockKey.length > 120) return null;
  if (option.unlockLabel && option.unlockLabel.length > 120) return null;
  if (option.unlockType && !option.unlockKey) return null;

  return option;
}

function sortOptions(options: ProfileBackgroundOption[]): ProfileBackgroundOption[] {
  return [...options].sort((a, b) => {
    const aSort = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bSort = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (aSort !== bSort) return aSort - bSort;
    return a.label.localeCompare(b.label);
  });
}

function dedupeOptions(options: ProfileBackgroundOption[]): ProfileBackgroundOption[] {
  const byId = new Map<string, ProfileBackgroundOption>();
  for (const option of options) {
    byId.set(option.id, option);
  }
  return [...byId.values()];
}

function normalizeScopeOptions(options: ProfileBackgroundOption[], includeAdmin: boolean): ProfileBackgroundOption[] {
  return sortOptions(
    dedupeOptions(
      options.filter((opt) => opt.isActive !== false && (includeAdmin || !opt.adminOnly)),
    ),
  ).slice(0, MAX_CATALOG_OPTIONS);
}

function refreshRuntimeCatalogFromCache(): void {
  const merged = dedupeOptions([...PROFILE_BACKGROUND_OPTIONS, ...optionCacheById.values()]);
  setRuntimeProfileBackgroundOptions(sortOptions(merged));
}

function resetOptionCacheToDefaults(): void {
  optionCacheById.clear();
  for (const option of PROFILE_BACKGROUND_OPTIONS) {
    optionCacheById.set(option.id, option);
  }
  refreshRuntimeCatalogFromCache();
}

function clearPersistedScopeCatalog(scope: CatalogScope): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(`${LOCAL_STORAGE_CACHE_KEY_PREFIX}:${scope}`);
  } catch {
    // Ignore storage failures.
  }
}

export function invalidateProfileBackgroundCatalogCache(): void {
  scopeCache.public = { options: null, cachedAt: 0 };
  scopeCache.all = { options: null, cachedAt: 0 };
  clearPersistedScopeCatalog("public");
  clearPersistedScopeCatalog("all");
  resetOptionCacheToDefaults();
}

function persistScopeCatalog(scope: CatalogScope, options: ProfileBackgroundOption[]): void {
  if (!isBrowser()) return;
  const payload: PersistedCatalogPayload = { cachedAt: Date.now(), options };
  try {
    window.localStorage.setItem(`${LOCAL_STORAGE_CACHE_KEY_PREFIX}:${scope}`, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures (quota/private mode).
  }
}

function readPersistedScopeCatalog(scope: CatalogScope): ProfileBackgroundOption[] | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(`${LOCAL_STORAGE_CACHE_KEY_PREFIX}:${scope}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCatalogPayload;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.options)) return null;
    if (typeof parsed.cachedAt !== "number") return null;
    if (Date.now() - parsed.cachedAt > PERSIST_TTL_MS) return null;
    const sanitized = parsed.options
      .map((opt, idx) => sanitizeOption(opt, `persisted-${idx}`))
      .filter((opt): opt is ProfileBackgroundOption => Boolean(opt));
    return sanitized.length > 0 ? sanitized : null;
  } catch {
    return null;
  }
}

function updateScopeCache(scope: CatalogScope, options: ProfileBackgroundOption[]): ProfileBackgroundOption[] {
  const includeAdmin = scope === "all";
  const normalized = normalizeScopeOptions(options, includeAdmin);

  scopeCache[scope] = { options: normalized, cachedAt: Date.now() };
  for (const option of normalized) {
    optionCacheById.set(option.id, option);
  }
  refreshRuntimeCatalogFromCache();
  persistScopeCatalog(scope, normalized);

  return normalized;
}

function getDefaultCatalogForScope(scope: CatalogScope): ProfileBackgroundOption[] {
  const includeAdmin = scope === "all";
  return normalizeScopeOptions(PROFILE_BACKGROUND_OPTIONS, includeAdmin);
}

interface ReadCatalogOptions {
  includeAdmin?: boolean;
}

function getCachedScopeCatalog(scope: CatalogScope): ProfileBackgroundOption[] | null {
  const state = scopeCache[scope];
  if (state.options && state.options.length > 0) return state.options;
  const persisted = readPersistedScopeCatalog(scope);
  if (!persisted) return null;
  return updateScopeCache(scope, persisted);
}

function buildCatalogQuery(scope: CatalogScope): QueryConstraint[] {
  const constraints: QueryConstraint[] = [where("isActive", "==", true), limit(MAX_CATALOG_OPTIONS)];
  if (scope === "public") {
    constraints.push(where("adminOnly", "==", false));
  }
  return constraints;
}

async function fetchCatalogFromFirestore(scope: CatalogScope): Promise<ProfileBackgroundOption[]> {
  const colRef = collection(db, PROFILE_BACKGROUND_CATALOG_COLLECTION);

  try {
    const q = query(colRef, ...buildCatalogQuery(scope));
    const snap = await getDocs(q);
    const parsed = snap.docs
      .map((docSnap) => sanitizeOption(docSnap.data(), docSnap.id))
      .filter((opt): opt is ProfileBackgroundOption => Boolean(opt));
    return parsed;
  } catch {
    // Fallback for environments where a compound query index is unavailable.
  }

  const fallbackSnap = await getDocs(colRef);
  const parsed = fallbackSnap.docs
    .map((docSnap) => sanitizeOption(docSnap.data(), docSnap.id))
    .filter((opt): opt is ProfileBackgroundOption => Boolean(opt));
  return normalizeScopeOptions(parsed, scope === "all");
}

export function getCachedProfileBackgroundCatalog(options?: ReadCatalogOptions): ProfileBackgroundOption[] {
  const scope = getScope(options?.includeAdmin === true);
  const cached = getCachedScopeCatalog(scope);
  if (cached && cached.length > 0) return cached;
  const fallback = getDefaultCatalogForScope(scope);
  updateScopeCache(scope, fallback);
  return fallback;
}

interface LoadCatalogOptions extends ReadCatalogOptions {
  forceRefresh?: boolean;
}

export async function loadProfileBackgroundCatalog(options?: LoadCatalogOptions): Promise<ProfileBackgroundOption[]> {
  const scope = getScope(options?.includeAdmin === true);
  const forceRefresh = options?.forceRefresh === true;
  const scopeState = scopeCache[scope];
  const cacheFresh = scopeState.options && Date.now() - scopeState.cachedAt < CACHE_TTL_MS;
  if (!forceRefresh && cacheFresh) {
    refreshRuntimeCatalogFromCache();
    return scopeState.options!;
  }

  if (!forceRefresh) {
    const persisted = readPersistedScopeCatalog(scope);
    if (persisted && persisted.length > 0) {
      return updateScopeCache(scope, persisted);
    }
  }

  if (inFlightCatalogLoad[scope]) {
    return inFlightCatalogLoad[scope]!;
  }

  inFlightCatalogLoad[scope] = (async () => {
    try {
      const loaded = await fetchCatalogFromFirestore(scope);
      return updateScopeCache(scope, loaded);
    } catch {
      const fallback = getDefaultCatalogForScope(scope);
      return updateScopeCache(scope, fallback);
    } finally {
      delete inFlightCatalogLoad[scope];
    }
  })();

  return inFlightCatalogLoad[scope]!;
}

export async function loadProfileBackgroundOptionById(backgroundId: string): Promise<ProfileBackgroundOption | null> {
  const normalizedId = backgroundId?.trim();
  if (!normalizedId || normalizedId === "none") return null;
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/i.test(normalizedId)) return null;

  const cached = optionCacheById.get(normalizedId);
  if (cached) return cached;

  try {
    const ref = doc(db, PROFILE_BACKGROUND_CATALOG_COLLECTION, normalizedId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const parsed = sanitizeOption(snap.data(), normalizedId);
    if (!parsed) return null;

    optionCacheById.set(parsed.id, parsed);
    refreshRuntimeCatalogFromCache();

    // Keep scope caches warm without forcing full catalog reads.
    if (parsed.isActive !== false) {
      const allScopeCurrent = scopeCache.all.options ?? [];
      const allOptions = normalizeScopeOptions([...allScopeCurrent, parsed], true);
      scopeCache.all = { options: allOptions, cachedAt: Date.now() };
      persistScopeCatalog("all", allOptions);
      if (!parsed.adminOnly) {
        const publicScopeCurrent = scopeCache.public.options ?? [];
        const publicOptions = normalizeScopeOptions([...publicScopeCurrent, parsed], false);
        scopeCache.public = { options: publicOptions, cachedAt: Date.now() };
        persistScopeCatalog("public", publicOptions);
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

interface AdminCatalogLoadOptions {
  includeInactive?: boolean;
}

export async function loadProfileBackgroundCatalogForAdmin(options?: AdminCatalogLoadOptions): Promise<ProfileBackgroundOption[]> {
  const includeInactive = options?.includeInactive === true;
  const colRef = collection(db, PROFILE_BACKGROUND_CATALOG_COLLECTION);
  const snap = await getDocs(colRef);
  const parsed = snap.docs
    .map((docSnap) => sanitizeOption(docSnap.data(), docSnap.id))
    .filter((opt): opt is ProfileBackgroundOption => Boolean(opt));

  const normalized = sortOptions(dedupeOptions(parsed))
    .filter((opt) => includeInactive || opt.isActive !== false)
    .slice(0, MAX_CATALOG_OPTIONS);

  for (const option of normalized) {
    optionCacheById.set(option.id, option);
  }
  refreshRuntimeCatalogFromCache();

  return normalized;
}

export interface ProfileBackgroundCatalogVisibilityPatch {
  adminOnly?: boolean;
  isActive?: boolean;
  unlockType?: ProfileBackgroundUnlockType | null;
  unlockKey?: string | null;
  unlockLabel?: string | null;
}

export async function updateProfileBackgroundCatalogEntry(
  backgroundId: string,
  patch: ProfileBackgroundCatalogVisibilityPatch,
): Promise<void> {
  const id = backgroundId.trim();
  if (!id || !/^[a-z0-9][a-z0-9-]{1,79}$/i.test(id)) {
    throw new Error("Invalid background id.");
  }

  const payload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if ("adminOnly" in patch) payload.adminOnly = patch.adminOnly === true;
  if ("isActive" in patch) payload.isActive = patch.isActive !== false;

  if ("unlockType" in patch) {
    if (!patch.unlockType) {
      payload.unlockType = deleteField();
      payload.unlockKey = deleteField();
      payload.unlockLabel = deleteField();
    } else {
      if (!isValidUnlockType(patch.unlockType)) {
        throw new Error("Invalid unlock type.");
      }
      payload.unlockType = patch.unlockType;
    }
  }

  if ("unlockKey" in patch) {
    const unlockKey = patch.unlockKey?.trim() || "";
    payload.unlockKey = unlockKey ? unlockKey : deleteField();
  }

  if ("unlockLabel" in patch) {
    const unlockLabel = patch.unlockLabel?.trim() || "";
    payload.unlockLabel = unlockLabel ? unlockLabel : deleteField();
  }

  const keyLen = typeof payload.unlockKey === "string" ? payload.unlockKey.length : 0;
  const labelLen = typeof payload.unlockLabel === "string" ? payload.unlockLabel.length : 0;
  if (keyLen > 120) throw new Error("Unlock key must be 120 characters or fewer.");
  if (labelLen > 120) throw new Error("Unlock label must be 120 characters or fewer.");

  await updateDoc(doc(db, PROFILE_BACKGROUND_CATALOG_COLLECTION, id), payload);
  invalidateProfileBackgroundCatalogCache();
}

async function deleteStorageObjectIfPresent(bucket: string, objectPath: string): Promise<void> {
  try {
    const storage = getStorage(app, `gs://${bucket}`);
    await deleteObject(storageRef(storage, objectPath));
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "storage/object-not-found") return;
    throw error;
  }
}

export async function deleteProfileBackgroundFromStorage(background: ProfileBackgroundOption): Promise<void> {
  const full = parseStorageBackgroundObject(background.imageUrl, "full");
  const thumb = background.thumbnailUrl ? parseStorageBackgroundObject(background.thumbnailUrl, "thumb") : null;

  const deleteJobs: Promise<void>[] = [];

  if (full) {
    deleteJobs.push(deleteStorageObjectIfPresent(full.bucket, full.objectPath));
  }

  if (thumb && (!full || thumb.bucket !== full.bucket || thumb.objectPath !== full.objectPath)) {
    deleteJobs.push(deleteStorageObjectIfPresent(thumb.bucket, thumb.objectPath));
  }

  await Promise.all(deleteJobs);
  await updateProfileBackgroundCatalogEntry(background.id, { isActive: false });
}

function buildStorageMediaUrl(bucket: string, objectPath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

interface BuildDefaultCatalogOptions {
  useStorageUrls?: boolean;
  bucket?: string;
}

export function buildDefaultProfileBackgroundCatalog(options?: BuildDefaultCatalogOptions): ProfileBackgroundOption[] {
  const useStorageUrls = options?.useStorageUrls !== false;
  const bucket = options?.bucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "";

  return PROFILE_BACKGROUND_OPTIONS.map((opt, index) => {
    const extMatch = opt.imageUrl.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch?.[1]?.toLowerCase() || "jpg";
    const fullObjectPath = `profile-backgrounds/full/${opt.id}.${ext}`;
    const thumbObjectPath = `profile-backgrounds/thumb/${opt.id}.${ext}`;

    const imageUrl = useStorageUrls && bucket
      ? buildStorageMediaUrl(bucket, fullObjectPath)
      : opt.imageUrl;

    const thumbnailUrl = useStorageUrls && bucket
      ? buildStorageMediaUrl(bucket, thumbObjectPath)
      : (opt.thumbnailUrl || opt.imageUrl);

    return {
      ...opt,
      imageUrl,
      thumbnailUrl,
      sortOrder: index,
      isActive: true,
    };
  });
}

interface SyncCatalogOptions extends BuildDefaultCatalogOptions {
  onProgress?: (done: number, total: number, id: string) => void;
  deactivateMissing?: boolean;
}

export async function syncProfileBackgroundCatalogFromDefaults(options?: SyncCatalogOptions): Promise<{ upserted: number }> {
  const seedRaw = buildDefaultProfileBackgroundCatalog({
    useStorageUrls: options?.useStorageUrls,
    bucket: options?.bucket,
  });
  const seed = normalizeScopeOptions(seedRaw, true);

  const seen = new Set<string>();
  for (const option of seed) {
    if (seen.has(option.id)) {
      throw new Error(`Duplicate background id in seed catalog: ${option.id}`);
    }
    seen.add(option.id);
  }

  const total = seed.length;
  let done = 0;
  const batchSize = 400;
  const updatedAt = new Date().toISOString();

  for (let i = 0; i < seed.length; i += batchSize) {
    const chunk = seed.slice(i, i + batchSize);
    const batch = writeBatch(db);

    for (const option of chunk) {
      const ref = doc(db, PROFILE_BACKGROUND_CATALOG_COLLECTION, option.id);
      batch.set(
        ref,
        {
          id: option.id,
          label: option.label,
          imageUrl: option.imageUrl,
          thumbnailUrl: option.thumbnailUrl || option.imageUrl,
          kind: option.kind,
          focusPosition: option.focusPosition || "center center",
          adminOnly: option.adminOnly === true,
          sortOrder: option.sortOrder ?? 0,
          isActive: option.isActive !== false,
          unlockType: option.unlockType || deleteField(),
          unlockKey: option.unlockKey || deleteField(),
          unlockLabel: option.unlockLabel || deleteField(),
          updatedAt,
        },
        { merge: true },
      );
    }

    await batch.commit();

    for (const option of chunk) {
      done++;
      options?.onProgress?.(done, total, option.id);
    }
  }

  if (options?.deactivateMissing === true) {
    const existingSnap = await getDocs(collection(db, PROFILE_BACKGROUND_CATALOG_COLLECTION));
    const seedIds = new Set(seed.map((opt) => opt.id));
    const staleDocs = existingSnap.docs.filter((docSnap) => !seedIds.has(docSnap.id));
    for (let i = 0; i < staleDocs.length; i += batchSize) {
      const chunk = staleDocs.slice(i, i + batchSize);
      const batch = writeBatch(db);
      for (const docSnap of chunk) {
        batch.set(doc(db, PROFILE_BACKGROUND_CATALOG_COLLECTION, docSnap.id), {
          isActive: false,
          updatedAt,
        }, { merge: true });
      }
      await batch.commit();
    }
  }

  updateScopeCache("all", seed);
  updateScopeCache("public", seed);
  return { upserted: total };
}
