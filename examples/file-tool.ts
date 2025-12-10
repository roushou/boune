#!/usr/bin/env bun

/**
 * File manipulation CLI demonstrating Bun-specific APIs
 */
import { cli, command, color, createSpinner, table } from "../packages/boune/src/index.ts";

// List files with details
const list = command("list")
  .description("List files in a directory")
  .alias("ls")
  .argument("[path]", "Directory to list", { default: "." })
  .option("-a, --all", "Include hidden files")
  .option("-l, --long", "Use long listing format")
  .option("-h, --human", "Human-readable sizes")
  .action(async ({ args, options }) => {
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
  });

// Read file contents
const read = command("read")
  .description("Read and display file contents")
  .alias("cat")
  .argument("<file>", "File to read")
  .option("-n, --lines", "Show line numbers")
  .option("--head <number>", "Show only first N lines", { type: "number" })
  .option("--tail <number>", "Show only last N lines", { type: "number" })
  .action(async ({ args, options }) => {
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
  });

// Copy files
const copy = command("copy")
  .description("Copy files")
  .alias("cp")
  .argument("<source>", "Source file")
  .argument("<dest>", "Destination")
  .option("-f, --force", "Overwrite existing files")
  .action(async ({ args, options }) => {
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
  });

// Search in files
const search = command("search")
  .description("Search for pattern in files")
  .alias("grep")
  .argument("<pattern>", "Pattern to search for")
  .argument("[path]", "Directory to search", { default: "." })
  .option("-i, --ignore-case", "Case-insensitive search")
  .option("-r, --recursive", "Search recursively")
  .option("-n, --line-number", "Show line numbers")
  .option("--glob <pattern>", "File pattern to match", { default: "**/*" })
  .action(async ({ args, options }) => {
    const regex = new RegExp(args.pattern, options["ignore-case"] ? "gi" : "g");
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
            const lineNum = options["line-number"] ? color.dim(`${i + 1}:`) : "";
            const highlighted = line.replace(regex, (m) => color.red(color.bold(m)));
            console.log(`${color.magenta(file)}:${lineNum}${highlighted}`);
          }
        }
      } catch {
        // Skip binary files
      }
    }

    console.log(color.dim(`\n${matchCount} match(es) found`));
  });

// File info
const info = command("info")
  .description("Show file information")
  .argument("<file>", "File to inspect")
  .action(async ({ args }) => {
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

cli("ft")
  .version("1.0.0")
  .description("File manipulation tool built with Bun")
  .command(list)
  .command(read)
  .command(copy)
  .command(search)
  .command(info)
  .run();
