"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getProfileByUsername } from "@/lib/firestore-storage";
import { loadProfileBackgroundOptionById } from "@/lib/profile-background-catalog";
import {
  buildOptimizedImageUrl,
  hasProfileBackgroundOption,
  resolveProfileBackgroundImage,
  resolveProfileBackgroundPosition,
} from "@/lib/profile-backgrounds";

function applyProfileBackground(imageUrl?: string, focusPosition = "center top") {
  const root = document.documentElement;
  if (!imageUrl) {
    root.style.removeProperty("--fab-user-bg-image");
    root.style.removeProperty("--fab-user-bg-overlay");
    root.style.removeProperty("--fab-user-bg-position");
    delete root.dataset.profileBg;
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewportWidth = Math.max(1024, Math.min(2560, Math.round(window.innerWidth * dpr)));
  const optimizedUrl = buildOptimizedImageUrl(imageUrl, viewportWidth, 66);
  const safeUrl = optimizedUrl.replace(/'/g, "\\'");
  root.style.setProperty("--fab-user-bg-image", `url('${safeUrl}')`);
  root.style.setProperty("--fab-user-bg-overlay", "rgba(6, 8, 10, 0.72)");
  root.style.setProperty("--fab-user-bg-position", focusPosition);
  root.dataset.profileBg = "on";
}

function getViewedUsername(pathname: string | null): string | null {
  if (!pathname || !pathname.startsWith("/player/")) return null;
  const segment = pathname.split("/")[2];
  if (!segment || segment === "_") return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function ProfileBackgroundController() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const ensureBackgroundResolved = async (backgroundId?: string | null): Promise<void> => {
      if (!backgroundId || backgroundId === "none") return;
      if (hasProfileBackgroundOption(backgroundId)) return;
      await loadProfileBackgroundOptionById(backgroundId);
    };

    (async () => {
      await ensureBackgroundResolved(profile?.siteBackgroundId);
      if (requestIdRef.current !== requestId) return;

      const ownImage = resolveProfileBackgroundImage(profile?.siteBackgroundId);
      const ownPosition = resolveProfileBackgroundPosition(profile?.siteBackgroundId) || "center top";
      const viewedUsername = getViewedUsername(pathname);

      // Everywhere except /player/:username uses the viewer's own site background.
      if (!viewedUsername) {
        applyProfileBackground(ownImage, ownPosition);
        return;
      }

      // Viewing your own profile.
      if (profile?.username && profile.username.toLowerCase() === viewedUsername.toLowerCase()) {
        applyProfileBackground(ownImage, ownPosition);
        return;
      }

      // Viewing another profile: show their chosen background if available.
      try {
        const viewedProfile = await getProfileByUsername(viewedUsername);
        if (requestIdRef.current !== requestId) return;
        if (!viewedProfile) {
          applyProfileBackground(ownImage, ownPosition);
          return;
        }

        await ensureBackgroundResolved(viewedProfile.siteBackgroundId);
        if (requestIdRef.current !== requestId) return;

        applyProfileBackground(
          resolveProfileBackgroundImage(viewedProfile.siteBackgroundId),
          resolveProfileBackgroundPosition(viewedProfile.siteBackgroundId) || "center top",
        );
      } catch {
        if (requestIdRef.current === requestId) {
          applyProfileBackground(ownImage, ownPosition);
        }
      }
    })();
  }, [pathname, profile?.username, profile?.siteBackgroundId]);

  return null;
}
