/**
 * Manual trigger + status endpoint for the Firestore backup (the scheduled
 * function itself can't be invoked over HTTP).
 *
 *   GET  ?token=<AGGREGATOR_TOKEN>  → run a backup now (bypasses the throttle)
 *   GET  (no/invalid token)         → last run status only ({ranAt, ok})
 */
import { runBackup, getLastRun, getBackupDb } from "./lib/backup-core.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const requiredToken = process.env.AGGREGATOR_TOKEN;

  const authorized = !!requiredToken && token === requiredToken;

  if (!authorized) {
    // Public status: enough to see the safety net is alive, nothing more.
    const last = await getLastRun(getBackupDb()).catch(() => null);
    return json({ lastRun: last });
  }

  // Authorized manual runs always force (bypass the daily throttle).
  const result = await runBackup(true);
  return json(result, result.ok ? 200 : 500);
}
