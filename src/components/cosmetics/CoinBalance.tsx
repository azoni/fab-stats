"use client";
/**
 * Coin balance HUD. Renders nothing while the cosmetics feature flag is off or
 * the user is signed out, so it is safe to mount anywhere during rollout.
 */
import { useAuth } from "@/contexts/AuthContext";
import { COSMETICS_ENABLED } from "@/lib/cosmetics/flags";
import { useWallet } from "@/lib/cosmetics/use-cosmetics";

/** Engraved coin glyph (code-rendered, theme-agnostic — no artwork). */
export function CoinIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="coin-face" cx="38%" cy="34%" r="75%">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="55%" stopColor="#e7b54b" />
          <stop offset="100%" stopColor="#a9781f" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill="url(#coin-face)" stroke="#7a5714" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#7a5714" strokeWidth="0.9" opacity="0.55" />
      <path
        d="M12 7.4c-1.7 0-3 .9-3 2.3 0 2.6 4.6 1.7 4.6 3.4 0 .7-.7 1.1-1.6 1.1-1 0-1.7-.5-1.8-1.3H8.6c.1 1.4 1.1 2.3 2.6 2.5V17h1.2v-1.1c1.6-.2 2.7-1.1 2.7-2.5 0-2.6-4.6-1.8-4.6-3.4 0-.6.6-1 1.5-1 .9 0 1.5.5 1.6 1.2h1.6c-.1-1.3-1-2.2-2.4-2.4V7h-1.2z"
        fill="#5c4210"
      />
    </svg>
  );
}

export function CoinBalance({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const { user } = useAuth();
  const { wallet } = useWallet(user?.uid);
  if (!COSMETICS_ENABLED || !user) return null;
  const coins = wallet?.coins ?? 0;
  const pad = size === "sm" ? "px-2 py-0.5 text-xs gap-1" : "px-2.5 py-1 text-sm gap-1.5";
  const icon = size === "sm" ? 13 : 16;
  return (
    <span
      className={`inline-flex items-center rounded-full border border-fab-gold/30 bg-fab-gold/10 font-semibold text-fab-gold tabular-nums ${pad} ${className}`}
      title={`${coins.toLocaleString()} coins`}
    >
      <CoinIcon size={icon} />
      {coins.toLocaleString()}
    </span>
  );
}
