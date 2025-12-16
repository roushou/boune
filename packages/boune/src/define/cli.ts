import type { CliConfig, CliSchema, CommandConfig, InternalOptionDef } from "../types/index.ts";
import { defineCommand, isCommandConfig } from "./command.ts";
import { Cli } from "../runtime/cli.ts";
import type { OptionDefinition } from "../types/option.ts";
import { compileValidation } from "../validation/compile.ts";

/**
 * Normalize option definitions to internal format
 */
function normalizeGlobalOptions(opts?: Record<string, OptionDefinition>): InternalOptionDef[] {
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
 *         watch: { type: "boolean", short: "w" },
 *       },
 *       action({ options }) {
 *         console.log("Building...", options.watch ? "(watching)" : "");
 *       },
 *     },
 *   },
 *   globalOptions: {
 *     verbose: { type: "boolean", short: "v", description: "Verbose output" },
 *   },
 *   middleware: [loggingMiddleware],
 * });
 *
 * app.run();
 * ```
 */
export function defineCli(schema: CliSchema): Cli {
  const config: CliConfig = {
    name: schema.name,
    version: schema.version ?? "",
    description: schema.description ?? "",
    commands: {},
    globalOptions: [
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

  // Add user-defined global options
  config.globalOptions.push(...normalizeGlobalOptions(schema.globalOptions));

  for (const [name, cmdSchemaOrConfig] of Object.entries(schema.commands)) {
    let cmdConfig: CommandConfig;

    if (isCommandConfig(cmdSchemaOrConfig)) {
      cmdConfig = cmdSchemaOrConfig;
    } else {
      cmdConfig = defineCommand(cmdSchemaOrConfig);
    }

    config.commands[name] = cmdConfig;

    for (const alias of cmdConfig.aliases) {
      config.commands[alias] = cmdConfig;
    }
  }

  return Cli.fromConfig(config);
}
