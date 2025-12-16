import { color, defineCommand, error, info, success, warning } from "boune";
import { getAvailableProfiles, loadConfig } from "../config/index.ts";
import { select } from "boune/prompt";

export const profile = defineCommand({
  name: "profile",
  description: "Manage environment profiles",
  arguments: {
    action: {
      type: "string",
      required: false,
      description: "Action to perform (list, show, use)",
    },
    name: {
      type: "string",
      required: false,
      description: "Profile name",
    },
  },
  async action({ args }) {
    const config = await loadConfig();
    const profiles = getAvailableProfiles(config);

    // Default to list if no action specified
    const action = args.action || "list";

    switch (action) {
      case "list":
        listProfiles(profiles, config.activeProfile);
        break;

      case "show":
        await showProfile(args.name, config, profiles);
        break;

      case "use":
        await useProfile(args.name, profiles);
        break;

      default:
        error(`Unknown action: ${action}`);
        console.log(color.dim("\nAvailable actions: list, show, use"));
        process.exit(1);
    }
  },
});

function listProfiles(profiles: string[], activeProfile?: string): void {
  console.log("");

  if (profiles.length === 0) {
    warning("No profiles configured");
    console.log(color.dim("\nAdd profiles to your boune.config.ts:"));
    console.log(
      color.dim(`
  profiles: {
    dev: {
      defaults: { verbose: true },
      env: { NODE_ENV: "development" }
    },
    prod: {
      defaults: { verbose: false },
      env: { NODE_ENV: "production" }
    }
  }
`),
    );
    return;
  }

  console.log(color.bold("Available Profiles"));
  console.log(color.dim("─".repeat(30)));
  console.log("");

  for (const name of profiles) {
    const isActive = name === activeProfile;
    const marker = isActive ? color.green("*") : " ";
    const label = isActive ? color.green(name) : name;
    console.log(`  ${marker} ${label}`);
  }

  console.log("");
  console.log(color.dim("Use --profile=<name> or 'boune profile use <name>' to activate"));
  console.log("");
}

async function showProfile(
  name: string | undefined,
  config: Awaited<ReturnType<typeof loadConfig>>,
  profiles: string[],
): Promise<void> {
  if (profiles.length === 0) {
    warning("No profiles configured");
    return;
  }

  // If no name provided, prompt for selection
  let profileName = name;
  if (!profileName) {
    profileName = await select({
      message: "Select a profile to view:",
      options: profiles.map((p) => ({ label: p, value: p })),
    });
  }

  const profileConfig = config.profiles?.[profileName];
  if (!profileConfig) {
    error(`Profile not found: ${profileName}`);
    console.log(color.dim(`\nAvailable profiles: ${profiles.join(", ")}`));
    process.exit(1);
  }

  console.log("");
  console.log(color.bold(`Profile: ${color.cyan(profileName)}`));
  console.log(color.dim("─".repeat(30)));
  console.log("");

  // Show defaults
  if (profileConfig.defaults && Object.keys(profileConfig.defaults).length > 0) {
    console.log(color.bold("Defaults:"));
    for (const [key, value] of Object.entries(profileConfig.defaults)) {
      console.log(`  ${color.dim(key)}: ${formatValue(value)}`);
    }
    console.log("");
  }

  // Show command overrides
  if (profileConfig.commands && Object.keys(profileConfig.commands).length > 0) {
    console.log(color.bold("Command Overrides:"));
    for (const [cmd, opts] of Object.entries(profileConfig.commands)) {
      console.log(`  ${color.cyan(cmd)}:`);
      for (const [key, value] of Object.entries(opts as Record<string, unknown>)) {
        console.log(`    ${color.dim(key)}: ${formatValue(value)}`);
      }
    }
    console.log("");
  }

  // Show environment variables
  if (profileConfig.env && Object.keys(profileConfig.env).length > 0) {
    console.log(color.bold("Environment Variables:"));
    for (const [key, value] of Object.entries(profileConfig.env)) {
      console.log(`  ${color.yellow(key)}=${color.cyan(`"${value}"`)}`);
    }
    console.log("");
  }
}

async function useProfile(name: string | undefined, profiles: string[]): Promise<void> {
  if (profiles.length === 0) {
    warning("No profiles configured");
    return;
  }

  // If no name provided, prompt for selection
  let profileName = name;
  if (!profileName) {
    profileName = await select({
      message: "Select a profile to use:",
      options: profiles.map((p) => ({ label: p, value: p })),
    });
  }

  if (!profiles.includes(profileName)) {
    error(`Profile not found: ${profileName}`);
    console.log(color.dim(`\nAvailable profiles: ${profiles.join(", ")}`));
    process.exit(1);
  }

  // Load config with profile applied
  const config = await loadConfig({ profile: profileName });

  console.log("");
  success(`Activated profile: ${profileName}`);
  console.log("");

  // Show what was applied
  const profileConfig = config.profiles?.[profileName];
  if (profileConfig?.env) {
    console.log(color.dim("Environment variables set:"));
    for (const [key, value] of Object.entries(profileConfig.env)) {
      console.log(color.dim(`  ${key}=${value}`));
    }
    console.log("");
  }

  info("Use --profile=" + profileName + " to use this profile with other commands");
  console.log("");
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
