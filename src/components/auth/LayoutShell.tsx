"use client";
import { usePathname } from "next/navigation";
import { AuthGuard } from "./AuthGuard";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/player/")) return true;
  if (pathname === "/search") return true;
  if (pathname === "/privacy") return true;
  if (pathname === "/changelog") return true;
  if (pathname === "/docs") return true;
  return false;
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicPath(pathname)) return <>{children}</>;
  return <AuthGuard>{children}</AuthGuard>;
}
