import * as path from "node:path";
import * as tty from "node:tty";
import { readKey, readLine } from "./stdin.ts";
import { PromptCancelledError } from "./core/errors.ts";
import { color } from "../output/color.ts";

export interface FilepathOptions {
  message: string;
  /** Starting directory (default: cwd) */
  basePath?: string;
  /** Filter by file extensions (e.g., [".ts", ".json"]) */
  extensions?: string[];
  /** Only allow directory selection */
  directoryOnly?: boolean;
  /** Only allow file selection */
  fileOnly?: boolean;
  /** Allow selecting non-existent paths (for creating new files) */
  allowNew?: boolean;
  /** Show hidden files (dotfiles) */
  showHidden?: boolean;
  /** Maximum visible items */
  limit?: number;
  /** Custom validation */
  validate?: (filepath: string) => string | true;
}

export interface Entry {
  name: string;
  isDirectory: boolean;
  fullPath: string;
}

// ANSI escape codes
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_LINE = "\x1b[2K";
const MOVE_UP = (n: number): string => `\x1b[${n}A`;
const MOVE_TO_COL_0 = "\r";
const MOVE_TO_COL = (n: number): string => `\x1b[${n}G`;

/**
 * Build glob pattern for extensions
 */
function buildExtensionPattern(extensions?: string[]): string {
  if (!extensions || extensions.length === 0) return "*";
  if (extensions.length === 1) return `*${extensions[0]}`;
  const exts = extensions.map((e) => e.replace(/^\./, "")).join(",");
  return `*.{${exts}}`;
}

/**
 * Read directory entries using Bun.Glob
 */
function readEntries(dirPath: string, options: FilepathOptions): Entry[] {
  const { extensions, directoryOnly, fileOnly, showHidden } = options;

  try {
    const result: Entry[] = [];

    // Scan for directories (if not fileOnly)
    if (!fileOnly) {
      const dirGlob = new Bun.Glob("*/");
      for (const entry of dirGlob.scanSync({ cwd: dirPath, dot: showHidden })) {
        const name = entry.replace(/\/$/, "");
        result.push({
          name,
          isDirectory: true,
          fullPath: path.join(dirPath, name),
        });
      }
    }

    // Scan for files (if not directoryOnly)
    if (!directoryOnly) {
      const pattern = buildExtensionPattern(extensions);
      const fileGlob = new Bun.Glob(pattern);
      for (const entry of fileGlob.scanSync({ cwd: dirPath, dot: showHidden, onlyFiles: true })) {
        // Skip if it contains a slash (subdirectory match)
        if (entry.includes("/")) continue;
        result.push({
          name: entry,
          isDirectory: false,
          fullPath: path.join(dirPath, entry),
        });
      }
    }

    // Sort: directories first, then alphabetically
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  } catch {
    return [];
  }
}

/**
 * Filter entries by input text
 */
export function filterEntries(entries: Entry[], input: string): Entry[] {
  if (!input) return entries;
  const lower = input.toLowerCase();
  return entries.filter((e) => e.name.toLowerCase().includes(lower));
}

/**
 * Sort entries: directories first, then alphabetically
 */
export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Check if filename is hidden (starts with dot)
 */
export function isHidden(name: string): boolean {
  return name.startsWith(".");
}

/**
 * Check if filename matches any of the given extensions
 */
export function matchesExtension(name: string, extensions: string[]): boolean {
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
  return extensions.some((e) => e.toLowerCase() === ext);
}

/**
 * Get icon for entry
 */
function getIcon(entry: Entry): string {
  if (entry.isDirectory) return "📁";
  const ext = path.extname(entry.name).toLowerCase();
  const icons: Record<string, string> = {
    ".ts": "📘",
    ".tsx": "📘",
    ".js": "📒",
    ".jsx": "📒",
    ".json": "📋",
    ".md": "📝",
    ".yaml": "⚙️",
    ".yml": "⚙️",
    ".toml": "⚙️",
    ".env": "🔒",
    ".gitignore": "🙈",
    ".sh": "⚡",
    ".css": "🎨",
    ".html": "🌐",
  };
  return icons[ext] || "📄";
}

