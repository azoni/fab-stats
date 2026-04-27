import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold-outline";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-fab-gold text-fab-bg hover:bg-fab-gold-light active:bg-fab-gold-light disabled:bg-fab-gold/40 disabled:text-fab-bg/60",
  secondary:
    "bg-fab-surface border border-fab-border text-fab-text hover:bg-fab-surface-hover hover:border-fab-muted disabled:opacity-50",
  ghost:
    "text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover disabled:opacity-50",
  danger:
    "bg-fab-red text-fab-text hover:bg-fab-red-light active:bg-fab-red-light disabled:opacity-50",
  "gold-outline":
    "border border-fab-gold/40 text-fab-gold hover:bg-fab-gold/10 hover:border-fab-gold disabled:opacity-50",
};

const sizeClass: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm min-h-[40px]",
  lg: "px-5 py-2.5 text-base min-h-[44px]",
};

const iconOnlyClass: Record<Size, string> = {
  sm: "p-1.5 min-w-[28px] min-h-[28px]",
  md: "p-2 min-w-[40px] min-h-[40px]",
  lg: "p-2.5 min-w-[44px] min-h-[44px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconOnly?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    iconOnly = false,
    leftIcon,
    rightIcon,
    className = "",
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2",
        "rounded-md font-semibold transition-colors",
        "disabled:cursor-not-allowed",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-fab-gold/60",
        iconOnly ? iconOnlyClass[size] : sizeClass[size],
        variantClass[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});
