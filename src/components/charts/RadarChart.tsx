"use client";

import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface RadarDataPoint {
  axis: string;
  v1: number;
  v2?: number;
  max: number;
}

interface FabRadarChartProps {
  data: RadarDataPoint[];
  p1Label?: string;
  p2Label?: string;
  size?: number;
  className?: string;
}

export function FabRadarChart({
  data,
  p1Label = "Player 1",
  p2Label = "Player 2",
  size = 280,
  className = "",
}: FabRadarChartProps) {
  // Normalize values to 0-100 scale
  const normalized = data.map((d) => ({
    axis: d.axis,
    v1: d.max > 0 ? (d.v1 / d.max) * 100 : 0,
    v2: d.v2 != null && d.max > 0 ? (d.v2 / d.max) * 100 : undefined,
  }));

  const hasP2 = normalized.some((d) => d.v2 != null);

  return (
    <div className={`w-full ${className}`} style={{ maxWidth: size }}>
      <ResponsiveContainer width="100%" height={size}>
        <RechartsRadar data={normalized} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="var(--color-fab-border)" strokeOpacity={0.5} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--color-fab-muted)", fontSize: 11 }}
          />
          <Radar
            name={p1Label}
            dataKey="v1"
            stroke="var(--color-fab-gold)"
            fill="var(--color-fab-gold)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          {hasP2 && (
            <Radar
              name={p2Label}
              dataKey="v2"
              stroke="var(--color-fab-loss)"
              fill="var(--color-fab-loss)"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          )}
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
