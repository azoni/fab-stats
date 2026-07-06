// Script to generate expanded word bank from @flesh-and-blood/cards data
const { cards } = require("@flesh-and-blood/cards");
const fs = require("fs");
const path = require("path");

const seen = new Set();
const entries = [];

function add(word, clue, category) {
  const w = word.toUpperCase().trim();
  if (w.length < 3 || w.length > 9) return;
  if (!/^[A-Z]+$/.test(w)) return;
  if (seen.has(w)) return;
  seen.add(w);
  entries.push({ word: w, clue, category });
}

// ═══════════════════════════════════════════════════════
// 1. HEROES
// ═══════════════════════════════════════════════════════
const heroList = [
  ["ARAKNI", "Mysterious Assassin, identity unknown"],
  ["AURORA", "Elemental Runeblade of ice and lightning"],
  ["AZALEA", "Ranger who strikes from the Pits"],
  ["BENJI", "Young Ninja with quick reflexes"],
  ["BETSY", "Guardian hero with a heart of steel"],
  ["BLAZE", "Draconic Wizard wreathed in flame"],
  ["BOLTYN", "Light Warrior and champion of Solana"],
  ["BRAVO", "Star of Aria, Guardian of the Old"],
  ["BREVANT", "Guardian shielding allies in battle"],
  ["BRIAR", "Elemental Runeblade of the Rosetta"],
  ["CHANE", "Shadow Runeblade bound to darkness"],
  ["CINDRA", "Draconic Ninja wreathed in flame"],
  ["DASH", "Young Mechanologist inventor from Metrix"],
  ["DROMAI", "Draconic Illusionist who summons dragons"],
  ["ENIGMA", "Mystic Illusionist from the East"],
  ["FAI", "Draconic Ninja from Volcor"],
  ["FANG", "Draconic Warrior with serpent ferocity"],
  ["FLORIAN", "Earth Runeblade connected to nature"],
  ["IRA", "Young Ninja, simplest hero to learn"],
  ["KANO", "Wizard who wields raw arcane energy"],
  ["KASSAI", "Cintari Warrior dual-wielding swords"],
  ["KATSU", "Ninja who masters the way of the claw"],
  ["KAYO", "Brute who fights with raw fury"],
  ["LEVIA", "Shadow Brute consumed by blood debt"],
  ["LEXI", "Elemental Ranger from Aria"],
  ["MELODY", "Bard hero who sings songs of power"],
  ["NUU", "Mystic Assassin with dual identity"],
  ["OLDHIM", "Ancient Ice Guardian of Aria"],
  ["OLYMPIA", "Warrior hero of legendary strength"],
  ["OSCILIO", "Lightning Wizard of Metrix"],
  ["PRISM", "Light Illusionist from Solana"],
  ["RHINAR", "Brute from the Savage Lands"],
  ["RIPTIDE", "Pirate Ranger sailing the seas"],
  ["TERRA", "Earth Guardian who protects the wild"],
  ["UZURI", "Assassin from the Pits"],
  ["VALDA", "Guardian from the frozen north"],
  ["VERDANCE", "Earth Illusionist weaving nature magic"],
  ["VICTOR", "Guardian who fights for honor"],
  ["VISERAI", "Runeblade who escaped the Demonastery"],
  ["VYNNSET", "Shadow Runeblade queen of the night"],
  ["ZEN", "Ninja master of focus and flow"],
  ["TAYLOR", "Shapeshifter hero adapting to all forms"],
  ["HALA", "Warrior from ancient times of Rathe"],
  ["JARL", "Guardian leader of northern clans"],
  ["YORICK", "Bard with tales of the forgotten"],
  ["FRANKIE", "Necromancer raising the dead"],
  ["SCURV", "Pirate Thief plundering the seas"],
  ["PUFFIN", "Mechanologist Pirate with flair"],
  ["MAXX", "Mechanologist known as The Hype"],
  ["LYATH", "Guardian with a mane of gold"],
  ["YOJI", "Guardian hero standing resolute"],
  ["MARLYNN", "Pirate Ranger of the High Seas"],
  ["PLEIADES", "Guardian gazing at the stars"],
  ["TUFFNUT", "Brute with an unbreakable skull"],
  ["CRIX", "Guardian pit-fighter"],
  ["REYA", "Guardian pit-fighter of the arena"],
  ["BOLFAR", "Guardian pit-fighter of Rathe"],
  ["SHIYANA", "Shapeshifter who becomes other heroes"],
  ["KAVDAEN", "Merchant dealing in rare wares"],
];
heroList.forEach(([w, c]) => add(w, c, "hero"));

