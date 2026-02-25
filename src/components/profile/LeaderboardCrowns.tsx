import Link from "next/link";
import type { LeaderboardRank } from "@/lib/leaderboard-ranks";

const rankStyle: Record<1 | 2 | 3 | 4 | 5, { bg: string; text: string; medal: string }> = {
  1: { bg: "bg-fuchsia-400/15", text: "text-fuchsia-400", medal: "1st" },
  2: { bg: "bg-sky-400/15", text: "text-sky-400", medal: "2nd" },
  3: { bg: "bg-yellow-400/15", text: "text-yellow-400", medal: "3rd" },
  4: { bg: "bg-gray-300/15", text: "text-gray-300", medal: "4th" },
  5: { bg: "bg-amber-600/15", text: "text-amber-600", medal: "5th" },
};

export function LeaderboardCrowns({ ranks }: { ranks: LeaderboardRank[] }) {
  if (ranks.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-fab-text mb-3">Leaderboard Rankings</h2>
      <div className="flex gap-2 flex-wrap">
        {ranks.map((r) => {
          const style = rankStyle[r.rank];
          return (
            <Link
              key={r.tab}
              href={`/leaderboard?tab=${r.tab}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-fab-border ${style.bg} hover:border-fab-gold/30 transition-colors`}
            >
              <svg className={`w-3.5 h-3.5 ${style.text}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
              </svg>
              <span className="text-xs text-fab-text font-medium">{r.tabLabel}</span>
              <span className={`text-xs font-bold ${style.text}`}>{style.medal}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
