import type { ActionHandler, ErrorHandler, MiddlewareHandler, PromptsRecord } from "./handlers.ts";
import type { ArgumentDefinition, InferArgs } from "./argument.ts";
import type { InferOpts, OptionDefinition } from "./option.ts";
import type { InferPrompts, PromptDefinition } from "./prompt.ts";
import type { InternalArgumentDef, InternalOptionDef } from "./core.ts";

export type { InferArgs, InferOpts };

/** Command configuration */
export interface CommandConfig {
  name: string;
  description: string;
  aliases: string[];
  arguments: InternalArgumentDef[];
  options: InternalOptionDef[];
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
 *     name: { type: "string", required: true },
 *   },
 *   options: {
 *     loud: { type: "boolean", short: "l" },
 *   },
 *   action({ args, options }) {
 *     const greeting = `Hello, ${args.name}!`;
 *     console.log(options.loud ? greeting.toUpperCase() : greeting);
 *   },
 * };
 * ```
 */
export interface CommandSchema<
  TArgDefs extends Record<string, ArgumentDefinition> = Record<string, ArgumentDefinition>,
  TOptDefs extends Record<string, OptionDefinition> = Record<string, OptionDefinition>,
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
  arguments?: TArgDefs;
  /** Options/flags */
  options?: TOptDefs;
  /** Declarative prompts */
  prompts?: TPromptDefs;
  /** Subcommands (can be CommandSchema or already-built CommandConfig) */
  subcommands?: Record<
    string,
    | CommandSchema<
        Record<string, ArgumentDefinition>,
        Record<string, OptionDefinition>,
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
  action?: ActionHandler<InferArgs<TArgDefs>, InferOpts<TOptDefs>, InferPrompts<TPromptDefs>>;
}
