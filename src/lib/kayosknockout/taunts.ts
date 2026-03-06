export const TAUNTS = {
  start: [
    "You dare challenge Kayo? Step into the ring!",
    "Another contender? This won't last long.",
    "Kayo doesn't go down easy. Bring your best.",
    "The arena awaits. Show me what you've got!",
    "You smell like defeat already. Let's go.",
  ],
  bigCombo: [
    "Hrrngh... that actually hurt!",
    "Lucky combo. Won't happen again.",
    "Okay, you've got some fight in you...",
    "Not bad... but Kayo's still standing!",
  ],
  weakRound: [
    "Ha! That tickled!",
    "Is that all? Pathetic!",
    "My grandmother hits harder than that!",
    "Weak! Come on, actually TRY!",
    "You call that an attack? Embarrassing.",
  ],
  reroll: [
    "Rerolling? Indecisive, I see.",
    "Pick your dice and commit, coward!",
    "Fumbling around won't save you.",
    "Make up your mind already!",
  ],
  victory: [
    "...impossible! Nobody knocks out Kayo!",
    "You got lucky. That's all it was.",
    "Fine... you win this round. Tomorrow I'll be ready.",
    "The crowd cheers... but Kayo remembers.",
  ],
  defeat: [
    "KAYO WINS! As expected!",
    "Too weak to finish the job. Typical.",
    "Better luck next time, little one.",
    "The arena claims another victim!",
    "You never stood a chance.",
  ],
};

export type TauntEvent = keyof typeof TAUNTS;
