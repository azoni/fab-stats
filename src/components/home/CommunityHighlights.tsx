"use client";
import { memo } from "react";
import { PollCard } from "./PollCard";

export const CommunityHighlights = memo(function CommunityHighlights() {
  return (
    <div className="space-y-8">
      <PollCard />
    </div>
  );
});
