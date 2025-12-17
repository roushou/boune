import type { InferKind, Kind } from "./core.ts";
import type { ValidationRulesForKind } from "../validation/types.ts";

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
 *     format: { type: "string", choices: ["json", "yaml"] as const, description: "Format" },
 *   },
 * });
 * ```
 */
export type ArgumentDefinition<
  K extends Kind = Kind,
  C extends readonly InferKind<K>[] | undefined = readonly InferKind<K>[] | undefined,
> = {
  /** Value type */
  type: K;
  /** Whether the argument is required */
  required?: boolean;
  /** Whether the argument accepts multiple values */
  variadic?: boolean;
  /** Default value (makes type non-nullable) */
  default?: C extends readonly (infer U)[] ? U : InferKind<K>;
  /** Restrict to specific values (narrows TypeScript type) */
  choices?: C;
  /** Description shown in help */
  description?: string;
  /** Validation rules */
  validate?: ValidationRulesForKind<K>;
};

/**
 * Infer the base type from choices or kind
 */
type InferChoicesOrKind<T extends ArgumentDefinition> = T extends {
  choices: readonly (infer U)[];
}
  ? U
  : InferKind<T["type"]>;

/**
 * Infer the TypeScript type from an argument definition
 */
export type InferArgType<T extends ArgumentDefinition> = T extends { variadic: true }
  ? T extends { required: true }
    ? InferChoicesOrKind<T>[]
    : T extends { default: unknown }
      ? InferChoicesOrKind<T>[]
      : InferChoicesOrKind<T>[] | undefined
  : T extends { required: true }
    ? InferChoicesOrKind<T>
    : T extends { default: unknown }
      ? InferChoicesOrKind<T>
      : InferChoicesOrKind<T> | undefined;

/**
 * Infer args type from argument definitions record
 */
export type InferArgs<T extends Record<string, ArgumentDefinition>> = {
  [K in keyof T]: InferArgType<T[K]>;
};
