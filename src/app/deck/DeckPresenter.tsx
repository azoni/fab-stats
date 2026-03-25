"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Grid3X3,
  StickyNote,
  X,
} from "lucide-react";
import { SLIDES, type Slide, type Bullet, type BulletItem } from "./slides";
import { ArchitectureDiagram } from "./diagrams/ArchitectureDiagram";
import { DataFlowDiagram } from "./diagrams/DataFlowDiagram";

/* ── Navigation hook ────────────────────────────────────── */

function useSlideNavigation(total: number) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const go = useCallback(
    (n: number) => {
      setCurrent((prev) => {
        const next = Math.max(0, Math.min(total - 1, n));
        setDirection(next > prev ? 1 : -1);
        return next;
      });
    },
    [total],
  );

  const next = useCallback(() => go(current + 1), [go, current]);
  const prev = useCallback(() => go(current - 1), [go, current]);

  return { current, direction, next, prev, go, total };
}

/* ── Animated counter ───────────────────────────────────── */

function AnimatedNumber({ value, suffix = "", delay = 0 }: { value: number; suffix?: string; delay?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      delay,
      ease: "easeOut",
    });
    return controls.stop;
  }, [count, value, delay]);

  return (
    <span>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

/* ── Bullet renderer ────────────────────────────────────── */

function isBulletItem(b: Bullet): b is BulletItem {
  return typeof b !== "string";
}

function BulletList({ bullets, delay = 0 }: { bullets: Bullet[]; delay?: number }) {
  return (
    <ul className="space-y-3 text-lg text-fab-muted">
      {bullets.map((b, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + i * 0.08, duration: 0.3 }}
          className="flex items-start gap-3"
        >
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fab-gold" />
          {isBulletItem(b) ? (
            <div>
              <span className="font-semibold text-fab-text">{b.text}</span>
              {b.sub && (
                <ul className="mt-1.5 space-y-1 text-base text-fab-dim">
                  {b.sub.map((s, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fab-gold/40" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <span>{b}</span>
          )}
        </motion.li>
      ))}
    </ul>
  );
}

/* ── Code block renderer ────────────────────────────────── */

function CodeBlock({
  snippet,
  highlightLines,
}: {
  snippet: string;
  highlightLines?: number[];
}) {
  const lines = snippet.split("\n");
  const highlights = new Set(highlightLines ?? []);

  return (
    <pre className="overflow-x-auto rounded-lg border border-fab-border bg-fab-surface p-5 text-sm leading-relaxed">
      <code>
        {lines.map((line, i) => (
          <div
            key={i}
            className={`px-2 ${highlights.has(i + 1) ? "bg-fab-gold/10 border-l-2 border-fab-gold" : ""}`}
          >
            <span className="mr-4 inline-block w-6 select-none text-right text-fab-dim/50">
              {i + 1}
            </span>
            {line}
          </div>
        ))}
      </code>
    </pre>
  );
}

/* ── Slide renderers ────────────────────────────────────── */

function TitleSlide({ slide }: { slide: Slide }) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center">
      {/* Background art */}
      {slide.bgImage && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl opacity-15">
          <img src={slide.bgImage} alt="" className="h-full w-full object-cover blur-sm" />
        </div>
      )}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="font-[var(--font-nunito)] text-6xl font-bold text-fab-gold drop-shadow-lg"
      >
        {slide.title}
      </motion.h1>
      {slide.subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 text-xl text-fab-muted"
        >
          {slide.subtitle}
        </motion.p>
      )}
    </div>
  );
}

function SectionSlide({ slide }: { slide: Slide }) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center">
      {slide.bgImage && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl opacity-10">
          <img src={slide.bgImage} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-6 h-0.5 w-24 bg-fab-gold"
      />
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="font-[var(--font-nunito)] text-5xl font-bold text-fab-text"
      >
        {slide.title}
      </motion.h2>
      {slide.subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-4 max-w-lg text-lg text-fab-muted"
        >
          {slide.subtitle}
        </motion.p>
      )}
    </div>
  );
}

