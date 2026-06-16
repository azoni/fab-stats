"use client";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label included in the console error for debugging. */
  label?: string;
}

/**
 * Generic React error boundary. Contains a render-time throw so it degrades to a
 * fallback instead of unmounting the whole app (white screen). The thrown error
 * is logged to the console with `label` so the real cause is still discoverable.
 */
export class ErrorBoundary extends Component<Props, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-4 text-sm text-fab-muted text-center">Something went wrong rendering this.</div>
        )
      );
    }
    return this.props.children;
  }
}
