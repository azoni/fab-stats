import type { HTMLAttributes, ReactNode } from "react";

type Variant = "default" | "gold" | "win" | "loss" | "muted" | "danger";
type Size = "xs" | "sm" | "md";

const variantClass: Record<Variant, string> = {
  default: "bg-fab-surface border border-fab-border text-fab-text",
  gold: "bg-fab-gold/15 border border-fab-gold/30 text-fab-gold",
  win: "bg-fab-win/15 border border-fab-win/30 text-fab-win",
  loss: "bg-fab-loss/15 border border-fab-loss/30 text-fab-loss",
  muted: "bg-fab-bg border border-fab-border text-fab-dim",
  danger: "bg-fab-red/20 border border-fab-red/40 text-fab-loss",
};

const sizeClass: Record<Size, string> = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Badge({
  variant = "default",
  size = "sm",
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md font-medium whitespace-nowrap",
        sizeClass[size],
        variantClass[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}
