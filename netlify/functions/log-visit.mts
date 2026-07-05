// Same-origin proxy for the portfolio traffic beacon.
// The site's CSP restricts connect-src, so the client can't POST cross-origin
// to azoni.ai directly. It hits this function (same origin) instead, which
// forwards a single visit to the shared leaderboard sink server-side.

export default async function handler(_req: Request) {
  try {
    await fetch("https://azoni.ai/.netlify/functions/log-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "fabstats" }),
    });
  } catch {
    // best-effort; a dropped visit ping should never surface to the user
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
