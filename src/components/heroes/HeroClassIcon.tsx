import type { ReactNode } from "react";

const S = "w-full h-full";
const PROPS = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ICONS: Record<string, ReactNode> = {
  // Warrior — crossed swords
  Warrior: (
    <svg className={S} {...PROPS}>
      <path d="M5 19L12 12M5 19l3 0 0-3" />
      <path d="M19 5L12 12M19 5l-3 0 0 3" />
      <path d="M15 19l-3-3M9 5l3 3" />
    </svg>
  ),
  // Ninja — shuriken
  Ninja: (
    <svg className={S} {...PROPS}>
      <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity={0.3} />
      <path d="M12 2c0 4-2 6-2 10M12 22c0-4 2-6 2-10M2 12c4 0 6 2 10 2M22 12c-4 0-6-2-10-2" />
    </svg>
  ),
  // Brute — fist
  Brute: (
    <svg className={S} {...PROPS}>
      <path d="M7 13V9a1 1 0 012 0v3M9 9V7a1 1 0 012 0v5M11 7V6a1 1 0 012 0v6M13 8V7a1 1 0 012 0v5" />
      <path d="M15 12l1 1v3a4 4 0 01-4 4H9.5a4 4 0 01-4-4v-2l1.5-2.5" fill="currentColor" fillOpacity={0.1} />
    </svg>
  ),
  // Guardian — shield
  Guardian: (
    <svg className={S} {...PROPS}>
      <path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" fill="currentColor" fillOpacity={0.15} />
      <path d="M12 8v5M10 11h4" />
    </svg>
  ),
  // Ranger — bow & arrow
  Ranger: (
    <svg className={S} {...PROPS}>
      <path d="M18 4c-4 1-7 4.5-7 8s3 7 7 8" fill="currentColor" fillOpacity={0.1} />
      <line x1="4" y1="20" x2="17" y2="5" />
      <polyline points="14 4 18 4 18 8" />
    </svg>
  ),
  // Wizard — staff with orb
  Wizard: (
    <svg className={S} {...PROPS}>
      <line x1="12" y1="22" x2="12" y2="10" />
      <circle cx="12" cy="6" r="4" fill="currentColor" fillOpacity={0.2} />
      <circle cx="12" cy="6" r="1.5" fill="currentColor" fillOpacity={0.4} />
      <path d="M9 22h6" />
    </svg>
  ),
  // Runeblade — blade with rune
  Runeblade: (
    <svg className={S} {...PROPS}>
      <path d="M7 21l10-10V3h-3L4 13v5l3 3z" fill="currentColor" fillOpacity={0.1} />
      <path d="M10 11l4-4" />
      <path d="M15 19l4-4M17 21l4-4" />
    </svg>
  ),
  // Mechanologist — gear
  Mechanologist: (
    <svg className={S} {...PROPS}>
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity={0.2} />
      <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </svg>
  ),
  // Illusionist — eye
  Illusionist: (
    <svg className={S} {...PROPS}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="currentColor" fillOpacity={0.1} />
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity={0.3} />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  // Assassin — dagger
  Assassin: (
    <svg className={S} {...PROPS}>
      <path d="M12 2l1.5 9.5L12 13l-1.5-1.5L12 2z" fill="currentColor" fillOpacity={0.15} />
      <line x1="12" y1="13" x2="12" y2="17" />
      <path d="M8 15h8" />
      <line x1="12" y1="17" x2="12" y2="22" />
    </svg>
  ),
  // Bard — music notes
  Bard: (
    <svg className={S} {...PROPS}>
      <circle cx="7" cy="18" r="3" fill="currentColor" fillOpacity={0.2} />
      <line x1="10" y1="18" x2="10" y2="5" />
      <path d="M10 5c3-1 6 0 8 1" />
      <circle cx="18" cy="14" r="3" fill="currentColor" fillOpacity={0.2} />
      <line x1="21" y1="14" x2="21" y2="3" />
    </svg>
  ),
  // Necromancer — skull
  Necromancer: (
    <svg className={S} {...PROPS}>
      <path d="M8 21v-3h2v2h4v-2h2v3" />
      <path d="M5 11c0-4 3-8 7-8s7 4 7 8-2 5-3 6H8c-1-1-3-2-3-6z" fill="currentColor" fillOpacity={0.15} />
      <circle cx="9.5" cy="10" r="1.5" fill="currentColor" fillOpacity={0.5} />
      <circle cx="14.5" cy="10" r="1.5" fill="currentColor" fillOpacity={0.5} />
    </svg>
  ),
  // Shapeshifter — morphing shapes
  Shapeshifter: (
    <svg className={S} {...PROPS}>
      <circle cx="9" cy="9" r="6" fill="currentColor" fillOpacity={0.1} />
      <circle cx="15" cy="15" r="6" fill="currentColor" fillOpacity={0.15} />
    </svg>
  ),
  // Merchant — coin
  Merchant: (
    <svg className={S} {...PROPS}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity={0.15} />
      <path d="M12 6v12" />
      <path d="M9 9c0-1 1.5-2 3-2s3 1 3 2-1.5 1.5-3 2-3 1-3 2 1.5 2 3 2 3-1 3-2" />
    </svg>
  ),
  // Pirate — skull & crossbones
  Pirate: (
    <svg className={S} {...PROPS}>
      <circle cx="12" cy="9" r="5" fill="currentColor" fillOpacity={0.1} />
      <circle cx="10" cy="8.5" r="1" fill="currentColor" fillOpacity={0.4} />
      <circle cx="14" cy="8.5" r="1" fill="currentColor" fillOpacity={0.4} />
      <path d="M10 11.5h4" />
      <path d="M5 18l14-4M5 14l14 4" strokeWidth={2} />
    </svg>
  ),
  // Adjudicator — scales of justice
  Adjudicator: (
    <svg className={S} {...PROPS}>
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M5 7h14" />
      <path d="M3 13l2-6 2 6a3 3 0 01-4 0z" fill="currentColor" fillOpacity={0.2} />
      <path d="M17 13l2-6 2 6a3 3 0 01-4 0z" fill="currentColor" fillOpacity={0.2} />
      <path d="M9 21h6" />
    </svg>
  ),
  // Thief — mask
  Thief: (
    <svg className={S} {...PROPS}>
      <path d="M3 10c0-3 4-5 9-5s9 2 9 5-4 5-9 5-9-2-9-5z" fill="currentColor" fillOpacity={0.15} />
      <circle cx="8.5" cy="10" r="2.5" fill="currentColor" fillOpacity={0.25} />
      <circle cx="15.5" cy="10" r="2.5" fill="currentColor" fillOpacity={0.25} />
      <path d="M11 10h2" />
      <path d="M10 16c1 1 3 1 4 0" />
    </svg>
  ),
};

const DEFAULT_ICON = ICONS.Warrior;

const CLASS_COLORS: Record<string, { bg: string; text: string }> = {
  Warrior:       { bg: "bg-red-900/40",     text: "text-red-400" },
  Ninja:         { bg: "bg-indigo-900/40",  text: "text-indigo-400" },
  Brute:         { bg: "bg-orange-900/40",  text: "text-orange-400" },
  Guardian:      { bg: "bg-sky-900/40",     text: "text-sky-400" },
  Ranger:        { bg: "bg-green-900/40",   text: "text-green-400" },
  Wizard:        { bg: "bg-purple-900/40",  text: "text-purple-400" },
  Runeblade:     { bg: "bg-violet-900/40",  text: "text-violet-400" },
  Mechanologist: { bg: "bg-zinc-700/40",    text: "text-zinc-300" },
  Illusionist:   { bg: "bg-pink-900/40",    text: "text-pink-400" },
  Assassin:      { bg: "bg-gray-800/40",    text: "text-gray-400" },
  Bard:          { bg: "bg-teal-900/40",    text: "text-teal-400" },
  Necromancer:   { bg: "bg-fuchsia-900/40", text: "text-fuchsia-400" },
  Shapeshifter:  { bg: "bg-emerald-900/40", text: "text-emerald-400" },
  Merchant:      { bg: "bg-yellow-900/40",  text: "text-yellow-400" },
  Pirate:        { bg: "bg-cyan-900/40",    text: "text-cyan-400" },
  Adjudicator:   { bg: "bg-amber-900/40",   text: "text-amber-400" },
  Thief:         { bg: "bg-slate-700/40",   text: "text-slate-300" },
};

const DEFAULT_COLORS = { bg: "bg-fab-gold/20", text: "text-fab-gold" };

interface HeroClassIconProps {
  heroClass?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-48 h-48",
};

const PADDING = {
  sm: "p-1",
  md: "p-1.5",
  lg: "p-2",
  xl: "p-10",
};

export function HeroClassIcon({ heroClass, size = "lg", className = "" }: HeroClassIconProps) {
  const colors = (heroClass && CLASS_COLORS[heroClass]) || DEFAULT_COLORS;
  const icon = (heroClass && ICONS[heroClass]) || DEFAULT_ICON;

  return (
    <div
      className={`${SIZES[size]} rounded-full ${colors.bg} border border-white/10 flex items-center justify-center shrink-0 ${colors.text} ${PADDING[size]} ${className}`}
    >
      {icon}
    </div>
  );
}

export function getHeroClassConfig(heroClass?: string) {
  return (heroClass && CLASS_COLORS[heroClass]) || DEFAULT_COLORS;
}
