function clampString(value: unknown, fallback: string, maxLen = 180) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return fallback;
  return v.slice(0, maxLen);
}

/**
 * Fire-and-forget: log an event to the azoni ecosystem activity map.
 * Posts to local /api/ecosystem-log which forwards to MCP.
 */
export function logToEcosystem(type: string, title: string, description?: string) {
  const safeType = clampString(type, "fabstats_activity", 64);
  const safeTitle = clampString(title, "Activity", 120);
  const safeDescription = clampString(description, "", 500);

  fetch("/api/ecosystem-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: safeType, title: safeTitle, description: safeDescription }),
  }).catch(() => {});
}
