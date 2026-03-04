import type { ConnectionsPuzzle } from "./types";

export const CONNECTIONS_PUZZLES: ConnectionsPuzzle[] = [
  {
    id: 1,
    groups: [
      { name: "Ninja Heroes", words: ["Katsu", "Benji", "Zen", "Fai"], difficulty: 1 },
      { name: "Warrior Heroes", words: ["Dorinthea", "Kassai", "Boltyn", "Victor"], difficulty: 2 },
      { name: "Shadow Heroes", words: ["Chane", "Levia", "Vynnset", "Ursur"], difficulty: 3 },
      { name: "Mechanologist Heroes", words: ["Dash", "Maxx", "Teklovossen", "Data Doll"], difficulty: 4 },
    ],
  },
  {
    id: 2,
    groups: [
      { name: "Equipment Slots", words: ["Head", "Chest", "Arms", "Legs"], difficulty: 1 },
      { name: "Card Types", words: ["Action", "Instant", "Resource", "Equipment"], difficulty: 2 },
      { name: "Token Types", words: ["Seismic Surge", "Spectral Shield", "Vigor", "Agility"], difficulty: 3 },
      { name: "Pitch Values", words: ["Red", "Yellow", "Blue", "Colorless"], difficulty: 4 },
    ],
  },
  {
    id: 3,
    groups: [
      { name: "Regions of Rathe", words: ["Solana", "Metrix", "Aria", "Volcor"], difficulty: 1 },
      { name: "Weapon Types", words: ["Sword", "Hammer", "Bow", "Dagger"], difficulty: 2 },
      { name: "Welcome to Rathe Heroes", words: ["Rhinar", "Dorinthea", "Bravo", "Katsu"], difficulty: 3 },
      { name: "Heroes Associated with Go Again", words: ["Fai", "Dash", "Kano", "Benji"], difficulty: 4 },
    ],
  },
  {
    id: 4,
    groups: [
      { name: "Guardian Heroes", words: ["Bravo", "Oldhim", "Betsy", "Victor Goldmane"], difficulty: 1 },
      { name: "Ranger Heroes", words: ["Azalea", "Lexi", "Riptide", "Death Dealer"], difficulty: 2 },
      { name: "Wizard Heroes", words: ["Kano", "Iyslander", "Oscilio", "Verdance"], difficulty: 3 },
      { name: "Illusionist Heroes", words: ["Prism", "Dromai", "Nuu", "Enigma"], difficulty: 4 },
    ],
  },
  {
    id: 5,
    groups: [
      { name: "Monarch Heroes", words: ["Prism", "Levia", "Chane", "Boltyn"], difficulty: 1 },
      { name: "Uprising Heroes", words: ["Fai", "Dromai", "Iyslander", "Lexi"], difficulty: 2 },
      { name: "Bright Lights Heroes", words: ["Dash I/O", "Maxx", "Teklovossen", "Data Doll"], difficulty: 3 },
      { name: "Heavy Hitters Heroes", words: ["Victor", "Betsy", "Kayo", "Rhinar"], difficulty: 4 },
    ],
  },
  {
    id: 6,
    groups: [
      { name: "Attack Reactions", words: ["Pummel", "Overpower", "Razor Reflex", "Sharpen Steel"], difficulty: 1 },
      { name: "Defense Reactions", words: ["Sink Below", "Unmovable", "Fate Foreseen", "Staunch Response"], difficulty: 2 },
      { name: "Generic Attacks", words: ["Wounded Bull", "Wounding Blow", "Scar for a Scar", "Enlightened Strike"], difficulty: 3 },
      { name: "0-Cost Instants", words: ["Sigil of Solace", "Oasis Respite", "Energy Potion", "Healing Potion"], difficulty: 4 },
    ],
  },
  {
    id: 7,
    groups: [
      { name: "Brute Heroes", words: ["Rhinar", "Kayo", "Levia", "Ursur"], difficulty: 1 },
      { name: "Runeblade Heroes", words: ["Chane", "Viserai", "Briar", "Vynnset"], difficulty: 2 },
      { name: "Light Talent Heroes", words: ["Boltyn", "Prism", "Dorinthea", "Victor Goldmane"], difficulty: 3 },
      { name: "Ice Talent Heroes", words: ["Oldhim", "Iyslander", "Lexi", "Oscilio"], difficulty: 4 },
    ],
  },
  {
    id: 8,
    groups: [
      { name: "Legendary Equipment", words: ["Fyendal's Spring Tunic", "Arcanite Skullcap", "Crown of Seeds", "Ebon Fold"], difficulty: 1 },
      { name: "Majestic Weapons", words: ["Dawnblade", "Rosetta Thorn", "Galaxxi Black", "Nebula Blade"], difficulty: 2 },
      { name: "Famous Auras", words: ["Embodiment of Lightning", "Embodiment of Earth", "Spectral Shield", "Soul Shackle"], difficulty: 3 },
      { name: "Tokens", words: ["Quicken", "Vigor", "Seismic Surge", "Agility"], difficulty: 4 },
    ],
  },
  {
    id: 9,
    groups: [
      { name: "Three-Word Set Names", words: ["Crucible of War", "Tales of Aria", "Dusk till Dawn", "Part the Mistveil"], difficulty: 1 },
      { name: "Booster Set Abbreviations", words: ["WTR", "ARC", "MON", "ELE"], difficulty: 2 },
      { name: "Supplementary Products", words: ["Blitz Deck", "Armory Kit", "Hero Deck", "Classic Battles"], difficulty: 3 },
      { name: "Formats", words: ["Classic Constructed", "Blitz", "Draft", "Sealed"], difficulty: 4 },
    ],
  },
  {
    id: 10,
    groups: [
      { name: "Dorinthea Cards", words: ["Dawnblade", "Steelblade Supremacy", "Ironsong Response", "Glint the Quicksilver"], difficulty: 1 },
      { name: "Katsu Cards", words: ["Harmonized Kodachi", "Lord of Wind", "Flicker Wisp", "Whelming Gustwave"], difficulty: 2 },
      { name: "Bravo Cards", words: ["Anothos", "Crippling Crush", "Righteous Cleansing", "Spinal Crush"], difficulty: 3 },
      { name: "Rhinar Cards", words: ["Romping Club", "Barraging Beatdown", "Alpha Rampage", "Bloodrush Bellow"], difficulty: 4 },
    ],
  },
  {
    id: 11,
    groups: [
      { name: "Savage Lands Residents", words: ["Rhinar", "Kayo", "Levia", "Ursur"], difficulty: 1 },
      { name: "Metrix Citizens", words: ["Dash", "Data Doll", "Maxx", "Teklovossen"], difficulty: 2 },
      { name: "Solana Residents", words: ["Dorinthea", "Boltyn", "Prism", "Victor Goldmane"], difficulty: 3 },
      { name: "Aria Inhabitants", words: ["Briar", "Oldhim", "Lexi", "Verdance"], difficulty: 4 },
    ],
  },
  {
    id: 12,
    groups: [
      { name: "Arrow Attack Cards", words: ["Red in the Ledger", "Bolt'n' Shot", "Sleep Dart", "Hamstring Shot"], difficulty: 1 },
      { name: "Sword Attack Cards", words: ["Singing Steelblade", "Out for Blood", "Hit and Run", "Steelblade Shunt"], difficulty: 2 },
      { name: "Axe Attack Cards", words: ["Swing Big", "Disable", "Reckless Swing", "Lumberjack"], difficulty: 3 },
      { name: "Club Attack Cards", words: ["Barraging Beatdown", "Pack Hunt", "Savage Feast", "Pulping"], difficulty: 4 },
    ],
  },
  {
    id: 13,
    groups: [
      { name: "Cards with Dominate", words: ["Crippling Crush", "Dread Screamer", "Command and Conquer", "Pulverize"], difficulty: 1 },
      { name: "Cards with Intimidate", words: ["Barraging Beatdown", "Alpha Rampage", "Savage Feast", "Bloodrush Bellow"], difficulty: 2 },
      { name: "Cards with Go Again", words: ["Snatch", "Flic Flak", "Salt the Wound", "Rising Knee Thrust"], difficulty: 3 },
      { name: "Cards with Blade Break", words: ["Snapdragon Scalers", "Fyendal's Spring Tunic", "Nullrune Gloves", "Crown of Seeds"], difficulty: 4 },
    ],
  },
  {
    id: 14,
    groups: [
      { name: "Living Legend Heroes", words: ["Briar", "Starvo", "Prism", "Iyslander"], difficulty: 1 },
      { name: "Welcome to Rathe Classes", words: ["Warrior", "Ninja", "Brute", "Guardian"], difficulty: 2 },
      { name: "Arcane Rising Classes", words: ["Mechanologist", "Wizard", "Runeblade", "Ranger"], difficulty: 3 },
      { name: "Talents", words: ["Shadow", "Light", "Elemental", "Ice"], difficulty: 4 },
    ],
  },
  {
    id: 15,
    groups: [
      { name: "Elemental Heroes", words: ["Briar", "Lexi", "Oldhim", "Verdance"], difficulty: 1 },
      { name: "Shadow Runeblade Cards", words: ["Ghostly Visit", "Howl from Beyond", "Eclipse Existence", "Bounding Demigon"], difficulty: 2 },
      { name: "Dragon Cards", words: ["Invoke Tomeltai", "Invoke Kyloria", "Invoke Cromai", "Invoke Dracona Optimai"], difficulty: 3 },
      { name: "Illusionist Auras", words: ["Spectral Shield", "Herald of Erudition", "Herald of Judgment", "Herald of Ravages"], difficulty: 4 },
    ],
  },
  {
    id: 16,
    groups: [
      { name: "Dash Specializations", words: ["Spark of Genius", "High Octane", "Maximum Velocity", "Plasma Purifier"], difficulty: 1 },
      { name: "Katsu Specializations", words: ["Lord of Wind", "Mask of Momentum", "Be Like Water", "Ancestral Empowerment"], difficulty: 2 },
      { name: "Prism Specializations", words: ["Luminaris", "Herald of Erudition", "Ode to Wrath", "Herald of Judgment"], difficulty: 3 },
      { name: "Viserai Specializations", words: ["Nebula Blade", "Arknight Ascendancy", "Sonata Arcanix", "Rune Flash"], difficulty: 4 },
    ],
  },
  {
    id: 17,
    groups: [
      { name: "Young Hero Only", words: ["Benji", "Kayo", "Data Doll", "Riptide"], difficulty: 1 },
      { name: "Adult Hero Only", words: ["Teklovossen", "Victor Goldmane", "Enigma", "Oscilio"], difficulty: 2 },
      { name: "Has Both Young and Adult", words: ["Dash", "Bravo", "Rhinar", "Dorinthea"], difficulty: 3 },
      { name: "Shadow Talent Heroes", words: ["Ursur", "Chane", "Levia", "Vynnset"], difficulty: 4 },
    ],
  },
  {
    id: 18,
    groups: [
      { name: "Pitch 1 (Red) Cards", words: ["Wounding Blow", "Raging Onslaught", "Overpower", "Pummel"], difficulty: 1 },
      { name: "Pitch 3 (Blue) Cards", words: ["Sigil of Solace", "Sink Below", "Energy Potion", "Fate Foreseen"], difficulty: 2 },
      { name: "Majestic Rarity", words: ["Command and Conquer", "Enlightened Strike", "Art of War", "Tome of Fyendal"], difficulty: 3 },
      { name: "Fabled Rarity", words: ["Heart of Fyendal", "Arknight Shard", "Eye of Ophidia", "Great Library of Solana"], difficulty: 4 },
    ],
  },
  {
    id: 19,
    groups: [
      { name: "Draconic Illusionist Cards", words: ["Invoke Tomeltai", "Billowing Mirage", "Invoke Kyloria", "Rake the Embers"], difficulty: 1 },
      { name: "Earth Elemental Cards", words: ["Autumn's Touch", "Channel Mount Heroic", "Embodiment of Earth", "Titan's Fist"], difficulty: 2 },
      { name: "Lightning Elemental Cards", words: ["Ball Lightning", "Embodiment of Lightning", "Flash", "Heaven's Claws"], difficulty: 3 },
      { name: "Ice Elemental Cards", words: ["Aether Hail", "Ice Quake", "Channel Lake Frigid", "Frost Hex"], difficulty: 4 },
    ],
  },
  {
    id: 20,
    groups: [
      { name: "Fai Signature Cards", words: ["Phoenix Flame", "Rise Up", "Lava Burst", "Spreading Flames"], difficulty: 1 },
      { name: "Dromai Signature Cards", words: ["Invoke Tomeltai", "Rake the Embers", "Billowing Mirage", "Invoke Dracona Optimai"], difficulty: 2 },
      { name: "Lexi Signature Cards", words: ["Endless Winter", "Ice Bolt", "Three of a Kind", "Aether Hail"], difficulty: 3 },
      { name: "Iyslander Signature Cards", words: ["Insidious Chill", "Waning Moon", "Channel Lake Frigid", "Frost Hex"], difficulty: 4 },
    ],
  },
  {
    id: 21,
    groups: [
      { name: "Generic Equipment", words: ["Ironrot Helm", "Ironrot Gauntlet", "Ironrot Legs", "Nullrune Gloves"], difficulty: 1 },
      { name: "Ninja Equipment", words: ["Mask of Momentum", "Snapdragon Scalers", "Breaking Scales", "Vest of the First Fist"], difficulty: 2 },
      { name: "Warrior Equipment", words: ["Courage of Bladehold", "Refraction Bolters", "Gallantry Gold", "Braveforge Bracers"], difficulty: 3 },
      { name: "Guardian Equipment", words: ["Rampart of the Ram's Head", "Crater Fist", "Tectonic Plating", "Crown of Seeds"], difficulty: 4 },
    ],
  },
  {
    id: 22,
    groups: [
      { name: "FaB Pro Tour Locations", words: ["Baltimore", "Lille", "Barcelona", "Los Angeles"], difficulty: 1 },
      { name: "Calling Locations", words: ["Las Vegas", "Auckland", "Birmingham", "Singapore"], difficulty: 2 },
      { name: "World Championship Years", words: ["2019", "2022", "2023", "2024"], difficulty: 3 },
      { name: "Set Release Years (2020)", words: ["Crucible of War", "Ira Welcome Deck", "Welcome to Rathe", "Arcane Rising"], difficulty: 4 },
    ],
  },
  {
    id: 23,
    groups: [
      { name: "Briar Cards", words: ["Rosetta Thorn", "Sting of Sorcery", "Channel Mount Heroic", "Embodiment of Lightning"], difficulty: 1 },
      { name: "Oldhim Cards", words: ["Winter's Wail", "Endless Winter", "Stalagmite", "Oaken Old"], difficulty: 2 },
      { name: "Chane Cards", words: ["Eclipse Existence", "Shadow of Blasmophet", "Seeds of Agony", "Rift Bind"], difficulty: 3 },
      { name: "Levia Cards", words: ["Dread Screamer", "Deadwood Rumbler", "Endless Maw", "Soul Harvest"], difficulty: 4 },
    ],
  },
  {
    id: 24,
    groups: [
      { name: "Outsiders Heroes", words: ["Uzuri", "Riptide", "Arakni", "Azalea"], difficulty: 1 },
      { name: "Uprising Heroes", words: ["Dromai", "Fai", "Emperor", "Iyslander"], difficulty: 2 },
      { name: "Heroes Debuting 2021-2022", words: ["Bravo Star", "Lexi", "Oldhim", "Briar"], difficulty: 3 },
      { name: "Monarch Talents", words: ["Light", "Shadow", "Light Warrior", "Shadow Brute"], difficulty: 4 },
    ],
  },
  {
    id: 25,
    groups: [
      { name: "Assassin Cards", words: ["Leave No Witnesses", "Isolate", "Infiltrate", "Contract"], difficulty: 1 },
      { name: "Ranger Cards", words: ["Take Aim", "Rapid Fire", "Red in the Ledger", "Sleep Dart"], difficulty: 2 },
      { name: "Ninja Combo Cards", words: ["Whelming Gustwave", "Surging Strike", "Rising Knee Thrust", "Spinning Kicks"], difficulty: 3 },
      { name: "Generic Majestics", words: ["Command and Conquer", "Enlightened Strike", "Art of War", "Tome of Fyendal"], difficulty: 4 },
    ],
  },
  {
    id: 26,
    groups: [
      { name: "Runeblade Weapons", words: ["Nebula Blade", "Rosetta Thorn", "Reaping Blade", "Shadow of Ursur"], difficulty: 1 },
      { name: "Guardian Weapons", words: ["Anothos", "Winter's Wail", "Titan's Fist", "Sledge of Anvilheim"], difficulty: 2 },
      { name: "Ninja Weapons", words: ["Harmonized Kodachi", "Zephyr Needle", "Tiger Stripe Shuko", "Mask of the Pouncing Lynx"], difficulty: 3 },
      { name: "Mechanologist Weapons", words: ["Teklo Plasma Pistol", "Galaxxi Black", "Plasma Purifier", "Hyper Driver"], difficulty: 4 },
    ],
  },
  {
    id: 27,
    groups: [
      { name: "Fire Themed Cards", words: ["Phoenix Flame", "Lava Burst", "Blaze Headlong", "Spreading Flames"], difficulty: 1 },
      { name: "Ice Themed Cards", words: ["Frost Hex", "Aether Hail", "Ice Quake", "Insidious Chill"], difficulty: 2 },
      { name: "Lightning Themed Cards", words: ["Ball Lightning", "Flash", "Heaven's Claws", "Shock Charmers"], difficulty: 3 },
      { name: "Earth Themed Cards", words: ["Autumn's Touch", "Stalagmite", "Oaken Old", "Burgeoning"], difficulty: 4 },
    ],
  },
  {
    id: 28,
    groups: [
      { name: "Boltyn Cards", words: ["Raydn", "Bolting Blade", "Lumina Ascension", "V of the Vanguard"], difficulty: 1 },
      { name: "Kassai Cards", words: ["Cintari Saber", "Blood on Her Hands", "Kassai of the Golden Sand", "Hot Streak"], difficulty: 2 },
      { name: "Azalea Cards", words: ["Death Dealer", "Red in the Ledger", "Hamstring Shot", "Rapid Fire"], difficulty: 3 },
      { name: "Kano Cards", words: ["Crucible of Aetherweave", "Aether Wildfire", "Blazing Aether", "Scalding Rain"], difficulty: 4 },
    ],
  },
  {
    id: 29,
    groups: [
      { name: "Solana's Order of the Light", words: ["Boltyn", "Dorinthea", "Prism", "Victor Goldmane"], difficulty: 1 },
      { name: "Demonastery Denizens", words: ["Chane", "Vynnset", "Levia", "Ursur"], difficulty: 2 },
      { name: "Pits of Frenzied Beasts", words: ["Rhinar", "Kayo", "Mandible Claw", "Romping Club"], difficulty: 3 },
      { name: "Misteria's Illusionists", words: ["Miragai", "Enigma", "Nuu", "Phantasmal Haze"], difficulty: 4 },
    ],
  },
  {
    id: 30,
    groups: [
      { name: "Brute Attack Actions", words: ["Pack Hunt", "Savage Feast", "Barraging Beatdown", "Alpha Rampage"], difficulty: 1 },
      { name: "Warrior Attack Actions", words: ["Singing Steelblade", "Out for Blood", "Hit and Run", "Rout"], difficulty: 2 },
      { name: "Ninja Attack Actions", words: ["Surging Strike", "Flicker Wisp", "Rising Knee Thrust", "Flying Kick"], difficulty: 3 },
      { name: "Guardian Attack Actions", words: ["Crippling Crush", "Spinal Crush", "Righteous Cleansing", "Cranial Crush"], difficulty: 4 },
    ],
  },
  {
    id: 31,
    groups: [
      { name: "Power 6+ Attacks", words: ["Crippling Crush", "Alpha Rampage", "Command and Conquer", "Dread Screamer"], difficulty: 1 },
      { name: "Power 0 Cards", words: ["Sigil of Solace", "Energy Potion", "Potion of Strength", "Tome of Fyendal"], difficulty: 2 },
      { name: "3-Defense Cards", words: ["Sink Below", "Fate Foreseen", "Unmovable", "Staunch Response"], difficulty: 3 },
      { name: "Tunic Effects", words: ["Fyendal's Spring Tunic", "Vest of the First Fist", "Silken Form", "Snapdragon Scalers"], difficulty: 4 },
    ],
  },
  {
    id: 32,
    groups: [
      { name: "Dromai's Dragons", words: ["Tomeltai", "Kyloria", "Cromai", "Dracona Optimai"], difficulty: 1 },
      { name: "Prism's Heralds", words: ["Herald of Erudition", "Herald of Judgment", "Herald of Ravages", "Herald of Triumph"], difficulty: 2 },
      { name: "Levia's Shadow Cards", words: ["Endless Maw", "Soul Harvest", "Deadwood Rumbler", "Dread Screamer"], difficulty: 3 },
      { name: "Chane's Banished Zone Cards", words: ["Seeds of Agony", "Eclipse Existence", "Rift Bind", "Shadow of Blasmophet"], difficulty: 4 },
    ],
  },
  {
    id: 33,
    groups: [
      { name: "Flesh and Blood World Creators", words: ["James White", "Legend Story Studios", "New Zealand", "Auckland"], difficulty: 1 },
      { name: "Set Names with a Place", words: ["Tales of Aria", "Bright Lights", "Rosetta", "Part the Mistveil"], difficulty: 2 },
      { name: "3-Letter Set Codes", words: ["WTR", "ARC", "MON", "ELE"], difficulty: 3 },
      { name: "4-Letter Set Codes", words: ["EVRF", "UPRS", "DYNS", "OUTS"], difficulty: 4 },
    ],
  },
  {
    id: 34,
    groups: [
      { name: "Ninja Combo Starters", words: ["Whelming Gustwave", "Lord of Wind", "Torrent of Tempo", "Ancestral Empowerment"], difficulty: 1 },
      { name: "Cards that Create Tokens", words: ["Dromai", "Briar", "Prism", "Enigma"], difficulty: 2 },
      { name: "Cards with Reload", words: ["Azalea", "Riptide", "Lexi", "Uzuri"], difficulty: 3 },
      { name: "Cards with Heave", words: ["Betsy", "Victor", "Bravo", "Oldhim"], difficulty: 4 },
    ],
  },
  {
    id: 35,
    groups: [
      { name: "1-Cost Attack Actions", words: ["Snatch", "Scar for a Scar", "Wounded Bull", "Wounding Blow"], difficulty: 1 },
      { name: "2-Cost Attack Actions", words: ["Enlightened Strike", "Command and Conquer", "Art of War", "Crippling Crush"], difficulty: 2 },
      { name: "3-Cost Attack Actions", words: ["Pulverize", "Dread Screamer", "Alpha Rampage", "Cranial Crush"], difficulty: 3 },
      { name: "0-Cost Attack Actions", words: ["Flying Kick", "Lunging Press", "Leg Tap", "Salt the Wound"], difficulty: 4 },
    ],
  },
  {
    id: 36,
    groups: [
      { name: "Viserai Cards", words: ["Nebula Blade", "Arknight Ascendancy", "Sonata Arcanix", "Mauvrion Skies"], difficulty: 1 },
      { name: "Briar Cards", words: ["Rosetta Thorn", "Channel Mount Heroic", "Sting of Sorcery", "Embodiment of Lightning"], difficulty: 2 },
      { name: "Enigma Cards", words: ["Haze Shelter", "Miragai", "Phantasmal Haze", "Pass Over"], difficulty: 3 },
      { name: "Nuu Cards", words: ["Spider's Bite", "Venomous Bite", "Twin Fang Strike", "Assassin's Guile"], difficulty: 4 },
    ],
  },
  {
    id: 37,
    groups: [
      { name: "Volcor Residents", words: ["Fai", "Dromai", "Emperor", "Zen"], difficulty: 1 },
      { name: "The Pits Characters", words: ["Rhinar", "Kayo", "Mandible Claw", "Pack Hunt"], difficulty: 2 },
      { name: "Misteria Characters", words: ["Enigma", "Nuu", "Haze Shelter", "Miragai"], difficulty: 3 },
      { name: "Demonastery Characters", words: ["Chane", "Vynnset", "Ursur", "Blasmophet"], difficulty: 4 },
    ],
  },
  {
    id: 38,
    groups: [
      { name: "Classic Staples (Every Deck)", words: ["Sink Below", "Fate Foreseen", "Pummel", "Razor Reflex"], difficulty: 1 },
      { name: "Commonly Banned Cards", words: ["Drone of Brutality", "Belittle", "Plunder Run", "Seeds of Agony"], difficulty: 2 },
      { name: "Pro Tour Winning Heroes", words: ["Katsu", "Briar", "Dash I/O", "Fai"], difficulty: 3 },
      { name: "Calling Event Winning Heroes", words: ["Bravo", "Prism", "Oldhim", "Dorinthea"], difficulty: 4 },
    ],
  },
  {
    id: 39,
    groups: [
      { name: "Warrior Weapons", words: ["Dawnblade", "Cintari Saber", "Hatchet of Body", "Hatchet of Mind"], difficulty: 1 },
      { name: "Brute Weapons", words: ["Romping Club", "Mandible Claw", "Ravenous Meataxe", "Skull Crushers"], difficulty: 2 },
      { name: "Ranger Weapons", words: ["Death Dealer", "Voltaire", "Barbed Castaway", "Shiver"], difficulty: 3 },
      { name: "Wizard Weapons", words: ["Crucible of Aetherweave", "Waning Moon", "Staff of Tides", "Wildfire"], difficulty: 4 },
    ],
  },
  {
    id: 40,
    groups: [
      { name: "Cards with the Word 'Shadow'", words: ["Shadow of Blasmophet", "Shadow of Ursur", "Shadow Puppetry", "Shadow Walk"], difficulty: 1 },
      { name: "Cards with the Word 'Light'", words: ["Engulfing Light", "Blinding Light", "Lumina Ascension", "Light of Sol"], difficulty: 2 },
      { name: "Cards with the Word 'Storm'", words: ["Storm Striders", "Aether Storm", "Storm Strafe", "Lightning Storm"], difficulty: 3 },
      { name: "Cards with the Word 'Blood'", words: ["Blood on Her Hands", "Bloodrush Bellow", "Blood Tribute", "Bloodrot Pox"], difficulty: 4 },
    ],
  },
  {
    id: 41,
    groups: [
      { name: "Sets Released in 2021", words: ["Monarch", "Tales of Aria", "Monarch Unlimited", "Tales of Aria Unlimited"], difficulty: 1 },
      { name: "Sets Released in 2022", words: ["Uprising", "Dynasty", "Everfest", "Classic Battles"], difficulty: 2 },
      { name: "Sets Released in 2023", words: ["Bright Lights", "Dusk till Dawn", "Heavy Hitters", "Part the Mistveil"], difficulty: 3 },
      { name: "Sets Released in 2024", words: ["Rosetta", "Hunted", "The Hunted", "Round the Table"], difficulty: 4 },
    ],
  },
  {
    id: 42,
    groups: [
      { name: "Boltyn's Light Attacks", words: ["Bolting Blade", "Lumina Ascension", "V of the Vanguard", "Raydn"], difficulty: 1 },
      { name: "Uzuri's Assassin Cards", words: ["Leave No Witnesses", "Isolate", "Contract", "Infiltrate"], difficulty: 2 },
      { name: "Arakni's Stealth Cards", words: ["Shank", "Surgical Extraction", "From the Shadows", "Silent Stiletto"], difficulty: 3 },
      { name: "Riptide's Pirate Cards", words: ["Barbed Castaway", "High Seas Swashbuckler", "Plunder Run", "Cutlass"], difficulty: 4 },
    ],
  },
  {
    id: 43,
    groups: [
      { name: "Generic Defense Reactions", words: ["Sink Below", "Fate Foreseen", "Unmovable", "Staunch Response"], difficulty: 1 },
      { name: "Generic Attack Reactions", words: ["Pummel", "Razor Reflex", "Overpower", "Sharpen Steel"], difficulty: 2 },
      { name: "Wizard Instants", words: ["Blazing Aether", "Scalding Rain", "Aether Wildfire", "Voltic Bolt"], difficulty: 3 },
      { name: "Illusionist Non-Attack Actions", words: ["Spectral Shield", "Haze Shelter", "Phantasmal Haze", "Figment of Erudition"], difficulty: 4 },
    ],
  },
  {
    id: 44,
    groups: [
      { name: "Classic Constructed Legal", words: ["Blitz", "Classic Constructed", "Draft", "Sealed"], difficulty: 1 },
      { name: "Creature Token Names", words: ["Tomeltai", "Kyloria", "Cromai", "Spectral Shield"], difficulty: 2 },
      { name: "Named Landmarks in Rathe", words: ["Mount Heroic", "Lake Frigid", "Golden Sand", "The Pits"], difficulty: 3 },
      { name: "Banned in Blitz", words: ["Drone of Brutality", "Seeds of Agony", "Ball Lightning", "Bloodrot Pox"], difficulty: 4 },
    ],
  },
  {
    id: 45,
    groups: [
      { name: "Dash Mechanologist Items", words: ["Induction Chamber", "Spark of Genius", "High Octane", "Plasma Purifier"], difficulty: 1 },
      { name: "Teklovossen Items", words: ["Symbiosis Shot", "Evo Command Center", "Teklo Foundry Heart", "Hyper Driver"], difficulty: 2 },
      { name: "Maxx Boost Cards", words: ["Maximum Velocity", "Overblast", "Full Tilt", "Nitro Mechanoid"], difficulty: 3 },
      { name: "Data Doll Cards", words: ["Adaptive Algorithm", "Processing Unit", "Data Link", "Memory Wipe"], difficulty: 4 },
    ],
  },
  {
    id: 46,
    groups: [
      { name: "Cost 0 Cards", words: ["Sigil of Solace", "Pummel", "Razor Reflex", "Flic Flak"], difficulty: 1 },
      { name: "Intellect 4 Heroes", words: ["Kano", "Iyslander", "Viserai", "Dash"], difficulty: 2 },
      { name: "Life Total 20 Heroes", words: ["Dorinthea", "Katsu", "Bravo", "Rhinar"], difficulty: 3 },
      { name: "Life Total 40 Heroes (CC)", words: ["Bravo Star", "Victor Goldmane", "Teklovossen", "Enigma"], difficulty: 4 },
    ],
  },
  {
    id: 47,
    groups: [
      { name: "Elemental Runeblade Cards", words: ["Rosetta Thorn", "Channel Mount Heroic", "Sting of Sorcery", "Burgeoning"], difficulty: 1 },
      { name: "Shadow Runeblade Cards", words: ["Nebula Blade", "Howl from Beyond", "Ghostly Visit", "Bounding Demigon"], difficulty: 2 },
      { name: "Shadow Brute Cards", words: ["Endless Maw", "Deadwood Rumbler", "Soul Harvest", "Dread Screamer"], difficulty: 3 },
      { name: "Light Warrior Cards", words: ["Raydn", "Bolting Blade", "V of the Vanguard", "Lumina Ascension"], difficulty: 4 },
    ],
  },
  {
    id: 48,
    groups: [
      { name: "Heroes that Use Swords", words: ["Dorinthea", "Boltyn", "Kassai", "Victor Goldmane"], difficulty: 1 },
      { name: "Heroes that Use Staves", words: ["Kano", "Iyslander", "Verdance", "Oscilio"], difficulty: 2 },
      { name: "Bow-Related Heroes and Weapons", words: ["Azalea", "Lexi", "Riptide", "Voltaire"], difficulty: 3 },
      { name: "Heroes that Use Claws/Fists", words: ["Katsu", "Zen", "Benji", "Fai"], difficulty: 4 },
    ],
  },
  {
    id: 49,
    groups: [
      { name: "Arcane Rising Heroes", words: ["Dash", "Viserai", "Kano", "Azalea"], difficulty: 1 },
      { name: "Crucible of War Mechanics", words: ["Boost", "Reload", "Opt", "Temper"], difficulty: 2 },
      { name: "Monarch Mechanics", words: ["Soul", "Charge", "Herald", "Spectra"], difficulty: 3 },
      { name: "Tales of Aria Mechanics", words: ["Fuse", "Channel", "Earth", "Ice"], difficulty: 4 },
    ],
  },
  {
    id: 50,
    groups: [
      { name: "Power 3 Weapons", words: ["Dawnblade", "Anothos", "Romping Club", "Rosetta Thorn"], difficulty: 1 },
      { name: "Power 1 Weapons", words: ["Harmonized Kodachi", "Searing Emberblade", "Cintari Saber", "Dagger of Shar"], difficulty: 2 },
      { name: "Weapons with Special Abilities", words: ["Galaxxi Black", "Nebula Blade", "Death Dealer", "Crucible of Aetherweave"], difficulty: 3 },
      { name: "Token-Creating Weapons", words: ["Phoenix Flame", "Luminaris", "Spider's Bite", "Voltaire"], difficulty: 4 },
    ],
  },
  {
    id: 51,
    groups: [
      { name: "Cards Named After Animals", words: ["Pack Hunt", "Savage Feast", "Flying Kick", "Tiger Stripe Shuko"], difficulty: 1 },
      { name: "Cards Named After Weather", words: ["Lightning Storm", "Aether Hail", "Frost Hex", "Ice Quake"], difficulty: 2 },
      { name: "Cards Named After Body Parts", words: ["Cranial Crush", "Spinal Crush", "Rising Knee Thrust", "Skull Crushers"], difficulty: 3 },
      { name: "Cards Named After Emotions", words: ["Dread Screamer", "Bloodrush Bellow", "Raging Onslaught", "Serenity"], difficulty: 4 },
    ],
  },
  {
    id: 52,
    groups: [
      { name: "Rosetta Heroes", words: ["Verdance", "Florian", "Briar", "Tierra"], difficulty: 1 },
      { name: "Part the Mistveil Heroes", words: ["Enigma", "Nuu", "Zen", "Oscilio"], difficulty: 2 },
      { name: "Dusk till Dawn Content", words: ["Vynnset", "Prism", "Ursur", "Advent of Thrones"], difficulty: 3 },
      { name: "Hunted Heroes", words: ["Arakni", "Riptide", "Uzuri", "Fang"], difficulty: 4 },
    ],
  },
  {
    id: 53,
    groups: [
      { name: "Cards with 'Strike' in Name", words: ["Enlightened Strike", "Surging Strike", "Twin Fang Strike", "Searing Strike"], difficulty: 1 },
      { name: "Cards with 'Blade' in Name", words: ["Dawnblade", "Nebula Blade", "Singing Steelblade", "Bolting Blade"], difficulty: 2 },
      { name: "Cards with 'Crush' in Name", words: ["Crippling Crush", "Cranial Crush", "Spinal Crush", "Skull Crushers"], difficulty: 3 },
      { name: "Cards with 'Soul' in Name", words: ["Soul Harvest", "Soul Shackle", "Soul Shield", "Soul Food"], difficulty: 4 },
    ],
  },
  {
    id: 54,
    groups: [
      { name: "Turn Phases", words: ["Start Phase", "Action Phase", "End Phase", "Arsenal Step"], difficulty: 1 },
      { name: "Resource Mechanics", words: ["Pitch", "Intellect", "Action Point", "Resource Point"], difficulty: 2 },
      { name: "Combat Chain Concepts", words: ["Attack", "Defend", "Reaction", "Damage"], difficulty: 3 },
      { name: "Zone Names", words: ["Arsenal", "Banished Zone", "Graveyard", "Soul"], difficulty: 4 },
    ],
  },
  {
    id: 55,
    groups: [
      { name: "Zen Cards", words: ["Tiger Stripe Shuko", "Crouching Tiger", "Empty Mind", "Harmony of the Hunt"], difficulty: 1 },
      { name: "Enigma Cards", words: ["Miragai", "Haze Shelter", "Phantasmal Haze", "Pass Over"], difficulty: 2 },
      { name: "Verdance Cards", words: ["Crown of Seeds", "Cultivate", "Fertile Ground", "Flourish"], difficulty: 3 },
      { name: "Oscilio Cards", words: ["Staff of Tides", "Tidal Wave", "Undertow", "Current Conductor"], difficulty: 4 },
    ],
  },
  {
    id: 56,
    groups: [
      { name: "Blitz Format (Young Heroes)", words: ["Benji", "Data Doll", "Kayo", "Riptide"], difficulty: 1 },
      { name: "Classic Constructed Only", words: ["Teklovossen", "Victor Goldmane", "Enigma", "Oscilio"], difficulty: 2 },
      { name: "Draft Favorites", words: ["Sink Below", "Pummel", "Snatch", "Razor Reflex"], difficulty: 3 },
      { name: "Sealed Pool Bombs", words: ["Command and Conquer", "Enlightened Strike", "Art of War", "Tome of Fyendal"], difficulty: 4 },
    ],
  },
  {
    id: 57,
    groups: [
      { name: "Red Pitch Attacks (High Power)", words: ["Crippling Crush", "Alpha Rampage", "Dread Screamer", "Command and Conquer"], difficulty: 1 },
      { name: "Blue Pitch Defense (High Block)", words: ["Sink Below", "Fate Foreseen", "Unmovable", "Staunch Response"], difficulty: 2 },
      { name: "Yellow Pitch Utility", words: ["Potion of Strength", "Tome of Fyendal", "Energy Potion", "Sigil of Solace"], difficulty: 3 },
      { name: "Pitch Stacking Cards", words: ["Opt", "Nourishing Emptiness", "Plunder Run", "Cash In"], difficulty: 4 },
    ],
  },
  {
    id: 58,
    groups: [
      { name: "Rhinar's Intimidate Package", words: ["Alpha Rampage", "Barraging Beatdown", "Savage Feast", "Bloodrush Bellow"], difficulty: 1 },
      { name: "Dorinthea's Weapon Buffs", words: ["Ironsong Response", "Steelblade Supremacy", "Singing Steelblade", "Glint the Quicksilver"], difficulty: 2 },
      { name: "Bravo's Crush Attacks", words: ["Crippling Crush", "Cranial Crush", "Spinal Crush", "Righteous Cleansing"], difficulty: 3 },
      { name: "Katsu's Combo Lines", words: ["Whelming Gustwave", "Lord of Wind", "Flicker Wisp", "Torrent of Tempo"], difficulty: 4 },
    ],
  },
  {
    id: 59,
    groups: [
      { name: "Erupting Attacks (6+ Power)", words: ["Pulverize", "Crippling Crush", "Alpha Rampage", "Dread Screamer"], difficulty: 1 },
      { name: "Efficient 3-for-1 Blocks", words: ["Sink Below", "Unmovable", "Fate Foreseen", "Staunch Response"], difficulty: 2 },
      { name: "Cards that Draw", words: ["Tome of Fyendal", "Art of War", "Plunder Run", "Nourishing Emptiness"], difficulty: 3 },
      { name: "On-Hit Triggers", words: ["Snatch", "Command and Conquer", "Hit and Run", "Scar for a Scar"], difficulty: 4 },
    ],
  },
  {
    id: 60,
    groups: [
      { name: "Ninja Kodachi Attacks", words: ["Whelming Gustwave", "Surging Strike", "Rising Knee Thrust", "Leg Tap"], difficulty: 1 },
      { name: "Brute 6-Power Attacks", words: ["Alpha Rampage", "Savage Feast", "Pack Hunt", "Barraging Beatdown"], difficulty: 2 },
      { name: "Warrior Weapon Attacks", words: ["Singing Steelblade", "Out for Blood", "Hit and Run", "Steelblade Shunt"], difficulty: 3 },
      { name: "Guardian Crush Attacks", words: ["Crippling Crush", "Cranial Crush", "Spinal Crush", "Debilitate"], difficulty: 4 },
    ],
  },
  {
    id: 61,
    groups: [
      { name: "Solana City Locations", words: ["The Library", "The Cathedral", "The Barracks", "The Amphitheater"], difficulty: 1 },
      { name: "Metrix City Features", words: ["The Foundry", "Data Streams", "Neon District", "Cogwerx"], difficulty: 2 },
      { name: "Aria Landmarks", words: ["Mount Heroic", "Lake Frigid", "Evergreen", "Enion"], difficulty: 3 },
      { name: "Savage Lands Locations", words: ["The Pits", "Demonastery", "Misteria", "Savage Lands"], difficulty: 4 },
    ],
  },
  {
    id: 62,
    groups: [
      { name: "Dash Items", words: ["Induction Chamber", "Plasma Purifier", "Teklo Plasma Pistol", "High Octane"], difficulty: 1 },
      { name: "Wizard Spells", words: ["Blazing Aether", "Scalding Rain", "Aether Wildfire", "Voltic Bolt"], difficulty: 2 },
      { name: "Illusionist Phantasms", words: ["Spectral Shield", "Herald of Erudition", "Phantasmal Haze", "Figment of Erudition"], difficulty: 3 },
      { name: "Runeblade Runeblasts", words: ["Arknight Ascendancy", "Sonata Arcanix", "Mauvrion Skies", "Rune Flash"], difficulty: 4 },
    ],
  },
  {
    id: 63,
    groups: [
      { name: "Cards that Pitch for 3", words: ["Sink Below", "Sigil of Solace", "Fate Foreseen", "Energy Potion"], difficulty: 1 },
      { name: "Cards with Arcane Damage", words: ["Blazing Aether", "Scalding Rain", "Aether Wildfire", "Voltic Bolt"], difficulty: 2 },
      { name: "Cards with On-Hit Effects", words: ["Snatch", "Command and Conquer", "Art of War", "Scar for a Scar"], difficulty: 3 },
      { name: "Cards Banned from CC", words: ["Drone of Brutality", "Belittle", "Seeds of Agony", "Ball Lightning"], difficulty: 4 },
    ],
  },
  {
    id: 64,
    groups: [
      { name: "Warrior Class Features", words: ["Reprise", "Blade Break", "Weapon Attack", "Combat Chain"], difficulty: 1 },
      { name: "Ninja Class Features", words: ["Combo", "Go Again", "Kodachi", "Surging Strike"], difficulty: 2 },
      { name: "Guardian Class Features", words: ["Crush", "Dominate", "Anothos", "Seismic Surge"], difficulty: 3 },
      { name: "Brute Class Features", words: ["Intimidate", "Discard", "Mandible Claw", "Bloodrush"], difficulty: 4 },
    ],
  },
  {
    id: 65,
    groups: [
      { name: "Fai's Phoenix Attacks", words: ["Phoenix Flame", "Rise Up", "Lava Burst", "Blaze Headlong"], difficulty: 1 },
      { name: "Dromai's Dragon Summons", words: ["Invoke Tomeltai", "Invoke Kyloria", "Invoke Cromai", "Invoke Dracona Optimai"], difficulty: 2 },
      { name: "Iyslander's Ice Magic", words: ["Frost Hex", "Insidious Chill", "Aether Hail", "Channel Lake Frigid"], difficulty: 3 },
      { name: "Lexi's Lightning Arrows", words: ["Bolt'n' Shot", "Three of a Kind", "Endless Winter", "Ice Bolt"], difficulty: 4 },
    ],
  },
  {
    id: 66,
    groups: [
      { name: "Attack Action — Sword", words: ["Singing Steelblade", "Out for Blood", "Steelblade Shunt", "Hit and Run"], difficulty: 1 },
      { name: "Attack Action — Arrow", words: ["Red in the Ledger", "Bolt'n' Shot", "Sleep Dart", "Hamstring Shot"], difficulty: 2 },
      { name: "Attack Action — Axe", words: ["Swing Big", "Disable", "Reckless Swing", "Lumberjack"], difficulty: 3 },
      { name: "Attack Action — Hammer", words: ["Crippling Crush", "Cranial Crush", "Spinal Crush", "Debilitate"], difficulty: 4 },
    ],
  },
  {
    id: 67,
    groups: [
      { name: "FaB-Specific Zones", words: ["Arsenal", "Pitch Zone", "Banished Zone", "Soul"], difficulty: 1 },
      { name: "Common TCG Zones", words: ["Hand", "Deck", "Graveyard", "Combat Chain"], difficulty: 2 },
      { name: "Equipment Positions", words: ["Head", "Chest", "Arms", "Legs"], difficulty: 3 },
      { name: "Unique FaB Concepts", words: ["Intellect", "Pitch Value", "Go Again", "Action Point"], difficulty: 4 },
    ],
  },
  {
    id: 68,
    groups: [
      { name: "Guardian Heroes Across Sets", words: ["Bravo", "Oldhim", "Betsy", "Victor Goldmane"], difficulty: 1 },
      { name: "Wizard Heroes Across Sets", words: ["Kano", "Iyslander", "Oscilio", "Verdance"], difficulty: 2 },
      { name: "Ninja Heroes Across Sets", words: ["Katsu", "Fai", "Benji", "Zen"], difficulty: 3 },
      { name: "Ranger Class Across Sets", words: ["Azalea", "Lexi", "Riptide", "Death Dealer"], difficulty: 4 },
    ],
  },
  {
    id: 69,
    groups: [
      { name: "Aura Cards", words: ["Spectral Shield", "Soul Shackle", "Embodiment of Lightning", "Embodiment of Earth"], difficulty: 1 },
      { name: "Ally Cards", words: ["Tomeltai", "Kyloria", "Cromai", "Miragai"], difficulty: 2 },
      { name: "Item Cards", words: ["Induction Chamber", "Teklo Plasma Pistol", "High Octane", "Spark of Genius"], difficulty: 3 },
      { name: "Landmark Cards", words: ["Great Library of Solana", "Evo Command Center", "Korshem", "Fyendal's Fighting Spirit"], difficulty: 4 },
    ],
  },
  {
    id: 70,
    groups: [
      { name: "Defense Value 3 Reactions", words: ["Sink Below", "Fate Foreseen", "Unmovable", "Staunch Response"], difficulty: 1 },
      { name: "Defense Value 2 Equipment", words: ["Fyendal's Spring Tunic", "Ironrot Helm", "Ironrot Gauntlet", "Ironrot Legs"], difficulty: 2 },
      { name: "No Defense Cards", words: ["Pummel", "Razor Reflex", "Overpower", "Art of War"], difficulty: 3 },
      { name: "Variable Defense Cards", words: ["Flic Flak", "Snatch", "Enlightened Strike", "Command and Conquer"], difficulty: 4 },
    ],
  },
  {
    id: 71,
    groups: [
      { name: "WTR Majestics", words: ["Enlightened Strike", "Art of War", "Tome of Fyendal", "Warrior's Valor"], difficulty: 1 },
      { name: "ARC Majestics", words: ["Galaxxi Black", "Nebula Blade", "Death Dealer", "Command and Conquer"], difficulty: 2 },
      { name: "MON Majestics", words: ["Herald of Erudition", "Shadow of Blasmophet", "Lumina Ascension", "Soul Harvest"], difficulty: 3 },
      { name: "ELE Majestics", words: ["Channel Mount Heroic", "Channel Lake Frigid", "Embodiment of Lightning", "Embodiment of Earth"], difficulty: 4 },
    ],
  },
  {
    id: 72,
    groups: [
      { name: "Cards that Reference Fyendal", words: ["Heart of Fyendal", "Fyendal's Spring Tunic", "Tome of Fyendal", "Fyendal's Fighting Spirit"], difficulty: 1 },
      { name: "Cards that Reference Solana", words: ["Light of Sol", "Great Library of Solana", "Engulfing Light", "Blinding Light"], difficulty: 2 },
      { name: "Cards that Reference Aria", words: ["Tales of Aria", "Channel Mount Heroic", "Channel Lake Frigid", "Autumn's Touch"], difficulty: 3 },
      { name: "Cards that Reference Volcor", words: ["Phoenix Flame", "Lava Burst", "Invoke Tomeltai", "Spreading Flames"], difficulty: 4 },
    ],
  },
  {
    id: 73,
    groups: [
      { name: "Classic Constructed Staples", words: ["Command and Conquer", "Enlightened Strike", "Sink Below", "Pummel"], difficulty: 1 },
      { name: "Blitz Format Staples", words: ["Razor Reflex", "Snatch", "Fate Foreseen", "Sigil of Solace"], difficulty: 2 },
      { name: "Draft All-Stars", words: ["Wounded Bull", "Wounding Blow", "Scar for a Scar", "Overpower"], difficulty: 3 },
      { name: "Sealed Bomb Rares", words: ["Art of War", "Tome of Fyendal", "Galaxxi Black", "Mask of Momentum"], difficulty: 4 },
    ],
  },
  {
    id: 74,
    groups: [
      { name: "Ranger Keywords", words: ["Reload", "Aim Counter", "Arrow", "Dominate"], difficulty: 1 },
      { name: "Mechanologist Keywords", words: ["Boost", "Item", "Hyper Driver", "Plasma"], difficulty: 2 },
      { name: "Illusionist Keywords", words: ["Phantasm", "Spectra", "Herald", "Aura"], difficulty: 3 },
      { name: "Runeblade Keywords", words: ["Runechant", "Arcane", "Affliction", "Soul"], difficulty: 4 },
    ],
  },
  {
    id: 75,
    groups: [
      { name: "Uprising Mechanics", words: ["Draconic", "Phoenix Flame", "Rupture", "Frostbite"], difficulty: 1 },
      { name: "Dynasty Mechanics", words: ["Dragon", "Invoke", "Ash", "Allies"], difficulty: 2 },
      { name: "Outsiders Mechanics", words: ["Contract", "Stealth", "Trap", "Pirate"], difficulty: 3 },
      { name: "Bright Lights Mechanics", words: ["Evo", "Construct", "Boost", "Mechanoid"], difficulty: 4 },
    ],
  },
  {
    id: 76,
    groups: [
      { name: "One Word Hero Names", words: ["Dash", "Bravo", "Katsu", "Enigma"], difficulty: 1 },
      { name: "Two Word Hero Names", words: ["Data Doll", "Victor Goldmane", "Bravo Star", "Dash I/O"], difficulty: 2 },
      { name: "Heroes from Supplementary Sets", words: ["Kassai", "Kayo", "Benji", "Riptide"], difficulty: 3 },
      { name: "Heroes First Appearing in Monarch", words: ["Prism", "Boltyn", "Chane", "Levia"], difficulty: 4 },
    ],
  },
  {
    id: 77,
    groups: [
      { name: "Equipment that Blocks for 2", words: ["Ironrot Helm", "Ironrot Gauntlet", "Ironrot Legs", "Fyendal's Spring Tunic"], difficulty: 1 },
      { name: "Equipment with Triggered Abilities", words: ["Mask of Momentum", "Snapdragon Scalers", "Crown of Seeds", "Arcanite Skullcap"], difficulty: 2 },
      { name: "Equipment with Arcane Barrier", words: ["Nullrune Gloves", "Nullrune Boots", "Nullrune Robe", "Nullrune Hood"], difficulty: 3 },
      { name: "Equipment with Blade Break", words: ["Courage of Bladehold", "Refraction Bolters", "Braveforge Bracers", "Gallantry Gold"], difficulty: 4 },
    ],
  },
  {
    id: 78,
    groups: [
      { name: "Potion Cards", words: ["Potion of Strength", "Energy Potion", "Potion of Luck", "Healing Potion"], difficulty: 1 },
      { name: "Sigil Cards", words: ["Sigil of Solace", "Sigil of Suffering", "Sigil of Earth", "Sigil of Ice"], difficulty: 2 },
      { name: "Embodiment Cards", words: ["Embodiment of Lightning", "Embodiment of Earth", "Embodiment of Wind", "Embodiment of Fire"], difficulty: 3 },
      { name: "Channel Cards", words: ["Channel Mount Heroic", "Channel Lake Frigid", "Channel the Bleak Expanse", "Channel the Millennium"], difficulty: 4 },
    ],
  },
  {
    id: 79,
    groups: [
      { name: "WTR Heroes", words: ["Rhinar", "Dorinthea", "Bravo", "Katsu"], difficulty: 1 },
      { name: "ARC Heroes", words: ["Dash", "Viserai", "Kano", "Azalea"], difficulty: 2 },
      { name: "MON Heroes", words: ["Prism", "Boltyn", "Chane", "Levia"], difficulty: 3 },
      { name: "Tales of Aria Content", words: ["Briar", "Oldhim", "Lexi", "Aria"], difficulty: 4 },
    ],
  },
  {
    id: 80,
    groups: [
      { name: "Victor Goldmane Cards", words: ["Hatchet of Body", "Hatchet of Mind", "Golden Provisions", "Regal Bearing"], difficulty: 1 },
      { name: "Betsy Cards", words: ["Sledge of Anvilheim", "Forge Strike", "Temper", "Smith's Will"], difficulty: 2 },
      { name: "Kayo Cards", words: ["Mandible Claw", "Pack Hunt", "Savage Feast", "Bloodrush Bellow"], difficulty: 3 },
      { name: "Maxx Cards", words: ["Maximum Velocity", "Overblast", "Nitro Mechanoid", "Full Tilt"], difficulty: 4 },
    ],
  },
  {
    id: 81,
    groups: [
      { name: "First Set of Each Year (2020-2023)", words: ["Welcome to Rathe", "Monarch", "Uprising", "Bright Lights"], difficulty: 1 },
      { name: "Supplementary Sets", words: ["Classic Battles", "Armory Deck", "Hero Deck", "Blitz Deck"], difficulty: 2 },
      { name: "Set Names That Are Two Words", words: ["Arcane Rising", "Crucible of War", "Tales of Aria", "Heavy Hitters"], difficulty: 3 },
      { name: "Set Names That Are One Word", words: ["Rosetta", "Everfest", "Dynasty", "Outsiders"], difficulty: 4 },
    ],
  },
];
