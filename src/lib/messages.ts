import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Conversation, Message, UserProfile } from "@/types";

/** Generate deterministic conversation ID from two UIDs */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

/** Get or create a conversation between two users */
export async function getOrCreateConversation(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<string> {
  const convId = getConversationId(currentUser.uid, otherUser.uid);
  const convRef = doc(db, "conversations", convId);
  const snap = await getDoc(convRef);

  if (!snap.exists()) {
    const now = new Date().toISOString();
    await setDoc(convRef, {
      participants: [currentUser.uid, otherUser.uid].sort(),
      participantInfo: {
        [currentUser.uid]: {
          displayName: currentUser.displayName,
          photoUrl: currentUser.photoUrl || "",
          username: currentUser.username,
        },
        [otherUser.uid]: {
          displayName: otherUser.displayName,
          photoUrl: otherUser.photoUrl || "",
          username: otherUser.username,
        },
      },
      lastMessage: "",
      lastMessageAt: now,
      createdAt: now,
    });
  }

  return convId;
}

/** Send a message in a conversation */
export async function sendMessage(
  conversationId: string,
  senderUid: string,
  senderName: string,
  senderPhoto: string | undefined,
  text: string,
  isAdmin: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const messagesRef = collection(db, "conversations", conversationId, "messages");

  const msgData: Record<string, unknown> = {
    senderUid,
    senderName,
    senderPhoto: senderPhoto || "",
    text,
    createdAt: now,
    isAdmin,
  };

  await addDoc(messagesRef, msgData);

  // Update conversation preview
  const convRef = doc(db, "conversations", conversationId);
  await updateDoc(convRef, {
    lastMessage: text.slice(0, 100),
    lastMessageAt: now,
  });
}

/** Create a notification for a message recipient */
export async function sendMessageNotification(
  recipientUid: string,
  conversationId: string,
  senderUid: string,
  senderName: string,
  senderPhoto: string | undefined,
  messagePreview: string
): Promise<void> {
  const notifRef = collection(db, "users", recipientUid, "notifications");
  const data: Record<string, unknown> = {
    type: "message",
    conversationId,
    senderUid,
    senderName,
    senderPhoto: senderPhoto || "",
    messagePreview: messagePreview.slice(0, 100),
    createdAt: new Date().toISOString(),
    read: false,
  };
  await addDoc(notifRef, data);
}

/** Subscribe to a user's conversations (real-time) */
export function subscribeToConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc"),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Conversation[];
    callback(conversations);
  });
}

/** Subscribe to messages in a conversation (real-time) */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  maxMessages = 100
): Unsubscribe {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
    limit(maxMessages)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Message[];
    callback(messages);
  });
}
