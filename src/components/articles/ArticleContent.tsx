import { ExternalLink } from "lucide-react";
import type { ArticleBlock, ArticleCalloutTone } from "@/types";

const IMAGE_WIDTH_CLASS: Record<"small" | "standard" | "wide" | "full" | "inline-left" | "inline-right", string> = {
  small: "mx-auto max-w-[260px]",
  standard: "mx-auto max-w-3xl",
  wide: "mx-auto max-w-5xl",
  full: "mx-auto max-w-none",
  "inline-left": "float-left mr-5 mb-3 w-[200px] clear-left",
  "inline-right": "float-right ml-5 mb-3 w-[200px] clear-right",
};

const GALLERY_COLUMN_CLASS: Record<2 | 3, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

const CALLOUT_CLASS: Record<ArticleCalloutTone, string> = {
  note: "border-fab-border bg-fab-surface/70",
  tip: "border-emerald-500/35 bg-emerald-500/10",
  warning: "border-amber-500/35 bg-amber-500/10",
};

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let id = "";

    if (host === "youtu.be") {
      id = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      id = parsed.searchParams.get("v") || "";
      if (!id && parsed.pathname.startsWith("/shorts/")) {
        id = parsed.pathname.split("/")[2] || "";
      }
      if (!id && parsed.pathname.startsWith("/embed/")) {
        id = parsed.pathname.split("/")[2] || "";
      }
    }

    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

function describeEmbed(url: string): {
  provider: string;
  label: string;
  href: string;
  title?: string;
  meta?: string;
} | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (host === "fabrary.net") {
      const deckSlug = parts[1] || parts[0] || "";
      return {
        provider: "Fabrary",
        label: "Deck Link",
        href: url,
        title: deckSlug ? deckSlug.replace(/[-_]+/g, " ") : undefined,
        meta: parsed.pathname,
      };
    }

    if (host === "fabtcg.com" && parts[0] === "decklists") {
      const deckSlug = parts[1] || "";
      return {
        provider: "FABTCG",
        label: "Official Decklist",
        href: url,
        title: deckSlug ? deckSlug.replace(/[-_]+/g, " ") : undefined,
        meta: parsed.pathname,
      };
    }

    return {
      provider: host.replace(/\.(com|net|gg|org)$/i, "").toUpperCase(),
      label: "External Link",
      href: url,
      meta: host,
    };
  } catch {
    return null;
  }
}

export function ArticleContent({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="space-y-5 [&>*]:clear-none">
      {blocks.map((block) => {
        if (block.type === "paragraph") {
          return (
            <p key={block.id} className="text-[15px] leading-7 text-fab-muted whitespace-pre-wrap">
              {block.text}
            </p>
          );
        }

        if (block.type === "heading") {
          const Tag = block.level === 2 ? "h2" : "h3";
          return (
            <Tag
              key={block.id}
              className={block.level === 2
                ? "clear-both text-2xl font-semibold text-fab-text pt-3"
                : "clear-both text-xl font-semibold text-fab-text pt-2"}
            >
              {block.text}
            </Tag>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={block.id}
              className="border-l-2 border-fab-gold/50 pl-4 py-1 text-base italic text-fab-text/90"
            >
              {block.text}
            </blockquote>
          );
        }

        if (block.type === "list") {
          const ListTag = block.style === "numbered" ? "ol" : "ul";
          return (
            <ListTag
              key={block.id}
              className={block.style === "numbered"
                ? "list-decimal pl-6 space-y-2 text-[15px] leading-7 text-fab-muted"
                : "list-disc pl-6 space-y-2 text-[15px] leading-7 text-fab-muted"}
            >
              {block.items.map((item, index) => (
                <li key={`${block.id}-${index}`}>{item}</li>
              ))}
            </ListTag>
          );
        }

        if (block.type === "divider") {
          return (
            <div key={block.id} className="clear-both py-2">
              <div className="h-px bg-gradient-to-r from-transparent via-fab-border to-transparent" />
            </div>
          );
        }

        if (block.type === "gallery") {
          const columns = block.columns === 3 ? 3 : 2;
          return (
            <div key={block.id} className={`grid gap-3 ${GALLERY_COLUMN_CLASS[columns]}`}>
              {block.images.map((image) => (
                <figure key={image.id} className="space-y-2">
                  <img
                    src={image.url}
                    alt={image.alt || ""}
                    className="h-full w-full rounded-lg border border-fab-border object-cover"
                    loading="lazy"
                  />
                  {(image.caption || image.alt) && (
                    <figcaption className="text-center text-xs text-fab-dim">
                      {image.caption || image.alt}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          );
        }

        if (block.type === "callout") {
          return (
            <aside key={block.id} className={`rounded-lg border px-4 py-3 ${CALLOUT_CLASS[block.tone]}`}>
              {block.title && <h3 className="text-sm font-semibold text-fab-text">{block.title}</h3>}
              <p className={`text-sm leading-6 text-fab-muted whitespace-pre-wrap ${block.title ? "mt-1.5" : ""}`}>
                {block.text}
              </p>
            </aside>
          );
        }

        if (block.type === "embed") {
          const youtubeUrl = getYouTubeEmbedUrl(block.url);
          const provider = youtubeUrl ? null : describeEmbed(block.url);
          return (
            <div key={block.id} className="space-y-2">
              {youtubeUrl ? (
                <>
                  {block.title && <h3 className="text-lg font-semibold text-fab-text">{block.title}</h3>}
                  <div className="overflow-hidden rounded-lg border border-fab-border bg-black">
                    <iframe
                      src={youtubeUrl}
                      title={block.title || "Embedded video"}
                      className="aspect-video w-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </>
              ) : (
                <a
                  href={provider?.href || block.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-fab-border bg-fab-surface/70 px-4 py-3 transition-colors hover:border-fab-gold/35"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-fab-gold">
                        {provider?.provider || "Embed"} <span className="text-fab-dim">{provider?.label || "Link"}</span>
                      </p>
                      <p className="mt-1 text-base font-semibold capitalize text-fab-text">
                        {block.title || provider?.title || block.url}
                      </p>
                      <p className="mt-1 truncate text-sm text-fab-dim">
                        {provider?.meta || block.url}
                      </p>
                    </div>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-fab-dim" />
                  </div>
                </a>
              )}
              {block.caption && <p className="text-center text-xs text-fab-dim">{block.caption}</p>}
            </div>
          );
        }

        return (
          <figure key={block.id} className={IMAGE_WIDTH_CLASS[block.width || "standard"]}>
            <img
              src={block.url}
              alt={block.alt || ""}
              className="w-full rounded-lg border border-fab-border object-contain"
              loading="lazy"
            />
            {(block.caption || block.alt) && (
              <figcaption className="mt-2 text-center text-xs text-fab-dim">
                {block.caption || block.alt}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
