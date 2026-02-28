import type { ReactNode } from "react";
import type { EventBadge, EventTier } from "@/lib/events";
import { localDate } from "@/lib/constants";

const tierConfig: Record<EventTier, { color: string; bg: string; border: string; icon: ReactNode }> = {
  "battle-hardened": {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
        <path d="M13 19l6-6" />
        <path d="M16 16l4 4" />
        <path d="M19 21l2-2" />
      </svg>
    ),
  },
  calling: {
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 15V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  nationals: {
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
  "pro-tour": {
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  worlds: {
    color: "text-fab-gold",
    bg: "bg-fab-gold/10",
    border: "border-fab-gold/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
};

const finishColors: Record<string, string> = {
  Champion: "bg-yellow-500/20 text-yellow-400",
  Finalist: "bg-amber-500/15 text-amber-400",
  "Top 4": "bg-orange-500/15 text-orange-400",
  "Top 8": "bg-fab-gold/10 text-fab-gold",
  Playoff: "bg-fab-gold/10 text-fab-gold",
};

/** Border + glow styles for playoff finishes on the card itself */
const finishBorderStyle: Record<string, { border: string; shadow: string }> = {
  Playoff: { border: "#cd7f32", shadow: "0 0 8px rgba(205,127,50,0.25)" },
  "Top 8": { border: "#cd7f32", shadow: "0 0 8px rgba(205,127,50,0.3)" },
  "Top 4": { border: "#c0c0c0", shadow: "0 0 8px rgba(192,192,192,0.35)" },
  Finalist: { border: "#fbbf24", shadow: "0 0 10px rgba(251,191,36,0.4)" },
  Champion: { border: "#a78bfa", shadow: "0 0 12px rgba(167,139,250,0.5), 0 0 24px rgba(167,139,250,0.2)" },
};

export function EventBadges({ badges, inline }: { badges: EventBadge[]; inline?: boolean }) {
  if (badges.length === 0) return null;

  return (
    <div>
      {!inline && <h2 className="text-lg font-semibold text-fab-text mb-3">Major Events</h2>}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:flex-wrap sm:overflow-visible">
        {badges.map((badge, i) => {
          const config = tierConfig[badge.tier];
          const dateStr = localDate(badge.date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
          const fbs = badge.bestFinish ? finishBorderStyle[badge.bestFinish] : null;
          return (
            <div
              key={`${badge.eventName}-${badge.date}-${i}`}
              className={`shrink-0 w-[140px] rounded-lg border ${fbs ? "" : config.border} ${config.bg} p-3 relative overflow-hidden`}
              style={fbs ? { borderColor: fbs.border, boxShadow: fbs.shadow } : undefined}
            >
              {/* Faint watermark */}
              <div className={`absolute -bottom-2 -right-2 opacity-[0.06] ${config.color}`}>
                <div className="w-16 h-16">
                  {config.icon}
                </div>
              </div>

              <div className={`mb-2 ${config.color}`}>{config.icon}</div>
              <p className="font-bold text-fab-text text-sm leading-tight truncate" title={badge.city}>
                {badge.city}
              </p>
              <p className={`text-[10px] ${config.color} font-semibold uppercase tracking-wider mt-0.5`}>
                {badge.tierLabel}
              </p>
              {badge.bestFinish && (
                <span className={`inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded font-semibold ${finishColors[badge.bestFinish] || "bg-fab-surface text-fab-muted"}`}>
                  {badge.bestFinish}
                </span>
              )}
              <p className="text-[10px] text-fab-dim mt-1">{dateStr}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
