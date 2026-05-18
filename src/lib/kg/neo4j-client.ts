/**
 * Thin Neo4j client wrapper for fab-stats KG operations.
 *
 * Use only from Node-side code (Netlify Functions, scripts) — not from the
 * Next.js client bundle. The neo4j-driver is a Node package.
 *
 * Connection config (set in Netlify env or local .env):
 *   NEO4J_URI       — e.g. neo4j+s://xxxxx.databases.neo4j.io  (Aura) or bolt://localhost:7687 (local)
 *   NEO4J_USERNAME  — usually "neo4j"
 *   NEO4J_PASSWORD  — generated on Aura; set on local Docker
 */
import neo4j, { Driver, Session } from "neo4j-driver";
import {
  EntityType,
  RelationType,
  entityUri,
} from "./ontology";

/**
 * Cypher requires LIMIT / skip / count args to be INTEGER. A plain JS number
 * serializes as FLOAT over Bolt (`15` → `15.0`), which Cypher rejects for
 * LIMIT and `db.index.vector.queryNodes`. Wrap every integer-typed query
 * parameter with this. (Single source of truth — this gotcha has bitten the
 * vector search and the graph-viz endpoint.)
 */
export function int(n: number) {
  return neo4j.int(Math.floor(n));
}

let driver: Driver | null = null;

function getDriver(): Driver {
  if (driver) return driver;
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !username || !password) {
    throw new Error(
      "Neo4j env not configured. Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD.",
    );
  }
  driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    maxConnectionLifetime: 30 * 60 * 1000,
    maxConnectionPoolSize: 10,
    connectionAcquisitionTimeout: 60_000,
  });
  return driver;
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

async function withSession<T>(fn: (session: Session) => Promise<T>): Promise<T> {
  // Aura assigns a per-instance database name (matches instance ID). If
  // NEO4J_DATABASE is set, target it explicitly; otherwise use the user's
  // home database.
  const database = process.env.NEO4J_DATABASE;
  const session = database
    ? getDriver().session({ database })
    : getDriver().session();
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

/**
 * Run a raw Cypher query and return rows as plain JS objects.
 * Use this for ad-hoc queries; prefer the typed helpers below for writes.
 */
export async function runCypher<T = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  return withSession(async (session) => {
    const result = await session.run(query, params);
    return result.records.map((r) => r.toObject() as T);
  });
}

/**
 * Upsert a node by (type, id). MERGE is idempotent — running the sync nightly
 * won't create duplicates. The `uri` property is the canonical entity identifier
 * (matches JSON-LD @id).
 */
export async function upsertNode(
  type: EntityType,
  id: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const uri = entityUri(type, id);
  // Strip undefined — Neo4j rejects them.
  const cleanProps = Object.fromEntries(
    Object.entries(properties).filter(([, v]) => v !== undefined),
  );
  // Cypher: MERGE on (type, id), then SET all other props.
  // Using a parameterized label is awkward in Cypher; we interpolate `type` here
  // because it comes from a closed enum (EntityType), not user input.
  const query = `
    MERGE (n:${type} {id: $id})
    SET n.uri = $uri, n += $props
  `;
  await runCypher(query, { id, uri, props: cleanProps });
}

/**
 * Upsert a typed edge between two nodes. Edge type is interpolated for the same
 * reason as node label above (closed RelationType enum).
 */
export async function upsertRelation(
  fromType: EntityType,
  fromId: string,
  relType: RelationType,
  toType: EntityType,
  toId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const cleanProps = Object.fromEntries(
    Object.entries(properties).filter(([, v]) => v !== undefined),
  );
  const query = `
    MATCH (a:${fromType} {id: $fromId})
    MATCH (b:${toType} {id: $toId})
    MERGE (a)-[r:${relType}]->(b)
    SET r += $props
  `;
  await runCypher(query, { fromId, toId, props: cleanProps });
}

/**
 * Create constraints + indexes used by the KG. Idempotent — safe to call
 * at the start of every sync run.
 */
export async function ensureSchema(): Promise<void> {
  const entities: EntityType[] = [
    "Player", "Hero", "Card", "Match", "Event", "Venue", "Team", "Group", "Article",
  ];
  for (const t of entities) {
    await runCypher(
      `CREATE CONSTRAINT ${t.toLowerCase()}_id IF NOT EXISTS FOR (n:${t}) REQUIRE n.id IS UNIQUE`,
    );
  }
}

/**
 * Quick smoke test for the Neo4j connection. Returns the server version string.
 */
export async function ping(): Promise<string> {
  const rows = await runCypher<{ name: string; versions: string[] }>(
    "CALL dbms.components() YIELD name, versions RETURN name, versions",
  );
  if (rows.length === 0) return "unknown";
  return `${rows[0].name} ${rows[0].versions.join(", ")}`;
}
