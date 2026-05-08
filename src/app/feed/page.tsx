"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FeedPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/activity");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-fab-muted animate-pulse">Redirecting...</div>
    </div>
  );
}
