/**
 * Zone 1 "The Emberway" bestiary. Stats are tuned for the zone's level range
 * (1-12); the generator scales by floor. Adding a zone = appending rows.
 */
import type { EnemyDef } from "../types";

export const ENEMIES: EnemyDef[] = [
  // ── Floor pool ──
  {
    id: "cinder_rat",
    name: "Cinder Rat",
    tier: "normal",
    stats: { hp: 18, atk: 6, def: 2, spd: 4 },
    script: [{ verb: "strike", mult: 1 }, { verb: "strike", mult: 1 }, { verb: "guard", block: 4 }],
    xp: 12,
    marks: [4, 9],
    sprite: "rat",
    flavor: "Chews on losing decklists. Perpetually furious.",
  },
  {
    id: "slag_hound",
    name: "Slag Hound",
    tier: "normal",
    stats: { hp: 24, atk: 7, def: 1, spd: 6 },
    script: [{ verb: "strike", mult: 1 }, { verb: "heavy", mult: 2.1 }],
    xp: 16,
    marks: [5, 11],
    sprite: "hound",
    flavor: "Smells of burnt cardboard and regret.",
  },
  {
    id: "vault_mite",
    name: "Vault Mite",
    tier: "normal",
    stats: { hp: 14, atk: 5, def: 6, spd: 3 },
    script: [{ verb: "guard", block: 6 }, { verb: "strike", mult: 1.2 }],
    xp: 14,
    marks: [4, 10],
    sprite: "mite",
    flavor: "Armored in laminated card sleeves. Surprisingly smug.",
  },
  {
    id: "tally_imp",
    name: "Tally Imp",
    tier: "normal",
    stats: { hp: 16, atk: 6, def: 2, spd: 7 },
    script: [{ verb: "hex", status: "weak" }, { verb: "strike", mult: 1.1 }],
    xp: 15,
    marks: [9, 18],
    sprite: "imp",
    flavor: "Keeps score out loud. Nobody asked.",
  },
  {
    id: "ashwick_acolyte",
    name: "Ashwick Acolyte",
    tier: "normal",
    stats: { hp: 22, atk: 6, def: 3, spd: 5 },
    script: [{ verb: "drain", mult: 0.9 }, { verb: "strike", mult: 1 }],
    xp: 17,
    marks: [6, 12],
    sprite: "acolyte",
    flavor: "Worships the eternal top-deck. Prays loudly.",
  },
  {
    id: "errata_wisp",
    name: "Errata Wisp",
    tier: "normal",
    stats: { hp: 12, atk: 7, def: 0, spd: 10 },
    script: [{ verb: "hex", status: "expose" }, { verb: "strike", mult: 1.2 }],
    traits: ["swift"],
    xp: 16,
    marks: [5, 12],
    sprite: "wisp",
    flavor: "A rules correction that never found its card. It holds a grudge.",
  },
  // ── Elites ──
  {
    id: "clinker_golem",
    name: "Clinker Golem",
    tier: "elite",
    stats: { hp: 52, atk: 9, def: 6, spd: 2 },
    script: [{ verb: "guard", block: 8 }, { verb: "heavy", mult: 2.2 }, { verb: "heavy", mult: 2.2 }],
    traits: ["stunImmune"],
    xp: 40,
    marks: [16, 28],
    sprite: "golem",
    flavor: "Assembled from decks abandoned mid-shuffle. It remembers each one.",
  },
  {
    id: "pit_overseer",
    name: "Pit Overseer",
    tier: "elite",
    stats: { hp: 44, atk: 8, def: 4, spd: 5 },
    script: [{ verb: "rally", rallyAtkPct: 30 }, { verb: "strike", mult: 1.2 }, { verb: "heavy", mult: 2.0 }],
    traits: ["packLeader"],
    xp: 38,
    marks: [15, 26],
    sprite: "overseer",
    flavor: "Middle management of the Understack. Carries a clipboard of bone.",
  },
  // ── Boss ──
  {
    id: "foreman_grate",
    name: "Foreman Grate",
    tier: "boss",
    stats: { hp: 100, atk: 9, def: 5, spd: 5 },
    script: [{ verb: "strike", mult: 1.1 }, { verb: "guard", block: 8 }, { verb: "strike", mult: 1.3 }],
    phases: [
      {
        hpPct: 66,
        script: [{ verb: "strike", mult: 1.2 }, { verb: "hex", status: "weak" }, { verb: "strike", mult: 1.3 }],
        summon: ["cinder_rat"],
      },
      {
        hpPct: 33,
        script: [{ verb: "heavy", mult: 2.2 }, { verb: "heavy", mult: 2.2 }, { verb: "guard", block: 10 }],
      },
    ],
    traits: ["stunImmune"],
    xp: 120,
    marks: [45, 70],
    sprite: "foreman",
    flavor: "Runs the Emberway's furnaces. Considers you fuel with opinions.",
  },
  // Summon-only chaff shares cinder_rat above.
];

export const ENEMY_BY_ID = new Map(ENEMIES.map((e) => [e.id, e]));
