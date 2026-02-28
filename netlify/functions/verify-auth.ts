/**
 * Verify a Firebase ID token by calling the Google Identity Toolkit REST API.
 * Returns the user's UID if valid, or null if invalid/missing.
 *
 * Usage in Netlify functions:
 *   const uid = await verifyFirebaseToken(req);
 *   if (!uid) return new Response("Unauthorized", { status: 401 });
 */
export async function verifyFirebaseToken(req: Request): Promise<string | null> {
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
    const uid = data?.users?.[0]?.localId;
    return uid || null;
  } catch {
    return null;
  }
}
