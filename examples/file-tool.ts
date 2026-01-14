#!/usr/bin/env bun

/**
 * File manipulation CLI demonstrating Bun-specific APIs
 */
import {
  color,
  createSpinner,
  defineCli,
  defineCommand,
  table,
} from "../packages/boune/src/index.ts";

// List files with details
const list = defineCommand({
  name: "list",
  description: "List files in a directory",
  aliases: ["ls"],
  arguments: {
    path: { type: "string", default: ".", description: "Directory to list" },
  },
  options: {
    all: { type: "boolean", short: "a", description: "Include hidden files" },
    long: { type: "boolean", short: "l", description: "Use long listing format" },
    human: { type: "boolean", short: "h", description: "Human-readable sizes" },
  },
  async action({ args, options }) {
    const glob = new Bun.Glob(options.all ? "{*,.*}" : "*");

    const entries: string[][] = [];

    for await (const file of glob.scan({ cwd: args.path, onlyFiles: false })) {
      if (file === "." || file === "..") continue;

      const fullPath = `${args.path}/${file}`;
      const stat = (await Bun.file(fullPath).exists())
        ? { size: Bun.file(fullPath).size, isDir: false }
        : { size: 0, isDir: true };

      if (options.long) {
        const size = options.human ? formatSize(stat.size) : String(stat.size);
        const type = stat.isDir ? color.blue("d") : "-";
        entries.push([type, size, stat.isDir ? color.blue(file) : file]);
      } else {
        entries.push([stat.isDir ? color.blue(file) : file]);
      }
    }

    if (options.long) {
      console.log(table(entries));
    } else {
      console.log(entries.map((e) => e[0]).join("  "));
    }
  },
});

// Read file contents
const read = defineCommand({
  name: "read",
  description: "Read and display file contents",
  aliases: ["cat"],
  arguments: {
    file: { type: "string", required: true, description: "File to read" },
  },
  options: {
    lines: { type: "boolean", short: "n", description: "Show line numbers" },
    head: { type: "number", description: "Show only first N lines" },
    tail: { type: "number", description: "Show only last N lines" },
  },
  async action({ args, options }) {
    const file = Bun.file(args.file);

    if (!(await file.exists())) {
      console.error(color.red(`error: file not found: ${args.file}`));
      process.exit(1);
    }

    let lines = (await file.text()).split("\n");

    if (options.head) {
      lines = lines.slice(0, options.head);
    } else if (options.tail) {
      lines = lines.slice(-options.tail);
    }

    for (let i = 0; i < lines.length; i++) {
      if (options.lines) {
        console.log(`${color.dim(String(i + 1).padStart(4))} ${lines[i]}`);
      } else {
        console.log(lines[i]);
      }
    }
  },
});

// Copy files
const copy = defineCommand({
  name: "copy",
  description: "Copy files",
  aliases: ["cp"],
  arguments: {
    source: { type: "string", required: true, description: "Source file" },
    dest: { type: "string", required: true, description: "Destination" },
  },
  options: {
    force: { type: "boolean", short: "f", description: "Overwrite existing files" },
  },
  async action({ args, options }) {
    const sourceFile = Bun.file(args.source);
    if (!(await sourceFile.exists())) {
      console.error(color.red(`error: source not found: ${args.source}`));
      process.exit(1);
    }

    const destFile = Bun.file(args.dest);
    if ((await destFile.exists()) && !options.force) {
      console.error(
        color.red(`error: destination exists: ${args.dest} (use --force to overwrite)`),
      );
      process.exit(1);
    }

    const spinner = createSpinner(`Copying ${args.source}`).start();
    await Bun.write(args.dest, sourceFile);
    spinner.succeed(`Copied ${args.source} -> ${args.dest}`);
  },
});

// Search in files
const search = defineCommand({
  name: "search",
  description: "Search for pattern in files",
  aliases: ["grep"],
  arguments: {
    pattern: { type: "string", required: true, description: "Pattern to search for" },
    path: { type: "string", default: ".", description: "Directory to search" },
  },
  options: {
    ignoreCase: { type: "boolean", short: "i", description: "Case-insensitive search" },
    recursive: { type: "boolean", short: "r", description: "Search recursively" },
    lineNumber: { type: "boolean", short: "n", description: "Show line numbers" },
    glob: { type: "string", default: "**/*", description: "File pattern to match" },
  },
  async action({ args, options }) {
    const regex = new RegExp(args.pattern, options.ignoreCase ? "gi" : "g");
    const glob = new Bun.Glob(options.glob);

    let matchCount = 0;

    for await (const file of glob.scan({ cwd: args.path })) {
      const fullPath = `${args.path}/${file}`;
      const bunFile = Bun.file(fullPath);

      // Skip non-text files
      if (!bunFile.type.startsWith("text")) continue;

      try {
        const content = await bunFile.text();
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          if (regex.test(line)) {
            matchCount++;
            const lineNum = options.lineNumber ? color.dim(`${i + 1}:`) : "";
            const highlighted = line.replace(regex, (m) => color.red(color.bold(m)));
            console.log(`${color.magenta(file)}:${lineNum}${highlighted}`);
          }
        }
      } catch {
        // Skip binary files
      }
    }

    console.log(color.dim(`\n${matchCount} match(es) found`));
  },
});

// File info
const info = defineCommand({
  name: "info",
  description: "Show file information",
  arguments: {
    file: { type: "string", required: true, description: "File to inspect" },
  },
  async action({ args }) {
    const file = Bun.file(args.file);

    if (!(await file.exists())) {
      console.error(color.red(`error: file not found: ${args.file}`));
      process.exit(1);
    }

    console.log(color.bold("File Information"));
    console.log("");
    console.log(`  ${color.cyan("Path:")}    ${args.file}`);
    console.log(`  ${color.cyan("Size:")}    ${formatSize(file.size)}`);
    console.log(`  ${color.cyan("Type:")}    ${file.type || "unknown"}`);
  },
});

function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(unit > 0 ? 1 : 0)} ${units[unit]}`;
}

void defineCli({
  name: "ft",
  version: "1.0.0",
  description: "File manipulation tool built with Bun",
  commands: {
    list,
    ls: list,
    read,
    cat: read,
    copy,
    cp: copy,
    search,
    grep: search,
    info,
  },
}).run();
