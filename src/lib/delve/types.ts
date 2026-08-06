/**
 * The Understack — shared types.
 *
 * Everything the engine touches is plain serializable data. Items are
 * REFERENCES into the content tables plus integer rolls (never denormalized
 * objects), so save docs stay tiny and content patches retro-apply.
 */

// ── Content-table ids ─────────────────────────────────────────────────────────

export type ClassId = "sentinel" | "stalker" | "arcanist";
export type Slot = "weapon" | "helm" | "armor" | "charm" | "relic";
export type Rarity = "worn" | "tempered" | "ordained" | "mythic";
export type MaterialKey = "bronze" | "silver" | "gold" | "mythic";

export type NodeType = "combat" | "elite" | "treasure" | "event" | "rest";

/** Enemy intent verbs — every enemy action is one of these six. */
export type IntentVerb = "strike" | "heavy" | "guard" | "hex" | "rally" | "drain";

export type StatusId = "bleed" | "burn" | "chill" | "stun" | "weak" | "expose";

export type StatKey = "hp" | "atk" | "def" | "spd" | "crit" | "lifesteal" | "marksFind" | "xpFind";

// ── Content-table shapes ──────────────────────────────────────────────────────

export interface IntentStep {
  verb: IntentVerb;
  /** Damage multiplier over enemy ATK (strike/heavy/drain). */
  mult?: number;
  /** Block gained (guard). */
  block?: number;
  /** Status applied to the player (hex). */
  status?: StatusId;
  /** Enemy id summoned / ally buff (rally). */
  summon?: string;
  rallyAtkPct?: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  tier: "normal" | "elite" | "boss";
  /** Base stats at the zone's floor level; scaled by level delta. */
  stats: { hp: number; atk: number; def: number; spd: number };
  /** Cyclic intent pattern. Bosses may override via phases. */
  script: IntentStep[];
  /** Boss phases: entries activate when hp% falls below the threshold. */
  phases?: { hpPct: number; script: IntentStep[]; summon?: string[] }[];
  traits?: ("swift" | "stunImmune" | "packLeader")[];
  xp: number;
  marks: [number, number]; // min..max marks dropped
  /** Silhouette id for the sprite renderer. */
  sprite: string;
  flavor?: string;
}

export interface AbilityDef {
  id: string;
  classId: ClassId;
  name: string;
  unlockLevel: number;
  cooldown: number;
  /** Damage multiplier over player ATK (0 = no damage). */
  mult: number;
  hitsAll?: boolean;
  block?: { base: number; perLevel: number };
  applies?: { status: StatusId; turns: number; power?: number };
  /** Resource this ability builds (+n) or spends ("all" = consume everything). */
  resource?: { gain?: number; spend?: "all" | number };
  /** Special engine hooks, kept as a closed enum so content stays data. */
  special?: "vanish" | "executioner" | "retribution" | "cataclysm" | "bulwark" | "crackKill";
  description: string;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  identity: string;
  resourceName: string;
  resourceMax: number;
  base: { hp: number; atk: number; def: number; spd: number };
  growth: { hp: number; atk: number; def: number; spd: number };
  abilityIds: string[];
}

export interface ItemBaseDef {
  id: string;
  name: string;
  slot: Slot;
  /** Share of the stat budget this slot carries. */
  slotWeight: number;
  /** Primary stat the base budget lands on. */
  primary: "atk" | "hp" | "def";
  zoneMin: number;
  sprite: string;
  flavor: string;
}

export interface AffixDef {
  id: string;
  name: string;
  stat: StatKey;
  /** Roll range, integers (percent stats roll whole percents). */
  roll: [number, number];
  slots: Slot[];
  pct: boolean;
}

export interface EventOptionOutcome {
  weight: number;
  kind: "heal" | "damage" | "marks" | "material" | "item" | "flask" | "buffAtk" | "nothing";
  amount?: number; // heal/damage = % max HP; marks = amount; buffAtk = % for run
  materialId?: MaterialId;
  text: string;
}

export interface EventDef {
  id: string;
  name: string;
  prompt: string;
  options: { label: string; outcomes: EventOptionOutcome[] }[];
}

export interface ZoneDef {
  id: string;
  name: string;
  levelRange: [number, number];
  palette: MaterialKey;
  tagline: string;
  floors: {
    enemyPool: string[];
    elitePool: string[];
  }[];
  bossId: string;
  eventPool: string[];
}

export type MaterialId = "cinder" | "gloam" | "aurum" | "aether";

// ── Player persistent state ───────────────────────────────────────────────────

export interface ItemRoll {
  /** ItemBaseDef id. */
  id: string;
  rarity: Rarity;
  ilvl: number;
  enhance: number; // 0..5
  affixes: { id: string; roll: number }[];
}

