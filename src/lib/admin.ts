import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { updateLeaderboardEntry } from "./leaderboard";
import { linkMatchesWithOpponents } from "./match-linking";
import { computeH2HForUser } from "./h2h";
import { getOrCreateConversation, sendMessage, sendMessageNotification } from "./messages";
import { getUserVisitData } from "./analytics";
import type { UserProfile, MatchRecord } from "@/types";

interface AdminConfig {
  adminEmails: string[];
}

export interface AdminUserStats {
  uid: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  createdAt: string;
  isPublic: boolean;
  matchCount: number;
  // Leaderboard stats (if available)
  winRate?: number;
  totalWins?: number;
  totalLosses?: number;
  totalDraws?: number;
  longestWinStreak?: number;
  currentStreakType?: "win" | "loss" | null;
  currentStreakCount?: number;
  topHero?: string;
  topHeroMatches?: number;
  eventsPlayed?: number;
  eventWins?: number;
  ratedMatches?: number;
  ratedWinRate?: number;
  updatedAt?: string;
  weeklyMatches?: number;
  monthlyMatches?: number;
  visitCount?: number;
  lastSiteVisit?: string;
  chatMessages?: number;
  chatCost?: number;
  lastChatAt?: string;
}

export interface AdminDashboardData {
  totalUsers: number;
  totalMatches: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  users: AdminUserStats[];
}

/** Check if an email is in the admin list (cached for 10 minutes) */
let adminCache: { emails: string[]; ts: number } | null = null;
const ADMIN_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function checkIsAdmin(
  email: string | null
): Promise<boolean> {
  if (!email) return false;
  try {
    if (adminCache && Date.now() - adminCache.ts < ADMIN_CACHE_TTL) {
      return adminCache.emails.includes(email.toLowerCase());
    }
    const snap = await getDoc(doc(db, "admin", "config"));
    if (!snap.exists()) return false;
    const config = snap.data() as AdminConfig;
    adminCache = { emails: config.adminEmails, ts: Date.now() };
    return config.adminEmails.includes(email.toLowerCase());
  } catch {
    return false;
  }
}

/** Admin dashboard data cache (5 minutes) */
let dashboardCache: { data: AdminDashboardData; ts: number } | null = null;
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

