/**
 * Validator implementations
 */

import type {
  BooleanValidator,
  NumberValidator,
  StringValidator,
  ValidationResult,
  ValidationRule,
  Validator,
} from "./types.ts";

// ============================================================================
// Rule Definitions
// ============================================================================

/**
 * Specification for a validation rule
 */
type RuleSpec<T, Args extends unknown[] = []> = {
  /** Predicate that returns true if value is valid */
  check: (value: T, ...args: Args) => boolean;
  /** Default error message generator */
  message: (...args: Args) => string;
};

/**
 * String validation rules
 */
const stringRules = {
  email: {
    check: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: () => "Must be a valid email address",
  },
  url: {
    check: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: () => "Must be a valid URL",
  },
  regex: {
    check: (value: string, pattern: RegExp) => pattern.test(value),
    message: (pattern: RegExp) => `Must match pattern ${pattern}`,
  },
  minLength: {
    check: (value: string, min: number) => value.length >= min,
    message: (min: number) => `Must be at least ${min} characters`,
  },
  maxLength: {
    check: (value: string, max: number) => value.length <= max,
    message: (max: number) => `Must be at most ${max} characters`,
  },
  oneOf: {
    check: <V extends string>(value: string, values: readonly V[]) => values.includes(value as V),
    message: <V extends string>(values: readonly V[]) => `Must be one of: ${values.join(", ")}`,
  },
} as const satisfies Record<string, RuleSpec<string, never[]>>;

/**
 * Number validation rules
 */
const numberRules = {
  min: {
    check: (value: number, min: number) => value >= min,
    message: (min: number) => `Must be at least ${min}`,
  },
  max: {
    check: (value: number, max: number) => value <= max,
    message: (max: number) => `Must be at most ${max}`,
  },
  integer: {
    check: (value: number) => Number.isInteger(value),
    message: () => "Must be an integer",
  },
  positive: {
    check: (value: number) => value > 0,
    message: () => "Must be positive",
  },
  negative: {
    check: (value: number) => value < 0,
    message: () => "Must be negative",
  },
  oneOf: {
    check: <V extends number>(value: number, values: readonly V[]) => values.includes(value as V),
    message: <V extends number>(values: readonly V[]) => `Must be one of: ${values.join(", ")}`,
  },
} as const satisfies Record<string, RuleSpec<number, never[]>>;

// ============================================================================
// Generic Validator Implementation
// ============================================================================

/**
 * Generic validator builder - consolidates all validator implementations
 * Uses rule specs to generate validation functions
 */
class ValidatorBuilder<T, Self extends Validator<T>> implements Validator<T> {
  protected readonly rules: ReadonlyArray<ValidationRule<T>>;
  private readonly factory: (rules: ValidationRule<T>[]) => Self;

  constructor(factory: (rules: ValidationRule<T>[]) => Self, rules: ValidationRule<T>[] = []) {
    this.rules = Object.freeze([...rules]);
    this.factory = factory;
  }

  validate(value: T): ValidationResult {
    for (const rule of this.rules) {
      const result = rule(value);
      if (result !== true) {
        return result;
      }
    }
    return true;
  }

  getRules(): ReadonlyArray<ValidationRule<T>> {
    return this.rules;
  }

  /**
   * Apply a rule spec to create a new validator
   */
  protected applyRule<Args extends unknown[]>(
    spec: RuleSpec<T, Args>,
    args: Args,
    customMessage?: string,
  ): Self {
    const rule: ValidationRule<T> = (value) => {
      if (!spec.check(value, ...args)) {
        return customMessage ?? spec.message(...args);
      }
      return true;
    };
    return this.factory([...this.rules, rule]);
  }

  /**
   * Add a custom refinement rule
   */
  protected applyRefine(rule: ValidationRule<T>, customMessage?: string): Self {
    const wrappedRule: ValidationRule<T> = (value) => {
      const result = rule(value);
      if (result !== true && customMessage) {
        return customMessage;
      }
      return result;
    };
    return this.factory([...this.rules, wrappedRule]);
  }
}

// ============================================================================
// Concrete Validator Implementations
// ============================================================================

