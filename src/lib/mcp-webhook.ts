const AZONI_FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_AZONI_FIREBASE_PROJECT_ID || "azoni-ai-7abdd";
const AZONI_FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_AZONI_FIREBASE_API_KEY || "AIzaSyCwAemduEmk58XsdvNXKa9EDphRm_xHpOQ";

function clampString(value: unknown, fallback: string, maxLen = 180) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return fallback;
  return v.slice(0, maxLen);
}

function postDirectToActivityFeed(type: string, title: string, description: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${AZONI_FIREBASE_PROJECT_ID}/databases/(default)/documents/agent_activity?key=${AZONI_FIREBASE_API_KEY}`;
  const body = {
    fields: {
      type: { stringValue: type },
      title: { stringValue: title },
      source: { stringValue: "fabstats" },
      description: { stringValue: description },
      timestamp: { timestampValue: new Date().toISOString() },
    },
  };

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Fire-and-forget: log an event to the azoni ecosystem activity map.
 * First tries local `/api/ecosystem-log` (if available), then falls back
 * to direct Firestore REST writes for static deployments.
 */
export function logToEcosystem(type: string, title: string, description?: string) {
  const safeType = clampString(type, "fabstats_activity", 64);
  const safeTitle = clampString(title, "Activity", 120);
  const safeDescription = clampString(description, "", 500);
  const payload = { type: safeType, title: safeTitle, description: safeDescription };

  try {
    fetch("/api/ecosystem-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (res.ok) return;
        return postDirectToActivityFeed(safeType, safeTitle, safeDescription).catch(() => {});
      })
      .catch(() => {
        postDirectToActivityFeed(safeType, safeTitle, safeDescription).catch(() => {});
      });
  } catch {
    postDirectToActivityFeed(safeType, safeTitle, safeDescription).catch(() => {});
  }
}
