"use client";
import { useState } from "react";
import * as RadixCollapsible from "@radix-ui/react-collapsible";
import { motion, AnimatePresence } from "framer-motion";
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
      <AnimatePresence initial={false}>
        {open && (
          <RadixCollapsible.Content forceMount asChild>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              {children}
            </motion.div>
          </RadixCollapsible.Content>
        )}
      </AnimatePresence>
    </RadixCollapsible.Root>
  );
}
