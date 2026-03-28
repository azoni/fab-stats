import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const ICON_MAX_SIZE = 256;
const ICON_THUMB_SIZE = 64;
const BG_MAX_SIZE = 1200;
const BG_THUMB_SIZE = 400;
const ICON_MAX_BYTES = 2 * 1024 * 1024;
const BG_MAX_BYTES = 8 * 1024 * 1024;

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

function validateImageFile(file: File, maxBytes: number): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Image must be JPEG, PNG, or WebP.");
  }
  if (file.size > maxBytes) {
    throw new Error(`Image must be under ${Math.round(maxBytes / 1024 / 1024)}MB.`);
  }
}

export async function uploadTeamIcon(
  teamId: string,
  file: File
): Promise<{ iconUrl: string; iconThumbUrl: string }> {
  validateImageFile(file, ICON_MAX_BYTES);

  const storage = getStorage();
  const [fullBlob, thumbBlob] = await Promise.all([
    resizeImageToBlob(file, ICON_MAX_SIZE),
    resizeImageToBlob(file, ICON_THUMB_SIZE),
  ]);

  const fullRef = storageRef(storage, `team-images/icons/${teamId}/icon.webp`);
  const thumbRef = storageRef(storage, `team-images/icons/${teamId}/icon-thumb.webp`);

  await Promise.all([
    uploadBytes(fullRef, fullBlob, { contentType: "image/webp" }),
    uploadBytes(thumbRef, thumbBlob, { contentType: "image/webp" }),
  ]);

  const [iconUrl, iconThumbUrl] = await Promise.all([
    getDownloadURL(fullRef),
    getDownloadURL(thumbRef),
  ]);

  await updateDoc(doc(db, "teams", teamId), {
    iconUrl,
    iconThumbUrl,
    updatedAt: new Date().toISOString(),
  });

  return { iconUrl, iconThumbUrl };
}

export async function uploadTeamBackground(
  teamId: string,
  file: File
): Promise<{ backgroundUrl: string; backgroundThumbUrl: string }> {
  validateImageFile(file, BG_MAX_BYTES);

  const storage = getStorage();
  const [fullBlob, thumbBlob] = await Promise.all([
    resizeImageToBlob(file, BG_MAX_SIZE),
    resizeImageToBlob(file, BG_THUMB_SIZE),
  ]);

  const fullRef = storageRef(storage, `team-images/backgrounds/${teamId}/background.webp`);
  const thumbRef = storageRef(storage, `team-images/backgrounds/${teamId}/background-thumb.webp`);

  await Promise.all([
    uploadBytes(fullRef, fullBlob, { contentType: "image/webp" }),
    uploadBytes(thumbRef, thumbBlob, { contentType: "image/webp" }),
  ]);

  const [backgroundUrl, backgroundThumbUrl] = await Promise.all([
    getDownloadURL(fullRef),
    getDownloadURL(thumbRef),
  ]);

  await updateDoc(doc(db, "teams", teamId), {
    backgroundUrl,
    backgroundThumbUrl,
    updatedAt: new Date().toISOString(),
  });

  return { backgroundUrl, backgroundThumbUrl };
}

export async function deleteTeamImages(teamId: string): Promise<void> {
  const storage = getStorage();
  const paths = [
    `team-images/icons/${teamId}`,
    `team-images/backgrounds/${teamId}`,
  ];

  for (const path of paths) {
    try {
      const dirRef = storageRef(storage, path);
      const result = await listAll(dirRef);
      await Promise.all(result.items.map((item) => deleteObject(item)));
    } catch {
      // Directory may not exist — ignore
    }
  }
}
