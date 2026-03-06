export type NinjaTauntEvent = "start" | "combo" | "broken" | "special" | "victory" | "defeat";

const KATSU_TAUNTS: Record<NinjaTauntEvent, string[]> = {
  start: [
    "Every combo begins with a single strike...",
    "The chain is your weapon. Build it wisely.",
    "Patience, then precision. Show me your path.",
    "Speed without thought is nothing. Plan your chain.",
    "The perfect combo exists. Find it.",
  ],
  combo: [
    "The chain grows! Keep the rhythm!",
    "Speed and precision — the ninja way.",
    "Yes! Feel the flow of the combo!",
    "Each link strengthens the chain!",
    "Faster! Don't lose momentum!",
  ],
  broken: [
    "The chain breaks. Rethink your sequence.",
    "Lost your rhythm? Focus.",
    "A misstep. The combo falters.",
    "That card doesn't flow. Try another path.",
    "The chain demands the right order.",
  ],
  special: [
    "A perfect chain unlocks true power!",
    "The ultimate technique! Devastating!",
    "That's the power of a flawless combo!",
    "When the chain holds, the finisher strikes!",
    "Mastery of the chain — this is the ninja's art!",
  ],
  victory: [
    "The target falls. Well sequenced.",
    "You found a lethal chain. Well done.",
    "The combo was devastating. Impressive.",
    "Speed, precision, power. You have them all.",
    "A true ninja reads the hand and finds the path.",
  ],
  defeat: [
    "The chain was weak today. Try again.",
    "There was a better path. Can you find it?",
    "Not enough damage. Rethink your sequence.",
    "The optimal combo eluded you. Study the cards.",
    "Close, but a ninja demands perfection.",
  ],
};

export function getKatsuTaunt(event: NinjaTauntEvent, rng: () => number): string {
  const pool = KATSU_TAUNTS[event];
  return pool[Math.floor(rng() * pool.length)];
}
