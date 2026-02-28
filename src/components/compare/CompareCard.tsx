"use client";
import type { CardTheme } from "@/components/opponents/RivalryCard";

interface CompareData {
  p1Name: string;
  p2Name: string;
  stats: { label: string; v1: string | number; v2: string | number; better: 1 | 2 | 0 }[];
  p1TopHero: string;
  p2TopHero: string;
  p1Matches: number;
  p2Matches: number;
  p1Dominance: number;
  p2Dominance: number;
  p1PowerLevel?: number;
  p2PowerLevel?: number;
  h2h?: { p1Wins: number; p2Wins: number; draws: number; total: number };
  commonOpponents?: { shared: number; p1Edges: number; p2Edges: number };
  verdict?: string;
  verdictSubtitle?: string;
  verdictBullets?: string[];
}

function getTierInfo(level: number): { label: string; color: string } {
  if (level >= 80) return { label: "Grandmaster", color: "#d946ef" };
  if (level >= 65) return { label: "Diamond", color: "#38bdf8" };
  if (level >= 50) return { label: "Gold", color: "#facc15" };
  if (level >= 35) return { label: "Silver", color: "#9ca3af" };
  return { label: "Bronze", color: "#d97706" };
}

function TierIcon({ tier, color, size = 14 }: { tier: string; color: string; size?: number }) {
  if (tier === "Grandmaster") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M2.5 19h19v2h-19zM22.5 7l-4.5 4.5L12 4l-6 7.5L1.5 7 4 17h16z" />
      </svg>
    );
  }
  if (tier === "Diamond") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2L22 12L12 22L2 12Z" />
      </svg>
    );
  }
  if (tier === "Gold") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  if (tier === "Silver") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

