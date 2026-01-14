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
    choices: def.choices,
    validate: def.validate ? compileValidation(def.validate, def.type) : undefined,
  }));
}

/**
 * Normalize option definitions to internal format
 */
export function normalizeOptions(opts?: Record<string, OptionDefinition>): InternalOptionDef[] {
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
    choices: def.choices,
    env: def.env,
    validate: def.validate ? compileValidation(def.validate, def.type) : undefined,
  }));
}

/**
 * Build a command registry from schemas, handling both pre-built configs and schemas
 * Also registers aliases pointing to the same config
 */
export function buildCommandRegistry(
  schemas: Record<string, CommandSchema<never, never, never> | CommandConfig> | undefined,
): Record<string, CommandConfig> {
  if (!schemas) return {};

  const registry: Record<string, CommandConfig> = {};

  for (const [name, schemaOrConfig] of Object.entries(schemas)) {
    const config = isCommandConfig(schemaOrConfig) ? schemaOrConfig : defineCommand(schemaOrConfig);

    registry[name] = config;

    for (const alias of config.aliases) {
      registry[alias] = config;
    }
  }

  return registry;
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
  return {
    name: schema.name,
    description: schema.description ?? "",
    aliases: schema.aliases ?? [],
    arguments: normalizeArguments(schema.arguments),
    options: normalizeOptions(schema.options),
    prompts: buildPrompts(schema.prompts),
    subcommands: buildCommandRegistry(schema.subcommands),
    action: schema.action as CommandConfig["action"],
    before: schema.before,
    after: schema.after,
    onError: schema.onError,
    hidden: schema.hidden ?? false,
  };
}
