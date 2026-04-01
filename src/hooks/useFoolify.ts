"use client";
import { useMemo } from "react";
import { useAprilFools } from "@/contexts/AprilFoolsContext";

/** Deterministic seeded random from a string */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seeded(seed: number, i: number): number {
  const x = Math.sin(seed + i) * 10000;
  return x - Math.floor(x);
}

const JOKE_HEROES = [
  "Bravo, Star of the Bench",
  "Ira, Crimson Procrastinator",
  "Dorinthea, Blade of Snacks",
  "Rhinar, Reckless Napper",
  "Katsu, the Couch Potato",
  "Dash, Inventor of Excuses",
  "Azalea, Ace in Hiding",
  "Lexi, Livewire of Netflix",
  "Prism, Sculptor of Memes",
  "Chane, Bound by Deadlines",
  "Dromai, Ash Artist of Delay",
  "Fai, Rising Dumpster Fire",
  "Briar, Warden of Snacks",
  "Oldhim, Grandfather of Hot Takes",
  "Levia, Shadowborn Overthinker",
  "Viserai, Rune Blood Sugar",
  "Kano, Dracai of Microwave Dinners",
  "Enigma, Master of Lost Keys",
  "Zen, Tamer of Monday Mornings",
  "Nuu, Alluring Procrastinator",
];

/** Hook that returns foolified versions of numbers/strings when April Fools is active.
 *  Pass a seed string (e.g. username) for deterministic results. */
export function useFoolify(seed: string) {
  const { isFoolsMode } = useAprilFools();

  return useMemo(() => {
    if (!isFoolsMode) {
      return {
        active: false,
        n: (v: number) => v,
        wr: (v: number) => v,
        hero: (v: string) => v,
        wld: (w: number, l: number, d: number) => ({ w, l, d }),
      };
    }

    const h = hash(seed || "fools");

    return {
      active: true,
      /** Foolify a generic number (matches, events, etc.) */
      n: (v: number, idx = 0): number => {
        const r = seeded(h, idx);
        return Math.max(1, Math.round(v * (10 + r * 200)));
      },
      /** Foolify a win rate (either absurdly high or comically low) */
      wr: (v: number, idx = 0): number => {
        const r = seeded(h, idx + 100);
        return r > 0.4 ? +(90 + r * 9.9).toFixed(1) : +(1 + r * 18).toFixed(1);
      },
      /** Foolify a hero name */
      hero: (v: string): string => {
        const i = hash(seed + v);
        return JOKE_HEROES[i % JOKE_HEROES.length];
      },
      /** Foolify W-L-D record */
      wld: (w: number, l: number, d: number, idx = 0): { w: number; l: number; d: number } => {
        const r = seeded(h, idx + 200);
        if (r > 0.4) return { w: Math.round(w * (30 + r * 70)), l: Math.max(0, Math.round(l * 0.1)), d };
        return { w: Math.max(1, Math.round(w * 0.1)), l: Math.round(l * (30 + r * 70)), d: Math.round(d * 50) };
      },
    };
  }, [isFoolsMode, seed]);
}
