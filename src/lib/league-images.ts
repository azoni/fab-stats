import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const BANNER_MAX_SIZE = 1600; // wide hero image
const BANNER_MAX_BYTES = 8 * 1024 * 1024;
const ICON_MAX_SIZE = 256; // small square-ish emblem (CSS object-cover crops)
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
          if (w > h) {
            h = Math.round((h * maxSize) / w);
            w = maxSize;
          } else {
            w = Math.round((w * maxSize) / h);
            h = maxSize;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))),
          "image/webp",
          0.85,
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image"));
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

/** Upload a league banner, persist bannerUrl on the league doc, return the URL. */
export async function uploadLeagueBanner(leagueId: string, file: File): Promise<string> {
  validateImageFile(file, BANNER_MAX_BYTES);
  const storage = getStorage();
  const blob = await resizeImageToBlob(file, BANNER_MAX_SIZE);
  const ref = storageRef(storage, `league-images/banners/${leagueId}/banner.webp`);
  await uploadBytes(ref, blob, { contentType: "image/webp" });
  const bannerUrl = await getDownloadURL(ref);
  await updateDoc(doc(db, "leagues", leagueId), {
    bannerUrl,
    updatedAt: new Date().toISOString(),
  });
  return bannerUrl;
}

/** Upload a league icon (emblem), persist iconUrl on the league doc, return the URL. */
export async function uploadLeagueIcon(leagueId: string, file: File): Promise<string> {
  validateImageFile(file, ICON_MAX_BYTES);
  const storage = getStorage();
  const blob = await resizeImageToBlob(file, ICON_MAX_SIZE);
  const ref = storageRef(storage, `league-images/icons/${leagueId}/icon.webp`);
  await uploadBytes(ref, blob, { contentType: "image/webp" });
  const iconUrl = await getDownloadURL(ref);
  await updateDoc(doc(db, "leagues", leagueId), {
    iconUrl,
    updatedAt: new Date().toISOString(),
  });
  return iconUrl;
}

/** Remove the stored icon image + clear iconUrl. */
export async function removeLeagueIcon(leagueId: string): Promise<void> {
  const storage = getStorage();
  try {
    const dirRef = storageRef(storage, `league-images/icons/${leagueId}`);
    const result = await listAll(dirRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch {
    // Directory may not exist — ignore.
  }
  await updateDoc(doc(db, "leagues", leagueId), {
    iconUrl: "",
    updatedAt: new Date().toISOString(),
  });
}

/** Remove the stored banner image + clear bannerUrl. */
export async function removeLeagueBanner(leagueId: string): Promise<void> {
  const storage = getStorage();
  try {
    const dirRef = storageRef(storage, `league-images/banners/${leagueId}`);
    const result = await listAll(dirRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch {
    // Directory may not exist — ignore.
  }
  await updateDoc(doc(db, "leagues", leagueId), {
    bannerUrl: "",
    updatedAt: new Date().toISOString(),
  });
}
