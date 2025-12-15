import type { CommandConfig, CommandSchema } from "./command.ts";
import type { ErrorHandler, MiddlewareHandler } from "./handlers.ts";
import type { ArgumentDefinition } from "./argument.ts";
import type { InternalOptionDef } from "./core.ts";
import type { OptionDefinition } from "./option.ts";
import type { PromptDefinition } from "./prompt.ts";

/** CLI configuration (internal, normalized) */
export interface CliConfig {
  name: string;
  version: string;
  description: string;
  commands: Record<string, CommandConfig>;
  globalOptions: InternalOptionDef[];
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
 *     verbose: { type: "boolean", short: "v" },
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
          Record<string, ArgumentDefinition>,
          Record<string, OptionDefinition>,
          Record<string, PromptDefinition>
        >
      >
    | Record<string, CommandConfig>;
  /** Global options available to all commands */
  globalOptions?: Record<string, OptionDefinition>;
  /** Global middleware */
  middleware?: MiddlewareHandler[];
  /** Global error handler */
  onError?: ErrorHandler;
}
