"use client";
/**
 * Small speaker button that flips the shared game-SFX flag (sound + haptics).
 * OFF by default; the state persists per device. Drop it in the games nav.
 */
import { Volume2, VolumeX } from "lucide-react";
import { useGameFx } from "./gameFx";

export function SoundToggle({ className = "" }: { className?: string }) {
  const { enabled, setEnabled, play } = useGameFx();
  return (
    <button
      type="button"
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        if (next) play("correct"); // audible confirmation when turning it on
      }}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute game sound & haptics" : "Enable game sound & haptics"}
      title={enabled ? "Sound & haptics on" : "Sound & haptics off"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
        enabled
          ? "border-fab-gold/40 bg-fab-gold/10 text-fab-gold hover:bg-fab-gold/20"
          : "border-fab-border/70 bg-fab-bg/50 text-fab-dim hover:text-fab-text"
      } ${className}`}
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
