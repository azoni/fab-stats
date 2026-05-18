"use client";

/**
 * Content-performance dashboard.
 *
 * Closes the generation loop: which articles (auto-generated vs human) earn
 * traffic, draft/publish funnel, and recent meta-article generation runs.
 * Reads the existing `articles` collection + `meta-article-runs`.
 */
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import type { MetaArticleRun } from "@/lib/seo/seo-health-data";

interface ArticleRow {
  slug: string;
  title: string;
  status: string;
  viewCount: number;
  tags: string[];
  heroTags: string[];
  createdAt: string;
}

function ContentPerformanceInner() {
  const [articles, setArticles] = useState<ArticleRow[] | null>(null);
  const [runs, setRuns] = useState<MetaArticleRun[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const aSnap = await getDocs(collection(db, "articles"));
        const rows: ArticleRow[] = aSnap.docs.map((d) => {
          const x = d.data();
          return {
            slug: x.slug ?? d.id,
            title: x.title ?? "(untitled)",
            status: x.status ?? "draft",
            viewCount: x.viewCount ?? 0,
            tags: x.tags ?? [],
            heroTags: x.heroTags ?? [],
            createdAt: x.createdAt ?? "",
          };
        });
        rows.sort((a, b) => b.viewCount - a.viewCount);
        setArticles(rows);
        try {
          const rSnap = await getDocs(
            query(collection(db, "meta-article-runs"), orderBy("ranAt", "desc"), limit(8)),
          );
          setRuns(rSnap.docs.map((d) => d.data() as MetaArticleRun));
        } catch {
          /* collection may not exist yet */
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const auto = articles?.filter((a) => a.tags.includes("auto-generated")) ?? [];
  const published = articles?.filter((a) => a.status === "published") ?? [];
  const drafts = articles?.filter((a) => a.status === "draft") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">Content Performance</h1>
        <p className="mt-1 text-sm text-fab-dim">
          Auto-generated vs human content, the draft→publish funnel, and recent
          generation runs.
        </p>
      </div>

      {err && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {err}
        </div>
      )}
      {!articles && !err && <div className="text-fab-dim">Loading…</div>}

      {articles && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Total", articles.length],
              ["Auto-generated", auto.length],
              ["Published", published.length],
              ["Drafts (review queue)", drafts.length],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-2xl font-bold text-fab-text">{v}</div>
                <div className="text-xs text-fab-dim">{k}</div>
              </div>
            ))}
          </div>

          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fab-gold">
              Top articles by views
            </h2>
            <table className="w-full text-xs">
              <thead className="text-left text-fab-dim">
                <tr>
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Source</th>
                  <th className="pb-2 text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {articles.slice(0, 15).map((a) => (
                  <tr key={a.slug} className="border-t border-white/5">
                    <td className="py-1.5 text-fab-text">{a.title}</td>
                    <td>
                      <span className={a.status === "published" ? "text-emerald-400" : "text-amber-400"}>
                        {a.status}
                      </span>
                    </td>
                    <td className="text-fab-dim">
                      {a.tags.includes("auto-generated") ? "auto" : "human"}
                    </td>
                    <td className="text-right text-fab-text">{a.viewCount}</td>
                  </tr>
                ))}
                {articles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-fab-dim">
                      No articles yet. Generate one with the meta-article job.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fab-gold">
              Recent generation runs
            </h2>
            {runs.length === 0 ? (
              <p className="text-sm text-fab-dim">No runs recorded.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {runs.map((r, i) => (
                  <li key={i} className="border-t border-white/5 pt-1.5">
                    <span className={r.ok ? "text-emerald-400" : "text-red-400"}>
                      {r.ok ? "✓" : "✗"}
                    </span>{" "}
                    <span className="text-fab-text">{r.title ?? r.error}</span>
                    <span className="text-fab-dim">
                      {" "}· {r.weekLabel} · {r.spotlightHero} ·{" "}
                      {r.ranAt ? new Date(r.ranAt).toLocaleDateString() : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function ContentPerformancePage() {
  return (
    <RequireAdmin>
      <ContentPerformanceInner />
    </RequireAdmin>
  );
}
