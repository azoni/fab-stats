import { useState, useEffect } from "react";
import { collection, getCountFromServer, getAggregateFromServer, sum } from "firebase/firestore";
import { db } from "@/lib/firebase";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function useCommunityStats() {
  const [userCount, setUserCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    // User count
    const userCacheKey = "fab_user_count";
    const userCached = localStorage.getItem(userCacheKey);
    if (userCached) {
      const { count, ts } = JSON.parse(userCached);
      if (Date.now() - ts < CACHE_TTL) { setUserCount(count); }
      else { fetchUserCount(); }
    } else {
      fetchUserCount();
    }

    // Match count
    const matchCacheKey = "fab_match_count";
    const matchCached = localStorage.getItem(matchCacheKey);
    if (matchCached) {
      const { count, ts } = JSON.parse(matchCached);
      if (Date.now() - ts < CACHE_TTL) { setMatchCount(count); }
      else { fetchMatchTotal(); }
    } else {
      fetchMatchTotal();
    }

    function fetchUserCount() {
      getCountFromServer(collection(db, "usernames"))
        .then((snap) => {
          const count = snap.data().count;
          setUserCount(count);
          localStorage.setItem(userCacheKey, JSON.stringify({ count, ts: Date.now() }));
        })
        .catch(() => {});
    }

    function fetchMatchTotal() {
      getAggregateFromServer(collection(db, "leaderboard"), { total: sum("totalMatches") })
        .then((snap) => {
          const total = snap.data().total;
          setMatchCount(total);
          localStorage.setItem(matchCacheKey, JSON.stringify({ count: total, ts: Date.now() }));
        })
        .catch(() => {});
    }
  }, []);

  return { userCount, matchCount };
}
