import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Tiny admin lookups that the root layout (AuthContext) and a few small
// components need. Kept apart from ./admin so importing them does not drag
// the admin tooling (backfills, stats, leaderboard, matchups, messaging —
// ~280 KB of source) into every route's shared chunk.

interface AdminConfig {
  adminEmails: string[];
}

/** Check if an email is in the admin list (cached for 10 minutes) */
let adminCache: { emails: string[]; ts: number } | null = null;
export const ADMIN_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function checkIsAdmin(email: string | null): Promise<boolean> {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase();
  try {
    if (adminCache && Date.now() - adminCache.ts < ADMIN_CACHE_TTL) {
      return adminCache.emails.includes(normalizedEmail);
    }
    const snap = await getDoc(doc(db, "admin", "config"));
    if (!snap.exists()) return false;
    const config = snap.data() as AdminConfig;
    const normalizedEmails = (config.adminEmails || [])
      .map((entry) => (typeof entry === "string" ? entry.toLowerCase() : ""))
      .filter(Boolean);
    adminCache = { emails: normalizedEmails, ts: Date.now() };
    return normalizedEmails.includes(normalizedEmail);
  } catch {
    return false;
  }
}

/** Get the admin user's UID by looking up the "azoni" username doc */
let adminUidCache: { uid: string; ts: number } | null = null;

export async function getAdminUid(): Promise<string | null> {
  if (adminUidCache && Date.now() - adminUidCache.ts < ADMIN_CACHE_TTL) {
    return adminUidCache.uid;
  }
  try {
    const snap = await getDoc(doc(db, "usernames", "azoni"));
    if (!snap.exists()) return null;
    const { userId } = snap.data() as { userId: string };
    adminUidCache = { uid: userId, ts: Date.now() };
    return userId;
  } catch {
    return null;
  }
}