/** Fetch all user profiles + match counts for the admin dashboard */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (dashboardCache && Date.now() - dashboardCache.ts < DASHBOARD_CACHE_TTL) {
    return dashboardCache.data;
  }
  // Step 1: Get all usernames + leaderboard entries + visit data in parallel
  const [usernamesSnap, leaderboardSnap, visitData] = await Promise.all([
    getDocs(collection(db, "usernames")),
    getDocs(collection(db, "leaderboard")),
    getUserVisitData(),
  ]);

  const userEntries = usernamesSnap.docs.map((d) => ({
    username: d.id,
    userId: (d.data() as { userId: string }).userId,
  }));

  const leaderboardMap = new Map<string, Record<string, unknown>>();
  for (const d of leaderboardSnap.docs) {
    leaderboardMap.set(d.id, d.data());
  }

  // Step 2: Build user stats from leaderboard data (no per-user profile fetches!)
  // Only fetch profiles for users WITHOUT leaderboard entries.
  const users: AdminUserStats[] = [];
  let totalMatches = 0;
  const usersNeedingProfile: { username: string; userId: string }[] = [];

  for (const { username, userId } of userEntries) {
    const lb = leaderboardMap.get(userId);
    if (lb) {
      const matchCount = (lb.totalMatches as number) || 0;
      totalMatches += matchCount;
      users.push({
        uid: userId,
        username: (lb.username as string) || username,
        displayName: (lb.displayName as string) || username,
        photoUrl: lb.photoUrl as string | undefined,
        createdAt: (lb.createdAt as string) || (lb.updatedAt as string) || "",
        isPublic: (lb.isPublic as boolean) ?? true,
        matchCount,
        winRate: lb.winRate as number,
        totalWins: lb.totalWins as number,
        totalLosses: lb.totalLosses as number,
        totalDraws: lb.totalDraws as number,
        longestWinStreak: lb.longestWinStreak as number,
        currentStreakType: lb.currentStreakType as "win" | "loss" | null,
        currentStreakCount: lb.currentStreakCount as number,
        topHero: lb.topHero as string,
        topHeroMatches: lb.topHeroMatches as number,
        eventsPlayed: lb.eventsPlayed as number,
        eventWins: lb.eventWins as number,
        ratedMatches: lb.ratedMatches as number,
        ratedWinRate: lb.ratedWinRate as number,
        updatedAt: lb.updatedAt as string,
        weeklyMatches: lb.weeklyMatches as number,
        monthlyMatches: lb.monthlyMatches as number,
      });
    } else {
      usersNeedingProfile.push({ username, userId });
    }
  }

  // Fetch profiles only for users without leaderboard data (typically very few)
  if (usersNeedingProfile.length > 0) {
    const results = await Promise.allSettled(
      usersNeedingProfile.map(async ({ username, userId }) => {
        const profileSnap = await getDoc(doc(db, "users", userId, "profile", "main"));
        if (profileSnap.exists()) {
          const profile = profileSnap.data() as UserProfile;
          return {
            uid: profile.uid,
            username: profile.username || username,
            displayName: profile.displayName,
            photoUrl: profile.photoUrl,
            createdAt: profile.createdAt,
            isPublic: profile.isPublic,
            matchCount: 0,
          } as AdminUserStats;
        }
        return null;
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) users.push(r.value);
    }
  }

  // Step 3: Fetch chat stats for all users
  const chatStatsMap = new Map<string, { messages: number; cost: number; lastAt?: string }>();
  try {
    const chatStatsFetches = await Promise.allSettled(
      userEntries.map(async ({ userId }) => {
        const snap = await getDoc(doc(db, "users", userId, "chatStats", "main"));
        if (snap.exists()) {
          const d = snap.data();
          chatStatsMap.set(userId, {
            messages: (d.totalMessages as number) || 0,
            cost: (d.totalCost as number) || 0,
            lastAt: d.lastMessageAt as string | undefined,
          });
        }
      })
    );
    // Silently ignore individual failures
    void chatStatsFetches;
  } catch {
    // If entire batch fails, continue without chat stats
  }

  // Step 4: Merge visit data + chat stats into user stats
  for (const u of users) {
    u.visitCount = visitData.visits[u.uid] || 0;
    u.lastSiteVisit = visitData.lastVisit[u.uid];
    const cs = chatStatsMap.get(u.uid);
    if (cs) {
      u.chatMessages = cs.messages;
      u.chatCost = cs.cost;
      u.lastChatAt = cs.lastAt;
    }
  }

  // Step 5: Compute time-based stats
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const newUsersThisWeek = users.filter(
    (u) => new Date(u.createdAt).getTime() >= weekAgo
  ).length;
  const newUsersThisMonth = users.filter(
    (u) => new Date(u.createdAt).getTime() >= monthAgo
  ).length;

  const result = {
    totalUsers: users.length,
    totalMatches,
    newUsersThisWeek,
    newUsersThisMonth,
    users,
  };
  dashboardCache = { data: result, ts: Date.now() };
  return result;
}

