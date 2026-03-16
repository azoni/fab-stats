/**
 * Server-side admin check using Firebase Admin SDK.
 * Reads the admin/config document to verify if an email is in the admin list.
 */
import { getAdminDb } from "../firebase-admin.ts";

export async function isAdminEmail(email: string | null): Promise<boolean> {
  if (!email) return false;
  try {
    const db = getAdminDb();
    const snap = await db.collection("admin").doc("config").get();
    if (!snap.exists) return false;
    const data = snap.data();
    const adminEmails: string[] = data?.adminEmails || [];
    return adminEmails.includes(email.toLowerCase());
  } catch {
    return false;
  }
}
