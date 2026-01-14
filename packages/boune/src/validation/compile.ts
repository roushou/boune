import type {
  BooleanValidationRules,
  NumberValidationRules,
  RuleSpec,
  RuleValue,
  StringValidationRules,
  ValidationResult,
} from "./types.ts";
import type { Kind } from "../types/core.ts";
import { numberRules } from "./rules/number.ts";
import { stringRules } from "./rules/string.ts";

/** Compiled validator function */
export type CompiledValidator = (value: unknown) => ValidationResult;

/**
 * Extract value and message from RuleValue
 */
function extractRuleValue<T>(rule: RuleValue<T>): { value: T; message?: string } {
  if (typeof rule === "object" && rule !== null && "value" in rule) {
    return rule as { value: T; message: string };
  }
  return { value: rule as T };
}

/**
 * Rule keys for string validation (excludes 'refine' which is handled separately)
 */
const stringRuleKeys = ["email", "url", "regex", "minLength", "maxLength"] as const;

/**
 * Rule keys for number validation (excludes 'refine' which is handled separately)
 */
const numberRuleKeys = ["integer", "positive", "negative", "min", "max"] as const;

/**
 * Generic rule compiler - converts declarative rules into validator functions
 *
 * @param rules - The validation rules object (e.g., { email: true, minLength: 5 })
 * @param ruleSet - The rule specifications (e.g., stringRules, numberRules)
 * @param ruleKeys - The keys to check in the rules object
 * @param refine - Optional custom refine function
 */
function compileRules<T, K extends string>(
  rules: Record<string, unknown>,
  ruleSet: Record<K, RuleSpec<T, never[]>>,
  ruleKeys: readonly K[],
  refine?: (value: T) => ValidationResult,
): CompiledValidator {
  const checks: CompiledValidator[] = ruleKeys
    .filter((key) => rules[key] !== undefined)
    .map((key) => {
      const { value: param, message } = extractRuleValue(rules[key] as RuleValue<unknown>);
      const rule = ruleSet[key];

      return (val: unknown): ValidationResult => {
        // For boolean rules (like email: true), param is true and we don't pass it
        // For value rules (like minLength: 5), param is the constraint value
        const passed = param === true ? rule.check(val as T) : rule.check(val as T, param as never);

        if (!passed) {
          // Use custom message if provided, otherwise use rule's default message
          return message ?? (param === true ? rule.message() : rule.message(param as never));
        }
        return true;
      };
    });

  // Add refine check if provided
  if (refine) {
    checks.push((value) => refine(value as T));
  }

  // Return combined validator
  return (value) => {
    for (const check of checks) {
      const result = check(value);
      if (result !== true) {
        return result;
      }
    }
    return true;
  };
}

/**
 * Compile string validation rules into a validator function
 */
function compileStringRules(rules: StringValidationRules): CompiledValidator {
  return compileRules(rules as Record<string, unknown>, stringRules, stringRuleKeys, rules.refine);
}

/**
 * Compile number validation rules into a validator function
 */
function compileNumberRules(rules: NumberValidationRules): CompiledValidator {
  return compileRules(rules as Record<string, unknown>, numberRules, numberRuleKeys, rules.refine);
}

/**
 * Compile boolean validation rules into a validator function
 */
function compileBooleanRules(rules: BooleanValidationRules): CompiledValidator {
  if (rules.refine) {
    const refine = rules.refine;
    return (value) => refine(value as boolean);
  }
  return () => true;
}

/**
 * Compile declarative validation rules into an executable validator function
 */
export function compileValidation(
  rules: StringValidationRules | NumberValidationRules | BooleanValidationRules,
  type: Kind,
): CompiledValidator {
  switch (type) {
    case "string":
      return compileStringRules(rules as StringValidationRules);
    case "number":
      return compileNumberRules(rules as NumberValidationRules);
    case "boolean":
      return compileBooleanRules(rules as BooleanValidationRules);
  }
}
