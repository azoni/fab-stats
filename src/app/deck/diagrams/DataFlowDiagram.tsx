"use client";

import { motion } from "framer-motion";

const STEPS = [
  { label: "Game Play", sub: "User completes puzzle", icon: "🎮" },
  { label: "localStorage", sub: "State persisted", icon: "💾" },
  { label: "Firestore", sub: "Results + picks written", icon: "🔥" },
  { label: "Aggregation", sub: "Uniqueness scoring", icon: "📊" },
  { label: "Leaderboard", sub: "Rankings updated", icon: "🏆" },
  { label: "Public Stats", sub: "Profile data", icon: "👤" },
  { label: "OG Image", sub: "Social card generated", icon: "🖼️" },
];

function FlowArrow({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="hidden items-center lg:flex"
      style={{ originX: 0 }}
    >
      <div className="h-px w-8 bg-fab-gold/60" />
      <div className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-fab-gold/60" />
    </motion.div>
  );
}

export function DataFlowDiagram() {
  return (
    <div className="rounded-xl border border-fab-border bg-fab-surface/30 p-8">
      {/* Desktop: horizontal flow */}
      <div className="hidden items-center justify-center gap-1 lg:flex">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.4 }}
              className="flex w-28 flex-col items-center rounded-lg border border-fab-border bg-fab-surface p-3 text-center transition-colors"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.3, type: "spring" }}
                className="mb-1 text-xl"
              >
                {step.icon}
              </motion.div>
              <span className="text-xs font-semibold text-fab-text">
                {step.label}
              </span>
              <span className="mt-0.5 text-[10px] text-fab-dim">{step.sub}</span>
            </motion.div>
            {i < STEPS.length - 1 && <FlowArrow delay={0.4 + i * 0.15} />}
          </div>
        ))}
      </div>

      {/* Mobile: vertical flow */}
      <div className="flex flex-col items-center gap-3 lg:hidden">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.4 }}
              className="flex w-56 items-center gap-3 rounded-lg border border-fab-border bg-fab-surface p-3"
            >
              <span className="text-xl">{step.icon}</span>
              <div>
                <span className="text-sm font-semibold text-fab-text">
                  {step.label}
                </span>
                <span className="block text-xs text-fab-dim">{step.sub}</span>
              </div>
            </motion.div>
            {i < STEPS.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.12 }}
                className="text-fab-gold/60"
              >
                ↓
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Animated progress indicator */}
      <motion.div
        className="mx-auto mt-6 h-1 rounded-full bg-fab-gold/20"
        style={{ width: "80%" }}
      >
        <motion.div
          className="h-full rounded-full bg-fab-gold"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ delay: 1.5, duration: 2, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
