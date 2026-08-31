/**
 * Scheduled daily Firestore backup. All logic lives in lib/backup-core.ts —
 * Netlify blocks HTTP invocation of scheduled functions, so manual runs and
 * status checks go through firestore-backup-run.mts instead.
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

// Daily at 08:15 UTC (offset from the other scheduled functions).
export const config: Config = {
  schedule: "15 8 * * *",
};
