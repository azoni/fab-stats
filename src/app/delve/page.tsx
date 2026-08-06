"use client";
/**
 * /delve — thin shell. The whole game (engine + content tables + components)
 * loads only on this route via next/dynamic, so it never touches the shared
 * bundle (KgGraph pattern for the static export).
 */
import dynamic from "next/dynamic";

const DelveApp = dynamic(() => import("@/components/delve/DelveApp"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="h-72 animate-pulse rounded-xl border border-fab-border bg-fab-surface" />
    </div>
  ),
});

export default function DelvePage() {
  return <DelveApp />;
}
