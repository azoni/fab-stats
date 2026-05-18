/**
 * JSON-LD generators — turn fab-stats entities into schema.org-compliant
 * structured data. Same generators are used inline in page <head> tags AND
 * served from the public /api/jsonld/[entity]/[id] endpoint.
 *
 * Validate any output with:
 *   - https://search.google.com/test/rich-results
 *   - https://validator.schema.org
 */
import {
  EntityType,
  SCHEMA_ORG_TYPE,
  entityUri,
  entityUrl,
} from "./ontology";

const SCHEMA_CONTEXT = "https://schema.org";

/** Common shape for any JSON-LD object. */
export type JsonLd = Record<string, unknown> & {
  "@context"?: string | Record<string, string>;
  "@type": string;
  "@id"?: string;
};

/** Wrap any entity in the schema.org @context (used at the top of a JSON-LD payload). */
export function withContext(obj: JsonLd): JsonLd {
  return { ...obj, "@context": SCHEMA_CONTEXT };
}

// ── Entity generators ──

export interface PlayerJsonLdInput {
  id: string;                  // userId
  username: string;
  displayName: string;
  photoUrl?: string | null;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    fabrary?: string;
    metafy?: string;
  };
  teamId?: string | null;
  teamName?: string | null;
}

export function playerJsonLd(p: PlayerJsonLdInput): JsonLd {
  const sameAs: string[] = [];
  if (p.socialLinks?.twitter)  sameAs.push(`https://twitter.com/${p.socialLinks.twitter}`);
  if (p.socialLinks?.fabrary)  sameAs.push(`https://fabrary.net/users/${p.socialLinks.fabrary}`);
  if (p.socialLinks?.metafy)   sameAs.push(p.socialLinks.metafy);

  const obj: JsonLd = {
    "@type": SCHEMA_ORG_TYPE.Player,         // "Person"
    "@id": entityUri("Player", p.id),
    name: p.displayName || p.username,
    alternateName: p.username,
    identifier: p.username,
    url: entityUrl("Player", p.id),
  };
  if (p.photoUrl) obj.image = p.photoUrl;
  if (sameAs.length) obj.sameAs = sameAs;
  if (p.teamId && p.teamName) {
    obj.memberOf = {
      "@type": SCHEMA_ORG_TYPE.Team,         // "SportsTeam"
      "@id": entityUri("Team", p.teamId),
      name: p.teamName,
      url: entityUrl("Team", p.teamId),
    };
  }
  return obj;
}

export interface HeroJsonLdInput {
  name: string;
  imageUrl?: string;
  classes?: string[];
  talents?: string[];
}

export function heroJsonLd(h: HeroJsonLdInput): JsonLd {
  return {
    "@type": SCHEMA_ORG_TYPE.Hero,           // "Thing"
    "@id": entityUri("Hero", h.name),
    additionalType: "https://www.fabstats.net/ontology#Hero",
    name: h.name,
    url: entityUrl("Hero", h.name),
    ...(h.imageUrl ? { image: h.imageUrl } : {}),
    ...(h.classes?.length ? { keywords: [...h.classes, ...(h.talents ?? [])].join(", ") } : {}),
  };
}

export interface EventJsonLdInput {
  id: string;
  name: string;
  date: string;             // ISO YYYY-MM-DD
  format?: string;
  eventType?: string;
  venue?: string;
  competitorIds?: string[]; // optional: top players for `competitor`
}

export function eventJsonLd(e: EventJsonLdInput): JsonLd {
  const obj: JsonLd = {
    "@type": SCHEMA_ORG_TYPE.Event,          // "SportsEvent"
    "@id": entityUri("Event", e.id),
    name: e.name,
    startDate: e.date,
    url: entityUrl("Event", e.id),
    sport: "Flesh and Blood TCG",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };
  if (e.format)    obj.about = { "@type": "Thing", name: `${e.format}${e.eventType ? " " + e.eventType : ""}` };
  if (e.venue) {
    obj.location = {
      "@type": SCHEMA_ORG_TYPE.Venue,        // "Place"
      "@id": entityUri("Venue", e.venue),
      name: e.venue,
    };
  }
  if (e.competitorIds?.length) {
    obj.competitor = e.competitorIds.map((pid) => ({
      "@type": SCHEMA_ORG_TYPE.Player,       // "Person"
      "@id": entityUri("Player", pid),
      url: entityUrl("Player", pid),
    }));
  }
  return obj;
}

export interface ArticleJsonLdInput {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string;
  author: { id: string; displayName: string; username: string };
  publishedAt: string;       // ISO datetime
  updatedAt?: string;
  heroTags?: string[];       // hero names mentioned
  mentionedPlayerIds?: string[];
  mentionedEventIds?: string[];
}

