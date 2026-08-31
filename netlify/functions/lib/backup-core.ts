/**
 * Firestore backup core, shared by the scheduled runner (firestore-backup.mts)
 * and the manual/status endpoint (firestore-backup-run.mts). Netlify blocks
 * HTTP invocation of scheduled functions, hence the split.
 *
 * Exports the full database via the managed exportDocuments API to
 * gs://<bucket>/firestore-backups/<stamp>/ and prunes exports older than
 * RETENTION_DAYS. Every run logs to the `backup-runs` collection.
 *
 * Restore (manual): gcloud firestore import gs://<bucket>/firestore-backups/<stamp>/
 */
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const PROJECT_ID = "fab-stats-fc757";
const BUCKET = "fab-stats-fc757.firebasestorage.app";
const PREFIX = "firestore-backups/";
const RETENTION_DAYS = 14;
/** Non-forced runs skip if a successful export started within this window. */
const MIN_INTERVAL_HOURS = 20;

function getAdminApp(): App {
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getApps()[0];
}

async function getAccessToken(app: App): Promise<string> {
  const credential = app.options.credential;
  if (!credential) throw new Error("Admin app has no credential");
  const { access_token } = await credential.getAccessToken();
  return access_token;
}

async function startExport(token: string, stamp: string): Promise<string> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default):exportDocuments`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ outputUriPrefix: `gs://${BUCKET}/${PREFIX}${stamp}` }),
    },
  );
  const body = (await res.json()) as { name?: string; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(`exportDocuments ${res.status}: ${body.error?.message || JSON.stringify(body)}`);
  }
  return body.name || "(no operation name)";
}

/**
 * Delete export objects older than RETENTION_DAYS — but ONLY when a recent
 * export (≤7 days) actually produced objects. If exports have been silently
 * failing async (permissions/quota surfacing operation-side), pruning must not
 * eat the last good backups. Best-effort.
 */
async function pruneOldExports(token: string): Promise<{ deleted: number; errors: number; skipped?: string }> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const items: { name: string; timeCreated: string }[] = [];
  let errors = 0;
  let pageToken: string | undefined;

  do {
    const listUrl = new URL(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`);
    listUrl.searchParams.set("prefix", PREFIX);
    listUrl.searchParams.set("fields", "items(name,timeCreated),nextPageToken");
    listUrl.searchParams.set("maxResults", "500");
    if (pageToken) listUrl.searchParams.set("pageToken", pageToken);

    const res = await fetch(listUrl, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return { deleted: 0, errors: 1, skipped: `list failed (${res.status})` };
    const body = (await res.json()) as {
      items?: { name: string; timeCreated: string }[];
      nextPageToken?: string;
    };
    items.push(...(body.items || []));
    pageToken = body.nextPageToken;
  } while (pageToken);

  const hasRecent = items.some((i) => new Date(i.timeCreated).getTime() >= recentCutoff);
  if (!hasRecent) {
    // No export produced objects in the last week — keep everything.
    return { deleted: 0, errors: 0, skipped: "no recent export objects; keeping old backups" };
  }

  let deleted = 0;
  for (const item of items) {
    if (new Date(item.timeCreated).getTime() >= cutoff) continue;
    const del = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(item.name)}`,
      { method: "DELETE", headers: { authorization: `Bearer ${token}` } },
    );
    if (del.ok || del.status === 404) deleted++;
    else errors++;
  }

  return { deleted, errors };
}

/** One quick poll of the export operation to catch fast failures (the export
 *  is long-running; a clean poll here means "started and not yet failed"). */
async function pollOperation(token: string, operation: string): Promise<{ done: boolean; error?: string }> {
  try {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`https://firestore.googleapis.com/v1/${operation}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { done: false };
    const body = (await res.json()) as { done?: boolean; error?: { message?: string } };
    if (body.error) return { done: true, error: body.error.message || "operation failed" };
    return { done: !!body.done };
  } catch {
    return { done: false };
  }
}

export interface BackupResult {
  ok: boolean;
  skipped?: string;
  operation?: string;
  pruned?: number;
  pruneErrors?: number;
  error?: string;
}

export function getBackupDb(): Firestore {
  getAdminApp();
  return getFirestore();
}

/** Most recent run record, for the status endpoint. */
export async function getLastRun(db: Firestore): Promise<{ ranAt: string; ok: boolean } | null> {
  try {
    const snap = await db.collection("backup-runs").orderBy("ranAt", "desc").limit(1).get();
    if (snap.empty) return null;
    const d = snap.docs[0].data() as { ranAt?: string; ok?: boolean };
    return { ranAt: d.ranAt ?? "", ok: !!d.ok };
  } catch {
    return null;
  }
}

export async function runBackup(force: boolean): Promise<BackupResult> {
  const app = getAdminApp();
  const db = getFirestore();
  const now = new Date();
  const runRef = db.collection("backup-runs").doc();

  try {
    if (!force) {
      const recent = await db.collection("backup-runs").orderBy("ranAt", "desc").limit(3).get();
      const cutoff = now.getTime() - MIN_INTERVAL_HOURS * 60 * 60 * 1000;
      const dupe = recent.docs.some((d) => {
        const data = d.data() as { ok?: boolean; ranAt?: string };
        return data.ok && data.ranAt && new Date(data.ranAt).getTime() > cutoff;
      });
      if (dupe) return { ok: true, skipped: "recent backup exists" };
    }

    const accessToken = await getAccessToken(app);
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const operation = await startExport(accessToken, stamp);

    // Catch fast operation-side failures (bad bucket, permissions) before
    // declaring success. A still-running operation is fine — pruning is
    // separately guarded on recent exports actually producing objects.
    const opStatus = await pollOperation(accessToken, operation);
    if (opStatus.error) {
      throw new Error(`export operation failed: ${opStatus.error}`);
    }

    const prune = await pruneOldExports(accessToken);

    await runRef.set({
      ranAt: now.toISOString(),
      ok: true,
      operation,
      outputPrefix: `gs://${BUCKET}/${PREFIX}${stamp}`,
      pruned: prune.deleted,
      pruneErrors: prune.errors,
      ...(prune.skipped ? { pruneSkipped: prune.skipped } : {}),
    });

    console.log(`[firestore-backup] Started ${operation}, pruned ${prune.deleted} old objects${prune.skipped ? ` (prune skipped: ${prune.skipped})` : ""}`);
    return { ok: true, operation, pruned: prune.deleted, pruneErrors: prune.errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[firestore-backup] Fatal:", message);
    await runRef.set({ ranAt: now.toISOString(), ok: false, error: message }).catch(() => {});
    return { ok: false, error: message };
  }
}
