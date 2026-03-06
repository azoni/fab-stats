"use client";

interface RoundCounterProps {
  current: number;
  total: number;
  results: (
    | "banked"
    | "bust"
    | "pending"
    | "scored"
    | "blocked"
    | "hit"
  )[];
}

const RESULT_COLORS: Record<string, string> = {
  banked: "bg-amber-400",
  scored: "bg-amber-400",
  bust: "bg-red-500",
  pending: "bg-red-900/40",
  blocked: "bg-zinc-500",
  hit: "bg-green-500",
};

export function RoundCounter({ current, total, results }: RoundCounterProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-red-400/60 mr-1">
        Round {current}/{total}
      </span>
      {results.map((r, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full ${RESULT_COLORS[r] || RESULT_COLORS.pending} ${
            i === current - 1 ? "ring-1 ring-red-400" : ""
          }`}
        />
      ))}
    </div>
  );
}
