/**
 * Scheduled Netlify function — auto-syncs GEM match history for opted-in users.
 * Runs daily at 7:30 AM UTC (15-minute timeout for scheduled functions).
 */
import type { Config } from "@netlify/functions";
import { getAdminDb } from "./firebase-admin.ts";
import { decrypt, type EncryptedData } from "./lib/gem-crypto.ts";
import { gemLogin, scrapeHistory, convertToImportFormat, GemLoginError } from "./lib/gem-scraper.ts";
import { processServerImport } from "./lib/gem-import-pipeline.ts";

export const config: Config = {
  schedule: "30 7 * * *", // 7:30 AM UTC daily
};

const MAX_USERS_PER_RUN = 50;
const MAX_RUNTIME_MS = 14 * 60 * 1000; // 14 minutes (leave 1 min buffer)
const DELAY_BETWEEN_USERS_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler() {
  const startTime = Date.now();
  const db = getAdminDb();

  console.log("[gem-auto-sync] Starting scheduled sync run");

  // Query all enabled credentials, ordered by oldest sync first
  const credSnap = await db
    .collection("gem-credentials")
    .where("syncEnabled", "==", true)
    .orderBy("lastSyncAt", "asc")
    .limit(MAX_USERS_PER_RUN)
    .get();

  if (credSnap.empty) {
    console.log("[gem-auto-sync] No users with auto-sync enabled");
    return new Response("No users to sync", { status: 200 });
  }

  console.log(`[gem-auto-sync] Processing ${credSnap.size} users`);

  let processed = 0;
  let imported = 0;
  let errors = 0;

  for (const credDoc of credSnap.docs) {
    // Check time budget
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      console.log(`[gem-auto-sync] Time limit reached after ${processed} users`);
      break;
    }

    const userId = credDoc.id;
    const data = credDoc.data();

    try {
      // Decrypt credentials
      const username = decrypt(data.encryptedUsername as EncryptedData);
      const password = decrypt(data.encryptedPassword as EncryptedData);

      // Login to GEM
      let cookies: string;
      try {
        cookies = await gemLogin(username, password);
      } catch (err) {
        const isLoginError = err instanceof GemLoginError;
        const errorMsg = isLoginError ? err.message : "Login failed";
        const failures = (data.consecutiveFailures || 0) + 1;

        const updates: Record<string, unknown> = {
          lastSyncStatus: "error",
          lastSyncError: errorMsg,
          consecutiveFailures: failures,
        };

        // Disable after too many consecutive failures
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
          updates.syncEnabled = false;
          updates.disabledReason = "repeated_failures";
          console.warn(`[gem-auto-sync] Disabled user ${userId} after ${failures} consecutive failures`);
        }

        await credDoc.ref.update(updates);

        // Update profile
        const profileRef = db.collection("users").doc(userId).collection("profile").doc("main");
        await profileRef.update({
          "gemSyncStatus.lastStatus": "error",
          "gemSyncStatus.lastError": failures >= MAX_CONSECUTIVE_FAILURES
            ? "Auto-sync disabled due to repeated login failures. Please reconnect."
            : errorMsg,
          ...(failures >= MAX_CONSECUTIVE_FAILURES ? { "gemSyncStatus.enabled": false } : {}),
        }).catch(() => {});

        errors++;
        continue;
      }

      // Scrape history (incremental from last sync)
      const sinceDate = data.lastSyncAt
        ? data.lastSyncAt.split("T")[0]
        : undefined;

      const { events, userGemId } = await scrapeHistory(cookies, { sinceDate });
      const payload = convertToImportFormat(events, userGemId);

      // Import matches
      const result = await processServerImport(userId, payload.matches, userGemId);

      // Update credential doc
      await credDoc.ref.update({
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: "success",
        lastSyncError: null,
        consecutiveFailures: 0,
      });

      imported += result.imported;
      processed++;

      if (result.imported > 0) {
        console.log(`[gem-auto-sync] User ${userId}: imported ${result.imported} new matches`);
      }
    } catch (err) {
      console.error(`[gem-auto-sync] Error for user ${userId}:`, err);

      // Check if this is a GEM-wide issue (5xx)
      const is5xx = err instanceof Error && /HTTP 5\d{2}/.test(err.message);
      if (is5xx) {
        console.error("[gem-auto-sync] GEM appears to be down (5xx). Stopping run.");
        break;
      }

      await credDoc.ref.update({
        lastSyncStatus: "error",
        lastSyncError: "Unexpected sync error",
        consecutiveFailures: (data.consecutiveFailures || 0) + 1,
      }).catch(() => {});

      errors++;
    }

    // Delay between users to avoid hammering GEM
    await delay(DELAY_BETWEEN_USERS_MS);
  }

  const summary = `Processed ${processed} users, imported ${imported} matches, ${errors} errors`;
  console.log(`[gem-auto-sync] ${summary}`);

  return new Response(summary, { status: 200 });
}
