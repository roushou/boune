import { basename, join, resolve } from "node:path";
import { color, createSpinner, defineCommand } from "boune";
import { existsSync } from "node:fs";

const TARGETS = [
  "bun-linux-x64",
  "bun-linux-arm64",
  "bun-darwin-x64",
  "bun-darwin-arm64",
  "bun-windows-x64",
] as const;

type Target = (typeof TARGETS)[number];

export const build = defineCommand({
  name: "build",
  description: "Compile CLI to a standalone binary",
  options: {
    entry: {
      type: "string",
      short: "e",
      description: "Entry file (defaults to package.json bin or src/app.ts)",
    },
    outfile: {
      type: "string",
      short: "o",
      description: "Output file name (defaults to package name)",
    },
    outdir: {
      type: "string",
      short: "d",
      description: "Output directory (defaults to ./dist)",
      default: "dist",
    },
    target: {
      type: "string",
      short: "t",
      description: "Target platform",
      choices: TARGETS,
    },
    minify: {
      type: "boolean",
      short: "m",
      description: "Minify the output",
      default: false,
    },
    sourcemap: {
      type: "boolean",
      short: "s",
      description: "Generate source maps",
      default: false,
    },
    cwd: {
      type: "string",
      description: "Working directory (defaults to current directory)",
    },
    all: {
      type: "boolean",
      short: "a",
      description: "Build for all supported platforms",
      default: false,
    },
  },
  async action({ options }) {
    const cwd = resolve(options.cwd || process.cwd());
    const entry = await findEntryPoint(cwd, options.entry);

    if (!entry) {
      console.log(color.red("Could not find entry point."));
      console.log(color.dim("Specify with --entry or ensure package.json has a bin field."));
      process.exit(1);
    }

    const outdir = resolve(cwd, options.outdir);
    const outName = options.outfile || (await getOutputName(cwd));

    // Ensure output directory exists
    const { mkdir } = await import("node:fs/promises");
    await mkdir(outdir, { recursive: true });

    console.log(color.bold("Building CLI..."));
    console.log(color.dim(`Entry: ${entry}`));
    console.log(color.dim(`Output: ${outdir}`));
    console.log("");

    if (options.all) {
      // Build for all platforms
      await buildAllPlatforms(entry, outdir, outName, options);
    } else {
      // Build for single target
      await buildSingle(entry, outdir, outName, options);
    }
  },
});

async function buildSingle(
  entry: string,
  outdir: string,
  outName: string,
  options: { target?: string; minify?: boolean; sourcemap?: boolean },
): Promise<void> {
  const spinner = createSpinner("Compiling...").start();

  const bunArgs = ["build", entry, "--compile", `--outfile=${join(outdir, outName)}`];

  if (options.target) {
    bunArgs.push(`--target=${options.target}`);
  }

  if (options.minify) {
    bunArgs.push("--minify");
  }

  if (options.sourcemap) {
    bunArgs.push("--sourcemap=external");
  }

  const proc = Bun.spawn(["bun", ...bunArgs], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();

  if (exitCode !== 0) {
    spinner.fail("Build failed");
    console.log(color.red(stderr));
    process.exit(1);
  }

  const outPath = join(outdir, outName);
  const stat = await Bun.file(outPath).exists();

  if (stat) {
    const size = (await Bun.file(outPath).arrayBuffer()).byteLength;
    const sizeStr = formatSize(size);
    spinner.succeed(`Built ${color.cyan(outName)} ${color.dim(`(${sizeStr})`)}`);
  } else {
    spinner.succeed(`Built ${color.cyan(outName)}`);
  }
}

async function buildAllPlatforms(
  entry: string,
  outdir: string,
  outName: string,
  options: { minify?: boolean; sourcemap?: boolean },
): Promise<void> {
  console.log(color.dim(`Building for ${TARGETS.length} platforms...`));
  console.log("");

  for (const target of TARGETS) {
    const platformName = getPlatformName(target, outName);
    const spinner = createSpinner(`Building ${target}...`).start();

    const bunArgs = [
      "build",
      entry,
      "--compile",
      `--outfile=${join(outdir, platformName)}`,
      `--target=${target}`,
    ];

    if (options.minify) {
      bunArgs.push("--minify");
    }

    if (options.sourcemap) {
      bunArgs.push("--sourcemap=external");
    }

    const proc = Bun.spawn(["bun", ...bunArgs], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      spinner.fail(`Failed: ${target}`);
      continue;
    }

    const outPath = join(outdir, platformName);
    const exists = await Bun.file(outPath).exists();

    if (exists) {
      const size = (await Bun.file(outPath).arrayBuffer()).byteLength;
      const sizeStr = formatSize(size);
      spinner.succeed(`${color.cyan(platformName)} ${color.dim(`(${sizeStr})`)}`);
    } else {
      spinner.succeed(color.cyan(platformName));
    }
  }

  console.log("");
  console.log(color.green("Build complete!"));
}

function getPlatformName(target: Target, baseName: string): string {
  const [, os, arch] = target.split("-");
  const ext = os === "windows" ? ".exe" : "";
  return `${baseName}-${os}-${arch}${ext}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function findEntryPoint(cwd: string, explicitEntry?: string): Promise<string | null> {
  if (explicitEntry) {
    const entryPath = resolve(cwd, explicitEntry);
    if (existsSync(entryPath)) {
      return entryPath;
    }
    return null;
  }

  const packageJsonPath = join(cwd, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = await Bun.file(packageJsonPath).json();

      if (packageJson.bin) {
        const binPath =
          typeof packageJson.bin === "string" ? packageJson.bin : Object.values(packageJson.bin)[0];

        if (binPath) {
          const fullPath = resolve(cwd, binPath as string);
          if (existsSync(fullPath)) {
            return fullPath;
          }
        }
      }

      if (packageJson.main) {
        const mainPath = resolve(cwd, packageJson.main);
        if (existsSync(mainPath)) {
          return mainPath;
        }
      }
    } catch {
      // Ignore
    }
  }

  const commonEntries = [
    "src/app.ts",
    "src/index.ts",
    "src/cli.ts",
    "src/main.ts",
    "app.ts",
    "index.ts",
    "cli.ts",
  ];

  for (const entry of commonEntries) {
    const entryPath = join(cwd, entry);
    if (existsSync(entryPath)) {
      return entryPath;
    }
  }

  return null;
}

async function getOutputName(cwd: string): Promise<string> {
  const packageJsonPath = join(cwd, "package.json");

  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = await Bun.file(packageJsonPath).json();

      // Use bin name if available
      if (packageJson.bin && typeof packageJson.bin === "object") {
        const binName = Object.keys(packageJson.bin)[0];
        if (binName) return binName;
      }

      // Use package name
      if (packageJson.name) {
        // Remove scope if present
        return packageJson.name.replace(/^@[^/]+\//, "");
      }
    } catch {
      // Ignore
    }
  }

  // Fallback to directory name
  return basename(cwd);
}
