"use client";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  children,
  title,
  description,
  className = "max-w-md",
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200" />
        <RadixDialog.Content
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] ${className} -translate-x-1/2 -translate-y-1/2 bg-fab-surface border border-fab-border rounded-lg p-4 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto focus:outline-none transition-all duration-200 data-[state=open]:opacity-100 data-[state=open]:scale-100 data-[state=closed]:opacity-0 data-[state=closed]:scale-95`}
        >
          <div className="flex items-center justify-between mb-4">
            <RadixDialog.Title className="text-lg font-bold text-fab-gold">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close className="text-fab-dim hover:text-fab-text transition-colors rounded-sm focus:outline-none focus:ring-1 focus:ring-fab-gold">
              <X className="w-4 h-4" />
            </RadixDialog.Close>
          </div>
          {description && (
            <RadixDialog.Description className="text-sm text-fab-muted mb-4">
              {description}
            </RadixDialog.Description>
          )}
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
