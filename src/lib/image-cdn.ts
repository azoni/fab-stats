// Netlify Image CDN helpers. The site is a static export, so there is no
// next/image optimizer; Netlify's own `/.netlify/images` endpoint resizes and
// re-encodes on the fly (same-origin assets need no config, remote hosts must
// be listed under `[images] remote_images` in netlify.toml).
//
// Enabled only when NEXT_PUBLIC_IMAGE_CDN=1 (set for Netlify builds in
// netlify.toml). `next dev` has no such endpoint, so locally every helper
// returns the original URL. Being a build-time constant keeps prerendered
// HTML and the hydrated client in agreement.

export const IMAGE_CDN_ENABLED = process.env.NEXT_PUBLIC_IMAGE_CDN === "1";

/** Remote hosts allowed by netlify.toml `[images] remote_images`. Anything
 *  else passes through untouched (the CDN would answer 400). */
const REMOTE_HOSTS = new Set(["dgmi4fxzalveh.cloudfront.net", "d2wlb52bya4y8z.cloudfront.net"]);

export interface CdnImageOptions {
  /** Target width in CSS px × device pixel ratio you want to serve. */
  w: number;
  h?: number;
  q?: number;
  fit?: "contain" | "cover" | "fill";
  fm?: "webp" | "avif" | "jpg" | "png";
}

/**
 * Wrap an image URL in a Netlify Image CDN transform. Returns the input
 * unchanged when the CDN is disabled, the URL is a data/blob URL, already a
 * CDN URL, or points at a host the CDN is not configured for.
 */
export function cdnImageUrl(url: string | null | undefined, opts: CdnImageOptions): string {
  if (!url) return url ?? "";
  if (!IMAGE_CDN_ENABLED) return url;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/.netlify/")) return url;
  if (!url.startsWith("/")) {
    try {
      if (!REMOTE_HOSTS.has(new URL(url).hostname)) return url;
    } catch {
      return url;
    }
  }
  const params = new URLSearchParams();
  params.set("url", url);
  params.set("w", String(Math.max(16, Math.round(opts.w))));
  if (opts.h) params.set("h", String(Math.round(opts.h)));
  if (opts.fit) params.set("fit", opts.fit);
  params.set("fm", opts.fm ?? "webp");
  params.set("q", String(opts.q ?? 70));
  return `/.netlify/images?${params.toString()}`;
}

/** Hero portraits are 600×600 JPEGs (~530 KB) drawn at 20–40 CSS px in
 *  lists; 80 px covers the largest list size at 2× DPR with one cached
 *  variant per hero. */
export const HERO_THUMB_PX = 80;

export function heroThumbUrl(portraitUrl: string | null | undefined, px: number = HERO_THUMB_PX): string {
  return cdnImageUrl(portraitUrl, { w: px, q: 72 });
}

/**
 * onError helper for <img> elements whose src is a CDN transform: swap to the
 * untransformed source once, then hand off to the caller's own fallback (hide,
 * alternate art, ...). Marks the element so the swap happens only once.
 */
export function swapToOriginalOnce(img: HTMLImageElement, original: string | null | undefined): boolean {
  if (!original || img.dataset.cdnSwapped === "1") return false;
  if (img.getAttribute("src") === original) return false;
  img.dataset.cdnSwapped = "1";
  img.src = original;
  return true;
}
