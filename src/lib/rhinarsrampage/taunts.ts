export const TAUNTS = {
  start: [
    "Think you can outroll ME? Rhinar smashes all!",
    "The Badlands don't forgive cowards. Roll or run.",
    "Another challenger? This'll be quick.",
    "You look weak. Prove me wrong.",
    "Rhinar is hungry. Feed me your best rolls!",
  ],
  rollHigh: [
    "Ohhh, getting greedy! I like it.",
    "Bold. Let's see if it pays off.",
    "Pushing your luck... very Brute of you.",
    "Higher and higher! But for how long?",
  ],
  rollLow: [
    "Ha! Is that all the dice gave you?",
    "Weak roll. The Badlands are disappointed.",
    "Pathetic. Even a squirrel rolls better.",
    "That little tap? I barely felt it.",
  ],
  bankHigh: [
    "Hmm... not bad. Not bad at all.",
    "Okay, that one stung a little.",
    "Lucky roll. Won't happen again.",
    "Fine, take your prize. It won't be enough.",
  ],
  bankLow: [
    "Playing it safe? Boring.",
    "A real Brute would keep rolling.",
    "Coward! That barely tickled!",
    "You call that an attack? Embarrassing.",
  ],
  bust: [
    "HAHAHA! Overswung! Classic!",
    "Should've banked, little one.",
    "Busted! That's what greed gets you!",
    "Too much! The dice have spoken!",
    "CRASH! All that damage... gone!",
  ],
  intimidate: [
    "You think a little scare tactic works on ME?",
    "Fine, I'll give you that one...",
    "Intimidate Rhinar? You've got guts!",
    "Clever... but it won't save you.",
  ],
  victory: [
    "...impossible. Nobody beats Rhinar!",
    "You got lucky. Come back tomorrow.",
    "This... this isn't over!",
    "Fine! You win! But only today!",
  ],
  defeat: [
    "Too weak! The Badlands claim another victim.",
    "Not even close. Try again tomorrow?",
    "RHINAR WINS! As expected.",
    "Better luck next time, weakling!",
  ],
};

export type TauntEvent = keyof typeof TAUNTS;
