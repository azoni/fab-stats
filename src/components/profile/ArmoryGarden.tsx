"use client";
import { useState, useMemo, useCallback, useRef } from "react";
import type { EventStats, UserProfile } from "@/types";
import { WATERING_CANS, DEFAULT_CAN_ID, getCanById, getUnlockedCanIds } from "@/lib/watering-cans";

/* ── petal palette ─────────────────────────────────────── */
const COLORS = [
  "#f9a8d4", "#fdba74", "#fde047", "#c4b5fd", "#93c5fd",
  "#6ee7b7", "#fca5a5", "#d8b4fe", "#fcd34d", "#fda4af",
  "#5eead4", "#a5b4fc", "#f0abfc", "#7dd3fc",
];
const ACCENT = [
  "#ec4899", "#f97316", "#eab308", "#8b5cf6", "#3b82f6",
  "#10b981", "#ef4444", "#a855f7", "#f59e0b", "#f43f5e",
  "#14b8a6", "#6366f1", "#d946ef", "#0ea5e9",
];

interface FlowerData {
  type: "bloom" | "crown";
  color: string;
  accent: string;
  idx: number;
  /** 0.1–1.0: how far along toward the next full flower */
  growth: number;
}

/* ── compute garden data ───────────────────────────────── */
function buildGarden(eventStats: EventStats[]) {
  const armory = eventStats.filter((e) => e.eventType === "Armory");
  let attended = 0;
  let undefeated = 0;

  for (const event of armory) {
    attended++;
    if (event.losses === 0 && event.wins > 0) undefeated++;
  }

  const withLosses = attended - undefeated;
  const flowers: FlowerData[] = [];
  let idx = 0;

  // Daisies: one per 2 non-undefeated armories, plus a partial
  const daisyFull = Math.floor(withLosses / 2);
  const daisyRem = withLosses % 2;
  for (let i = 0; i < daisyFull; i++) {
    flowers.push({ type: "bloom", growth: 1, color: COLORS[idx % COLORS.length], accent: ACCENT[idx % ACCENT.length], idx: idx++ });
  }
  if (daisyRem > 0) {
    flowers.push({ type: "bloom", growth: daisyRem / 2, color: COLORS[idx % COLORS.length], accent: ACCENT[idx % ACCENT.length], idx: idx++ });
  }

  // Sunflowers: one per 2 undefeated armories, plus a partial
  const sunFull = Math.floor(undefeated / 2);
  const sunRem = undefeated % 2;
  for (let i = 0; i < sunFull; i++) {
    flowers.push({ type: "crown", growth: 1, color: COLORS[idx % COLORS.length], accent: ACCENT[idx % ACCENT.length], idx: idx++ });
  }
  if (sunRem > 0) {
    flowers.push({ type: "crown", growth: sunRem / 2, color: COLORS[idx % COLORS.length], accent: ACCENT[idx % ACCENT.length], idx: idx++ });
  }

  return { flowers, attended, undefeated };
}

