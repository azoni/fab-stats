/**
 * Netlify function for managing encrypted GEM credentials.
 * Actions: connect, disconnect, status, test
 * Credentials are AES-256-GCM encrypted and stored in Firestore (server-only).
 */
import { verifyFirebaseToken } from "./verify-auth.ts";
import { getAdminDb } from "./firebase-admin.ts";
import { encrypt, decrypt } from "./lib/gem-crypto.ts";
import { gemLogin, GemLoginError } from "./lib/gem-scraper.ts";
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
    const body = await req.json();
    const action = body?.action as string;

    const db = getAdminDb();
    const credRef = db.collection("gem-credentials").doc(uid);

    switch (action) {
      case "connect": {
        const { username, password } = body;
        if (!username || !password) {
          return json({ error: "Username and password are required" }, 400);
        }

        // Validate credentials by attempting login
        try {
          await gemLogin(username, password);
        } catch (err) {
          if (err instanceof GemLoginError) {
            return json({ error: err.message }, 401);
          }
          throw err;
        }

        // Encrypt and store
        const encUsername = encrypt(username);
        const encPassword = encrypt(password);

        await credRef.set({
          encryptedUsername: encUsername,
          encryptedPassword: encPassword,
          connectedAt: new Date().toISOString(),
          lastSyncAt: null,
          lastSyncStatus: null,
          lastSyncError: null,
          syncEnabled: true,
          consecutiveFailures: 0,
        });

        // Update user profile with sync status
        const profileRef = db.collection("users").doc(uid).collection("profile").doc("main");
        await profileRef.update({
          "gemSyncStatus.enabled": true,
          "gemSyncStatus.lastStatus": "connected",
        });

        return json({ success: true, message: "GEM account connected" });
      }

      case "disconnect": {
        // Delete the credential document entirely
        await credRef.delete();

        // Update user profile
        const profileRef = db.collection("users").doc(uid).collection("profile").doc("main");
        await profileRef.update({
          "gemSyncStatus.enabled": false,
          "gemSyncStatus.lastStatus": "disconnected",
        });

        return json({ success: true, message: "GEM account disconnected" });
      }

      case "status": {
        const doc = await credRef.get();
        if (!doc.exists) {
          return json({ connected: false });
        }
        const data = doc.data()!;
        return json({
          connected: true,
          syncEnabled: data.syncEnabled,
          connectedAt: data.connectedAt,
          lastSyncAt: data.lastSyncAt,
          lastSyncStatus: data.lastSyncStatus,
          lastSyncError: data.lastSyncError,
        });
      }

      case "test": {
        const { username, password } = body;
        if (!username || !password) {
          return json({ error: "Username and password are required" }, 400);
        }
        try {
          await gemLogin(username, password);
          return json({ success: true, message: "Credentials are valid" });
        } catch (err) {
          if (err instanceof GemLoginError) {
            return json({ success: false, error: err.message });
          }
          throw err;
        }
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("gem-credentials error:", err);
    return json({ error: "Internal error" }, 500);
  }
}
