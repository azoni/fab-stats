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
    // Skeleton shell instead of bare text — pages behind the guard show their
    // own skeleton next, so keep this one structurally similar to reduce jump.
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="h-8 w-48 animate-pulse rounded bg-fab-surface" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-fab-border bg-fab-surface" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-fab-border bg-fab-surface" />
      </div>
    );
  }

  // Authed user still needs to set up profile
  if (needsSetup && pathname !== "/setup") return null;

  return <>{children}</>;
}
