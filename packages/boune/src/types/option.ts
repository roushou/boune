import type { InferKind, Kind } from "./core.ts";
import type { ValidationRulesForKind } from "../validation/types.ts";

/**
 * User-facing option definition
 *
 * @example
 * ```typescript
 * defineCommand({
 *   options: {
 *     port: { type: "number", short: "p", default: 3000, description: "Port" },
 *     host: { type: "string", short: "H", env: "HOST", description: "Host" },
 *     verbose: { type: "boolean", short: "v", description: "Verbose output" },
 *     format: { type: "string", choices: ["json", "yaml", "toml"] as const, description: "Format" },
 *   },
 * });
 * ```
 */
export type OptionDefinition<
  K extends Kind = Kind,
  C extends readonly InferKind<K>[] | undefined = readonly InferKind<K>[] | undefined,
> = {
  /** Value type */
  type: K;
  /** Short flag (single character, e.g., "v" for -v) */
  short?: string;
  /** Long flag (e.g., "verbose" for --verbose). Defaults to the option name. */
  long?: string;
  /** Whether the option is required */
  required?: boolean;
  /** Default value (makes type non-nullable) */
  default?: C extends readonly (infer U)[] ? U : InferKind<K>;
  /** Restrict to specific values (narrows TypeScript type) */
  choices?: C;
  /** Environment variable to read value from */
  env?: string;
  /** Description shown in help */
  description?: string;
  /** Validation rules */
  validate?: ValidationRulesForKind<K>;
};

/**
 * Infer the base type from choices or kind
 */
type InferChoicesOrKind<T extends OptionDefinition> = T extends {
  choices: readonly (infer U)[];
}
  ? U
  : InferKind<T["type"]>;

/**
 * Infer the TypeScript type from an option definition
 */
export type InferOptType<T extends OptionDefinition> = T extends { type: "boolean" }
  ? boolean
  : T extends { required: true }
    ? InferChoicesOrKind<T>
    : T extends { default: unknown }
      ? InferChoicesOrKind<T>
      : InferChoicesOrKind<T> | undefined;

/**
 * Infer options type from option definitions record
 */
export type InferOpts<T extends Record<string, OptionDefinition>> = {
  [K in keyof T]: InferOptType<T[K]>;
};
