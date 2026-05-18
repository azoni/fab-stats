"use client";

/**
 * SEO / content-pipeline health dashboard (admin-gated). Render lives in the
 * shared SeoHealthView component (also used by the ungated /lab/seo console).
 */
import { useEffect, useState } from "react";
import { getSeoHealthData, type SeoHealthData } from "@/lib/seo/seo-health-data";
import { SeoHealthView } from "@/components/seo/SeoHealthView";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

function SeoHealthInner() {
  const [data, setData] = useState<SeoHealthData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getSeoHealthData()
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">SEO &amp; Pipeline Health</h1>
        <p className="mt-1 text-sm text-fab-dim">
          Snapshots from the scheduled link-audit, Core Web Vitals, KG-sync, and
          meta-article jobs.
        </p>
      </div>
      {err && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {err}
        </div>
      )}
      {!data && !err && <div className="text-fab-dim">Loading dashboards…</div>}
      {data && <SeoHealthView data={data} />}
    </div>
  );
}

export default function SeoHealthPage() {
  return (
    <RequireAdmin>
      <SeoHealthInner />
    </RequireAdmin>
  );
}
