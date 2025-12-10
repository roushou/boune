/**
 * Core types for the boune CLI framework
 */

import type { AnyValidator } from "./validation/types.ts";

/** Supported argument types */
export type ArgumentType = "string" | "number" | "boolean";

// ============================================================================
// Type Extraction Utilities
// ============================================================================

/** Extract argument name from syntax: "<name>" | "[name]" | "<files...>" */
export type ExtractArgName<T extends string> = T extends `<${infer Name}...>`
  ? Name
  : T extends `<${infer Name}>`
    ? Name
    : T extends `[${infer Name}...]`
      ? Name
      : T extends `[${infer Name}]`
        ? Name
        : never;

/** Check if argument is required (starts with <) */
export type IsArgRequired<T extends string> = T extends `<${string}>` ? true : false;

/** Check if argument is variadic (ends with ...>) */
export type IsArgVariadic<T extends string> = T extends `${string}...>` | `${string}...]`
  ? true
  : false;

/** Extract option name from syntax: "-v, --verbose" | "--name <val>" | "-n <val>" */
export type ExtractOptionName<T extends string> =
  // Long form with value: "--name <val>" or "-n, --name <val>"
  T extends `${string}--${infer Long} <${string}>`
    ? Long
    : T extends `${string}--${infer Long} [${string}]`
      ? Long
      : // Long form boolean: "--verbose" or "-v, --verbose"
        T extends `${string}--${infer Long}`
        ? Long
        : // Short only with value: "-n <val>"
          T extends `-${infer Short} <${string}>`
          ? Short
          : T extends `-${infer Short} [${string}]`
            ? Short
            : // Short only boolean: "-v"
              T extends `-${infer Short}`
              ? Short
              : never;

/** Check if option has a value placeholder */
export type OptionHasValue<T extends string> = T extends `${string}<${string}>`
  ? true
  : T extends `${string}[${string}]`
    ? true
    : false;

/** Map ArgumentType string to actual TypeScript type */
export type MapArgType<
  T extends ArgumentType,
  IsVariadic extends boolean = false,
> = IsVariadic extends true
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

/** Infer option type: boolean flags vs string/number values */
export type InferOptionType<
  HasValue extends boolean,
  TType extends ArgumentType,
> = HasValue extends false ? boolean : MapArgType<TType>;

/** Argument config with type parameter for inference */
export interface ArgumentConfig<TType extends ArgumentType = "string"> {
  type?: TType;
  default?: MapArgType<TType>;
  validate?: AnyValidator;
}

/** Option config with type parameter for inference */
export interface OptionConfig<TType extends ArgumentType = "string"> {
  type?: TType;
  default?: unknown;
  required?: boolean;
  env?: string;
  validate?: AnyValidator;
}

/** Argument definition */
export interface ArgumentDef {
  name: string;
  description: string;
  required: boolean;
  type: ArgumentType;
  default?: unknown;
  variadic?: boolean;
  validate?: AnyValidator;
}

/** Option/flag definition */
export interface OptionDef {
  name: string;
  short?: string;
  description: string;
  type: ArgumentType;
  required: boolean;
  default?: unknown;
  env?: string;
  validate?: AnyValidator;
}

/** Parsed argument values */
export type ParsedArgs = Record<string, unknown>;

/** Parsed option values */
export type ParsedOptions = Record<string, unknown>;

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
