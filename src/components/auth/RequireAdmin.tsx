"use client";

/**
 * Client-side admin gate. Wrap any page/section that must not be reachable by
 * the public (internal /lab + /scout consoles, /admin/* dashboards).
 *
 * Single source of truth for the gate — previously duplicated across each
 * admin page. Renders nothing (and redirects home) for non-admins, so the
 * gated content never hydrates or fetches for unauthenticated visitors.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace("/");
  }, [loading, user, isAdmin, router]);

  if (loading) {
    return <div className="p-8 text-fab-dim">Loading…</div>;
  }
  if (!user || !isAdmin) {
    // Redirect is in-flight; render nothing so no internal data flashes.
    return null;
  }
  return <>{children}</>;
}