/**
 * Render the filepath UI
 */
function render(
  currentPath: string,
  input: string,
  entries: Entry[],
  cursorIndex: number,
  limit: number,
  previousLineCount: number,
  isInitialRender: boolean,
  options: FilepathOptions,
): number {
  // On re-render: we're on the input line, move to column 0
  if (!isInitialRender) {
    process.stdout.write(MOVE_TO_COL_0);
  }

  // Calculate relative path display
  const basePath = options.basePath || process.cwd();
  const relativePath = path.relative(basePath, currentPath) || ".";

  // Input line with current path
  process.stdout.write(CLEAR_LINE);
  const pathDisplay = color.dim(`  ${relativePath}/`);
  console.log(pathDisplay + input);

  let lineCount = 1;

  // Show parent directory option if not at base
  const canGoUp = currentPath !== basePath && currentPath !== path.parse(currentPath).root;

  if (entries.length === 0 && !canGoUp) {
    process.stdout.write(CLEAR_LINE);
    console.log(color.dim("    (empty)"));
    lineCount++;
  } else {
    // Calculate visible window
    const totalItems = (canGoUp ? 1 : 0) + entries.length;
    let startIdx = 0;
    const adjustedCursor = cursorIndex;

    if (totalItems > limit) {
      // Scroll window to keep cursor visible
      const halfLimit = Math.floor(limit / 2);
      if (adjustedCursor > halfLimit) {
        startIdx = Math.min(adjustedCursor - halfLimit, totalItems - limit);
      }
    }

    let renderedCount = 0;
    let itemIndex = 0;

    // Parent directory option
    if (canGoUp) {
      if (itemIndex >= startIdx && renderedCount < limit) {
        const isSelected = cursorIndex === 0;
        process.stdout.write(CLEAR_LINE);
        const pointer = isSelected ? color.cyan("❯") : " ";
        const label = isSelected ? color.cyan("..") : "..";
        console.log(`  ${pointer} 📁 ${label}`);
        lineCount++;
        renderedCount++;
      }
      itemIndex++;
    }

    // Entries
    for (const entry of entries) {
      if (itemIndex >= startIdx && renderedCount < limit) {
        const isSelected = cursorIndex === itemIndex;
        process.stdout.write(CLEAR_LINE);
        const pointer = isSelected ? color.cyan("❯") : " ";
        const icon = getIcon(entry);
        const name = isSelected ? color.cyan(entry.name) : entry.name;
        const suffix = entry.isDirectory ? "/" : "";
        console.log(`  ${pointer} ${icon} ${name}${suffix}`);
        lineCount++;
        renderedCount++;
      }
      itemIndex++;
    }

    // Scroll indicators
    if (totalItems > limit) {
      process.stdout.write(CLEAR_LINE);
      const showing = `${startIdx + 1}-${Math.min(startIdx + limit, totalItems)}`;
      console.log(color.dim(`    (${showing} of ${totalItems})`));
      lineCount++;
    }
  }

  // Clear extra lines from previous render
  const extraLines = previousLineCount > lineCount ? previousLineCount - lineCount : 0;
  for (let i = 0; i < extraLines; i++) {
    process.stdout.write(CLEAR_LINE + "\n");
  }

  // Move cursor back to input line
  const linesToMoveUp = lineCount + extraLines;
  if (linesToMoveUp > 0) {
    process.stdout.write(MOVE_UP(linesToMoveUp));
  }
  // Position after the path prefix + input
  const col = 2 + relativePath.length + 1 + input.length + 1;
  process.stdout.write(MOVE_TO_COL(col));

  return lineCount;
}