export interface DelveCharacter {
  v: 1;
  /** Monotonic save counter — higher wins on cross-device merge. */
  saveVersion: number;
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  marks: number;
  materials: Record<MaterialId, number>;
  keys: { n: number; lastRefill: string };
  equipped: Partial<Record<Slot, ItemRoll>>;
  /** Daily Delve state for today. */
  daily: { date: string; done: boolean; score: number };
  cosmetics: { titleId?: string; outfitId?: string; bannerId?: string; petId?: string };
  createdAt: string;
  updatedAt: string;
}

export interface DelveStats {
  totalRuns: number;
  victories: number;
  deaths: number;
  withdrawals: number;
  bossKills: number;
  kills: number;
  deepestFloor: number;
  marksEarned: number;
  mythicsFound: number;
  dailiesDone: number;
  bestDailyScore: number;
}

// ── Run state (engine-owned, fully serializable) ──────────────────────────────

export interface StatusInstance {
  id: StatusId;
  turns: number;
  power: number; // dmg/turn for bleed+burn; unused otherwise
}

export interface EnemyInstance {
  defId: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  block: number;
  scriptIndex: number;
  /** Heavy attacks wind up one turn before landing. */
  windup: boolean;
  statuses: StatusInstance[];
  stunnedOnce: boolean; // bosses shrug off stuns after the first
  phaseIndex: number;
}

export type RunPhase =
  | "doors" // choosing the next node
  | "combat"
  | "event"
  | "treasure"
  | "rest"
  | "antechamber" // fixed rest-vs-shrine before the boss
  | "boss"
  | "victory" // waystone: loot banked
  | "dead"
  | "withdrawn";

export interface CombatState {
  enemies: EnemyInstance[];
  /** Player block absorbs before HP. Expires at end of round. */
  block: number;
  statuses: StatusInstance[];
  cooldowns: Record<string, number>;
  /** Sentinel: next Crack bonus after Bulwark absorbs. Stalker: Vanish dodge. */
  crackPrimed: boolean;
  vanishActive: boolean;
  turn: number;
  /** Whether this is the boss fight. */
  isBoss: boolean;
  /** Log lines of the LAST resolution step, for the UI to animate. */
  log: CombatLogLine[];
}

export interface CombatLogLine {
  kind:
    | "playerHit"
    | "playerCrit"
    | "playerBlock"
    | "playerStatus"
    | "enemyHit"
    | "enemyDodged"
    | "enemyGuard"
    | "enemyHex"
    | "enemyRally"
    | "enemyWindup"
    | "statusTick"
    | "kill"
    | "flask"
    | "info";
  text: string;
  amount?: number;
  targetIndex?: number;
}

export interface RunState {
  v: 1;
  seed: number;
  /** PRNG draws consumed — resume = re-seed and fast-forward. */
  cursor: number;
  zoneId: string;
  isDaily: boolean;
  /** Snapshot of the delver at descent — the run is self-contained; the
   *  character doc is only touched again when the run ends. */
  classId: ClassId;
  level: number;
  eff: EffectiveStats;
  floor: number; // 1..3
  node: number; // 0..2 within a floor
  phase: RunPhase;
  /** Door choices offered in the "doors" phase. */
  doors: NodeType[];
  /** Remaining node types for this run (exact composition preserved — doors are
   *  drawn from the bag; unpicked doors return to it). */
  bag: NodeType[];
  /** Events already seen this run (no repeats until the pool is exhausted). */
  usedEvents: string[];
  /** Non-combat node resolution: outcome shown, waiting on "proceed". */
  nodeResolved: boolean;
  lastOutcome: string | null;
  hp: number;
  maxHp: number;
  resource: number;
  flasks: number;
  /** Temporary +ATK% for the rest of the run (rest/event buffs). */
  runAtkPct: number;
  combat: CombatState | null;
  eventId: string | null;
  /** Loot held mid-run; banked only at the Waystone or via Withdraw. */
  satchel: ItemRoll[];
  marksFound: number;
  materialsFound: Record<MaterialId, number>;
  xpEarned: number;
  kills: number;
  turnsTaken: number;
  /** What died with us — shown on the death screen. */
  lostSatchel: ItemRoll[] | null;
  startedAt: string;
}

// ── Engine actions ────────────────────────────────────────────────────────────

export type DelveAction =
  | { type: "chooseDoor"; index: number }
  | { type: "ability"; abilityId: string; target: number }
  | { type: "flask" }
  | { type: "eventChoice"; option: number }
  | { type: "restChoice"; choice: "heal" | "flask" | "buff" }
  | { type: "withdraw" }
  | { type: "openChest" }
  | { type: "proceed" }; // advance after a resolved node / antechamber rest

// ── Derived stats ─────────────────────────────────────────────────────────────

export interface EffectiveStats {
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  critPct: number;
  lifestealPct: number;
  marksFindPct: number;
  xpFindPct: number;
}
