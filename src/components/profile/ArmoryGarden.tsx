"use client";
import { useMemo } from "react";
import type { EventStats } from "@/types";

/* ── petal palette ─────────────────────────────────────── */
const COLORS = [
  "#f9a8d4", // pink-300
  "#fdba74", // orange-300
  "#fde047", // yellow-300
  "#c4b5fd", // violet-300
  "#93c5fd", // blue-300
  "#6ee7b7", // emerald-300
  "#fca5a5", // red-300
  "#d8b4fe", // purple-300
  "#fcd34d", // amber-300
  "#fda4af", // rose-300
  "#5eead4", // teal-300
  "#a5b4fc", // indigo-300
  "#f0abfc", // fuchsia-300
  "#7dd3fc", // sky-300
];

/* darker shade for petal outlines / depth */
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
}

/* ── compute garden data ───────────────────────────────── */
function buildGarden(eventStats: EventStats[]) {
  const armory = eventStats.filter((e) => e.eventType === "Armory");
  const flowers: FlowerData[] = [];
  let totalWins = 0;
  let perfectRuns = 0;
  let idx = 0;

  for (const event of armory) {
    if (event.wins === 0) continue;
    totalWins += event.wins;

    if (event.losses === 0) {
      // Undefeated armory = one crown flower
      perfectRuns++;
      flowers.push({
        type: "crown",
        color: COLORS[idx % COLORS.length],
        accent: ACCENT[idx % ACCENT.length],
        idx: idx++,
      });
    } else {
      // Individual win flowers
      for (let w = 0; w < event.wins; w++) {
        flowers.push({
          type: "bloom",
          color: COLORS[idx % COLORS.length],
          accent: ACCENT[idx % ACCENT.length],
          idx: idx++,
        });
      }
    }
  }

  return { flowers, totalWins, perfectRuns };
}

/* ── small flower (individual match win) ───────────────── */
function SmallFlower({ color, accent, idx }: { color: string; accent: string; idx: number }) {
  const petals = 5 + (idx % 2); // 5 or 6
  const cx = 10, cy = 10;
  const orbit = 4.2;
  const r = 3;
  const stemH = 13 + (idx % 5) * 1.5;
  const h = cy + 4 + stemH;
  const leafSide = idx % 2 === 0;
  const leafY = cy + 4 + stemH * 0.5;

  return (
    <svg
      width="20"
      height={h}
      viewBox={`0 0 20 ${h}`}
      className="garden-flower"
      style={{ animationDelay: `${(idx % 10) * 0.3}s` }}
    >
      {/* stem */}
      <line
        x1="10" y1={cy + 4} x2="10" y2={h}
        stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round"
      />
      {/* leaf */}
      <ellipse
        cx={leafSide ? 13.5 : 6.5} cy={leafY}
        rx="3" ry="1.2"
        fill="#4ade80"
        transform={`rotate(${leafSide ? -30 : 30} ${leafSide ? 13.5 : 6.5} ${leafY})`}
      />
      {/* petals */}
      {Array.from({ length: petals }).map((_, i) => {
        const a = ((i * 360) / petals - 90) * (Math.PI / 180);
        return (
          <circle
            key={i}
            cx={cx + Math.cos(a) * orbit}
            cy={cy + Math.sin(a) * orbit}
            r={r}
            fill={color}
            stroke={accent}
            strokeWidth="0.4"
            opacity={0.88}
          />
        );
      })}
      {/* center */}
      <circle cx={cx} cy={cy} r="2.2" fill="#fde047" />
      <circle cx={cx} cy={cy} r="1" fill="#fbbf24" />
    </svg>
  );
}

