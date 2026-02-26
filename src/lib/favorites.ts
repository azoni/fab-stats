import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export interface FavoriteEntry {
  targetUserId: string;
  targetUsername: string;
  targetDisplayName: string;
  targetPhotoUrl?: string;
  createdAt: string;
}

function favoritesCollection(userId: string) {
  return collection(db, "users", userId, "favorites");
}

export async function addFavorite(
  userId: string,
  target: { uid: string; username: string; displayName: string; photoUrl?: string }
): Promise<void> {
  const docRef = doc(db, "users", userId, "favorites", target.uid);
  const data: Record<string, unknown> = {
    targetUserId: target.uid,
    targetUsername: target.username,
    targetDisplayName: target.displayName,
    createdAt: new Date().toISOString(),
  };
  if (target.photoUrl) data.targetPhotoUrl = target.photoUrl;
  await setDoc(docRef, data);
}

export async function removeFavorite(
  userId: string,
  targetUserId: string
): Promise<void> {
  const docRef = doc(db, "users", userId, "favorites", targetUserId);
  await deleteDoc(docRef);
}

export async function getFavorites(userId: string): Promise<FavoriteEntry[]> {
  const snap = await getDocs(favoritesCollection(userId));
  const favorites = snap.docs.map((d) => d.data() as FavoriteEntry);
  favorites.sort((a, b) => a.targetDisplayName.localeCompare(b.targetDisplayName));
  return favorites;
}
