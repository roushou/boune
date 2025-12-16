/**
 * Configuration file structure for boune CLI
 */
export interface BouneConfig {
  /** Default values for global options */
  defaults?: {
    verbose?: boolean;
    color?: "auto" | "always" | "never";
    output?: "table" | "json" | "plain";
    timeout?: number;
  };

  /** Per-command default options */
  commands?: Record<string, Record<string, unknown>>;

  /** User-defined command aliases */
  aliases?: Record<string, string>;

  /** Environment-specific profiles */
  profiles?: Record<string, ProfileConfig>;
}

export interface ProfileConfig {
  /** Profile-specific defaults */
  defaults?: BouneConfig["defaults"];

  /** Profile-specific command options */
  commands?: BouneConfig["commands"];

  /** Environment variables to set when using this profile */
  env?: Record<string, string>;
}

export interface ResolvedConfig extends BouneConfig {
  /** The active profile name, if any */
  activeProfile?: string;

  /** Source of the config (file path or "default") */
  source: string;
}

export const DEFAULT_CONFIG: BouneConfig = {
  defaults: {
    verbose: false,
    color: "auto",
    output: "table",
    timeout: 30000,
  },
  commands: {},
  aliases: {},
  profiles: {},
};
