/**
 * Prompt schema definitions
 *
 * A single runner interprets these schemas to execute prompts.
 */

import type { CompiledValidator } from "../../validation/compile.ts";

/**
 * Result of parsing raw input
 */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Prompt state passed to renderers
 */
export type PromptState = {
  /** Number of retry attempts so far */
  attempt: number;
  /** Last error message (if retrying) */
  error?: string;
};

/**
 * Base prompt schema - shared by all prompt types
 */
export type BasePromptSchema<T> = {
  /** The message to display */
  message: string;

  /** Default value if input is empty */
  default?: T;

  /** Compiled validator function */
  validator?: CompiledValidator;

  /** Legacy validation function */
  validate?: (value: T) => string | true;

  /** Retry configuration */
  retry?: {
    /** Maximum retry attempts (default: 10) */
    max?: number;
  };

  /** Prefix before the message (default: "? ") */
  prefix?: string;
};

/**
 * Line-based prompt schema (text, password, number, confirm)
 *
 * Uses readline for input.
 */
export type LinePromptSchema<TRaw extends string, TOutput> = BasePromptSchema<TOutput> & {
  /** Input mode */
  inputMode: "line";

  /**
   * Build hint string to display after message
   * @returns Hint text or undefined for no hint
   */
  hint?: () => string | undefined;

  /**
   * Parse raw string input into output type
   * @param raw - Trimmed input string
   * @param isEmpty - Whether input was empty (for default handling)
   * @returns ParseResult with value or error
   */
  parse: (raw: TRaw, isEmpty: boolean) => ParseResult<TOutput>;
};

/**
 * Key-based prompt schema (select, multiselect)
 *
 * Uses raw keypress input for interactive selection.
 */
export type KeyPromptSchema<TOutput> = BasePromptSchema<TOutput> & {
  /** Input mode */
  inputMode: "key";

  /**
   * Initial state for the interactive prompt
   */
  initialState: () => unknown;

  /**
   * Render the current state
   * @param state - Current prompt state
   * @param isInitial - Whether this is the first render
   */
  render: (state: unknown, isInitial: boolean) => void;

  /**
   * Handle a keypress and return new state or result
   * @param key - The key that was pressed
   * @param state - Current state
   * @returns New state, or { done: true, value } when complete
   */
  handleKey: (
    key: { name: string; ctrl: boolean },
    state: unknown,
  ) => { done: false; state: unknown } | { done: true; value: TOutput };

  /**
   * Cleanup function called when prompt completes
   */
  cleanup?: () => void;

  /**
   * Fallback for non-TTY environments
   * If not provided, prompt will error in non-TTY
   */
  fallback?: () => Promise<TOutput>;
};

/**
 * Union of all prompt schema types
 */
export type PromptSchema<T> = LinePromptSchema<string, T> | KeyPromptSchema<T>;

/**
 * Helper to create a line-based prompt schema
 */
export function linePrompt<T>(
  schema: Omit<LinePromptSchema<string, T>, "inputMode">,
): LinePromptSchema<string, T> {
  return { ...schema, inputMode: "line" };
}

/**
 * Helper to create a key-based prompt schema
 */
export function keyPrompt<T>(schema: Omit<KeyPromptSchema<T>, "inputMode">): KeyPromptSchema<T> {
  return { ...schema, inputMode: "key" };
}
