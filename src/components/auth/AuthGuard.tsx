"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, needsSetup, isGuest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Redirect to setup if authed user hasn't created profile yet
    if (needsSetup && pathname !== "/setup") {
      router.replace("/setup");
    }
  }, [user, loading, needsSetup, isGuest, pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-fab-muted animate-pulse">Loading...</div>
      </div>
    );
  }

  // Authed user still needs to set up profile
  if (needsSetup && pathname !== "/setup") return null;

  return <>{children}</>;
}
