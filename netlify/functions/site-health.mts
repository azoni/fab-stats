/**
 * Weekly Core Web Vitals monitor.
 *
 * Pulls lab (Lighthouse) + field (CrUX/RUM) vitals for the key pages via the
 * PageSpeed Insights API and stores a snapshot in Firestore `webVitals/{date}`
 * so the SEO dashboard can trend LCP/INP/CLS over time and flag regressions.
 *
 * Required env: FIREBASE_SERVICE_ACCOUNT. Optional: PAGESPEED_API_KEY.
 */
import type { Config } from "@netlify/functions";
import { getAdminDb } from "./firebase-admin.ts";
import { auditWebVitals } from "../../src/lib/seo/web-vitals.ts";

const BASE_URL = "https://www.fabstats.net";
const PATHS = ["/", "/leaderboard", "/meta", "/discover", "/player/mathonical"];

const handler = async (): Promise<Response> => {
  const started = Date.now();
  try {
    const audit = await auditWebVitals(BASE_URL, PATHS, "mobile");
    const db = getAdminDb();
    const day = new Date().toISOString().slice(0, 10);
    await db.collection("webVitals").doc(day).set({
      ...audit,
      durationMs: Date.now() - started,
    });

    const poor = audit.pages.filter(
      (p) =>
        p.field.lcpMs.rating === "poor" ||
        p.field.inpMs.rating === "poor" ||
        p.field.cls.rating === "poor" ||
        p.lab.performanceScore.rating === "poor",
    ).length;

    return new Response(
      JSON.stringify({ ok: true, pages: audit.pages.length, poor }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[site-health] failed:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export default handler;

// Wednesdays 07:00 UTC. PSI is slow (~10-20s/page) — deploy as a background
// function.
export const config: Config = {
  schedule: "0 7 * * 3",
};
