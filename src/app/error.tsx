"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="text-2xl font-bold text-fab-text mb-2">Something went wrong</h2>
      <p className="text-fab-muted mb-6 max-w-md">
        An unexpected error occurred. This has been noted — try refreshing the page.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-fab-gold text-fab-bg font-semibold rounded-lg hover:bg-fab-gold-light transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