/** Backfill leaderboard entries for all users (re-computes nemesis, etc.) */
export async function backfillLeaderboard(
  onProgress?: (done: number, total: number) => void
): Promise<{ updated: number; skipped: number; failed: number }> {
  const usernamesSnap = await getDocs(collection(db, "usernames"));
  const userEntries = usernamesSnap.docs.map((d) => ({
    username: d.id,
    userId: (d.data() as { userId: string }).userId,
  }));

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let done = 0;

  const BATCH_SIZE = 25;
  for (let i = 0; i < userEntries.length; i += BATCH_SIZE) {
    const batch = userEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async ({ userId }) => {
        const profileSnap = await getDoc(doc(db, "users", userId, "profile", "main"));
        if (!profileSnap.exists()) return "skip";
        const profile = profileSnap.data() as UserProfile;

        const matchesSnap = await getDocs(
          query(collection(db, "users", userId, "matches"), orderBy("createdAt", "desc"))
        );
        const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as MatchRecord[];

        if (matches.length > 0) {
          await updateLeaderboardEntry(profile, matches);
          return "updated";
        }
        return "skip";
      })
    );

    for (const r of results) {
      done++;
      if (r.status === "fulfilled") {
        if (r.value === "updated") updated++;
        else skipped++;
      } else {
        failed++;
      }
    }
    onProgress?.(done, userEntries.length);
  }

  return { updated, skipped, failed };
}

/** Get the admin user's UID by looking up the "azoni" username doc */
let adminUidCache: { uid: string; ts: number } | null = null;

export async function getAdminUid(): Promise<string | null> {
  if (adminUidCache && Date.now() - adminUidCache.ts < ADMIN_CACHE_TTL) {
    return adminUidCache.uid;
  }
  try {
    const snap = await getDoc(doc(db, "usernames", "azoni"));
    if (!snap.exists()) return null;
    const { userId } = snap.data() as { userId: string };
    adminUidCache = { uid: userId, ts: Date.now() };
    return userId;
  } catch {
    return null;
  }
}

/** Broadcast a message from admin to all target users */
export async function broadcastMessage(
  adminProfile: UserProfile,
  targetUsers: { uid: string; displayName: string; photoUrl?: string; username: string }[],
  messageText: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  let done = 0;

  const BATCH_SIZE = 5;
  for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
    const batch = targetUsers.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (targetUser) => {
        // Build a minimal UserProfile for the target user
        const otherProfile: UserProfile = {
          uid: targetUser.uid,
          displayName: targetUser.displayName,
          photoUrl: targetUser.photoUrl,
          username: targetUser.username,
          createdAt: "",
          isPublic: true,
        };

        const conversationId = await getOrCreateConversation(adminProfile, otherProfile);

        await sendMessage(
          conversationId,
          adminProfile.uid,
          adminProfile.displayName,
          adminProfile.photoUrl,
          messageText,
          true
        );

        await sendMessageNotification(
          targetUser.uid,
          conversationId,
          adminProfile.uid,
          adminProfile.displayName,
          adminProfile.photoUrl,
          messageText
        );
      })
    );

    for (const r of results) {
      done++;
      if (r.status === "fulfilled") sent++;
      else failed++;
    }
    onProgress?.(done, targetUsers.length);
  }

  return { sent, failed };
}

/**
 * Fix match dates that were incorrectly set to the import date.
 *
 * Strategy: group each user's matches by event name (from notes field).
 * Within each event, all matches should share the same date. If there's
 * a clear majority date and some outliers, fix the outliers.
 */