/* ── sunflower (undefeated armory run) ─────────────────── */
function Sunflower({ color, accent, idx }: { color: string; accent: string; idx: number }) {
  const cx = 18, cy = 18;
  const outerPetals = 12;
  const innerPetals = 12;
  const stemH = 20 + (idx % 4) * 2;
  const h = cy + 10 + stemH;
  const leaf1Y = cy + 10 + stemH * 0.3;
  const leaf2Y = cy + 10 + stemH * 0.6;

  return (
    <svg
      width="36"
      height={h}
      viewBox={`0 0 36 ${h}`}
      className="garden-flower"
      style={{ animationDelay: `${(idx % 10) * 0.3}s` }}
    >
      {/* warm glow */}
      <circle cx={cx} cy={cy} r="20" fill="#fbbf24" opacity="0.06" />

      {/* stem — thicker */}
      <line
        x1="18" y1={cy + 10} x2="18" y2={h}
        stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round"
      />
      {/* leaves */}
      <ellipse
        cx="24" cy={leaf1Y} rx="5.5" ry="2"
        fill="#22c55e"
        transform={`rotate(-25 24 ${leaf1Y})`}
      />
      <ellipse
        cx="12" cy={leaf2Y} rx="5.5" ry="2"
        fill="#22c55e"
        transform={`rotate(25 12 ${leaf2Y})`}
      />

      {/* outer petals — elongated pointed ellipses */}
      {Array.from({ length: outerPetals }).map((_, i) => {
        const deg = (i * 360) / outerPetals;
        const a = (deg - 90) * (Math.PI / 180);
        const px = cx + Math.cos(a) * 9;
        const py = cy + Math.sin(a) * 9;
        return (
          <ellipse
            key={`o-${i}`}
            cx={px} cy={py}
            rx="2.2" ry="5.5"
            fill={color}
            stroke={accent}
            strokeWidth="0.4"
            opacity={0.92}
            transform={`rotate(${deg} ${px} ${py})`}
          />
        );
      })}
      {/* inner petals — shorter, offset between outer */}
      {Array.from({ length: innerPetals }).map((_, i) => {
        const deg = (i * 360) / innerPetals + 360 / innerPetals / 2;
        const a = (deg - 90) * (Math.PI / 180);
        const px = cx + Math.cos(a) * 6.5;
        const py = cy + Math.sin(a) * 6.5;
        return (
          <ellipse
            key={`i-${i}`}
            cx={px} cy={py}
            rx="1.8" ry="4"
            fill={color}
            opacity={0.7}
            transform={`rotate(${deg} ${px} ${py})`}
          />
        );
      })}
      {/* seed disk — dark ring */}
      <circle cx={cx} cy={cy} r="5.5" fill="#92400e" />
      {/* seed dots */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const a = deg * (Math.PI / 180);
        return (
          <circle
            key={`s-${deg}`}
            cx={cx + Math.cos(a) * 3.2}
            cy={cy + Math.sin(a) * 3.2}
            r="0.8"
            fill="#78350f"
          />
        );
      })}
      {/* inner seed ring */}
      {[30, 90, 150, 210, 270, 330].map((deg) => {
        const a = deg * (Math.PI / 180);
        return (
          <circle
            key={`si-${deg}`}
            cx={cx + Math.cos(a) * 1.6}
            cy={cy + Math.sin(a) * 1.6}
            r="0.6"
            fill="#78350f"
          />
        );
      })}
      {/* golden center highlight */}
      <circle cx={cx} cy={cy} r="1.5" fill="#b45309" />
      {/* sparkle */}
      <circle cx={cx - 1} cy={cy - 1.5} r="1" fill="#fde047" opacity="0.5" />
    </svg>
  );
}

/* ── garden component ──────────────────────────────────── */
export function ArmoryGarden({ eventStats }: { eventStats: EventStats[] }) {
  const { flowers, totalWins, perfectRuns } = useMemo(
    () => buildGarden(eventStats),
    [eventStats],
  );

  if (flowers.length === 0) return null;

  return (
    <>
      {/* Keyframes for gentle sway — injected once */}
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
      `}</style>

      <div className="bg-fab-surface/50 border border-fab-border rounded-lg px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2C7 2 5 5 5 8c0 2 1.5 3.5 3 4.5V18h4v-5.5c1.5-1 3-2.5 3-4.5 0-3-2-6-5-6z" />
            </svg>
            <p className="text-[10px] text-fab-muted uppercase tracking-wider font-medium">
              Armory Garden
            </p>
          </div>
          <p className="text-[10px] text-fab-dim">
            {totalWins} win{totalWins !== 1 ? "s" : ""}
            {perfectRuns > 0 && (
              <span className="text-amber-400/80">
                {" "}&middot; {perfectRuns} perfect
              </span>
            )}
          </p>
        </div>

        {/* The garden bed */}
        <div className="relative rounded-md overflow-hidden">
          {/* Soil gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 via-emerald-950/15 to-transparent pointer-events-none" />

          <div className="relative flex flex-wrap gap-px items-end justify-center px-2 py-3 min-h-[56px]">
            {flowers.map((f) =>
              f.type === "crown" ? (
                <Sunflower key={f.idx} color={f.color} accent={f.accent} idx={f.idx} />
              ) : (
                <SmallFlower key={f.idx} color={f.color} accent={f.accent} idx={f.idx} />
              ),
            )}
          </div>

          {/* Grass line along the bottom */}
          <div className="h-1 bg-gradient-to-r from-emerald-800/30 via-emerald-600/20 to-emerald-800/30" />
        </div>
      </div>
    </>
  );
}
