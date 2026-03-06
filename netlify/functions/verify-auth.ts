/**
 * Verify a Firebase ID token by calling the Google Identity Toolkit REST API.
 * Returns the user's UID and email if valid, or null if invalid/missing.
 *
 * Usage in Netlify functions:
 *   const auth = await verifyFirebaseToken(req);
 *   if (!auth) return new Response("Unauthorized", { status: 401 });
 *   // auth.uid, auth.email
 */
export interface FirebaseAuthResult {
  uid: string;
  email: string | null;
}

export async function verifyFirebaseToken(req: Request): Promise<FirebaseAuthResult | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const idToken = authHeader.slice(7);
  if (!idToken) return null;

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
