"use client";
import { useEffect } from "react";
import { IMAGE_CDN_ENABLED } from "@/lib/image-cdn";

/**
 * Site-wide safety net for Image CDN transforms. Every <img> whose src is a
 * `/.netlify/images?url=…` transform gets ONE retry on the untransformed
 * asset when the CDN answers with an error (it returned 415s during a Netlify
 * platform incident on the day this shipped). The static files never went
 * through the CDN before this wave, so this keeps that resilience for the
 * ~30 background / share-card / theme-thumbnail sites without editing each.
 *
 * `error` does not bubble, but it can be observed in the capture phase at the
 * document; stopping propagation there keeps a site's own onError (which
 * typically hides the element) from firing for the first, recoverable error —
 * if the original fails too, the second error propagates normally.
 */
export function ImageCdnFallback() {
  useEffect(() => {
    if (!IMAGE_CDN_ENABLED) return;
    const onError = (event: Event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img.dataset.cdnSwapped === "1") return;
      const src = img.getAttribute("src") || "";
      if (!src.startsWith("/.netlify/images?")) return;
      let original: string | null = null;
      try {
        original = new URL(src, window.location.origin).searchParams.get("url");
      } catch {
        return;
      }
      if (!original || original === src) return;
      img.dataset.cdnSwapped = "1";
      event.stopPropagation();
      img.src = original;
    };
    document.addEventListener("error", onError, true);
    return () => document.removeEventListener("error", onError, true);
  }, []);
  return null;
}
