"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AI_MODELS, estPerQueryUsd, getModel } from "@/lib/ai-models";
import { Brain, Activity, DollarSign, Clock, AlertTriangle, ChevronLeft } from "lucide-react";

interface Summary {
  total: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  last7dCostUsd: number;
  errors: number;
  byModel: Record<string, { count: number; costUsd: number }>;
}
interface TraceRow {
  ts: string;
  model: string;
  question: string;
  tools: string[];
  citations: number;
  costUsd: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
}

export function AiAdmin() {
  const { user } = useAuth();
  const [model, setModel] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [traces, setTraces] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      const token = await user!.getIdToken();
      const res = await fetch("/.netlify/functions/ai-admin", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Request failed");
      return data;
    },
    [user],
  );

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await call("stats");
      setModel(data.config?.model ?? null);
      setSummary(data.summary ?? null);
      setTraces(data.traces ?? []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  async function chooseModel(id: string) {
    if (id === model || saving) return;
    setSaving(true);
    setError(null);
    try {
      await call("set-model", { model: id });
      setModel(id);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const fmtUsd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;
  const fmtTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch {
      return ts;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-fab-gold" />
          <h1 className="text-xl font-black text-fab-text">AI Assistant</h1>
        </div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-fab-dim hover:text-fab-text">
          <ChevronLeft className="h-3.5 w-3.5" /> Admin
        </Link>
      </div>

      {error && <div className="rounded-lg border border-fab-loss/30 bg-fab-loss/10 p-3 text-sm text-fab-loss">{error}</div>}

      {/* Model switcher */}
      <section className="rounded-xl border border-fab-border bg-fab-surface p-5">
        <h2 className="text-sm font-semibold text-fab-text mb-1">Model</h2>
        <p className="text-xs text-fab-dim mb-4">The model the assistant runs. Cheaper models cost less per question; pick what balances quality and spend.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {AI_MODELS.map((m) => {
            const selected = m.id === model;
            return (
              <button
                key={m.id}
                onClick={() => chooseModel(m.id)}
                disabled={saving || loading}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  selected ? "border-fab-gold bg-fab-gold/5 ring-1 ring-fab-gold/40" : "border-fab-border bg-fab-bg hover:border-fab-gold/40"
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-fab-text">{m.label}</p>
                  {selected && <span className="text-[10px] font-bold uppercase tracking-wide text-fab-gold">Active</span>}
                </div>
                <p className="mt-1 text-xs text-fab-dim leading-snug">{m.blurb}</p>
                <p className="mt-2 text-xs text-fab-muted">
                  ~<span className="font-semibold text-fab-text">{fmtUsd(estPerQueryUsd(m))}</span>/question
                  <span className="text-fab-dim"> · ${m.inPerM}/${m.outPerM} per Mtok</span>
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Monitoring */}
      <section className="rounded-xl border border-fab-border bg-fab-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-fab-text">Monitoring</h2>
          <button onClick={() => refresh()} className="text-xs text-fab-dim hover:text-fab-text">Refresh</button>
        </div>

        {loading ? (
          <p className="text-sm text-fab-muted animate-pulse">Loading…</p>
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat icon={<Activity className="h-4 w-4" />} label="Queries" value={String(summary.total)} sub="last 200" />
              <Stat icon={<DollarSign className="h-4 w-4" />} label="Total spend" value={fmtUsd(summary.totalCostUsd)} sub={`${fmtUsd(summary.last7dCostUsd)} last 7d`} />
              <Stat icon={<Clock className="h-4 w-4" />} label="Avg latency" value={`${(summary.avgLatencyMs / 1000).toFixed(1)}s`} />
              <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Errors" value={String(summary.errors)} tone={summary.errors > 0 ? "loss" : undefined} />
            </div>

            {Object.keys(summary.byModel).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(summary.byModel).map(([id, s]) => (
                  <span key={id} className="rounded-full border border-fab-border bg-fab-bg px-2.5 py-1 text-xs text-fab-muted">
                    {getModel(id)?.label ?? id}: <span className="text-fab-text font-semibold">{s.count}</span> · {fmtUsd(s.costUsd)}
                  </span>
                ))}
              </div>
            )}

            {/* Recent traces */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-fab-dim border-b border-fab-border">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Question</th>
                    <th className="py-2 pr-3 font-medium">Tools</th>
                    <th className="py-2 pr-3 font-medium">Model</th>
                    <th className="py-2 pr-3 font-medium text-right">Cost</th>
                    <th className="py-2 pr-3 font-medium text-right">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.map((t, i) => (
                    <tr key={i} className="border-b border-fab-border/50 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap text-fab-dim">{fmtTime(t.ts)}</td>
                      <td className="py-2 pr-3 text-fab-text max-w-[22rem]">
                        <span className="line-clamp-2">{t.question || (t.ok ? "—" : <span className="text-fab-loss">error: {t.error}</span>)}</span>
                      </td>
                      <td className="py-2 pr-3 text-fab-muted">{t.tools.join(", ") || "—"}</td>
                      <td className="py-2 pr-3 text-fab-muted whitespace-nowrap">{getModel(t.model)?.label ?? t.model}</td>
                      <td className="py-2 pr-3 text-right text-fab-muted whitespace-nowrap">{fmtUsd(t.costUsd)}</td>
                      <td className="py-2 pr-3 text-right text-fab-muted whitespace-nowrap">{(t.latencyMs / 1000).toFixed(1)}s</td>
                    </tr>
                  ))}
                  {traces.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-fab-dim">No queries logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-fab-dim">No data.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "loss" }) {
  return (
    <div className="rounded-lg border border-fab-border bg-fab-bg p-3">
      <div className="flex items-center gap-1.5 text-fab-dim">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`mt-1 text-lg font-black ${tone === "loss" ? "text-fab-loss" : "text-fab-text"}`}>{value}</p>
      {sub && <p className="text-[10px] text-fab-dim">{sub}</p>}
    </div>
  );
}
