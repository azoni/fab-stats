"use client";

/**
 * First-run checklist for signed-in users with zero matches. The marketing
 * home used to be all they saw after signup — a dead end (see /setup's
 * redirect comment). Every state here is already client-side: no extra reads.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Rocket } from "lucide-react";
import { playedAnyOn, getTodayDateStr } from "@/lib/games/streak";
import type { UserProfile } from "@/types";

interface StepDef {
  key: string;
  title: string;
  detail: string;
  href: string;
  done: boolean;
}

export function GettingStartedCard({ profile }: { profile: UserProfile | null }) {
  // localStorage-backed check runs post-mount (static export hydration guard).
  const [playedGame, setPlayedGame] = useState(false);
  useEffect(() => {
    setPlayedGame(playedAnyOn(getTodayDateStr()));
  }, []);

  const steps: StepDef[] = [
    {
      key: "import",
      title: "Import your matches",
      detail: "Paste your GEM history, upload a CSV, or use the browser extension — stats appear instantly.",
      href: "/import",
      done: false, // The card only renders with zero matches, so this is always the headline step.
    },
    {
      key: "gemid",
      title: "Link your GEM ID",
      detail: "Opponents' heroes auto-fill and your matches link up with other players.",
      href: "/settings",
      done: !!profile?.gemId,
    },
    {
      key: "public",
      title: "Public profile",
      detail: "Appear in the players directory and leaderboards (you can hide anytime).",
      href: "/settings",
      done: profile?.isPublic !== false,
    },
    {
      key: "game",
      title: "Play a daily game",
      detail: "FaBdoku, Hero Guesser, and friends — a new set every midnight UTC.",
      href: "/games",
      done: playedGame,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className="rounded-xl border border-fab-gold/25 bg-fab-surface/95 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-fab-gold/30 bg-fab-gold/10 text-fab-gold">
            <Rocket className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.1em] text-fab-text">Getting started</h2>
            <p className="text-xs text-fab-muted">Set up your account in a few minutes</p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-bold text-fab-gold">{doneCount}/{steps.length}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className={`group flex items-start gap-2.5 rounded-lg border p-3 transition-colors ${
              s.done
                ? "border-fab-border/60 bg-fab-bg/40 opacity-70"
                : "border-fab-border bg-fab-bg/60 hover:border-fab-gold/45"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                s.done ? "bg-fab-win/20 text-fab-win" : "border border-fab-border text-fab-dim"
              }`}
            >
              {s.done ? <Check className="h-3 w-3" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${s.done ? "text-fab-muted line-through decoration-fab-dim/50" : "text-fab-text group-hover:text-fab-gold"}`}>
                {s.title}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-fab-dim">{s.detail}</span>
            </span>
            {!s.done && <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-fab-dim group-hover:text-fab-gold" />}
          </Link>
        ))}
      </div>
    </section>
  );
}
