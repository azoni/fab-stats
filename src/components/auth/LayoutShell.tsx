"use client";
import { usePathname } from "next/navigation";
import { AuthGuard } from "./AuthGuard";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/player/")) return true;
  if (pathname === "/search") return true;
  if (pathname === "/privacy") return true;
  if (pathname === "/terms") return true;
  if (pathname === "/changelog") return true;
  if (pathname === "/docs") return true;
  if (pathname === "/achievements") return true;
  if (pathname === "/opponents/nemesis") return true;
  if (pathname === "/opponents/rivalry") return true;
  if (pathname === "/achievements/best-finish") return true;
  if (pathname.startsWith("/deck")) return true;
  // Read-only community surfaces render a guest view anyway — gating them
  // behind auth resolution just added a blank "Loading..." beat before every
  // cold load. ("/" stays gated: its logged-in dashboard must not flash the
  // marketing page, and the /setup funnel rides AuthGuard.)
  if (pathname === "/leaderboard") return true;
  if (pathname === "/meta" || pathname.startsWith("/meta/")) return true;
  if (pathname === "/matchups") return true;
  if (pathname === "/archive") return true;
  if (pathname === "/extras") return true;
  if (pathname === "/discover") return true;
  if (pathname === "/players") return true;
  if (pathname === "/leagues" || pathname.startsWith("/leagues/")) return true;
  if (pathname === "/stores" || pathname.startsWith("/stores/")) return true;
  if (pathname === "/teams" || pathname.startsWith("/teams/")) return true;
  return false;
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicPath(pathname)) return <>{children}</>;
  return <AuthGuard>{children}</AuthGuard>;
}
