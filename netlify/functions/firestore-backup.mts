/**
 * Scheduled Firestore backup. All logic lives in lib/backup-core.ts —
 * Netlify blocks HTTP invocation of scheduled functions, so manual runs and
 * status checks go through firestore-backup-run.mts instead.
 *
 * Cadence: WEEKLY. A managed export bills one document read per exported
 * document, and the database holds ~1.5–2M docs (users/*\/matches alone is
 * ~1.5M), so the original daily run was the single largest Firestore line
 * item (~$14–36/month). Weekly keeps three snapshots under the 21-day
 * retention at a seventh of the cost; a manual run (firestore-backup-run)
 * still forces one any time. Point-in-time recovery (storage-priced, no
 * per-read charge) is the better safety net and is an owner action in the
 * Firebase console.
 */
import type { Config } from "@netlify/functions";
import { runBackup } from "./lib/backup-core.ts";

export default async function handler(_req: Request) {
  const result = await runBackup(false);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { "content-type": "application/json" },
  });
}

// Sundays at 08:15 UTC (offset from the other scheduled functions).
export const config: Config = {
  schedule: "15 8 * * 0",
};
