import type {
  BooleanValidationRules,
  NumberValidationRules,
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
 * Compile string validation rules into a validator function
 */
function compileStringRules(rules: StringValidationRules): CompiledValidator {
  const checks: CompiledValidator[] = [];

  if (rules.email !== undefined) {
    const { message } = extractRuleValue(rules.email);
    checks.push((value) => {
      if (!stringRules.email.check(value as string)) {
        return message ?? stringRules.email.message();
      }
      return true;
    });
  }

  if (rules.url !== undefined) {
    const { message } = extractRuleValue(rules.url);
    checks.push((value) => {
      if (!stringRules.url.check(value as string)) {
        return message ?? stringRules.url.message();
      }
      return true;
    });
  }

  if (rules.regex !== undefined) {
    const { value: pattern, message } = extractRuleValue(rules.regex);
    checks.push((value) => {
      if (!stringRules.regex.check(value as string, pattern)) {
        return message ?? stringRules.regex.message(pattern);
      }
      return true;
    });
  }

  if (rules.minLength !== undefined) {
    const { value: min, message } = extractRuleValue(rules.minLength);
    checks.push((value) => {
      if (!stringRules.minLength.check(value as string, min)) {
        return message ?? stringRules.minLength.message(min);
      }
      return true;
    });
  }

  if (rules.maxLength !== undefined) {
    const { value: max, message } = extractRuleValue(rules.maxLength);
    checks.push((value) => {
      if (!stringRules.maxLength.check(value as string, max)) {
        return message ?? stringRules.maxLength.message(max);
      }
      return true;
    });
  }

  if (rules.oneOf !== undefined) {
    const { value: values, message } = extractRuleValue(rules.oneOf);
    checks.push((value) => {
      if (!stringRules.oneOf.check(value as string, values)) {
        return message ?? stringRules.oneOf.message(values);
      }
      return true;
    });
  }

  if (rules.refine !== undefined) {
    const refine = rules.refine;
    checks.push((value) => refine(value as string));
  }

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
 * Compile number validation rules into a validator function
 */
function compileNumberRules(rules: NumberValidationRules): CompiledValidator {
  const checks: CompiledValidator[] = [];

  if (rules.integer !== undefined) {
    const { message } = extractRuleValue(rules.integer);
    checks.push((value) => {
      if (!numberRules.integer.check(value as number)) {
        return message ?? numberRules.integer.message();
      }
      return true;
    });
  }

  if (rules.positive !== undefined) {
    const { message } = extractRuleValue(rules.positive);
    checks.push((value) => {
      if (!numberRules.positive.check(value as number)) {
        return message ?? numberRules.positive.message();
      }
      return true;
    });
  }

  if (rules.negative !== undefined) {
    const { message } = extractRuleValue(rules.negative);
    checks.push((value) => {
      if (!numberRules.negative.check(value as number)) {
        return message ?? numberRules.negative.message();
      }
      return true;
    });
  }

  if (rules.min !== undefined) {
    const { value: min, message } = extractRuleValue(rules.min);
    checks.push((value) => {
      if (!numberRules.min.check(value as number, min)) {
        return message ?? numberRules.min.message(min);
      }
      return true;
    });
  }

  if (rules.max !== undefined) {
    const { value: max, message } = extractRuleValue(rules.max);
    checks.push((value) => {
      if (!numberRules.max.check(value as number, max)) {
        return message ?? numberRules.max.message(max);
      }
      return true;
    });
  }

  if (rules.oneOf !== undefined) {
    const { value: values, message } = extractRuleValue(rules.oneOf);
    checks.push((value) => {
      if (!numberRules.oneOf.check(value as number, values)) {
        return message ?? numberRules.oneOf.message(values);
      }
      return true;
    });
  }

  if (rules.refine !== undefined) {
    const refine = rules.refine;
    checks.push((value) => refine(value as number));
  }

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
 * Compile boolean validation rules into a validator function
 */
function compileBooleanRules(rules: BooleanValidationRules): CompiledValidator {
  if (rules.refine !== undefined) {
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
