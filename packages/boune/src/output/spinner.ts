/**
 * Terminal spinner for async operations
 */

import { color } from "./color.ts";

type ColorName = keyof typeof color;

export type SpinnerOptions = {
  spinnerColor?: ColorName;
  successColor?: ColorName;
  failColor?: ColorName;
};

export interface Spinner {
  start(): Spinner;
  stop(finalText?: string): Spinner;
  succeed(message?: string): Spinner;
  fail(message?: string): Spinner;
}

/**
 * Create a spinner for async operations
 *
 * @example
 * ```typescript
 * const spinner = createSpinner("Loading...").start();
 * await someAsyncTask();
 * spinner.succeed("Done!");
 * ```
 */
export function createSpinner(text: string, options: SpinnerOptions = {}): Spinner {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const spinnerColor = color[options.spinnerColor ?? "cyan"];
  const successColor = color[options.successColor ?? "green"];
  const failColor = color[options.failColor ?? "red"];

  let frameIndex = 0;
  let interval: ReturnType<typeof setInterval> | null = null;

  return {
    start(): Spinner {
      interval = setInterval(() => {
        process.stdout.write(`\r${spinnerColor(frames[frameIndex % frames.length]!)} ${text}`);
        frameIndex++;
      }, 80);
      return this;
    },
    stop(finalText?: string): Spinner {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      process.stdout.write(`\r${" ".repeat(text.length + 4)}\r`);
      if (finalText) {
        console.log(finalText);
      }
      return this;
    },
    succeed(message?: string): Spinner {
      return this.stop(`${successColor("✓")} ${message ?? text}`);
    },
    fail(message?: string): Spinner {
      return this.stop(`${failColor("✗")} ${message ?? text}`);
    },
  };
}
