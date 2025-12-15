/**
 * Prompt error types
 */

/**
 * Error thrown when a prompt is cancelled by the user (Escape or Ctrl+C)
 *
 * @example
 * ```typescript
 * import { select, PromptCancelledError } from "boune/prompt";
 *
 * try {
 *   const choice = await select({ message: "Pick one", options: [...] });
 * } catch (error) {
 *   if (error instanceof PromptCancelledError) {
 *     console.log("User cancelled the prompt");
 *     process.exit(0);
 *   }
 *   throw error;
 * }
 * ```
 */
export class PromptCancelledError extends Error {
  override readonly name = "PromptCancelledError";

  constructor(message = "Prompt was cancelled") {
    super(message);
    // Maintains proper stack trace in V8 environments
    Error.captureStackTrace?.(this, PromptCancelledError);
  }
}

/**
 * Error thrown when a prompt exceeds maximum retry attempts
 */
export class PromptMaxRetriesError extends Error {
  override readonly name = "PromptMaxRetriesError";
  readonly attempts: number;

  constructor(attempts: number) {
    super(`Prompt exceeded maximum retries (${attempts})`);
    this.attempts = attempts;
    Error.captureStackTrace?.(this, PromptMaxRetriesError);
  }
}