export function CompareCard({ data, theme }: { data: CompareData; theme: CardTheme }) {
  const t = theme;
  const { p1Name, p2Name, stats, p1TopHero, p2TopHero, p1Matches, p2Matches, p1Dominance, p2Dominance, p1PowerLevel, p2PowerLevel, h2h, commonOpponents, verdict, verdictBullets } = data;
  const p1Leading = p1Dominance > p2Dominance;
  const tied = p1Dominance === p2Dominance;

  const p1Tier = p1PowerLevel !== undefined ? getTierInfo(p1PowerLevel) : null;
  const p2Tier = p2PowerLevel !== undefined ? getTierInfo(p2PowerLevel) : null;

  // Filter out rows where both values are "---"
  const displayStats = stats.filter(s => !(String(s.v1) === "---" && String(s.v2) === "---"));

  return (
    <div style={{ backgroundColor: t.surface, borderColor: t.border, width: 420 }} className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="border-b">
        <div style={{ height: 2, background: `linear-gradient(90deg, ${t.win}, ${t.accent}, #ef4444)` }} />
        <div className="px-4 py-1.5">
          <p style={{ color: t.accent }} className="text-[11px] uppercase tracking-[0.2em] text-center font-bold">Versus</p>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2.5">
        {/* Players + Power Levels */}
        <div className="flex items-start justify-between gap-2">
          <div className="text-center flex-1 min-w-0">
            <p style={{ color: t.text }} className="text-sm font-black truncate">{p1Name}</p>
            <p style={{ color: t.muted }} className="text-[9px] mt-0.5">
              {p1Matches} matches{p1TopHero ? ` \u00B7 ${p1TopHero}` : ""}
            </p>
            {p1Tier && p1PowerLevel !== undefined && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 5 }}>
                <TierIcon tier={p1Tier.label} color={p1Tier.color} size={15} />
                <span style={{ color: p1Tier.color, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{p1PowerLevel}</span>
                <span style={{ color: p1Tier.color, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p1Tier.label}</span>
              </div>
            )}
          </div>
          <div className="shrink-0 pt-1">
            <div style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${t.border}`, backgroundColor: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: t.accent, fontSize: 9, fontWeight: 700 }}>VS</span>
            </div>
          </div>
          <div className="text-center flex-1 min-w-0">
            <p style={{ color: t.text }} className="text-sm font-black truncate">{p2Name}</p>
            <p style={{ color: t.muted }} className="text-[9px] mt-0.5">
              {p2Matches} matches{p2TopHero ? ` \u00B7 ${p2TopHero}` : ""}
            </p>
            {p2Tier && p2PowerLevel !== undefined && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 5 }}>
                <TierIcon tier={p2Tier.label} color={p2Tier.color} size={15} />
                <span style={{ color: p2Tier.color, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{p2PowerLevel}</span>
                <span style={{ color: p2Tier.color, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p2Tier.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dominance Score */}
        <div className="mt-2.5 rounded-lg py-1.5 px-3 text-center" style={{ backgroundColor: t.bg }}>
          <div className="flex items-baseline justify-center gap-2">
            <span style={{ color: p1Leading ? t.win : tied ? t.draw : t.text }} className="text-2xl font-black">{p1Dominance}</span>
            <span style={{ color: t.border }} className="text-sm font-light">&mdash;</span>
            <span style={{ color: !p1Leading && !tied ? t.win : tied ? t.draw : t.text }} className="text-2xl font-black">{p2Dominance}</span>
          </div>
          <p style={{ color: t.muted }} className="text-[9px]">dominance score</p>
        </div>

        {/* Key Stats */}
        {displayStats.length > 0 && (
          <div className="mt-2.5">
            {displayStats.map((stat, i) => (
              <div key={stat.label} className="flex items-center" style={{ padding: "2.5px 0", borderBottom: i < displayStats.length - 1 ? `1px solid ${t.border}18` : "none" }}>
                <span
                  style={{ color: stat.better === 1 ? t.win : t.text }}
                  className="text-[11px] font-semibold w-[105px] text-right truncate"
                >
                  {stat.v1}
                </span>
                <span style={{ color: t.muted }} className="text-[9px] flex-1 text-center px-1 truncate">
                  {stat.label}
                </span>
                <span
                  style={{ color: stat.better === 2 ? t.win : t.text }}
                  className="text-[11px] font-semibold w-[105px] text-left truncate"
                >
                  {stat.v2}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* H2H */}
        {h2h && h2h.total > 0 && (
          <div className="mt-2 py-1.5 text-center" style={{ borderTop: `1px solid ${t.border}44`, borderBottom: `1px solid ${t.border}44` }}>
            <p style={{ color: t.accent }} className="text-[9px] uppercase tracking-wider font-semibold mb-0.5">Head-to-Head</p>
            <p style={{ color: t.text }} className="text-xs font-bold">
              <span style={{ color: h2h.p1Wins > h2h.p2Wins ? t.win : t.text }}>{h2h.p1Wins}W</span>
              {h2h.draws > 0 && <span style={{ color: t.muted }}> - {h2h.draws}D</span>}
              <span style={{ color: t.muted }}> - </span>
              <span style={{ color: h2h.p2Wins > h2h.p1Wins ? t.win : t.text }}>{h2h.p2Wins}L</span>
              <span style={{ color: t.muted, fontSize: 9, fontWeight: 400, marginLeft: 6 }}>({h2h.total} games)</span>
            </p>
          </div>
        )}

        {/* Common Opponents Edge */}
        {commonOpponents && commonOpponents.shared > 0 && (
          <div className="mt-2 rounded-lg py-1.5 px-2.5" style={{ backgroundColor: t.bg }}>
            <div className="flex items-center gap-1.5">
              <p style={{ color: t.accent }} className="text-[9px] uppercase tracking-wider font-semibold">Opponent Network</p>
              <p style={{ color: t.muted }} className="text-[9px]">&middot; {commonOpponents.shared} shared</p>
            </div>
            {(commonOpponents.p1Edges > 0 || commonOpponents.p2Edges > 0) && (
              <div className="mt-1 space-y-0.5">
                {commonOpponents.p1Edges > 0 && (
                  <p style={{ color: t.muted }} className="text-[9px] leading-snug">
                    <span style={{ color: t.win, fontWeight: 700 }}>{p1Name.split(" ")[0]}</span> beats {commonOpponents.p1Edges} opponent{commonOpponents.p1Edges !== 1 ? "s" : ""} that {p2Name.split(" ")[0]} loses to
                  </p>
                )}
                {commonOpponents.p2Edges > 0 && (
                  <p style={{ color: t.muted }} className="text-[9px] leading-snug">
                    <span style={{ color: t.loss, fontWeight: 700 }}>{p2Name.split(" ")[0]}</span> beats {commonOpponents.p2Edges} opponent{commonOpponents.p2Edges !== 1 ? "s" : ""} that {p1Name.split(" ")[0]} loses to
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Verdict */}
        {verdict && (
          <div className="mt-2 rounded-lg py-1.5 px-2.5" style={{ backgroundColor: t.bg }}>
            <p style={{ color: t.accent }} className="text-[9px] uppercase tracking-wider font-semibold mb-0.5">Verdict</p>
            <p style={{ color: t.text }} className="text-[11px] font-bold leading-snug">{verdict}</p>
            {verdictBullets && verdictBullets.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {verdictBullets.slice(0, 2).map((b, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <span style={{ color: t.accent }} className="text-[8px] mt-0.5">&bull;</span>
                    <p style={{ color: t.muted }} className="text-[9px] leading-snug">{b}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.bg, borderColor: t.border }} className="px-4 py-1.5 border-t">
        <p style={{ color: t.accent }} className="text-[10px] text-center tracking-wider font-semibold opacity-70">fabstats.net</p>
      </div>
    </div>
  );
}
