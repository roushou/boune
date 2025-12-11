// Core builders
export { cli, Cli } from "./cli.ts";
export { command, Command } from "./command.ts";

// Types
export type {
  ActionContext,
  ActionHandler,
  Argument,
  ArgumentDef,
  CliConfig,
  CommandConfig,
  HookHandler,
  HookType,
  InferArg,
  InferKind,
  InferOpt,
  Kind,
  Option,
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
