import { type ResolvedConfig, getAvailableProfiles, loadConfig } from "../config/index.ts";
import { color, defineCommand, table } from "boune";

export const config = defineCommand({
  name: "config",
  description: "View and manage configuration",
  options: {
    profile: {
      type: "string",
      short: "p",
      description: "Profile to apply when viewing config",
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
    },
  },
  async action({ options }) {
    const resolved = await loadConfig({ profile: options.profile });

    if (options.json) {
      console.log(JSON.stringify(resolved, null, 2));
      return;
    }

    printConfig(resolved);
  },
});

function printConfig(config: ResolvedConfig): void {
  console.log("");
  console.log(color.bold("Configuration"));
  console.log(color.dim("─".repeat(40)));
  console.log("");

  // Source
  console.log(color.bold("Source:"), color.cyan(config.source));
  if (config.activeProfile) {
    console.log(color.bold("Active Profile:"), color.green(config.activeProfile));
  }
  console.log("");

  // Defaults
  if (config.defaults && Object.keys(config.defaults).length > 0) {
    console.log(color.bold("Defaults:"));
    const rows = Object.entries(config.defaults).map(([key, value]) => [
      color.dim(key),
      formatValue(value),
    ]);
    console.log(table(rows, { padding: 2 }));
    console.log("");
  }

  // Command overrides
  if (config.commands && Object.keys(config.commands).length > 0) {
    console.log(color.bold("Command Overrides:"));
    for (const [cmd, opts] of Object.entries(config.commands)) {
      console.log(`  ${color.cyan(cmd)}:`);
      for (const [key, value] of Object.entries(opts as Record<string, unknown>)) {
        console.log(`    ${color.dim(key)}: ${formatValue(value)}`);
      }
    }
    console.log("");
  }

  // Aliases
  if (config.aliases && Object.keys(config.aliases).length > 0) {
    console.log(color.bold("Aliases:"));
    const rows = Object.entries(config.aliases).map(([alias, cmd]) => [
      color.green(alias),
      color.dim("->"),
      cmd,
    ]);
    console.log(table(rows, { padding: 2 }));
    console.log("");
  }

  // Available profiles
  const profiles = getAvailableProfiles(config);
  if (profiles.length > 0) {
    console.log(color.bold("Available Profiles:"));
    for (const profile of profiles) {
      const marker = profile === config.activeProfile ? color.green("*") : " ";
      console.log(`  ${marker} ${profile}`);
    }
    console.log("");
  }
}

function formatValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? color.green("true") : color.red("false");
  }
  if (typeof value === "number") {
    return color.yellow(String(value));
  }
  if (typeof value === "string") {
    return color.cyan(`"${value}"`);
  }
  return String(value);
}