/* ── daisy ─────────────────────────────────────────────── */
function Daisy({ color, accent, idx, growth }: { color: string; accent: string; idx: number; growth: number }) {
  const cx = 9, cy = 9;

  /* Sprout: just a tiny shoot with a leaf curl */
  if (growth <= 0.3) {
    const stemH = 4 + growth * 20;
    const h = 22;
    const top = h - stemH;
    return (
      <svg width="16" height={h} viewBox={`0 0 16 ${h}`} className="garden-flower"
        style={{ animationDelay: `${(idx % 8) * 0.35}s` }}>
        <line x1="8" y1={top} x2="8" y2={h} stroke="#4ade80" strokeWidth="1" strokeLinecap="round" />
        {growth > 0.15 && (
          <ellipse cx={idx % 2 === 0 ? 10.5 : 5.5} cy={h - stemH * 0.35}
            rx="2" ry="0.7" fill="#4ade80"
            transform={`rotate(${idx % 2 === 0 ? -35 : 35} ${idx % 2 === 0 ? 10.5 : 5.5} ${h - stemH * 0.35})`} />
        )}
        <circle cx="8" cy={top} r="1.2" fill="#86efac" />
      </svg>
    );
  }

  /* Bud: stem + leaves + closed colored bud */
  if (growth <= 0.6) {
    const stemH = 10 + (idx % 3);
    const h = cy + 3 + stemH;
    const leafY = cy + 3 + stemH * 0.5;
    const leafSide = idx % 2 === 0;
    return (
      <svg width="16" height={h} viewBox={`0 0 16 ${h}`} className="garden-flower"
        style={{ animationDelay: `${(idx % 8) * 0.35}s` }}>
        <line x1="8" y1={cy + 3} x2="8" y2={h} stroke="#4ade80" strokeWidth="1" strokeLinecap="round" />
        <ellipse cx={leafSide ? 11 : 5} cy={leafY} rx="2.5" ry="0.9" fill="#4ade80"
          transform={`rotate(${leafSide ? -30 : 30} ${leafSide ? 11 : 5} ${leafY})`} />
        {/* closed bud */}
        <ellipse cx="8" cy={cy} rx="2.2" ry="3.2" fill={color} opacity="0.75" />
        <ellipse cx="8" cy={cy - 1} rx="1" ry="2" fill="#86efac" opacity="0.4" />
      </svg>
    );
  }

  /* Blooming / Full (0.7–1.0) */
  const petals = 5 + (idx % 2);
  const scale = growth < 1 ? 0.55 + (growth - 0.7) * 1.5 : 1; // 0.55→1.0
  const orbit = 3.5 * scale;
  const r = 2.5 * scale;
  const stemH = 10 + (idx % 4) * 1.2;
  const h = cy + 3 + stemH;
  const leafSide = idx % 2 === 0;
  const leafY = cy + 3 + stemH * 0.5;

  return (
    <svg width="16" height={h} viewBox={`0 0 16 ${h}`} className="garden-flower"
      style={{ animationDelay: `${(idx % 8) * 0.35}s` }}>
      <line x1="8" y1={cy + 3} x2="8" y2={h} stroke="#4ade80" strokeWidth="1" strokeLinecap="round" />
      <ellipse cx={leafSide ? 11 : 5} cy={leafY} rx="2.5" ry="0.9" fill="#4ade80"
        transform={`rotate(${leafSide ? -30 : 30} ${leafSide ? 11 : 5} ${leafY})`} />
      {Array.from({ length: petals }).map((_, i) => {
        const a = ((i * 360) / petals - 90) * (Math.PI / 180);
        return (
          <circle key={i}
            cx={cx + Math.cos(a) * orbit} cy={cy + Math.sin(a) * orbit}
            r={r} fill={color} stroke={accent} strokeWidth="0.3" opacity={0.88} />
        );
      })}
      <circle cx={cx} cy={cy} r={1.8 * scale} fill="#fde047" />
      <circle cx={cx} cy={cy} r={0.8 * scale} fill="#fbbf24" />
    </svg>
  );
}

