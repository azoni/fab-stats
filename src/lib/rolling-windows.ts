// Rolling-window date helpers shared by the leaderboard writer, the meta
// aggregations and the Netlify compactor. Kept free of Firebase imports so
// server-side code can pull them in without dragging the client SDK along.

/** Local YYYY-MM-DD string for N days ago */
export function localDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get ISO date string (YYYY-MM-DD) for 7 days ago (rolling week) */
export function getWeekStart(): string {
  return localDateStr(7);
}

/** Get ISO date string (YYYY-MM-DD) for 30 days ago (rolling month) */
export function getMonthStart(): string {
  return localDateStr(30);
}
