export { defineCommand, defineCli } from "./define/index.ts";

// Runtime
export { Cli } from "./runtime/index.ts";

// Types
export type {
  ActionContext,
  ActionHandler,
  CliConfig,
  CliSchema,
  CommandConfig,
  CommandSchema,
  ErrorHandler,
  InferKind,
  Kind,
  MiddlewareContext,
  MiddlewareHandler,
  ParsedArgs,
  ParsedOptions,
  ParseResult,
  PromptsRecord,
  Token,
  TokenType,
  ValidationError,
  ValidationErrorType,
  // Argument types
  ArgumentDefinition,
  InferArgType,
  InferArgs,
  // Option types
  OptionDefinition,
  InferOptType,
  InferOpts,
  // Prompt types
  PromptDefinition,
  TextPromptDef,
  PasswordPromptDef,
  NumberPromptDef,
  ConfirmPromptDef,
  SelectPromptDef,
  MultiselectPromptDef,
  AutocompletePromptDef,
  FilepathPromptDef,
  RunnablePrompt,
  InferPrompts,
  InferPromptType,
} from "./types/index.ts";

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
  suggestCommands,
  formatSuggestions,
  levenshtein,
} from "./output/index.ts";
export type { Suggestion } from "./output/index.ts";

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

// Shell completions
export {
  generateCompletion,
  generateBashCompletion,
  generateZshCompletion,
  generateFishCompletion,
} from "./completions/index.ts";
export type { ShellType } from "./completions/index.ts";
