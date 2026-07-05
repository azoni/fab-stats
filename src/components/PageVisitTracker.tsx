"use client";

import { useEffect } from "react";
import { logToEcosystem } from "@/lib/mcp-webhook";
import { getDailyPageViewTrend } from "@/lib/analytics";

export function PageVisitTracker() {
  useEffect(() => {
    if (!sessionStorage.getItem("_av")) {
      sessionStorage.setItem("_av", "1");
      // Portfolio traffic beacon — one visit/session to the shared leaderboard sink,
      // via a same-origin proxy (strict CSP blocks a direct cross-origin post).
      fetch("/.netlify/functions/log-visit", { method: "POST" }).catch(() => {});

      // Send today's page view total as a summary event
      getDailyPageViewTrend(1)
        .then(([today]) => {
          if (today && today.total > 0) {
            logToEcosystem("page_view_summary", `${today.total} page views today`, `date:${today.date}`);
          }
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
