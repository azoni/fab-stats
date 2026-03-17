import { getStorage } from "firebase-admin/storage";
import { getAdminDb } from "./firebase-admin.ts";
import { verifyFirebaseToken } from "./verify-auth.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const DEFAULT_BUCKET = "fab-stats-fc757.firebasestorage.app";

interface DeleteBackgroundRequestBody {
  action?: string;
  backgroundId?: string;
  imageUrl?: string;
  thumbnailUrl?: string | null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function getAllowedBuckets(): Set<string> {
  const buckets = new Set<string>([DEFAULT_BUCKET, "fab-stats-fc757.appspot.com"]);
  const envBucket = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").trim();
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

function parseStorageObject(url: string, folder: "full" | "thumb"): { bucket: string; objectPath: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.origin !== "https://firebasestorage.googleapis.com") return null;
  const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
  if (!match) return null;

  const bucket = decodeURIComponent(match[1]);
  if (!getAllowedBuckets().has(bucket)) return null;

  const objectPath = decodeURIComponent(match[2]);
  const expectedPrefix = `profile-backgrounds/${folder}/`;
  if (!objectPath.startsWith(expectedPrefix)) return null;
  if (!/\.(jpg|jpeg|png|webp)$/i.test(objectPath)) return null;
  return { bucket, objectPath };
}

async function isAdminUser(uid: string, email: string | null): Promise<boolean> {
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

  return emailList.includes(normalizedEmail) || uidList.includes(uid);
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = await verifyFirebaseToken(req);
  if (!auth) {
    return json({ error: "Authentication required", code: "storage/unauthenticated" }, 401);
  }

  const canAdmin = await isAdminUser(auth.uid, auth.email);
  if (!canAdmin) {
    return json({ error: "Admin required", code: "storage/unauthorized" }, 403);
  }

  let body: DeleteBackgroundRequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.action !== "delete-storage-background") {
    return json({ error: "Unsupported action" }, 400);
  }

  const full = body.imageUrl ? parseStorageObject(body.imageUrl, "full") : null;
  const thumb = body.thumbnailUrl ? parseStorageObject(body.thumbnailUrl, "thumb") : null;

  if (!full && !thumb) {
    return json({ error: "No valid storage object URLs were provided" }, 400);
  }

  const targets = new Map<string, { bucket: string; objectPath: string }>();
  if (full) targets.set(`${full.bucket}/${full.objectPath}`, full);
  if (thumb) targets.set(`${thumb.bucket}/${thumb.objectPath}`, thumb);

  const storage = getStorage();
  const deleted: string[] = [];
  const failed: string[] = [];

  for (const target of targets.values()) {
    try {
      await storage.bucket(target.bucket).file(target.objectPath).delete({ ignoreNotFound: true });
      deleted.push(`${target.bucket}/${target.objectPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      failed.push(`${target.bucket}/${target.objectPath}: ${message}`);
    }
  }

  if (failed.length > 0) {
    return json(
      {
        ok: false,
        error: "Failed to delete one or more storage objects",
        code: "storage/unknown",
        deletedCount: deleted.length,
        failed,
      },
      500,
    );
  }

  return json({
    ok: true,
    backgroundId: body.backgroundId || null,
    deletedCount: deleted.length,
    deleted,
  });
}