// ═══════════════════════════════════════════════════════
// 2. CLASSES
// ═══════════════════════════════════════════════════════
[
  ["GUARDIAN", "Defensive class wielding shields"],
  ["WARRIOR", "Weapon-focused melee combat class"],
  ["NINJA", "Fast-striking class with combo chains"],
  ["BRUTE", "Class known for intimidation and fury"],
  ["WIZARD", "Arcane damage dealer class"],
  ["RANGER", "Class attacking from range with arrows"],
  ["ASSASSIN", "Stealth-based class from the underworld"],
  ["BARD", "Musical class that buffs with songs"],
  ["PIRATE", "Seafaring class plundering for loot"],
  ["MERCHANT", "Trading class dealing in goods"],
  ["RUNEBLADE", "Arcane melee hybrid class"],
  ["THIEF", "Sneaky class that steals from opponents"],
  ["GENERIC", "Class-neutral cards usable by all heroes"],
].forEach(([w, c]) => add(w, c, "class"));

// ═══════════════════════════════════════════════════════
// 3. TALENTS
// ═══════════════════════════════════════════════════════
[
  ["DRACONIC", "Dragon-themed talent from Volcor"],
  ["SHADOW", "Dark talent from the Demonastery"],
  ["LIGHT", "Radiant talent from Solana"],
  ["ICE", "Freezing talent of the north"],
  ["EARTH", "Nature-based talent of growth"],
  ["MYSTIC", "Arcane talent of the Nether"],
  ["ROYAL", "Noble talent of the Uprising era"],
  ["CHAOS", "Unpredictable talent of disorder"],
  ["ELEMENTAL", "Talent harnessing primal forces"],
].forEach(([w, c]) => add(w, c, "talent"));

