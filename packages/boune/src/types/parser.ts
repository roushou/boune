/**
 * Parser types
 */

import type { ParsedArgs, ParsedOptions } from "./core.ts";

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
