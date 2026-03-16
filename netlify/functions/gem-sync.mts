/**
 * On-demand GEM sync — triggered by user clicking "Sync Now".
 * Scrapes pages 1-2 of GEM history (10-second timeout constraint).
 */
import { verifyFirebaseToken } from "./verify-auth.ts";
import { getAdminDb } from "./firebase-admin.ts";
import { decrypt, type EncryptedData } from "./lib/gem-crypto.ts";
import { gemLogin, scrapeHistory, convertToImportFormat, GemLoginError } from "./lib/gem-scraper.ts";
import { processServerImport } from "./lib/gem-import-pipeline.ts";
import { isAdminEmail } from "./lib/admin-check.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
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
    return json({ error: "Authentication required" }, 401);
  }

  const { uid, email } = auth;

  // Admin-only for now
  if (!(await isAdminEmail(email))) {
    return json({ error: "This feature is currently admin-only" }, 403);
  }

  try {
    const db = getAdminDb();
    const credRef = db.collection("gem-credentials").doc(uid);
    const credDoc = await credRef.get();

    if (!credDoc.exists) {
      return json({ error: "No GEM credentials found. Please connect your GEM account first." }, 404);
    }

    const data = credDoc.data()!;
    if (!data.syncEnabled) {
      return json({ error: "Auto-sync is disabled for this account" }, 403);
    }

    // Update sync status to "syncing"
    const profileRef = db.collection("users").doc(uid).collection("profile").doc("main");
    await profileRef.update({ "gemSyncStatus.lastStatus": "syncing" });

    // Decrypt credentials
    const username = decrypt(data.encryptedUsername as EncryptedData);
    const password = decrypt(data.encryptedPassword as EncryptedData);

    // Login to GEM
    let cookies: string;
    try {
      cookies = await gemLogin(username, password);
    } catch (err) {
      const errorMsg = err instanceof GemLoginError ? err.message : "Login failed";
      await credRef.update({
        lastSyncStatus: "error",
        lastSyncError: errorMsg,
        consecutiveFailures: (data.consecutiveFailures || 0) + 1,
      });
      await profileRef.update({
        "gemSyncStatus.lastStatus": "error",
        "gemSyncStatus.lastError": errorMsg,
      });
      return json({ error: errorMsg }, 401);
    }

    // Scrape only 2 pages for on-demand sync (speed constraint)
    const { events, userGemId } = await scrapeHistory(cookies, { maxPages: 2 });
    const payload = convertToImportFormat(events, userGemId);

    // Import matches
    const result = await processServerImport(uid, payload.matches, userGemId);

    // Update credential doc with sync timestamps
    await credRef.update({
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: "success",
      lastSyncError: null,
      consecutiveFailures: 0,
    });

    return json({
      success: true,
      imported: result.imported,
      total: result.total,
      skippedDuplicates: result.skippedDuplicates,
    });
  } catch (err) {
    console.error("gem-sync error:", err);

    // Update profile status on error
    try {
      const db = getAdminDb();
      const profileRef = db.collection("users").doc(uid).collection("profile").doc("main");
      await profileRef.update({
        "gemSyncStatus.lastStatus": "error",
        "gemSyncStatus.lastError": "Sync failed unexpectedly",
      });
    } catch {
      // Best effort
    }

    return json({ error: "Sync failed" }, 500);
  }
}