// ═══════════════════════════════════════════════════════
// 4. KEYWORDS
// ═══════════════════════════════════════════════════════
[
  ["DOMINATE", "Defend with only one card from hand"],
  ["CRUSH", "Triggers when not fully defended"],
  ["REPRISE", "Triggers when opponent defends"],
  ["COMBO", "Requires a specific prior card"],
  ["BOOST", "Banish top of deck for bonus"],
  ["STEALTH", "Cannot defend from arsenal"],
  ["WARD", "Prevents targeting by opponent"],
  ["TEMPER", "Place counters, destroy at threshold"],
  ["HEAVE", "Trigger at end of turn if unplayed"],
  ["SURGE", "Bonus on second action or later"],
  ["FREEZE", "Locks opponent cards for a turn"],
  ["FUSION", "Reveal card to power up attack"],
  ["CHARGE", "Put into soul when played"],
  ["FLOW", "Lightning keyword granting bonus"],
  ["BOND", "Earth keyword connecting to nature"],
  ["OPT", "Look at top cards and rearrange"],
  ["RELOAD", "Ranger: put arrow into arsenal"],
  ["AMBUSH", "Play from hand as defense"],
  ["TOWER", "Guardian keyword stacking defenses"],
  ["CRANK", "Mechanologist: rotate for power"],
  ["MARK", "Assassin: place a contract"],
  ["AMP", "Wizard: boost next arcane damage"],
  ["MIRAGE", "Illusionist: creating false images"],
  ["HEAVY", "Makes attack harder to defend"],
  ["GALVANIZE", "Grants extra go again"],
  ["AWAKEN", "Trigger powerful nature effects"],
  ["PROTECT", "Guardian defending allies"],
  ["NEGATE", "Counter an effect or action"],
  ["RUPTURE", "Deals damage through armor"],
  ["SCRAP", "Mechanologist recycling items"],
  ["STEAL", "Pirate taking resources"],
  ["WAGER", "Bet on outcome for bonus"],
  ["SPECTRA", "Illusionist spectral images"],
  ["QUELL", "Reduce cost of next card"],
  ["CLASH", "Compare power with opponent"],
  ["CHANNEL", "Pay life for powerful effects"],
  ["CONTRACT", "Assassin marking a target"],
  ["PHANTASM", "Destroyed by 6+ power attack"],
  ["PIERCING", "Damage through equipment"],
  ["MELD", "Combine two cards into one"],
  ["ESSENCE", "Pay with element for effect"],
  ["CLOAKED", "Hidden until revealed"],
  ["MODULAR", "Evo equipment upgrade"],
  ["DECOMPOSE", "Brute graveyard keyword"],
  ["EPHEMERAL", "Exists only temporarily"],
  ["SUSPENSE", "Effect delayed until trigger"],
  ["TRANSCEND", "Ascending beyond limits"],
  ["TRANSFORM", "Change card into another form"],
  ["UNITY", "Rewarding same-class synergy"],
  ["LEGENDARY", "Unique powerful equipment"],
  ["OVERPOWER", "Extra power in conditions"],
  ["SHARPEN", "Increase weapon power"],
  ["SOLFLARE", "Light keyword radiant burst"],
  ["PAIRS", "Combine two cards for effect"],
  ["RETRIEVE", "Get card back from graveyard"],
  ["SPELLVOID", "Equipment absorbing arcane"],
  ["GUARDWELL", "Guardian defense bonus"],
  ["BATTLEWORN", "Equipment losing durability"],
].forEach(([w, c]) => add(w, c, "keyword"));

// ═══════════════════════════════════════════════════════
// 5. LORE & LOCATIONS
// ═══════════════════════════════════════════════════════
[
  ["ARIA", "Continent of ice and Guardians"],
  ["METRIX", "Steampunk city of Mechanologists"],
  ["SOLANA", "City of Light, Illusionist home"],
  ["VOLCOR", "Volcanic realm of Draconic heroes"],
  ["RATHE", "The world of Flesh and Blood"],
  ["SAVAGE", "___ Lands: Rhinar homeland"],
  ["PITS", "Underground realm of Assassins"],
  ["DUSK", "___ till Dawn: tales of night"],
  ["NEKRIA", "Dark realm of Shadow"],
  ["KYLORIA", "Mysterious region of Rathe"],
  ["OUVIA", "Lush region of Earth talent"],
  ["MISTERIA", "Mist-shrouded home of Ninjas"],
  ["FYENDAL", "Legendary figure: Heart of ___"],
  ["THEMAI", "Ancient dragon of Rathe"],
  ["TOMELTAI", "Dragon invoked by Dromai"],
  ["AZVOLAI", "Dragon invoked by Dromai"],
  ["CROMAI", "Dragon invoked by Dromai"],
  ["DOMINIA", "Dark realm invoked by Shadow"],
  ["CINTARI", "Desert warrior clan of Kassai"],
  ["MIRAGAI", "Spirit tiger of the Ninja class"],
  ["YENDURAI", "Ancient Guardian spirit"],
  ["LUMINARIS", "Radiant Illusionist weapon"],
  ["DAWNBLADE", "Warrior weapon of light"],
  ["DUSKBLADE", "Shadow Runeblade weapon"],
  ["ANOTHOS", "Bravo's legendary hammer"],
].forEach(([w, c]) => add(w, c, "lore"));

