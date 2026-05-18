/**
 * Pull Core Web Vitals for the live site and print them.
 *
 *   node --env-file=.env --import tsx scripts/run-web-vitals.ts
 *   node --env-file=.env --import tsx scripts/run-web-vitals.ts https://www.fabstats.net
 */
import { auditWebVitals, type MetricValue } from "../src/lib/seo/web-vitals";

const baseUrl = process.argv[2] ?? "https://www.fabstats.net";
const PATHS = ["/", "/leaderboard", "/meta"];

function fmt(m: MetricValue, unit = ""): string {
  if (m.value == null) return "  n/a".padStart(10);
  const v = unit === "" ? m.value.toFixed(3) : Math.round(m.value).toString();
  const tag =
    m.rating === "good" ? "✓" : m.rating === "poor" ? "✗" : m.rating === "none" ? " " : "~";
  return `${tag} ${v}${unit}`.padStart(10);
}

async function main(): Promise<void> {
  console.log(`[cwv] PageSpeed Insights for ${baseUrl} (mobile)…`);
  const audit = await auditWebVitals(baseUrl, PATHS, "mobile");

  console.log("\n" + "═".repeat(78));
  console.log(
    "PATH".padEnd(16) +
      "│ perf │  LCP(lab) │  LCP(fld) │  INP(fld) │  CLS(fld)",
  );
  console.log("─".repeat(78));
  for (const p of audit.pages) {
    const path = new URL(p.url).pathname.padEnd(16);
    if (!p.ok) {
      console.log(`${path}│ ERROR: ${p.error}`);
      continue;
    }
    console.log(
      `${path}│ ${fmt(p.lab.performanceScore)} │${fmt(p.lab.lcpMs, "ms")} │` +
        `${fmt(p.field.lcpMs, "ms")} │${fmt(p.field.inpMs, "ms")} │${fmt(p.field.cls)}`,
    );
  }
  console.log("═".repeat(78));
  console.log("✓ good  ~ needs-improvement  ✗ poor   (fld = real-user CrUX data)");
}

main().catch((e) => {
  console.error("[cwv] ✗ FAILED:", e);
  process.exitCode = 1;
});
