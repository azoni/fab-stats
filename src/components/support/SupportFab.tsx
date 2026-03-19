"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackSupportClick } from "@/lib/analytics";
import { Heart } from "lucide-react";

export function SupportFab() {
  const pathname = usePathname();
  if (pathname === "/support") return null;

  return (
    <Link
      href="/support"
      onClick={() => trackSupportClick("fab")}
      className="fixed right-36 bottom-6 z-40 hidden md:flex items-center gap-2 px-4 py-2.5 rounded-full bg-pink-500 text-white font-semibold text-sm shadow-lg hover:bg-pink-400 transition-all hover:scale-105 active:scale-95"
      title="Support FaB Stats"
    >
      <Heart className="w-4 h-4 fill-current" />
      Support
    </Link>
  );
}
