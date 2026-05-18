/**
 * Core Web Vitals monitor via Google PageSpeed Insights API.
 *
 * PSI returns BOTH:
 *  - lab data (Lighthouse, synthetic) — deterministic, good for regression CI
 *  - field data (CrUX, real Chrome users) — what actually affects ranking
 *
 * We capture both. Field (RUM) is the source of truth for SEO; lab is the
 * early-warning signal you can run on every deploy. Keyless works at low
 * volume; set PAGESPEED_API_KEY for higher quota.
 *
 * Node-side only (plain fetch — no headless browser, unlike running Lighthouse
 * ourselves; that's the deliberate "RUM > synthetic at scale" tradeoff).
 */

export type CwvRating = "good" | "needs-improvement" | "poor" | "none";

export interface MetricValue {
  /** ms for LCP/INP, unitless for CLS, 0-100 for perfScore. */
  value: number | null;
  rating: CwvRating;
}

export interface PageVitals {
  url: string;
  ok: boolean;
  error?: string;
  /** Lighthouse lab data. */
  lab: {
    performanceScore: MetricValue; // 0-100
    lcpMs: MetricValue;
    cls: MetricValue;
    tbtMs: MetricValue; // total blocking time (lab proxy for INP)
  };
  /** CrUX field data (real users); null metrics = not enough field data. */
  field: {
    lcpMs: MetricValue;
    inpMs: MetricValue;
    cls: MetricValue;
  };
}

// Google's official CWV thresholds.
function rate(metric: "lcp" | "inp" | "cls" | "score", v: number | null): CwvRating {
  if (v == null) return "none";
  switch (metric) {
    case "lcp": return v <= 2500 ? "good" : v <= 4000 ? "needs-improvement" : "poor";
    case "inp": return v <= 200 ? "good" : v <= 500 ? "needs-improvement" : "poor";
    case "cls": return v <= 0.1 ? "good" : v <= 0.25 ? "needs-improvement" : "poor";
    case "score": return v >= 90 ? "good" : v >= 50 ? "needs-improvement" : "poor";
  }
}

interface PsiResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } };
    audits?: Record<string, { numericValue?: number }>;
  };
  loadingExperience?: {
    metrics?: Record<string, { percentile?: number }>;
  };
}

export async function fetchPageVitals(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<PageVitals> {
  const empty = (): MetricValue => ({ value: null, rating: "none" });
  const result: PageVitals = {
    url,
    ok: false,
    lab: { performanceScore: empty(), lcpMs: empty(), cls: empty(), tbtMs: empty() },
    field: { lcpMs: empty(), inpMs: empty(), cls: empty() },
  };

  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", url);
  api.searchParams.set("strategy", strategy);
  api.searchParams.append("category", "performance");
  if (process.env.PAGESPEED_API_KEY) {
    api.searchParams.set("key", process.env.PAGESPEED_API_KEY);
  }

  // Keyless PSI is aggressively rate-limited (429). One backoff retry; set
  // PAGESPEED_API_KEY in production for real quota.
  let data: PsiResponse;
  try {
    let res = await fetch(api.toString());
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 8000));
      res = await fetch(api.toString());
    }
    if (!res.ok) {
      result.error =
        res.status === 429
          ? "PSI 429 (rate limited — set PAGESPEED_API_KEY for production quota)"
          : `PSI HTTP ${res.status}`;
      return result;
    }
    data = (await res.json()) as PsiResponse;
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
    return result;
  }

  // Lab (Lighthouse)
  const lh = data.lighthouseResult;
  const score =
    typeof lh?.categories?.performance?.score === "number"
      ? Math.round(lh.categories.performance.score * 100)
      : null;
  const lcpLab = lh?.audits?.["largest-contentful-paint"]?.numericValue ?? null;
  const clsLab = lh?.audits?.["cumulative-layout-shift"]?.numericValue ?? null;
  const tbtLab = lh?.audits?.["total-blocking-time"]?.numericValue ?? null;
  result.lab = {
    performanceScore: { value: score, rating: rate("score", score) },
    lcpMs: { value: lcpLab, rating: rate("lcp", lcpLab) },
    cls: { value: clsLab, rating: rate("cls", clsLab) },
    tbtMs: { value: tbtLab, rating: "none" },
  };

  // Field (CrUX, real users)
  const fm = data.loadingExperience?.metrics ?? {};
  const fLcp = fm["LARGEST_CONTENTFUL_PAINT_MS"]?.percentile ?? null;
  const fInp = fm["INTERACTION_TO_NEXT_PAINT"]?.percentile ?? null;
  const fCls =
    fm["CUMULATIVE_LAYOUT_SHIFT_SCORE"]?.percentile != null
      ? fm["CUMULATIVE_LAYOUT_SHIFT_SCORE"].percentile / 100 // CrUX reports CLS x100
      : null;
  result.field = {
    lcpMs: { value: fLcp, rating: rate("lcp", fLcp) },
    inpMs: { value: fInp, rating: rate("inp", fInp) },
    cls: { value: fCls, rating: rate("cls", fCls) },
  };

  result.ok = true;
  return result;
}

export interface VitalsAudit {
  baseUrl: string;
  checkedAt: string;
  strategy: string;
  pages: PageVitals[];
}

export async function auditWebVitals(
  baseUrl: string,
  paths: string[],
  strategy: "mobile" | "desktop" = "mobile",
): Promise<VitalsAudit> {
  const pages: PageVitals[] = [];
  // Sequential — PSI is rate-limited, especially keyless.
  for (const p of paths) {
    pages.push(await fetchPageVitals(new URL(p, baseUrl).toString(), strategy));
  }
  return {
    baseUrl,
    checkedAt: new Date().toISOString(),
    strategy,
    pages,
  };
}
