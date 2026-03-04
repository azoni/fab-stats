"use client";
import { useState } from "react";

interface CustomImageCardProps {
  imageUrl?: string;
  caption?: string;
}

export function CustomImageCard({ imageUrl, caption }: CustomImageCardProps) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div className="bg-fab-surface border border-fab-border rounded-lg px-3 py-2 flex items-center justify-center min-h-[88px]">
        <p className="text-[10px] text-fab-dim italic">No image</p>
      </div>
    );
  }

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg relative overflow-hidden h-full min-h-[88px]">
      <img
        src={imageUrl}
        alt={caption || "Custom showcase image"}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
      {caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
          <p className="text-[10px] text-white font-medium truncate">{caption}</p>
        </div>
      )}
    </div>
  );
}
