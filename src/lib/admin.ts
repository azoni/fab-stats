import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { updateLeaderboardEntry } from "./leaderboard";
import { getOrCreateConversation, sendMessage, sendMessageNotification } from "./messages";
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
  // Step 1: Get all usernames + leaderboard entries in parallel (2 queries total)
  const [usernamesSnap, leaderboardSnap] = await Promise.all([
    getDocs(collection(db, "usernames")),
    getDocs(collection(db, "leaderboard")),
  ]);

  const userEntries = usernamesSnap.docs.map((d) => ({
    username: d.id,
    userId: (d.data() as { userId: string }).userId,
  }));

  const leaderboardMap = new Map<string, Record<string, unknown>>();
  for (const d of leaderboardSnap.docs) {
    leaderboardMap.set(d.id, d.data());
  }

  // Step 2: Fetch each profile (no more per-user getCountFromServer!)
  // Match counts come from leaderboard entries instead.
  const users: AdminUserStats[] = [];
  let totalMatches = 0;

  const results = await Promise.allSettled(
    userEntries.map(async ({ username, userId }) => {
      const profileSnap = await getDoc(doc(db, "users", userId, "profile", "main"));

      // Use leaderboard totalMatches instead of aggregation query
      const lb = leaderboardMap.get(userId);
      const matchCount = lb ? (lb.totalMatches as number) || 0 : 0;
      totalMatches += matchCount;

      if (profileSnap.exists()) {
        const profile = profileSnap.data() as UserProfile;
        const stats: AdminUserStats = {
          uid: profile.uid,
          username: profile.username || username,
          displayName: profile.displayName,
          photoUrl: profile.photoUrl,
          createdAt: profile.createdAt,
          isPublic: profile.isPublic,
          matchCount,
        };
        if (lb) {
          stats.winRate = lb.winRate as number;
          stats.totalWins = lb.totalWins as number;
          stats.totalLosses = lb.totalLosses as number;
          stats.totalDraws = lb.totalDraws as number;
          stats.longestWinStreak = lb.longestWinStreak as number;
          stats.currentStreakType = lb.currentStreakType as "win" | "loss" | null;
          stats.currentStreakCount = lb.currentStreakCount as number;
          stats.topHero = lb.topHero as string;
          stats.topHeroMatches = lb.topHeroMatches as number;
          stats.eventsPlayed = lb.eventsPlayed as number;
          stats.eventWins = lb.eventWins as number;
          stats.ratedMatches = lb.ratedMatches as number;
          stats.ratedWinRate = lb.ratedWinRate as number;
          stats.updatedAt = lb.updatedAt as string;
        }
        return stats;
      }
      return null;
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      users.push(result.value);
    }
  }

  // Step 3: Compute time-based stats
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