export function articleJsonLd(a: ArticleJsonLdInput): JsonLd {
  const mentions: JsonLd[] = [];
  if (a.heroTags) {
    for (const hero of a.heroTags) {
      mentions.push({
        "@type": SCHEMA_ORG_TYPE.Hero,
        "@id": entityUri("Hero", hero),
        name: hero,
        url: entityUrl("Hero", hero),
      });
    }
  }
  if (a.mentionedPlayerIds) {
    for (const pid of a.mentionedPlayerIds) {
      mentions.push({
        "@type": SCHEMA_ORG_TYPE.Player,
        "@id": entityUri("Player", pid),
        url: entityUrl("Player", pid),
      });
    }
  }
  if (a.mentionedEventIds) {
    for (const eid of a.mentionedEventIds) {
      mentions.push({
        "@type": SCHEMA_ORG_TYPE.Event,
        "@id": entityUri("Event", eid),
        url: entityUrl("Event", eid),
      });
    }
  }

  return {
    "@type": SCHEMA_ORG_TYPE.Article,        // "Article"
    "@id": entityUri("Article", a.slug),
    headline: a.title,
    description: a.excerpt,
    url: entityUrl("Article", a.slug),
    datePublished: a.publishedAt,
    ...(a.updatedAt ? { dateModified: a.updatedAt } : {}),
    ...(a.coverImageUrl ? { image: a.coverImageUrl } : {}),
    author: {
      "@type": SCHEMA_ORG_TYPE.Player,       // "Person"
      "@id": entityUri("Player", a.author.id),
      name: a.author.displayName || a.author.username,
      url: entityUrl("Player", a.author.id),
    },
    publisher: {
      "@type": "Organization",
      name: "fab-stats",
      url: "https://www.fabstats.net",
      logo: {
        "@type": "ImageObject",
        url: "https://www.fabstats.net/icon-192.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": entityUrl("Article", a.slug),
    },
    ...(mentions.length ? { mentions } : {}),
  };
}

export interface TeamJsonLdInput {
  id: string;
  name: string;
  iconUrl?: string;
  description?: string;
  memberCount?: number;
}

export function teamJsonLd(t: TeamJsonLdInput): JsonLd {
  return {
    "@type": SCHEMA_ORG_TYPE.Team,           // "SportsTeam"
    "@id": entityUri("Team", t.id),
    name: t.name,
    url: entityUrl("Team", t.id),
    sport: "Flesh and Blood TCG",
    ...(t.iconUrl ? { logo: t.iconUrl, image: t.iconUrl } : {}),
    ...(t.description ? { description: t.description } : {}),
    ...(typeof t.memberCount === "number" ? { numberOfEmployees: t.memberCount } : {}),
  };
}

// ── Site-level schemas ──

/**
 * Site-wide WebSite + SearchAction. Embed once in the root layout. Earns the
 * SERP "sitelinks search box" feature.
 */
export function websiteJsonLd(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": "https://www.fabstats.net/#website",
    name: "fab-stats",
    url: "https://www.fabstats.net",
    description: "Flesh and Blood TCG community stats, leaderboards, and daily minigames.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.fabstats.net/discover?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ── Convenience: dispatcher used by the JSON-LD endpoint ──

export type EntityInput =
  | { type: "Player"; data: PlayerJsonLdInput }
  | { type: "Hero"; data: HeroJsonLdInput }
  | { type: "Event"; data: EventJsonLdInput }
  | { type: "Article"; data: ArticleJsonLdInput }
  | { type: "Team"; data: TeamJsonLdInput };

export function entityJsonLd(input: EntityInput): JsonLd {
  switch (input.type) {
    case "Player":  return playerJsonLd(input.data);
    case "Hero":    return heroJsonLd(input.data);
    case "Event":   return eventJsonLd(input.data);
    case "Article": return articleJsonLd(input.data);
    case "Team":    return teamJsonLd(input.data);
  }
}

/** Render a JSON-LD object for inline embedding in a page <head>. */
export function renderJsonLdScript(json: JsonLd | JsonLd[]): string {
  const wrapped = Array.isArray(json)
    ? json.map((j) => (j["@context"] ? j : withContext(j)))
    : json["@context"] ? json : withContext(json);
  // No HTML-escape needed for valid JSON; "</script>" sequences shouldn't appear.
  // Defensive: replace "</" -> "<\\/" anyway.
  return JSON.stringify(wrapped).replace(/<\//g, "<\\/");
}

/**
 * Suppress the EntityType / EntityType-related lint warnings about exporting
 * an unused symbol — we re-export entityUri here so callers only need one
 * import.
 */
export { entityUri, entityUrl };
export type { EntityType };
