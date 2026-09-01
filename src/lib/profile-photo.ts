// Profile photo hosting. Photos used to be saved straight into the profile
// doc as a base64 data URL (~15 KB each) and then copied into the user's
// leaderboard doc, every feed event, and the community snapshots — a single
// leaderboard scan carried ~10 MB of avatars. New uploads go to Storage and
// only the download URL is stored; existing base64 photos are moved by
// netlify/functions/leaderboard-compactor.mts.
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebase";

/**
 * Upload a resized JPEG (as a data URL) to profile-photos/{uid}/ and return
 * its download URL. Throws when Storage is unavailable so the caller can fall
 * back to storing the data URL as before.
 */
export async function storeProfilePhoto(uid: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `profile-photos/${uid}/avatar-${Date.now()}.jpg`;
  const ref = storageRef(getStorage(app), path);
  await uploadBytes(ref, blob, {
    contentType: blob.type || "image/jpeg",
    cacheControl: "public, max-age=31536000",
  });
  return getDownloadURL(ref);
}
