/**
 * Terminal progress bar for tracking task progress
 */

import { color } from "./color.ts";

export interface ProgressBarOptions {
  /** Total number of steps (default: 100) */
  total?: number;
  /** Width of the progress bar in characters (default: 40) */
  width?: number;
  /** Character for completed portion (default: "█") */
  complete?: string;
  /** Character for incomplete portion (default: "░") */
  incomplete?: string;
  /** Show percentage (default: true) */
  showPercent?: boolean;
  /** Show count (e.g., "5/10") (default: true) */
  showCount?: boolean;
}

export interface ProgressBar {
  /** Update progress to a specific value */
  update(current: number, text?: string): ProgressBar;
  /** Increment progress by a given amount (default: 1) */
  increment(amount?: number, text?: string): ProgressBar;
  /** Complete the progress bar */
  complete(text?: string): ProgressBar;
  /** Fail the progress bar */
  fail(text?: string): ProgressBar;
  /** Stop and clear the progress bar */
  stop(): ProgressBar;
}

/**
 * Create a progress bar for tracking task progress
 *
 * @example
 * ```typescript
 * const progress = createProgressBar("Processing", { total: 10 });
 * for (let i = 0; i < 10; i++) {
 *   await processItem(i);
 *   progress.increment();
 * }
 * progress.complete("All items processed");
 * ```
 */
export function createProgressBar(text: string, options?: ProgressBarOptions): ProgressBar {
  const total = options?.total ?? 100;
  const width = options?.width ?? 40;
  const completeChar = options?.complete ?? "█";
  const incompleteChar = options?.incomplete ?? "░";
  const showPercent = options?.showPercent ?? true;
  const showCount = options?.showCount ?? true;

  let current = 0;
  let currentText = text;
  let stopped = false;

  function render(): void {
    if (stopped) return;

    const percent = Math.min(100, Math.round((current / total) * 100));
    const filledWidth = Math.round((current / total) * width);
    const emptyWidth = width - filledWidth;

    const bar = completeChar.repeat(filledWidth) + incompleteChar.repeat(emptyWidth);

    const parts: string[] = [color.cyan(bar)];

    if (showPercent) {
      parts.push(color.gray(`${percent.toString().padStart(3)}%`));
    }

    if (showCount) {
      parts.push(color.gray(`(${current}/${total})`));
    }

    parts.push(currentText);

    process.stdout.write(`\r${parts.join(" ")}`);
  }

  function clearLine(): void {
    const clearWidth = width + currentText.length + 30;
    process.stdout.write(`\r${" ".repeat(clearWidth)}\r`);
  }

  return {
    update(value: number, newText?: string): ProgressBar {
      current = Math.max(0, Math.min(total, value));
      if (newText !== undefined) {
        currentText = newText;
      }
      render();
      return this;
    },

    increment(amount = 1, newText?: string): ProgressBar {
      return this.update(current + amount, newText);
    },

    complete(finalText?: string): ProgressBar {
      stopped = true;
      clearLine();
      console.log(`${color.green("✓")} ${finalText ?? currentText}`);
      return this;
    },

    fail(finalText?: string): ProgressBar {
      stopped = true;
      clearLine();
      console.log(`${color.red("✗")} ${finalText ?? currentText}`);
      return this;
    },

    stop(): ProgressBar {
      stopped = true;
      clearLine();
      return this;
    },
  };
}
