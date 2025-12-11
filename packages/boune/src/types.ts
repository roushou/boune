/**
 * Core types for the boune CLI framework
 */

import type { AnyValidator } from "./validation/types.ts";
import type { ArgBuilder } from "./schema/argument.ts";
import type { OptBuilder } from "./schema/option.ts";

// ============================================================================
// Kind and Type Mapping
// ============================================================================

/** Supported value types */
export type Kind = "string" | "number" | "boolean";

/** Map Kind to TypeScript type */
type KindMap = { string: string; number: number; boolean: boolean };

/** Map Kind to TypeScript type (with optional variadic) */
export type InferKind<K extends Kind, V extends boolean = false> = V extends true
  ? KindMap[K][]
  : KindMap[K];

// ============================================================================
// Internal Definitions (used by parser)
// ============================================================================

/** Internal argument definition */
export interface ArgumentDef {
  name: string;
  description: string;
  required: boolean;
  type: Kind;
  default?: unknown;
  variadic?: boolean;
  validate?: AnyValidator;
}

/** Internal option/flag definition */
export interface OptionDef {
  name: string;
  short?: string;
  long?: string;
  description: string;
  type: Kind;
  required: boolean;
  default?: unknown;
  env?: string;
  validate?: AnyValidator;
}

// ============================================================================
// Parsed Values
// ============================================================================

/** Parsed argument values */
export type ParsedArgs = Record<string, unknown>;

/** Parsed option values */
export type ParsedOptions = Record<string, unknown>;

// ============================================================================
// Action and Middleware
// ============================================================================

/** Context passed to command action */
export interface ActionContext<
  TArgs extends ParsedArgs = ParsedArgs,
  TOpts extends ParsedOptions = ParsedOptions,
> {
  args: TArgs;
  options: TOpts;
  rawArgs: string[];
}

/** Command action handler */
export type ActionHandler<
  TArgs extends ParsedArgs = ParsedArgs,
  TOpts extends ParsedOptions = ParsedOptions,
> = (context: ActionContext<TArgs, TOpts>) => void | Promise<void>;

/** Context passed to middleware handlers */
export interface MiddlewareContext<
  TArgs extends ParsedArgs = ParsedArgs,
  TOpts extends ParsedOptions = ParsedOptions,
> extends ActionContext<TArgs, TOpts> {
  /** The command being executed */
  command: CommandConfig;
}

/**
 * Middleware handler that wraps command execution
 *
 * @example
 * ```typescript
 * const loggingMiddleware: MiddlewareHandler = async (ctx, next) => {
 *   console.log(`Running command: ${ctx.command.name}`);
 *   await next();
 *   console.log(`Command completed`);
 * };
 * ```
 */
export type MiddlewareHandler = (
  ctx: MiddlewareContext,
  next: () => Promise<void>,
) => void | Promise<void>;

/**
 * Error handler for command execution errors
 *
 * @example
 * ```typescript
 * const errorHandler: ErrorHandler = (error, ctx) => {
 *   console.error(`Error in ${ctx.command.name}: ${error.message}`);
 * };
 * ```
 */
export type ErrorHandler = (error: Error, ctx: MiddlewareContext) => void | Promise<void>;

// ============================================================================
// Configuration
// ============================================================================

/** Command configuration */
export interface CommandConfig {
  name: string;
  description: string;
  aliases: string[];
  arguments: ArgumentDef[];
  options: OptionDef[];
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

// ============================================================================
// Schema Types (for defineCommand / defineCli)
// ============================================================================

/** Infer args type from argument builders record */
export type InferArgs<T extends Record<string, ArgBuilder<unknown, Kind>>> = {
  [K in keyof T]: T[K]["_type"];
};

/** Infer options type from option builders record */
export type InferOpts<T extends Record<string, OptBuilder<unknown, Kind>>> = {
  [K in keyof T]: T[K]["_type"];
};

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
  /** Subcommands (can be CommandSchema or already-built CommandConfig) */
  subcommands?: Record<
    string,
    | CommandSchema<
        Record<string, ArgBuilder<unknown, Kind>>,
        Record<string, OptBuilder<unknown, Kind>>
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
  action?: ActionHandler<InferArgs<TArgBuilders>, InferOpts<TOptBuilders>>;
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

// ============================================================================
// Parser Types
// ============================================================================

/** Token types from argv parsing */
export type TokenType = "command" | "argument" | "option" | "value" | "separator";

/** Parsed token */
export interface Token {
  type: TokenType;
  value: string;
  raw: string;
}

/** Parse result */
export interface ParseResult {
  command: string[];
  args: ParsedArgs;
  options: ParsedOptions;
  rest: string[];
}

/** Validation error types */
export type ValidationErrorType =
  | "missing_required"
  | "invalid_type"
  | "unknown_option"
  | "unknown_command"
  | "validation_failed";

/** Validation error */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  field?: string;
}
