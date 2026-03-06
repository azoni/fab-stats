"use client";
import { useEffect, useState } from "react";
import "./dice.css";

interface BossChatProps {
  heroImageUrl: string;
  heroName: string;
  message: string;
  mood?: "neutral" | "taunt" | "angry" | "impressed" | "defeated";
}

const MOOD_BORDER: Record<string, string> = {
  neutral: "border-red-800/50",
  taunt: "border-amber-500/60",
  angry: "border-red-500/70",
  impressed: "border-green-500/50",
  defeated: "border-zinc-600/50",
};

const MOOD_BUBBLE: Record<string, string> = {
  neutral: "border-red-900/40",
  taunt: "border-amber-500/30",
  angry: "border-red-500/40",
  impressed: "border-green-500/30",
  defeated: "border-zinc-600/40 opacity-70",
};

export function BossChat({
  heroImageUrl,
  heroName,
  message,
  mood = "neutral",
}: BossChatProps) {
  const [msgKey, setMsgKey] = useState(0);

  useEffect(() => {
    setMsgKey((k) => k + 1);
  }, [message]);

  return (
    <div className="flex items-start gap-3">
      {/* Hero portrait */}
      <div
        className={`shrink-0 rounded-lg border-2 ${MOOD_BORDER[mood]} overflow-hidden shadow-lg shadow-red-950/40`}
      >
        <img
          src={heroImageUrl}
          alt={heroName}
          className={`w-14 h-14 object-cover ${
            mood === "defeated" ? "grayscale opacity-60" : ""
          }`}
        />
      </div>

      {/* Speech bubble */}
      <div className="relative flex-1 min-w-0">
        {/* Triangle tail pointing left */}
        <div
          className={`absolute left-0 top-3 -translate-x-full w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] ${
            mood === "angry"
              ? "border-r-red-500/40"
              : mood === "taunt"
                ? "border-r-amber-500/30"
                : "border-r-red-900/40"
          }`}
        />
        <div
          key={msgKey}
          className={`bg-[#1a0808]/90 border ${MOOD_BUBBLE[mood]} rounded-lg px-3 py-2 animate-chat-in ${
            mood === "angry" ? "animate-chat-shake" : ""
          }`}
        >
          <p className="text-[10px] text-red-400/50 font-medium mb-0.5">
            {heroName}
          </p>
          <p className="text-xs text-red-100 leading-relaxed italic">
            &ldquo;{message}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
