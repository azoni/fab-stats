/**
 * Generate a weekly meta article from the live KG and print it.
 *
 *   node --env-file=.env --import tsx scripts/generate-article.ts
 *   node --env-file=.env --import tsx scripts/generate-article.ts --persist   (write draft to Firestore)
 *
 * Pulls ANTHROPIC_API_KEY + FIREBASE_SERVICE_ACCOUNT from Netlify if not in .env.
 */
import { execSync } from "node:child_process";
import { buildMetaArticleDraft } from "../src/lib/kg/article-pipeline";
import { closeDriver } from "../src/lib/kg/neo4j-client";

function fromNetlify(key: string): string {
  const json = execSync(`netlify env:get ${key} --json`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const parsed = JSON.parse(json);
  return parsed[key] ?? Object.values(parsed)[0];
}

// Synchronous env setup before main() — modules read these lazily so static
// imports above are safe.
if (!process.env.ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = fromNetlify("ANTHROPIC_API_KEY");
  console.log("[gen] ✓ Fetched ANTHROPIC_API_KEY from Netlify");
}
const persist = process.argv.includes("--persist");
if (persist && !process.env.FIREBASE_SERVICE_ACCOUNT) {
  process.env.FIREBASE_SERVICE_ACCOUNT = fromNetlify("FIREBASE_SERVICE_ACCOUNT");
  console.log("[gen] ✓ Fetched FIREBASE_SERVICE_ACCOUNT from Netlify");
}

async function persistDraft(article: import("@/types").ArticleRecord): Promise<void> {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)),
    });
  }
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  await db.collection("articles").doc(article.id).set(article);
  // Mirror what the scheduled function records, so the SEO/health + content
  // dashboards show this run.
  await db.collection("meta-article-runs").add({
    ranAt: new Date().toISOString(),
    ok: true,
    slug: article.slug,
    title: article.title,
    source: "script",
  });
  console.log(`\n[gen] ✓ Persisted draft to articles/${article.id} (status: draft)`);
}

async function main(): Promise<void> {
  console.log("[gen] Retrieving meta insights from KG…");
  const t0 = Date.now();
  const { article, insights, generation } = await buildMetaArticleDraft();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n[gen] ✓ Generated in ${secs}s with ${generation.model}`);
  console.log(
    `[gen] Tokens — in:${generation.usage.inputTokens} out:${generation.usage.outputTokens} ` +
      `cacheRead:${generation.usage.cacheReadTokens} cacheWrite:${generation.usage.cacheCreationTokens}`,
  );
  console.log(
    `[gen] KG snapshot: ${insights.totals.players} players, ${insights.totals.heroes} heroes, spotlight=${insights.spotlightHero}`,
  );

  console.log("\n" + "═".repeat(70));
  console.log(`TITLE:   ${article.title}`);
  console.log(`SLUG:    ${article.slug}`);
  console.log(`EXCERPT: ${article.excerpt}`);
  console.log(`TAGS:    ${article.heroTags.join(", ")}`);
  console.log(`READ:    ${article.readingMinutes} min`);
  console.log("═".repeat(70) + "\n");

  for (const b of article.contentBlocks) {
    if (b.type === "heading") console.log(`\n${"#".repeat(b.level)} ${b.text}\n`);
    else if (b.type === "paragraph") console.log(`${b.text}\n`);
    else if (b.type === "quote") console.log(`  ❝ ${b.text} ❞\n`);
    else if (b.type === "list")
      console.log(b.items.map((i) => `  • ${i}`).join("\n") + "\n");
    else if (b.type === "callout")
      console.log(`  [${b.tone.toUpperCase()}${b.title ? " — " + b.title : ""}] ${b.text}\n`);
    else if (b.type === "divider") console.log("  ─────────────\n");
  }
  console.log("═".repeat(70));
  console.log(
    `[gen] mentioned players: ${generation.mentionedPlayerUsernames.join(", ") || "(none)"}`,
  );

  if (persist) {
    await persistDraft(article);
  } else {
    console.log("\n[gen] (dry run — pass --persist to write the draft to Firestore)");
  }
}

main()
  .catch((e) => {
    console.error("[gen] ✗ FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
