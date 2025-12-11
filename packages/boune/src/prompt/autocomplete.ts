import * as tty from "node:tty";

import { readKey, readLine } from "./stdin.ts";
import { color } from "../output/color.ts";

export interface AutocompleteOption<T = string> {
  label: string;
  value: T;
}

export interface AutocompleteOptions<T = string> {
  message: string;
  options: AutocompleteOption<T>[];
  /** Maximum number of visible options */
  limit?: number;
  /** Allow submitting typed value even if it doesn't match any option */
  allowCustom?: boolean;
  /** Initial input value */
  initial?: string;
  /** Custom filter function (default: case-insensitive substring match) */
  filter?: (input: string, option: AutocompleteOption<T>) => boolean;
}

// ANSI escape codes
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_LINE = "\x1b[2K";
const MOVE_UP = (n: number): string => `\x1b[${n}A`;
const MOVE_TO_COL_0 = "\r";
const MOVE_TO_COL = (n: number): string => `\x1b[${n}G`;

/**
 * Default fuzzy filter - case-insensitive substring match
 */
export function defaultFilter<T>(input: string, option: AutocompleteOption<T>): boolean {
  if (!input) return true;
  const lowerInput = input.toLowerCase();
  const lowerLabel = option.label.toLowerCase();

  // Simple fuzzy match: all characters must appear in order
  let inputIdx = 0;
  for (const char of lowerLabel) {
    if (char === lowerInput[inputIdx]) {
      inputIdx++;
      if (inputIdx === lowerInput.length) return true;
    }
  }
  return inputIdx === lowerInput.length;
}

/**
 * Highlight matching characters in label
 */
