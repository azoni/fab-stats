"use client";

/**
 * Presentational SEO/pipeline-health view. Shared by the gated
 * /admin/seo-health page and the ungated /lab/seo console so the render lives
 * in exactly one place.
 */
import type { SeoHealthData } from "@/lib/seo/seo-health-data";
import type { MetricValue } from "@/lib/seo/web-vitals";

function ratingColor(r: string): string {
  return r === "good"
    ? "text-emerald-400"
    : r === "needs-improvement"
      ? "text-amber-400"
      : r === "poor"
        ? "text-red-400"
        : "text-fab-dim";
}

function Metric({ m, unit = "" }: { m: MetricValue; unit?: string }) {
  if (m.value == null) return <span className="text-fab-dim">n/a</span>;
  const v = unit === "" ? m.value.toFixed(3) : Math.round(m.value).toString();
  return <span className={ratingColor(m.rating)}>{v}{unit}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fab-gold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SeoHealthView({ data }: { data: SeoHealthData }) {
  const la = data.linkAudit;
  const wv = data.webVitals;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Core Web Vitals (real-user + lab)">
        {!wv ? (
          <p className="text-sm text-fab-dim">
            No snapshot yet — run the site-health function.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-fab-dim">
              <tr className="text-left">
                <th className="pb-2">Page</th>
                <th className="pb-2">Perf</th>
                <th className="pb-2">LCP (fld)</th>
                <th className="pb-2">INP (fld)</th>
                <th className="pb-2">CLS (fld)</th>
              </tr>
            </thead>
            <tbody>
              {wv.pages.map((p) => (
                <tr key={p.url} className="border-t border-white/5">
                  <td className="py-1.5">{new URL(p.url).pathname}</td>
                  {p.ok ? (
                    <>
                      <td><Metric m={p.lab.performanceScore} /></td>
                      <td><Metric m={p.field.lcpMs} unit="ms" /></td>
                      <td><Metric m={p.field.inpMs} unit="ms" /></td>
                      <td><Metric m={p.field.cls} /></td>
                    </>
                  ) : (
                    <td colSpan={4} className="text-red-400">{p.error}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {wv && (
          <p className="mt-2 text-[11px] text-fab-dim">
            {wv.strategy} · {new Date(wv.checkedAt).toLocaleString()}
          </p>
        )}
      </Card>

      <Card title="Link Audit">
        {!la ? (
          <p className="text-sm text-fab-dim">
            No snapshot yet — run the link-audit function.
          </p>
        ) : (
          <div className="space-y-3 text-xs">
            {la.sitemapHostMismatch && (
              <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-red-300">
                Sitemap lists [{la.sitemapHostMismatch.sitemapHosts.join(", ")}]
                but canonical host is {la.sitemapHostMismatch.canonicalHost} —
                every sitemap URL 301-redirects.
              </div>
            )}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["Crawled", la.pagesCrawled],
                ["Broken", la.brokenLinks.length],
                ["Orphans", la.orphanPages.length],
                ["Sitemap gaps", la.missingFromSitemap.length],
              ].map(([k, v]) => (
                <div key={k} className="rounded bg-white/5 p-2">
                  <div className="text-lg font-bold text-fab-text">{v}</div>
                  <div className="text-fab-dim">{k}</div>
                </div>
              ))}
            </div>
            {la.orphanPages.length > 0 && (
              <div>
                <div className="text-fab-dim">Orphan pages:</div>
                {la.orphanPages.map((o) => (
                  <div key={o} className="text-fab-text">{o}</div>
                ))}
              </div>
            )}
            <div>
              <div className="text-fab-dim">Top link equity:</div>
              {la.linkEquity.slice(0, 6).map((e) => (
                <div key={e.path} className="flex justify-between">
                  <span className="text-fab-text">{e.path}</span>
                  <span className="text-fab-dim">{e.inbound} inbound</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card title="KG Sync (recent runs)">
        {data.syncRuns.length === 0 ? (
          <p className="text-sm text-fab-dim">No runs recorded.</p>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {data.syncRuns.map((r, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="py-1.5">
                    <span className={r.ok ? "text-emerald-400" : "text-red-400"}>
                      {r.ok ? "✓" : "✗"}
                    </span>{" "}
                    {new Date(r.ranAt).toLocaleString()}
                  </td>
                  <td className="text-fab-dim">
                    {r.ok
                      ? `${r.players ?? 0}p / ${r.heroes ?? 0}h / ${r.matchups ?? 0}m`
                      : r.error}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Meta Articles (recent runs)">
        {data.metaArticleRuns.length === 0 ? (
          <p className="text-sm text-fab-dim">No runs recorded.</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {data.metaArticleRuns.map((r, i) => (
              <li key={i} className="border-t border-white/5 pt-1.5">
                <span className={r.ok ? "text-emerald-400" : "text-red-400"}>
                  {r.ok ? "✓" : "✗"}
                </span>{" "}
                <span className="text-fab-text">{r.title ?? r.error}</span>
                <span className="text-fab-dim">
                  {r.weekLabel ? ` · ${r.weekLabel}` : ""} ·{" "}
                  {new Date(r.ranAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
