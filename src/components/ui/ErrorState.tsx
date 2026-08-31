"use client";

/**
 * Retryable load-failure state. Data pages used to swallow Firestore errors
 * into empty states ("No matches yet" for a user with 2,000 matches, zeroed
 * community stats presented as fact) — render this instead when a load FAILED,
 * and keep empty states for genuinely empty data.
 */
import { CloudOff } from "lucide-react";

export function ErrorState({
  title = "Couldn't load this",
  detail = "Something went wrong talking to the server. Your data is fine — this is a loading problem, not a data problem.",
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="py-14 text-center">
      <CloudOff className="mx-auto mb-3 h-10 w-10 text-fab-dim" />
      <p className="mb-1 text-base font-semibold text-fab-text">{title}</p>
      <p className="mx-auto mb-4 max-w-sm text-sm text-fab-muted">{detail}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-fab-gold px-5 text-sm font-semibold text-fab-bg transition-colors hover:bg-fab-gold-light"
        >
          Retry
        </button>
      )}
    </div>
  );
}
