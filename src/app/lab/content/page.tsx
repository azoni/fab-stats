"use client";

/**
 * Generated-content gallery: AI meta articles + player bios pulled from
 * Firestore, with an inline renderer for the article block model.
 */
import { useEffect, useState } from "react";
import type { ArticleRecord, ArticleBlock } from "@/types";

interface BioDoc {
  userId: string;
  username: string;
  headline: string;
  bio: string;
  highlights: string[];
  status: string;
  model: string;
  generatedAt: string;
}

function Blocks({ blocks }: { blocks: ArticleBlock[] }) {
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

export default function LabContentPage() {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [bios, setBios] = useState<BioDoc[]>([]);
  const [sel, setSel] = useState<ArticleRecord | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/lab-data?view=content")
      .then((r) => r.json())
      .then((d: { articles?: ArticleRecord[]; bios?: BioDoc[]; error?: string }) => {
        if (d.error) {
          setErr(d.error);
        } else {
          const arts = d.articles ?? [];
          setArticles(arts);
          setSel(arts[0] ?? null);
          setBios(d.bios ?? []);
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fab-gold">Generated Content</h1>
        <p className="mt-1 text-sm text-fab-dim">
          AI meta articles and player bios — grounded in the KG, persisted as
          drafts for review.
        </p>
      </div>

      {err && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {err}
        </div>
      )}
      {loaded && articles.length === 0 && bios.length === 0 && !err && (
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-fab-dim">
          Nothing generated yet. Run{" "}
          <code>scripts/generate-article.ts --persist</code> and{" "}
          <code>scripts/generate-player-bio.ts &lt;user&gt; --persist</code>.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fab-dim">
              Meta articles ({articles.length})
            </div>
            <div className="space-y-1">
              {articles.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSel(a)}
                  className={`block w-full rounded px-2 py-1.5 text-left text-xs ${
                    sel?.id === a.id
                      ? "bg-fab-gold/15 text-fab-text"
                      : "text-fab-dim hover:bg-white/5"
                  }`}
                >
                  <div className="font-medium text-fab-text">{a.title}</div>
                  <div>
                    {a.status} · {a.readingMinutes}m
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fab-dim">
              Player bios ({bios.length})
            </div>
            <div className="space-y-2">
              {bios.map((b) => (
                <div
                  key={b.userId}
                  className="rounded border border-white/10 bg-white/[0.03] p-2 text-xs"
                >
                  <div className="font-semibold text-fab-gold">@{b.username}</div>
                  <div className="text-fab-text/80">{b.headline}</div>
                  <div className="mt-1 text-fab-dim">{b.bio}</div>
                  <ul className="mt-1 list-inside list-disc text-fab-text/70">
                    {b.highlights.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <article className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          {sel ? (
            <>
              <div className="mb-1 text-xs text-fab-dim">
                {sel.status} · {sel.slug}
              </div>
              <h2 className="text-xl font-bold text-fab-text">{sel.title}</h2>
              <p className="mt-1 text-sm italic text-fab-dim">{sel.excerpt}</p>
              {sel.heroTags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {sel.heroTags.map((h) => (
                    <span
                      key={h}
                      className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-fab-dim"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}
              <hr className="my-4 border-white/10" />
              <Blocks blocks={sel.contentBlocks ?? []} />
            </>
          ) : (
            <div className="text-sm text-fab-dim">
              Select an article, or generate one.
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
