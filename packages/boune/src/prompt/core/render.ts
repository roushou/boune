/**
 * Rendering utilities for prompts
 *
 * Provides declarative building blocks for prompt display.
 */

import type { BasePromptSchema } from "./schema.ts";
import { color } from "../../output/color.ts";

/**
 * ANSI escape codes for terminal control
 */
export const ansi = {
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  clearLine: "\x1b[2K",
  moveToColumn0: "\r",
  moveUp: (n: number) => `\x1b[${n}A`,
  moveToColumn: (n: number) => `\x1b[${n}G`,
} as const;

/**
 * Default prompt prefix
 */
export const DEFAULT_PREFIX = "? ";

/**
 * Render the main prompt line
 *
 * Format: [prefix][message][hint][default]
 *
 * @example
 * renderPromptLine({ message: "Name?", default: "John" })
 * // "? Name? (John) "
 */
export function renderPromptLine<T>(
  schema: BasePromptSchema<T>,
  options?: {
    hint?: string;
    suffix?: string;
  },
): string {
  const prefix = schema.prefix ?? DEFAULT_PREFIX;
  const parts: string[] = [];

  // Prefix (colored)
  parts.push(color.cyan(prefix));

  // Message (bold)
  parts.push(color.bold(schema.message));

  // Hint (dim, in brackets)
  if (options?.hint) {
    parts.push(color.dim(` [${options.hint}]`));
  }

  // Default value (dim, in parens)
  if (schema.default !== undefined) {
    parts.push(color.dim(` (${String(schema.default)})`));
  }

  // Suffix (usually just space)
  parts.push(options?.suffix ?? " ");

  return parts.join("");
}

/**
 * Render an error message
 */
export function renderError(message: string): string {
  return color.red(`  ${message}`);
}

/**
 * Render a success indicator with value
 */
export function renderSuccess(value: string): string {
  return color.dim("  ✓ ") + color.cyan(value);
}

/**
 * Clear N lines above current position
 */
export function clearLines(count: number): void {
  if (count <= 0) return;
  process.stdout.write(ansi.moveUp(count) + ansi.moveToColumn0);
  for (let i = 0; i < count; i++) {
    process.stdout.write(ansi.clearLine + "\n");
  }
  process.stdout.write(ansi.moveUp(count) + ansi.moveToColumn0);
}
