/**
 * Server-authoritative cosmetics wallet. All coin minting / spending happens
 * here via the admin SDK; the wallet + inventory docs are write-locked in
 * firestore.rules so clients can only READ them. Authenticated by the caller's
 * Firebase ID token. Multiplexed by `action` (grant now; purchase/gacha later).
 */
import { getAdminDb } from "./firebase-admin.ts";
import { verifyFirebaseToken } from "./verify-auth.ts";
import { reconcileWallet, purgeWallet } from "./lib/cosmetics-economy.ts";

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

interface WalletRequestBody {
  action?: string;
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

  let body: WalletRequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const db = getAdminDb();
  try {
    switch (body.action) {
      case "grant": {
        const { minted, balance } = await reconcileWallet(db, auth.uid);
        return json({ ok: true, minted, balance });
      }
      case "deleteAccount": {
        // Called during account deletion; the caller can only purge their OWN
        // economy docs (uid comes from the verified token, never the body).
        await purgeWallet(db, auth.uid);
        return json({ ok: true });
      }
      default:
        return json({ error: "Unsupported action" }, 400);
    }
  } catch (err) {
    return json({ error: "Server error", detail: String((err as Error)?.message ?? err) }, 500);
  }
}
