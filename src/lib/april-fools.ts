/** April Fools stat scrambling utilities.
 *  All functions are pure — no side effects, no data mutation.
 *  Uses a deterministic seed so values are consistent on refresh. */

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000;
  return x - Math.floor(x);
}

export function isAprilFoolsDay(): boolean {
  const now = new Date();
  return now.getUTCMonth() === 3 && now.getUTCDate() === 1; // April = month 3 (0-indexed)
}

export function foolifyNumber(real: number, seed: string, type: "winRate" | "matches" | "streak" | "events" | "top8s"): number {
  const h = hashSeed(seed);
  const r = seededRandom(h, type.length);

  switch (type) {
    case "winRate":
      // Either absurdly high or comically low
      return r > 0.5 ? Math.round(90 + r * 9.99) : Math.round(1 + r * 15);
    case "matches":
      // Multiply by ridiculous factor
      return Math.round(real * (50 + r * 950));
    case "streak":
      // Absurd streaks
      return [42, 69, 420, 1337, 9001, 99, 314, 777][Math.floor(r * 8)];
    case "events":
      return Math.round(real * (10 + r * 90));
    case "top8s":
      return Math.round(real * (5 + r * 50));
    default:
      return real;
  }
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
  "Dromai, Ash Artist of Procrastination",
  "Fai, Rising Dumpster Fire",
  "Briar, Warden of the Snack Bar",
  "Oldhim, Grandfather of Hot Takes",
  "Levia, Shadowborn Overthinker",
  "Viserai, Rune Blood Sugar",
  "Kano, Dracai of Microwave Dinners",
];

export function foolifyHero(real: string, seed: string): string {
  const h = hashSeed(seed + real);
  return JOKE_HEROES[h % JOKE_HEROES.length];
}

export function foolifyWLD(wins: number, losses: number, draws: number, seed: string): { w: number; l: number; d: number } {
  const h = hashSeed(seed);
  const r = seededRandom(h, 7);
  if (r > 0.5) {
    // Absurdly dominant
    return { w: Math.round(wins * (20 + r * 80)), l: Math.round(losses * 0.1), d: draws };
  }
  // Comically bad
  return { w: Math.round(wins * 0.1), l: Math.round(losses * (20 + r * 80)), d: Math.round(draws * 50) };
}
