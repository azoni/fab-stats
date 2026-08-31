"use client";

/**
 * Renderer for the article block model (ArticleRecord.contentBlocks).
 * Covers the block types the meta-article generator emits; image/gallery/embed
 * blocks are skipped (the retired articles UI was the only thing that used them).
 */
import type { ArticleBlock } from "@/types";

export function ArticleBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-fab-text">
      {blocks.map((b) => {
        if (b.type === "heading")
          return b.level === 2 ? (
            <h2 key={b.id} className="mt-4 text-lg font-bold text-fab-gold">{b.text}</h2>
          ) : (
            <h3 key={b.id} className="mt-3 font-semibold text-fab-text">{b.text}</h3>
          );
        if (b.type === "paragraph")
          return <p key={b.id}>{b.text}</p>;
        if (b.type === "quote")
          return (
            <blockquote key={b.id} className="border-l-2 border-fab-gold/50 pl-3 italic text-fab-dim">
              {b.text}
            </blockquote>
          );
        if (b.type === "list")
          return (
            <ul key={b.id} className="list-inside list-disc space-y-1 text-fab-text/90">
              {b.items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          );
        if (b.type === "callout")
          return (
            <div key={b.id} className="rounded-md border border-fab-gold/30 bg-fab-gold/5 p-3 text-xs">
              {b.title && <div className="font-semibold text-fab-gold">{b.title}</div>}
              <div className="text-fab-text/90">{b.text}</div>
            </div>
          );
        if (b.type === "divider")
          return <hr key={b.id} className="border-white/10" />;
        return null;
      })}
    </div>
  );
}
