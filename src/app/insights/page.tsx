"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { PageHero } from "@/components/ui/PageHero";
import { Sparkles, Send, BookOpen, Lock } from "lucide-react";

interface Citation {
  id: string;
  label: string;
  url?: string | null;
  kind: string;
}
interface InsightResult {
  answer: string;
  citations: Citation[];
  toolsUsed: string[];
}

const PRESETS: { label: string; question: string; sub: string }[] = [
  { label: "Explain my meta", question: "Explain how my most-played heroes compare to the current community meta, and what that says about my deck choices.", sub: "Uses your tracked matches" },
  { label: "My toughest matchups", question: "What are my worst hero matchups based on my tracked results, and what should I focus on?", sub: "Uses your tracked matches" },
  { label: "Current community meta", question: "What are the most popular and highest win-rate heroes in the community right now?", sub: "Community-wide" },
  { label: "Best Classic Constructed heroes", question: "Which Classic Constructed heroes have the strongest win rates in the tracked data?", sub: "Community-wide" },
];

export default function InsightsPage() {
  const { user, isAdmin } = useAuth();
  const [question, setQuestion] = useState("");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(q: string, label: string | null) {
    const text = q.trim();
    if (!text || loading || !user) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveLabel(label);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/.netlify/functions/ai-insights", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: text, scope: "personal" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
      setResult(data as InsightResult);
    } catch (e) {
      setError((e as Error)?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Private admin beta gate.
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHero eyebrow="Beta" title="Insights" description="A grounded AI assistant over FaB Stats data." icon={<Sparkles className="h-4 w-4" />} />
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-fab-border bg-fab-surface p-5 text-sm text-fab-muted">
          <Lock className="h-5 w-5 text-fab-dim shrink-0" />
          <p>
            The AI assistant is in a private admin beta and isn&apos;t open yet.{" "}
            {!user && (
              <Link href="/login" className="text-fab-gold hover:underline">
                Sign in
              </Link>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHero
        eyebrow="Admin beta"
        title="Insights"
        description="Ask about your stats, the community meta, matchups, or card rules. Every answer is grounded in real tracked data and cites its sources."
        icon={<Sparkles className="h-4 w-4" />}
      />

      {/* Presets */}
      <div className="grid gap-3 sm:grid-cols-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => run(p.question, p.label)}
            disabled={loading}
            className={`text-left rounded-xl border p-4 transition-colors ${
              activeLabel === p.label ? "border-fab-gold/60 bg-fab-gold/5" : "border-fab-border bg-fab-surface hover:border-fab-gold/40"
            } disabled:opacity-50`}
          >
            <p className="text-sm font-semibold text-fab-text">{p.label}</p>
            <p className="mt-1 text-xs text-fab-dim">{p.sub}</p>
          </button>
        ))}
      </div>

      {/* Free-text */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(question, null);
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about FaB Stats, the meta, or a card…"
          className="flex-1 rounded-lg border border-fab-border bg-fab-bg px-3 py-2.5 text-sm text-fab-text placeholder:text-fab-dim focus:border-fab-gold focus:outline-none"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-fab-gold px-4 py-2.5 text-sm font-bold text-fab-bg transition-colors hover:bg-fab-gold-light disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Ask
        </button>
      </form>

      {/* Result */}
      {loading && <div className="rounded-xl border border-fab-border bg-fab-surface p-5 text-sm text-fab-muted animate-pulse">Thinking — checking your data and the meta…</div>}

      {error && <div className="rounded-xl border border-fab-loss/30 bg-fab-loss/10 p-4 text-sm text-fab-loss">{error}</div>}

      {result && !loading && (
        <div className="rounded-xl border border-fab-border bg-fab-surface p-5 space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-fab-text">{result.answer}</p>

          {result.citations.length > 0 && (
            <div className="border-t border-fab-border pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fab-dim">
                <BookOpen className="h-3.5 w-3.5" /> Sources
              </p>
              <ol className="space-y-1 text-xs text-fab-muted">
                {result.citations.slice(0, 8).map((c, i) => (
                  <li key={c.id}>
                    <span className="text-fab-dim">[{i + 1}]</span>{" "}
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline">
                        {c.label}
                      </a>
                    ) : (
                      c.label
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