// ═══════════════════════════════════════════════════════
// 6. TYPES & EQUIPMENT
// ═══════════════════════════════════════════════════════
[
  ["ATTACK", "Most common action card type"],
  ["WEAPON", "Equipment you strike with"],
  ["INSTANT", "Card playable during any window"],
  ["AURA", "Persistent enchantment type"],
  ["SWORD", "Weapon for Warriors"],
  ["DAGGER", "Small blade for quick strikes"],
  ["BOW", "Weapon for Rangers"],
  ["STAFF", "Weapon for Wizards"],
  ["AXE", "Weapon for Brutes and Guardians"],
  ["HAMMER", "Heavy crushing weapon"],
  ["SHIELD", "Off-hand for blocking"],
  ["CHEST", "Equipment slot for torso"],
  ["HEAD", "Equipment slot for helmets"],
  ["LEGS", "Equipment slot below the waist"],
  ["CLAW", "Weapon for Ninjas"],
  ["SCYTHE", "Curved blade weapon"],
  ["FLAIL", "Chain and ball weapon"],
  ["GUN", "Ranged Mechanologist weapon"],
  ["PISTOL", "One-handed firearm weapon"],
  ["TOKEN", "Generated card, temporary"],
  ["ALLY", "Companion fighting alongside you"],
  ["ANGEL", "Celestial Light creature"],
  ["DEMON", "Dark Shadow creature"],
  ["DRAGON", "Creature summoned by Dromai"],
  ["FIGMENT", "Illusory creation, breaks at 6+"],
  ["LUTE", "Musical weapon for Bards"],
  ["FIDDLE", "String instrument for Bards"],
  ["SONG", "Bard subtype creating melodies"],
  ["TRAP", "Ranger card set face-down"],
  ["ARROW", "Ranger ammunition subtype"],
  ["ORB", "Off-hand for arcane users"],
  ["QUIVER", "Equipment holding arrows"],
  ["GEM", "Collectible item type"],
  ["BOOK", "Equipment for knowledge"],
  ["SCROLL", "Item with written magic"],
  ["POLEARM", "Long-reach weapon"],
  ["CANNON", "Heavy ranged weapon"],
  ["CLUB", "Blunt weapon subtype"],
  ["HELM", "Protective headgear"],
  ["ARMS", "Equipment for hands/wrists"],
  ["ASH", "Draconic token left by fire"],
  ["CHI", "Mystic energy for Ninjas"],
  ["MENTOR", "Card guiding young heroes"],
  ["WRENCH", "Mechanologist tool weapon"],
  ["SCEPTER", "Royal weapon of authority"],
  ["ITEM", "Usable object subtype"],
  ["LANDMARK", "Persistent location card"],
  ["SHURIKEN", "Throwing star for Ninjas"],
  ["CONSTRUCT", "Mechanical creature token"],
  ["ROCK", "Thrown projectile of Brutes"],
].forEach(([w, c]) => add(w, c, "type"));

// ═══════════════════════════════════════════════════════
// 7. MECHANICS
// ═══════════════════════════════════════════════════════
[
  ["PITCH", "Place card for resources"],
  ["BANISH", "Zone for removed cards"],
  ["BLOCK", "Defend by playing cards"],
  ["ARCANE", "Damage bypassing physical defense"],
  ["DEFENSE", "Card value used for blocking"],
  ["ARSENAL", "Zone for one face-down card"],
  ["DECK", "Your main pile of 60+ cards"],
  ["SOUL", "Zone under hero for Light/Shadow"],
  ["COMBAT", "___ chain: attack sequence"],
  ["CHAIN", "Linked sequence of attacks"],
  ["POWER", "How hard an attack hits"],
  ["COST", "Resources needed to play a card"],
  ["HERO", "Main character with life total"],
  ["LIFE", "Health: zero means you lose"],
  ["DRAW", "Pull cards from deck"],
  ["TURN", "One cycle: start, action, end"],
  ["HAND", "Cards to play or defend with"],
  ["RED", "Pitch strip: 0 resources"],
  ["YELLOW", "Pitch strip: 2 resources"],
  ["BLUE", "Pitch strip: 3 resources"],
  ["ACTION", "Phase for attack cards"],
  ["GRAVEYARD", "Discard pile for used cards"],
  ["STACK", "Multiple cards defending"],
  ["ZONE", "Game area like hand or deck"],
  ["SLOT", "Equipment position on hero"],
  ["PUMP", "Buff an attack power"],
  ["BREAK", "Blade ___: destroy equipment"],
  ["SWING", "Weapon attack action"],
  ["COUNTER", "Token for tracking on cards"],
].forEach(([w, c]) => add(w, c, "mechanic"));

