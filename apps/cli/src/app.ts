#!/usr/bin/env bun

import { build, config, dev, init, playground, profile } from "./commands/index.ts";
import { color, defineCli } from "boune";
import { debug, debugSection, setVerbose } from "./logger.ts";
import { loadConfig, resolveAlias } from "./config/index.ts";
import { checkForUpdates } from "./update-checker.ts";
import packageJson from "../package.json";

const cli = defineCli({
  name: "boune",
  version: packageJson.version,
  description: "Boune CLI - Initialize projects and manage configurations",
  commands: {
    init,
    dev,
    build,
    config,
    profile,
    playground,
  },
  globalOptions: {
    verbose: {
      type: "boolean",
      short: "v",
      description: "Enable verbose output for debugging",
    },
  },
  middleware: [
    async (ctx, next) => {
      const verbose = ctx.options.verbose as boolean;
      if (verbose) {
        setVerbose(true);
        debug("Verbose mode enabled");
        debug(`Command: ${ctx.command?.name ?? "none"}`);
        debugSection("Parsed arguments", ctx.args);
        debugSection("Parsed options", ctx.options);

        // Load and show config info
        const resolvedConfig = await loadConfig({
          profile: ctx.options.profile as string | undefined,
        });
        debugSection("Config", {
          source: resolvedConfig.source,
          activeProfile: resolvedConfig.activeProfile ?? "none",
          defaults: resolvedConfig.defaults,
        });
        console.log("");
      }
      await next();
    },
  ],
});

async function main() {
  // Check for updates (non-blocking)
  const updatePromise = checkForUpdates(packageJson.version);

  // Get raw args (skip 'bun' and script path)
  let args = process.argv.slice(2);

  // Expand aliases if the first arg might be an alias
  if (args.length > 0 && !args[0].startsWith("-")) {
    const resolvedConfig = await loadConfig();
    const expanded = resolveAlias(resolvedConfig, args[0]);

    if (expanded) {
      // Parse the expanded command and replace the alias
      const expandedArgs = expanded.split(/\s+/);
      args = [...expandedArgs, ...args.slice(1)];
      console.log(color.dim(`Alias expanded: ${args.join(" ")}`));
      console.log("");
    }
  }

  // Run CLI with potentially expanded args
  await cli.run(args);

  // Show update notification if available (after command completes)
  const updateInfo = await updatePromise;
  if (updateInfo) {
    console.log("");
    console.log(color.yellow(`Update available: ${packageJson.version} → ${updateInfo.latest}`));
    console.log(color.dim(`Run ${color.cyan("bun update boune")} to update`));
  }
}

main();