export async function fixMatchDates(
  onProgress?: (done: number, total: number, log: string) => void
): Promise<{ usersChecked: number; matchesFixed: number; usersAffected: number; usersFailed: number }> {
  const usernamesSnap = await getDocs(collection(db, "usernames"));
  const userEntries = usernamesSnap.docs.map((d) => ({
    username: d.id,
    userId: (d.data() as { userId: string }).userId,
  }));

  let usersChecked = 0;
  let matchesFixed = 0;
  let usersAffected = 0;
  let usersFailed = 0;

  const BATCH_SIZE = 25;
  for (let i = 0; i < userEntries.length; i += BATCH_SIZE) {
    const batch = userEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async ({ userId, username }) => {
        const matchesSnap = await getDocs(
          query(collection(db, "users", userId, "matches"), orderBy("createdAt", "desc"))
        );
        if (matchesSnap.empty) return { fixed: 0, username };

        const matches = matchesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as (MatchRecord & { id: string })[];

        // Group matches by event name (first part of notes before " | ")
        const eventGroups = new Map<string, typeof matches>();
        for (const m of matches) {
          const eventName = m.notes?.split(" | ")[0]?.trim() || "";
          if (!eventName) continue;
          const group = eventGroups.get(eventName) ?? [];
          group.push(m);
          eventGroups.set(eventName, group);
        }

        let userFixed = 0;

        for (const [, group] of eventGroups) {
          if (group.length < 2) continue;

          const dateCounts = new Map<string, number>();
          for (const m of group) {
            dateCounts.set(m.date, (dateCounts.get(m.date) || 0) + 1);
          }

          if (dateCounts.size <= 1) continue;

          let majorityDate = "";
          let majorityCount = 0;
          for (const [date, count] of dateCounts) {
            if (count > majorityCount) {
              majorityDate = date;
              majorityCount = count;
            }
          }

          if (majorityCount <= group.length / 2) continue;

          for (const m of group) {
            if (m.date !== majorityDate) {
              await updateDoc(doc(db, "users", userId, "matches", m.id), { date: majorityDate });
              userFixed++;
            }
          }
        }

        if (userFixed > 0) {
          // Re-run leaderboard update for this user
          const profileSnap = await getDoc(doc(db, "users", userId, "profile", "main"));
          if (profileSnap.exists()) {
            const profile = profileSnap.data() as UserProfile;
            const freshMatches = await getDocs(
              query(collection(db, "users", userId, "matches"), orderBy("createdAt", "desc"))
            );
            const allMatches = freshMatches.docs.map((d) => ({ id: d.id, ...d.data() })) as MatchRecord[];
            if (allMatches.length > 0) {
              await updateLeaderboardEntry(profile, allMatches);
            }
          }
        }

        return { fixed: userFixed, username };
      })
    );

    for (const r of results) {
      usersChecked++;
      if (r.status === "fulfilled") {
        if (r.value.fixed > 0) {
          matchesFixed += r.value.fixed;
          usersAffected++;
        }
      } else {
        usersFailed++;
      }
    }
    onProgress?.(usersChecked, userEntries.length, `Batch ${Math.floor(i / BATCH_SIZE) + 1} done — ${matchesFixed} fixes so far`);
  }

  return { usersChecked, matchesFixed, usersAffected, usersFailed };
}

/**
 * Backfill GEM IDs for users who imported via CSV.
 * Re-reads each user's matches to find opponentGemId patterns, and
 * for users whose profile has no gemId, tries to extract it from their
 * match data (the player's own GEM ID appears as opponentGemId on their
 * opponents' records — but we can also look at the username doc for clues).
 *
 * For CSV users specifically, re-parsing the CSV isn't possible from here,
 * so this creates gemIds/{gemId} entries for users who already have a gemId
 * on their profile (set via settings or auto-captured on re-import).
 */
export async function backfillGemIds(
  onProgress?: (done: number, total: number, message?: string) => void
): Promise<{ registered: number; skipped: number; failed: number }> {
  const usernamesSnap = await getDocs(collection(db, "usernames"));
  const userEntries = usernamesSnap.docs.map((d) => ({
    username: d.id,
    userId: (d.data() as { userId: string }).userId,
  }));

  let registered = 0;
  let skipped = 0;
  let failed = 0;
  let done = 0;

  const BATCH_SIZE = 25;
  for (let i = 0; i < userEntries.length; i += BATCH_SIZE) {
    const batch = userEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async ({ userId }) => {
        const profileSnap = await getDoc(doc(db, "users", userId, "profile", "main"));
        if (!profileSnap.exists()) return "skip";
        const profile = profileSnap.data() as UserProfile;

        if (!profile.gemId) return "skip";

        // Check if gemIds doc already exists
        const gemSnap = await getDoc(doc(db, "gemIds", profile.gemId));
        if (gemSnap.exists()) return "skip";

        // Register it
        await setDoc(doc(db, "gemIds", profile.gemId), { userId });
        return "registered";
      })
    );

    for (const r of results) {
      done++;
      if (r.status === "fulfilled") {
        if (r.value === "registered") registered++;
        else skipped++;
      } else {
        failed++;
      }
    }
    onProgress?.(done, userEntries.length, `${registered} GEM IDs registered`);
  }

  return { registered, skipped, failed };
}

