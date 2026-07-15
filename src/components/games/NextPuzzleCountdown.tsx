"use client";
import { useEffect, useState } from "react";

function timeUntilUtcMidnight(): { h: number; m: number } {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow.getTime() - now.getTime();
  return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000) };
}

/**
 * Live "Next puzzle in Xh Ym" that actually ticks. Each game's Result used to
 * compute this once at mount, so it showed a frozen time (e.g. "Next in 5h")
 * that never counted down — undercutting the come-back-tomorrow urgency. This
 * re-renders every 30s.
 */
export function NextPuzzleCountdown({
  label = "Next puzzle in",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [{ h, m }, setLeft] = useState(timeUntilUtcMidnight);
  useEffect(() => {
    const id = setInterval(() => setLeft(timeUntilUtcMidnight()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className={className ?? "text-[10px] text-fab-dim text-center"}>
      {label} {h}h {m}m
    </p>
  );
}
