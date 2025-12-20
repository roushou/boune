/**
 * Shared stdin reader utility using process.stdin directly
 */

import * as readline from "node:readline";
import * as tty from "node:tty";

let readCount = 0;
let rl: readline.Interface | null = null;

/**
 * Get or create readline interface for line-based input
 */
function getReadline(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
  }
  return rl;
}

/**
 * Read a single line from stdin
 */
export function readLine(): Promise<string> {
  readCount++;

  return new Promise((resolve) => {
    const rlInterface = getReadline();

    const onLine = (line: string): void => {
      rlInterface.removeListener("line", onLine);
      rlInterface.removeListener("close", onClose);
      resolve(line);
    };

    const onClose = (): void => {
      rlInterface.removeListener("line", onLine);
      rlInterface.removeListener("close", onClose);
      resolve("");
    };

    rlInterface.once("line", onLine);
    rlInterface.once("close", onClose);
  });
}

/**
 * Read a line with masked output (for passwords)
 * @param mask - Character to display instead of actual input (e.g., "*")
 */
export async function readMaskedLine(mask: string): Promise<string> {
  readCount++;

  const stdin = process.stdin;
  const isTTY = tty.isatty(0);

  // Fallback for non-TTY: just read a line (no masking possible)
  if (!isTTY) {
    return readLine();
  }

  // Close readline interface before using raw mode
  if (rl) {
    rl.close();
    rl = null;
  }

  let input = "";

  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve) => {
    const onData = (data: Buffer): void => {
      const char = data.toString();

      // Enter key - done
      if (char === "\r" || char === "\n") {
        stdin.removeListener("data", onData);
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write("\n");
        resolve(input);
        return;
      }

      // Ctrl+C - cancel
      if (char === "\x03") {
        stdin.removeListener("data", onData);
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write("\n");
        process.exit(130);
      }

      // Backspace
      if (char === "\x7f" || char === "\b") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          // Move cursor back, overwrite with space, move back again
          process.stdout.write("\b \b");
        }
        return;
      }

      // Ignore other control characters and escape sequences
      if (char.charCodeAt(0) < 32 || char.startsWith("\x1b")) {
        return;
      }

      // Regular character
      input += char;
      process.stdout.write(mask);
    };

    stdin.on("data", onData);
  });
}

/**
 * Key event from raw keypress reading
 */
export interface KeyPress {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  raw: string;
}

/**
 * Parse raw input bytes into a KeyPress event
 */
function parseKeyPress(data: Buffer): KeyPress {
  const raw = data.toString();
  let name = raw;
  let ctrl = false;
  const meta = false;
  const shift = false;

  // Handle escape sequences (arrow keys, etc.)
  if (raw === "\x1b[A" || raw === "\x1bOA") {
    name = "up";
  } else if (raw === "\x1b[B" || raw === "\x1bOB") {
    name = "down";
  } else if (raw === "\x1b[C" || raw === "\x1bOC") {
    name = "right";
  } else if (raw === "\x1b[D" || raw === "\x1bOD") {
    name = "left";
  } else if (raw === "\r" || raw === "\n") {
    name = "return";
  } else if (raw === "\x1b" || raw === "\x1b\x1b") {
    name = "escape";
  } else if (raw === " ") {
    name = "space";
  } else if (raw === "\x7f" || raw === "\b") {
    name = "backspace";
  } else if (raw === "\t") {
    name = "tab";
  } else if (raw.length === 1) {
    const code = raw.charCodeAt(0);
    // Ctrl+letter (0x01-0x1a maps to a-z)
    if (code >= 1 && code <= 26) {
      ctrl = true;
      name = String.fromCharCode(code + 96); // Convert to letter
    } else {
      name = raw;
    }
  }

  return { name, ctrl, meta, shift, raw };
}

/**
 * Read a single keypress in raw mode
 */
export async function readKey(): Promise<KeyPress> {
  readCount++;

  const stdin = process.stdin;
  const isTTY = tty.isatty(0);

  if (!isTTY) {
    // Fallback for non-TTY: read a line and return first char as key
    const line = await readLine();
    return parseKeyPress(Buffer.from(line.slice(0, 1) || "\n"));
  }

  // Close readline interface before using raw mode to avoid conflicts
  if (rl) {
    rl.close();
    rl = null;
  }

  // Enable raw mode
  if (stdin.isTTY) {
    stdin.setRawMode(true);
  }
  stdin.resume();

  return new Promise((resolve) => {
    const onData = (data: Buffer): void => {
      stdin.removeListener("data", onData);
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();
      resolve(parseKeyPress(data));
    };

    stdin.once("data", onData);
  });
}

/**
 * Close the stdin reader to allow the process to exit
 */
export function closeStdin(): void {
  if (rl) {
    rl.close();
    rl = null;
  }
  readCount = 0;

  // Ensure stdin is paused and not in raw mode
  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch {
      // Ignore errors if already closed
    }
  }
  process.stdin.pause();
}

/**
 * Check if stdin has been used
 */
export function hasUsedStdin(): boolean {
  return readCount > 0;
}
