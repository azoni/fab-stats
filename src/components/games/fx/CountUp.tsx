"use client";
/**
 * Animated number that counts up to `value` on mount / when the value changes.
 * Respects prefers-reduced-motion (jumps straight to the value). Great for scores,
 * uniqueness %, and result tallies that currently snap in.
 */
import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  from = 0,
  duration = 700,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(from);
  const raf = useRef<number | null>(null);
  const startVal = useRef(from);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || duration <= 0) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const begin = startVal.current;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(begin + (value - begin) * eased);
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        startVal.current = value;
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  const shown = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();
  return (
    <span className={className}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}
