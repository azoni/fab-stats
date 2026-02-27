"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { subscribeBanner, type BannerConfig } from "@/lib/banner";

const DISMISS_KEY = "fab-banner-dismissed";

export function SiteBanner() {
  const pathname = usePathname();
  const [banner, setBanner] = useState<BannerConfig | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    const unsub = subscribeBanner((config) => {
      setBanner(config);
      if (config?.active && config.text) {
        // Show again if banner text changed since last dismissal
        const prev = localStorage.getItem(DISMISS_KEY);
        setDismissed(prev === config.text);
      } else {
        setDismissed(true);
      }
    });
    return unsub;
  }, []);

  if (!banner || !banner.active || !banner.text || dismissed) return null;
  if (banner.scope === "home" && pathname !== "/") return null;

  const colorMap = {
    info: "bg-blue-500/10 border-blue-500/25 text-blue-300",
    warning: "bg-fab-gold/10 border-fab-gold/25 text-fab-gold",
    success: "bg-fab-win/10 border-fab-win/25 text-fab-win",
  };

  function dismiss() {
    setDismissed(true);
    if (banner) localStorage.setItem(DISMISS_KEY, banner.text);
  }

  return (
    <div className={`border rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3 ${colorMap[banner.type] || colorMap.info}`}>
      <p className="text-sm">
        {banner.text}
        {banner.link && (
          <>
            {" "}
            <a
              href={banner.link}
              target={banner.link.startsWith("http") ? "_blank" : undefined}
              rel={banner.link.startsWith("http") ? "noopener noreferrer" : undefined}
              className="underline font-medium hover:opacity-80 transition-opacity"
            >
              {banner.linkText || "Learn more"}
            </a>
          </>
        )}
      </p>
      <button
        onClick={dismiss}
        className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0 text-lg leading-none"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
