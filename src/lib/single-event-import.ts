import { parseGemPaste, type PasteImportEvent } from "./gem-paste-import";

export interface SingleEventImportResult {
  event: PasteImportEvent | null;
  error: string | null;
}

/**
 * Parse a single event pasted from GEM. Delegates to the main parseGemPaste
 * parser and returns the first event found. This ensures both the full import
 * page and the quick "Log" modal use identical parsing logic.
 */
export function parseSingleEventPaste(text: string): SingleEventImportResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length < 3) {
    return { event: null, error: "Not enough text to parse. Please paste the full event details." };
  }

  const result = parseGemPaste(text);

  if (result.events.length === 0) {
    if (result.skippedEventNames.length > 0) {
      return { event: null, error: `Found event "${result.skippedEventNames[0]}" but no match results.` };
    }
    return { event: null, error: "No match results found. Make sure the text includes the match table." };
  }

  return { event: result.events[0], error: null };
}
