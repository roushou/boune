/**
 * Type-safe option builder for declarative command definitions
 */

import type { Kind, OptionDef } from "../types.ts";
import type { AnyValidator } from "../validation/types.ts";

/**
 * Builder for defining command options with full type inference
 */
export class OptBuilder<T, K extends Kind = Kind> {
  private _kind: K;
  private _short?: string;
  private _long?: string;
  private _required = false;
  private _default?: unknown;
  private _description?: string;
  private _env?: string;
  private _validator?: AnyValidator;

  constructor(kind: K) {
    this._kind = kind;
    // Boolean options default to false (flags)
    if (kind === "boolean") {
      this._default = false;
    }
  }

  /**
   * Set short flag (single character, e.g., "v" for -v)
   */
  short(flag: string): this {
    this._short = flag;
    return this;
  }

  /**
   * Set long flag (e.g., "verbose" for --verbose)
   * Defaults to the option name if not specified
   */
  long(flag: string): this {
    this._long = flag;
    return this;
  }

  /**
   * Set environment variable to read value from
   */
  env(varName: string): this {
    this._env = varName;
    return this;
  }

  /**
   * Mark option as required
   */
  required(): OptBuilder<NonNullable<T>, K> {
    this._required = true;
    return this as unknown as OptBuilder<NonNullable<T>, K>;
  }

  /**
   * Set default value for option
   */
  default<D extends NonNullable<T>>(value: D): OptBuilder<NonNullable<T>, K> {
    this._default = value;
    return this as unknown as OptBuilder<NonNullable<T>, K>;
  }

  /**
   * Set option description (shown in help)
   */
  describe(description: string): this {
    this._description = description;
    return this;
  }

  /**
   * Add validation for the option value
   * @example option.string().validate(v.string().url())
   */
  validate(validator: AnyValidator): this {
    this._validator = validator;
    return this;
  }

  /**
   * @internal Build OptionDef from builder state
   */
  _build(name: string): OptionDef {
    return {
      name,
      short: this._short,
      long: this._long ?? name,
      description: this._description ?? "",
      type: this._kind,
      required: this._required,
      default: this._default,
      env: this._env,
      validate: this._validator,
    };
  }

  /**
   * @internal Get the inferred TypeScript type (for type inference only)
   */
  _type!: T;
}

/**
 * Factory for creating type-safe option builders
 *
 * @example
 * ```typescript
 * const cmd = defineCommand({
 *   name: "build",
 *   options: {
 *     output: option.string().short("o").describe("Output directory"),
 *     watch: option.boolean().short("w").describe("Watch mode"),
 *     port: option.number().default(3000).env("PORT"),
 *   },
 *   action({ options }) {
 *     // options.output is string | undefined
 *     // options.watch is boolean
 *     // options.port is number
 *   },
 * });
 * ```
 */
export const option = {
  /**
   * Create a string option builder
   */
  string: () => new OptBuilder<string | undefined, "string">("string"),

  /**
   * Create a number option builder
   */
  number: () => new OptBuilder<number | undefined, "number">("number"),

  /**
   * Create a boolean option builder (flag, defaults to false)
   */
  boolean: () => new OptBuilder<boolean, "boolean">("boolean"),
};
