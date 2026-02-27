import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface BannerConfig {
  text: string;
  active: boolean;
  type: "info" | "warning" | "success";
  scope: "all" | "home";
  link?: string;
  linkText?: string;
}

const BANNER_DOC = doc(db, "admin", "banner");

/** Get the current banner config */
export async function getBanner(): Promise<BannerConfig | null> {
  const snap = await getDoc(BANNER_DOC);
  if (!snap.exists()) return null;
  return snap.data() as BannerConfig;
}

/** Save banner config (admin only) */
export async function saveBanner(config: BannerConfig): Promise<void> {
  const data: Record<string, unknown> = {
    text: config.text,
    active: config.active,
    type: config.type,
    scope: config.scope,
  };
  if (config.link) data.link = config.link;
  if (config.linkText) data.linkText = config.linkText;
  await setDoc(BANNER_DOC, data);
}

/** Subscribe to banner changes (real-time) */
export function subscribeBanner(callback: (config: BannerConfig | null) => void): () => void {
  return onSnapshot(BANNER_DOC, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(snap.data() as BannerConfig);
  });
}
