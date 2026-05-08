import type { CrosswordPuzzle, PlacedWord, SolvedWordId } from "./types";

export function crosswordWordKey(word: PlacedWord): `${number}:${PlacedWord["direction"]}` {
  return `${word.number}:${word.direction}` as `${number}:${PlacedWord["direction"]}`;
}

export function isCrosswordWordSolved(solvedWords: SolvedWordId[], word: PlacedWord): boolean {
  const key = crosswordWordKey(word);
  return solvedWords.some((id) => id === key || (typeof id === "number" && id === word.number));
}

export function countCrosswordSolvedWords(solvedWords: SolvedWordId[], puzzle: CrosswordPuzzle): number {
  return puzzle.words.filter((word) => isCrosswordWordSolved(solvedWords, word)).length;
}
