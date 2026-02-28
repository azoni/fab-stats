import type { PlayoffFinish } from "./stats";

export type TextColor = "green" | "blue" | "purple" | "gold" | "red";

export type Segment =
  | { type: "text"; content: string }
  | { type: "spoiler"; content: string }
  | { type: "color"; content: string; color: TextColor };

const VALID_COLORS: TextColor[] = ["green", "blue", "purple", "gold"];
const ADMIN_COLORS: TextColor[] = ["red"];

const COLOR_VALUES: Record<TextColor, string> = {
  green: "#4ade80",
  blue: "#38bdf8",
  purple: "#a78bfa",
  gold: "#c9a84c",
  red: "#ef4444",
};

const COLOR_LABELS: Record<TextColor, string> = {
  green: "50+ Matches",
  blue: "Top 8 Finish",
  purple: "Event Champion",
  gold: "Major Champion",
  red: "Admin",
};

export { COLOR_VALUES, COLOR_LABELS };

// Pattern: ||spoiler|| or [green]text[/green] etc.
const FORMAT_REGEX = /(\|\|.+?\|\||\[(?:green|blue|purple|gold|red)\].+?\[\/(?:green|blue|purple|gold|red)\])/g;

/** Parse raw comment text into formatted segments */
export function parseCommentText(text: string): Segment[] {
  const parts = text.split(FORMAT_REGEX);
  const segments: Segment[] = [];

  for (const part of parts) {
    if (!part) continue;

    // Check spoiler: ||content||
    if (part.startsWith("||") && part.endsWith("||") && part.length > 4) {
      segments.push({ type: "spoiler", content: part.slice(2, -2) });
      continue;
    }

    // Check color: [color]content[/color]
    const colorMatch = part.match(/^\[(green|blue|purple|gold|red)\]([\s\S]+?)\[\/\1\]$/);
    if (colorMatch) {
      segments.push({
        type: "color",
        content: colorMatch[2],
        color: colorMatch[1] as TextColor,
      });
      continue;
    }

    // Plain text
    segments.push({ type: "text", content: part });
  }

  return segments;
}

/** Check if text contains any formatting syntax */
export function hasFormatting(text: string): boolean {
  return FORMAT_REGEX.test(text);
}

/** Wrap a text selection with format markers */
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  format: "spoiler" | TextColor
): { text: string; cursorPos: number } {
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);

  let openTag: string;
  let closeTag: string;
  if (format === "spoiler") {
    openTag = "||";
    closeTag = "||";
  } else {
    openTag = `[${format}]`;
    closeTag = `[/${format}]`;
  }

  const newText = before + openTag + selected + closeTag + after;
  // Place cursor after selected text (or between markers if nothing selected)
  const cursorPos = before.length + openTag.length + selected.length;
  return { text: newText, cursorPos };
}

/** Determine which text colors are unlocked for a user */
export function getUnlockedColors(
  totalMatches: number,
  totalTop8s: number,
  playoffFinishes: PlayoffFinish[]
): TextColor[] {
  const colors: TextColor[] = [];

  // Green: 50+ matches
  if (totalMatches >= 50) colors.push("green");

  // Blue: at least one top 8 finish
  if (totalTop8s >= 1) colors.push("blue");

  // Purple: any champion finish
  const hasChampion = playoffFinishes.some((f) => f.type === "champion");
  if (hasChampion) colors.push("purple");

  // Gold: champion at a major event
  const HIGH_TIER = ["The Calling", "Pro Tour", "Worlds", "Nationals"];
  const hasMajorChampion = playoffFinishes.some(
    (f) => f.type === "champion" && HIGH_TIER.includes(f.eventType)
  );
  if (hasMajorChampion) colors.push("gold");

  return colors;
}

export { VALID_COLORS, ADMIN_COLORS };
