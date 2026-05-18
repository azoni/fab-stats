/**
 * Neo4j connection smoke test.
 *
 * Usage:
 *   node --env-file=.env scripts/test-neo4j.mjs
 *
 * Verifies:
 *   1. Driver can connect with the env credentials
 *   2. Server reports version (proves auth + network work)
 *   3. We can MERGE a test node and read it back
 *   4. We can DELETE the test node (cleanup)
 */
import neo4j from "neo4j-driver";

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE;

if (!uri || !username || !password) {
  console.error("Missing NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD in env.");
  process.exit(1);
}

console.log(`[test-neo4j] Connecting to ${uri} as ${username}…`);

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

try {
  // 1. Verify driver-level connectivity (resolves DNS, opens TLS, runs handshake)
  await driver.verifyConnectivity();
  console.log("[test-neo4j] ✓ Driver connectivity OK");

  // 2. Get server version
  const session = database ? driver.session({ database }) : driver.session();
  const versionResult = await session.run(
    "CALL dbms.components() YIELD name, versions, edition RETURN name, versions, edition",
  );
  const v = versionResult.records[0]?.toObject();
  console.log(`[test-neo4j] ✓ Connected: ${v?.name} ${v?.versions?.join(",")} (${v?.edition})`);

  // 3. Round-trip test node
  await session.run(
    "MERGE (t:_KGSyncTest {id: 'test-1'}) SET t.checkedAt = $now",
    { now: new Date().toISOString() },
  );
  const readback = await session.run(
    "MATCH (t:_KGSyncTest {id: 'test-1'}) RETURN t.checkedAt AS checkedAt",
  );
  console.log(`[test-neo4j] ✓ Round-trip OK — wrote and read back checkedAt=${readback.records[0]?.get("checkedAt")}`);

  // 4. Cleanup
  await session.run("MATCH (t:_KGSyncTest) DELETE t");
  console.log("[test-neo4j] ✓ Cleanup OK");

  await session.close();
} catch (err) {
  console.error("[test-neo4j] ✗ FAILED:", err.message);
  process.exit(1);
} finally {
  await driver.close();
}

console.log("[test-neo4j] All checks passed. Neo4j is ready for kg-sync.");
