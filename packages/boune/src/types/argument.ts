import type { InferKind, Kind } from "./core.ts";
import type { AnyValidator } from "../validation/types.ts";

/**
 * User-facing argument definition
 *
 * @example
 * ```typescript
 * defineCommand({
 *   arguments: {
 *     name: { type: "string", required: true, description: "Name to greet" },
 *     count: { type: "number", default: 1, description: "Times to repeat" },
 *     files: { type: "string", required: true, variadic: true, description: "Files" },
 *   },
 * });
 * ```
 */
export type ArgumentDefinition<K extends Kind = Kind> = {
  /** Value type */
  type: K;
  /** Whether the argument is required */
  required?: boolean;
  /** Whether the argument accepts multiple values */
  variadic?: boolean;
  /** Default value (makes type non-nullable) */
  default?: InferKind<K>;
  /** Description shown in help */
  description?: string;
  /** Custom validator */
  validate?: AnyValidator;
};

/**
 * Infer the TypeScript type from an argument definition
 */
export type InferArgType<T extends ArgumentDefinition> = T extends { variadic: true }
  ? T extends { required: true }
    ? InferKind<T["type"], true>
    : T extends { default: unknown }
      ? InferKind<T["type"], true>
      : InferKind<T["type"], true> | undefined
  : T extends { required: true }
    ? InferKind<T["type"]>
    : T extends { default: unknown }
      ? InferKind<T["type"]>
      : InferKind<T["type"]> | undefined;

/**
 * Infer args type from argument definitions record
 */
export type InferArgs<T extends Record<string, ArgumentDefinition>> = {
  [K in keyof T]: InferArgType<T[K]>;
};
