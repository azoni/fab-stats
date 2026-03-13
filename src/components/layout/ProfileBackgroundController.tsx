"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getProfileByUsername } from "@/lib/firestore-storage";
import { resolveProfileBackgroundImage } from "@/lib/profile-backgrounds";

function applyProfileBackground(imageUrl?: string) {
  const root = document.documentElement;
  if (!imageUrl) {
    root.style.removeProperty("--fab-user-bg-image");
    root.style.removeProperty("--fab-user-bg-overlay");
    delete root.dataset.profileBg;
    return;
  }

  const safeUrl = imageUrl.replace(/'/g, "\\'");
  root.style.setProperty("--fab-user-bg-image", `url('${safeUrl}')`);
  root.style.setProperty("--fab-user-bg-overlay", "rgba(6, 8, 10, 0.72)");
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
    const ownImage = resolveProfileBackgroundImage(profile?.siteBackgroundId);
    const viewedUsername = getViewedUsername(pathname);

    // Everywhere except /player/:username uses the viewer's own site background.
    if (!viewedUsername) {
      applyProfileBackground(ownImage);
      return;
    }

    // Viewing your own profile.
    if (profile?.username && profile.username.toLowerCase() === viewedUsername.toLowerCase()) {
      applyProfileBackground(ownImage);
      return;
    }

    // Viewing another profile: show their chosen background if available.
    (async () => {
      try {
        const viewedProfile = await getProfileByUsername(viewedUsername);
        if (requestIdRef.current !== requestId) return;
        if (!viewedProfile) {
          applyProfileBackground(ownImage);
          return;
        }
        applyProfileBackground(resolveProfileBackgroundImage(viewedProfile.siteBackgroundId));
      } catch {
        if (requestIdRef.current === requestId) {
          applyProfileBackground(ownImage);
        }
      }
    })();
  }, [pathname, profile?.username, profile?.siteBackgroundId]);

  return null;
}
