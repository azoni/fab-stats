/**
 * Zone ladder. v0.1 ships The Emberway; Zones 2-4 are titles on the door.
 * Adding a zone = one ZoneDef + its enemy/item/event rows.
 */
import type { ZoneDef } from "../types";

export const ZONES: ZoneDef[] = [
  {
    id: "emberway",
    name: "The Emberway",
    levelRange: [1, 12],
    palette: "bronze",
    tagline: "Furnace levels. Everything down here is either fuel or foreman.",
    floors: [
      { enemyPool: ["cinder_rat", "vault_mite", "tally_imp"], elitePool: [] },
      { enemyPool: ["cinder_rat", "slag_hound", "tally_imp", "errata_wisp"], elitePool: ["clinker_golem"] },
      { enemyPool: ["slag_hound", "ashwick_acolyte", "errata_wisp", "vault_mite"], elitePool: ["clinker_golem", "pit_overseer"] },
    ],
    bossId: "foreman_grate",
    eventPool: ["misfiled_reliquary", "ashen_scribe", "counterfeit_fountain", "tally_imps_wager"],
  },
];

export const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]));
export const DEFAULT_ZONE_ID = "emberway";
