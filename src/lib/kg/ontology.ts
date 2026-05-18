/**
 * Knowledge Graph ontology for fab-stats.
 *
 * Single source of truth for:
 *   - Neo4j node labels and relationship types
 *   - schema.org type mappings used by JSON-LD endpoints
 *   - Canonical entity URIs (used as @id in JSON-LD)
 *
 * Adding a new entity: add to EntityType, EntityDef map, and SCHEMA_ORG_TYPE.
 * Adding a new relation: add to RelationType, RELATION_DEF.
 */

export type EntityType =
  | "Player"
  | "Hero"
  | "Card"
  | "Match"
  | "Event"
  | "Venue"
  | "Team"
  | "Group"
  | "Article";

export type RelationType =
  // Player edges
  | "PLAYED"           // Player -> Match
  | "MEMBER_OF_TEAM"   // Player -> Team
  | "MEMBER_OF_GROUP"  // Player -> Group
  | "FRIEND_OF"        // Player -> Player (symmetric)
  // Match edges
  | "USED_HERO"        // Match -> Hero (heroPlayed)
  | "FACED_HERO"       // Match -> Hero (opponentHero)
  | "AT_VENUE"         // Match -> Venue
  | "IN_EVENT"         // Match -> Event
  // Hero/Card edges
  | "MATCHUP_WITH"     // Hero -> Hero (weighted by win/loss/draw counts)
  | "USES_CARD"        // Hero -> Card (deck composition; future)
  | "SYNERGIZES_WITH"  // Card -> Card (future)
  // Article edges (generated content)
  | "MENTIONS_HERO"    // Article -> Hero
  | "MENTIONS_PLAYER"  // Article -> Player
  | "MENTIONS_EVENT"   // Article -> Event
  | "WRITTEN_BY";      // Article -> Player (author)

/** Map our entity type to its schema.org @type for JSON-LD output. */
export const SCHEMA_ORG_TYPE: Record<EntityType, string> = {
  Player: "Person",
  Hero: "Thing",        // No perfect schema.org match for a TCG hero — Thing is the safe fallback
  Card: "Thing",
  Match: "SportsEvent", // Each match is a small SportsEvent
  Event: "SportsEvent", // A tournament is a SportsEvent
  Venue: "Place",
  Team: "SportsTeam",
  Group: "Organization",
  Article: "Article",
};

/** Map relation type to a schema.org property when one exists (used in JSON-LD). */
export const SCHEMA_ORG_PROPERTY: Partial<Record<RelationType, string>> = {
  PLAYED: "competitor",        // Person is a competitor in SportsEvent
  AT_VENUE: "location",
  IN_EVENT: "superEvent",      // Match's superEvent is the tournament
  MEMBER_OF_TEAM: "memberOf",
  MEMBER_OF_GROUP: "memberOf",
  WRITTEN_BY: "author",
  MENTIONS_HERO: "mentions",
  MENTIONS_PLAYER: "mentions",
  MENTIONS_EVENT: "mentions",
};

/** Definition of one relationship type — used for graph hygiene and docs. */
export interface RelationDef {
  type: RelationType;
  from: EntityType;
  to: EntityType;
  /** Edge properties stored on the relationship in Neo4j. */
  properties?: string[];
  /** True if (a)-[R]->(b) implies (b)-[R]->(a). MATCHUP_WITH is symmetric; MENTIONS is not. */
  symmetric?: boolean;
}

export const RELATION_DEFS: RelationDef[] = [
  { type: "PLAYED", from: "Player", to: "Match" },
  { type: "MEMBER_OF_TEAM", from: "Player", to: "Team", properties: ["role", "joinedAt"] },
  { type: "MEMBER_OF_GROUP", from: "Player", to: "Group", properties: ["role", "joinedAt"] },
  { type: "FRIEND_OF", from: "Player", to: "Player", symmetric: true },
  { type: "USED_HERO", from: "Match", to: "Hero" },
  { type: "FACED_HERO", from: "Match", to: "Hero" },
  { type: "AT_VENUE", from: "Match", to: "Venue" },
  { type: "IN_EVENT", from: "Match", to: "Event" },
  { type: "MATCHUP_WITH", from: "Hero", to: "Hero", properties: ["wins", "losses", "draws", "total"], symmetric: true },
  { type: "USES_CARD", from: "Hero", to: "Card", properties: ["frequency"] },
  { type: "SYNERGIZES_WITH", from: "Card", to: "Card", properties: ["score"], symmetric: true },
  { type: "MENTIONS_HERO", from: "Article", to: "Hero" },
  { type: "MENTIONS_PLAYER", from: "Article", to: "Player" },
  { type: "MENTIONS_EVENT", from: "Article", to: "Event" },
  { type: "WRITTEN_BY", from: "Article", to: "Player" },
];

/**
 * Canonical URI for an entity.
 * Used as the JSON-LD @id and as the Neo4j node's `uri` property.
 * URLs match the public site routes so JSON-LD identifiers are also browsable.
 */
const SITE = "https://www.fabstats.net";
export function entityUri(type: EntityType, id: string): string {
  switch (type) {
    case "Player":  return `${SITE}/player/${id}`;
    case "Hero":    return `${SITE}/hero/${encodeURIComponent(id)}`;
    case "Card":    return `${SITE}/card/${encodeURIComponent(id)}`;
    case "Match":   return `${SITE}/match/${id}`;
    case "Event":   return `${SITE}/event/${id}`;
    case "Venue":   return `${SITE}/venue/${encodeURIComponent(id)}`;
    case "Team":    return `${SITE}/team/${encodeURIComponent(id)}`;
    case "Group":   return `${SITE}/group/${encodeURIComponent(id)}`;
    case "Article": return `${SITE}/articles/${id}`;
  }
}

/** Public site URL for an entity (currently identical to entityUri; kept separate so URIs can become opaque later). */
export function entityUrl(type: EntityType, id: string): string {
  return entityUri(type, id);
}
