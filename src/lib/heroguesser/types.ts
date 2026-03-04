export type ClueResult = "correct" | "partial" | "wrong";
export type NumericClueResult = "correct" | "close" | "wrong";

export interface HeroGuessClues {
  class: ClueResult;
  talent: ClueResult;
  age: "correct" | "wrong";
  life: NumericClueResult;
  intellect: NumericClueResult;
  formats: ClueResult;
}

export interface HeroGuess {
  heroName: string;
  clues: HeroGuessClues;
}

export interface HeroGuesserGameState {
  date: string;
  guesses: HeroGuess[];
  maxGuesses: number;
  completed: boolean;
  won: boolean;
}

export interface HeroGuesserResult {
  date: string;
  won: boolean;
  guessCount: number;
  timestamp: number;
  uid: string;
}

export interface HeroGuesserStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  guessDistribution: Record<number, number>;
}
