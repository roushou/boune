import type { ValidationResult, ValidationRule, Validator } from "./types.ts";

/**
 * Specification for a validation rule
 */
export type RuleSpec<T, Args extends unknown[] = []> = {
  /** Predicate that returns true if value is valid */
  check: (value: T, ...args: Args) => boolean;
  /** Default error message generator */
  message: (...args: Args) => string;
};

/**
 * Generic validator builder - consolidates all validator implementations
 * Uses rule specs to generate validation functions
 */
export class ValidatorBuilder<T, Self extends Validator<T>> implements Validator<T> {
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

/**
 * Simple validator for custom rules (used by v.custom)
 */
export class SimpleValidator<T> implements Validator<T> {
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

/** Factory function type for creating validator instances */
export type ValidatorFactory<T, V extends Validator<T>> = (rules: ValidationRule<T>[]) => V;

/** Create a factory for a validator class */
export const createFactory =
  <T, V extends Validator<T>>(
    Ctor: new (factory: ValidatorFactory<T, V>, rules: ValidationRule<T>[]) => V,
  ): ValidatorFactory<T, V> =>
  (rules) =>
    new Ctor(createFactory(Ctor), rules);
