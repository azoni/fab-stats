/**
 * Verify a Firebase ID token. Returns the user's UID and email if valid, or
 * null if invalid/missing.
 *
 * firebase-admin checks the JWT's signature against Google's public keys
 * (cached in-process), audience, issuer and expiry locally, then confirms the
 * account is not disabled/deleted/revoked (checkRevoked). The previous
 * implementation POSTed every token to the Identity Toolkit REST API
 * (accounts:lookup); that path is kept only as a fallback for environments
 * without a service account.
 *
 * Usage in Netlify functions:
 *   const auth = await verifyFirebaseToken(req);
 *   if (!auth) return new Response("Unauthorized", { status: 401 });
 *   // auth.uid, auth.email
 */
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./firebase-admin.ts";

export interface FirebaseAuthResult {
  uid: string;
  email: string | null;
}

export async function verifyFirebaseToken(req: Request): Promise<FirebaseAuthResult | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const idToken = authHeader.slice(7);
  if (!idToken) return null;

  let app: ReturnType<typeof getAdminApp> | null = null;
  try {
    app = getAdminApp();
  } catch {
    app = null; // no service account configured → REST fallback below
  }

  if (app) {
    try {
      // checkRevoked=true keeps the pre-change semantics: accounts:lookup
      // rejected disabled/deleted accounts immediately, and so does this
      // (one admin-side user lookup per call; malformed/expired tokens still
      // fail locally before any network call).
      const decoded = await getAuth(app).verifyIdToken(idToken, true);
      if (!decoded.uid) return null;
      return { uid: decoded.uid, email: decoded.email || null };
    } catch {
      return null; // invalid, expired, revoked, disabled, or wrong-project token
    }
  }

  return verifyViaRest(idToken);
}

async function verifyViaRest(idToken: string): Promise<FirebaseAuthResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const user = data?.users?.[0];
    const uid = user?.localId;
    if (!uid) return null;
    return { uid, email: user?.email || null };
  } catch {
    return null;
  }
}
