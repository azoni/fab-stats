export type TauntEvent = "start" | "smash" | "block" | "powerUp" | "victory" | "defeat";

const CLASS_TAUNTS: Record<string, Record<string, string[]>> = {
  Guardian: {
    start: [
      "A Brute dares challenge a Guardian? How quaint.",
      "My shield is ready. Give me your best shot.",
      "You won't get past my defenses, savage.",
      "I've trained for this. Come at me.",
      "Another brainless Brute. Let's get this over with.",
    ],
    smash: [
      "That... that got through my defenses!",
      "Impossible! How did you hit so hard?!",
      "My shield! You cracked it!",
      "I won't let that happen again!",
      "Brute force isn't supposed to work against me!",
    ],
    block: [
      "Your attacks bounce right off my shield!",
      "Blocked. Is that all you've got?",
      "My defense is absolute. Try again.",
      "You'll need more than raw strength to break through.",
      "Every blow, deflected. You're wasting your energy.",
    ],
    powerUp: [
      "What? They're getting stronger...",
      "This shouldn't be possible...",
      "That power surge... I need to brace myself.",
      "No matter how strong you get, my shield holds.",
    ],
    victory: [
      "Defeated by a Brute... I need more training.",
      "You win this round, savage.",
      "My defense... it wasn't enough. Impossible.",
      "I underestimated your raw power. Well fought.",
    ],
    defeat: [
      "As expected. Brutes are no match for a Guardian.",
      "Your strength means nothing against discipline.",
      "My shield held. It always does.",
      "All that rage, and nothing to show for it.",
    ],
  },
  Ninja: {
    start: [
      "You can't hit what you can't see.",
      "A Brute? This will be over quickly.",
      "Speed beats strength every time.",
      "Try to keep up, muscle-brain.",
      "I'll dance circles around your clumsy attacks.",
    ],
    smash: [
      "How did you hit me?! I was invisible!",
      "That was too fast... even for me!",
      "You fight like a cornered animal!",
      "Lucky swing! That won't happen again!",
      "Impossible! No one tracks my movements!",
    ],
    block: [
      "Too slow! I dodged without even trying.",
      "You swing at shadows, Brute.",
      "I was behind you the whole time.",
      "Your fists hit nothing but air.",
      "Predictable. Every. Single. Time.",
    ],
    powerUp: [
      "That energy... I need to stay nimble.",
      "Getting stronger won't help if you can't land a hit.",
      "More power? Doesn't matter if you're too slow.",
      "I sense danger... time to keep my distance.",
    ],
    victory: [
      "Impossible... a Brute caught me?",
      "Speed failed me today. You earned this win.",
      "Outmuscled... I never thought I'd say that.",
      "Fine, you win. But I'll be faster next time.",
    ],
    defeat: [
      "All brawn, no precision. Classic Brute.",
      "You never even saw me coming.",
      "Strength without speed is meaningless.",
      "Better luck catching smoke next time.",
    ],
  },
  Wizard: {
    start: [
      "Fascinating. A Brute approaches. How droll.",
      "Let's see if your fists can outrace my arcana.",
      "I've calculated your odds. They're not good.",
      "Magic vs. muscle. The outcome is predetermined.",
      "Prepare to be educated, savage.",
    ],
    smash: [
      "My wards! How did raw force breach them?!",
      "That defies the laws of arcana!",
      "No calculation accounted for THAT much power!",
      "My shields... shattered by brute force?!",
      "The equations said this was impossible!",
    ],
    block: [
      "A simple ward repels your feeble blows.",
      "Arcane barriers laugh at physical force.",
      "Blocked by pure intellect. How does it feel?",
      "My calculations predicted that exact attack.",
      "You're fighting magic itself. Reconsider.",
    ],
    powerUp: [
      "Interesting... a power spike. Let me adjust my wards.",
      "Raw energy surge detected. Compensating...",
      "This wasn't in my models. Recalculating...",
      "More power won't help against superior intellect.",
    ],
    victory: [
      "Inconceivable! Raw force overcame arcane mastery?",
      "My calculations... were wrong? Impossible!",
      "You've earned my respect, Brute. Barely.",
      "Brute force has its merits, it seems.",
    ],
    defeat: [
      "As my calculations predicted. Muscle loses to mind.",
      "Magic always triumphs over savagery.",
      "Come back when you've read a book.",
      "Raw strength is no match for refined arcana.",
    ],
  },
  Warrior: {
    start: [
      "A Brute challenges a Warrior? Bold move.",
      "Steel meets fists. Let's see who bends first.",
      "I've cut down bigger threats than you.",
      "Draw your... oh wait, you just use your fists. Cute.",
      "A worthy test of arms. En garde!",
    ],
    smash: [
      "That blow would fell an ox!",
      "My armor dented! Impressive, Brute!",
      "You fight with the fury of a berserker!",
      "That hit... I felt it in my bones!",
      "Raw power like that is terrifying!",
    ],
    block: [
      "Parried with ease. You telegraph your swings.",
      "My blade intercepts every punch.",
      "A Warrior's discipline beats a Brute's rage.",
      "Your fists meet only steel.",
      "Sloppy. I've seen recruits swing better.",
    ],
    powerUp: [
      "They're powering up... I need to stay sharp.",
      "That battle fury... impressive but reckless.",
      "A cornered Brute is a dangerous Brute.",
      "This fight just got interesting.",
    ],
    victory: [
      "Outfought by a Brute? I need to train harder.",
      "Your raw power overwhelmed my technique.",
      "I salute you, warrior to warrior.",
      "Well struck. The victory is yours.",
    ],
    defeat: [
      "Technique always beats brute force.",
      "Strength without skill is just flailing.",
      "Another Brute falls to the blade.",
      "Come back with a weapon next time.",
    ],
  },
  Ranger: {
    start: [
      "Stay right there while I line up my shot.",
      "A Brute? Finally, a target I can't miss.",
      "You're big, slow, and loud. Perfect target.",
      "My arrows will find you before your fists find me.",
      "Let's see you punch something you can't reach.",
    ],
    smash: [
      "You closed the gap?! How?!",
      "That raw force... my aim means nothing up close!",
      "You're faster than you look!",
      "No amount of distance saves me from THAT!",
      "Brutal! I need to reposition!",
    ],
    block: [
      "My arrows keep you at bay. Stay back.",
      "Can't hit what's out of reach, can you?",
      "Every approach, intercepted by an arrow.",
      "You charge, I dodge. Simple math.",
      "Your fists are useless at this range.",
    ],
    powerUp: [
      "That surge of power... I need more distance!",
      "They're closing in faster now...",
      "Running out of arrows might be a problem...",
      "That power... I need to end this quickly.",
    ],
    victory: [
      "You caught me. Fair and square.",
      "Outmuscled at close range. I should have run.",
      "Those fists are no joke. Well fought.",
      "Speed wasn't enough today.",
    ],
    defeat: [
      "Never brought fists to an arrow fight.",
      "Distance is the great equalizer.",
      "Big and slow. Just how I like my targets.",
      "Come back when you learn to dodge.",
    ],
  },
  Mechanologist: {
    start: [
      "Initiating combat protocol. Target: Brute.",
      "My inventions will dismantle you piece by piece.",
      "Organic muscle versus machine. Let's test the hypothesis.",
      "You punch things. I build things that punch back.",
      "Running combat diagnostics... threat level: moderate.",
    ],
    smash: [
      "CRITICAL HIT! Systems damaged!",
      "That force exceeded my structural tolerances!",
      "ERROR: Defensive array compromised!",
      "Raw power overloaded my dampeners!",
      "Recalibrating! That impact was off the charts!",
    ],
    block: [
      "Titanium plating absorbs your feeble strikes.",
      "Impact absorbed. Energy recycled. Thank you.",
      "My shields are rated for meteor impacts. You're no meteor.",
      "Punch all you want. My armor learns from each hit.",
      "Deflection successful. Are you even trying?",
    ],
    powerUp: [
      "Power surge detected! Rerouting to shields!",
      "Warning: target exceeding predicted parameters!",
      "Activating secondary defensive protocols...",
      "That energy spike... my sensors are maxing out!",
    ],
    victory: [
      "System failure... defeated by a Brute? Recalculating...",
      "Raw force > my engineering. Back to the drawing board.",
      "You broke through everything I built. Impressive.",
      "Organic power wins this round. Noted for future builds.",
    ],
    defeat: [
      "Technology triumphs over savagery. As predicted.",
      "Your fists versus my machines. No contest.",
      "Back to the scrap heap with you.",
      "Muscle is outdated. The future is mechanical.",
    ],
  },
  Generic: {
    start: [
      "A Brute dares challenge me? How amusing.",
      "Let's see what those dice can do.",
      "You look like you hit hard. Prove it.",
      "Another challenger steps forward... interesting.",
      "I've been waiting for a worthy opponent. Are you it?",
    ],
    smash: [
      "TRIPLES?! You savage!",
      "That... that wasn't fair!",
      "Impossible! No one hits that hard!",
      "A devastating blow... I felt that one.",
      "You fight like a wild beast!",
    ],
    block: [
      "Blocked. Try harder, Brute.",
      "Your attacks bounce right off!",
      "Is that the best a Brute can do?",
      "My defense is impenetrable!",
      "Not even close. Swing again.",
    ],
    powerUp: [
      "Oh no, they're powering up...",
      "This isn't good...",
      "That power... where is it coming from?",
      "I sense a dangerous surge of energy...",
    ],
    victory: [
      "Impossible! Defeated by a Brute...",
      "Fine. You win this time.",
      "I... I underestimated you.",
      "Curse these dice! You got lucky!",
      "You fight with honor... for a Brute.",
    ],
    defeat: [
      "As expected. Brutes are all muscle, no brains.",
      "Better luck next time, meat head.",
      "Was that supposed to hurt? Laughable.",
      "Another Brute falls before me.",
      "Come back when you've learned to fight.",
    ],
  },
};

/**
 * Get a taunt for a given hero class and event type.
 * Falls back to Generic if the class is not found.
 */
export function getTaunt(heroClass: string, event: string, rng: () => number): string {
  const classTaunts = CLASS_TAUNTS[heroClass] || CLASS_TAUNTS.Generic;
  const pool = classTaunts[event] || CLASS_TAUNTS.Generic[event] || ["..."];
  return pool[Math.floor(rng() * pool.length)];
}
