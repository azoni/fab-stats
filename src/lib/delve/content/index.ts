export { CLASSES, ABILITIES } from "./skills";
export { ENEMIES, ENEMY_BY_ID } from "./enemies";
export { ITEM_BASES, ITEM_BASE_BY_ID, AFFIXES, AFFIX_BY_ID } from "./items";
export { EVENTS, EVENT_BY_ID } from "./events";
export { ZONES, ZONE_BY_ID, DEFAULT_ZONE_ID } from "./zones";

import { CLASSES, ABILITIES } from "./skills";
import type { ClassDef, AbilityDef, ClassId } from "../types";

export const CLASS_BY_ID = new Map<ClassId, ClassDef>(CLASSES.map((c) => [c.id, c]));
export const ABILITY_BY_ID = new Map<string, AbilityDef>(ABILITIES.map((a) => [a.id, a]));
