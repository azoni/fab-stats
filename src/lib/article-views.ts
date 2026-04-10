import { incrementArticleViewCount } from "./articles";

const VIEW_LOCK_HOURS = 12;

export async function trackArticleView(articleId: string, viewerId?: string | null): Promise<boolean> {
  if (typeof window === "undefined" || !viewerId) return false;

  const storageKey = `fab-article-view:${articleId}:${viewerId}`;
  const lastViewedAt = window.localStorage.getItem(storageKey);
  const now = Date.now();
  const cooldownMs = VIEW_LOCK_HOURS * 60 * 60 * 1000;

  if (lastViewedAt) {
    const elapsed = now - Number(lastViewedAt);
    if (Number.isFinite(elapsed) && elapsed < cooldownMs) return false;
  }

  window.localStorage.setItem(storageKey, String(now));
  try {
    await incrementArticleViewCount(articleId);
    return true;
  } catch {
    window.localStorage.removeItem(storageKey);
    return false;
  }
}
