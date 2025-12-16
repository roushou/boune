import type { CompiledValidator } from "../validation/compile.ts";

/** Supported value types */
export type Kind = "string" | "number" | "boolean";

/** Map Kind to TypeScript type */
type KindMap = { string: string; number: number; boolean: boolean };

/** Map Kind to TypeScript type (with optional variadic) */
export type InferKind<K extends Kind, V extends boolean = false> = V extends true
  ? KindMap[K][]
  : KindMap[K];

/** Internal argument definition */
export interface InternalArgumentDef {
  name: string;
  description: string;
  required: boolean;
  type: Kind;
  default?: unknown;
  variadic?: boolean;
  validate?: CompiledValidator;
}

/** Internal option/flag definition */
export interface InternalOptionDef {
  name: string;
  short?: string;
  long?: string;
  description: string;
  type: Kind;
  required: boolean;
  default?: unknown;
  env?: string;
  validate?: CompiledValidator;
}

/**
 * Brand symbol for parsed argument values
 * @internal
 */
declare const ParsedArgsBrand: unique symbol;

/**
 * Brand symbol for parsed option values
 * @internal
 */
declare const ParsedOptionsBrand: unique symbol;

/**
 * Parsed argument values
 *
 * Uses a branded type to distinguish from arbitrary Record<string, unknown>.
 * At runtime this is just a plain object, but TypeScript treats it as a
 * distinct type for better type safety.
 *
 * Note: When using `defineCommand`, action handlers receive properly typed
 * args via generic inference. This branded type is used internally and in
 * middleware contexts where specific argument types aren't known.
 */
export type ParsedArgs = Record<string, unknown> & { readonly [ParsedArgsBrand]?: never };

/**
 * Parsed option values
 *
 * Uses a branded type to distinguish from arbitrary Record<string, unknown>.
 * At runtime this is just a plain object, but TypeScript treats it as a
 * distinct type for better type safety.
 *
 * Note: When using `defineCommand`, action handlers receive properly typed
 * options via generic inference. This branded type is used internally and in
 * middleware contexts where specific option types aren't known.
 */
export type ParsedOptions = Record<string, unknown> & { readonly [ParsedOptionsBrand]?: never };
