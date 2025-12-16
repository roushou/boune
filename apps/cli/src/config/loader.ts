import type { BouneConfig, ProfileConfig, ResolvedConfig } from "./types.ts";
import { join, resolve } from "node:path";
import { DEFAULT_CONFIG } from "./types.ts";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const CONFIG_FILENAMES = ["boune.config.ts", "boune.config.js", ".bounerc.json", ".bounerc"];

/**
 * Find config file in the given directory
 */
function findConfigFile(dir: string): string | null {
  for (const filename of CONFIG_FILENAMES) {
    const filepath = join(dir, filename);
    if (existsSync(filepath)) {
      return filepath;
    }
  }
  return null;
}

/**
 * Load config from a file path
 */
async function loadConfigFile(filepath: string): Promise<BouneConfig | null> {
  try {
    if (filepath.endsWith(".json") || filepath.endsWith(".bounerc")) {
      const content = await Bun.file(filepath).text();
      return JSON.parse(content);
    }

    // For .ts and .js files, use dynamic import
    const module = await import(filepath);
    return module.default || module;
  } catch {
    return null;
  }
}

/**
 * Get the global config directory
 */
function getGlobalConfigDir(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  if (xdgConfig) {
    return join(xdgConfig, "boune");
  }
  return join(homedir(), ".config", "boune");
}

/**
 * Merge two configs, with b taking precedence over a
 */
function mergeConfigs(a: BouneConfig, b: BouneConfig): BouneConfig {
  return {
    defaults: { ...a.defaults, ...b.defaults },
    commands: { ...a.commands, ...b.commands },
    aliases: { ...a.aliases, ...b.aliases },
    profiles: { ...a.profiles, ...b.profiles },
  };
}

/**
 * Apply a profile to the config
 */
function applyProfile(config: BouneConfig, profile: ProfileConfig): BouneConfig {
  const result = { ...config };

  if (profile.defaults) {
    result.defaults = { ...config.defaults, ...profile.defaults };
  }

  if (profile.commands) {
    result.commands = { ...config.commands };
    for (const [cmd, opts] of Object.entries(profile.commands)) {
      result.commands[cmd] = { ...result.commands[cmd], ...opts };
    }
  }

  // Set environment variables from profile
  if (profile.env) {
    for (const [key, value] of Object.entries(profile.env)) {
      process.env[key] = value;
    }
  }

  return result;
}

export interface LoadConfigOptions {
  /** Working directory to search from */
  cwd?: string;
  /** Specific profile to activate */
  profile?: string;
  /** Skip global config */
  skipGlobal?: boolean;
}

/**
 * Load and resolve configuration from all sources
 *
 * Resolution order (lowest to highest priority):
 * 1. Default config
 * 2. Global config (~/.config/boune/config.json)
 * 3. Project config (./boune.config.ts or .bounerc.json)
 * 4. Profile overrides (if --profile specified)
 */
export async function loadConfig(options: LoadConfigOptions = {}): Promise<ResolvedConfig> {
  const { cwd = process.cwd(), profile, skipGlobal = false } = options;

  let config: BouneConfig = { ...DEFAULT_CONFIG };
  let source = "default";

  // 1. Load global config
  if (!skipGlobal) {
    const globalDir = getGlobalConfigDir();
    const globalFile = findConfigFile(globalDir);
    if (globalFile) {
      const globalConfig = await loadConfigFile(globalFile);
      if (globalConfig) {
        config = mergeConfigs(config, globalConfig);
        source = globalFile;
      }
    }
  }

  // 2. Load project config (walk up directories)
  let searchDir = resolve(cwd);
  const root = resolve("/");

  while (searchDir !== root) {
    const projectFile = findConfigFile(searchDir);
    if (projectFile) {
      const projectConfig = await loadConfigFile(projectFile);
      if (projectConfig) {
        config = mergeConfigs(config, projectConfig);
        source = projectFile;
        break;
      }
    }
    searchDir = resolve(searchDir, "..");
  }

  // 3. Apply profile if specified
  let activeProfile: string | undefined;
  if (profile && config.profiles?.[profile]) {
    config = applyProfile(config, config.profiles[profile]);
    activeProfile = profile;
  }

  return {
    ...config,
    activeProfile,
    source,
  };
}

/**
 * Get list of available profiles from config
 */
export function getAvailableProfiles(config: BouneConfig): string[] {
  return Object.keys(config.profiles || {});
}

/**
 * Resolve an alias to its expanded command
 */
export function resolveAlias(config: BouneConfig, alias: string): string | null {
  return config.aliases?.[alias] || null;
}
