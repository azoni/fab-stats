"use client";
import { getHeroByName, getHeroPortraitUrl } from "@/lib/heroes";
import { CountUp } from "@/components/games/fx";
import type { MatchupRound } from "@/lib/matchupmania/types";

function HeroSide({
  heroName,
  winRate,
  revealed,
  picked,
  isWinner,
  entranceDelayMs,
  onClick,
}: {
  heroName: string;
  winRate: number;
  revealed: boolean;
  picked: boolean;
  isWinner: boolean;
  entranceDelayMs: number;
  onClick: () => void;
}) {
  const hero = getHeroByName(heroName);
  const imgSrc = getHeroPortraitUrl(heroName) || hero?.imageUrl || "";
  // Reveal beats: the winner pulses gold, a wrong pick shakes. The entrance class
  // must be DROPPED at reveal time — game-rise is declared later in globals.css, so
  // stacked on one element it would win the cascade and swallow both reveal beats.
  const anim = revealed ? (isWinner ? "game-match-pop" : picked ? "game-shake" : "") : "game-rise";

  return (
    <button
      onClick={onClick}
      disabled={revealed}
      className={`${anim} flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
        revealed
          ? isWinner
            ? "border-fab-win/60 bg-fab-win/10"
            : "border-fab-border bg-fab-surface/50 opacity-60"
          : picked
            ? "border-fab-gold/50 bg-fab-gold/10"
            : "border-fab-border bg-fab-surface hover:border-fab-gold/30 hover:bg-fab-gold/5 cursor-pointer active:scale-[0.98]"
      }`}
      style={{ animationDelay: `${entranceDelayMs}ms` }}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt={heroName}
          className={`w-20 h-20 rounded-full object-cover object-top border transition-all ${
            revealed && isWinner ? "border-fab-gold ring-2 ring-fab-gold/50" : "border-fab-border"
          }`}
        />
      )}
      <p className="text-sm font-bold text-fab-text text-center leading-tight">{heroName}</p>
      {revealed ? (
        <p className={`text-xl font-black tabular-nums ${isWinner ? "text-fab-win" : "text-fab-loss"}`}>
          <CountUp value={winRate} decimals={1} suffix="%" duration={600} />
        </p>
      ) : (
        <p className="text-xl font-black text-fab-dim/40">?</p>
      )}
    </button>
  );
}

export function MatchupCard({
  round,
  onPick,
}: {
  round: MatchupRound;
  onPick: (hero: string) => void;
}) {
  const revealed = round.picked !== undefined;
  const winner = round.hero1WinRate >= round.hero2WinRate ? round.hero1 : round.hero2;

  return (
    <div>
      <div className="flex gap-3 items-stretch">
        <HeroSide
          heroName={round.hero1}
          winRate={round.hero1WinRate}
          revealed={revealed}
          picked={round.picked === round.hero1}
          isWinner={round.hero1 === winner}
          entranceDelayMs={0}
          onClick={() => onPick(round.hero1)}
        />
        <div className="flex items-center">
          <span className="game-pop rounded-full border border-fab-gold/40 bg-fab-gold/10 px-2 py-1 text-xs font-black text-fab-gold" style={{ animationDelay: "180ms" }}>
            VS
          </span>
        </div>
        <HeroSide
          heroName={round.hero2}
          winRate={round.hero2WinRate}
          revealed={revealed}
          picked={round.picked === round.hero2}
          isWinner={round.hero2 === winner}
          entranceDelayMs={100}
          onClick={() => onPick(round.hero2)}
        />
      </div>
      {/* The game's unique hook: these are REAL community numbers. */}
      {revealed && round.totalGames > 0 && (
        <p className="game-rise mt-2 text-center text-[10px] text-fab-dim">
          From {round.totalGames} community games
        </p>
      )}
    </div>
  );
}

export function RoundProgress({
  rounds,
  currentRound,
  totalRounds,
  justResolved = null,
}: {
  rounds: MatchupRound[];
  currentRound: number;
  totalRounds: number;
  /** Index of the round that just resolved (during the reveal hold) — its pill pops. */
  justResolved?: number | null;
}) {
  return (
    <div className="flex gap-1 justify-center">
      {Array.from({ length: totalRounds }).map((_, i) => {
        const round = rounds[i];
        let color = "bg-fab-border";
        if (round?.correct === true) color = "bg-fab-win";
        else if (round?.correct === false) color = "bg-fab-loss";
        else if (i === currentRound) color = "bg-fab-gold";

        return (
          <div
            key={i}
            className={`w-5 h-2 rounded-full ${color} transition-colors ${i === justResolved ? "game-pop" : ""}`}
          />
        );
      })}
    </div>
  );
}