/** Factory function type for creating validator instances */
type ValidatorFactory<T, V extends Validator<T>> = (rules: ValidationRule<T>[]) => V;

/** Create a factory for a validator class */
const createFactory =
  <T, V extends Validator<T>>(
    Ctor: new (factory: ValidatorFactory<T, V>, rules: ValidationRule<T>[]) => V,
  ): ValidatorFactory<T, V> =>
  (rules) =>
    new Ctor(createFactory(Ctor), rules);

/**
 * String validator - methods delegate to rule specs
 */
class StringValidatorImpl
  extends ValidatorBuilder<string, StringValidator>
  implements StringValidator
{
  constructor(
    factory: ValidatorFactory<string, StringValidator>,
    rules: ValidationRule<string>[] = [],
  ) {
    super(factory, rules);
  }

  email(message?: string): StringValidator {
    return this.applyRule(stringRules.email, [], message);
  }

  url(message?: string): StringValidator {
    return this.applyRule(stringRules.url, [], message);
  }

  regex(pattern: RegExp, message?: string): StringValidator {
    return this.applyRule(stringRules.regex, [pattern], message);
  }

  minLength(min: number, message?: string): StringValidator {
    return this.applyRule(stringRules.minLength, [min], message);
  }

  maxLength(max: number, message?: string): StringValidator {
    return this.applyRule(stringRules.maxLength, [max], message);
  }

  oneOf<V extends string>(values: readonly V[], message?: string): StringValidator {
    return this.applyRule(stringRules.oneOf, [values], message);
  }

  refine(rule: ValidationRule<string>, message?: string): StringValidator {
    return this.applyRefine(rule, message);
  }
}

/**
 * Number validator - methods delegate to rule specs
 */
class NumberValidatorImpl
  extends ValidatorBuilder<number, NumberValidator>
  implements NumberValidator
{
  constructor(
    factory: ValidatorFactory<number, NumberValidator>,
    rules: ValidationRule<number>[] = [],
  ) {
    super(factory, rules);
  }

  min(minValue: number, message?: string): NumberValidator {
    return this.applyRule(numberRules.min, [minValue], message);
  }

  max(maxValue: number, message?: string): NumberValidator {
    return this.applyRule(numberRules.max, [maxValue], message);
  }

  integer(message?: string): NumberValidator {
    return this.applyRule(numberRules.integer, [], message);
  }

  positive(message?: string): NumberValidator {
    return this.applyRule(numberRules.positive, [], message);
  }

  negative(message?: string): NumberValidator {
    return this.applyRule(numberRules.negative, [], message);
  }

  oneOf<V extends number>(values: readonly V[], message?: string): NumberValidator {
    return this.applyRule(numberRules.oneOf, [values], message);
  }

  refine(rule: ValidationRule<number>, message?: string): NumberValidator {
    return this.applyRefine(rule, message);
  }
}

/**
 * Boolean validator - only has refine method
 */
class BooleanValidatorImpl
  extends ValidatorBuilder<boolean, BooleanValidator>
  implements BooleanValidator
{
  constructor(
    factory: ValidatorFactory<boolean, BooleanValidator>,
    rules: ValidationRule<boolean>[] = [],
  ) {
    super(factory, rules);
  }

  refine(rule: ValidationRule<boolean>, message?: string): BooleanValidator {
    return this.applyRefine(rule, message);
  }
}

// ============================================================================
// Simple Validator for Custom Rules
// ============================================================================

/**
 * Simple validator for custom rules (used by v.custom)
 */
class SimpleValidator<T> implements Validator<T> {
  private readonly rules: ReadonlyArray<ValidationRule<T>>;

  constructor(rules: ValidationRule<T>[] = []) {
    this.rules = Object.freeze([...rules]);
  }

  validate(value: T): ValidationResult {
    for (const rule of this.rules) {
      const result = rule(value);
      if (result !== true) {
        return result;
      }
    }
    return true;
  }

  getRules(): ReadonlyArray<ValidationRule<T>> {
    return this.rules;
  }
}

// ============================================================================
// Public Factory
// ============================================================================

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
