/**
 * Validator implementations
 */

import type {
  ValidationResult,
  ValidationRule,
  Validator,
  StringValidator,
  NumberValidator,
  BooleanValidator,
} from "./types.ts";

/**
 * Base validator class - immutable and chainable
 */
class BaseValidator<T> implements Validator<T> {
  protected readonly rules: ReadonlyArray<ValidationRule<T>>;

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

  protected addRule(rule: ValidationRule<T>): ValidationRule<T>[] {
    return [...this.rules, rule];
  }
}

/**
 * String validator implementation
 */
class StringValidatorImpl extends BaseValidator<string> implements StringValidator {
  email(message?: string): StringValidator {
    return new StringValidatorImpl(
      this.addRule((value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return message ?? "Must be a valid email address";
        }
        return true;
      }),
    );
  }

  url(message?: string): StringValidator {
    return new StringValidatorImpl(
      this.addRule((value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return message ?? "Must be a valid URL";
        }
      }),
    );
  }

  regex(pattern: RegExp, message?: string): StringValidator {
    return new StringValidatorImpl(
      this.addRule((value) => {
        if (!pattern.test(value)) {
          return message ?? `Must match pattern ${pattern}`;
        }
        return true;
      }),
    );
  }

  minLength(min: number, message?: string): StringValidator {
    return new StringValidatorImpl(
      this.addRule((value) => {
        if (value.length < min) {
          return message ?? `Must be at least ${min} characters`;
        }
        return true;
      }),
    );
  }

  maxLength(max: number, message?: string): StringValidator {
    return new StringValidatorImpl(
      this.addRule((value) => {
        if (value.length > max) {
          return message ?? `Must be at most ${max} characters`;
        }
        return true;
      }),
    );
  }

  oneOf<V extends string>(values: readonly V[], message?: string): StringValidator {
    return new StringValidatorImpl(
      this.addRule((value) => {
        if (!values.includes(value as V)) {
          return message ?? `Must be one of: ${values.join(", ")}`;
        }
        return true;
      }),
    );
  }

  refine(rule: ValidationRule<string>, message?: string): StringValidator {
    return new StringValidatorImpl(
      this.addRule((value) => {
        const result = rule(value);
        if (result !== true && message) {
          return message;
        }
        return result;
      }),
    );
  }
}

/**
 * Number validator implementation
 */
class NumberValidatorImpl extends BaseValidator<number> implements NumberValidator {
  min(minValue: number, message?: string): NumberValidator {
    return new NumberValidatorImpl(
      this.addRule((value) => {
        if (value < minValue) {
          return message ?? `Must be at least ${minValue}`;
        }
        return true;
      }),
    );
  }

  max(maxValue: number, message?: string): NumberValidator {
    return new NumberValidatorImpl(
      this.addRule((value) => {
        if (value > maxValue) {
          return message ?? `Must be at most ${maxValue}`;
        }
        return true;
      }),
    );
  }

  integer(message?: string): NumberValidator {
    return new NumberValidatorImpl(
      this.addRule((value) => {
        if (!Number.isInteger(value)) {
          return message ?? "Must be an integer";
        }
        return true;
      }),
    );
  }

  positive(message?: string): NumberValidator {
    return new NumberValidatorImpl(
      this.addRule((value) => {
        if (value <= 0) {
          return message ?? "Must be positive";
        }
        return true;
      }),
    );
  }

  negative(message?: string): NumberValidator {
    return new NumberValidatorImpl(
      this.addRule((value) => {
        if (value >= 0) {
          return message ?? "Must be negative";
        }
        return true;
      }),
    );
  }

  oneOf<V extends number>(values: readonly V[], message?: string): NumberValidator {
    return new NumberValidatorImpl(
      this.addRule((value) => {
        if (!values.includes(value as V)) {
          return message ?? `Must be one of: ${values.join(", ")}`;
        }
        return true;
      }),
    );
  }

  refine(rule: ValidationRule<number>, message?: string): NumberValidator {
    return new NumberValidatorImpl(
      this.addRule((value) => {
        const result = rule(value);
        if (result !== true && message) {
          return message;
        }
        return result;
      }),
    );
  }
}

/**
 * Boolean validator implementation
 */
class BooleanValidatorImpl extends BaseValidator<boolean> implements BooleanValidator {
  refine(rule: ValidationRule<boolean>, message?: string): BooleanValidator {
    return new BooleanValidatorImpl(
      this.addRule((value) => {
        const result = rule(value);
        if (result !== true && message) {
          return message;
        }
        return result;
      }),
    );
  }
}

/**
 * Validator factory interface
 */
export type ValidatorFactory = {
  /** Create a string validator */
  string(): StringValidator;
  /** Create a number validator */
  number(): NumberValidator;
  /** Create a boolean validator */
  boolean(): BooleanValidator;
  /** Create a custom validator from a function */
  custom<T>(rule: ValidationRule<T>): Validator<T>;
};

/**
 * Validator factory - main entry point
 */
export const v: ValidatorFactory = {
  /** Create a string validator */
  string(): StringValidator {
    return new StringValidatorImpl();
  },

  /** Create a number validator */
  number(): NumberValidator {
    return new NumberValidatorImpl();
  },

  /** Create a boolean validator */
  boolean(): BooleanValidator {
    return new BooleanValidatorImpl();
  },

  /** Create a custom validator from a function */
  custom<T>(rule: ValidationRule<T>): Validator<T> {
    return new BaseValidator([rule]);
  },
};