/* ── sunflower ─────────────────────────────────────────── */
function SunflowerSVG({ color, accent, idx, growth }: { color: string; accent: string; idx: number; growth: number }) {
  const cx = 14, cy = 14;

  /* Sprout */
  if (growth <= 0.3) {
    const stemH = 5 + growth * 24;
    const h = 28;
    const top = h - stemH;
    return (
      <svg width="24" height={h} viewBox={`0 0 24 ${h}`} className="garden-flower"
        style={{ animationDelay: `${(idx % 8) * 0.35}s` }}>
        <line x1="12" y1={top} x2="12" y2={h} stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
        {growth > 0.15 && (
          <ellipse cx={idx % 2 === 0 ? 15 : 9} cy={h - stemH * 0.35}
            rx="3" ry="1" fill="#22c55e"
            transform={`rotate(${idx % 2 === 0 ? -30 : 30} ${idx % 2 === 0 ? 15 : 9} ${h - stemH * 0.35})`} />
        )}
        <circle cx="12" cy={top} r="1.8" fill="#86efac" />
      </svg>
    );
  }

  /* Bud */
  if (growth <= 0.6) {
    const stemH = 14 + (idx % 3);
    const h = cy + 6 + stemH;
    const leafY = cy + 6 + stemH * 0.45;
    return (
      <svg width="24" height={h} viewBox={`0 0 24 ${h}`} className="garden-flower"
        style={{ animationDelay: `${(idx % 8) * 0.35}s` }}>
        <line x1="12" y1={cy + 6} x2="12" y2={h} stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
        <ellipse cx="16" cy={leafY} rx="3.5" ry="1.2" fill="#22c55e" transform={`rotate(-28 16 ${leafY})`} />
        <ellipse cx="8" cy={leafY + 3} rx="3.5" ry="1.2" fill="#22c55e" transform={`rotate(28 8 ${leafY + 3})`} />
        {/* closed bud */}
        <ellipse cx="12" cy={cy} rx="3" ry="4.5" fill={color} opacity="0.75" />
        <ellipse cx="12" cy={cy - 1.5} rx="1.5" ry="3" fill="#22c55e" opacity="0.35" />
      </svg>
    );
  }

  /* Blooming / Full */
  const outerN = 10;
  const innerN = 10;
  const scale = growth < 1 ? 0.5 + (growth - 0.7) * 1.67 : 1;
  const stemH = 15 + (idx % 3) * 1.5;
  const h = cy + 7 + stemH;
  const leaf1Y = cy + 7 + stemH * 0.3;
  const leaf2Y = cy + 7 + stemH * 0.6;

  return (
    <svg width="26" height={h} viewBox={`0 0 26 ${h}`} className="garden-flower"
      style={{ animationDelay: `${(idx % 8) * 0.35}s` }}>
      {growth === 1 && <circle cx={cx - 1} cy={cy} r="15" fill="#fbbf24" opacity="0.05" />}
      <line x1="13" y1={cy + 7} x2="13" y2={h} stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="17" cy={leaf1Y} rx="4" ry="1.3" fill="#22c55e" transform={`rotate(-28 17 ${leaf1Y})`} />
      <ellipse cx="9" cy={leaf2Y} rx="4" ry="1.3" fill="#22c55e" transform={`rotate(28 9 ${leaf2Y})`} />
      {/* outer petals */}
      {Array.from({ length: outerN }).map((_, i) => {
        const deg = (i * 360) / outerN;
        const a = (deg - 90) * (Math.PI / 180);
        const px = (cx - 1) + Math.cos(a) * 7 * scale;
        const py = cy + Math.sin(a) * 7 * scale;
        return (
          <ellipse key={`o-${i}`} cx={px} cy={py}
            rx={1.8 * scale} ry={4.2 * scale}
            fill={color} stroke={accent} strokeWidth="0.3" opacity={0.92}
            transform={`rotate(${deg} ${px} ${py})`} />
        );
      })}
      {/* inner petals */}
      {growth > 0.8 && Array.from({ length: innerN }).map((_, i) => {
        const deg = (i * 360) / innerN + 18;
        const a = (deg - 90) * (Math.PI / 180);
        const px = (cx - 1) + Math.cos(a) * 4.5 * scale;
        const py = cy + Math.sin(a) * 4.5 * scale;
        return (
          <ellipse key={`i-${i}`} cx={px} cy={py}
            rx={1.3 * scale} ry={3 * scale}
            fill={color} opacity={0.55}
            transform={`rotate(${deg} ${px} ${py})`} />
        );
      })}
      {/* seed disk */}
      <circle cx={cx - 1} cy={cy} r={4 * scale} fill="#92400e" />
      {growth === 1 && [0, 60, 120, 180, 240, 300].map((deg) => {
        const a = deg * (Math.PI / 180);
        return <circle key={`s-${deg}`} cx={(cx - 1) + Math.cos(a) * 2.3} cy={cy + Math.sin(a) * 2.3} r="0.6" fill="#78350f" />;
      })}
      <circle cx={cx - 1} cy={cy} r={1.2 * scale} fill="#b45309" />
      {growth === 1 && <circle cx={cx - 2} cy={cy - 1} r="0.7" fill="#fde047" opacity="0.5" />}
    </svg>
  );
}

const RARITY_BORDER: Record<string, string> = {
  common: "border-fab-border",
  uncommon: "border-emerald-500/40",
  rare: "border-blue-400/40",
  epic: "border-purple-400/40",
};

