"use client";

import { useState } from "react";
import { MetaMatchupMatrix } from "@/components/meta/MetaMatchupMatrix";
import { MatchupMatrix } from "@/components/tools/MatchupMatrix";
import { useAuth } from "@/contexts/AuthContext";
import { useMatches } from "@/hooks/useMatches";
import { useLeaderboard } from "@/hooks/useLeaderboard";

const FORMATS = ["", "Classic Constructed", "Blitz", "Living Legend"] as const;
const FORMAT_LABELS: Record<string, string> = {
  "": "All Formats",
  "Classic Constructed": "CC",
  "Blitz": "Blitz",
  "Living Legend": "Living Legend",
};

const TIME_PRESETS = [
  { id: "all", label: "All Time", since: undefined, until: undefined },
  { id: "30d", label: "30 Days", daysAgo: 30 },
  { id: "90d", label: "90 Days", daysAgo: 90 },
  { id: "6m", label: "6 Months", daysAgo: 180 },
] as const;

function getDateRange(daysAgo?: number): { since?: string; until?: string } {
  if (!daysAgo) return {};
  const now = new Date();
  const since = new Date(now.getTime() - daysAgo * 86400000);
  return {
    since: since.toISOString().slice(0, 10),
    until: now.toISOString().slice(0, 10),
  };
}

type Tab = "community" | "personal";

export default function MatchupsPageContent() {
  const [tab, setTab] = useState<Tab>("community");
  const [format, setFormat] = useState("");
  const [timePreset, setTimePreset] = useState("all");
  const { user, isGuest } = useAuth();
  const { matches, isLoaded } = useMatches();
  const { entries, loading: lbLoading } = useLeaderboard();

  const isAuthenticated = !!user && !isGuest;
  const selectedTime = TIME_PRESETS.find((t) => t.id === timePreset) || TIME_PRESETS[0];
  const { since, until } = getDateRange("daysAgo" in selectedTime ? selectedTime.daysAgo : undefined);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fab-text mb-1">Matchup Matrix</h1>
        <p className="text-sm text-fab-muted leading-relaxed">
          Hero vs hero win rates powered by community match data. Search for a hero to see their matchup spread.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setTab("community")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "community" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
          }`}
        >
          Community
        </button>
        <button
          onClick={() => setTab("personal")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "personal" ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
          }`}
        >
          My Matchups
        </button>
      </div>

      {tab === "community" && (
        <>
          {/* Format + Time filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex rounded-lg border border-fab-border overflow-hidden">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    f !== "" ? "border-l border-fab-border" : ""
                  } ${
                    format === f ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
                  }`}
                >
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-fab-border overflow-hidden">
              {TIME_PRESETS.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setTimePreset(t.id)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    i > 0 ? "border-l border-fab-border" : ""
                  } ${
                    timePreset === t.id ? "bg-fab-gold/15 text-fab-gold" : "text-fab-muted hover:text-fab-text"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <MetaMatchupMatrix format={format || undefined} sinceDate={since} untilDate={until} />
        </>
      )}

      {tab === "personal" && (
        <>
          {isAuthenticated ? (
            <MatchupMatrix matches={matches} entries={entries} isLoaded={!!isLoaded && !lbLoading} />
          ) : (
            <div className="text-center py-16">
              <p className="text-fab-muted text-sm">Sign in to see your personal matchup data.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
