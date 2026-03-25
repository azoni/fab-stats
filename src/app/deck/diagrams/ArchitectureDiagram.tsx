"use client";

import { motion } from "framer-motion";

interface BoxProps {
  label: string;
  sub?: string;
  delay: number;
  accent?: boolean;
  className?: string;
}

function Box({ label, sub, delay, accent, className = "" }: BoxProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={`flex flex-col items-center justify-center rounded-lg border px-4 py-3 text-center ${
        accent
          ? "border-fab-gold bg-fab-gold/10 text-fab-gold"
          : "border-fab-border bg-fab-surface text-fab-text"
      } ${className}`}
    >
      <span className="text-sm font-semibold">{label}</span>
      {sub && <span className="mt-0.5 text-xs text-fab-dim">{sub}</span>}
    </motion.div>
  );
}

function Arrow({
  delay,
  direction = "right",
  label,
}: {
  delay: number;
  direction?: "right" | "down" | "left" | "bidirectional";
  label?: string;
}) {
  const arrows = {
    right: "→",
    down: "↓",
    left: "←",
    bidirectional: "↔",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="flex flex-col items-center justify-center gap-0.5"
    >
      <span className="text-lg text-fab-gold">{arrows[direction]}</span>
      {label && (
        <span className="text-[10px] text-fab-dim">{label}</span>
      )}
    </motion.div>
  );
}

export function ArchitectureDiagram() {
  return (
    <div className="flex flex-col items-center gap-8 rounded-xl border border-fab-border bg-fab-surface/30 p-8">
      {/* Row 1: Extension → GEM */}
      <div className="flex items-center gap-4">
        <Box label="Browser Extension" sub="Manifest V3" delay={0.1} accent />
        <Arrow delay={0.3} direction="right" label="scrape" />
        <Box label="GEM Platform" sub="Tournament Data" delay={0.2} />
      </div>

      {/* Connector down from extension */}
      <Arrow delay={0.5} direction="down" label="import" />

      {/* Row 2: Main app architecture */}
      <div className="flex items-center gap-4">
        <Box label="Next.js 16" sub="Static Export" delay={0.4} accent />
        <Arrow delay={0.6} direction="right" label="deploy" />
        <Box label="Netlify CDN" sub="Global Edge" delay={0.5} accent />
      </div>

      {/* Row 3: Client ↔ Firebase */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <Box label="Client App" sub="React 19" delay={0.7} />
          <Arrow delay={0.9} direction="bidirectional" label="read/write" />
          <Box label="Firebase Auth" sub="Google OAuth" delay={0.8} accent />
          <span className="text-fab-dim">+</span>
          <Box label="Firestore" sub="NoSQL Database" delay={0.85} accent />
        </div>
      </div>

      {/* Row 4: Serverless */}
      <div className="flex items-center gap-4">
        <Box label="Edge Functions" sub="Netlify" delay={1.0} />
        <Arrow delay={1.15} direction="right" label="generate" />
        <Box label="OG Images" sub="satori + resvg-js" delay={1.1} />
        <Arrow delay={1.25} direction="left" label="fetch stats" />
        <Box label="Leaderboard" sub="Public Stats" delay={1.2} />
      </div>

      {/* Animated pulse dots */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-fab-gold"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
