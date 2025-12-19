/**
 * Live-updating terminal output
 * Multiple lines that can be rewritten in place
 */

import { color } from "./color.ts";

export type DraftLine = {
  /** Update this line's content */
  update(text: string): void;
  /** Mark as done with success */
  done(text?: string): void;
  /** Mark as failed */
  fail(text?: string): void;
  /** Mark with warning */
  warn(text?: string): void;
  /** Clear this line */
  clear(): void;
};

export type Draft = {
  /** Add a new line and return a handle to update it */
  addLine(text: string): DraftLine;
  /** Update all lines and render */
  render(): void;
  /** Stop updating and finalize output */
  stop(): void;
  /** Clear all lines */
  clear(): void;
};

type LineState = {
  text: string;
  status: "pending" | "done" | "fail" | "warn";
  originalText: string;
};

const CLEAR_LINE = "\x1b[2K";
const MOVE_UP = "\x1b[1A";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

function formatLine(state: LineState): string {
  switch (state.status) {
    case "done":
      return `${color.green("✓")} ${state.text}`;
    case "fail":
      return `${color.red("✗")} ${state.text}`;
    case "warn":
      return `${color.yellow("⚠")} ${state.text}`;
    default:
      return `  ${state.text}`;
  }
}

/**
 * Create a draft for live-updating multi-line output
 *
 * @example
 * ```ts
 * import { createDraft } from "boune";
 *
 * const draft = createDraft();
 *
 * const line1 = draft.addLine("Downloading assets...");
 * const line2 = draft.addLine("Compiling...");
 * const line3 = draft.addLine("Deploying...");
 *
 * // Update lines independently
 * line1.update("Downloading assets: 45%");
 * line1.update("Downloading assets: 100%");
 * line1.done("Assets downloaded");
 *
 * line2.fail("Compilation failed");
 *
 * // Finalize output
 * draft.stop();
 * ```
 *
 * @example
 * ```ts
 * // Parallel downloads like docker pull
 * const draft = createDraft();
 *
 * const layers = [
 *   draft.addLine("layer 1: waiting..."),
 *   draft.addLine("layer 2: waiting..."),
 *   draft.addLine("layer 3: waiting..."),
 * ];
 *
 * // Update as downloads progress
 * layers[0].update("layer 1: ████████░░ 80%");
 * layers[1].update("layer 2: ██████░░░░ 60%");
 *
 * // Mark complete
 * layers[0].done("layer 1: complete");
 * ```
 */
export function createDraft(): Draft {
  const lines: LineState[] = [];
  let lineCount = 0;
  let stopped = false;

  function render(): void {
    if (stopped) return;

    // Move cursor up to overwrite previous output
    if (lineCount > 0) {
      process.stdout.write(MOVE_UP.repeat(lineCount));
    }

    // Write each line
    for (const line of lines) {
      process.stdout.write(CLEAR_LINE);
      console.log(formatLine(line));
    }

    lineCount = lines.length;
  }

  function createLineHandle(index: number): DraftLine {
    return {
      update(text: string): void {
        if (stopped) return;
        const line = lines[index];
        if (line && line.status === "pending") {
          line.text = text;
          render();
        }
      },
      done(text?: string): void {
        if (stopped) return;
        const line = lines[index];
        if (line) {
          line.status = "done";
          line.text = text ?? line.originalText;
          render();
        }
      },
      fail(text?: string): void {
        if (stopped) return;
        const line = lines[index];
        if (line) {
          line.status = "fail";
          line.text = text ?? line.originalText;
          render();
        }
      },
      warn(text?: string): void {
        if (stopped) return;
        const line = lines[index];
        if (line) {
          line.status = "warn";
          line.text = text ?? line.originalText;
          render();
        }
      },
      clear(): void {
        if (stopped) return;
        const line = lines[index];
        if (line) {
          line.text = "";
          render();
        }
      },
    };
  }

  // Hide cursor while draft is active
  process.stdout.write(HIDE_CURSOR);

  // Show cursor on exit
  const cleanup = (): void => {
    process.stdout.write(SHOW_CURSOR);
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  return {
    addLine(text: string): DraftLine {
      if (stopped) {
        throw new Error("Cannot add lines to a stopped draft");
      }
      const index = lines.length;
      lines.push({
        text,
        originalText: text,
        status: "pending",
      });
      render();
      return createLineHandle(index);
    },

    render,

    stop(): void {
      if (stopped) return;
      stopped = true;
      process.stdout.write(SHOW_CURSOR);
      process.removeListener("exit", cleanup);
    },

    clear(): void {
      if (stopped) return;
      // Move up and clear all lines
      if (lineCount > 0) {
        process.stdout.write(MOVE_UP.repeat(lineCount));
        for (let i = 0; i < lineCount; i++) {
          process.stdout.write(CLEAR_LINE + "\n");
        }
        process.stdout.write(MOVE_UP.repeat(lineCount));
      }
      lines.length = 0;
      lineCount = 0;
    },
  };
}
