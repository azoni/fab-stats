interface ArticleData {
  title: string;
  excerpt: string;
  coverImageUrl: string;
  authorDisplayName: string;
  authorUsername: string;
  readingMinutes: number;
  heroTags: string[];
}

async function fetchArticle(slug: string): Promise<ArticleData | null> {
  const projectId = Deno.env.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const apiKey = Deno.env.get("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!projectId || !apiKey) return null;

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "articles" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "slug" },
                    op: "EQUAL",
                    value: { stringValue: slug },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "status" },
                    op: "EQUAL",
                    value: { stringValue: "published" },
                  },
                },
              ],
            },
          },
          limit: 1,
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]?.document?.fields) return null;

    const f = data[0].document.fields;
    const heroTags: string[] = [];
    const heroTagValues = f.heroTags?.arrayValue?.values;
    if (Array.isArray(heroTagValues)) {
      for (const v of heroTagValues) {
        if (v.stringValue) heroTags.push(v.stringValue);
      }
    }

    return {
      title: f.title?.stringValue || "",
      excerpt: f.excerpt?.stringValue || "",
      coverImageUrl: f.coverImageUrl?.stringValue || "",
      authorDisplayName: f.authorDisplayName?.stringValue || "",
      authorUsername: f.authorUsername?.stringValue || "",
      readingMinutes: Number(f.readingMinutes?.integerValue || 1),
      heroTags,
    };
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async function handler(
  request: Request,
  context: { next: () => Promise<Response> },
) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const slug = decodeURIComponent(parts[2] || "");

  if (!slug || slug === "_" || slug === "new") {
    return context.next();
  }

  let response: Response;
  try {
    response = await context.next();
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  let html: string;
  try {
    html = await response.text();
  } catch {
    return response;
  }

  try {
    const article = await fetchArticle(slug);
    if (!article) return new Response(html, { status: response.status, headers: response.headers });

    const title = escapeHtml(`${article.title} | FaB Stats`);

    const descBits: string[] = [];
    if (article.excerpt) descBits.push(article.excerpt);
    if (article.authorDisplayName) descBits.push(`by ${article.authorDisplayName}`);
    descBits.push(`${article.readingMinutes} min read`);
    const desc = escapeHtml(descBits.join(" · "));

    const ogImageUrl = `https://www.fabstats.net/og/article/${encodeURIComponent(slug)}.png`;
    const canonicalUrl = `https://www.fabstats.net/articles/${encodeURIComponent(slug)}`;

    html = html.replace(
      /(<meta\s+property="og:title"\s+content=")([^"]*?)(")/,
      `$1${title}$3`,
    );
    html = html.replace(
      /(<meta\s+property="og:description"\s+content=")([^"]*?)(")/,
      `$1${desc}$3`,
    );
    html = html.replace(
      /(<meta\s+name="twitter:title"\s+content=")([^"]*?)(")/,
      `$1${title}$3`,
    );
    html = html.replace(
      /(<meta\s+name="twitter:description"\s+content=")([^"]*?)(")/,
      `$1${desc}$3`,
    );
    html = html.replace(
      /(<title>)([^<]*?)(<\/title>)/,
      `$1${title}$3`,
    );

    if (html.includes("og:image")) {
      html = html.replace(
        /(<meta\s+property="og:image"\s+content=")([^"]*?)(")/,
        `$1${ogImageUrl}$3`,
      );
    } else {
      html = html.replace(
        "</head>",
        `<meta property="og:image" content="${ogImageUrl}"/>\n<meta property="og:image:width" content="1200"/>\n<meta property="og:image:height" content="630"/>\n</head>`,
      );
    }

    if (html.includes("twitter:image")) {
      html = html.replace(
        /(<meta\s+name="twitter:image"\s+content=")([^"]*?)(")/,
        `$1${ogImageUrl}$3`,
      );
    } else {
      html = html.replace(
        "</head>",
        `<meta name="twitter:image" content="${ogImageUrl}"/>\n</head>`,
      );
    }

    html = html.replace(
      /(<meta\s+name="twitter:card"\s+content=")([^"]*?)(")/,
      `$1summary_large_image$3`,
    );

    html = html.replace(
      /(<meta\s+property="og:url"\s+content=")([^"]*?)(")/,
      `$1${canonicalUrl}$3`,
    );
    html = html.replace(
      /(<meta\s+property="og:type"\s+content=")([^"]*?)(")/,
      `$1article$3`,
    );

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");

    return new Response(html, { status: response.status, headers });
  } catch (e) {
    console.error("og-rewrite-article edge function error:", e);
    return new Response(html, { status: response.status, headers: response.headers });
  }
}

export const config = {
  path: "/articles/*",
};
