"use client";

import type { PlayoffFinish } from "@/lib/stats";
import { localDate } from "@/lib/constants";

type FinishTier = "badge" | "medal" | "trophy" | "marble";

const TIER_MAP: Record<string, FinishTier> = {
  Skirmish: "badge",
  "Road to Nationals": "badge",
  ProQuest: "badge",
  "Battle Hardened": "medal",
  "The Calling": "medal",
  Nationals: "trophy",
  "Pro Tour": "trophy",
  Worlds: "trophy",
  Championship: "trophy",
};

const EVENT_ABBR: Record<string, string> = {
  Skirmish: "SK",
  "Road to Nationals": "RTN",
  ProQuest: "PQ",
  "Battle Hardened": "BH",
  "The Calling": "TC",
  Nationals: "NAT",
  "Pro Tour": "PT",
  Worlds: "WLD",
  Championship: "CH",
  Other: "OTH",
};

const PLACEMENT_TEXT: Record<PlayoffFinish["type"], string> = {
  champion: "1st",
  finalist: "2nd",
  top4: "T4",
  top8: "T8",
};

const TIER_SORT: Record<FinishTier, number> = { trophy: 0, medal: 1, badge: 2, marble: 3 };
const TYPE_SORT: Record<PlayoffFinish["type"], number> = { champion: 0, finalist: 1, top4: 2, top8: 3 };

function col(type: PlayoffFinish["type"]) {
  switch (type) {
    case "champion": return { from: "#FFD700", to: "#B8860B", stroke: "#8B6914", text: "#FFF8DC" };
    case "finalist": return { from: "#E5E7EB", to: "#9CA3AF", stroke: "#6B7280", text: "#F9FAFB" };
    case "top4":     return { from: "#F59E0B", to: "#92400E", stroke: "#78350F", text: "#FFFBEB" };
    case "top8":     return { from: "#60A5FA", to: "#1E40AF", stroke: "#1E3A8A", text: "#EFF6FF" };
  }
}

function glowFilter(type: PlayoffFinish["type"]) {
  switch (type) {
    case "champion": return "drop-shadow(0 0 8px rgba(255,215,0,0.5)) drop-shadow(0 0 3px rgba(255,215,0,0.3))";
    case "finalist": return "drop-shadow(0 0 4px rgba(192,192,192,0.25))";
    case "top4":     return "drop-shadow(0 0 4px rgba(245,158,11,0.25))";
    case "top8":     return "drop-shadow(0 0 4px rgba(96,165,250,0.25))";
  }
}

/* ── Marble (Other / unrecognised events) ── */
const MARBLE_PALETTES = [
  { from: "#a78bfa", to: "#6d28d9", swirl: "#c4b5fd", shine: "#ede9fe" },
  { from: "#f472b6", to: "#be185d", swirl: "#fbcfe8", shine: "#fce7f3" },
  { from: "#34d399", to: "#047857", swirl: "#6ee7b7", shine: "#d1fae5" },
  { from: "#38bdf8", to: "#0369a1", swirl: "#7dd3fc", shine: "#e0f2fe" },
  { from: "#fb923c", to: "#c2410c", swirl: "#fdba74", shine: "#fff7ed" },
  { from: "#f87171", to: "#b91c1c", swirl: "#fca5a5", shine: "#fef2f2" },
];

