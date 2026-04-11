"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Minus, PenSquare, Plus, Shield, Trash2, UploadCloud } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import { ArticleContent } from "./ArticleContent";
import { useAuth } from "@/contexts/AuthContext";
import { uploadArticleImage } from "@/lib/article-media";
import { buildArticleSearchText, createArticleId, ensureUniqueArticleSlug, estimateReadingMinutes, getArticleById, getArticleDraftsByAuthorUid, saveArticle } from "@/lib/articles";
import { createArticleFeedEvent } from "@/lib/feed";
import { slugify } from "@/lib/seasons";
import type { ArticleBlock, ArticleCalloutTone, ArticleGalleryImage, ArticleImageWidth, ArticleRecord } from "@/types";

type ImageBlock = Extract<ArticleBlock, { type: "image" }> & { file?: File | null; localUrl?: string };
type GalleryItem = { id: string; url: string; alt?: string; caption?: string; file?: File | null; localUrl?: string };
type GalleryBlock = { id: string; type: "gallery"; images: GalleryItem[]; columns?: 2 | 3 };
type EditorBlock = Exclude<ArticleBlock, { type: "image" | "gallery" }> | ImageBlock | GalleryBlock;

const INPUT = "w-full rounded-md border border-fab-border bg-fab-bg px-3 py-2.5 text-sm text-fab-text outline-none focus:border-fab-gold/40";
const PANEL = "rounded-lg border border-fab-border bg-fab-surface p-5";

