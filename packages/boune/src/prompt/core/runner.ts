/**
 * Prompt runner - interprets prompt schemas
 *
 * This is the single execution engine for all prompt types.
 * Prompts define what they need declaratively; the runner handles how.
 */

import * as tty from "node:tty";
import type { KeyPromptSchema, LinePromptSchema, PromptSchema } from "./schema.ts";
import { readKey, readLine } from "../stdin.ts";
import { renderError, renderPromptLine } from "./render.ts";
import { PromptMaxRetriesError } from "./errors.ts";

/**
 * Default maximum retry attempts
 */
const DEFAULT_MAX_RETRIES = 10;

/**
 * Run any prompt schema and return the result
 */
export async function runPrompt<T>(schema: PromptSchema<T>): Promise<T> {
  if (schema.inputMode === "line") {
    return runLinePrompt(schema);
  } else {
    return runKeyPrompt(schema);
  }
}

/**
 * Run a line-based prompt (text, password, number, confirm)
 */
async function runLinePrompt<T>(schema: LinePromptSchema<string, T>): Promise<T> {
  const maxRetries = schema.retry?.max ?? DEFAULT_MAX_RETRIES;
  let attempt = 0;

  while (attempt < maxRetries) {
    // Build and display prompt
    const hint = schema.hint?.();
    const promptLine = renderPromptLine(schema, { hint });
    process.stdout.write(promptLine);

    // Read input
    const raw = await readLine();
    const trimmed = raw.trim();
    const isEmpty = trimmed === "";

    // Handle empty input with default
    if (isEmpty && schema.default !== undefined) {
      return schema.default;
    }

    // Parse input
    const parseResult = schema.parse(trimmed, isEmpty);
    if (!parseResult.ok) {
      console.log(renderError(parseResult.error));
      attempt++;
      continue;
    }

    const value = parseResult.value;

    // Run validator
    if (schema.validator) {
      const validation = schema.validator.validate(value);
      if (validation !== true) {
        console.log(renderError(validation));
        attempt++;
        continue;
      }
    }

    // Run legacy validate function
    if (schema.validate) {
      const validation = schema.validate(value);
      if (validation !== true) {
        console.log(renderError(validation));
        attempt++;
        continue;
      }
    }

    return value;
  }

  throw new PromptMaxRetriesError(maxRetries);
}

/**
 * Run a key-based prompt (select, multiselect)
 */
async function runKeyPrompt<T>(schema: KeyPromptSchema<T>): Promise<T> {
  const isTTY = tty.isatty(0);

  // Use fallback for non-TTY environments
  if (!isTTY) {
    if (schema.fallback) {
      return schema.fallback();
    }
    throw new Error("This prompt requires an interactive terminal (TTY)");
  }

  // Initialize state
  let state = schema.initialState();

  // Initial render
  schema.render(state, true);

  // Key input loop
  while (true) {
    const key = await readKey();

    const result = schema.handleKey(key, state);

    if (result.done) {
      // Cleanup and return
      schema.cleanup?.();
      return result.value;
    }

    // Update state and re-render
    state = result.state;
    schema.render(state, false);
  }
}
