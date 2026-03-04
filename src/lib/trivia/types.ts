export interface TriviaAnswer {
  questionId: number;
  selectedIndex: number;
  correct: boolean;
}

export interface TriviaGameState {
  date: string;
  answers: TriviaAnswer[];
  currentQuestion: number;
  completed: boolean;
  won: boolean;
  score: number;
}

export interface TriviaResult {
  date: string;
  won: boolean;
  score: number;
  timestamp: number;
  uid: string;
}

export interface TriviaStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  totalCorrect: number;
}
