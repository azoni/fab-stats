import type { WordEntry, PlacedWord, CrosswordPuzzle, Direction } from "./types";
import { seededShuffle } from "@/lib/fabdoku/seeded-random";

interface Placement {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
}

interface GridState {
  width: number;
  height: number;
  grid: (string | null)[][];
  placements: Placement[];
}

function emptyGrid(w: number, h: number): (string | null)[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => null));
}

function canPlace(
  state: GridState,
  word: string,
  row: number,
  col: number,
  dir: Direction,
): boolean {
  const { width, height, grid } = state;
  const len = word.length;
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;

  const endRow = row + dr * (len - 1);
  const endCol = col + dc * (len - 1);
  if (endRow >= height || endCol >= width) return false;
  if (row < 0 || col < 0) return false;

  // Cell before start must be empty/out of bounds
  const br = row - dr;
  const bc = col - dc;
  if (br >= 0 && br < height && bc >= 0 && bc < width && grid[br][bc] !== null) return false;

  // Cell after end must be empty/out of bounds
  const ar = endRow + dr;
  const ac = endCol + dc;
  if (ar >= 0 && ar < height && ac >= 0 && ac < width && grid[ar][ac] !== null) return false;

  let intersections = 0;

  for (let i = 0; i < len; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = grid[r][c];

    if (existing !== null) {
      if (existing !== word[i]) return false;
      intersections++;
    } else {
      // Check perpendicular neighbors are empty (prevent parallel touching)
      if (dir === "across") {
        if (r > 0 && grid[r - 1][c] !== null) return false;
        if (r < height - 1 && grid[r + 1][c] !== null) return false;
      } else {
        if (c > 0 && grid[r][c - 1] !== null) return false;
        if (c < width - 1 && grid[r][c + 1] !== null) return false;
      }
    }
  }

  // First word doesn't need intersection; subsequent words must
  return state.placements.length === 0 || intersections > 0;
}

function placeWord(state: GridState, word: string, clue: string, row: number, col: number, dir: Direction): void {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i++) {
    state.grid[row + dr * i][col + dc * i] = word[i];
  }
  state.placements.push({ word, clue, row, col, direction: dir });
}

function rebuildGrid(state: GridState): void {
  state.grid = emptyGrid(state.width, state.height);
  for (const p of state.placements) {
    const dr = p.direction === "down" ? 1 : 0;
    const dc = p.direction === "across" ? 1 : 0;
    for (let i = 0; i < p.word.length; i++) {
      state.grid[p.row + dr * i][p.col + dc * i] = p.word[i];
    }
  }
}

/** Try to generate a crossword grid. Returns the best result across multiple attempts. */
export function generateGrid(
  words: WordEntry[],
  rng: () => number,
  gridSize: number = 8,
  targetWords: number = 12,
  maxAttempts: number = 80,
): GridState | null {
  let bestGrid: GridState | null = null;
  let bestScore = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffled = seededShuffle(words, rng);
    const candidates = shuffled.slice(0, targetWords * 3);

    const state: GridState = {
      width: gridSize,
      height: gridSize,
      grid: emptyGrid(gridSize, gridSize),
      placements: [],
    };

    // Place first word horizontally near center
    const first = candidates[0];
    if (first.word.length > gridSize) continue;
    const startRow = Math.floor(gridSize / 2);
    const startCol = Math.max(0, Math.floor((gridSize - first.word.length) / 2));
    placeWord(state, first.word, first.clue, startRow, startCol, "across");

    // Try placing remaining words
    for (let wi = 1; wi < candidates.length && state.placements.length < targetWords; wi++) {
      const entry = candidates[wi];
      if (entry.word.length > gridSize) continue;

      // Check we haven't already placed a word with the same answer
      if (state.placements.some((p) => p.word === entry.word)) continue;

      let placed = false;
      const dirs: Direction[] = rng() > 0.5 ? ["down", "across"] : ["across", "down"];

      for (const dir of dirs) {
        if (placed) break;
        // Try positions that would intersect with existing letters
        for (let r = 0; r < gridSize && !placed; r++) {
          for (let c = 0; c < gridSize && !placed; c++) {
            if (canPlace(state, entry.word, r, c, dir)) {
              placeWord(state, entry.word, entry.clue, r, c, dir);
              placed = true;
            }
          }
        }
      }
    }

    const score = state.placements.length;
    if (score > bestScore) {
      bestScore = score;
      bestGrid = JSON.parse(JSON.stringify(state));
    }

    if (bestScore >= targetWords) break;
  }

  return bestGrid;
}

/** Trim grid to bounding box and assign clue numbers. */
export function buildPuzzle(state: GridState, dateStr: string): CrosswordPuzzle {
  // Find bounding box
  let minR = state.height, maxR = 0, minC = state.width, maxC = 0;
  for (let r = 0; r < state.height; r++) {
    for (let c = 0; c < state.width; c++) {
      if (state.grid[r][c] !== null) {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }
    }
  }

  // Add 0 padding (tight fit)
  const width = maxC - minC + 1;
  const height = maxR - minR + 1;

  // Build trimmed solution grid
  const solution: (string | null)[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => state.grid[r + minR][c + minC])
  );

  // Shift placements
  const shifted: Placement[] = state.placements.map((p) => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC,
  }));

  // Assign clue numbers
  const numbers: (number | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );

  let clueNum = 0;
  const numberMap = new Map<string, number>();

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (solution[r][c] === null) continue;
      const key = `${r},${c}`;
      const startsWord = shifted.some(
        (p) => p.row === r && p.col === c
      );
      if (startsWord && !numberMap.has(key)) {
        clueNum++;
        numberMap.set(key, clueNum);
        numbers[r][c] = clueNum;
      }
    }
  }

  const words: PlacedWord[] = shifted.map((p) => ({
    word: p.word,
    clue: p.clue,
    row: p.row,
    col: p.col,
    direction: p.direction,
    number: numberMap.get(`${p.row},${p.col}`) ?? 0,
  }));

  return { date: dateStr, width, height, words, solution, numbers };
}
