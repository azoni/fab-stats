"use client";
import { useState, useRef } from "react";
import { uploadTeamIcon, uploadTeamBackground } from "@/lib/team-images";
import { Camera } from "lucide-react";
import { toast } from "sonner";

interface TeamImageUploaderProps {
  teamId: string;
  currentIconUrl?: string;
  currentBackgroundUrl?: string;
  onIconUploaded: (url: string) => void;
  onBackgroundUploaded: (url: string) => void;
}

export function TeamImageUploader({
  teamId, currentIconUrl, currentBackgroundUrl, onIconUploaded, onBackgroundUploaded,
}: TeamImageUploaderProps) {
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  async function handleIconUpload(file: File) {
    setUploadingIcon(true);
    try {
      const { iconUrl } = await uploadTeamIcon(teamId, file);
      onIconUploaded(iconUrl);
      toast.success("Team icon updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload icon.");
    }
    setUploadingIcon(false);
  }

  async function handleBgUpload(file: File) {
    setUploadingBg(true);
    try {
      const { backgroundUrl } = await uploadTeamBackground(teamId, file);
      onBackgroundUploaded(backgroundUrl);
      toast.success("Team background updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload background.");
    }
    setUploadingBg(false);
  }

  return (
    <div className="space-y-4">
      {/* Icon */}
      <div>
        <label className="block text-xs text-fab-muted mb-1.5 font-medium">Team Icon</label>
        <div className="flex items-center gap-3">
          <div className="relative">
            {currentIconUrl ? (
              <img src={currentIconUrl} alt="Team icon" className="w-14 h-14 rounded-lg object-cover border border-fab-border" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-fab-bg border border-fab-border flex items-center justify-center">
                <Camera className="w-5 h-5 text-fab-dim" />
              </div>
            )}
            {uploadingIcon && (
              <span className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
                <span className="text-white text-xs animate-pulse">...</span>
              </span>
            )}
          </div>
          <div>
            <button
              onClick={() => iconInputRef.current?.click()}
              disabled={uploadingIcon}
              className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors disabled:opacity-50"
            >
              {uploadingIcon ? "Uploading..." : currentIconUrl ? "Change icon" : "Upload icon"}
            </button>
            <p className="text-xs text-fab-dim mt-0.5">Square image, auto-resized to 256px</p>
          </div>
          <input
            ref={iconInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleIconUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Background */}
      <div>
        <label className="block text-xs text-fab-muted mb-1.5 font-medium">Share Card Background</label>
        <p className="text-xs text-fab-dim mb-2">This background is used on share cards for all team members.</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            {currentBackgroundUrl ? (
              <img src={currentBackgroundUrl} alt="Team background" className="w-24 h-14 rounded-lg object-cover border border-fab-border" />
            ) : (
              <div className="w-24 h-14 rounded-lg bg-fab-bg border border-fab-border flex items-center justify-center">
                <Camera className="w-5 h-5 text-fab-dim" />
              </div>
            )}
            {uploadingBg && (
              <span className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
                <span className="text-white text-xs animate-pulse">...</span>
              </span>
            )}
          </div>
          <div>
            <button
              onClick={() => bgInputRef.current?.click()}
              disabled={uploadingBg}
              className="text-sm text-fab-gold hover:text-fab-gold-light transition-colors disabled:opacity-50"
            >
              {uploadingBg ? "Uploading..." : currentBackgroundUrl ? "Change background" : "Upload background"}
            </button>
            <p className="text-xs text-fab-dim mt-0.5">Max 8MB, auto-resized to 1200px wide</p>
          </div>
          <input
            ref={bgInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleBgUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
