"use client";
import { useState, useEffect, useCallback } from "react";
import { PredictionCard } from "./PredictionCard";
import { EventCommentWall } from "./EventCommentWall";
import type { TextColor } from "@/lib/comment-format";
import type { EventShowcaseConfig, EventShowcaseImage, Poll } from "@/types";

interface EventShowcaseProps {
  config: EventShowcaseConfig;
  activePrediction: Poll | null;
  rankMap: Map<string, 1 | 2 | 3 | 4 | 5>;
  unlockedColors: TextColor[];
}

/** Convert various YouTube URL formats to embed URL */
function toEmbedUrl(url: string): string {
  if (url.includes("/embed/")) return url;
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const liveMatch = url.match(/youtube\.com\/live\/([\w-]+)/);
  if (liveMatch) return `https://www.youtube.com/embed/${liveMatch[1]}`;
  return url;
}

export function EventShowcase({ config, activePrediction, rankMap, unlockedColors }: EventShowcaseProps) {
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    if (config.autoAdvanceSeconds <= 0 || config.images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % config.images.length);
    }, config.autoAdvanceSeconds * 1000);
    return () => clearInterval(interval);
  }, [config.autoAdvanceSeconds, config.images.length]);

  const goToPrev = useCallback(() => {
    setCurrentImage((prev) => (prev - 1 + config.images.length) % config.images.length);
  }, [config.images.length]);

  const goToNext = useCallback(() => {
    setCurrentImage((prev) => (prev + 1) % config.images.length);
  }, [config.images.length]);

  const youtubeEmbedUrl = config.youtube.enabled && config.youtube.url
    ? toEmbedUrl(config.youtube.url)
    : null;

  const hasDiscussion = config.discussion.enabled && !!config.discussion.eventId;
  const hasPrediction = !!activePrediction?.id;
  const hasImages = config.images.length > 0;

  return (
    <div>
      {/* Title + expand toggle */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-fab-text">{config.title}</h2>
        {youtubeEmbedUrl && (
          <button
            onClick={() => setVideoExpanded((v) => !v)}
            className="text-xs text-fab-muted hover:text-fab-gold transition-colors cursor-pointer"
          >
            {videoExpanded ? "Minimize" : "Expand"} Stream
          </button>
        )}
      </div>

      {/* Expanded video (full width) */}
      {videoExpanded && youtubeEmbedUrl && (
        <div className="overflow-hidden rounded-lg border border-fab-border aspect-video mb-4">
          <iframe
            src={youtubeEmbedUrl}
            title={`${config.title} Stream`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}

      {/* Top row: images (left) + video or prediction (right) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Image carousel */}
        {hasImages ? (
          <ImageCarousel
            images={config.images}
            currentIndex={currentImage}
            imageLink={config.imageLink}
            onPrev={goToPrev}
            onNext={goToNext}
            onDot={setCurrentImage}
          />
        ) : (
          <div />
        )}

        {/* Right column */}
        {!videoExpanded && youtubeEmbedUrl ? (
          <div className="overflow-hidden rounded-lg border border-fab-border aspect-video">
            <iframe
              src={youtubeEmbedUrl}
              title={`${config.title} Stream`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (videoExpanded || !youtubeEmbedUrl) && hasPrediction ? (
          <PredictionCard pollId={activePrediction!.id!} />
        ) : (
          <div />
        )}
      </div>

      {/* Bottom row: prediction + discussion (when NOT expanded) */}
      {!videoExpanded && (hasPrediction || hasDiscussion) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Only show prediction here if YouTube is visible above (prediction not already in right column) */}
          {hasPrediction && youtubeEmbedUrl ? (
            <PredictionCard pollId={activePrediction!.id!} />
          ) : (
            <div />
          )}
          {hasDiscussion ? (
            <EventCommentWall
              eventId={config.discussion.eventId}
              rankMap={rankMap}
              unlockedColors={unlockedColors}
            />
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Discussion when expanded (YouTube is full-width, prediction is in right column) */}
      {videoExpanded && hasDiscussion && (
        <div className="mt-4">
          <EventCommentWall
            eventId={config.discussion.eventId}
            rankMap={rankMap}
            unlockedColors={unlockedColors}
          />
        </div>
      )}
    </div>
  );
}

// ── Image Carousel ──

function ImageCarousel({
  images,
  currentIndex,
  imageLink,
  onPrev,
  onNext,
  onDot,
}: {
  images: EventShowcaseImage[];
  currentIndex: number;
  imageLink?: string;
  onPrev: () => void;
  onNext: () => void;
  onDot: (i: number) => void;
}) {
  const image = images[currentIndex];
  const showControls = images.length > 1;

  const imgEl = (
    <img
      src={image.url}
      alt={image.alt || "Event showcase"}
      className="w-full h-auto group-hover:brightness-110 transition-all"
    />
  );

  return (
    <div className="relative block overflow-hidden rounded-lg border border-fab-border hover:border-fab-gold/50 transition-colors group">
      {imageLink ? (
        <a href={imageLink} target="_blank" rel="noopener noreferrer" className="block">
          {imgEl}
        </a>
      ) : (
        imgEl
      )}

      {showControls && (
        <>
          <button
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
          >
            &#8249;
          </button>
          <button
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
          >
            &#8250;
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => onDot(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
