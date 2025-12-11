/**
 * Core types for the boune CLI framework
 */

import type { AnyValidator } from "../validation/types.ts";

/** Supported value types */
export type Kind = "string" | "number" | "boolean";

/** Map Kind to TypeScript type */
type KindMap = { string: string; number: number; boolean: boolean };

/** Map Kind to TypeScript type (with optional variadic) */
export type InferKind<K extends Kind, V extends boolean = false> = V extends true
  ? KindMap[K][]
  : KindMap[K];

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

/** Parsed argument values */
export type ParsedArgs = Record<string, unknown>;

/** Parsed option values */
export type ParsedOptions = Record<string, unknown>;
