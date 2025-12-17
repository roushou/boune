import { color, defineCommand } from "boune";
import { join, resolve } from "node:path";
import type { Cli } from "boune";
import { serveDevTools } from "boune/devtools";

/**
 * Extract CLI instance from a loaded module
 */
function getCliFromModule(cliModule: unknown): Cli {
  const mod = cliModule as Record<string, unknown>;
  const cli = mod.cli || mod.default;

  if (!cli || typeof cli !== "object") {
    throw new Error(
      "Could not find CLI definition. Make sure to export 'cli' or use default export.",
    );
  }

  const cliObj = cli as { getConfig?: () => unknown };

  if (typeof cliObj.getConfig !== "function") {
    throw new Error(
      "Could not extract CLI configuration. Make sure the CLI was created with defineCli().",
    );
  }

  return cli as Cli;
}

export const devtools = defineCommand({
  name: "devtools",
  description: "Start the devtools dashboard for your CLI",
  options: {
    port: {
      type: "number",
      short: "p",
      description: "Server port",
      default: 4000,
    },
    entry: {
      type: "string",
      short: "e",
      description: "CLI entry point (defaults to package.json bin or src/app.ts)",
    },
    open: {
      type: "boolean",
      short: "o",
      description: "Open in browser automatically",
    },
  },
  async action({ options }) {
    const cwd = process.cwd();
    let entryPath = options.entry;

    // Auto-detect entry point
    if (!entryPath) {
      const packageJsonPath = join(cwd, "package.json");
      try {
        const packageJson = await Bun.file(packageJsonPath).json();
        if (packageJson.bin) {
          if (typeof packageJson.bin === "string") {
            entryPath = packageJson.bin;
          } else {
            entryPath = Object.values(packageJson.bin)[0] as string;
          }
        } else if (packageJson.main) {
          entryPath = packageJson.main;
        }
      } catch {
        // No package.json
      }

      // Fallback to common patterns
      if (!entryPath) {
        const patterns = [
          "src/app.ts",
          "src/index.ts",
          "src/cli.ts",
          "app.ts",
          "index.ts",
          "cli.ts",
        ];
        for (const pattern of patterns) {
          const fullPath = join(cwd, pattern);
          if (await Bun.file(fullPath).exists()) {
            entryPath = pattern;
            break;
          }
        }
      }
    }

    if (!entryPath) {
      console.log(color.red("Could not find CLI entry point."));
      console.log(color.dim("Specify one with --entry or create src/app.ts"));
      process.exit(1);
    }

    const fullEntryPath = resolve(cwd, entryPath);

    console.log(color.cyan("⚡ ") + color.bold("Loading CLI from ") + color.dim(fullEntryPath));

    let cli: Cli;
    try {
      const cliModule = await import(fullEntryPath);
      cli = getCliFromModule(cliModule);
    } catch (err) {
      console.log(
        color.red("Failed to load CLI:"),
        err instanceof Error ? err.message : String(err),
      );
      process.exit(1);
    }

    await serveDevTools(cli, {
      port: options.port ?? 4000,
      open: options.open,
    });
  },
});
