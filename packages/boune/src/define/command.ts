import type {
  CommandConfig,
  CommandSchema,
  InternalArgumentDef,
  InternalOptionDef,
  PromptDefinition,
} from "../types/index.ts";
import type { ArgumentDefinition } from "../types/argument.ts";
import type { OptionDefinition } from "../types/option.ts";
import { buildPrompts } from "../prompt/build.ts";
import { compileValidation } from "../validation/compile.ts";

/**
 * Normalize argument definitions to internal format
 */
function normalizeArguments(args?: Record<string, ArgumentDefinition>): InternalArgumentDef[] {
  if (!args) return [];
  return Object.entries(args).map(([name, def]) => ({
    name,
    description: def.description ?? "",
    required: def.required ?? false,
    type: def.type,
    default: def.default,
    variadic: def.variadic ?? false,
    validate: def.validate ? compileValidation(def.validate, def.type) : undefined,
  }));
}

/**
 * Normalize option definitions to internal format
 */
function normalizeOptions(opts?: Record<string, OptionDefinition>): InternalOptionDef[] {
  if (!opts) return [];
  return Object.entries(opts).map(([name, def]) => ({
    name,
    short: def.short,
    long: def.long ?? name,
    description: def.description ?? "",
    type: def.type,
    required: def.required ?? false,
    // Boolean options default to false
    default: def.default ?? (def.type === "boolean" ? false : undefined),
    env: def.env,
    validate: def.validate ? compileValidation(def.validate, def.type) : undefined,
  }));
}

/**
 * Check if a value is a CommandConfig (already built) vs CommandSchema (needs building)
 */
export function isCommandConfig(
  value:
    | CommandSchema<
        Record<string, ArgumentDefinition>,
        Record<string, OptionDefinition>,
        Record<string, PromptDefinition>
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
 *     name: { type: "string", required: true, description: "Name to greet" },
 *   },
 *   options: {
 *     loud: { type: "boolean", short: "l", description: "Shout the greeting" },
 *   },
 *   action({ args, options }) {
 *     const greeting = `Hello, ${args.name}!`;
 *     console.log(options.loud ? greeting.toUpperCase() : greeting);
 *   },
 * });
 * ```
 */
export function defineCommand<
  TArgDefs extends Record<string, ArgumentDefinition> = Record<string, ArgumentDefinition>,
  TOptDefs extends Record<string, OptionDefinition> = Record<string, OptionDefinition>,
  TPromptDefs extends Record<string, PromptDefinition> = Record<string, PromptDefinition>,
>(schema: CommandSchema<TArgDefs, TOptDefs, TPromptDefs>): CommandConfig {
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
    arguments: normalizeArguments(schema.arguments),
    options: normalizeOptions(schema.options),
    prompts: buildPrompts(schema.prompts),
    subcommands,
    action: schema.action as CommandConfig["action"],
    before: schema.before,
    after: schema.after,
    onError: schema.onError,
    hidden: schema.hidden ?? false,
  };
}
