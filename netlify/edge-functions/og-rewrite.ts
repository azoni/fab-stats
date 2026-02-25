export default async function handler(
  request: Request,
  context: { next: () => Promise<Response> }
) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  // /player/username → parts = ["", "player", "username"]
  const username = decodeURIComponent(parts[2] || "");

  if (!username || username === "_") {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();

  const title = `${username}'s FaB Stats | FaB Stats`;
  const desc = `View ${username}'s Flesh and Blood match history, win rates, and tournament results on FaB Stats.`;

  // Replace OG and Twitter meta tags
  html = html.replace(
    /(<meta\s+property="og:title"\s+content=")([^"]*?)(")/,
    `$1${title}$3`
  );
  html = html.replace(
    /(<meta\s+property="og:description"\s+content=")([^"]*?)(")/,
    `$1${desc}$3`
  );
  html = html.replace(
    /(<meta\s+name="twitter:title"\s+content=")([^"]*?)(")/,
    `$1${title}$3`
  );
  html = html.replace(
    /(<meta\s+name="twitter:description"\s+content=")([^"]*?)(")/,
    `$1${desc}$3`
  );
  // Replace <title> tag
  html = html.replace(
    /(<title>)([^<]*?)(<\/title>)/,
    `$1${title}$3`
  );

  return new Response(html, {
    status: response.status,
    headers: response.headers,
  });
}

export const config = {
  path: "/player/*",
};
