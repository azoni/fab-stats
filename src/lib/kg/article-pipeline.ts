/**
 * Meta-article pipeline: retrieve (KG) → generate (Claude) → assemble a draft
 * ArticleRecord. Persistence is the caller's job (the Netlify function writes
 * to Firestore via firebase-admin; the script just prints) — keeping this
 * module free of firebase-admin so it stays runnable from anywhere.
 */
import type { ArticleRecord, ArticleBlock } from "@/types";
import { getMetaInsights, type MetaInsights } from "./meta-insights";
import { generateMetaArticle, type GeneratedArticle } from "./article-generator";

const BOT_AUTHOR = {
  uid: "fabstats-meta-bot",
  username: "fabstats",
  displayName: "FaB Stats",
};

function slugify(title: string, weekLabel: string): string {
  const wk = weekLabel.toLowerCase();
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  // The model usually puts the week label in the title already — don't repeat it.
  return base.includes(wk) ? base : `${base || "weekly-meta"}-${wk}`;
}

function plainText(blocks: ArticleBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "paragraph" || b.type === "heading" || b.type === "quote") {
      out.push(b.text);
    } else if (b.type === "list") {
      out.push(b.items.join(" "));
    } else if (b.type === "callout") {
      out.push([b.title, b.text].filter(Boolean).join(" "));
    }
  }
  return out.join(" ");
}

export interface MetaArticleDraft {
  article: ArticleRecord;
  insights: MetaInsights;
  generation: GeneratedArticle;
}

/**
 * Run the full pipeline and return a draft ArticleRecord (status: "draft").
 * Does NOT persist — caller decides.
 */
export async function buildMetaArticleDraft(): Promise<MetaArticleDraft> {
  const insights = await getMetaInsights();
  const generation = await generateMetaArticle(insights);

  const now = new Date().toISOString();
  const slug = slugify(generation.title, insights.weekLabel);

  // Provenance gate: every generated article opens with a visible disclaimer.
  // The underlying numbers are community-tracked (self-selected sample), not
  // official results — labeling the origin wherever it renders is the honest
  // minimum. Combined with status:"draft" (no auto-publish), this is the
  // quality gate. A numeric publish-threshold could come later but would be
  // speculative now.
  const disclaimer: ArticleBlock = {
    id: Math.random().toString(36).slice(2, 10),
    type: "callout",
    tone: "warning",
    title: "Auto-generated · community-tracked data",
    text: "Written automatically from fabstats community-logged matches (a self-selected sample), not official tournament results. Review before publishing.",
  };
  const contentBlocks: ArticleBlock[] = [disclaimer, ...generation.contentBlocks];

  const text = plainText(contentBlocks);
  const words = text.split(/\s+/).filter(Boolean).length;

  const article: ArticleRecord = {
    id: slug, // deterministic id = slug, so re-running a week overwrites its draft
    authorUid: BOT_AUTHOR.uid,
    authorUsername: BOT_AUTHOR.username,
    authorDisplayName: BOT_AUTHOR.displayName,
    title: generation.title,
    slug,
    excerpt: generation.excerpt,
    contentBlocks,
    searchText: `${generation.title} ${generation.excerpt} ${text}`
      .toLowerCase()
      .slice(0, 8000),
    heroTags: generation.heroTags,
    tags: ["meta-report", "auto-generated"],
    status: "draft", // never auto-publish; disclaimer block + draft = the gate
    allowComments: true,
    readingMinutes: Math.max(1, Math.round(words / 200)),
    viewCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  return { article, insights, generation };
}