/**
 * Prompt for file/directory selection
 *
 * @example
 * ```typescript
 * const file = await filepath({
 *   message: "Select a config file:",
 *   basePath: "./configs",
 *   extensions: [".json", ".yaml"],
 * });
 * ```
 */
export async function filepath(options: FilepathOptions): Promise<string> {
  const { message, basePath = process.cwd(), allowNew = false, limit = 10, validate } = options;

  const isTTY = tty.isatty(0);

  // Print message
  console.log(
    color.cyan("? ") +
      color.bold(message) +
      color.dim(" (↑↓ navigate, enter select, type to filter)"),
  );

  if (!isTTY) {
    return filepathFallback(options);
  }

  process.stdout.write(SHOW_CURSOR);

  let currentPath = path.resolve(basePath);
  let input = "";
  let cursorIndex = 0;
  let previousLineCount = 0;

  const getEntries = (): Entry[] => {
    const all = readEntries(currentPath, options);
    return filterEntries(all, input);
  };

  let entries = getEntries();
  const canGoUp = (): boolean =>
    currentPath !== path.resolve(basePath) && currentPath !== path.parse(currentPath).root;

  // Initial render
  previousLineCount = render(
    currentPath,
    input,
    entries,
    cursorIndex,
    limit,
    previousLineCount,
    true,
    options,
  );

  while (true) {
    const key = await readKey();

    const totalItems = (canGoUp() ? 1 : 0) + entries.length;

    if (key.name === "up") {
      if (totalItems > 0) {
        cursorIndex = cursorIndex > 0 ? cursorIndex - 1 : totalItems - 1;
        previousLineCount = render(
          currentPath,
          input,
          entries,
          cursorIndex,
          limit,
          previousLineCount,
          false,
          options,
        );
      }
    } else if (key.name === "down") {
      if (totalItems > 0) {
        cursorIndex = cursorIndex < totalItems - 1 ? cursorIndex + 1 : 0;
        previousLineCount = render(
          currentPath,
          input,
          entries,
          cursorIndex,
          limit,
          previousLineCount,
          false,
          options,
        );
      }
    } else if (key.name === "return") {
      const goUpOffset = canGoUp() ? 1 : 0;

      // Go up directory
      if (canGoUp() && cursorIndex === 0) {
        currentPath = path.dirname(currentPath);
        input = "";
        cursorIndex = 0;
        entries = getEntries();
        previousLineCount = render(
          currentPath,
          input,
          entries,
          cursorIndex,
          limit,
          previousLineCount,
          false,
          options,
        );
        continue;
      }

      // Navigate into directory
      const entryIndex = cursorIndex - goUpOffset;
      if (entryIndex >= 0 && entryIndex < entries.length) {
        const entry = entries[entryIndex]!;

        if (entry.isDirectory) {
          // Enter directory
          currentPath = entry.fullPath;
          input = "";
          cursorIndex = 0;
          entries = getEntries();
          previousLineCount = render(
            currentPath,
            input,
            entries,
            cursorIndex,
            limit,
            previousLineCount,
            false,
            options,
          );
          continue;
        }

        // Select file
        const selectedPath = entry.fullPath;

        // Validate
        if (validate) {
          const result = validate(selectedPath);
          if (result !== true) {
            // Show error briefly, re-render
            process.stdout.write(MOVE_TO_COL_0);
            for (let i = 0; i < previousLineCount; i++) {
              process.stdout.write(CLEAR_LINE + "\n");
            }
            process.stdout.write(MOVE_UP(previousLineCount) + MOVE_TO_COL_0);
            console.log(color.red(`  ${result}`));
            previousLineCount = render(
              currentPath,
              input,
              entries,
              cursorIndex,
              limit,
              1,
              true,
              options,
            );
            continue;
          }
        }

        // Clean up and return
        process.stdout.write(MOVE_TO_COL_0);
        for (let i = 0; i < previousLineCount; i++) {
          process.stdout.write(CLEAR_LINE + "\n");
        }
        process.stdout.write(MOVE_UP(previousLineCount) + MOVE_TO_COL_0);
        console.log(
          color.dim("  ✓ ") + color.cyan(path.relative(basePath, selectedPath) || selectedPath),
        );
        return selectedPath;
      }

      // Allow new file creation
      if (allowNew && input) {
        const newPath = path.join(currentPath, input);

        if (validate) {
          const result = validate(newPath);
          if (result !== true) {
            continue;
          }
        }

        process.stdout.write(MOVE_TO_COL_0);
        for (let i = 0; i < previousLineCount; i++) {
          process.stdout.write(CLEAR_LINE + "\n");
        }
        process.stdout.write(MOVE_UP(previousLineCount) + MOVE_TO_COL_0);
        console.log(
          color.dim("  ✓ ") +
            color.cyan(path.relative(basePath, newPath) || newPath) +
            color.dim(" (new)"),
        );
        return newPath;
      }
    } else if (key.name === "tab") {
      // Tab completion: if single match, complete it
      if (entries.length === 1) {
        const entry = entries[0]!;
        if (entry.isDirectory) {
          currentPath = entry.fullPath;
          input = "";
          cursorIndex = 0;
          entries = getEntries();
        } else {
          input = entry.name;
          cursorIndex = canGoUp() ? 1 : 0;
        }
        previousLineCount = render(
          currentPath,
          input,
          entries,
          cursorIndex,
          limit,
          previousLineCount,
          false,
          options,
        );
      }
    } else if (key.name === "backspace") {
      if (input.length > 0) {
        input = input.slice(0, -1);
        entries = getEntries();
        cursorIndex = 0;
        previousLineCount = render(
          currentPath,
          input,
          entries,
          cursorIndex,
          limit,
          previousLineCount,
          false,
          options,
        );
      } else if (canGoUp()) {
        // Go up when backspace on empty input
        currentPath = path.dirname(currentPath);
        entries = getEntries();
        cursorIndex = 0;
        previousLineCount = render(
          currentPath,
          input,
          entries,
          cursorIndex,
          limit,
          previousLineCount,
          false,
          options,
        );
      }
    } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
      process.stdout.write(MOVE_TO_COL_0);
      for (let i = 0; i < previousLineCount; i++) {
        process.stdout.write(CLEAR_LINE + "\n");
      }
      process.stdout.write(MOVE_UP(previousLineCount) + MOVE_TO_COL_0);
      throw new PromptCancelledError();
    } else if (key.raw.length === 1 && key.raw >= " " && !key.ctrl) {
      input += key.raw;
      entries = getEntries();
      cursorIndex = canGoUp() ? 1 : 0;
      previousLineCount = render(
        currentPath,
        input,
        entries,
        cursorIndex,
        limit,
        previousLineCount,
        false,
        options,
      );
    }
  }
}

/**
 * Fallback for non-TTY environments
 */
async function filepathFallback(options: FilepathOptions): Promise<string> {
  const { basePath = process.cwd(), allowNew, validate } = options;

  process.stdout.write(color.dim(`  Enter path (relative to ${basePath}): `));

  const input = await readLine();
  const trimmed = input.trim();

  if (!trimmed) {
    console.log(color.red("  Path is required"));
    return filepathFallback(options);
  }

  const fullPath = path.resolve(basePath, trimmed);

  // Check existence using Bun.file()
  if (!allowNew) {
    const exists = await Bun.file(fullPath).exists();
    if (!exists) {
      console.log(color.red(`  Path does not exist: ${trimmed}`));
      return filepathFallback(options);
    }
  }

  // Validate
  if (validate) {
    const result = validate(fullPath);
    if (result !== true) {
      console.log(color.red(`  ${result}`));
      return filepathFallback(options);
    }
  }

  return fullPath;
}
