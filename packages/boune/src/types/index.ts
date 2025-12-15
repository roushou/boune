/**
 * Type exports for the boune CLI framework
 */

export type { Kind, InferKind, ArgumentDef, OptionDef, ParsedArgs, ParsedOptions } from "./core.ts";

export type {
  ActionContext,
  ActionHandler,
  MiddlewareContext,
  MiddlewareHandler,
  ErrorHandler,
  PromptsRecord,
} from "./handlers.ts";

export type { InferArgs, InferOpts, CommandConfig, CommandSchema } from "./command.ts";

export type { CliConfig, CliSchema } from "./cli.ts";

export type {
  TokenType,
  Token,
  ParseResult,
  ValidationErrorType,
  ValidationError,
} from "./parser.ts";

export type {
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
} from "./prompt.ts";
