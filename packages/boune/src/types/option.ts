import type { InferKind, Kind } from "./core.ts";
import type { AnyValidator } from "../validation/types.ts";

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
 *   },
 * });
 * ```
 */
export type OptionDefinition<K extends Kind = Kind> = {
  /** Value type */
  type: K;
  /** Short flag (single character, e.g., "v" for -v) */
  short?: string;
  /** Long flag (e.g., "verbose" for --verbose). Defaults to the option name. */
  long?: string;
  /** Whether the option is required */
  required?: boolean;
  /** Default value (makes type non-nullable) */
  default?: InferKind<K>;
  /** Environment variable to read value from */
  env?: string;
  /** Description shown in help */
  description?: string;
  /** Custom validator */
  validate?: AnyValidator;
};

/**
 * Infer the TypeScript type from an option definition
 */
export type InferOptType<T extends OptionDefinition> = T extends { type: "boolean" }
  ? boolean
  : T extends { required: true }
    ? InferKind<T["type"]>
    : T extends { default: unknown }
      ? InferKind<T["type"]>
      : InferKind<T["type"]> | undefined;

/**
 * Infer options type from option definitions record
 */
export type InferOpts<T extends Record<string, OptionDefinition>> = {
  [K in keyof T]: InferOptType<T[K]>;
};
