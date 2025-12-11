/**
 * CLI configuration and schema types
 */

import type { CommandConfig, CommandSchema } from "./command.ts";
import type { ErrorHandler, MiddlewareHandler } from "./handlers.ts";
import type { Kind, OptionDef } from "./core.ts";
import type { ArgBuilder } from "../schema/argument.ts";
import type { OptBuilder } from "../schema/option.ts";

/** CLI configuration */
export interface CliConfig {
  name: string;
  version: string;
  description: string;
  commands: Record<string, CommandConfig>;
  globalOptions: OptionDef[];
  /** Global middleware to run before any command */
  middleware?: MiddlewareHandler[];
  /** Global error handler */
  onError?: ErrorHandler;
}

/**
 * Schema for defining a CLI declaratively
 *
 * @example
 * ```typescript
 * const cli = defineCli({
 *   name: "myapp",
 *   version: "1.0.0",
 *   description: "My CLI application",
 *   commands: {
 *     build: buildCommand,
 *     serve: serveCommand,
 *   },
 *   globalOptions: {
 *     verbose: option.boolean().short("v"),
 *   },
 * });
 * ```
 */
export interface CliSchema {
  /** CLI name */
  name: string;
  /** CLI version */
  version?: string;
  /** CLI description */
  description?: string;
  /** Commands (as schema objects or pre-built CommandConfig) */
  commands:
    | Record<
        string,
        CommandSchema<
          Record<string, ArgBuilder<unknown, Kind>>,
          Record<string, OptBuilder<unknown, Kind>>
        >
      >
    | Record<string, CommandConfig>;
  /** Global options available to all commands */
  globalOptions?: Record<string, OptBuilder<unknown, Kind>>;
  /** Global middleware */
  middleware?: MiddlewareHandler[];
  /** Global error handler */
  onError?: ErrorHandler;
}
