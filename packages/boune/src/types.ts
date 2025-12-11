/**
 * Core types for the boune CLI framework
 */

import type { AnyValidator } from "./validation/types.ts";

// ============================================================================
// Kind and Type Mapping
// ============================================================================

/** Supported value types */
export type Kind = "string" | "number" | "boolean";

/** Map Kind to TypeScript type */
export type InferKind<T extends Kind, Variadic extends boolean = false> = Variadic extends true
  ? T extends "number"
    ? number[]
    : T extends "boolean"
      ? boolean[]
      : string[]
  : T extends "number"
    ? number
    : T extends "boolean"
      ? boolean
      : string;

// ============================================================================
// Argument Types
// ============================================================================

/** Argument configuration options */
export interface ArgumentOptions {
  /** Argument name (used for access in args object) */
  name: string;
  /** Value type */
  kind: Kind;
  /** Whether argument is required */
  required: boolean;
  /** Whether argument accepts multiple values (default: false) */
  variadic?: boolean;
  /** Description shown in help */
  description?: string;
  /** Default value if not provided */
  default?: unknown;
  /** Validation function */
  validate?: AnyValidator;
}

/** Infer argument type from options object */
export type InferArg<T extends ArgumentOptions> = {
  [K in T["name"]]: T["variadic"] extends true
    ? T["kind"] extends "number"
      ? number[]
      : T["kind"] extends "boolean"
        ? boolean[]
        : string[]
    : T["default"] extends undefined
      ? T["required"] extends true
        ? InferKind<T["kind"]>
        : InferKind<T["kind"]> | undefined
      : InferKind<T["kind"]>;
};

// ============================================================================
// Option Types
// ============================================================================

/** Option configuration options */
export interface OptionOptions {
  /** Option name (used for access in options object) */
  name: string;
  /** Value type */
  kind: Kind;
  /** Short flag (single character, e.g., "c" for -c) */
  short?: string;
  /** Long flag (defaults to name if not specified) */
  long?: string;
  /** Whether option is required (default: false) */
  required?: boolean;
  /** Description shown in help */
  description?: string;
  /** Default value if not provided */
  default?: unknown;
  /** Environment variable to read value from */
  env?: string;
  /** Validation function */
  validate?: AnyValidator;
}

/** Infer option type from options object */
export type InferOpt<T extends OptionOptions> = {
  [K in T["name"]]: T["kind"] extends "boolean"
    ? boolean // Boolean options always have a value (default: false)
    : T["default"] extends undefined
      ? T["required"] extends true
        ? InferKind<T["kind"]>
        : InferKind<T["kind"]> | undefined
      : InferKind<T["kind"]>;
};

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
// Action and Hooks
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

/** Hook types */
export type HookType = "preAction" | "postAction" | "preError" | "postError";

/** Hook handler */
export type HookHandler = (context: {
  command: CommandConfig;
  args: ParsedArgs;
  options: ParsedOptions;
  error?: Error;
}) => void | Promise<void>;

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
  subcommands: Map<string, CommandConfig>;
  action?: ActionHandler;
  hooks: Map<HookType, HookHandler[]>;
  hidden: boolean;
}

/** CLI configuration */
export interface CliConfig {
  name: string;
  version: string;
  description: string;
  commands: Map<string, CommandConfig>;
  globalOptions: OptionDef[];
  hooks: Map<HookType, HookHandler[]>;
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

/** Validation error */
export interface ValidationError {
  type:
    | "missing_required"
    | "invalid_type"
    | "unknown_option"
    | "unknown_command"
    | "validation_failed";
  message: string;
  field?: string;
}
