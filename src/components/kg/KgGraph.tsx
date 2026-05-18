"use client";

/**
 * Interactive knowledge-graph visualizer.
 *
 * Two views off /api/kg-graph:
 *  - matchups: hero meta network (node size = #pilots, edge width = #games)
 *  - pages:    internal-link graph (broken pages flagged red)
 *
 * react-force-graph-2d is browser-only (canvas + window) — loaded via
 * next/dynamic with ssr:false so the static export build doesn't choke.
 */
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <div className="p-8 text-fab-dim">Loading graph engine…</div>,
});

interface GNode {
  id: string;
  label: string;
  group: string;
  val: number;
  x?: number;
  y?: number;
}
interface GLink {
  source: string;
  target: string;
  value: number;
}
interface GraphData {
  view: string;
  nodes: GNode[];
  links: GLink[];
}

const GROUP_COLOR: Record<string, string> = {
  hero: "#c9a84c",
  page: "#5b9bd5",
  broken: "#e0564b",
};

type View = "matchups" | "pages";

interface ForceGraphHandle {
  zoomToFit: (ms?: number, padding?: number) => void;
}

export function KgGraph() {
  const fgRef = useRef<ForceGraphHandle | undefined>(undefined);
  const [view, setView] = useState<View>("matchups");
  const [data, setData] = useState<GraphData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<GNode | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 560 });

  useEffect(() => {
    function measure() {
      if (wrapRef.current) {
        setDims({
          w: wrapRef.current.clientWidth,
          h: Math.max(420, Math.min(680, window.innerHeight - 280)),
        });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/kg-graph?view=${view}&topN=60`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) {
          setErr(d.error);
        } else {
          setErr(null);
          setSelected(null);
          setData(d);
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  // Only show data that matches the active view (avoids a flash of stale graph
  // while a new view loads — without a synchronous setState in the effect).
  const graph = data && data.view === view ? data : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">Knowledge Graph</h1>
        <p className="mt-1 text-sm text-fab-dim">
          The matchup meta and the site link structure, straight from Neo4j.
          Drag nodes, scroll to zoom, click a node for detail.
        </p>
      </div>

      <div className="flex gap-2">
        {(["matchups", "pages"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v
                ? "bg-fab-gold text-black"
                : "bg-white/5 text-fab-dim hover:text-fab-text"
            }`}
          >
            {v === "matchups" ? "Hero matchup meta" : "Site link graph"}
          </button>
        ))}
      </div>

      {err && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {err}
          <p className="mt-1 text-xs text-red-300/70">
            Needs the kg-graph function — run with <code>netlify dev</code>.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div
          ref={wrapRef}
          className="overflow-hidden rounded-lg border border-white/10 bg-black/40"
        >
          {!graph && !err && (
            <div className="p-8 text-fab-dim">Loading graph…</div>
          )}
          {graph && (
            <ForceGraph2D
              graphData={graph}
              width={dims.w}
              height={dims.h}
              backgroundColor="rgba(0,0,0,0)"
              nodeId="id"
              nodeVal="val"
              nodeColor={(n) => GROUP_COLOR[(n as GNode).group] ?? "#888"}
              nodeLabel="label"
              linkColor={() => "rgba(201,168,76,0.18)"}
              linkWidth={(l) =>
                Math.max(0.3, Math.log10(((l as GLink).value ?? 1) + 1))
              }
              cooldownTicks={120}
              // The dynamically-imported ForceGraph2D types `ref` with a
              // strict MutableRefObject generic. Cast to `undefined` (compile
              // time only — the real fgRef object is still attached at runtime,
              // so zoomToFit works) to satisfy the `| undefined` overload.
              ref={fgRef as unknown as undefined}
              onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
              onNodeClick={(n) => setSelected(n as unknown as GNode)}
            />
          )}
        </div>

        <aside className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
          {selected ? (
            <>
              <div className="font-semibold text-fab-gold">{selected.label}</div>
              <div className="mt-1 text-xs text-fab-dim">
                type: {selected.group}
              </div>
              <div className="mt-2 text-xs text-fab-text">
                weight {Math.round((selected.val ?? 0) ** 2)}
              </div>
              {view === "matchups" && (
                <a
                  href={`/scout?similarTo=${encodeURIComponent(selected.id)}`}
                  className="mt-3 inline-block text-xs text-fab-gold hover:underline"
                >
                  Players who main this →
                </a>
              )}
            </>
          ) : (
            <div className="text-fab-dim">
              {graph
                ? `${graph.nodes.length} nodes · ${graph.links.length} edges. Click a node.`
                : "—"}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
