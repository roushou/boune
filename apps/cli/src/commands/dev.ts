import { color, defineCommand } from "boune";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

export const dev = defineCommand({
  name: "dev",
  description: "Run CLI in development mode with watch/hot reload",
  arguments: {
    args: {
      type: "string",
      variadic: true,
      required: false,
      description: "Arguments to pass to the CLI",
    },
  },
  options: {
    entry: {
      type: "string",
      short: "e",
      description: "Entry file (defaults to package.json bin or src/app.ts)",
    },
    cwd: {
      type: "string",
      description: "Working directory (defaults to current directory)",
    },
    clear: {
      type: "boolean",
      short: "c",
      description: "Clear console on reload",
      default: true,
    },
  },
  async action({ args, options }) {
    const cwd = resolve(options.cwd || process.cwd());
    const entry = await findEntryPoint(cwd, options.entry);

    if (!entry) {
      console.log(color.red("Could not find entry point."));
      console.log(color.dim("Specify with --entry or ensure package.json has a bin field."));
      process.exit(1);
    }

    console.log(color.bold("Starting development server..."));
    console.log(color.dim(`Entry: ${entry}`));
    console.log(color.dim(`Watch mode enabled`));
    console.log("");

    const cliArgs = args.args || [];
    const bunArgs = ["--watch", entry, ...cliArgs];

    if (options.clear) {
      bunArgs.unshift("--watch-clear");
    }

    const proc = Bun.spawn(["bun", ...bunArgs], {
      cwd,
      stdio: ["inherit", "inherit", "inherit"],
      env: {
        ...process.env,
        NODE_ENV: "development",
        BOUNE_DEV: "true",
      },
    });

    // Handle process termination
    process.on("SIGINT", () => {
      proc.kill();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      proc.kill();
      process.exit(0);
    });

    await proc.exited;
  },
});

async function findEntryPoint(cwd: string, explicitEntry?: string): Promise<string | null> {
  // Use explicit entry if provided
  if (explicitEntry) {
    const entryPath = resolve(cwd, explicitEntry);
    if (existsSync(entryPath)) {
      return entryPath;
    }
    return null;
  }

  // Try to find from package.json
  const packageJsonPath = join(cwd, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = await Bun.file(packageJsonPath).json();

      // Check bin field
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

      // Check main field
      if (packageJson.main) {
        const mainPath = resolve(cwd, packageJson.main);
        if (existsSync(mainPath)) {
          return mainPath;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Common entry point locations
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