function MarbleIcon({ type, id, idx }: { type: PlayoffFinish["type"]; id: string; idx: number }) {
  const pal = MARBLE_PALETTES[idx % MARBLE_PALETTES.length];
  const ch = type === "champion";
  const c = col(type);
  const size = ch ? "w-6 h-6" : "w-5 h-5";
  return (
    <svg viewBox="0 0 32 32" className={size} style={{ filter: `drop-shadow(0 0 4px ${pal.from}55)` }}>
      <defs>
        <radialGradient id={`${id}mg`} cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor={pal.shine} />
          <stop offset="40%" stopColor={pal.from} />
          <stop offset="100%" stopColor={pal.to} />
        </radialGradient>
      </defs>
      {/* Glass sphere */}
      <circle cx="16" cy="16" r="14" fill={`url(#${id}mg)`} stroke={pal.to} strokeWidth="0.8" />
      {/* Inner swirl */}
      <path d="M10 20Q14 10 22 14Q26 18 18 24Q14 26 10 20Z" fill={pal.swirl} opacity="0.25" />
      <path d="M14 8Q18 12 24 10" fill="none" stroke={pal.swirl} strokeWidth="1.2" opacity="0.3" strokeLinecap="round" />
      {/* Glass highlight */}
      <ellipse cx="12" cy="11" rx="4" ry="2.5" fill="white" opacity="0.45" transform="rotate(-20 12 11)" />
      <ellipse cx="11" cy="10.5" rx="1.8" ry="1" fill="white" opacity="0.6" transform="rotate(-20 11 10.5)" />
      {/* Placement text */}
      <text x="16" y="18" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="7.5" fontWeight="700" fontFamily="system-ui,sans-serif" opacity="0.85">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/* ── Shield Badge (Skirmish / RTN / PQ) ── */
function ShieldBadge({ type, id }: { type: PlayoffFinish["type"]; id: string }) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 40 48" className={ch ? "w-6 h-7" : "w-5 h-6"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      <path d="M20 2L37 10L37 28L20 46L3 28L3 10Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.5" />
      <path d="M20 6L34 12.5L34 27L20 42.5L6 27L6 12.5Z" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.25" />
      {ch && <path d="M20 11L22.5 16.5L28.5 17L24 21L25 27L20 24L15 27L16 21L11.5 17L17.5 16.5Z" fill={c.text} opacity="0.2" />}
      <text x="20" y="28" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="10" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/* ── Medal (Battle Hardened / The Calling) ── */
function MedalIcon({ type, id }: { type: PlayoffFinish["type"]; id: string }) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 48 58" className={ch ? "w-8 h-10" : "w-7 h-[34px]"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} stopOpacity="0.6" /><stop offset="100%" stopColor={c.to} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* V-ribbon */}
      <path d="M14 0L18 0L24 20L20 20Z" fill={`url(#${id}r)`} />
      <path d="M30 0L34 0L28 20L24 20Z" fill={`url(#${id}r)`} />
      {/* Medal body */}
      <circle cx="24" cy="38" r="17" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="24" cy="38" r="13.5" fill="none" stroke={c.text} strokeWidth="0.5" opacity="0.3" />
      {ch && (
        <>
          <circle cx="24" cy="38" r="15.5" fill="none" stroke={c.text} strokeWidth="0.7" opacity="0.15" strokeDasharray="2 2" />
          <path d="M24 27L26 32L32 32.5L27.5 36L28.8 42L24 39L19.2 42L20.5 36L16 32.5L22 32Z" fill={c.text} opacity="0.18" />
        </>
      )}
      <text x="24" y="40" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="10" fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

/* ── Trophy (Nationals / Pro Tour / Worlds) ── */
function TrophyIcon({ type, id }: { type: PlayoffFinish["type"]; id: string }) {
  const c = col(type);
  const ch = type === "champion";
  return (
    <svg viewBox="0 0 56 64" className={ch ? "w-10 h-12" : "w-[34px] h-10"} style={{ filter: glowFilter(type) }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* Cup body */}
      <path d="M13 6L43 6L40 30Q38 38 28 40Q18 38 16 30Z" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1.2" />
      {/* Inner shine */}
      <path d="M17 9L39 9L37 28Q36 34 28 36Q20 34 19 28Z" fill={c.text} opacity="0.08" />
      {/* Handles */}
      <path d="M13 10Q1 10 3 20Q5 28 16 28" fill="none" stroke={c.stroke} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M43 10Q55 10 53 20Q51 28 40 28" fill="none" stroke={c.stroke} strokeWidth="1.8" strokeLinecap="round" />
      {/* Stem */}
      <path d="M24 40L24 48L32 48L32 40" fill={c.to} stroke={c.stroke} strokeWidth="0.8" />
      {/* Base */}
      <rect x="17" y="48" width="22" height="6" rx="2" fill={`url(#${id}g)`} stroke={c.stroke} strokeWidth="1" />
      {ch && (
        <>
          <path d="M28 12L30.2 17.5L36 18L31.5 22L32.8 28L28 25L23.2 28L24.5 22L20 18L25.8 17.5Z" fill={c.text} opacity="0.2" />
          <rect x="19" y="50" width="18" height="2" rx="1" fill={c.text} opacity="0.12" />
        </>
      )}
      <text x="28" y="24" textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={ch ? "10" : "8.5"} fontWeight="700" fontFamily="system-ui,sans-serif">{PLACEMENT_TEXT[type]}</text>
    </svg>
  );
}

const GROUP_LABEL: Record<PlayoffFinish["type"], string> = {
  champion: "Wins", finalist: "Finals", top4: "Top 4", top8: "Top 8",
};
const GROUP_COLOR: Record<PlayoffFinish["type"], string> = {
  champion: "text-amber-400", finalist: "text-gray-400", top4: "text-amber-600", top8: "text-blue-400",
};

export function TrophyCase({ finishes }: { finishes: PlayoffFinish[] }) {
  if (finishes.length === 0) return null;

  const sorted = [...finishes].sort((a, b) => {
    const tA = TIER_SORT[TIER_MAP[a.eventType] || "marble"];
    const tB = TIER_SORT[TIER_MAP[b.eventType] || "marble"];
    if (tA !== tB) return tA - tB;
    return TYPE_SORT[a.type] - TYPE_SORT[b.type];
  });

  const placementOrder: PlayoffFinish["type"][] = ["champion", "finalist", "top4", "top8"];
  const groups = placementOrder
    .map(type => ({ type, items: sorted.filter(f => f.type === type) }))
    .filter(g => g.items.length > 0);

  let idx = 0;

  return (
    <div className="bg-fab-surface/50 border border-fab-border rounded-lg px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium">Trophy Case</p>
        <p className="text-[10px] text-fab-dim">{finishes.length} finish{finishes.length !== 1 ? "es" : ""}</p>
      </div>
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.type}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${GROUP_COLOR[g.type]}`}>
                {GROUP_LABEL[g.type]}
              </span>
              <span className="text-[9px] text-fab-dim">({g.items.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5 items-end">
              {g.items.map((f) => {
                const tier = TIER_MAP[f.eventType] || "marble";
                const abbr = EVENT_ABBR[f.eventType] || f.eventType.slice(0, 3).toUpperCase();
                const id = `tc${idx}`;
                const i = idx++;
                const date = (() => { try { return localDate(f.eventDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }); } catch { return ""; } })();
                const tip = `${PLACEMENT_TEXT[f.type]} — ${f.eventName}${date ? ` (${date})` : ""}`;
                return (
                  <div key={`${f.eventName}-${f.eventDate}-${i}`} className="flex flex-col items-center" title={tip}>
                    {tier === "trophy" ? <TrophyIcon type={f.type} id={id} /> :
                     tier === "medal" ? <MedalIcon type={f.type} id={id} /> :
                     tier === "marble" ? <MarbleIcon type={f.type} id={id} idx={i} /> :
                     <ShieldBadge type={f.type} id={id} />}
                    <span className="text-[8px] text-fab-dim font-medium mt-0.5 leading-none">{abbr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
