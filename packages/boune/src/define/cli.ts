import type { CliConfig, CliSchema, InternalOptionDef } from "../types/index.ts";
import { buildCommandRegistry, normalizeOptions } from "./command.ts";
import { Cli } from "../runtime/cli.ts";

/**
 * Built-in global options
 */
const builtInOptions: Record<string, InternalOptionDef> = {
  help: {
    name: "help",
    short: "h",
    long: "help",
    description: "Show help",
    type: "boolean",
    required: false,
    default: false,
  },
  version: {
    name: "version",
    short: "V",
    long: "version",
    description: "Show version",
    type: "boolean",
    required: false,
    default: false,
  },
};

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
  // Build global options: help is always included, version only if specified
  const globalOptions: InternalOptionDef[] = [builtInOptions.help!];
  if (schema.version) {
    globalOptions.push(builtInOptions.version!);
  }

  const config: CliConfig = {
    name: schema.name,
    version: schema.version ?? "",
    description: schema.description ?? "",
    commands: {},
    globalOptions,
    middleware: schema.middleware,
    onError: schema.onError,
  };

  // Add user-defined global options
  config.globalOptions.push(...normalizeOptions(schema.globalOptions));

  // Build command registry with aliases
  config.commands = buildCommandRegistry(schema.commands);

  return Cli.fromConfig(config);
}
