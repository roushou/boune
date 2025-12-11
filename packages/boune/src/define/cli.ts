/**
 * CLI definition API
 */

import type { CliConfig, CliSchema, CommandConfig } from "../types/index.ts";
import { defineCommand, isCommandConfig } from "./command.ts";
import { Cli } from "../runtime/cli.ts";

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

  if (schema.globalOptions) {
    for (const [name, builder] of Object.entries(schema.globalOptions)) {
      config.globalOptions.push(builder._build(name));
    }
  }

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
