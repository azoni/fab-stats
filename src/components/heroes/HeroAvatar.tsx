"use client";
import { CLASS_COLORS } from "./HeroClassIcon";

const DEFAULT_COLORS = { bg: "bg-fab-gold/20", text: "text-fab-gold" };

/** Shorten a hero name to a compact display label.
 *  "Bravo, Showstopper" → "Bravo"
 *  "Arakni, Solitary Confinement" → "Arakni"
 *  "Ira, Crimson Haze" → "Ira"  */
function shortName(name: string): string {
  return name.split(",")[0].trim();
}

interface HeroAvatarProps {
  heroName: string;
  heroClass?: string;
  size?: "sm" | "md";
}

export function HeroAvatar({ heroName, heroClass, size = "sm" }: HeroAvatarProps) {
  const colors = (heroClass && CLASS_COLORS[heroClass]) || DEFAULT_COLORS;
  const label = shortName(heroName);

  const sizeClass = size === "sm"
    ? "text-[9px] px-1.5 py-0.5 max-w-[72px]"
    : "text-[10px] px-2 py-0.5 max-w-[90px]";

  return (
    <span
      className={`${sizeClass} rounded-full ${colors.bg} ${colors.text} font-bold border border-white/10 truncate inline-block leading-tight`}
      title={heroName}
    >
      {label}
    </span>
  );
}
