/**
 * Generate an auto bio for a player and print it.
 *
 *   node --env-file=.env --import tsx scripts/generate-player-bio.ts mathonical
 *   node --env-file=.env --import tsx scripts/generate-player-bio.ts mathonical --persist
 *
 * Persists to playerBios/{userId} (separate collection — never mutates the
 * production leaderboard/profile docs). status: "draft" for human review.
 */
import { execSync } from "node:child_process";
import { getPlayerBioInsights } from "../src/lib/kg/player-profile-insights";
import { generatePlayerBio } from "../src/lib/kg/player-bio-generator";
import { closeDriver } from "../src/lib/kg/neo4j-client";

function fromNetlify(key: string): string {
  const json = execSync(`netlify env:get ${key} --json`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const parsed = JSON.parse(json);
  return parsed[key] ?? Object.values(parsed)[0];
}

const args = process.argv.slice(2).filter((a) => a !== "--persist");
const target = args[0] ?? "mathonical";
const persist = process.argv.includes("--persist");

if (!process.env.ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = fromNetlify("ANTHROPIC_API_KEY");
  console.log("[bio] ✓ Fetched ANTHROPIC_API_KEY from Netlify");
}
if (persist && !process.env.FIREBASE_SERVICE_ACCOUNT) {
  process.env.FIREBASE_SERVICE_ACCOUNT = fromNetlify("FIREBASE_SERVICE_ACCOUNT");
  console.log("[bio] ✓ Fetched FIREBASE_SERVICE_ACCOUNT from Netlify");
}

async function main(): Promise<void> {
  console.log(`[bio] Retrieving KG insights for "${target}"…`);
  const insights = await getPlayerBioInsights(target);
  if (!insights.found) {
    console.error(`[bio] Player "${target}" not in the KG. Try a username from the leaderboard.`);
    process.exitCode = 1;
    return;
  }

  const t0 = Date.now();
  const bio = await generatePlayerBio(insights);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n[bio] ✓ Generated in ${secs}s with ${bio.model}`);
  console.log(
    `[bio] Tokens — in:${bio.usage.inputTokens} out:${bio.usage.outputTokens} cacheRead:${bio.usage.cacheReadTokens}`,
  );
  console.log("\n" + "═".repeat(68));
  console.log(`${insights.displayName} (@${insights.username})`);
  console.log("─".repeat(68));
  console.log(`HEADLINE: ${bio.headline}\n`);
  console.log(bio.bio + "\n");
  for (const h of bio.highlights) console.log(`  • ${h}`);
  console.log("═".repeat(68));
  console.log(
    `[bio] grounding — main:${insights.topHero} | ${insights.winRate}% / ${insights.totalMatches} | ` +
      `similar:${insights.similarPlayers.map((s) => s.displayName).join(", ") || "(none)"}`,
  );

  if (persist) {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)),
      });
    }
    const db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    await db.collection("playerBios").doc(insights.id).set({
      userId: insights.id,
      username: insights.username,
      headline: bio.headline,
      bio: bio.bio,
      highlights: bio.highlights,
      status: "draft",
      model: bio.model,
      generatedAt: new Date().toISOString(),
    });
    console.log(`\n[bio] ✓ Persisted to playerBios/${insights.id} (status: draft)`);
  } else {
    console.log("\n[bio] (dry run — pass --persist to write to Firestore)");
  }
}

main()
  .catch((e) => {
    console.error("[bio] ✗ FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
