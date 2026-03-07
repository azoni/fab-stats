"use client";
import { Toaster } from "sonner";

export function SonnerProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        className:
          "!bg-fab-surface !border !border-fab-border !text-fab-text !shadow-xl",
        descriptionClassName: "!text-fab-muted",
        style: {
          "--normal-bg": "var(--color-fab-surface)",
          "--normal-border": "var(--color-fab-border)",
          "--normal-text": "var(--color-fab-text)",
          "--success-bg": "var(--color-fab-surface)",
          "--success-border": "rgba(74, 222, 128, 0.3)",
          "--success-text": "var(--color-fab-win)",
          "--error-bg": "var(--color-fab-surface)",
          "--error-border": "rgba(248, 113, 113, 0.3)",
          "--error-text": "var(--color-fab-loss)",
        } as React.CSSProperties,
      }}
    />
  );
}
