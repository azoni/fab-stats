import { doc, setDoc, getDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Increment a page view counter for the given route path */
export function trackPageView(path: string) {
  // Sanitize path to be a valid Firestore field name (replace / with _)
  const field = path === "/" ? "_home" : path.replace(/\//g, "_").replace(/^_/, "");
  try {
    setDoc(doc(db, "analytics", "pageViews"), { [field]: increment(1) }, { merge: true });
  } catch {
    // Fire and forget — don't block UI
  }
}

/** Increment a creator click counter */
export function trackCreatorClick(creatorName: string) {
  if (!creatorName) return;
  try {
    setDoc(doc(db, "analytics", "creatorClicks"), { [creatorName]: increment(1) }, { merge: true });
  } catch {
    // Fire and forget
  }
}

/** Read all analytics data (admin only) */
export async function getAnalytics(): Promise<{
  pageViews: Record<string, number>;
  creatorClicks: Record<string, number>;
}> {
  const [pvSnap, ccSnap] = await Promise.all([
    getDoc(doc(db, "analytics", "pageViews")),
    getDoc(doc(db, "analytics", "creatorClicks")),
  ]);
  return {
    pageViews: (pvSnap.data() as Record<string, number>) || {},
    creatorClicks: (ccSnap.data() as Record<string, number>) || {},
  };
}
