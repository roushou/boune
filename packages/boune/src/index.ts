// Declarative API
export { defineCommand, defineCli } from "./define.ts";

// Schema builders
export { argument, ArgBuilder } from "./schema/argument.ts";
export { option, OptBuilder } from "./schema/option.ts";

// Runtime
export { Cli } from "./cli.ts";

// Types
export type {
  ActionContext,
  ActionHandler,
  ArgumentDef,
  CliConfig,
  CliSchema,
  CommandConfig,
  CommandSchema,
  ErrorHandler,
  InferArgs,
  InferKind,
  InferOpts,
  Kind,
  MiddlewareContext,
  MiddlewareHandler,
  OptionDef,
  ParsedArgs,
  ParsedOptions,
  ParseResult,
  Token,
  TokenType,
  ValidationError,
  ValidationErrorType,
} from "./types.ts";

// Parser utilities
export { tokenize, parseArguments, parseOptions, coerceValue } from "./parser/index.ts";

// Output utilities
export {
  color,
  supportsColor,
  table,
  list,
  keyValue,
  error,
  warning,
  success,
  info,
  createSpinner,
  createProgressBar,
} from "./output/index.ts";

// Validation
export { v } from "./validation/index.ts";
export type {
  ValidationResult,
  ValidationRule,
  Validator,
  AnyValidator,
  StringValidator,
  NumberValidator,
  BooleanValidator,
} from "./validation/index.ts";

// Suggestions
export { suggestCommands, formatSuggestions, levenshtein } from "./suggest.ts";
export type { Suggestion } from "./suggest.ts";

// Shell completions
export {
  generateCompletion,
  generateBashCompletion,
  generateZshCompletion,
  generateFishCompletion,
} from "./completions/index.ts";
export type { ShellType } from "./completions/index.ts";
