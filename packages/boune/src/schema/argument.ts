/**
 * Type-safe argument builder for declarative command definitions
 */

import type { ArgumentDef, Kind } from "../types.ts";
import type { AnyValidator } from "../validation/types.ts";

/**
 * Builder for defining command arguments with full type inference
 */
export class ArgBuilder<T, K extends Kind = Kind> {
  private _kind: K;
  private _required = false;
  private _variadic = false;
  private _default?: unknown;
  private _description?: string;
  private _validator?: AnyValidator;

  constructor(kind: K) {
    this._kind = kind;
  }

  /**
   * Mark argument as required
   */
  required(): ArgBuilder<NonNullable<T>, K> {
    this._required = true;
    return this as unknown as ArgBuilder<NonNullable<T>, K>;
  }

  /**
   * Mark argument as optional (default)
   */
  optional(): ArgBuilder<T | undefined, K> {
    this._required = false;
    return this as unknown as ArgBuilder<T | undefined, K>;
  }

  /**
   * Mark argument as variadic (accepts multiple values)
   */
  variadic(): ArgBuilder<
    K extends "string" ? string[] : K extends "number" ? number[] : boolean[],
    K
  > {
    this._variadic = true;
    return this as unknown as ArgBuilder<
      K extends "string" ? string[] : K extends "number" ? number[] : boolean[],
      K
    >;
  }

  /**
   * Set default value for argument
   */
  default<D extends NonNullable<T>>(value: D): ArgBuilder<NonNullable<T>, K> {
    this._default = value;
    return this as unknown as ArgBuilder<NonNullable<T>, K>;
  }

  /**
   * Set argument description (shown in help)
   */
  describe(description: string): this {
    this._description = description;
    return this;
  }

  /**
   * Add validation for the argument value
   * @example argument.string().validate(v.string().email())
   */
  validate(validator: AnyValidator): this {
    this._validator = validator;
    return this;
  }

  /**
   * @internal Build ArgumentDef from builder state
   */
  _build(name: string): ArgumentDef {
    return {
      name,
      description: this._description ?? "",
      required: this._required,
      type: this._kind,
      default: this._default,
      variadic: this._variadic,
      validate: this._validator,
    };
  }

  /**
   * @internal Get the inferred TypeScript type (for type inference only)
   */
  _type!: T;
}

/**
 * Factory for creating type-safe argument builders
 *
 * @example
 * ```typescript
 * const cmd = defineCommand({
 *   name: "greet",
 *   arguments: {
 *     name: argument.string().required().describe("Name to greet"),
 *     count: argument.number().default(1).describe("Times to repeat"),
 *   },
 *   action({ args }) {
 *     // args.name is string, args.count is number
 *   },
 * });
 * ```
 */
export const argument = {
  /**
   * Create a string argument builder
   */
  string: () => new ArgBuilder<string | undefined, "string">("string"),

  /**
   * Create a number argument builder
   */
  number: () => new ArgBuilder<number | undefined, "number">("number"),

  /**
   * Create a boolean argument builder
   */
  boolean: () => new ArgBuilder<boolean | undefined, "boolean">("boolean"),
};
