/**
 * Fire-and-forget: log an event to the azoni ecosystem activity map.
 * Calls the local API route which proxies to the MCP server.
 */
export function logToEcosystem(type: string, title: string, description?: string) {
  try {
    fetch("/api/ecosystem-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, description }),
    }).catch(() => {});
  } catch {
    // Fire and forget
  }
}
