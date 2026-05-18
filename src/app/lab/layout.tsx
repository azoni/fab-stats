"use client";

/**
 * /lab — internal KG-platform console.
 *
 * Admin-gated (RequireAdmin): not reachable by the public. Non-admins are
 * redirected home and the gated tree never hydrates/fetches for them — which
 * also keeps the heavier endpoints (e.g. /api/kg-search's in-function model)
 * off the public request path.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

const TABS = [
  { href: "/lab", label: "Overview" },
  { href: "/lab/graph", label: "Graph" },
  { href: "/lab/search", label: "Semantic Search" },
  { href: "/lab/content", label: "Generated Content" },
  { href: "/lab/seo", label: "SEO Audit" },
];

export default function LabLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <RequireAdmin>
    <div className="space-y-4">
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
        Internal KG-platform console — admin-only, not player-facing. Branch-only
        (feature/kg-content-platform).
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
        {TABS.map((t) => {
          const active =
            t.href === "/lab" ? pathname === "/lab" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-fab-gold text-black"
                  : "text-fab-dim hover:bg-white/5 hover:text-fab-text"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </div>
    </RequireAdmin>
  );
}