// ═══════════════════════════════════════════════════════
// 8. RARITY, SETS, EVENTS, GENERAL
// ═══════════════════════════════════════════════════════
[
  ["COMMON", "Most basic card rarity"],
  ["RARE", "Mid-tier card rarity"],
  ["MAJESTIC", "Premium gold-bordered rarity"],
  ["FABLED", "Rarest mythical rarity"],
  ["MARVEL", "Ultra-rare alternative art"],
  ["PROMO", "Special limited-edition rarity"],
  ["MONARCH", "Set: Light and Shadow"],
  ["UPRISING", "Set: Dromai and Fai"],
  ["DYNASTY", "Set: Emperor and Royals"],
  ["EVERFEST", "Carnival-themed set"],
  ["BLITZ", "Fast format: 40 cards"],
  ["DRAFT", "Limited: build from packs"],
  ["SEALED", "Limited: 6 boosters"],
  ["CALLING", "Major competitive tournament"],
  ["ARMORY", "Weekly store-level event"],
  ["SKIRMISH", "Local competitive event"],
  ["WORLDS", "Ultimate championship event"],
  ["YOUNG", "Hero age for Blitz"],
  ["ADULT", "Hero age for Classic"],
  ["FOIL", "Shiny premium card finish"],
  ["COLD", "___ Foil: rarest finish"],
  ["FATIGUE", "Strategy grinding deck out"],
  ["AGGRO", "Fast aggressive strategy"],
  ["TEMPO", "Pace and rhythm of play"],
  ["VALUE", "Card advantage and efficiency"],
  ["ENDGAME", "Late phase, decks nearly empty"],
].forEach(([w, c]) => add(w, c, "general"));

// ═══════════════════════════════════════════════════════
// 9. SINGLE-WORD CARD NAMES (auto-generated from data)
// ═══════════════════════════════════════════════════════
const singleWordCards = cards.filter((c) => /^[A-Za-z]{3,9}$/.test(c.name));
const singleCardMap = {};
singleWordCards.forEach((c) => {
  const w = c.name.toUpperCase();
  if (!singleCardMap[w]) singleCardMap[w] = c;
});

Object.entries(singleCardMap).forEach(([w, c]) => {
  if (seen.has(w)) return;
  const cls = (c.classes || []).filter((x) => x !== "Generic" && x !== "NotClassed")[0] || "";
  const text = (c.functionalText || "").split(/[.\n]/)[0].substring(0, 55);
  let clue;
  if (cls && text) clue = cls + " card: " + text;
  else if (text) clue = "Card: " + text;
  else if (cls) clue = cls + " card in FaB";
  else clue = "FaB card name";
  // Clean up clue - remove markdown, special chars, resource symbols
  clue = clue.replace(/\*\*/g, "").replace(/\{[^}]*\}/g, "").replace(/  +/g, " ").replace(/\s*\/\/\s*/g, " / ").trim();
  // Remove trailing incomplete sentences
  if (clue.length > 60) clue = clue.substring(0, 57).replace(/\s+\S*$/, "") + "...";
  if (!clue || clue.length < 5) clue = (cls || "FaB") + " card name";
  add(w, clue, "card");
});