function makeId() { return Math.random().toString(36).slice(2, 10); }
function parseTags(value: string) {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean))).slice(0, 12);
}
function createBlock(type: EditorBlock["type"]): EditorBlock {
  const id = makeId();
  if (type === "paragraph") return { id, type, text: "" };
  if (type === "heading") return { id, type, level: 2, text: "" };
  if (type === "quote") return { id, type, text: "" };
  if (type === "list") return { id, type, style: "bullet", items: [""] };
  if (type === "divider") return { id, type };
  if (type === "gallery") return { id, type, columns: 2, images: [] };
  if (type === "callout") return { id, type, tone: "note", title: "", text: "" };
  if (type === "embed") return { id, type, url: "", title: "", caption: "" };
  return { id, type, url: "", alt: "", caption: "", width: "standard", file: null, localUrl: "" };
}
function toEditorBlocks(blocks: ArticleBlock[]) {
  return blocks.length ? blocks.map((block) => {
    if (block.type === "image") return { ...block, file: null, localUrl: "" };
    if (block.type === "gallery") {
      return {
        ...block,
        images: block.images.map((image) => ({ ...image, file: null, localUrl: "" })),
      };
    }
    return block;
  }) : [createBlock("paragraph")];
}
function previewBlock(block: EditorBlock): ArticleBlock | null {
  if (block.type === "divider") return block;
  if (block.type === "list") {
    const items = block.items.map((item) => item.trim()).filter(Boolean);
    return items.length ? { ...block, items } : null;
  }
  if (block.type === "gallery") {
    const images: ArticleGalleryImage[] = block.images.flatMap((image) => {
      const url = image.localUrl || image.url.trim();
      return url
        ? [{
            id: image.id,
            url,
            alt: image.alt?.trim() || undefined,
            caption: image.caption?.trim() || undefined,
          }]
        : [];
    });
    return images.length ? { id: block.id, type: "gallery", images, columns: block.columns === 3 ? 3 : 2 } : null;
  }
  if (block.type === "image") {
    const url = block.localUrl || block.url;
    return url ? { id: block.id, type: "image", url, alt: block.alt?.trim() || undefined, caption: block.caption?.trim() || undefined, width: block.width || "standard" } : null;
  }
  if (block.type === "callout") {
    const text = block.text.trim();
    const title = block.title?.trim() || "";
    return text || title ? { ...block, text, title: title || undefined } : null;
  }
  if (block.type === "embed") {
    const url = block.url.trim();
    return url ? { ...block, url, title: block.title?.trim() || undefined, caption: block.caption?.trim() || undefined } : null;
  }
  const text = block.text.trim();
  return text ? { ...block, text } : null;
}
function readFilePreview(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export function ArticleComposerGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isAdmin, isGuest, loading } = useAuth();
  const articleId = searchParams.get("id") || "";
  const canAccess = !!user && !isGuest && isAdmin;
  const [existingArticle, setExistingArticle] = useState<ArticleRecord | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [heroTagsInput, setHeroTagsInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>([createBlock("paragraph")]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draftList, setDraftList] = useState<ArticleRecord[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  useEffect(() => {
    if (!canAccess || !user?.uid) return;
    let cancelled = false;
    setLoadingDrafts(true);
    getArticleDraftsByAuthorUid(user.uid)
      .then((list) => { if (!cancelled) setDraftList(list); })
      .catch(() => { if (!cancelled) setDraftList([]); })
      .finally(() => { if (!cancelled) setLoadingDrafts(false); });
    return () => { cancelled = true; };
  }, [canAccess, user?.uid, existingArticle?.id, notice]);

  useEffect(() => {
    if (!canAccess) return;
    if (!articleId) {
      setExistingArticle(null);
      setTitle(""); setSlug(""); setExcerpt(""); setHeroTagsInput(""); setTagsInput("");
      setAllowComments(true); setCoverImageUrl(""); setCoverFile(null); setCoverPreviewUrl("");
      setBlocks([createBlock("paragraph")]); setNotice(null); setError(null); setLoadingDraft(false);
      return;
    }
    let cancelled = false;
    setLoadingDraft(true); setNotice(null); setError(null);
    getArticleById(articleId).then((article) => {
      if (cancelled) return;
      if (!article) {
        setExistingArticle(null);
        setTitle(""); setSlug(""); setExcerpt(""); setHeroTagsInput(""); setTagsInput("");
        setAllowComments(true); setCoverImageUrl(""); setCoverFile(null); setCoverPreviewUrl("");
        setBlocks([createBlock("paragraph")]);
        setError("That draft could not be found.");
        return;
      }
      setExistingArticle(article);
      setTitle(article.title); setSlug(article.slug); setExcerpt(article.excerpt);
      setHeroTagsInput(article.heroTags.join(", ")); setTagsInput(article.tags.join(", "));
      setAllowComments(article.allowComments); setCoverImageUrl(article.coverImageUrl || "");
      setCoverFile(null); setCoverPreviewUrl(""); setBlocks(toEditorBlocks(article.contentBlocks));
    }).catch(() => {
      if (cancelled) return;
      setExistingArticle(null);
      setBlocks([createBlock("paragraph")]);
      setError("Could not load that draft.");
    })
      .finally(() => !cancelled && setLoadingDraft(false));
    return () => { cancelled = true; };
  }, [articleId, canAccess]);

  const heroTags = useMemo(() => parseTags(heroTagsInput), [heroTagsInput]);
  const tags = useMemo(() => parseTags(tagsInput), [tagsInput]);
  const previewBlocks = useMemo(() => blocks.map(previewBlock).filter((block): block is ArticleBlock => Boolean(block)), [blocks]);
  const previewArticle = useMemo<ArticleRecord>(() => {
    const now = new Date().toISOString();
    const contentBlocks: ArticleBlock[] = previewBlocks.length
      ? previewBlocks
      : [{ id: "preview", type: "paragraph", text: "Start writing. The live preview updates as the article comes together." }];
    return {
      id: existingArticle?.id || "preview",
      authorUid: profile?.uid || user?.uid || "",
      authorUsername: profile?.username || "fab-admin",
      authorDisplayName: profile?.displayName || user?.displayName || "FaB Admin",
      authorPhotoUrl: profile?.photoUrl || user?.photoURL || undefined,
      title: title.trim() || "Untitled article",
      slug: slug.trim() || slugify(title.trim() || "article"),
      excerpt: excerpt.trim() || "Add a short excerpt to shape the card, feed, and article intro.",
      coverImageUrl: coverPreviewUrl || coverImageUrl || undefined,
      contentBlocks,
      searchText: "",
      heroTags,
      tags,
      status: existingArticle?.status || "draft",
      allowComments,
      readingMinutes: estimateReadingMinutes(contentBlocks),
      viewCount: existingArticle?.viewCount || 0,
      commentCount: existingArticle?.commentCount || 0,
      reactionCounts: existingArticle?.reactionCounts,
      createdAt: existingArticle?.createdAt || now,
      updatedAt: now,
      publishedAt: existingArticle?.publishedAt,
    };
  }, [allowComments, coverImageUrl, coverPreviewUrl, existingArticle, excerpt, heroTags, previewBlocks, profile, slug, tags, title, user]);

  function updateBlock(blockId: string, updater: (block: EditorBlock) => EditorBlock) {
    setBlocks((current) => current.map((block) => block.id === blockId ? updater(block) : block));
  }
  function moveBlock(blockId: string, delta: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === blockId);
      const nextIndex = index + delta;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }
  function removeBlock(blockId: string) {
    setBlocks((current) => {
      const next = current.filter((block) => block.id !== blockId);
      return next.length ? next : [createBlock("paragraph")];
    });
  }
  function reorderBlock(fromId: string, toId: string) {
    if (!fromId || !toId || fromId === toId) return;
    setBlocks((current) => {
      const fromIndex = current.findIndex((block) => block.id === fromId);
      const toIndex = current.findIndex((block) => block.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }
  async function handleCoverFile(file: File) {
    setCoverFile(file);
    setCoverPreviewUrl(await readFilePreview(file));
  }
  async function handleBlockFile(blockId: string, file: File) {
    const localUrl = await readFilePreview(file);
    updateBlock(blockId, (block) => block.type === "image" ? { ...block, file, localUrl } : block);
  }
  async function handleGalleryFiles(blockId: string, files: File[]) {
    const images = await Promise.all(files.map(async (file) => ({
      id: makeId(),
      url: "",
      alt: "",
      caption: "",
      file,
      localUrl: await readFilePreview(file),
    })));
    updateBlock(blockId, (block) => block.type === "gallery" ? { ...block, images: [...block.images, ...images] } : block);
  }
  function addGalleryItem(blockId: string) {
    updateBlock(blockId, (block) => block.type === "gallery"
      ? { ...block, images: [...block.images, { id: makeId(), url: "", alt: "", caption: "", file: null, localUrl: "" }] }
      : block);
  }
  function updateGalleryItem(blockId: string, imageId: string, field: "url" | "alt" | "caption", value: string) {
    updateBlock(blockId, (block) => block.type === "gallery"
      ? {
        ...block,
        images: block.images.map((image) => image.id === imageId ? { ...image, [field]: value } : image),
      }
      : block);
  }
  function removeGalleryItem(blockId: string, imageId: string) {
    updateBlock(blockId, (block) => block.type === "gallery"
      ? { ...block, images: block.images.filter((image) => image.id !== imageId) }
      : block);
  }

  async function handleSave(mode: "draft" | "publish") {
    if (!canAccess || !user?.uid) return;
    if (!profile?.username || !profile.displayName) { setError("Finish your profile first so articles have a stable author card."); return; }
    if (!title.trim()) { setError("Give the article a title first."); return; }
    if (mode === "publish" && !excerpt.trim()) { setError("Add a short excerpt before publishing."); return; }
    setSaving(mode); setNotice(null); setError(null);
    try {
      const targetId = existingArticle?.id || articleId || createArticleId();
      let nextCoverImageUrl = coverImageUrl.trim();
      if (coverFile) nextCoverImageUrl = await uploadArticleImage(user.uid, targetId, coverFile);
      const contentBlocks: ArticleBlock[] = [];
      const nextBlocks: EditorBlock[] = [];
      for (const block of blocks) {
        const preview = previewBlock(block);
        if (!preview) continue;
        if (block.type === "image") {
          let url = block.url.trim();
          if (block.file) url = await uploadArticleImage(user.uid, targetId, block.file);
          const nextBlock: ImageBlock = { ...block, url, file: null, localUrl: "", alt: block.alt || "", caption: block.caption || "", width: block.width || "standard" };
          nextBlocks.push(nextBlock);
          contentBlocks.push({ id: nextBlock.id, type: "image", url, alt: nextBlock.alt || undefined, caption: nextBlock.caption || undefined, width: nextBlock.width });
        } else if (block.type === "gallery") {
          const images = [];
          for (const image of block.images) {
            let url = image.url.trim();
            if (image.file) url = await uploadArticleImage(user.uid, targetId, image.file);
            if (!url) continue;
            images.push({
              id: image.id,
              url,
              alt: image.alt?.trim() || undefined,
              caption: image.caption?.trim() || undefined,
            });
          }
          if (!images.length) continue;
          nextBlocks.push({
            id: block.id,
            type: "gallery",
            columns: block.columns === 3 ? 3 : 2,
            images: images.map((image) => ({ ...image, file: null, localUrl: "" })),
          });
          contentBlocks.push({
            id: block.id,
            type: "gallery",
            columns: block.columns === 3 ? 3 : 2,
            images,
          });
        } else {
          nextBlocks.push(preview as EditorBlock);
          contentBlocks.push(preview);
        }
      }
      if (mode === "publish" && contentBlocks.length === 0) throw new Error("Add at least one content block before publishing.");
      const now = new Date().toISOString();
      const finalSlug = await ensureUniqueArticleSlug(slugify(slug.trim() || title.trim() || targetId), targetId);
      const status = mode === "publish" ? "published" : existingArticle?.status === "published" ? "published" : "draft";
      const publishedAt = status === "published" ? (existingArticle?.publishedAt || now) : undefined;
      const articleData: Omit<ArticleRecord, "id"> = {
        authorUid: profile.uid,
        authorUsername: profile.username,
        authorDisplayName: profile.displayName,
        authorPhotoUrl: profile.photoUrl || user.photoURL || undefined,
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt.trim(),
        coverImageUrl: nextCoverImageUrl || undefined,
        contentBlocks,
        searchText: buildArticleSearchText({ title: title.trim(), excerpt: excerpt.trim(), authorDisplayName: profile.displayName, authorUsername: profile.username, heroTags, tags, blocks: contentBlocks }),
        heroTags,
        tags,
        status,
        allowComments,
        readingMinutes: estimateReadingMinutes(contentBlocks),
        viewCount: existingArticle?.viewCount || 0,
        commentCount: existingArticle?.commentCount || 0,
        reactionCounts: existingArticle?.reactionCounts,
        createdAt: existingArticle?.createdAt || now,
        updatedAt: now,
        publishedAt,
      };
      await saveArticle(targetId, articleData);
      if (status === "published") await createArticleFeedEvent(profile, { id: targetId, slug: finalSlug, title: articleData.title, excerpt: articleData.excerpt, coverImageUrl: articleData.coverImageUrl, heroTags: articleData.heroTags, publishedAt });
      setExistingArticle({ ...articleData, id: targetId });
      setSlug(finalSlug); setCoverImageUrl(nextCoverImageUrl); setCoverFile(null); setCoverPreviewUrl("");
      setBlocks(nextBlocks.length ? nextBlocks : [createBlock("paragraph")]);
      if (mode === "publish") { router.push(`/articles/${finalSlug}`); return; }
      router.replace(`/articles/new?id=${encodeURIComponent(targetId)}`);
      setNotice(existingArticle?.status === "published" ? "Live article updated." : "Draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the article.");
    } finally {
      setSaving(null);
    }
  }

  if (loading || (canAccess && loadingDraft)) return <div className="mx-auto max-w-6xl text-sm text-fab-dim">Loading composer...</div>;

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-fab-border bg-fab-surface p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-fab-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-fab-gold">
          Article Composer
          <span className="rounded-full bg-fab-bg px-2 py-0.5 text-[10px] text-fab-dim">Beta</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-fab-text">Write something worth passing around.</h1>
        <p className="mt-3 text-sm leading-6 text-fab-muted">Rich article creation is live for admin publishing first while the flow settles in.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/articles" className="rounded-md bg-fab-gold px-4 py-2 text-sm font-semibold text-fab-bg">Browse articles</Link>
          <Link href="/" className="rounded-md border border-fab-border px-4 py-2 text-sm font-medium text-fab-dim hover:text-fab-text">Back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className={PANEL}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-fab-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-fab-gold"><Shield className="h-3.5 w-3.5" />Admin Composer</span>
              <span className="rounded-full border border-fab-border bg-fab-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fab-dim">Beta</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-fab-text">Compose a clean long-form post.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-fab-muted">Build the story in blocks, place images where they belong, save drafts, and publish straight into the article page and activity feed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => handleSave("draft")} disabled={saving !== null} className="rounded-md border border-fab-border bg-fab-bg px-4 py-2 text-sm font-semibold text-fab-text disabled:opacity-50">{saving === "draft" ? "Saving..." : existingArticle?.status === "published" ? "Save Changes" : "Save Draft"}</button>
            <button type="button" onClick={() => handleSave("publish")} disabled={saving !== null} className="rounded-md bg-fab-gold px-4 py-2 text-sm font-semibold text-fab-bg disabled:opacity-50">{saving === "publish" ? "Publishing..." : "Publish"}</button>
          </div>
        </div>
        {notice && <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</p>}
        {error && <p className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      </div>

      <section className={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-fab-text"><PenSquare className="h-4 w-4 text-fab-gold" />Your Drafts &amp; Unpublished</div>
            <p className="mt-1 text-xs text-fab-dim">Pick up where you left off, or start a new post.</p>
          </div>
          <button type="button" onClick={() => router.push("/articles/new")} className="rounded-md border border-fab-border bg-fab-bg px-3 py-2 text-xs font-semibold text-fab-text hover:border-fab-gold/40"><Plus className="mr-1 inline h-3 w-3" />New Article</button>
        </div>
        {loadingDrafts ? (
          <p className="mt-4 text-xs text-fab-dim">Loading drafts...</p>
        ) : draftList.length === 0 ? (
          <p className="mt-4 text-xs text-fab-dim">No drafts yet. Published articles live on <Link href="/articles" className="underline">the articles page</Link>.</p>
        ) : (
          <ul className="mt-4 divide-y divide-fab-border rounded-lg border border-fab-border bg-fab-bg">
            {draftList.map((draft) => {
              const isActive = draft.id === existingArticle?.id;
              const updated = draft.updatedAt || draft.createdAt;
              return (
                <li key={draft.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm ${isActive ? "bg-fab-gold/5" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-fab-text">{draft.title || "Untitled draft"}</span>
                      <span className="rounded-full border border-fab-border bg-fab-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fab-dim">{draft.status}</span>
                      {isActive && <span className="rounded-full bg-fab-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fab-gold">Editing</span>}
                    </div>
                    <p className="mt-1 text-[11px] text-fab-dim">Updated {updated ? new Date(updated).toLocaleString() : "—"} · {draft.readingMinutes} min read</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => router.push(`/articles/new?id=${draft.id}`)} disabled={isActive} className="rounded-md border border-fab-border bg-fab-surface px-3 py-1.5 text-xs font-semibold text-fab-text hover:border-fab-gold/40 disabled:opacity-50">{isActive ? "Open" : "Edit"}</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),minmax(340px,0.85fr)]">
        <div className="space-y-5">
          <section className={PANEL}>
            <div className="flex items-center gap-2 text-sm font-semibold text-fab-text"><PenSquare className="h-4 w-4 text-fab-gold" />Article Details</div>
            <div className="mt-4 space-y-4">
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Title" className={INPUT} />
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug, or leave blank to generate from title" className={INPUT} />
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} maxLength={260} placeholder="Excerpt" className={INPUT} />
              <div className="grid gap-4 md:grid-cols-2">
                <input value={heroTagsInput} onChange={(e) => setHeroTagsInput(e.target.value)} placeholder="Hero tags: Fai, Enigma, Nuu" className={INPUT} />
                <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Keywords: testing, sideboarding" className={INPUT} />
              </div>
              <div className="rounded-lg border border-fab-border bg-fab-bg p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold text-fab-text">Cover image</p><p className="text-xs text-fab-dim">Optional hero image for cards and the article header.</p></div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-fab-border px-3 py-2 text-xs font-semibold text-fab-text"><UploadCloud className="h-3.5 w-3.5" />Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleCoverFile(file); e.currentTarget.value = ""; }} /></label>
                </div>
                {(coverPreviewUrl || coverImageUrl) && <img src={coverPreviewUrl || coverImageUrl} alt="" className="mt-4 h-48 w-full rounded-lg border border-fab-border object-cover" />}
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-fab-border bg-fab-bg px-4 py-3">
                <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="h-4 w-4 rounded border-fab-border bg-fab-bg text-fab-gold" />
                <div><p className="text-sm font-semibold text-fab-text">Enable discussion</p><p className="text-xs text-fab-dim">Signed-in players can comment and reply.</p></div>
              </label>
            </div>
          </section>

          <section className={PANEL}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-sm font-semibold text-fab-text">Content Blocks</h2><p className="text-xs text-fab-dim">Build the flow one section at a time.</p></div>
              <div className="flex flex-wrap gap-2">{(["paragraph", "heading", "quote", "list", "image", "gallery", "callout", "embed", "divider"] as const).map((type) => <button key={type} type="button" onClick={() => setBlocks((current) => [...current, createBlock(type)])} className="inline-flex items-center gap-1.5 rounded-md border border-fab-border bg-fab-bg px-2.5 py-1.5 text-xs font-semibold text-fab-text">{type === "divider" ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{type}</button>)}</div>
            </div>
            <div className="mt-4 space-y-4">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  onDragOver={(e) => {
                    if (!draggingBlockId || draggingBlockId === block.id) return;
                    e.preventDefault();
                    if (dropTargetId !== block.id) setDropTargetId(block.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingBlockId) reorderBlock(draggingBlockId, block.id);
                    setDraggingBlockId(null);
                    setDropTargetId(null);
                  }}
                  onDragEnd={() => {
                    setDraggingBlockId(null);
                    setDropTargetId(null);
                  }}
                  className={`rounded-lg border bg-fab-bg p-4 transition-colors ${
                    dropTargetId === block.id && draggingBlockId !== block.id
                      ? "border-fab-gold/50"
                      : "border-fab-border"
                  } ${
                    draggingBlockId === block.id ? "opacity-70" : ""
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        draggable
                        onDragStart={() => setDraggingBlockId(block.id)}
                        className="inline-flex cursor-grab items-center justify-center rounded-md border border-fab-border bg-fab-surface p-2 text-fab-dim active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                      <div><p className="text-sm font-semibold text-fab-text">{block.type === "heading" ? "Heading" : block.type === "quote" ? "Quote" : block.type === "list" ? "List" : block.type === "divider" ? "Divider" : block.type === "image" ? "Image" : block.type === "gallery" ? "Gallery" : block.type === "callout" ? "Callout" : block.type === "embed" ? "Embed" : "Paragraph"}</p><p className="text-xs text-fab-dim">Block {index + 1}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => moveBlock(block.id, -1)} className="rounded-md border border-fab-border p-2 text-fab-dim hover:text-fab-text"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => moveBlock(block.id, 1)} className="rounded-md border border-fab-border p-2 text-fab-dim hover:text-fab-text"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => removeBlock(block.id)} className="rounded-md border border-fab-border p-2 text-fab-dim hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  {block.type === "image" ? (
                    <div className="space-y-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-fab-border px-3 py-2 text-xs font-semibold text-fab-text"><UploadCloud className="h-3.5 w-3.5" />Upload image<input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleBlockFile(block.id, file); e.currentTarget.value = ""; }} /></label>
                      <input value={block.url} onChange={(e) => updateBlock(block.id, (current) => current.type === "image" ? { ...current, url: e.target.value } : current)} placeholder="Image URL" className={INPUT} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <input value={block.alt || ""} onChange={(e) => updateBlock(block.id, (current) => current.type === "image" ? { ...current, alt: e.target.value } : current)} placeholder="Alt text" className={INPUT} />
                        <select value={block.width || "standard"} onChange={(e) => updateBlock(block.id, (current) => current.type === "image" ? { ...current, width: e.target.value as ArticleImageWidth } : current)} className={INPUT}><option value="standard">Standard</option><option value="wide">Wide</option><option value="full">Full</option></select>
                      </div>
                      <input value={block.caption || ""} onChange={(e) => updateBlock(block.id, (current) => current.type === "image" ? { ...current, caption: e.target.value } : current)} placeholder="Caption" className={INPUT} />
                    </div>
                  ) : block.type === "gallery" ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-fab-border px-3 py-2 text-xs font-semibold text-fab-text"><UploadCloud className="h-3.5 w-3.5" />Upload gallery images<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) void handleGalleryFiles(block.id, files); e.currentTarget.value = ""; }} /></label>
                        <button type="button" onClick={() => addGalleryItem(block.id)} className="rounded-md border border-fab-border px-3 py-2 text-xs font-semibold text-fab-text">Add image slot</button>
                        <select value={block.columns || 2} onChange={(e) => updateBlock(block.id, (current) => current.type === "gallery" ? { ...current, columns: Number(e.target.value) as 2 | 3 } : current)} className="rounded-md border border-fab-border bg-fab-surface px-3 py-2 text-sm text-fab-text outline-none focus:border-fab-gold/40"><option value={2}>2 columns</option><option value={3}>3 columns</option></select>
                      </div>
                      {block.images.length === 0 ? (
                        <p className="rounded-md border border-dashed border-fab-border px-3 py-4 text-center text-sm text-fab-dim">Add a few images to build a gallery.</p>
                      ) : (
                        <div className="space-y-3">
                          {block.images.map((image, imageIndex) => (
                            <div key={image.id} className="rounded-md border border-fab-border bg-fab-surface p-3">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-fab-dim">Image {imageIndex + 1}</span>
                                <button type="button" onClick={() => removeGalleryItem(block.id, image.id)} className="text-xs font-semibold text-fab-dim hover:text-rose-300">Remove</button>
                              </div>
                              {(image.localUrl || image.url) && <img src={image.localUrl || image.url} alt="" className="mb-3 h-32 w-full rounded-md border border-fab-border object-cover" />}
                              <div className="space-y-3">
                                <input value={image.url} onChange={(e) => updateGalleryItem(block.id, image.id, "url", e.target.value)} placeholder="Image URL" className={INPUT} />
                                <div className="grid gap-3 md:grid-cols-2">
                                  <input value={image.alt || ""} onChange={(e) => updateGalleryItem(block.id, image.id, "alt", e.target.value)} placeholder="Alt text" className={INPUT} />
                                  <input value={image.caption || ""} onChange={(e) => updateGalleryItem(block.id, image.id, "caption", e.target.value)} placeholder="Caption" className={INPUT} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : block.type === "callout" ? (
                    <div className="space-y-3">
                      <select value={block.tone} onChange={(e) => updateBlock(block.id, (current) => current.type === "callout" ? { ...current, tone: e.target.value as ArticleCalloutTone } : current)} className={INPUT}><option value="note">Note</option><option value="tip">Tip</option><option value="warning">Warning</option></select>
                      <input value={block.title || ""} onChange={(e) => updateBlock(block.id, (current) => current.type === "callout" ? { ...current, title: e.target.value } : current)} placeholder="Optional title" className={INPUT} />
                      <textarea value={block.text} onChange={(e) => updateBlock(block.id, (current) => current.type === "callout" ? { ...current, text: e.target.value } : current)} rows={4} placeholder="Highlight a note, takeaway, or warning." className={INPUT} />
                    </div>
                  ) : block.type === "embed" ? (
                    <div className="space-y-3">
                      <input value={block.url} onChange={(e) => updateBlock(block.id, (current) => current.type === "embed" ? { ...current, url: e.target.value } : current)} placeholder="Paste a YouTube, Fabrary, or other share link" className={INPUT} />
                      <input value={block.title || ""} onChange={(e) => updateBlock(block.id, (current) => current.type === "embed" ? { ...current, title: e.target.value } : current)} placeholder="Optional title" className={INPUT} />
                      <input value={block.caption || ""} onChange={(e) => updateBlock(block.id, (current) => current.type === "embed" ? { ...current, caption: e.target.value } : current)} placeholder="Optional caption" className={INPUT} />
                    </div>
                  ) : block.type === "divider" ? (
                    <p className="rounded-md border border-dashed border-fab-border px-3 py-4 text-center text-sm text-fab-dim">Divider line</p>
                  ) : block.type === "list" ? (
                    <>
                      <select value={block.style} onChange={(e) => updateBlock(block.id, (current) => current.type === "list" ? { ...current, style: e.target.value as "bullet" | "numbered" } : current)} className={`${INPUT} mb-3`}><option value="bullet">Bullet list</option><option value="numbered">Numbered list</option></select>
                      <textarea value={block.items.join("\n")} onChange={(e) => updateBlock(block.id, (current) => current.type === "list" ? { ...current, items: e.target.value.split("\n") } : current)} rows={5} placeholder="One item per line" className={INPUT} />
                    </>
                  ) : (
                    <>
                      {block.type === "heading" && <select value={block.level} onChange={(e) => updateBlock(block.id, (current) => current.type === "heading" ? { ...current, level: Number(e.target.value) as 2 | 3 } : current)} className={`${INPUT} mb-3`}><option value={2}>H2</option><option value={3}>H3</option></select>}
                      <textarea value={block.text} onChange={(e) => updateBlock(block.id, (current) => "text" in current ? { ...current, text: e.target.value } : current)} rows={block.type === "paragraph" ? 6 : 4} placeholder={block.type === "quote" ? "Pull quote" : "Write this section"} className={INPUT} />
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className={PANEL}>
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-fab-text">Live Preview</h2><p className="text-xs text-fab-dim">Card and article body together.</p></div><span className="rounded-full border border-fab-border bg-fab-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fab-dim">{previewArticle.readingMinutes} min</span></div>
            <div className="mt-4 space-y-4">
              <ArticleCard article={previewArticle} />
              <article className="overflow-hidden rounded-lg border border-fab-border bg-fab-bg">
                {previewArticle.coverImageUrl && <img src={previewArticle.coverImageUrl} alt={previewArticle.title} className="h-56 w-full object-cover" />}
                <div className="space-y-5 p-5">
                  <div className="flex flex-wrap gap-2">{previewArticle.heroTags.map((tag) => <span key={tag} className="rounded-full bg-fab-gold/10 px-2.5 py-1 text-[11px] font-semibold text-fab-gold">{tag}</span>)}{previewArticle.tags.map((tag) => <span key={tag} className="rounded-full bg-fab-surface px-2.5 py-1 text-[11px] text-fab-dim">{tag}</span>)}</div>
                  <div><h2 className="text-2xl font-bold text-fab-text">{previewArticle.title}</h2><p className="mt-2 text-sm leading-6 text-fab-muted">{previewArticle.excerpt}</p></div>
                  <ArticleContent blocks={previewArticle.contentBlocks} />
                </div>
              </article>
            </div>
          </section>
          <section className={PANEL}>
            <h2 className="text-sm font-semibold text-fab-text">Publishing Notes</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-fab-muted">
              <li>Published articles can show in the main activity feed.</li>
              <li>Profile pages surface published articles only.</li>
              <li>View counts stay signed-in only and throttle repeat reads locally.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
