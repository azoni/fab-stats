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

    if (!user && !isGuest) {
      router.replace("/login");
      return;
    }

    // Redirect to setup if profile not created (but not if already on /setup)
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

  if (!user && !isGuest) return null;

  // Allow /setup through even though needsSetup is true
  if (needsSetup && pathname !== "/setup") return null;

  return <>{children}</>;
}
