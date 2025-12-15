import type {
  BooleanValidator,
  NumberValidator,
  StringValidator,
  ValidationRule,
  Validator,
} from "./types.ts";
import {
  BooleanValidatorImpl,
  NumberValidatorImpl,
  StringValidatorImpl,
} from "./implementations/index.ts";
import { SimpleValidator, createFactory } from "./builder.ts";

/**
 * Validator factory interface (exported type)
 */
export type ValidatorFactoryType = {
  /** Create a string validator */
  string(): StringValidator;
  /** Create a number validator */
  number(): NumberValidator;
  /** Create a boolean validator */
  boolean(): BooleanValidator;
  /** Create a custom validator from a function */
  custom<T>(rule: ValidationRule<T>): Validator<T>;
};

// Pre-create factories for each validator type
const stringFactory = createFactory(StringValidatorImpl);
const numberFactory = createFactory(NumberValidatorImpl);
const booleanFactory = createFactory(BooleanValidatorImpl);

/**
 * Validator factory - main entry point
 *
 * @example
 * ```typescript
 * // String validation
 * v.string().email().minLength(5)
 *
 * // Number validation
 * v.number().min(0).max(100).integer()
 *
 * // Custom validation
 * v.custom<string>((value) => value.startsWith("@") || "Must start with @")
 * ```
 */
export const v: ValidatorFactoryType = {
  /** Create a string validator */
  string(): StringValidator {
    return stringFactory([]);
  },

  /** Create a number validator */
  number(): NumberValidator {
    return numberFactory([]);
  },

  /** Create a boolean validator */
  boolean(): BooleanValidator {
    return booleanFactory([]);
  },

  /** Create a custom validator from a function */
  custom<T>(rule: ValidationRule<T>): Validator<T> {
    return new SimpleValidator([rule]);
  },
};