/* ── garden component ──────────────────────────────────── */
export function ArmoryGarden({ eventStats, ownerProfile, isOwner }: { eventStats: EventStats[]; ownerProfile: UserProfile; isOwner?: boolean }) {
  const { flowers, attended, undefeated } = useMemo(
    () => buildGarden(eventStats),
    [eventStats],
  );

  const [selectedCanId, setSelectedCanId] = useState(DEFAULT_CAN_ID);
  const selectedCan = useMemo(() => getCanById(selectedCanId), [selectedCanId]);

  const unlockedIds = useMemo(
    () => getUnlockedCanIds(ownerProfile),
    [ownerProfile],
  );

  // Visitors see only unlocked cans; owners also see locked ones
  const visibleCans = useMemo(() => {
    if (isOwner) return WATERING_CANS;
    return WATERING_CANS.filter((c) => unlockedIds.includes(c.id));
  }, [isOwner, unlockedIds]);

  const lastDropTime = useRef(0);
  const handleWater = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastDropTime.current < 80) return;
    lastDropTime.current = now;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const count = 1 + Math.round(Math.random());
    for (let d = 0; d < count; d++) {
      const drop = document.createElement("div");
      drop.className = "garden-drop";
      drop.style.left = `${x + (Math.random() * 12 - 6)}px`;
      drop.style.top = `${y}px`;
      e.currentTarget.appendChild(drop);
      drop.addEventListener("animationend", () => drop.remove());
    }
  }, []);

  if (attended === 0) return null;

  return (
    <div
      className="bg-fab-surface/50 border border-fab-border rounded-lg px-4 py-3 flex flex-col"
      style={{ cursor: selectedCan.cursor, "--garden-drop-color": selectedCan.dropColor } as React.CSSProperties}
    >
      <style>{`
        @keyframes garden-sway {
          0%, 100% { transform: rotate(-2.5deg) translateY(0); }
          33% { transform: rotate(1.5deg) translateY(-1px); }
          66% { transform: rotate(-1deg) translateY(0.5px); }
        }
        .garden-flower {
          animation: garden-sway 4s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .garden-drop {
          position: absolute;
          width: 3px;
          height: 5px;
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          background: var(--garden-drop-color, rgba(96, 165, 250, 0.7));
          pointer-events: none;
          animation: garden-drop-fall 0.5s ease-in forwards;
          z-index: 15;
        }
        @keyframes garden-drop-fall {
          0% { opacity: 0.8; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(20px); }
        }
      `}</style>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2C7 2 5 5 5 8c0 2 1.5 3.5 3 4.5V18h4v-5.5c1.5-1 3-2.5 3-4.5 0-3-2-6-5-6z" />
            </svg>
            <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium">
              Armory Garden
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Watering can picker — inline in header */}
            {visibleCans.length > 1 && (
              <div className="flex items-center gap-1">
                {visibleCans.map((can) => {
                  const unlocked = unlockedIds.includes(can.id);
                  const isSelected = selectedCanId === can.id;
                  return (
                    <button
                      key={can.id}
                      onClick={() => unlocked && setSelectedCanId(can.id)}
                      className={`relative w-6 h-6 rounded border flex items-center justify-center transition-all ${
                        !unlocked
                          ? "opacity-25 grayscale border-fab-border cursor-not-allowed"
                          : isSelected
                            ? `border-fab-gold ring-1 ring-fab-gold/40 bg-fab-gold/10`
                            : `border-transparent hover:border-fab-muted`
                      }`}
                      title={unlocked ? can.name : `${can.name} (locked)`}
                    >
                      <div className="w-4 h-4" dangerouslySetInnerHTML={{ __html: can.previewSvg }} />
                      {!unlocked && (
                        <svg className="absolute w-2 h-2 text-fab-dim bottom-0 right-0" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 1a4 4 0 00-4 4v2H3a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 00-1-1h-1V5a4 4 0 00-4-4zm-2 4a2 2 0 114 0v2H6V5z" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-fab-dim">
              {attended} armor{attended !== 1 ? "ies" : "y"}
              {undefeated > 0 && (
                <span className="text-amber-400/80">
                  {" "}&middot; {undefeated} undefeated
                </span>
              )}
            </p>
          </div>
        </div>

        {/* The garden bed */}
        <div className="relative rounded-md overflow-hidden flex-1 flex flex-col justify-end" onMouseMove={handleWater}>
          {/* Sky-to-soil gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-amber-950/20 pointer-events-none" />

          <div className="relative flex flex-wrap gap-0.5 items-end justify-center px-2 pt-2 pb-0 min-h-[40px]">
            {flowers.map((f) =>
              f.type === "crown" ? (
                <SunflowerSVG key={f.idx} color={f.color} accent={f.accent} idx={f.idx} growth={f.growth} />
              ) : (
                <Daisy key={f.idx} color={f.color} accent={f.accent} idx={f.idx} growth={f.growth} />
              ),
            )}
          </div>

          {/* Ground */}
          <div className="h-1 bg-emerald-900/15" />
          <div className="h-1.5 bg-gradient-to-b from-amber-900/10 to-amber-950/6" />
        </div>
    </div>
  );
}
