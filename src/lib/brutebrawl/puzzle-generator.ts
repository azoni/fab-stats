import { mulberry32, dateToSeed } from "@/lib/games/seeded-random";
import { allHeroes } from "@/lib/heroes";
import { getTaunt, type TauntEvent } from "./taunts";

const SEED_OFFSET = 3_000_003;
const DICE_COUNT = 80;

export interface DailyBrawl {
  defenderName: string;
  defenderClass: string;
  defenderImageUrl: string;
  difficulty: "Easy" | "Medium" | "Hard";
  difficultyBonus: number;
  diceSequence: number[];
  taunts: Record<TauntEvent, string>;
}

export function generateDailyBrawl(dateStr: string): DailyBrawl {
  const seed = dateToSeed(dateStr) + SEED_OFFSET;
  const rng = mulberry32(seed);

  // Pick a non-Brute, non-young hero as defender
  const nonBrute = allHeroes.filter((h) => !h.classes.includes("Brute") && !h.young && h.imageUrl);
  const defender = nonBrute[Math.floor(rng() * nonBrute.length)];

  // Difficulty: 40% Easy, 35% Medium, 25% Hard
  const diffRoll = rng();
  const difficulty: "Easy" | "Medium" | "Hard" = diffRoll < 0.4 ? "Easy" : diffRoll < 0.75 ? "Medium" : "Hard";
  const difficultyBonus = difficulty === "Easy" ? 0 : difficulty === "Medium" ? 1 : 2;

  // Pre-roll dice sequence
  const diceSequence = Array.from({ length: DICE_COUNT }, () => Math.floor(rng() * 6) + 1);

  // Generate taunts based on defender's primary class
  const heroClass = defender.classes[0] || "Generic";
  const taunts = {} as Record<TauntEvent, string>;
  for (const event of ["start", "smash", "block", "powerUp", "victory", "defeat"] as TauntEvent[]) {
    taunts[event] = getTaunt(heroClass, event, rng);
  }

  return {
    defenderName: defender.name,
    defenderClass: heroClass,
    defenderImageUrl: defender.imageUrl,
    difficulty,
    difficultyBonus,
    diceSequence,
    taunts,
  };
}
