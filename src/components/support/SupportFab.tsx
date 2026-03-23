"use client";
import { trackSupportClick } from "@/lib/analytics";
import { Heart } from "lucide-react";

export function SupportFab() {
  return (
    <a
      href="https://www.amazon.com/?tag=oldwaystoda00-20"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackSupportClick("fab")}
      className="group fixed right-[10.5rem] bottom-6 z-40 hidden md:flex items-center gap-0 py-2.5 px-2.5 rounded-full bg-pink-500 text-white font-semibold text-sm shadow-lg hover:bg-pink-400 hover:gap-2 hover:px-4 transition-all active:scale-95"
      title="Shop on Amazon"
    >
      <Heart className="w-4 h-4 fill-current shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[4rem] transition-all duration-200">
        Amazon
      </span>
    </a>
  );
}
