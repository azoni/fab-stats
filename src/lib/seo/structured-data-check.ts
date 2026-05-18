/**
 * Structured-data validator.
 *
 * Closes the loop on Phase 1: we generate schema.org JSON-LD, this verifies it
 * actually passes the rules Google enforces for rich results. Fetches a page,
 * extracts every <script type="application/ld+json">, parses it, and checks
 * per-@type required fields.
 *
 * This is a pragmatic subset of Google's Rich Results requirements — enough to
 * catch the failures that silently drop a page out of rich-result eligibility
 * (missing headline/author/datePublished, no @context, invalid JSON).
 *
 * Node-side only (fetch + cheerio).
 */
import * as cheerio from "cheerio";

export interface SdIssue {
  url: string;
  severity: "error" | "warning";
  type: string;
  message: string;
}

export interface SdResult {
  url: string;
  blocks: number;
  types: string[];
  issues: SdIssue[];
}

const UA =
  "Mozilla/5.0 (compatible; FabStatsSEOBot/1.0; +https://www.fabstats.net)";

// Required (error) and recommended (warning) properties per schema.org @type,
// scoped to what Google actually uses for rich results.
const RULES: Record<
  string,
  { required: string[]; recommended: string[] }
> = {
  Article: {
    required: ["headline"],
    recommended: ["datePublished", "author", "image"],
  },
  Person: { required: ["name"], recommended: ["url"] },
  SportsEvent: {
    required: ["name", "startDate"],
    recommended: ["location"],
  },
  SportsTeam: { required: ["name"], recommended: ["sport"] },
  WebSite: { required: ["name", "url"], recommended: ["potentialAction"] },
  BreadcrumbList: { required: ["itemListElement"], recommended: [] },
  Organization: { required: ["name"], recommended: ["url", "logo"] },
};

function checkObject(url: string, obj: Record<string, unknown>): SdIssue[] {
  const issues: SdIssue[] = [];
  const type = typeof obj["@type"] === "string" ? (obj["@type"] as string) : null;

  if (!obj["@context"]) {
    issues.push({
      url, severity: "error", type: type ?? "?",
      message: "missing @context (not recognized as linked data)",
    });
  }
  if (!type) {
    issues.push({
      url, severity: "error", type: "?",
      message: "missing @type",
    });
    return issues;
  }

  const rule = RULES[type];
  if (!rule) return issues; // unknown type — not validated, not an error

  for (const prop of rule.required) {
    if (obj[prop] == null || obj[prop] === "") {
      issues.push({
        url, severity: "error", type,
        message: `${type} missing required property "${prop}"`,
      });
    }
  }
  for (const prop of rule.recommended) {
    if (obj[prop] == null || obj[prop] === "") {
      issues.push({
        url, severity: "warning", type,
        message: `${type} missing recommended property "${prop}"`,
      });
    }
  }
  return issues;
}

/** Validate all JSON-LD on a single page. */
export async function validatePage(url: string): Promise<SdResult> {
  const result: SdResult = { url, blocks: 0, types: [], issues: [] };

  let html = "";
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!res.ok) {
      result.issues.push({
        url, severity: "error", type: "-",
        message: `page returned HTTP ${res.status}`,
      });
      return result;
    }
    html = await res.text();
  } catch (e) {
    result.issues.push({
      url, severity: "error", type: "-",
      message: `fetch failed: ${e instanceof Error ? e.message : String(e)}`,
    });
    return result;
  }

  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');
  result.blocks = scripts.length;

  if (scripts.length === 0) {
    result.issues.push({
      url, severity: "warning", type: "-",
      message: "no JSON-LD found on page",
    });
    return result;
  }

  scripts.each((_, el) => {
    const raw = $(el).contents().text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      result.issues.push({
        url, severity: "error", type: "-",
        message: "JSON-LD block is not valid JSON",
      });
      return;
    }
    // A block may be a single object or an array (@graph-style).
    const objs = Array.isArray(parsed) ? parsed : [parsed];
    for (const o of objs) {
      if (o && typeof o === "object") {
        const obj = o as Record<string, unknown>;
        const t = obj["@type"];
        if (typeof t === "string") result.types.push(t);
        result.issues.push(...checkObject(url, obj));
      }
    }
  });

  return result;
}

export interface SdAudit {
  baseUrl: string;
  checkedAt: string;
  pages: number;
  totalErrors: number;
  totalWarnings: number;
  results: SdResult[];
}

/** Validate a set of paths against a base URL. */
export async function validateSite(
  baseUrl: string,
  paths: string[],
): Promise<SdAudit> {
  const results: SdResult[] = [];
  for (const p of paths) {
    const url = new URL(p, baseUrl).toString();
    results.push(await validatePage(url));
  }
  let totalErrors = 0;
  let totalWarnings = 0;
  for (const r of results) {
    for (const i of r.issues) {
      if (i.severity === "error") totalErrors++;
      else totalWarnings++;
    }
  }
  return {
    baseUrl,
    checkedAt: new Date().toISOString(),
    pages: results.length,
    totalErrors,
    totalWarnings,
    results,
  };
}
