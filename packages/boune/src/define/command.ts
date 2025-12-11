/**
 * Command definition API
 */

import type { ArgumentDef, CommandConfig, CommandSchema, Kind, OptionDef } from "../types/index.ts";
import type { ArgBuilder } from "../schema/argument.ts";
import type { OptBuilder } from "../schema/option.ts";

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
export function isCommandConfig(
  value:
    | CommandSchema<
        Record<string, ArgBuilder<unknown, Kind>>,
        Record<string, OptBuilder<unknown, Kind>>
      >
    | CommandConfig,
): value is CommandConfig {
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
  const subcommands: Record<string, CommandConfig> = {};

  if (schema.subcommands) {
    for (const [name, subSchemaOrConfig] of Object.entries(schema.subcommands)) {
      let subConfig: CommandConfig;

      if (isCommandConfig(subSchemaOrConfig)) {
        subConfig = subSchemaOrConfig;
      } else {
        subConfig = defineCommand(subSchemaOrConfig);
      }

      subcommands[name] = subConfig;

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
    action: schema.action as CommandConfig["action"],
    before: schema.before,
    after: schema.after,
    onError: schema.onError,
    hidden: schema.hidden ?? false,
  };
}