/**
 * Backfill match linking across all users with registered GEM IDs.
 * Iterates all users, runs the linking algorithm for each.
 */
export async function backfillMatchLinking(
  onProgress?: (done: number, total: number, message?: string) => void
): Promise<{ usersProcessed: number; totalLinked: number; heroesShared: number; heroesReceived: number; failed: number }> {
  const usernamesSnap = await getDocs(collection(db, "usernames"));
  const userEntries = usernamesSnap.docs.map((d) => ({
    username: d.id,
    userId: (d.data() as { userId: string }).userId,
  }));

  let usersProcessed = 0;
  let totalLinked = 0;
  let heroesShared = 0;
  let heroesReceived = 0;
  let failedCount = 0;
  let done = 0;

  // Process one user at a time to avoid overwhelming Firestore
  for (const { userId } of userEntries) {
    try {
      const matchesSnap = await getDocs(
        query(collection(db, "users", userId, "matches"), orderBy("createdAt", "desc"))
      );
      const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as MatchRecord[];

      // Only process if they have matches with opponentGemId
      const hasGemIds = matches.some((m) => m.opponentGemId);
      if (hasGemIds) {
        const result = await linkMatchesWithOpponents(userId, matches);
        totalLinked += result.linkedCount;
        heroesShared += result.heroesShared;
        heroesReceived += result.heroesReceived;
        if (result.linkedCount > 0) usersProcessed++;
      }
    } catch {
      failedCount++;
    }

    done++;
    if (done % 5 === 0 || done === userEntries.length) {
      onProgress?.(done, userEntries.length, `${totalLinked} matches linked, ${heroesShared + heroesReceived} heroes exchanged`);
    }
  }

  return { usersProcessed, totalLinked, heroesShared, heroesReceived, failed: failedCount };
}

/**
 * Resync H2H records for all users.
 * Iterates all users, fetches their matches, and recomputes H2H entries.
 */
export async function backfillH2H(
  onProgress?: (done: number, total: number, message?: string) => void
): Promise<{ usersProcessed: number; h2hWritten: number; failed: number }> {
  const usernamesSnap = await getDocs(collection(db, "usernames"));
  const userEntries = usernamesSnap.docs.map((d) => ({
    username: d.id,
    userId: (d.data() as { userId: string }).userId,
  }));

  let usersProcessed = 0;
  let h2hWritten = 0;
  let failedCount = 0;
  let done = 0;

  for (const { userId } of userEntries) {
    try {
      const matchesSnap = await getDocs(
        query(collection(db, "users", userId, "matches"), orderBy("createdAt", "desc"))
      );
      const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as MatchRecord[];

      const hasGemIds = matches.some((m) => m.opponentGemId);
      if (hasGemIds) {
        await computeH2HForUser(userId, matches);
        usersProcessed++;
        // Count opponent GEM IDs as approximate H2H pairs written
        const uniqueOpponents = new Set(matches.filter((m) => m.opponentGemId).map((m) => m.opponentGemId));
        h2hWritten += uniqueOpponents.size;
      }
    } catch {
      failedCount++;
    }

    done++;
    if (done % 5 === 0 || done === userEntries.length) {
      onProgress?.(done, userEntries.length, `${usersProcessed} users synced, ~${h2hWritten} H2H pairs`);
    }
  }

  return { usersProcessed, h2hWritten, failed: failedCount };
}
