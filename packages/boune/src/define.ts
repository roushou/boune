/**
 * Declarative API for defining commands and CLIs
 */

import type {
  ArgumentDef,
  CliConfig,
  CliSchema,
  CommandConfig,
  CommandSchema,
  Kind,
  OptionDef,
} from "./types.ts";
import type { ArgBuilder } from "./schema/argument.ts";
import { Cli } from "./cli.ts";
import type { OptBuilder } from "./schema/option.ts";

/**
 * Convert argument builders record to ArgumentDef array
 */
function buildArguments(args?: Record<string, ArgBuilder<unknown, Kind>>): ArgumentDef[] {
  if (!args) return [];
  return Object.entries(args).map(([name, builder]) => builder._build(name));
}

/**
 * Convert option builders record to OptionDef array
 */
function buildOptions(opts?: Record<string, OptBuilder<unknown, Kind>>): OptionDef[] {
  if (!opts) return [];
  return Object.entries(opts).map(([name, builder]) => builder._build(name));
}

/**
 * Check if a value is a CommandConfig (already built) vs CommandSchema (needs building)
 */
function isCommandConfig(
  value:
    | CommandSchema<
        Record<string, ArgBuilder<unknown, Kind>>,
        Record<string, OptBuilder<unknown, Kind>>
      >
    | CommandConfig,
): value is CommandConfig {
  // CommandConfig has 'arguments' as ArgumentDef[], CommandSchema has ArgBuilder instances
  // We can check if subcommands is a Record with CommandConfig properties
  return (
    typeof value === "object" &&
    value !== null &&
    "arguments" in value &&
    Array.isArray(value.arguments) &&
    (value.arguments.length === 0 || typeof value.arguments[0]?.name === "string")
  );
}

/**
 * Define a command from a declarative schema
 *
 * @example
 * ```typescript
 * const greetCommand = defineCommand({
 *   name: "greet",
 *   description: "Greet a user",
 *   arguments: {
 *     name: argument.string().required().describe("Name to greet"),
 *   },
 *   options: {
 *     loud: option.boolean().short("l").describe("Shout the greeting"),
 *   },
 *   action({ args, options }) {
 *     const greeting = `Hello, ${args.name}!`;
 *     console.log(options.loud ? greeting.toUpperCase() : greeting);
 *   },
 * });
 * ```
 */
export function defineCommand<
  TArgBuilders extends Record<string, ArgBuilder<unknown, Kind>> = Record<
    string,
    ArgBuilder<unknown, Kind>
  >,
  TOptBuilders extends Record<string, OptBuilder<unknown, Kind>> = Record<
    string,
    OptBuilder<unknown, Kind>
  >,
>(schema: CommandSchema<TArgBuilders, TOptBuilders>): CommandConfig {
  // Build subcommands recursively
  const subcommands: Record<string, CommandConfig> = {};

  if (schema.subcommands) {
    for (const [name, subSchemaOrConfig] of Object.entries(schema.subcommands)) {
      let subConfig: CommandConfig;

      if (isCommandConfig(subSchemaOrConfig)) {
        // Already a CommandConfig (from defineCommand)
        subConfig = subSchemaOrConfig;
      } else {
        // Build from schema
        subConfig = defineCommand(subSchemaOrConfig);
      }

      subcommands[name] = subConfig;

      // Also register aliases
      if (subConfig.aliases) {
        for (const alias of subConfig.aliases) {
          subcommands[alias] = subConfig;
        }
      }
    }
  }

  return {
    name: schema.name,
    description: schema.description ?? "",
    aliases: schema.aliases ?? [],
    arguments: buildArguments(schema.arguments),
    options: buildOptions(schema.options),
    subcommands,
    // Cast to base ActionHandler since CommandConfig uses generic defaults
    action: schema.action as CommandConfig["action"],
    before: schema.before,
    after: schema.after,
    onError: schema.onError,
    hidden: schema.hidden ?? false,
  };
}

/**
 * Define a CLI from a declarative schema
 *
 * @example
 * ```typescript
 * const app = defineCli({
 *   name: "myapp",
 *   version: "1.0.0",
 *   description: "My CLI application",
 *   commands: {
 *     build: {
 *       name: "build",
 *       description: "Build the project",
 *       options: {
 *         watch: option.boolean().short("w"),
 *       },
 *       action({ options }) {
 *         console.log("Building...", options.watch ? "(watching)" : "");
 *       },
 *     },
 *   },
 *   globalOptions: {
 *     verbose: option.boolean().short("v").describe("Verbose output"),
 *   },
 *   middleware: [loggingMiddleware],
 * });
 *
 * app.run();
 * ```
 */
export function defineCli(schema: CliSchema): Cli {
  // Build the config
  const config: CliConfig = {
    name: schema.name,
    version: schema.version ?? "",
    description: schema.description ?? "",
    commands: {},
    globalOptions: [
      // Default help option
      {
        name: "help",
        short: "h",
        long: "help",
        description: "Show help",
        type: "boolean",
        required: false,
        default: false,
      },
    ],
    middleware: schema.middleware,
    onError: schema.onError,
  };

  // Add version option if version is specified
  if (schema.version) {
    config.globalOptions.push({
      name: "version",
      short: "V",
      long: "version",
      description: "Show version",
      type: "boolean",
      required: false,
      default: false,
    });
  }

  // Build global options
  if (schema.globalOptions) {
    for (const [name, builder] of Object.entries(schema.globalOptions)) {
      config.globalOptions.push(builder._build(name));
    }
  }

  // Build commands
  for (const [name, cmdSchemaOrConfig] of Object.entries(schema.commands)) {
    let cmdConfig: CommandConfig;

    if (isCommandConfig(cmdSchemaOrConfig)) {
      // Already a CommandConfig
      cmdConfig = cmdSchemaOrConfig;
    } else {
      // Build from schema
      cmdConfig = defineCommand(cmdSchemaOrConfig);
    }

    config.commands[name] = cmdConfig;

    // Also register aliases
    for (const alias of cmdConfig.aliases) {
      config.commands[alias] = cmdConfig;
    }
  }

  return Cli.fromConfig(config);
}
