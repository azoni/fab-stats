/**
 * Daily Firestore backup via the managed exportDocuments API.
 *
 * PITR is off (1-hour retention) and the recycle bin only covers matches, so
 * this is the site's only whole-database safety net. Exports the full database
 * to gs://<bucket>/firestore-backups/<timestamp>/ and prunes exports older
 * than RETENTION_DAYS. Each run logs to the `backup-runs` collection.
 *
 * Restore (manual, via gcloud):
 *   gcloud firestore import gs://<bucket>/firestore-backups/<timestamp>/
 *
 * Costs: the export bills one document read per document exported, and the
 * output occupies Storage until pruned. Both are pennies at current data size.
 *
 * Manual run: /.netlify/functions/firestore-backup?force=1&token=<AGGREGATOR_TOKEN>
 */
import type { Config } from "@netlify/functions";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "fab-stats-fc757";
const BUCKET = "fab-stats-fc757.firebasestorage.app";
const PREFIX = "firestore-backups/";
const RETENTION_DAYS = 14;
/** Scheduled runs skip if a successful export started within this window. */
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

/** Delete export objects older than RETENTION_DAYS. Best-effort. */
async function pruneOldExports(token: string): Promise<{ deleted: number; errors: number }> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;
  let errors = 0;
  let pageToken: string | undefined;

  do {
    const listUrl = new URL(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`);
    listUrl.searchParams.set("prefix", PREFIX);
    listUrl.searchParams.set("fields", "items(name,timeCreated),nextPageToken");
    listUrl.searchParams.set("maxResults", "500");
    if (pageToken) listUrl.searchParams.set("pageToken", pageToken);

    const res = await fetch(listUrl, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return { deleted, errors: errors + 1 };
    const body = (await res.json()) as {
      items?: { name: string; timeCreated: string }[];
      nextPageToken?: string;
    };

    for (const item of body.items || []) {
      if (new Date(item.timeCreated).getTime() >= cutoff) continue;
      const del = await fetch(
        `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(item.name)}`,
        { method: "DELETE", headers: { authorization: `Bearer ${token}` } },
      );
      if (del.ok || del.status === 404) deleted++;
      else errors++;
    }
    pageToken = body.nextPageToken;
  } while (pageToken);

  return { deleted, errors };
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const token = url.searchParams.get("token");
  const requiredToken = process.env.AGGREGATOR_TOKEN;

  // Manual/forced invocations require the shared-secret token when configured;
  // scheduled runs pass no params and skip the check.
  if (force && requiredToken && token !== requiredToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const app = getAdminApp();
  const db = getFirestore();
  const now = new Date();
  const runRef = db.collection("backup-runs").doc();

  try {
    // Throttle: one successful export per MIN_INTERVAL_HOURS unless forced.
    if (!force) {
      const recent = await db
        .collection("backup-runs")
        .orderBy("ranAt", "desc")
        .limit(3)
        .get();
      const cutoff = now.getTime() - MIN_INTERVAL_HOURS * 60 * 60 * 1000;
      const dupe = recent.docs.some((d) => {
        const data = d.data() as { ok?: boolean; ranAt?: string };
        return data.ok && data.ranAt && new Date(data.ranAt).getTime() > cutoff;
      });
      if (dupe) {
        return new Response(JSON.stringify({ ok: true, skipped: "recent backup exists" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    }

    const accessToken = await getAccessToken(app);
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const operation = await startExport(accessToken, stamp);
    const prune = await pruneOldExports(accessToken);

    await runRef.set({
      ranAt: now.toISOString(),
      ok: true,
      operation,
      outputPrefix: `gs://${BUCKET}/${PREFIX}${stamp}`,
      pruned: prune.deleted,
      pruneErrors: prune.errors,
    });

    console.log(`[firestore-backup] Started ${operation}, pruned ${prune.deleted} old objects`);
    return new Response(
      JSON.stringify({ ok: true, operation, pruned: prune.deleted, pruneErrors: prune.errors }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[firestore-backup] Fatal:", message);
    await runRef.set({ ranAt: now.toISOString(), ok: false, error: message }).catch(() => {});
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

// Daily at 08:15 UTC (offset from the other scheduled functions).
export const config: Config = {
  schedule: "15 8 * * *",
};
