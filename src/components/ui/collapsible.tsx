"use client";
import { useState } from "react";
import * as RadixCollapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";

interface CollapsibleProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function Collapsible({ title, children, defaultOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <RadixCollapsible.Root open={open} onOpenChange={setOpen}>
      <RadixCollapsible.Trigger className="flex items-center justify-between w-full text-left">
        {title}
        <ChevronDown
          className={`w-4 h-4 text-fab-dim transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </RadixCollapsible.Trigger>
      <RadixCollapsible.Content forceMount asChild>
        <div
          className="overflow-hidden transition-[grid-template-rows,opacity] duration-200 grid"
          style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
        >
          <div className="min-h-0">
            {children}
          </div>
        </div>
      </RadixCollapsible.Content>
    </RadixCollapsible.Root>
  );
}
