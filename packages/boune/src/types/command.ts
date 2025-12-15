/**
 * Command configuration and schema types
 */

import type { ActionHandler, ErrorHandler, MiddlewareHandler, PromptsRecord } from "./handlers.ts";
import type { ArgumentDef, Kind, OptionDef } from "./core.ts";
import type { InferPrompts, PromptDefinition } from "./prompt.ts";
import type { ArgBuilder } from "../schema/argument.ts";
import type { OptBuilder } from "../schema/option.ts";

/** Infer args type from argument builders record */
export type InferArgs<T extends Record<string, ArgBuilder<unknown, Kind>>> = {
  [K in keyof T]: T[K]["_type"];
};

/** Infer options type from option builders record */
export type InferOpts<T extends Record<string, OptBuilder<unknown, Kind>>> = {
  [K in keyof T]: T[K]["_type"];
};

/** Command configuration */
export interface CommandConfig {
  name: string;
  description: string;
  aliases: string[];
  arguments: ArgumentDef[];
  options: OptionDef[];
  /** Built runnable prompts */
  prompts: PromptsRecord;
  subcommands: Record<string, CommandConfig>;
  action?: ActionHandler;
  /** Middleware to run before the action */
  before?: MiddlewareHandler[];
  /** Middleware to run after the action */
  after?: MiddlewareHandler[];
  /** Error handler for this command */
  onError?: ErrorHandler;
  hidden: boolean;
}

/**
 * Schema for defining a command declaratively
 *
 * @example
 * ```typescript
 * const schema: CommandSchema = {
 *   name: "greet",
 *   description: "Greet a user",
 *   arguments: {
 *     name: argument.string().required(),
 *   },
 *   options: {
 *     loud: option.boolean().short("l"),
 *   },
 *   action({ args, options }) {
 *     const greeting = `Hello, ${args.name}!`;
 *     console.log(options.loud ? greeting.toUpperCase() : greeting);
 *   },
 * };
 * ```
 */
export interface CommandSchema<
  TArgBuilders extends Record<string, ArgBuilder<unknown, Kind>> = Record<
    string,
    ArgBuilder<unknown, Kind>
  >,
  TOptBuilders extends Record<string, OptBuilder<unknown, Kind>> = Record<
    string,
    OptBuilder<unknown, Kind>
  >,
  TPromptDefs extends Record<string, PromptDefinition> = Record<string, PromptDefinition>,
> {
  /** Command name */
  name: string;
  /** Command description (shown in help) */
  description?: string;
  /** Command aliases */
  aliases?: string[];
  /** Hide command from help output */
  hidden?: boolean;
  /** Positional arguments */
  arguments?: TArgBuilders;
  /** Options/flags */
  options?: TOptBuilders;
  /** Declarative prompts */
  prompts?: TPromptDefs;
  /** Subcommands (can be CommandSchema or already-built CommandConfig) */
  subcommands?: Record<
    string,
    | CommandSchema<
        Record<string, ArgBuilder<unknown, Kind>>,
        Record<string, OptBuilder<unknown, Kind>>,
        Record<string, PromptDefinition>
      >
    | CommandConfig
  >;
  /** Middleware to run before the action */
  before?: MiddlewareHandler[];
  /** Middleware to run after the action */
  after?: MiddlewareHandler[];
  /** Error handler for this command */
  onError?: ErrorHandler;
  /** Action handler */
  action?: ActionHandler<
    InferArgs<TArgBuilders>,
    InferOpts<TOptBuilders>,
    InferPrompts<TPromptDefs>
  >;
}