function highlightMatch(label: string, input: string): string {
  if (!input) return label;

  const lowerInput = input.toLowerCase();
  const lowerLabel = label.toLowerCase();
  let result = "";
  let inputIdx = 0;

  for (let i = 0; i < label.length; i++) {
    const char = label[i]!;
    if (inputIdx < lowerInput.length && lowerLabel[i] === lowerInput[inputIdx]) {
      result += color.cyan(char);
      inputIdx++;
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Render the autocomplete UI
 * Returns the total number of lines rendered (for cleanup on next render)
 *
 * After render, cursor is positioned at the end of the input text on the input line.
 * On subsequent renders, we're already at the input line, so we just move to column 0.
 */
function render<T>(
  input: string,
  cursorIndex: number,
  filteredOptions: AutocompleteOption<T>[],
  limit: number,
  previousLineCount: number,
  isInitialRender: boolean,
): number {
  // On re-render: we're on the input line, move to column 0
  if (!isInitialRender) {
    process.stdout.write(MOVE_TO_COL_0);
  }

  // Input line
  process.stdout.write(CLEAR_LINE);
  const inputLine = color.dim("  › ") + input;
  console.log(inputLine);

  // Options
  const visibleCount = Math.min(filteredOptions.length, limit);
  let lineCount = 1; // Input line

  if (filteredOptions.length === 0 && input) {
    process.stdout.write(CLEAR_LINE);
    console.log(color.dim("    No matches"));
    lineCount++;
  } else {
    for (let i = 0; i < visibleCount; i++) {
      const option = filteredOptions[i]!;
      const isSelected = i === cursorIndex;

      process.stdout.write(CLEAR_LINE);
      const pointer = isSelected ? color.cyan("❯") : " ";
      const label = isSelected ? color.cyan(option.label) : highlightMatch(option.label, input);
      console.log(`  ${pointer} ${label}`);
      lineCount++;
    }

    // Show scroll indicator if there are more options
    if (filteredOptions.length > limit) {
      process.stdout.write(CLEAR_LINE);
      console.log(color.dim(`    ... and ${filteredOptions.length - limit} more`));
      lineCount++;
    }
  }

  // Clear any extra lines from previous render
  const extraLines = previousLineCount > lineCount ? previousLineCount - lineCount : 0;
  for (let i = 0; i < extraLines; i++) {
    process.stdout.write(CLEAR_LINE + "\n");
  }

  // Move cursor back to input line, after the input text
  // After printing lineCount lines via console.log, cursor is at row lineCount
  // We need to go back to row 0 (input line)
  const linesToMoveUp = lineCount + extraLines;
  if (linesToMoveUp > 0) {
    process.stdout.write(MOVE_UP(linesToMoveUp));
  }
  process.stdout.write(MOVE_TO_COL(5 + input.length));

  return lineCount;
}

/**
 * Prompt with autocomplete suggestions
 *
 * @example
 * ```typescript
 * const framework = await autocomplete({
 *   message: "Select a framework:",
 *   options: [
 *     { label: "React", value: "react" },
 *     { label: "Vue", value: "vue" },
 *     { label: "Svelte", value: "svelte" },
 *     { label: "Angular", value: "angular" },
 *   ],
 * });
 * ```
 */
export async function autocomplete<T = string>(
  options: AutocompleteOptions<T>,
): Promise<T | string> {
  const {
    message,
    options: choices,
    limit = 10,
    allowCustom = false,
    initial = "",
    filter = defaultFilter,
  } = options;

  const isTTY = tty.isatty(0);

  // Print message
  console.log(
    color.cyan("? ") +
      color.bold(message) +
      color.dim(" (type to filter, ↑↓ to navigate, enter to select)"),
  );

  if (!isTTY) {
    return autocompleteFallback(options);
  }

  // Show cursor for typing
  process.stdout.write(SHOW_CURSOR);

  let input = initial;
  let cursorIndex = 0;
  let filteredOptions = choices.filter((opt) => filter(input, opt));
  let previousLineCount = 0;

  // Initial render
  previousLineCount = render(input, cursorIndex, filteredOptions, limit, previousLineCount, true);

  // Read keys
  while (true) {
    const key = await readKey();

    if (key.name === "up") {
      if (filteredOptions.length > 0) {
        const maxIdx = Math.min(filteredOptions.length, limit) - 1;
        cursorIndex = cursorIndex > 0 ? cursorIndex - 1 : maxIdx;
        previousLineCount = render(
          input,
          cursorIndex,
          filteredOptions,
          limit,
          previousLineCount,
          false,
        );
      }
    } else if (key.name === "down") {
      if (filteredOptions.length > 0) {
        const maxIdx = Math.min(filteredOptions.length, limit) - 1;
        cursorIndex = cursorIndex < maxIdx ? cursorIndex + 1 : 0;
        previousLineCount = render(
          input,
          cursorIndex,
          filteredOptions,
          limit,
          previousLineCount,
          false,
        );
      }
    } else if (key.name === "return") {
      // We're on the input line - clear from here down
      process.stdout.write(MOVE_TO_COL_0);
      for (let i = 0; i < previousLineCount; i++) {
        process.stdout.write(CLEAR_LINE + "\n");
      }
      process.stdout.write(MOVE_UP(previousLineCount) + MOVE_TO_COL_0);

      if (filteredOptions.length > 0 && cursorIndex < filteredOptions.length) {
        const selected = filteredOptions[cursorIndex]!;
        console.log(color.dim("  ✓ ") + color.cyan(selected.label));
        return selected.value;
      }

      if (allowCustom && input) {
        console.log(color.dim("  ✓ ") + color.cyan(input));
        return input;
      }

      // Re-render if no valid selection (need to select something or have allowCustom)
      previousLineCount = render(input, cursorIndex, filteredOptions, limit, 0, true);
    } else if (key.name === "backspace") {
      if (input.length > 0) {
        input = input.slice(0, -1);
        filteredOptions = choices.filter((opt) => filter(input, opt));
        cursorIndex = 0;
        previousLineCount = render(
          input,
          cursorIndex,
          filteredOptions,
          limit,
          previousLineCount,
          false,
        );
      }
    } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
      // We're on the input line - clear from here down
      process.stdout.write(MOVE_TO_COL_0);
      for (let i = 0; i < previousLineCount; i++) {
        process.stdout.write(CLEAR_LINE + "\n");
      }
      process.stdout.write(MOVE_UP(previousLineCount) + MOVE_TO_COL_0);
      process.exit(0);
    } else if (key.raw.length === 1 && key.raw >= " " && !key.ctrl) {
      // Regular character input
      input += key.raw;
      filteredOptions = choices.filter((opt) => filter(input, opt));
      cursorIndex = 0;
      previousLineCount = render(
        input,
        cursorIndex,
        filteredOptions,
        limit,
        previousLineCount,
        false,
      );
    }
  }
}

/**
 * Fallback for non-TTY environments
 */
async function autocompleteFallback<T>(options: AutocompleteOptions<T>): Promise<T | string> {
  const { options: choices, allowCustom } = options;

  // Print options
  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i]!;
    console.log(`  ${i + 1}. ${choice.label}`);
  }

  const hint = allowCustom ? `1-${choices.length} or type custom value` : `1-${choices.length}`;
  process.stdout.write(color.dim(`  Enter choice (${hint}): `));

  const input = await readLine();
  const trimmed = input.trim();

  // Check if it's a number selection
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= choices.length) {
    return choices[num - 1]!.value;
  }

  // Check for exact label match
  const match = choices.find((c) => c.label.toLowerCase() === trimmed.toLowerCase());
  if (match) {
    return match.value;
  }

  // Allow custom value if enabled
  if (allowCustom && trimmed) {
    return trimmed;
  }

  console.log(color.red(`  Invalid selection`));
  return autocompleteFallback(options);
}
