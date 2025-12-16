import type { Kind } from "../types/core.ts";

/**
 * Result of a validation operation
 * - true means valid
 * - string means invalid with error message
 */
export type ValidationResult = true | string;

/**
 * Specification for a validation rule (used internally by rule definitions)
 */
export type RuleSpec<T, Args extends unknown[] = []> = {
  /** Predicate that returns true if value is valid */
  check: (value: T, ...args: Args) => boolean;
  /** Default error message generator */
  message: (...args: Args) => string;
};

/**
 * Rule value - either the value directly or with custom message
 *
 * @example
 * ```typescript
 * // Simple form
 * minLength: 5
 *
 * // With custom message
 * minLength: { value: 5, message: "Must be at least 5 characters" }
 * ```
 */
export type RuleValue<T> = T | { value: T; message: string };

/**
 * String validation rules
 *
 * @example
 * ```typescript
 * validate: { email: true, minLength: 5 }
 * validate: { regex: /^[a-z]+$/, maxLength: { value: 10, message: "Too long" } }
 * ```
 */
export type StringValidationRules = {
  /** Must be a valid email address */
  email?: RuleValue<true>;
  /** Must be a valid URL */
  url?: RuleValue<true>;
  /** Must match the given pattern */
  regex?: RuleValue<RegExp>;
  /** Minimum string length */
  minLength?: RuleValue<number>;
  /** Maximum string length */
  maxLength?: RuleValue<number>;
  /** Must be one of the specified values */
  oneOf?: RuleValue<readonly string[]>;
  /** Custom validation function */
  refine?: (value: string) => ValidationResult;
};

/**
 * Number validation rules
 *
 * @example
 * ```typescript
 * validate: { integer: true, min: 1, max: 65535 }
 * validate: { positive: true }
 * ```
 */
export type NumberValidationRules = {
  /** Minimum value (inclusive) */
  min?: RuleValue<number>;
  /** Maximum value (inclusive) */
  max?: RuleValue<number>;
  /** Must be an integer */
  integer?: RuleValue<true>;
  /** Must be positive (> 0) */
  positive?: RuleValue<true>;
  /** Must be negative (< 0) */
  negative?: RuleValue<true>;
  /** Must be one of the specified values */
  oneOf?: RuleValue<readonly number[]>;
  /** Custom validation function */
  refine?: (value: number) => ValidationResult;
};

/**
 * Boolean validation rules
 *
 * @example
 * ```typescript
 * validate: { refine: (v) => v === true || "Must accept terms" }
 * ```
 */
export type BooleanValidationRules = {
  /** Custom validation function */
  refine?: (value: boolean) => ValidationResult;
};

/**
 * Map Kind to validation rules type
 */
export type ValidationRulesForKind<K extends Kind> = K extends "string"
  ? StringValidationRules
  : K extends "number"
    ? NumberValidationRules
    : K extends "boolean"
      ? BooleanValidationRules
      : never;
