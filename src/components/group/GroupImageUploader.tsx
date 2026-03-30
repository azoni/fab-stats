"use client";
import { useState, useRef } from "react";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Camera } from "lucide-react";
import { toast } from "sonner";

const ICON_MAX_SIZE = 256;
const ICON_THUMB_SIZE = 64;
const ICON_MAX_BYTES = 2 * 1024 * 1024;

function resizeImageToBlob(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Failed to create blob")),
          "image/webp",
          0.85
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function validateImageFile(file: File): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Image must be JPEG, PNG, or WebP.");
  }
  if (file.size > ICON_MAX_BYTES) {
    throw new Error(`Image must be under ${Math.round(ICON_MAX_BYTES / 1024 / 1024)}MB.`);
  }
}

interface GroupImageUploaderProps {
  groupId: string;
  currentIconUrl?: string;
  onIconUploaded: (url: string) => void;
}

export function GroupImageUploader({
  groupId, currentIconUrl, onIconUploaded,
}: GroupImageUploaderProps) {
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  async function handleIconUpload(file: File) {
    setUploadingIcon(true);
    try {
      validateImageFile(file);

      const storage = getStorage();
      const [fullBlob, thumbBlob] = await Promise.all([
        resizeImageToBlob(file, ICON_MAX_SIZE),
        resizeImageToBlob(file, ICON_THUMB_SIZE),
      ]);

      const fullRef = storageRef(storage, `group-images/icons/${groupId}/icon.webp`);
      const thumbRef = storageRef(storage, `group-images/icons/${groupId}/icon-thumb.webp`);

      await Promise.all([
        uploadBytes(fullRef, fullBlob, { contentType: "image/webp" }),
        uploadBytes(thumbRef, thumbBlob, { contentType: "image/webp" }),
      ]);

      const [iconUrl, iconThumbUrl] = await Promise.all([
        getDownloadURL(fullRef),
        getDownloadURL(thumbRef),
      ]);

      await updateDoc(doc(db, "groups", groupId), {
        iconUrl,
        iconThumbUrl,
        updatedAt: new Date().toISOString(),
      });

      onIconUploaded(iconUrl);
      toast.success("Group icon updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload icon.");
    }
    setUploadingIcon(false);
  }

  return (
    <div>
      <label className="block text-xs text-fab-muted mb-1.5 font-medium">Group Icon</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          {currentIconUrl ? (
            <img src={currentIconUrl} alt="Group icon" className="w-14 h-14 rounded-lg object-cover border border-fab-border" />
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
  );
}
