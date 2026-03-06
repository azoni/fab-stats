/**
 * Shared image capture + copy/download/share logic for share card modals.
 *
 * Returns what actually happened so the caller can show accurate feedback:
 *  "image"  – image blob copied to clipboard
 *  "shared" – handed off to native share sheet (mobile)
 *  "text"   – fell back to copying text (URL / description)
 *  "failed" – nothing worked
 */

export type ShareResult = "image" | "shared" | "text" | "failed";

interface CaptureOptions {
  backgroundColor: string;
  pixelRatio?: number;
  /** If true, retry without <img> elements on CORS failure (ProfileCard needs this). */
  retryWithoutImages?: boolean;
}

/** Convert a card DOM node to a PNG blob via html-to-image. */
export async function captureCardBlob(
  el: HTMLElement,
  opts: CaptureOptions,
): Promise<Blob | null> {
  const { toBlob } = await import("html-to-image");
  // Use lower pixel ratio on mobile to keep image size manageable for share sheets
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const defaultRatio = isMobile ? 1.5 : 2;
  const base = { pixelRatio: opts.pixelRatio ?? defaultRatio, backgroundColor: opts.backgroundColor, cacheBust: true };
  try {
    return await toBlob(el, base);
  } catch {
    if (opts.retryWithoutImages) {
      try {
        return await toBlob(el, { ...base, filter: (node: HTMLElement) => node.tagName !== "IMG" });
      } catch {
        return null;
      }
    }
    return null;
  }
}

interface CopyOptions extends CaptureOptions {
  /** Filename used for mobile share sheet. */
  fileName: string;
  /** Title for mobile share sheet. */
  shareTitle: string;
  /** Text body for mobile share or clipboard text fallback. */
  shareText: string;
  /** Shorter text used as the final clipboard fallback (usually just a URL). */
  fallbackText: string;
}

/** Capture card → try clipboard image → try native share (mobile) → fall back to text. */
export async function copyCardImage(
  el: HTMLElement | null,
  opts: CopyOptions,
): Promise<ShareResult> {
  if (!el) return "failed";

  const blob = await captureCardBlob(el, opts);

  // 1. Try copying image to clipboard (works on desktop and modern mobile browsers)
  if (blob && navigator.clipboard?.write) {
    try {
      // Safari requires ClipboardItem values to be Promises for async clipboard
      const item = new ClipboardItem({
        "image/png": Promise.resolve(blob),
      });
      await navigator.clipboard.write([item]);
      return "image";
    } catch {
      // ClipboardItem with image/png not supported — fall through
    }
  }

  // 2. Mobile fallback: use native share sheet
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobileDevice && blob && navigator.share) {
    try {
      const file = new File([blob], opts.fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: opts.shareTitle, text: opts.shareText, files: [file] });
        return "shared";
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "failed";
    }
  }

  // 3. Fallback: copy text
  try {
    await navigator.clipboard.writeText(opts.fallbackText);
    return "text";
  } catch {
    return "failed";
  }
}

/** Download the card as a PNG file. Always works if toBlob succeeds. */
export async function downloadCardImage(
  el: HTMLElement | null,
  opts: CaptureOptions & { fileName: string },
): Promise<boolean> {
  if (!el) return false;
  const blob = await captureCardBlob(el, opts);
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
