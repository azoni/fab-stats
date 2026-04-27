"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Trophy, Clipboard, FileSpreadsheet, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}

export function ShareSheet({ open, onClose, isAuthenticated }: ShareSheetProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleShareEvent = () => {
    onClose();
    router.push("/share");
  };

  const handleImport = () => {
    onClose();
    router.push("/import");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share recent event"
      className="md:hidden fixed inset-0 z-[60] flex flex-col bg-fab-bg pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-fab-border">
        <h2 className="text-base font-semibold text-fab-text">Share or import</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-md text-fab-muted hover:text-fab-text hover:bg-fab-surface-hover min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!isAuthenticated ? (
          <div className="bg-fab-gold/10 border border-fab-gold/30 rounded-lg p-4">
            <h3 className="text-fab-gold font-semibold mb-1">Sign in to share your event</h3>
            <p className="text-fab-muted text-sm mb-4">
              Track your tournament results and generate shareable recap cards. Free, takes 30 seconds.
            </p>
            <Link
              href="/login"
              onClick={onClose}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors min-h-[44px]"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <SheetOption
              icon={<Trophy className="w-5 h-5 text-fab-gold" />}
              title="Share recent event"
              description="Paste your latest tournament from GEM and get a shareable recap"
              onClick={handleShareEvent}
              primary
            />
            <SheetOption
              icon={<Clipboard className="w-5 h-5 text-fab-muted" />}
              title="Paste from clipboard"
              description="Copy from GEM History page → paste here"
              onClick={handleShareEvent}
            />
            <SheetOption
              icon={<FileSpreadsheet className="w-5 h-5 text-fab-muted" />}
              title="Import from CSV"
              description="Bulk import multiple events"
              onClick={handleImport}
            />
            <SheetOption
              icon={<Plus className="w-5 h-5 text-fab-muted" />}
              title="Single match entry"
              description="Manually log one match"
              onClick={handleImport}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface SheetOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}

function SheetOption({ icon, title, description, onClick, primary }: SheetOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-colors min-h-[64px] ${
        primary
          ? "bg-fab-gold/10 border-fab-gold/30 hover:bg-fab-gold/15"
          : "bg-fab-surface border-fab-border hover:bg-fab-surface-hover hover:border-fab-muted"
      }`}
    >
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-semibold ${primary ? "text-fab-gold" : "text-fab-text"}`}>{title}</span>
        <span className="block text-xs text-fab-muted mt-0.5">{description}</span>
      </span>
    </button>
  );
}