function StatsSlide({ slide }: { slide: Slide }) {
  const stats = slide.stats ?? [];
  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-10">
      <div className="text-center">
        {slide.section && <SectionPill label={slide.section} />}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-2 font-[var(--font-nunito)] text-4xl font-bold text-fab-text"
        >
          {slide.title}
        </motion.h2>
      </div>
      <div className="grid w-full grid-cols-2 gap-6 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
            className="flex flex-col items-center rounded-xl border border-fab-border bg-fab-surface/60 p-6 text-center"
          >
            <span className="text-4xl font-bold text-fab-gold lg:text-5xl">
              <AnimatedNumber value={stat.value} suffix={stat.suffix} delay={0.3 + i * 0.1} />
            </span>
            <span className="mt-2 text-sm text-fab-muted">{stat.label}</span>
          </motion.div>
        ))}
      </div>
      {slide.bullets && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-lg text-fab-muted"
        >
          {slide.bullets.map((b, i) => (
            <p key={i} className="mt-1">{typeof b === "string" ? b : b.text}</p>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ShowcaseSlide({ slide }: { slide: Slide }) {
  const images = slide.showcaseImages ?? [];
  return (
    <div className="flex w-full max-w-6xl flex-col gap-8">
      <div>
        {slide.section && <SectionPill label={slide.section} />}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-2 font-[var(--font-nunito)] text-4xl font-bold text-fab-text"
        >
          {slide.title}
        </motion.h2>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col justify-center gap-4">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.4 }}
              className="overflow-hidden rounded-xl border border-fab-border shadow-lg"
            >
              <img src={img.src} alt={img.alt} className="w-full object-cover" />
              {img.caption && (
                <div className="bg-fab-surface px-4 py-2 text-sm text-fab-dim">{img.caption}</div>
              )}
            </motion.div>
          ))}
        </div>
        <div className="flex items-center">
          {slide.bullets && <BulletList bullets={slide.bullets} delay={0.4} />}
        </div>
      </div>
    </div>
  );
}

function ContentSlide({ slide }: { slide: Slide }) {
  const hasImage = !!slide.image;
  return (
    <div className={`flex w-full flex-col gap-8 ${hasImage ? "max-w-6xl" : "max-w-4xl"}`}>
      <div>
        {slide.section && <SectionPill label={slide.section} />}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-2 font-[var(--font-nunito)] text-4xl font-bold text-fab-text"
        >
          {slide.title}
        </motion.h2>
      </div>
      {hasImage ? (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <div>{slide.bullets && <BulletList bullets={slide.bullets} delay={0.2} />}</div>
          <motion.figure
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col items-center"
          >
            <img
              src={slide.image!.src}
              alt={slide.image!.alt}
              className="max-h-[50vh] rounded-lg border border-fab-border object-contain shadow-lg"
            />
            {slide.image!.caption && (
              <figcaption className="mt-2 text-sm text-fab-dim">{slide.image!.caption}</figcaption>
            )}
          </motion.figure>
        </div>
      ) : (
        slide.bullets && <BulletList bullets={slide.bullets} delay={0.2} />
      )}
    </div>
  );
}

function CodeSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        {slide.section && <SectionPill label={slide.section} />}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-2 font-[var(--font-nunito)] text-3xl font-bold text-fab-text"
        >
          {slide.title}
        </motion.h2>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {slide.code && (
            <CodeBlock
              snippet={slide.code.snippet}
              highlightLines={slide.code.highlightLines}
            />
          )}
        </motion.div>
        <div className="flex items-center">
          {slide.bullets && <BulletList bullets={slide.bullets} delay={0.3} />}
        </div>
      </div>
    </div>
  );
}

function SplitSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-8">
      <div>
        {slide.section && <SectionPill label={slide.section} />}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-2 font-[var(--font-nunito)] text-4xl font-bold text-fab-text"
        >
          {slide.title}
        </motion.h2>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {slide.left && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-lg border border-fab-border bg-fab-surface/50 p-6"
          >
            <h3 className="mb-4 text-lg font-bold text-fab-gold">
              {slide.left.title}
            </h3>
            <ul className="space-y-2 text-fab-muted">
              {slide.left.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fab-gold" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
        {slide.right && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="rounded-lg border border-fab-border bg-fab-surface/50 p-6"
          >
            <h3 className="mb-4 text-lg font-bold text-fab-muted">
              {slide.right.title}
            </h3>
            <ul className="space-y-2 text-fab-muted">
              {slide.right.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fab-muted/40" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DiagramSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div>
        {slide.section && <SectionPill label={slide.section} />}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-2 font-[var(--font-nunito)] text-4xl font-bold text-fab-text"
        >
          {slide.title}
        </motion.h2>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {slide.diagram === "architecture" && <ArchitectureDiagram />}
        {slide.diagram === "data-flow" && <DataFlowDiagram />}
      </motion.div>
    </div>
  );
}

/* ── Shared components ──────────────────────────────────── */

function SectionPill({ label }: { label: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="inline-block rounded-full border border-fab-gold/20 bg-fab-gold/10 px-3 py-1 text-xs uppercase tracking-wider text-fab-gold"
    >
      {label}
    </motion.span>
  );
}

/* ── Slide overview grid ────────────────────────────────── */

function SlideOverview({
  current,
  onSelect,
  onClose,
}: {
  current: number;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] overflow-auto bg-fab-bg/95 p-8 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-fab-text">Slide Overview</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-fab-muted transition-colors hover:bg-fab-surface hover:text-fab-text"
          >
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => {
                onSelect(i);
                onClose();
              }}
              className={`group flex flex-col rounded-lg border p-4 text-left transition-all hover:border-fab-gold/50 hover:bg-fab-surface ${
                i === current
                  ? "border-fab-gold bg-fab-gold/10"
                  : "border-fab-border bg-fab-surface/30"
              }`}
            >
              <span className="mb-1 text-[10px] text-fab-dim">{i + 1}</span>
              {slide.section && (
                <span className="mb-1 text-[9px] uppercase tracking-wider text-fab-gold/60">
                  {slide.section}
                </span>
              )}
              <span className="line-clamp-2 text-xs font-medium text-fab-text group-hover:text-fab-gold">
                {slide.title}
              </span>
              <span className="mt-1 text-[10px] capitalize text-fab-dim">
                {slide.type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Notes panel ────────────────────────────────────────── */

function NotesPanel({ notes, onClose }: { notes: string[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed right-0 top-0 z-[150] flex h-full w-[420px] max-w-[90vw] flex-col border-l border-fab-border bg-fab-bg/98 shadow-2xl backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-fab-border px-5 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-fab-gold">
          Speaker Notes
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-fab-muted transition-colors hover:bg-fab-surface hover:text-fab-text"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <ul className="space-y-3">
          {notes.map((note, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-fab-muted">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-fab-gold/50" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/* ── Main presenter ─────────────────────────────────────── */

const slideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? 30 : -30,
  }),
  center: { opacity: 1, y: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? -30 : 30,
  }),
};

export function DeckPresenter() {
  const nav = useSlideNavigation(SLIDES.length);
  const [showOverview, setShowOverview] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slide = SLIDES[nav.current];
  const progress = ((nav.current + 1) / nav.total) * 100;

  /* Keyboard navigation */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (showOverview && e.key !== "g" && e.key !== "Escape") return;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "PageDown":
          e.preventDefault();
          nav.next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          nav.prev();
          break;
        case "Home":
          e.preventDefault();
          nav.go(0);
          break;
        case "End":
          e.preventDefault();
          nav.go(nav.total - 1);
          break;
        case "Escape":
          e.preventDefault();
          if (showOverview) setShowOverview(false);
          else if (document.fullscreenElement) document.exitFullscreen();
          break;
        case "f":
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullscreen(false);
          } else {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
          }
          break;
        case "g":
          e.preventDefault();
          setShowOverview((v) => !v);
          break;
        case "n":
          e.preventDefault();
          setShowNotes((v) => !v);
          break;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nav, showOverview]);

  /* Click navigation — left 30% prev, right 70% next */
  function handleSlideClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("pre"))
      return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) nav.prev();
    else nav.next();
  }

  function renderSlide(s: Slide) {
    switch (s.type) {
      case "title":
        return <TitleSlide slide={s} />;
      case "section":
        return <SectionSlide slide={s} />;
      case "content":
        return <ContentSlide slide={s} />;
      case "code":
        return <CodeSlide slide={s} />;
      case "split":
        return <SplitSlide slide={s} />;
      case "diagram":
        return <DiagramSlide slide={s} />;
      case "stats":
        return <StatsSlide slide={s} />;
      case "showcase":
        return <ShowcaseSlide slide={s} />;
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-fab-bg">
      {/* Slide area */}
      <div
        className="flex flex-1 cursor-pointer items-center justify-center overflow-hidden px-12 py-8"
        onClick={handleSlideClick}
      >
        <AnimatePresence mode="wait" custom={nav.direction}>
          <motion.div
            key={slide.id}
            custom={nav.direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex w-full items-center justify-center"
          >
            {renderSlide(slide)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between px-6 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={nav.prev}
            disabled={nav.current === 0}
            className="rounded-lg p-2 text-fab-muted transition-colors hover:bg-fab-surface hover:text-fab-text disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={nav.next}
            disabled={nav.current === nav.total - 1}
            className="rounded-lg p-2 text-fab-muted transition-colors hover:bg-fab-surface hover:text-fab-text disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowNotes((v) => !v)}
            className={`rounded-lg p-2 transition-colors hover:bg-fab-surface hover:text-fab-text ${
              showNotes ? "text-fab-gold" : "text-fab-muted"
            }`}
            title="Speaker notes (N)"
          >
            <StickyNote size={16} />
          </button>
          <button
            onClick={() => setShowOverview((v) => !v)}
            className="rounded-lg p-2 text-fab-muted transition-colors hover:bg-fab-surface hover:text-fab-text"
            title="Slide overview (G)"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
                setIsFullscreen(false);
              } else {
                document.documentElement.requestFullscreen();
                setIsFullscreen(true);
              }
            }}
            className="rounded-lg p-2 text-fab-muted transition-colors hover:bg-fab-surface hover:text-fab-text"
            title="Fullscreen (F)"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <span className="text-sm tabular-nums text-fab-dim">
            {nav.current + 1} / {nav.total}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-fab-border">
        <motion.div
          className="h-full bg-fab-gold"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Notes panel */}
      <AnimatePresence>
        {showNotes && slide.notes && (
          <NotesPanel
            notes={slide.notes}
            onClose={() => setShowNotes(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide overview */}
      <AnimatePresence>
        {showOverview && (
          <SlideOverview
            current={nav.current}
            onSelect={nav.go}
            onClose={() => setShowOverview(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
