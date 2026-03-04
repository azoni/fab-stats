"use client";
import { useState } from "react";
import { getHeroByName } from "@/lib/heroes";
import type { MatchupRound } from "@/lib/matchupmania/types";

function HeroSide({
  heroName,
  winRate,
  revealed,
  picked,
  isWinner,
  onClick,
}: {
  heroName: string;
  winRate: number;
  revealed: boolean;
  picked: boolean;
  isWinner: boolean;
  onClick: () => void;
}) {
  const hero = getHeroByName(heroName);
  const imgSrc = hero?.imageUrl || "";

  return (
    <button
      onClick={onClick}
      disabled={revealed}
      className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
        revealed
          ? isWinner
            ? "border-fab-win/50 bg-fab-win/10"
            : "border-fab-border bg-fab-surface/50 opacity-60"
          : picked
            ? "border-fab-gold/50 bg-fab-gold/10"
            : "border-fab-border bg-fab-surface hover:border-fab-gold/30 hover:bg-fab-gold/5 cursor-pointer"
      }`}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt={heroName}
          className="w-14 h-14 rounded-full object-cover border border-fab-border"
        />
      )}
      <p className="text-sm font-bold text-fab-text text-center leading-tight">{heroName}</p>
      {revealed && (
        <p className={`text-lg font-bold ${isWinner ? "text-fab-win" : "text-fab-loss"}`}>
          {winRate}%
        </p>
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
    <div className="flex gap-3 items-stretch">
      <HeroSide
        heroName={round.hero1}
        winRate={round.hero1WinRate}
        revealed={revealed}
        picked={round.picked === round.hero1}
        isWinner={round.hero1 === winner}
        onClick={() => onPick(round.hero1)}
      />
      <div className="flex items-center">
        <span className="text-fab-dim text-xs font-bold">VS</span>
      </div>
      <HeroSide
        heroName={round.hero2}
        winRate={round.hero2WinRate}
        revealed={revealed}
        picked={round.picked === round.hero2}
        isWinner={round.hero2 === winner}
        onClick={() => onPick(round.hero2)}
      />
    </div>
  );
}

export function RoundProgress({
  rounds,
  currentRound,
  totalRounds,
}: {
  rounds: MatchupRound[];
  currentRound: number;
  totalRounds: number;
}) {
  return (
    <div className="flex gap-1 justify-center">
      {Array.from({ length: totalRounds }).map((_, i) => {
        const round = rounds[i];
        let color = "bg-fab-border";
        if (round?.correct === true) color = "bg-fab-win";
        else if (round?.correct === false) color = "bg-fab-loss";
        else if (i === currentRound) color = "bg-fab-gold";

        return <div key={i} className={`w-5 h-2 rounded-full ${color} transition-colors`} />;
      })}
    </div>
  );
}
