import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

type Padding = "none" | "sm" | "md" | "lg";

const paddingClass: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  /** Adds hover styles for clickable cards */
  interactive?: boolean;
  /** Render as `<button>` instead of `<div>`. Use with `onClick` for tappable cards. */
  asButton?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = "md", interactive = false, asButton = false, className = "", children, ...rest },
  ref,
) {
  const classes = [
    "bg-fab-surface border border-fab-border rounded-lg",
    paddingClass[padding],
    interactive
      ? "transition-colors cursor-pointer hover:border-fab-muted hover:bg-fab-surface-hover"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (asButton) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        className={`${classes} text-left`}
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }

  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  );
});

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold text-fab-text ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs text-fab-dim ${className}`}>{children}</p>;
}
