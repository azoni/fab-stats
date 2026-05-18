/**
 * Validate the JSON-LD on the live site against schema.org / Google rules.
 *
 *   node --env-file=.env --import tsx scripts/run-sd-check.ts
 *   node --env-file=.env --import tsx scripts/run-sd-check.ts https://www.fabstats.net
 *
 * Closes the loop on Phase 1: confirms the structured data we generate would
 * actually qualify for rich results.
 */
import { validateSite } from "../src/lib/seo/structured-data-check";

const baseUrl = process.argv[2] ?? "https://www.fabstats.net";

// Representative pages: homepage (WebSite JSON-LD), a player profile (Person,
// injected by the edge function), the meta page, docs.
const PATHS = ["/", "/leaderboard", "/player/mathonical", "/meta", "/docs"];

async function main(): Promise<void> {
  console.log(`[sd] Validating structured data on ${baseUrl}…`);
  const audit = await validateSite(baseUrl, PATHS);

  console.log("\n" + "═".repeat(66));
  console.log(`Structured-data audit — ${baseUrl}`);
  console.log("─".repeat(66));
  console.log(`Pages checked: ${audit.pages} | errors: ${audit.totalErrors} | warnings: ${audit.totalWarnings}`);
  for (const r of audit.results) {
    const path = new URL(r.url).pathname;
    console.log(
      `\n${path}  —  ${r.blocks} JSON-LD block(s), types: [${[...new Set(r.types)].join(", ") || "none"}]`,
    );
    for (const i of r.issues) {
      const mark = i.severity === "error" ? "✗" : "•";
      console.log(`  ${mark} [${i.severity}] ${i.type}: ${i.message}`);
    }
    if (r.issues.length === 0) console.log("  ✓ clean");
  }
  console.log("═".repeat(66));
}

main().catch((e) => {
  console.error("[sd] ✗ FAILED:", e);
  process.exitCode = 1;
});
