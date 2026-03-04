"use client";
import { useState } from "react";
import type { TimelineItem, TimelinePlacement } from "@/lib/timeline/types";
import { ITEMS_PER_GAME } from "@/lib/timeline/puzzle-generator";

function LivesDisplay({ lives }: { lives: number }) {
  return (
    <div className="flex gap-1 justify-center mb-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          className={`text-sm transition-all ${i < lives ? "text-fab-loss opacity-100" : "text-fab-border opacity-30"}`}
        >
          {i < lives ? "\u2764" : "\u2764"}
        </span>
      ))}
    </div>
  );
}

function ProgressDots({ placements, currentItem }: { placements: TimelinePlacement[]; currentItem: number }) {
  return (
    <div className="flex gap-1.5 justify-center mb-4">
      {Array.from({ length: ITEMS_PER_GAME }).map((_, i) => {
        const placement = placements[i];
        let color = "bg-fab-border";
        if (placement?.correct) color = "bg-fab-win";
        else if (placement && !placement.correct) color = "bg-fab-loss";
        else if (i === currentItem) color = "bg-fab-gold";
        return <div key={i} className={`w-6 h-2 rounded-full ${color} transition-colors`} />;
      })}
    </div>
  );
}

function InsertSlot({ index, onClick, disabled }: { index: number; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-2 my-1 border border-dashed border-fab-gold/30 rounded-lg text-[10px] text-fab-gold/60 hover:border-fab-gold/60 hover:bg-fab-gold/5 hover:text-fab-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
    >
      Place here
    </button>
  );
}

export function TimelineBoard({
  items,
  placements,
  currentItem,
  lives,
  completed,
  onPlace,
}: {
  items: TimelineItem[];
  placements: TimelinePlacement[];
  currentItem: number;
  lives: number;
  completed: boolean;
  onPlace: (position: number) => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastPlacement, setLastPlacement] = useState<TimelinePlacement | null>(null);

  // Build the placed items sorted by their actual date
  const placedItems = placements.map((p) => {
    const item = items.find((it) => it.id === p.itemId)!;
    return { ...item, correct: p.correct };
  });
  placedItems.sort((a, b) => a.date.localeCompare(b.date));

  const currentItemData = items[currentItem];

  if (!currentItemData || completed) {
    return (
      <div>
        <ProgressDots placements={placements} currentItem={currentItem} />
        <LivesDisplay lives={lives} />

        {/* Show final timeline */}
        {placedItems.length > 0 && (
          <div className="space-y-1 mt-3">
            {placedItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${
                  item.correct
                    ? "border-fab-win/30 bg-fab-win/5"
                    : "border-fab-loss/30 bg-fab-loss/5"
                }`}
              >
                <span className="text-[10px] text-fab-dim font-mono shrink-0">{item.date}</span>
                <span className="text-fab-text">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function handlePlace(position: number) {
    if (showFeedback) return;

    // Calculate the correct position by checking sorted order
    const placedDates = placedItems.map((it) => it.date);
    const newDate = currentItemData.date;

    // Find where this date should go in the sorted placed dates
    let correctPosition = 0;
    for (let i = 0; i < placedDates.length; i++) {
      if (newDate > placedDates[i]) {
        correctPosition = i + 1;
      }
    }

    const isCorrect = position === correctPosition;
    const placement: TimelinePlacement = {
      itemId: currentItemData.id,
      position,
      correct: isCorrect,
    };

    setLastPlacement(placement);
    setShowFeedback(true);

    setTimeout(() => {
      onPlace(position);
      setShowFeedback(false);
      setLastPlacement(null);
    }, 1200);
  }

  return (
    <div>
      <ProgressDots placements={placements} currentItem={currentItem} />
      <LivesDisplay lives={lives} />

      {/* Current item to place */}
      <div className="mb-4 text-center">
        <p className="text-[10px] text-fab-dim">Item {currentItem + 1}/{ITEMS_PER_GAME}</p>
        <div className="mt-2 px-4 py-3 bg-fab-gold/10 border border-fab-gold/30 rounded-lg">
          <p className="text-sm font-medium text-fab-gold">{currentItemData.label}</p>
          <p className="text-[10px] text-fab-dim mt-1 uppercase tracking-wider">{currentItemData.category}</p>
        </div>
        {showFeedback && lastPlacement && (
          <p className={`text-xs font-bold mt-2 ${lastPlacement.correct ? "text-fab-win" : "text-fab-loss"}`}>
            {lastPlacement.correct ? "Correct!" : `Wrong! It was ${currentItemData.date}`}
          </p>
        )}
      </div>

      {/* Timeline with insert slots */}
      <div className="space-y-0">
        {placedItems.length === 0 ? (
          <InsertSlot index={0} onClick={() => handlePlace(0)} disabled={showFeedback} />
        ) : (
          <>
            <InsertSlot index={0} onClick={() => handlePlace(0)} disabled={showFeedback} />
            {placedItems.map((item, i) => (
              <div key={item.id}>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-fab-border bg-fab-surface text-sm">
                  <span className="text-[10px] text-fab-dim font-mono shrink-0">{item.date}</span>
                  <span className="text-fab-text">{item.label}</span>
                </div>
                <InsertSlot index={i + 1} onClick={() => handlePlace(i + 1)} disabled={showFeedback} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
