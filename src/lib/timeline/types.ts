export interface TimelineItem {
  id: number;
  label: string;
  date: string; // "YYYY-MM-DD"
  category: "set" | "hero" | "tournament" | "ban" | "milestone";
}

export interface TimelinePlacement {
  itemId: number;
  position: number; // where user placed it
  correct: boolean;
}

export interface TimelineGameState {
  date: string;
  placements: TimelinePlacement[];
  currentItem: number; // index into the daily items array
  completed: boolean;
  won: boolean;
  lives: number;
}

export interface TimelineResult {
  date: string;
  won: boolean;
  livesRemaining: number;
  correctPlacements: number;
  timestamp: number;
  uid: string;
}

export interface TimelineStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  totalCorrect: number;
}
