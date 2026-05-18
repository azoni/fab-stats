"use client";

import { useEffect, useState } from "react";
import type { SeoHealthData } from "@/lib/seo/seo-health-data";
import { SeoHealthView } from "@/components/seo/SeoHealthView";

export default function LabSeoPage() {
  const [data, setData] = useState<SeoHealthData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lab-data?view=seo")
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d as SeoHealthData)))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">SEO Audit</h1>
        <p className="mt-1 text-sm text-fab-dim">
          Crawl + link graph, structured data, and Core Web Vitals snapshots.
        </p>
      </div>
      {err && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {err}
        </div>
      )}
      {!data && !err && <div className="text-fab-dim">Loading…</div>}
      {data && <SeoHealthView data={data} />}
    </div>
  );
}
