/**
 * Result of a validation operation
 * - true means valid
 * - string means invalid with error message
 */
export type ValidationResult = true | string;

/**
 * A single validation rule function
 */
export type ValidationRule<T> = (value: T) => ValidationResult;

/**
 * The core Validator interface - chainable and immutable
 */
export interface Validator<T> {
  /** Run all validation rules on a value */
  validate(value: T): ValidationResult;

  /** Get all rules for inspection */
  getRules(): ReadonlyArray<ValidationRule<T>>;
}

/**
 * Any validator - used for type-agnostic storage in definitions
 */
export interface AnyValidator {
  validate(value: unknown): ValidationResult;
}

/**
 * String validator with string-specific methods
 */
export interface StringValidator extends Validator<string> {
  email(message?: string): StringValidator;
  url(message?: string): StringValidator;
  regex(pattern: RegExp, message?: string): StringValidator;
  minLength(min: number, message?: string): StringValidator;
  maxLength(max: number, message?: string): StringValidator;
  oneOf<V extends string>(values: readonly V[], message?: string): StringValidator;
  /** Add a custom validation rule */
  refine(rule: ValidationRule<string>, message?: string): StringValidator;
}

/**
 * Number validator with number-specific methods
 */
export interface NumberValidator extends Validator<number> {
  min(min: number, message?: string): NumberValidator;
  max(max: number, message?: string): NumberValidator;
  integer(message?: string): NumberValidator;
  positive(message?: string): NumberValidator;
  negative(message?: string): NumberValidator;
  oneOf<V extends number>(values: readonly V[], message?: string): NumberValidator;
  /** Add a custom validation rule */
  refine(rule: ValidationRule<number>, message?: string): NumberValidator;
}

/**
 * Boolean validator
 */
export interface BooleanValidator extends Validator<boolean> {
  /** Add a custom validation rule */
  refine(rule: ValidationRule<boolean>, message?: string): BooleanValidator;
}
