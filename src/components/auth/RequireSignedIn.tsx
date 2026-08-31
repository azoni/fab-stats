"use client";

/**
 * Client-side signed-in gate: shows a sign-in prompt instead of the wrapped
 * content for logged-out visitors. Softer than RequireAdmin (no redirect) —
 * the visitor learns what the page is and how to get in.
 */
import Link from "next/link";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function RequireSignedIn({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-fab-dim">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-fab-border bg-fab-surface p-5 text-sm text-fab-muted">
          <Lock className="h-5 w-5 shrink-0 text-fab-dim" />
          <p>
            This page needs an account.{" "}
            <Link href="/login" className="text-fab-gold hover:underline">
              Sign in
            </Link>{" "}
            to continue.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
