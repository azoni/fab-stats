"use client";

/**
 * Player Scout — semantic search surface over the playstyle KG.
 *
 * Two modes against /api/kg-search:
 *   - Free text  ("aggressive Verdance grinder with Top 8s")  → embeds query, ANN
 *   - Similar to a player (by username)                       → stored-vector ANN
 *
 * Requires the kg-search Netlify function, so run with `netlify dev`
 * (the /api/* redirect doesn't exist under plain `next dev`).
 */
import { useState } from "react";
import Link from "next/link";
import { Search, Users, Sparkles, Loader2 } from "lucide-react";

interface ScoutResult {
  id: string;
  displayName: string;
  username: string;
  topHero: string | null;
  winRate: number;
  totalMatches: number;
  playstyleCard: string;
  score: number;
}

interface ScoutResponse {
  mode: string;
  query?: string;
  similarTo?: string;
  embedMs?: number;
  count: number;
  results: ScoutResult[];
  error?: string;
  warming?: boolean;
  message?: string;
}

type Mode = "text" | "similar";

export function PlayerScout() {
  const [mode, setMode] = useState<Mode>("text");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<ScoutResponse | null>(null);

  async function run() {
    const value = input.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setResp(null);
    try {
      const url =
        mode === "text"
          ? `/api/kg-search?q=${encodeURIComponent(value)}&k=10`
          : `/api/kg-search?similarTo=${encodeURIComponent(value)}&k=10`;
      const r = await fetch(url);
      const data: ScoutResponse = await r.json();
      if (data.warming) {
        setError(
          data.message ??
            "Search model is warming up on the server. Retry in a few seconds.",
        );
      } else if (!r.ok || data.error) {
        setError(data.error || `Request failed (${r.status})`);
      } else {
        setResp(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  const examples =
    mode === "text"
      ? [
          "well-traveled veteran with elite win rate and many Top 8s",
          "casual newer player still figuring out their hero pool",
          "high-volume Verdance specialist who grinds ProQuests",
        ]
      : ["mathonical", "(paste any player's userId)"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-fab-gold">
          <Sparkles className="h-6 w-6" /> Player Scout
        </h1>
        <p className="mt-1 text-sm text-fab-dim">
          Semantic search over playstyle embeddings. Vectors live in the Neo4j
          knowledge graph, so similarity composes with graph relationships.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "text"
              ? "bg-fab-gold text-black"
              : "bg-white/5 text-fab-dim hover:text-fab-text"
          }`}
        >
          <Search className="h-4 w-4" /> Free text
        </button>
        <button
          onClick={() => setMode("similar")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "similar"
              ? "bg-fab-gold text-black"
              : "bg-white/5 text-fab-dim hover:text-fab-text"
          }`}
        >
          <Users className="h-4 w-4" /> Players like…
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder={
            mode === "text"
              ? "Describe a playstyle…"
              : "Player userId to find similar pilots…"
          }
          className="flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-fab-text outline-none focus:border-fab-gold/50"
        />
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md bg-fab-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setInput(ex)}
            className="rounded-full border border-white/10 px-2.5 py-1 text-fab-dim hover:border-fab-gold/40 hover:text-fab-text"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
          <p className="mt-1 text-xs text-red-300/70">
            Tip: this needs the kg-search function — run the site with{" "}
            <code>netlify dev</code>, not plain <code>next dev</code>.
          </p>
        </div>
      )}

      {resp && (
        <div className="space-y-3">
          <p className="text-xs text-fab-dim">
            mode: <span className="text-fab-text">{resp.mode}</span> · {resp.count} results
            {resp.embedMs != null && <> · query embedded in {resp.embedMs}ms</>}
          </p>
          {resp.results.map((r, i) => (
            <div
              key={r.id}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/player/${r.username || r.id}`}
                  className="font-semibold text-fab-gold hover:underline"
                >
                  {i + 1}. {r.displayName}
                </Link>
                <span className="shrink-0 font-mono text-xs text-fab-dim">
                  sim {r.score.toFixed(3)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-fab-dim">
                {r.topHero ?? "no main"} · {Math.round(r.winRate)}% over{" "}
                {r.totalMatches} matches
              </p>
              {r.playstyleCard && (
                <p className="mt-2 text-xs leading-relaxed text-fab-text/70">
                  {r.playstyleCard}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
