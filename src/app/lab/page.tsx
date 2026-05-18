"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface KgStats {
  nodes: { label: string; count: number }[];
  edges: { rel: string; count: number }[];
  playersWithEmbeddings: number;
  topHeroes: { hero: string; players: number }[];
  bigMatchups: { a: string; b: string; games: number }[];
  error?: string;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-center">
      <div className="text-2xl font-bold text-fab-text">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="mt-1 text-xs text-fab-dim">{label}</div>
    </div>
  );
}

const CARDS = [
  { href: "/lab/graph", title: "Knowledge Graph", desc: "Interactive matchup + link graph from Neo4j" },
  { href: "/lab/search", title: "Semantic Search", desc: "Playstyle vector search (3 modes)" },
  { href: "/lab/content", title: "Generated Content", desc: "AI meta articles + player bios" },
  { href: "/lab/seo", title: "SEO Audit", desc: "Crawl, link graph, structured data, CWV" },
];

export default function LabHome() {
  const [s, setS] = useState<KgStats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/kg-stats")
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setS(d)))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  const nodeTotal = s?.nodes.reduce((a, b) => a + b.count, 0) ?? 0;
  const edgeTotal = s?.edges.reduce((a, b) => a + b.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">KG Platform Console</h1>
        <p className="mt-1 text-sm text-fab-dim">
          Live view of the knowledge graph, embeddings, generated content, and
          SEO automation.
        </p>
      </div>

      {err && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {err}
          <p className="mt-1 text-xs text-red-300/70">
            Needs the kg-stats function — run with <code>netlify dev</code>.
          </p>
        </div>
      )}

      {s && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Graph nodes" value={nodeTotal} />
            <Stat label="Graph edges" value={edgeTotal} />
            <Stat label="Players w/ embeddings" value={s.playersWithEmbeddings} />
            <Stat label="Node / edge types" value={`${s.nodes.length} / ${s.edges.length}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fab-gold">
                Graph composition
              </h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="mb-1 text-fab-dim">Nodes</div>
                  {s.nodes.map((n) => (
                    <div key={n.label} className="flex justify-between">
                      <span className="text-fab-text">{n.label}</span>
                      <span className="text-fab-dim">{n.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="mb-1 text-fab-dim">Edges</div>
                  {s.edges.map((e) => (
                    <div key={e.rel} className="flex justify-between">
                      <span className="text-fab-text">{e.rel}</span>
                      <span className="text-fab-dim">{e.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fab-gold">
                Meta snapshot
              </h2>
              <div className="text-xs">
                <div className="mb-1 text-fab-dim">Most-played heroes</div>
                {s.topHeroes.map((h) => (
                  <div key={h.hero} className="flex justify-between">
                    <span className="text-fab-text">{h.hero}</span>
                    <span className="text-fab-dim">{h.players} pilots</span>
                  </div>
                ))}
                <div className="mb-1 mt-3 text-fab-dim">Biggest matchups</div>
                {s.bigMatchups.map((m, i) => (
                  <div key={i} className="text-fab-text">
                    {m.a} vs {m.b}{" "}
                    <span className="text-fab-dim">({m.games.toLocaleString()} games)</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-fab-gold/40"
          >
            <div className="font-semibold text-fab-gold">{c.title}</div>
            <div className="mt-1 text-xs text-fab-dim">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