// ═══════════════════════════════════════════════════════
// 10. FREQUENT CARD-NAME WORDS (appear in 3+ cards)
// ═══════════════════════════════════════════════════════
const skipWords = new Set([
  "THE","AND","FOR","WITH","FROM","YOUR","OUT","OFF","INTO","THAT","THIS",
  "THAN","HIS","HER","ALL","HAS","NOT","BUT","WHO","WHAT","HOW","WHEN",
  "ONE","TWO","ITS","OVER","UPON","LIKE","JUST","MORE","BEEN","SOME",
  "ONLY","EACH","ALSO","THEM","THEY","WERE","WILL","CAN","OUR","MAY",
  "ABOUT","WELL","VERY","COME","CAME","MUCH","HAVE","MADE","MAKE","WAY",
  "OWN","GET","DOES","YET","SAY","SHE","LET","SAW","TOO","YOU","ARE",
  "WAS","HAD","HIM","DID","ANY","FEW","USE","NOW","ODD","RAN","PUT",
  "GOT","TRY","ASK","AGO","END","FAR","FIT","HOT","LAY","MET","PAY",
  "RAG","RAW","RID","SAD","SIT","SIX","TEN","TOP","WON","BAD","SET",
  "SEA","PIT","ARC","AGE","NEW","OLD","BIG",
]);

const wordFreq = {};
cards.forEach((c) => {
  c.name.split(/[^A-Za-z]+/)
    .filter((w) => w.length >= 3 && w.length <= 9 && /^[A-Za-z]+$/.test(w))
    .forEach((w) => {
      const u = w.toUpperCase();
      if (skipWords.has(u)) return;
      if (!wordFreq[u]) wordFreq[u] = { count: 0, cards: [], classes: new Set() };
      wordFreq[u].count++;
      (c.classes || []).forEach((cl) => wordFreq[u].classes.add(cl));
      if (wordFreq[u].cards.length < 3) wordFreq[u].cards.push(c.name);
    });
});

// Words appearing 3+ times - generate clues from card context
Object.entries(wordFreq)
  .filter(([, d]) => d.count >= 3)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([word, data]) => {
    if (seen.has(word)) return;
    const ex = data.cards[0];
    const cls = [...data.classes].filter((x) => x !== "Generic" && x !== "NotClassed");
    let clue;
    if (cls.length === 1) clue = cls[0] + " word, as in " + ex;
    else clue = "As seen in " + ex;
    if (clue.length > 65) clue = clue.substring(0, 62) + "...";
    add(word, clue, "cardword");
  });

// Words appearing exactly 2 times
Object.entries(wordFreq)
  .filter(([, d]) => d.count === 2)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([word, data]) => {
    if (seen.has(word)) return;
    const c1 = data.cards[0];
    const c2 = data.cards[1];
    let clue = "From " + c1 + " & " + c2;
    if (clue.length > 65) clue = "From " + c1;
    if (clue.length > 65) clue = clue.substring(0, 62) + "...";
    add(word, clue, "cardword");
  });

// ═══════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════
const cats = {};
entries.forEach((e) => {
  cats[e.category] = (cats[e.category] || 0) + 1;
});
console.log("Total entries:", entries.length);
console.log("Categories:", JSON.stringify(cats, null, 2));

// Write the TypeScript file
let ts = 'import type { WordEntry } from "./types";\n\n';
ts += "export const WORD_BANK: WordEntry[] = [\n";

const catOrder = [
  "hero","class","talent","keyword","lore","type","mechanic",
  "general","card","cardword",
];
const catLabels = {
  hero: "Heroes",
  class: "Classes",
  talent: "Talents",
  keyword: "Keywords",
  lore: "Lore & Locations",
  type: "Types & Equipment",
  mechanic: "Game Mechanics",
  general: "General FaB Terms",
  card: "Card Names",
  cardword: "Card Name Words",
};

for (const cat of catOrder) {
  const catEntries = entries.filter((e) => e.category === cat);
  if (catEntries.length === 0) continue;
  ts += `  // ── ${catLabels[cat] || cat} (${catEntries.length}) ──\n`;
  for (const e of catEntries) {
    const clueEsc = e.clue.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    ts += `  { word: "${e.word}", clue: "${clueEsc}", category: "${e.category}" },\n`;
  }
  ts += "\n";
}

ts += "];\n";

const outPath = path.join(__dirname, "..", "src", "lib", "crossword", "word-bank.ts");
fs.writeFileSync(outPath, ts);
console.log("Written to:", outPath);
console.log("File size:", (ts.length / 1024).toFixed(1) + " KB");
